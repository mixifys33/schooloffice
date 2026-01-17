/**
 * Email Settings API
 * 
 * Allows super admin to:
 * - View current email provider configuration
 * - Switch between Gmail (primary) and SendGrid (fallback)
 * - Test email configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService, EmailProvider } from '@/services/email.service'

/**
 * GET /api/communication/email-settings
 * Get current email configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin and school admin can view email settings
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const activeProvider = emailService.getActiveProvider()
    const connectionTest = await emailService.testConnection()

    return NextResponse.json({
      activeProvider,
      availableProviders: ['gmail', 'sendgrid'] as EmailProvider[],
      providerStatus: {
        gmail: {
          configured: connectionTest.gmail,
          description: 'Gmail SMTP - Primary email sender for teacher invites, verification codes, and password resets',
        },
        sendgrid: {
          configured: connectionTest.sendgrid,
          description: 'SendGrid API - Fallback email sender when Gmail fails',
        },
      },
      errors: connectionTest.errors,
    })
  } catch (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/communication/email-settings
 * Update email provider settings (super admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can change email settings
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { activeProvider } = body

    if (!activeProvider || !['gmail', 'sendgrid'].includes(activeProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "gmail" or "sendgrid"' },
        { status: 400 }
      )
    }

    // Switch the active provider
    emailService.setActiveProvider(activeProvider as EmailProvider)

    return NextResponse.json({
      success: true,
      message: `Email provider switched to ${activeProvider}`,
      activeProvider: emailService.getActiveProvider(),
    })
  } catch (error) {
    console.error('Error updating email settings:', error)
    return NextResponse.json(
      { error: 'Failed to update email settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/communication/email-settings
 * Test email configuration by sending a test email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admin can test email settings
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { testEmail, provider } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      )
    }

    // Validate email
    const validation = emailService.validateEmail(testEmail)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // If specific provider requested, temporarily switch
    const originalProvider = emailService.getActiveProvider()
    if (provider && ['gmail', 'sendgrid'].includes(provider)) {
      emailService.setActiveProvider(provider as EmailProvider)
    }

    // Send test email
    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'SchoolOffice Email Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email from SchoolOffice.</p>
        <p><strong>Provider:</strong> ${emailService.getActiveProvider()}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p>If you received this email, your email configuration is working correctly!</p>
      `,
      text: `Email Configuration Test\n\nThis is a test email from SchoolOffice.\nProvider: ${emailService.getActiveProvider()}\nTimestamp: ${new Date().toISOString()}\n\nIf you received this email, your email configuration is working correctly!`,
    })

    // Restore original provider if we switched
    if (provider && provider !== originalProvider) {
      emailService.setActiveProvider(originalProvider)
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully via ${result.provider}`,
        messageId: result.messageId,
        usedFallback: result.usedFallback,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        provider: result.provider,
        usedFallback: result.usedFallback,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error testing email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
