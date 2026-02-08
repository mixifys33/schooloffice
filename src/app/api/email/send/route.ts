/**
 * Email Send API Route
 * Simple email sending for staff credentials and basic notifications
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { emailService } from '@/services/email.service'

interface SendEmailRequest {
  to: string
  subject: string
  html: string
  type?: string
}

/**
 * POST /api/email/send
 * Send email (used internally by staff onboarding)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📧 [Email API] POST /api/email/send called')
    
    const session = await auth()
    
    // Allow internal calls without session (for staff onboarding)
    const isInternalCall = request.headers.get('x-internal-call') === 'true'
    console.log('📧 [Email API] Internal call:', isInternalCall)
    console.log('📧 [Email API] Session exists:', !!session?.user)
    
    if (!session?.user && !isInternalCall) {
      console.log('❌ [Email API] Unauthorized - no session and not internal call')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SendEmailRequest = await request.json()
    const { to, subject, html, type } = body
    
    console.log('📧 [Email API] Request body:', { to, subject, type, htmlLength: html?.length })

    if (!to || !subject || !html) {
      console.log('❌ [Email API] Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    console.log('📧 [Email API] Calling emailService.sendEmail...')
    
    // Send email using the email service
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
    })
    
    console.log('📧 [Email API] Email service result:', result)

    if (result.success) {
      console.log('✅ [Email API] Email sent successfully')
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      })
    } else {
      console.log('❌ [Email API] Email failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ [Email API] Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}