/**
 * Super Admin Subscriptions API Route
 * Requirements: 14.1, 14.2, 14.5, 14.6
 * - GET: Return all school subscriptions with details
 * - POST: Record a subscription payment
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { subscriptionService } from '@/services/subscription.service'
import { PaymentMethod } from '@/types/enums'

/**
 * GET /api/admin/subscriptions
 * Fetches all school subscriptions with details
 * Requirement 14.1: Display schools with term subscription amount, amount per student, total bill, payment history, outstanding balance
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

    const subscriptions = await subscriptionService.getAllSubscriptions()

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/subscriptions
 * Record a subscription payment
 * Requirement 14.5: Record payment via POST to /api/admin/payments and restore school features
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

    const body = await request.json()
    const { schoolId, amount, method, reference } = body

    // Validate required fields
    if (!schoolId || !amount || !method || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, amount, method, reference' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    const result = await subscriptionService.recordPayment({
      schoolId,
      amount,
      method,
      reference,
      recordedBy: session.user.id || 'unknown'
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message 
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
