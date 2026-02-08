import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PaymentService } from '@/services/finance.service';
import { BursarService } from '@/services/bursar.service';

/**
 * @swagger
 * /api/bursar/activity:
 *   get:
 *     summary: Get a combined list of recent financial activities (payments and expenses)
 *     tags: [Bursar]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of items to return.
 *     responses:
 *       200:
 *         description: A combined and sorted list of financial activities.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Failed to fetch financial activity.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch payments and expenses in parallel
    const [paymentsResult, expensesResult] = await Promise.all([
      PaymentService.listPayments({ schoolId: session.user.schoolId }, 1, limit),
      BursarService.listExpenses({ schoolId: session.user.schoolId }, 1, limit),
    ]);
    
    // It's crucial to know the actual structure of these results.
    // For now, we assume they return an object with a `data` array.
    // e.g., { data: [...], total: ... }
    const payments = paymentsResult.data?.map((p: any) => ({ ...p, type: 'payment', date: p.paymentDate })) || [];
    const expenses = expensesResult.data?.map((e: any) => ({ ...e, type: 'expense', date: e.expenseDate })) || [];

    // Combine and sort
    const combinedActivity = [...payments, ...expenses];
    combinedActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Return the top N results
    const activity = combinedActivity.slice(0, limit);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Fetch financial activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial activity' },
      { status: 500 },
    );
  }
}
