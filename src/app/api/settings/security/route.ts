/**
 * Security Settings API Route
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.6
 * - GET: Get security settings (password rules, login limits, session timeout, 2FA)
 * - PUT: Update security settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, SecuritySettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<SecuritySettings>(
      schoolId,
      'security'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching security settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
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
    
    // Validate password minimum length - Requirement 18.1
    if (body.passwordMinLength !== undefined) {
      if (body.passwordMinLength < 6 || body.passwordMinLength > 128) {
        return NextResponse.json(
          { error: 'Password minimum length must be between 6 and 128 characters' },
          { status: 400 }
        )
      }
    }

    // Validate max login attempts - Requirement 18.2
    if (body.maxLoginAttempts !== undefined) {
      if (body.maxLoginAttempts < 1 || body.maxLoginAttempts > 20) {
        return NextResponse.json(
          { error: 'Maximum login attempts must be between 1 and 20' },
          { status: 400 }
        )
      }
    }

    // Validate lockout duration - Requirement 18.2
    if (body.lockoutDurationMinutes !== undefined) {
      if (body.lockoutDurationMinutes < 1 || body.lockoutDurationMinutes > 1440) {
        return NextResponse.json(
          { error: 'Lockout duration must be between 1 and 1440 minutes (24 hours)' },
          { status: 400 }
        )
      }
    }

    // Validate session timeout - Requirement 18.3
    if (body.sessionTimeoutMinutes !== undefined) {
      if (body.sessionTimeoutMinutes < 5 || body.sessionTimeoutMinutes > 1440) {
        return NextResponse.json(
          { error: 'Session timeout must be between 5 and 1440 minutes (24 hours)' },
          { status: 400 }
        )
      }
    }

    // Validate boolean fields
    const booleanFields = [
      'passwordRequireUppercase',
      'passwordRequireNumbers',
      'passwordRequireSpecialChars',
      'enableTwoFactorAuth',
      'autoLogoutOnInactivity'
    ]
    
    for (const field of booleanFields) {
      if (body[field] !== undefined && typeof body[field] !== 'boolean') {
        return NextResponse.json(
          { error: `${field} must be a boolean value` },
          { status: 400 }
        )
      }
    }

    const settings = await schoolSettingsService.updateSettings<SecuritySettings>(
      schoolId,
      'security',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating security settings:', error)
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    )
  }
}
