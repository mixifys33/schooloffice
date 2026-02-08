import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'
import { Role } from '@/types/enums'
import { prisma } from '@/lib/db'

/**
 * POST /api/staff/onboarding/send-credentials
 * Send login credentials to newly registered staff member
 * Requirements: Send credentials via SMS and email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only school admins can send credentials
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const body = await request.json()
    const { credentials } = body

    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials are required' },
        { status: 400 }
      )
    }

    // Validate credentials structure
    const requiredFields = ['name', 'email', 'phone', 'password', 'role', 'schoolCode']
    for (const field of requiredFields) {
      if (!credentials[field]) {
        return NextResponse.json(
          { error: `Missing credential field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Get school name for the message
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId! },
      select: { name: true },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Send credentials
    const result = await staffOnboardingService.sendCredentials(
      credentials,
      school.name
    )

    return NextResponse.json({
      success: true,
      smsSuccess: result.smsSuccess,
      emailSuccess: result.emailSuccess,
      message: 'Credentials sent successfully',
    })
  } catch (error) {
    console.error('Error sending credentials:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send credentials' },
      { status: 500 }
    )
  }
}