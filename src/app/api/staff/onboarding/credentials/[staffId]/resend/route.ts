import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'
import { Role } from '@/types/enums'
import { formatApiError } from '@/lib/error-messages'

/**
 * POST /api/staff/onboarding/credentials/[staffId]/resend
 * Resend credentials to a staff member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
    }

    // Only school admins can resend credentials
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'You do not have permission to resend staff credentials' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School information is required' }, { status: 400 })
    }

    const { staffId } = await params
    const schoolId = session.user.schoolId!

    const result = await staffOnboardingService.resendCredentials(staffId, schoolId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: result.message 
    })
  } catch (error) {
    console.error('Error resending staff credentials:', error)
    const apiError = formatApiError(error)
    return NextResponse.json(apiError, { status: 500 })
  }
}