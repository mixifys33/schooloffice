/**
 * School Code Availability Check API Route
 * Requirements: 8.1 - Real-time availability feedback
 */
import { NextRequest, NextResponse } from 'next/server'
import { schoolRegistrationService } from '@/services/school-registration.service'

/**
 * GET /api/schools/check-code?code=SCHOOLCODE
 * Checks if a school code is available for registration
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'School code is required', available: false },
        { status: 400 }
      )
    }

    const result = await schoolRegistrationService.validateSchoolCode(code)

    return NextResponse.json({
      available: result.isAvailable,
      isValid: result.isValid,
      normalizedCode: result.normalizedCode,
      error: result.error,
    })
  } catch (error) {
    console.error('Error checking school code:', error)
    return NextResponse.json(
      { error: 'Failed to check school code availability', available: false },
      { status: 500 }
    )
  }
}
