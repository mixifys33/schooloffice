/**
 * School Registration API Route
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 1.8, 8.5
 * - Atomic school registration with tenant creation
 * - Seed admin account creation
 * - Legal acknowledgment validation
 */
import { NextRequest, NextResponse } from 'next/server'
import { schoolRegistrationService, SchoolRegistrationInput } from '@/services/school-registration.service'

/**
 * POST /api/schools/register
 * Registers a new school tenant with admin account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields are present
    const requiredFields = [
      'schoolName',
      'schoolType',
      'ownership',
      'country',
      'contactEmail',
      'schoolCode',
      'adminFullName',
      'adminEmail',
      'adminPassword',
      'termsAccepted',
      'dataResponsibilityAcknowledged',
    ]

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Validate school type
    if (!['PRIMARY', 'SECONDARY', 'BOTH'].includes(body.schoolType)) {
      return NextResponse.json(
        { error: 'Invalid school type' },
        { status: 400 }
      )
    }

    // Validate ownership
    if (!['PRIVATE', 'GOVERNMENT'].includes(body.ownership)) {
      return NextResponse.json(
        { error: 'Invalid ownership type' },
        { status: 400 }
      )
    }

    // Build registration input
    const input: SchoolRegistrationInput = {
      schoolName: body.schoolName,
      schoolType: body.schoolType,
      registrationNumber: body.registrationNumber,
      ownership: body.ownership,
      country: body.country,
      district: body.district,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      physicalLocation: body.physicalLocation,
      schoolCode: body.schoolCode,
      adminFullName: body.adminFullName,
      adminEmail: body.adminEmail,
      adminPhone: body.adminPhone,
      adminPassword: body.adminPassword,
      termsAccepted: body.termsAccepted,
      dataResponsibilityAcknowledged: body.dataResponsibilityAcknowledged,
    }

    // Register the school
    const result = await schoolRegistrationService.registerSchool(input)

    if (!result.success) {
      // Map error codes to appropriate HTTP status codes
      const statusCode = result.errorCode === 'SCHOOL_CODE_TAKEN' ? 409 :
                         result.errorCode === 'INVALID_SCHOOL_CODE_FORMAT' ? 400 :
                         result.errorCode === 'MISSING_REQUIRED_FIELD' ? 400 :
                         result.errorCode === 'TERMS_NOT_ACCEPTED' ? 400 :
                         result.errorCode === 'INVALID_EMAIL_FORMAT' ? 400 :
                         result.errorCode === 'PASSWORD_TOO_WEAK' ? 400 :
                         500

      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      schoolId: result.schoolId,
      adminUserId: result.adminUserId,
      message: 'School registered successfully',
    }, { status: 201 })

  } catch (error) {
    console.error('School registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    )
  }
}
