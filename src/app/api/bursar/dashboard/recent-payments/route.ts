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

    // Build the where clause for payments
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