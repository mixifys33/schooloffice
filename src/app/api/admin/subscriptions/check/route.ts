/**
 * Super Admin Payment Status Check API Route
 * Requirements: 14.2
 * - POST: Check payment status for each school at term start
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { subscriptionService } from '@/services/subscription.service'

/**
 * POST /api/admin/subscriptions/check
 * Triggers payment status check for all schools
 * Requirement 14.2: Check payment status for each school at term start
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const result = await subscriptionService.checkAllPaymentStatuses()

    return NextResponse.json({
      success: true,
      message: `Checked ${result.checked} schools`,
      details: {
        totalChecked: result.checked,
        overdueSchools: result.overdue.length,
        gracePeriodSchools: result.gracePeriod.length,
        suspendedSchools: result.suspended.length
      }
    })
  } catch (error) {
    console.error('Error checking payment statuses:', error)
    return NextResponse.json(
      { error: 'Failed to check payment statuses' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/subscriptions/check
 * Gets the current payment status summary
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const result = await subscriptionService.checkAllPaymentStatuses()

    return NextResponse.json({
      totalChecked: result.checked,
      overdueSchools: result.overdue.length,
      gracePeriodSchools: result.gracePeriod.length,
      suspendedSchools: result.suspended.length,
      lastChecked: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting payment status summary:', error)
    return NextResponse.json(
      { error: 'Failed to get payment status summary' },
      { status: 500 }
    )
  }
}
