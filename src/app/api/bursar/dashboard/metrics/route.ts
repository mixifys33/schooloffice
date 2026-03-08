import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const period = searchParams.get('period') || 'current-term';

    // Calculate date range based on period
    let dateRange: { start: Date; end: Date } | null = null;
    if (period !== 'current-term') {
      const now = new Date();
      switch (period) {
        case 'current-month':
          dateRange = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          };
          break;
        case 'last-30-days':
          dateRange = {
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case 'current-year':
          dateRange = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
          };
          break;
      }
    }

    // Calculate revenue (total payments collected)
    let paymentWhereClause: any = {
      schoolId: session.user.schoolId,
      status: 'CONFIRMED'
    };

    // Apply date range filter if period is not current-term
    if (dateRange) {
      paymentWhereClause.receivedAt = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    } else if (termId) {
      // Try with termId first if provided (only for current-term)
      const tempPaymentWhereClause = {
        ...paymentWhereClause,
        termId: termId
      };
      
      // Check if there are any payment records with this termId
      const paymentCount = await prisma.payment.count({
        where: tempPaymentWhereClause
      });
      
      // If records found with this termId, use the term filter
      if (paymentCount > 0) {
        paymentWhereClause = tempPaymentWhereClause;
      }
    }

    const totalRevenue = await prisma.payment.aggregate({
      where: paymentWhereClause,
      _sum: {
        amount: true
      }
    });

    // Calculate expenses
    const expenseWhereClause: any = {
      schoolId: session.user.schoolId,
      status: { in: ['APPROVED', 'PAID'] }
    };

    // Apply date range filter if period is not current-term
    if (dateRange) {
      expenseWhereClause.expenseDate = {
        gte: dateRange.start,
        lte: dateRange.end
      };
    }

    const totalExpenses = await prisma.expense.aggregate({
      where: expenseWhereClause,
      _sum: {
        amount: true
      }
    });

    // Calculate total expected fees and outstanding amounts
    // Get all active students for the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      include: {
        payments: dateRange ? {
          where: {
            receivedAt: {
              gte: dateRange.start,
              lte: dateRange.end
            },
            status: 'CONFIRMED'
          }
        } : termId ? {
          where: {
            termId: termId,
            status: 'CONFIRMED'
          }
        } : {
          where: {
            status: 'CONFIRMED'
          }
        }
      }
    })

    // Get fee structures for the term
    let feeStructures: any[] = []
    if (termId && !dateRange) {
      // Only filter by termId for current-term period
      feeStructures = await prisma.feeStructure.findMany({
        where: {
          schoolId: session.user.schoolId,
          termId: termId,
          isActive: true
        }
      })
    } else if (dateRange) {
      // For date-based periods, fetch all active fee structures
      feeStructures = await prisma.feeStructure.findMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        }
      })
    }

    // Calculate totals
    let totalExpectedFees = 0
    let totalCollected = 0
    let studentsWithBalance = 0
    let totalOverpayments = 0
    let totalOutstanding = 0 // Sum of all positive balances

    students.forEach(student => {
      // Find fee structure for this student's class
      const feeStructure = feeStructures.find(fs => 
        fs.classId === student.classId && 
        fs.studentType === 'DAY' // Default to DAY, adjust if you have studentType field
      )

      const expectedFee = feeStructure?.totalAmount || 0
      const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = expectedFee - paidAmount

      totalExpectedFees += expectedFee
      totalCollected += paidAmount

      if (balance > 0) {
        studentsWithBalance++
        totalOutstanding += balance // Add this student's outstanding balance
      } else if (balance < 0) {
        // This is an overpayment, don't count it as reducing outstanding
        totalOverpayments += Math.abs(balance)
      }
    })

    // Calculate collection rate based on what was expected vs what was collected
    // Cap at 100% even if there are overpayments
    const collectionRate = totalExpectedFees > 0 
      ? Math.min(100, (totalCollected / totalExpectedFees) * 100) 
      : 0;

    // Calculate net income
    const netIncome = (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0)

    const totalStudents = students.length

    console.log('Metrics calculation:', {
      totalStudents,
      totalExpectedFees,
      totalCollected,
      totalOutstanding,
      totalOverpayments,
      collectionRate: collectionRate.toFixed(2),
      studentsWithBalance
    })

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        netIncome,
        totalOutstanding,
        totalOverpayments,
        collectionRate,
        studentsWithBalance,
        totalStudents
      }
    });
  } catch (error) {
    console.error('Error fetching bursar metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch financial metrics', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}