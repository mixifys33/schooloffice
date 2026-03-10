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

    // Calculate total expected fees and outstanding amounts using StudentAccount
    // StudentAccount is the single source of truth for financial data
    let studentAccountWhereClause: any = {
      schoolId: session.user.schoolId
    };

    // For current-term, filter by termId
    if (!dateRange && termId) {
      studentAccountWhereClause.termId = termId;
    }

    // Get all student accounts with their students
    const studentAccounts = await prisma.studentAccount.findMany({
      where: studentAccountWhereClause,
      include: {
        student: true
      }
    });

    // Filter to only include accounts where student is active
    const activeStudentAccounts = studentAccounts.filter(sa => sa.student && sa.student.status === 'ACTIVE');

    // Calculate totals from StudentAccount (single source of truth)
    let totalExpectedFees = 0;
    let totalCollected = 0;
    let studentsWithBalance = 0;
    let totalOverpayments = 0;
    let totalOutstanding = 0; // Sum of all positive balances only

    activeStudentAccounts.forEach(account => {
      totalExpectedFees += account.totalFees;
      totalCollected += account.totalPaid;

      if (account.balance > 0) {
        // Student owes money
        studentsWithBalance++;
        totalOutstanding += account.balance;
      } else if (account.balance < 0) {
        // Student overpaid - don't count in outstanding
        totalOverpayments += Math.abs(account.balance);
      }
    });

    // Calculate collection rate based on what was expected vs what was collected
    // Cap at 100% even if there are overpayments
    const collectionRate = totalExpectedFees > 0 
      ? Math.min(100, (totalCollected / totalExpectedFees) * 100) 
      : 0;

    // Calculate net income
    const netIncome = (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0);

    const totalStudents = activeStudentAccounts.length;

    console.log('Metrics calculation:', {
      totalStudents,
      totalExpectedFees,
      totalCollected,
      totalOutstanding,
      totalOverpayments,
      collectionRate: collectionRate.toFixed(2),
      studentsWithBalance,
      usingStudentAccount: true
    });

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