/**
 * Communication Settings API Route
 * Requirements: 13.1, 13.2, 13.3, 13.5
 * - GET: Get communication settings (SMS provider, WhatsApp, email SMTP, quiet hours)
 * - PUT: Update communication settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, CommunicationSettings } from '@/services/school-settings.service'

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

    const settings = await schoolSettingsService.getSettings<CommunicationSettings>(
      schoolId,
      'communication'
    )

    // Mask sensitive fields for security
    const maskedSettings = {
      ...settings,
      smsApiKey: settings.smsApiKey ? '********' : undefined,
      whatsappApiKey: settings.whatsappApiKey ? '********' : undefined,
      emailSmtpPassword: settings.emailSmtpPassword ? '********' : undefined,
    }

    return NextResponse.json(maskedSettings)
  } catch (error) {
    console.error('Error fetching communication settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communication settings' },
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
    
    // Validate quiet hours format (HH:mm) - Requirement 13.5
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (body.quietHoursStart && !timeRegex.test(body.quietHoursStart)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours start time format. Use HH:mm' },
        { status: 400 }
      )
    }
    if (body.quietHoursEnd && !timeRegex.test(body.quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours end time format. Use HH:mm' },
        { status: 400 }
      )
    }

    // Validate email SMTP port
    if (body.emailSmtpPort !== undefined && (body.emailSmtpPort < 1 || body.emailSmtpPort > 65535)) {
      return NextResponse.json(
        { error: 'Invalid SMTP port. Must be between 1 and 65535' },
        { status: 400 }
      )
    }

    // Don't update masked fields if they contain placeholder
    const updateData = { ...body }
    if (updateData.smsApiKey === '********') delete updateData.smsApiKey
    if (updateData.whatsappApiKey === '********') delete updateData.whatsappApiKey
    if (updateData.emailSmtpPassword === '********') delete updateData.emailSmtpPassword

    const settings = await schoolSettingsService.updateSettings<CommunicationSettings>(
      schoolId,
      'communication',
      updateData,
      userId
    )

    // Mask sensitive fields in response
    const maskedSettings = {
      ...settings,
      smsApiKey: settings.smsApiKey ? '********' : undefined,
      whatsappApiKey: settings.whatsappApiKey ? '********' : undefined,
      emailSmtpPassword: settings.emailSmtpPassword ? '********' : undefined,
    }

    return NextResponse.json({
      success: true,
      message: 'Communication settings updated successfully',
      settings: maskedSettings,
    })
  } catch (error) {
    console.error('Error updating communication settings:', error)
    return NextResponse.json(
      { error: 'Failed to update communication settings' },
      { status: 500 }
    )
  }
}
