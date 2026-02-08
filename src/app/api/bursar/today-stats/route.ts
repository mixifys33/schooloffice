import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // Get today's statistics
    const [
      todayPayments,
      todayPendingPayments,
      todayExpenses,
      todayNewStudents,
      todayDefaultersContacted
    ] = await Promise.all([
      // Today's payments
      prisma.payment.aggregate({
        where: {
          schoolId,
          receivedAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // End of today
          },
          status: 'CONFIRMED'
        },
        _sum: {
          amount: true
        }
      }),

      // Today's pending payments
      prisma.payment.count({
        where: {
          schoolId,
          receivedAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // End of today
          },
          status: 'PENDING'
        }
      }),

      // Today's expenses
      prisma.expense.aggregate({
        where: {
          budgetCategory: {
            schoolId
          },
          expenseDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // End of today
          },
          status: { in: ['APPROVED', 'PAID'] }
        },
        _sum: {
          amount: true
        }
      }),

      // Today's new students
      prisma.student.count({
        where: {
          schoolId,
          enrollmentDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // End of today
          }
        }
      }),

      // Today's defaulter contacts (messages sent to defaulters)
      prisma.message.count({
        where: {
          schoolId,
          createdAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // End of today
          },
          templateType: 'PAYMENT_REMINDER' // Using templateType instead of messageType
        }
      })
    ]);

    const stats = {
      totalReceived: todayPayments._sum.amount || 0,
      pendingPayments: todayPendingPayments,
      totalExpenses: todayExpenses._sum.amount || 0,
      newStudents: todayNewStudents,
      defaultersContacted: todayDefaultersContacted,
      netCashflow: (todayPayments._sum.amount || 0) - (todayExpenses._sum.amount || 0)
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch today\'s statistics', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}