/**
 * Email Gateway Service - SendGrid/Mailgun Integration
 * Handles email sending with attachments and school branding
 * Requirements: 22.2
 */

import { MessageStatus } from '@/types/enums'

// ============================================
// TYPES
// ============================================

export interface EmailConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  provider: 'sendgrid' | 'mailgun'
  domain?: string // Required for Mailgun
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType: string
  encoding?: 'base64' | 'utf-8'
}

export interface EmailSendRequest {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
  replyTo?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  status: MessageStatus
  error?: string
  recipient: string
}

export interface EmailBatchResult {
  totalSent: number
  totalFailed: number
  results: EmailSendResult[]
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

// SendGrid API response types
interface SendGridResponse {
  statusCode: number
  headers: Record<string, string>
}

// Mailgun API response types
interface MailgunResponse {
  id: string
  message: string
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Generate branded HTML email template
 * Requirement 22.2: Include school branding
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
    .button:hover {
      opacity: 0.9;
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
  // Strip HTML tags for plain text version
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
// EMAIL GATEWAY SERVICE
// ============================================

export class EmailGatewayService {
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }

  /**
   * Send a single email with optional attachments
   * Requirement 22.2: Send formatted emails with attachments
   */
  async sendEmail(request: EmailSendRequest): Promise<EmailSendResult> {
    const recipients = Array.isArray(request.to) ? request.to : [request.to]
    
    if (recipients.length === 0) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: 'No recipients provided',
        recipient: '',
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
        }
      }
    }

    try {
      if (this.config.provider === 'sendgrid') {
        return await this.sendViaSendGrid(request, recipients)
      } else {
        return await this.sendViaMailgun(request, recipients)
      }
    } catch (error) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: recipients[0],
      }
    }
  }

  /**
   * Send email with PDF attachment (e.g., report card)
   * Requirement 22.2: Include PDF attachments
   */
  async sendEmailWithPDF(
    to: string,
    subject: string,
    html: string,
    pdfBuffer: Buffer,
    filename: string,
    branding?: SchoolBranding
  ): Promise<EmailSendResult> {
    const brandedHtml = branding 
      ? generateBrandedEmailTemplate(html, branding)
      : html
    
    const plainText = branding
      ? generatePlainTextEmail(html, branding)
      : undefined

    return this.sendEmail({
      to,
      subject,
      html: brandedHtml,
      text: plainText,
      attachments: [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    })
  }

  /**
   * Send branded email without attachments
   * Requirement 22.2: Include school branding
   */
  async sendBrandedEmail(
    to: string,
    subject: string,
    content: string,
    branding: SchoolBranding
  ): Promise<EmailSendResult> {
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
   * Send emails to multiple recipients
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
    attachments?: EmailAttachment[],
    batchSize: number = 100
  ): Promise<EmailBatchResult> {
    const results: EmailSendResult[] = []
    let totalSent = 0
    let totalFailed = 0

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      // Send to each recipient in the batch
      const batchPromises = batch.map(recipient =>
        this.sendEmail({ to: recipient, subject, html, text, attachments })
      )

      const batchResults = await Promise.all(batchPromises)
      
      for (const result of batchResults) {
        results.push(result)
        if (result.success) totalSent++
        else totalFailed++
      }

      // Rate limiting: wait between batches
      if (i + batchSize < recipients.length) {
        await this.delay(1000)
      }
    }

    return {
      totalSent,
      totalFailed,
      results,
    }
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' }
    }

    const trimmed = email.trim().toLowerCase()
    
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Invalid email address format' }
    }

    // Check for common typos in domain
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

  // ============================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // ============================================

  private async sendViaSendGrid(
    request: EmailSendRequest,
    recipients: string[]
  ): Promise<EmailSendResult> {
    const url = 'https://api.sendgrid.com/v3/mail/send'
    
    // Build SendGrid payload
    const payload = {
      personalizations: [{
        to: recipients.map(email => ({ email })),
      }],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      subject: request.subject,
      content: [
        ...(request.text ? [{ type: 'text/plain', value: request.text }] : []),
        { type: 'text/html', value: request.html },
      ],
      ...(request.replyTo && {
        reply_to: { email: request.replyTo },
      }),
      ...(request.attachments && request.attachments.length > 0 && {
        attachments: request.attachments.map(att => ({
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
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
    }

    // SendGrid returns 202 Accepted on success
    const messageId = response.headers.get('x-message-id') || undefined

    return {
      success: true,
      messageId,
      status: MessageStatus.SENT,
      recipient: recipients[0],
    }
  }

  private async sendViaMailgun(
    request: EmailSendRequest,
    recipients: string[]
  ): Promise<EmailSendResult> {
    if (!this.config.domain) {
      throw new Error('Mailgun domain is required')
    }

    const url = `https://api.mailgun.net/v3/${this.config.domain}/messages`
    
    // Build form data for Mailgun
    const formData = new FormData()
    formData.append('from', `${this.config.fromName} <${this.config.fromEmail}>`)
    formData.append('to', recipients.join(','))
    formData.append('subject', request.subject)
    formData.append('html', request.html)
    
    if (request.text) {
      formData.append('text', request.text)
    }
    
    if (request.replyTo) {
      formData.append('h:Reply-To', request.replyTo)
    }

    // Add attachments
    if (request.attachments) {
      for (const att of request.attachments) {
        const blob = att.content instanceof Buffer
          ? new Blob([att.content], { type: att.contentType })
          : new Blob([att.content], { type: att.contentType })
        formData.append('attachment', blob, att.filename)
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${this.config.apiKey}`).toString('base64'),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as MailgunResponse

    return {
      success: true,
      messageId: data.id,
      status: MessageStatus.SENT,
      recipient: recipients[0],
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create Email Gateway service from environment variables
 */
export function createEmailGateway(): EmailGatewayService {
  const provider = (process.env.EMAIL_PROVIDER as 'sendgrid' | 'mailgun') || 'sendgrid'
  
  const config: EmailConfig = {
    apiKey: process.env.EMAIL_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@schooloffice.com',
    fromName: process.env.EMAIL_FROM_NAME || 'SchoolOffice',
    provider,
    domain: process.env.MAILGUN_DOMAIN,
  }

  return new EmailGatewayService(config)
}

// Export singleton instance
export const emailGateway = createEmailGateway()
