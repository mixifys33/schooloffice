/**
 * Email Service - Gmail (SMTP) Primary with SendGrid Fallback
 * 
 * This service handles all email sending operations:
 * - Teacher invitations on creation
 * - Verification codes
 * - Password reset codes
 * - General notifications
 * 
 * Gmail (SMTP) is the primary/default email gateway.
 * SendGrid is the fallback when Gmail fails or has errors.
 * The active provider can be switched in the super admin dashboard (Communication section).
 */

import { MessageStatus } from '@/types/enums'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// ============================================
// TYPES
// ============================================

export type EmailProvider = 'gmail' | 'sendgrid'

export interface EmailServiceConfig {
  activeProvider: EmailProvider
  gmail: {
    user: string
    pass: string
    host: string
    port: number
    service: string
  }
  sendgrid: {
    apiKey: string
  }
  fromEmail: string
  fromName: string
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType: string
  encoding?: 'base64' | 'utf-8'
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  status: MessageStatus
  error?: string
  recipient: string
  provider: EmailProvider
  usedFallback: boolean
}

export interface SchoolBranding {
  schoolName: string
  schoolLogo?: string
  primaryColor?: string
  secondaryColor?: string
  address?: string
  phone?: string
  email?: string
  website?: string
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Generate branded HTML email template
 */
export function generateBrandedEmailTemplate(
  content: string,
  branding: SchoolBranding
): string {
  const primaryColor = branding.primaryColor || '#1a56db'
  const secondaryColor = branding.secondaryColor || '#6b7280'
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${branding.schoolName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background-color: ${primaryColor};
      padding: 20px;
      text-align: center;
    }
    .email-header img {
      max-height: 60px;
      margin-bottom: 10px;
    }
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 30px;
    }
    .email-content {
      margin-bottom: 20px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: ${secondaryColor};
      border-top: 1px solid #e5e7eb;
    }
    .email-footer p {
      margin: 5px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 10px 0;
    }
    .verification-code {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      color: ${primaryColor};
      background-color: #f3f4f6;
      padding: 15px 25px;
      border-radius: 8px;
      display: inline-block;
      margin: 20px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      ${branding.schoolLogo ? `<img src="${branding.schoolLogo}" alt="${branding.schoolName} Logo">` : ''}
      <h1>${branding.schoolName}</h1>
    </div>
    <div class="email-body">
      <div class="email-content">
        ${content}
      </div>
    </div>
    <div class="email-footer">
      <p><strong>${branding.schoolName}</strong></p>
      ${branding.address ? `<p>${branding.address}</p>` : ''}
      ${branding.phone ? `<p>Phone: ${branding.phone}</p>` : ''}
      ${branding.email ? `<p>Email: ${branding.email}</p>` : ''}
      ${branding.website ? `<p><a href="${branding.website}">${branding.website}</a></p>` : ''}
      <p style="margin-top: 15px; font-size: 11px;">
        This email was sent by SchoolOffice on behalf of ${branding.schoolName}.
        If you believe you received this email in error, please contact the school directly.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of email
 */
export function generatePlainTextEmail(
  content: string,
  branding: SchoolBranding
): string {
  const plainContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

  const footer = [
    '',
    '---',
    branding.schoolName,
    branding.address || '',
    branding.phone ? `Phone: ${branding.phone}` : '',
    branding.email ? `Email: ${branding.email}` : '',
    '',
    'This email was sent by SchoolOffice on behalf of ' + branding.schoolName,
  ].filter(Boolean).join('\n')

  return plainContent + '\n' + footer
}

// ============================================
// SPECIFIC EMAIL TEMPLATES
// ============================================

export function generateTeacherInvitationEmail(
  teacherName: string,
  email: string,
  temporaryPassword: string,
  loginUrl: string,
  schoolName: string
): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${schoolName} - Your Teacher Account`
  
  const html = `
    <h2>Welcome, ${teacherName}!</h2>
    <p>You have been invited to join <strong>${schoolName}</strong> as a teacher on the SchoolOffice platform.</p>
    
    <h3>Your Login Credentials</h3>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</code></p>
    
    <p style="margin-top: 20px;">
      <a href="${loginUrl}" class="button">Login to Your Account</a>
    </p>
    
    <p style="color: #ef4444; margin-top: 20px;">
      <strong>Important:</strong> You will be required to change your password on first login.
    </p>
    
    <p>If you have any questions, please contact your school administrator.</p>
  `
  
  const text = `
Welcome, ${teacherName}!

You have been invited to join ${schoolName} as a teacher on the SchoolOffice platform.

Your Login Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

Login URL: ${loginUrl}

IMPORTANT: You will be required to change your password on first login.

If you have any questions, please contact your school administrator.
  `.trim()
  
  return { subject, html, text }
}

export function generateVerificationCodeEmail(
  recipientName: string,
  code: string,
  purpose: 'email_verification' | 'phone_verification' | 'two_factor',
  expiryMinutes: number = 10
): { subject: string; html: string; text: string } {
  const purposeText = {
    email_verification: 'Email Verification',
    phone_verification: 'Phone Verification',
    two_factor: 'Two-Factor Authentication',
  }[purpose]
  
  const subject = `Your ${purposeText} Code`
  
  const html = `
    <h2>Hello${recipientName ? `, ${recipientName}` : ''}!</h2>
    <p>Your ${purposeText.toLowerCase()} code is:</p>
    
    <div style="text-align: center;">
      <span class="verification-code">${code}</span>
    </div>
    
    <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
    
    <p style="color: #6b7280; font-size: 14px;">
      If you didn't request this code, please ignore this email or contact support if you have concerns.
    </p>
  `
  
  const text = `
Hello${recipientName ? `, ${recipientName}` : ''}!

Your ${purposeText.toLowerCase()} code is: ${code}

This code will expire in ${expiryMinutes} minutes.

If you didn't request this code, please ignore this email or contact support if you have concerns.
  `.trim()
  
  return { subject, html, text }
}

export function generatePasswordResetEmail(
  recipientName: string,
  resetCode: string,
  resetUrl: string,
  expiryMinutes: number = 30
): { subject: string; html: string; text: string } {
  const subject = 'Password Reset Request'
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello${recipientName ? `, ${recipientName}` : ''},</p>
    <p>We received a request to reset your password. Use the code below or click the button to reset your password:</p>
    
    <div style="text-align: center;">
      <span class="verification-code">${resetCode}</span>
    </div>
    
    <p style="text-align: center; margin-top: 20px;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    
    <p>This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
    
    <p style="color: #ef4444; margin-top: 20px;">
      <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
      Your password will remain unchanged.
    </p>
  `
  
  const text = `
Password Reset Request

Hello${recipientName ? `, ${recipientName}` : ''},

We received a request to reset your password.

Your reset code is: ${resetCode}

Or use this link: ${resetUrl}

This code will expire in ${expiryMinutes} minutes.

SECURITY NOTICE: If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
  `.trim()
  
  return { subject, html, text }
}


// ============================================
// EMAIL SERVICE CLASS
// ============================================

export class EmailService {
  private config: EmailServiceConfig
  private gmailTransporter: Transporter | null = null
  private activeProvider: EmailProvider

  constructor(config?: Partial<EmailServiceConfig>) {
    this.config = this.loadConfig(config)
    this.activeProvider = this.config.activeProvider
    this.initializeGmailTransporter()
  }

  /**
   * Load configuration from environment variables with optional overrides
   */
  private loadConfig(overrides?: Partial<EmailServiceConfig>): EmailServiceConfig {
    return {
      activeProvider: (overrides?.activeProvider || process.env.EMAIL_ACTIVE_PROVIDER || 'gmail') as EmailProvider,
      gmail: {
        user: overrides?.gmail?.user || process.env.SMTP_USER || '',
        pass: overrides?.gmail?.pass || process.env.SMTP_PASS || '',
        host: overrides?.gmail?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: overrides?.gmail?.port || parseInt(process.env.SMTP_PORT || '465', 10),
        service: overrides?.gmail?.service || process.env.SMTP_SERVICE || 'gmail',
      },
      sendgrid: {
        apiKey: overrides?.sendgrid?.apiKey || process.env.SENDGRID_API_KEY || '',
      },
      fromEmail: overrides?.fromEmail || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@schooloffice.com',
      fromName: overrides?.fromName || process.env.EMAIL_FROM_NAME || 'SchoolOffice',
    }
  }

  /**
   * Initialize Gmail SMTP transporter
   */
  private initializeGmailTransporter(): void {
    console.log('🔧 [Email Service] Initializing Gmail SMTP transporter...')
    console.log('🔧 [Email Service] SMTP_USER:', this.config.gmail.user)
    console.log('🔧 [Email Service] SMTP_PASS configured:', !!this.config.gmail.pass)
    console.log('🔧 [Email Service] SMTP_HOST:', this.config.gmail.host)
    console.log('🔧 [Email Service] SMTP_PORT:', this.config.gmail.port)
    console.log('🔧 [Email Service] SMTP_SERVICE:', this.config.gmail.service)
    console.log('🔧 [Email Service] EMAIL_FROM:', this.config.fromEmail)
    console.log('🔧 [Email Service] EMAIL_FROM_NAME:', this.config.fromName)
    
    if (!this.config.gmail.user || !this.config.gmail.pass) {
      console.warn('⚠️ [Email Service] Gmail SMTP credentials not configured')
      console.warn('⚠️ [Email Service] SMTP_USER empty:', !this.config.gmail.user)
      console.warn('⚠️ [Email Service] SMTP_PASS empty:', !this.config.gmail.pass)
      return
    }

    try {
      this.gmailTransporter = nodemailer.createTransport({
        service: this.config.gmail.service,
        host: this.config.gmail.host,
        port: this.config.gmail.port,
        secure: this.config.gmail.port === 465,
        auth: {
          user: this.config.gmail.user,
          pass: this.config.gmail.pass,
        },
      })
      console.log('✅ [Email Service] Gmail transporter created successfully')
    } catch (error) {
      console.error('❌ [Email Service] Failed to create Gmail transporter:', error)
    }
  }

  /**
   * Get the currently active email provider
   */
  getActiveProvider(): EmailProvider {
    return this.activeProvider
  }

  /**
   * Switch the active email provider (for super admin dashboard)
   */
  setActiveProvider(provider: EmailProvider): void {
    this.activeProvider = provider
    console.log(`Email provider switched to: ${provider}`)
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' }
    }

    const trimmed = email.trim().toLowerCase()
    
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email address format' }
    }

    // Check for common typos
    const domain = trimmed.split('@')[1]
    const commonTypos: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'hotmal.com': 'hotmail.com',
    }

    if (commonTypos[domain]) {
      return { 
        valid: false, 
        error: `Did you mean ${email.replace(domain, commonTypos[domain])}?` 
      }
    }

    return { valid: true }
  }

  /**
   * Send email using the active provider with automatic fallback
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]
    
    if (recipients.length === 0) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: 'No recipients provided',
        recipient: '',
        provider: this.activeProvider,
        usedFallback: false,
      }
    }

    // Validate email addresses
    for (const email of recipients) {
      const validation = this.validateEmail(email)
      if (!validation.valid) {
        return {
          success: false,
          status: MessageStatus.FAILED,
          error: validation.error,
          recipient: email,
          provider: this.activeProvider,
          usedFallback: false,
        }
      }
    }

    // Try primary provider first
    let result = await this.sendWithProvider(this.activeProvider, options, recipients)
    
    // If primary fails, try fallback
    if (!result.success) {
      const fallbackProvider: EmailProvider = this.activeProvider === 'gmail' ? 'sendgrid' : 'gmail'
      console.log(`Primary provider (${this.activeProvider}) failed, trying fallback (${fallbackProvider})...`)
      
      const fallbackResult = await this.sendWithProvider(fallbackProvider, options, recipients)
      if (fallbackResult.success) {
        return {
          ...fallbackResult,
          usedFallback: true,
        }
      }
      
      // Both failed, return original error
      return {
        ...result,
        error: `Primary (${this.activeProvider}): ${result.error}. Fallback (${fallbackProvider}): ${fallbackResult.error}`,
      }
    }

    return result
  }

  /**
   * Send email using a specific provider
   */
  private async sendWithProvider(
    provider: EmailProvider,
    options: SendEmailOptions,
    recipients: string[]
  ): Promise<EmailResult> {
    try {
      if (provider === 'gmail') {
        return await this.sendViaGmail(options, recipients)
      } else {
        return await this.sendViaSendGrid(options, recipients)
      }
    } catch (error) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: recipients[0],
        provider,
        usedFallback: false,
      }
    }
  }

  /**
   * Send email via Gmail SMTP (Nodemailer)
   */
  private async sendViaGmail(options: SendEmailOptions, recipients: string[]): Promise<EmailResult> {
    console.log('🔧 [Email Service] sendViaGmail called')
    console.log('🔧 [Email Service] Gmail transporter initialized:', !!this.gmailTransporter)
    console.log('🔧 [Email Service] Recipients:', recipients)
    
    if (!this.gmailTransporter) {
      const error = 'Gmail SMTP not configured'
      console.error('❌ [Email Service]', error)
      throw new Error(error)
    }

    const mailOptions = {
      from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: att.encoding,
      })),
    }

    console.log('🔧 [Email Service] Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    })

    try {
      const info = await this.gmailTransporter.sendMail(mailOptions)
      
      console.log('✅ [Email Service] Email sent successfully, messageId:', info.messageId)

      return {
        success: true,
        messageId: info.messageId,
        status: MessageStatus.SENT,
        recipient: recipients[0],
        provider: 'gmail',
        usedFallback: false,
      }
    } catch (error) {
      console.error('❌ [Email Service] Gmail send error:', error)
      throw error
    }
  }

  /**
   * Send email via SendGrid API
   */
  private async sendViaSendGrid(options: SendEmailOptions, recipients: string[]): Promise<EmailResult> {
    if (!this.config.sendgrid.apiKey) {
      throw new Error('SendGrid API key not configured')
    }

    const url = 'https://api.sendgrid.com/v3/mail/send'
    
    const payload = {
      personalizations: [{
        to: recipients.map(email => ({ email })),
      }],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      subject: options.subject,
      content: [
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        { type: 'text/html', value: options.html },
      ],
      ...(options.replyTo && {
        reply_to: { email: options.replyTo },
      }),
      ...(options.attachments && options.attachments.length > 0 && {
        attachments: options.attachments.map(att => ({
          content: att.content instanceof Buffer 
            ? att.content.toString('base64')
            : att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment',
        })),
      }),
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.sendgrid.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
    }

    const messageId = response.headers.get('x-message-id') || undefined

    return {
      success: true,
      messageId,
      status: MessageStatus.SENT,
      recipient: recipients[0],
      provider: 'sendgrid',
      usedFallback: false,
    }
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Send teacher invitation email
   */
  async sendTeacherInvitation(
    teacherEmail: string,
    teacherName: string,
    temporaryPassword: string,
    schoolName: string,
    branding?: SchoolBranding
  ): Promise<EmailResult> {
    const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`
    const { subject, html, text } = generateTeacherInvitationEmail(
      teacherName,
      teacherEmail,
      temporaryPassword,
      loginUrl,
      schoolName
    )

    const finalHtml = branding 
      ? generateBrandedEmailTemplate(html, branding)
      : html

    return this.sendEmail({
      to: teacherEmail,
      subject,
      html: finalHtml,
      text,
    })
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(
    email: string,
    recipientName: string,
    code: string,
    purpose: 'email_verification' | 'phone_verification' | 'two_factor',
    branding?: SchoolBranding,
    expiryMinutes: number = 10
  ): Promise<EmailResult> {
    const { subject, html, text } = generateVerificationCodeEmail(
      recipientName,
      code,
      purpose,
      expiryMinutes
    )

    const finalHtml = branding 
      ? generateBrandedEmailTemplate(html, branding)
      : html

    return this.sendEmail({
      to: email,
      subject,
      html: finalHtml,
      text,
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    recipientName: string,
    resetCode: string,
    branding?: SchoolBranding,
    expiryMinutes: number = 30
  ): Promise<EmailResult> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?code=${resetCode}`
    const { subject, html, text } = generatePasswordResetEmail(
      recipientName,
      resetCode,
      resetUrl,
      expiryMinutes
    )

    const finalHtml = branding 
      ? generateBrandedEmailTemplate(html, branding)
      : html

    return this.sendEmail({
      to: email,
      subject,
      html: finalHtml,
      text,
    })
  }

  /**
   * Send branded email with custom content
   */
  async sendBrandedEmail(
    to: string,
    subject: string,
    content: string,
    branding: SchoolBranding
  ): Promise<EmailResult> {
    const html = generateBrandedEmailTemplate(content, branding)
    const text = generatePlainTextEmail(content, branding)

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    })
  }

  /**
   * Send email with PDF attachment (e.g., report card)
   */
  async sendEmailWithPDF(
    to: string,
    subject: string,
    html: string,
    pdfBuffer: Buffer,
    filename: string,
    branding?: SchoolBranding
  ): Promise<EmailResult> {
    const finalHtml = branding 
      ? generateBrandedEmailTemplate(html, branding)
      : html
    
    const text = branding
      ? generatePlainTextEmail(html, branding)
      : undefined

    return this.sendEmail({
      to,
      subject,
      html: finalHtml,
      text,
      attachments: [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    })
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
    attachments?: EmailAttachment[],
    batchSize: number = 50
  ): Promise<{ totalSent: number; totalFailed: number; results: EmailResult[] }> {
    const results: EmailResult[] = []
    let totalSent = 0
    let totalFailed = 0

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      const batchPromises = batch.map(recipient =>
        this.sendEmail({ to: recipient, subject, html, text, attachments })
      )

      const batchResults = await Promise.all(batchPromises)
      
      for (const result of batchResults) {
        results.push(result)
        if (result.success) totalSent++
        else totalFailed++
      }

      // Rate limiting between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { totalSent, totalFailed, results }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ gmail: boolean; sendgrid: boolean; errors: string[] }> {
    const errors: string[] = []
    let gmailOk = false
    let sendgridOk = false

    // Test Gmail
    if (this.gmailTransporter) {
      try {
        await this.gmailTransporter.verify()
        gmailOk = true
      } catch (error) {
        errors.push(`Gmail: ${error instanceof Error ? error.message : 'Connection failed'}`)
      }
    } else {
      errors.push('Gmail: Not configured')
    }

    // Test SendGrid (just check if API key exists)
    if (this.config.sendgrid.apiKey) {
      sendgridOk = true
    } else {
      errors.push('SendGrid: API key not configured')
    }

    return { gmail: gmailOk, sendgrid: sendgridOk, errors }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let emailServiceInstance: EmailService | null = null

/**
 * Get the email service singleton instance
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService()
  }
  return emailServiceInstance
}

/**
 * Create a new email service instance with custom config
 */
export function createEmailService(config?: Partial<EmailServiceConfig>): EmailService {
  return new EmailService(config)
}

// Export singleton for convenience
export const emailService = getEmailService()
