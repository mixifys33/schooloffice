/**
 * Academic Settings API Route
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * - GET: Get academic settings (year format, term structure, classes, subjects)
 * - PUT: Update academic settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, AcademicSettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<AcademicSettings>(
      schoolId,
      'academic'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching academic settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch academic settings' },
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
    
    // Validate term structure - Requirement 11.2
    if (body.termStructure && !['TRIMESTER', 'SEMESTER', 'QUARTER'].includes(body.termStructure)) {
      return NextResponse.json(
        { error: 'Invalid term structure. Must be TRIMESTER, SEMESTER, or QUARTER' },
        { status: 400 }
      )
    }

    // Validate default term weeks
    if (body.defaultTermWeeks !== undefined && (body.defaultTermWeeks < 1 || body.defaultTermWeeks > 52)) {
      return NextResponse.json(
        { error: 'Default term weeks must be between 1 and 52' },
        { status: 400 }
      )
    }

    const settings = await schoolSettingsService.updateSettings<AcademicSettings>(
      schoolId,
      'academic',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Academic settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating academic settings:', error)
    return NextResponse.json(
      { error: 'Failed to update academic settings' },
      { status: 500 }
    )
  }
}
