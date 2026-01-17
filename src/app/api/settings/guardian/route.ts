/**
 * Guardian Settings API Route
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 * - GET: Get guardian settings (relationship types, max guardians, message routing, portal visibility)
 * - PUT: Update guardian settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, GuardianSettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<GuardianSettings>(
      schoolId,
      'guardian'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching guardian settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guardian settings' },
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
    
    // Validate allowed relationship types - Requirement 19.1
    if (body.allowedRelationshipTypes !== undefined) {
      if (!Array.isArray(body.allowedRelationshipTypes) || body.allowedRelationshipTypes.length === 0) {
        return NextResponse.json(
          { error: 'Allowed relationship types must be a non-empty array' },
          { status: 400 }
        )
      }
    }

    // Validate max guardians per student - Requirement 19.3
    if (body.maxGuardiansPerStudent !== undefined) {
      if (body.maxGuardiansPerStudent < 1 || body.maxGuardiansPerStudent > 10) {
        return NextResponse.json(
          { error: 'Maximum guardians per student must be between 1 and 10' },
          { status: 400 }
        )
      }
    }

    // Validate default primary guardian logic - Requirement 19.2
    if (body.defaultPrimaryGuardianLogic && 
        !['FIRST_ADDED', 'MOTHER', 'FATHER', 'MANUAL'].includes(body.defaultPrimaryGuardianLogic)) {
      return NextResponse.json(
        { error: 'Invalid default primary guardian logic. Must be FIRST_ADDED, MOTHER, FATHER, or MANUAL' },
        { status: 400 }
      )
    }

    // Validate academic message recipients - Requirement 19.4
    if (body.academicMessageRecipients !== undefined) {
      if (!Array.isArray(body.academicMessageRecipients)) {
        return NextResponse.json(
          { error: 'Academic message recipients must be an array' },
          { status: 400 }
        )
      }
    }

    // Validate finance message recipients - Requirement 19.4
    if (body.financeMessageRecipients !== undefined) {
      if (!Array.isArray(body.financeMessageRecipients)) {
        return NextResponse.json(
          { error: 'Finance message recipients must be an array' },
          { status: 400 }
        )
      }
    }

    // Validate portal default visibility - Requirement 19.5
    if (body.portalDefaultVisibility !== undefined) {
      if (typeof body.portalDefaultVisibility !== 'object') {
        return NextResponse.json(
          { error: 'Portal default visibility must be an object' },
          { status: 400 }
        )
      }
    }

    const settings = await schoolSettingsService.updateSettings<GuardianSettings>(
      schoolId,
      'guardian',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Guardian settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating guardian settings:', error)
    return NextResponse.json(
      { error: 'Failed to update guardian settings' },
      { status: 500 }
    )
  }
}
