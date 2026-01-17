/**
 * Attendance Settings API Route
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - GET: Get attendance settings (late threshold, absent cutoff, statuses, marking roles)
 * - PUT: Update attendance settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, AttendanceSettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<AttendanceSettings>(
      schoolId,
      'attendance'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching attendance settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance settings' },
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
    
    // Validate late threshold - Requirement 14.1
    if (body.lateThresholdMinutes !== undefined) {
      if (body.lateThresholdMinutes < 0 || body.lateThresholdMinutes > 120) {
        return NextResponse.json(
          { error: 'Late threshold must be between 0 and 120 minutes' },
          { status: 400 }
        )
      }
    }

    // Validate absent cutoff time format (HH:mm) - Requirement 14.2
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (body.absentCutoffTime && !timeRegex.test(body.absentCutoffTime)) {
      return NextResponse.json(
        { error: 'Invalid absent cutoff time format. Use HH:mm' },
        { status: 400 }
      )
    }

    // Validate statuses array - Requirement 14.3
    if (body.statuses !== undefined) {
      if (!Array.isArray(body.statuses) || body.statuses.length === 0) {
        return NextResponse.json(
          { error: 'Statuses must be a non-empty array' },
          { status: 400 }
        )
      }
      // Ensure required statuses are present
      const requiredStatuses = ['PRESENT', 'ABSENT']
      for (const status of requiredStatuses) {
        if (!body.statuses.includes(status)) {
          return NextResponse.json(
            { error: `Status "${status}" is required` },
            { status: 400 }
          )
        }
      }
    }

    // Validate marking roles - Requirement 14.4
    if (body.markingRoles !== undefined) {
      if (!Array.isArray(body.markingRoles) || body.markingRoles.length === 0) {
        return NextResponse.json(
          { error: 'Marking roles must be a non-empty array' },
          { status: 400 }
        )
      }
    }

    const settings = await schoolSettingsService.updateSettings<AttendanceSettings>(
      schoolId,
      'attendance',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Attendance settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating attendance settings:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance settings' },
      { status: 500 }
    )
  }
}
