import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'

/**
 * Check Missing Staff Roles API
 * GET /api/staff/onboarding/check
 * 
 * Checks if the school has missing key staff roles that need to be registered
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth()
    if (!session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only school admins can check staff onboarding status
    if (session.user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check missing staff roles
    const missingStaffCheck = await staffOnboardingService.checkMissingStaffRoles(
      session.user.schoolId
    )

    return NextResponse.json({
      success: true,
      data: missingStaffCheck,
    })
  } catch (error) {
    console.error('Error checking missing staff roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}