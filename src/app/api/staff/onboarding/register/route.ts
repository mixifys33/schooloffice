import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffOnboardingService } from '@/services/staff-onboarding.service'
import { Role, StaffRole } from '@/types/enums'
import { formatApiError, SUCCESS_MESSAGES } from '@/lib/error-messages'
import { prisma } from '@/lib/db'

/**
 * POST /api/staff/onboarding/register
 * Register a new staff member during onboarding
 * Requirements: Create staff account with auto-generated credentials
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
    }

    // Only school admins can register staff
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'You do not have permission to register staff members' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School information is required' }, { status: 400 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, role, employeeNumber, department } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !role || !employeeNumber) {
      return NextResponse.json(
        { error: 'Please fill in all required fields: name, email, phone, role, and employee number' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = [...Object.values(StaffRole), ...Object.values(Role)]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Please select a valid staff role' },
        { status: 400 }
      )
    }

    // Validate staff data
    const validation = staffOnboardingService.validateStaffData({
      firstName,
      lastName,
      email,
      phone,
      role,
      employeeNumber,
      department,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    const schoolId = session.user.schoolId!
    const registeredBy = session.user.id

    // Register the staff member
    const credentials = await staffOnboardingService.registerStaff(
      schoolId,
      {
        firstName,
        lastName,
        email,
        phone,
        role,
        employeeNumber,
        department,
      },
      registeredBy
    )

    // Get school information for credential sending
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School information not found' },
        { status: 400 }
      )
    }

    // Automatically send credentials after successful registration
    let credentialsSent = false
    let sendingError = null
    
    try {
      const sendResult = await staffOnboardingService.sendCredentials(
        credentials,
        school.name
      )
      
      credentialsSent = sendResult.smsSuccess || sendResult.emailSuccess
      
      if (!credentialsSent) {
        sendingError = 'Failed to send credentials via SMS or email'
      }
    } catch (error) {
      console.error('Error auto-sending credentials:', error)
      sendingError = error instanceof Error ? error.message : 'Failed to send credentials'
    }

    return NextResponse.json({
      success: true,
      credentials,
      credentialsSent,
      sendingError,
      message: credentialsSent 
        ? SUCCESS_MESSAGES.STAFF_REGISTERED + ' Credentials have been sent automatically.'
        : SUCCESS_MESSAGES.STAFF_REGISTERED + ' Please use the resend button to send credentials.',
    })
  } catch (error) {
    console.error('Error registering staff:', error)
    
    // Use centralized error formatting
    const apiError = formatApiError(error)
    
    return NextResponse.json(apiError, { status: 400 })
  }
}