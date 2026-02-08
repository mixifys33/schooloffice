import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'
import { Role } from '@/types/enums'

/**
 * GET /api/staff/onboarding/status
 * Check onboarding status for the current school
 * Requirements: Check if required staff roles are registered
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only school admins can check onboarding status
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const schoolId = session.user.schoolId!
    const status = await staffOnboardingService.checkOnboardingStatus(schoolId)

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    )
  }
}