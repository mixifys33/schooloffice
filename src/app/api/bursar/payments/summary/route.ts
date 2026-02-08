import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get payment summary data
    const [
      totalPaymentsResult,
      totalAmountResult,
      pendingReconciliationResult,
      failedPaymentsResult,
      paymentsByMethodResult,
      recentPayments
    ] = await Promise.all([
      // Total payments count
      prisma.payment.count({
        where: {
          schoolId,
          receivedAt: { gte: startOfMonth },
          status: 'CONFIRMED'
        }
      }),

      // Total amount
      prisma.payment.aggregate({
        where: {
          schoolId,
          receivedAt: { gte: startOfMonth },
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      }),

      // Pending reconciliation
      prisma.payment.count({
        where: {
          schoolId,
          reconciliationStatus: 'PENDING'
        }
      }),

      // Failed payments
      prisma.payment.count({
        where: {
          schoolId,
          status: 'FAILED',
          receivedAt: { gte: startOfMonth }
        }
      }),

      // Payments by method
      prisma.payment.groupBy({
        by: ['method'],
        where: {
          schoolId,
          receivedAt: { gte: startOfMonth },
          status: 'CONFIRMED'
        },
        _sum: { amount: true },
        _count: { id: true }
      }),

      // Recent payments
      prisma.payment.findMany({
        where: {
          schoolId,
          status: 'CONFIRMED'
        },
        include: {
          student: true,
          allocations: {
            include: {
              invoice: {
                include: {
                  items: true
                }
              }
            }
          }
        },
        orderBy: { receivedAt: 'desc' },
        take: 10
      })
    ]);

    const totalAmount = totalAmountResult._sum.amount || 0;
    const totalPaymentsByMethod = paymentsByMethodResult.reduce((sum, p) => sum + (p._sum.amount || 0), 0);

    const paymentsByMethod = paymentsByMethodResult.map(p => ({
      method: p.method,
      count: p._count.id,
      amount: p._sum.amount || 0,
      percentage: totalPaymentsByMethod > 0 ? ((p._sum.amount || 0) / totalPaymentsByMethod) * 100 : 0
    }));

    const recentPaymentsFormatted = recentPayments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      studentClass: '', // Will be filled from class relation
      feeId: payment.allocations[0]?.invoice?.id || '',
      feeName: payment.allocations[0]?.invoice?.items[0]?.description || 'General Payment',
      amount: payment.amount,
      paymentMethod: payment.method,
      transactionReference: payment.reference,
      paymentDate: payment.receivedAt.toISOString(),
      status: payment.status,
      reconciliationStatus: payment.reconciliationStatus || 'PENDING',
      receiptNumber: '',
      notes: payment.notes,
      processedBy: payment.receivedBy,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString()
    }));

    const summary = {
      totalPayments: totalPaymentsResult,
      totalAmount,
      pendingReconciliation: pendingReconciliationResult,
      failedPayments: failedPaymentsResult,
      paymentsByMethod,
      recentPayments: recentPaymentsFormatted
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment summary' },
      { status: 500 }
    );
  }
}