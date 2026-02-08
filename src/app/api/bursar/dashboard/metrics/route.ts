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

    // Calculate revenue (total payments collected)
    let paymentWhereClause: any = {
      schoolId: session.user.schoolId,
      status: 'CONFIRMED'
    };

    // Try with termId first if provided
    if (termId) {
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

    const totalExpenses = await prisma.expense.aggregate({
      where: expenseWhereClause,
      _sum: {
        amount: true
      }
    });

    // Calculate total expected fees and outstanding amounts
    let studentAccountWhereClause: any = {
      schoolId: session.user.schoolId
    };

    // Try with termId first if provided
    if (termId) {
      studentAccountWhereClause.termId = termId;
      
      // Check if there are any student account records with this termId
      const accountCount = await prisma.studentAccount.count({
        where: studentAccountWhereClause
      });
      
      // If no records found with this termId, fall back to not using term filter
      if (accountCount === 0) {
        studentAccountWhereClause = {
          schoolId: session.user.schoolId
        };
      }
    }

    const studentAccounts = await prisma.studentAccount.findMany({
      where: studentAccountWhereClause
    });

    const totalExpectedFees = studentAccounts.reduce((sum, account) => sum + account.totalFees, 0);
    const totalCollected = studentAccounts.reduce((sum, account) => sum + account.totalPaid, 0);
    const totalOutstanding = totalExpectedFees - totalCollected;

    // Calculate collection rate
    const collectionRate = totalExpectedFees > 0 ? (totalCollected / totalExpectedFees) * 100 : 0;

    // Calculate net income
    const netIncome = (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0);

    // Count students with outstanding fees
    const studentsWithBalance = studentAccounts.filter(account => account.balance > 0).length;
    const totalStudents = studentAccounts.length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        netIncome,
        totalOutstanding,
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