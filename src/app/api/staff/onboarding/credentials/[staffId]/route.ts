import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'
import { Role } from '@/types/enums'
import { formatApiError } from '@/lib/error-messages'

/**
 * GET /api/staff/onboarding/credentials/[staffId]
 * Get credentials for a staff member (for re-viewing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
    }

    // Only school admins can view credentials
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'You do not have permission to view staff credentials' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School information is required' }, { status: 400 })
    }

    const { staffId } = await params
    const schoolId = session.user.schoolId!

    const credentials = await staffOnboardingService.getStaffCredentials(staffId, schoolId)

    if (!credentials) {
      return NextResponse.json({ 
        error: 'Credentials not found or staff member has already changed their password' 
      }, { status: 404 })
    }

    return NextResponse.json({ credentials })
  } catch (error) {
    console.error('Error getting staff credentials:', error)
    const apiError = formatApiError(error)
    return NextResponse.json(apiError, { status: 500 })
  }
}