/**
 * Finance Settings API Route
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 * - GET: Get finance settings (currency, receipt format, payment methods, penalties, discounts)
 * - PUT: Update finance settings with audit logging
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, FinanceSettings } from '@/services/school-settings.service'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const settings = await schoolSettingsService.getSettings<FinanceSettings>(
      schoolId,
      'finance'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching finance settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch finance settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate currency - Requirement 16.6
    if (body.currency !== undefined && !body.currency.trim()) {
      return NextResponse.json(
        { error: 'Currency cannot be empty' },
        { status: 400 }
      )
    }

    // Validate receipt number format - Requirement 16.6
    if (body.receiptNumberFormat !== undefined && !body.receiptNumberFormat.trim()) {
      return NextResponse.json(
        { error: 'Receipt number format cannot be empty' },
        { status: 400 }
      )
    }

    // Validate payment methods - Requirement 16.5
    if (body.paymentMethods !== undefined) {
      if (!Array.isArray(body.paymentMethods) || body.paymentMethods.length === 0) {
        return NextResponse.json(
          { error: 'Payment methods must be a non-empty array' },
          { status: 400 }
        )
      }
    }

    // Validate late penalty percentage - Requirement 16.3
    if (body.latePenaltyPercentage !== undefined) {
      if (body.latePenaltyPercentage < 0 || body.latePenaltyPercentage > 100) {
        return NextResponse.json(
          { error: 'Late penalty percentage must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Validate grace period days - Requirement 16.4
    if (body.gracePeriodDays !== undefined) {
      if (body.gracePeriodDays < 0 || body.gracePeriodDays > 365) {
        return NextResponse.json(
          { error: 'Grace period must be between 0 and 365 days' },
          { status: 400 }
        )
      }
    }

    const settings = await schoolSettingsService.updateSettings<FinanceSettings>(
      schoolId,
      'finance',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Finance settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating finance settings:', error)
    return NextResponse.json(
      { error: 'Failed to update finance settings' },
      { status: 500 }
    )
  }
}
