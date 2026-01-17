/**
 * School Identity Settings API Route
 * Requirements: 10.1, 10.2, 10.3
 * - GET: Get school identity settings
 * - PUT: Update school identity settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, SchoolIdentitySettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<SchoolIdentitySettings>(
      schoolId,
      'identity'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching identity settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch identity settings' },
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
    
    // Validate required fields - Requirement 10.5
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { error: 'School name cannot be empty' },
        { status: 400 }
      )
    }

    const settings = await schoolSettingsService.updateSettings<SchoolIdentitySettings>(
      schoolId,
      'identity',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Identity settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating identity settings:', error)
    return NextResponse.json(
      { error: 'Failed to update identity settings' },
      { status: 500 }
    )
  }
}
