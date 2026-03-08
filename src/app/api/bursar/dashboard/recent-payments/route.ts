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
    const limit = parseInt(searchParams.get('limit') || '10');
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

    // Build the where clause for payments
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

    // Get recent payments
    const payments = await prisma.payment.findMany({
      where: paymentWhereClause,
      orderBy: {
        receivedAt: 'desc'
      },
      take: limit,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      amount: payment.amount,
      paymentMethod: payment.method,
      timestamp: payment.receivedAt.toISOString(),
      status: payment.status.toLowerCase() as 'completed' | 'pending' | 'failed',
      reference: payment.reference || payment.id
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch recent payments', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}