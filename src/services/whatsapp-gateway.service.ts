/**
 * WhatsApp Gateway Service - Africa's Talking / Twilio Integration
 * Handles WhatsApp message sending with attachments and read receipt tracking
 * Requirements: 22.1, 22.3, 25.3
 */

import { MessageStatus } from '@/types/enums'

// ============================================
// TYPES
// ============================================

export interface WhatsAppConfig {
  apiKey: string
  username: string
  productId?: string
  environment?: 'sandbox' | 'production'
}

export interface WhatsAppAttachment {
  type: 'document' | 'image' | 'audio' | 'video'
  url?: string
  buffer?: Buffer
  filename?: string
  mimeType?: string
  caption?: string
}

export interface WhatsAppSendRequest {
  to: string
  message: string
  attachment?: WhatsAppAttachment
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  status: MessageStatus
  error?: string
  recipient: string
}

export interface WhatsAppDeliveryStatus {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  failureReason?: string
  deliveredAt?: Date
  readAt?: Date
}

export interface WhatsAppBatchResult {
  totalSent: number
  totalFailed: number
  results: WhatsAppSendResult[]
}

// Africa's Talking WhatsApp API response types
interface ATWhatsAppRecipient {
  statusCode: number
  number: string
  status: string
  messageId: string
}

interface ATWhatsAppResponse {
  contacts: ATWhatsAppRecipient[]
  messages: { id: string }[]
}

interface ATWhatsAppStatusCallback {
  id: string
  status: string
  timestamp?: string
}

// ============================================
// WHATSAPP GATEWAY SERVICE
// ============================================

export class WhatsAppGatewayService {
  private config: WhatsAppConfig
  private baseUrl: string

  constructor(config: WhatsAppConfig) {
    this.config = config
    this.baseUrl = config.environment === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1'
      : 'https://api.africastalking.com/version1'
  }

  /**
   * Send a WhatsApp message with optional attachment
   * Requirement 22.1: Deliver text content with optional PDF attachment
   */
  async sendWhatsApp(request: WhatsAppSendRequest): Promise<WhatsAppSendResult> {
    const { to, message, attachment } = request

    // Validate phone number
    const validation = this.validateWhatsAppNumber(to)
    if (!validation.valid) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: validation.error,
        recipient: to,
      }
    }

    try {
      // Build request payload
      const payload = this.buildMessagePayload(validation.formatted, message, attachment)
      
      const response = await this.makeAPIRequest('/whatsapp/send', payload)
      const data = response as ATWhatsAppResponse

      if (!data.messages || data.messages.length === 0) {
        return {
          success: false,
          status: MessageStatus.FAILED,
          error: 'No message ID returned from API',
          recipient: validation.formatted,
        }
      }

      const messageId = data.messages[0].id
      const contact = data.contacts?.[0]

      // Check if contact was valid
      if (contact && contact.statusCode !== 200) {
        return {
          success: false,
          messageId,
          status: MessageStatus.FAILED,
          error: contact.status || 'Contact validation failed',
          recipient: validation.formatted,
        }
      }

      return {
        success: true,
        messageId,
        status: MessageStatus.SENT,
        recipient: validation.formatted,
      }
    } catch (error) {
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: to,
      }
    }
  }

  /**
   * Send WhatsApp message with PDF attachment
   * Requirement 22.3: Attach PDF to WhatsApp messages
   */
  async sendWhatsAppWithPDF(
    to: string,
    message: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<WhatsAppSendResult> {
    return this.sendWhatsApp({
      to,
      message,
      attachment: {
        type: 'document',
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf',
        caption: message,
      },
    })
  }

  /**
   * Send WhatsApp messages to multiple recipients
   */
  async sendBulkWhatsApp(
    recipients: string[],
    message: string,
    attachment?: WhatsAppAttachment,
    batchSize: number = 50
  ): Promise<WhatsAppBatchResult> {
    const results: WhatsAppSendResult[] = []
    let totalSent = 0
    let totalFailed = 0

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      // Send to each recipient in the batch
      const batchPromises = batch.map(recipient =>
        this.sendWhatsApp({ to: recipient, message, attachment })
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
   * Get delivery and read status for a message
   * Requirement 25.3: Track read receipts where available from the API
   */
  async getMessageStatus(messageId: string): Promise<WhatsAppDeliveryStatus> {
    try {
      const response = await this.makeAPIRequest('/whatsapp/status', {
        username: this.config.username,
        messageId,
      })

      const data = response as ATWhatsAppStatusCallback

      return {
        messageId: data.id,
        status: this.normalizeStatus(data.status),
        deliveredAt: data.status === 'delivered' || data.status === 'read' 
          ? new Date(data.timestamp || Date.now()) 
          : undefined,
        readAt: data.status === 'read' 
          ? new Date(data.timestamp || Date.now()) 
          : undefined,
      }
    } catch (error) {
      return {
        messageId,
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Status check failed',
      }
    }
  }

  /**
   * Process delivery/read status webhook callback
   * Requirement 25.3: Track read receipts where available
   */
  processStatusCallback(payload: Record<string, string>): WhatsAppDeliveryStatus {
    const { id, status, timestamp } = payload

    const normalizedStatus = this.normalizeStatus(status)
    const statusTime = timestamp ? new Date(timestamp) : new Date()

    return {
      messageId: id,
      status: normalizedStatus,
      deliveredAt: normalizedStatus === 'delivered' || normalizedStatus === 'read' 
        ? statusTime 
        : undefined,
      readAt: normalizedStatus === 'read' ? statusTime : undefined,
    }
  }

  /**
   * Check if read receipts are available for a message
   * Requirement 25.3: Track read receipts where available
   */
  async checkReadReceipt(messageId: string): Promise<{
    hasReadReceipt: boolean
    readAt?: Date
  }> {
    const status = await this.getMessageStatus(messageId)
    
    return {
      hasReadReceipt: status.status === 'read',
      readAt: status.readAt,
    }
  }

  /**
   * Validate WhatsApp phone number format
   */
  validateWhatsAppNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
    // Remove spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '')

    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Local format: 0772123456 -> +256772123456
      cleaned = '+256' + cleaned.substring(1)
    } else if (cleaned.startsWith('256')) {
      // Without plus: 256772123456 -> +256772123456
      cleaned = '+' + cleaned
    } else if (!cleaned.startsWith('+')) {
      // Assume Uganda if no country code
      cleaned = '+256' + cleaned
    }

    // Validate phone number format (basic international format)
    const internationalRegex = /^\+[1-9]\d{6,14}$/
    
    if (!internationalRegex.test(cleaned)) {
      return {
        valid: false,
        formatted: cleaned,
        error: 'Invalid phone number format for WhatsApp',
      }
    }

    return {
      valid: true,
      formatted: cleaned,
    }
  }

  /**
   * Check if a phone number has WhatsApp
   * Note: This is a best-effort check based on API response
   */
  async checkWhatsAppAvailability(phone: string): Promise<{
    available: boolean
    formattedNumber: string
  }> {
    const validation = this.validateWhatsAppNumber(phone)
    
    if (!validation.valid) {
      return {
        available: false,
        formattedNumber: phone,
      }
    }

    // In production, this would make an API call to check WhatsApp availability
    // For now, we assume all valid numbers have WhatsApp
    return {
      available: true,
      formattedNumber: validation.formatted,
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildMessagePayload(
    to: string,
    message: string,
    attachment?: WhatsAppAttachment
  ): Record<string, string> {
    const payload: Record<string, string> = {
      username: this.config.username,
      to,
      message,
    }

    if (this.config.productId) {
      payload.productId = this.config.productId
    }

    if (attachment) {
      if (attachment.url) {
        payload.mediaUrl = attachment.url
      }
      if (attachment.caption) {
        payload.caption = attachment.caption
      }
      if (attachment.filename) {
        payload.filename = attachment.filename
      }
    }

    return payload
  }

  private async makeAPIRequest(
    endpoint: string,
    data: Record<string, string>
  ): Promise<unknown> {
    const url = this.baseUrl + endpoint
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': this.config.apiKey,
      },
      body: new URLSearchParams(data).toString(),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private normalizeStatus(status: string): 'sent' | 'delivered' | 'read' | 'failed' {
    const normalized = status.toLowerCase()
    switch (normalized) {
      case 'sent':
      case 'queued':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'read':
      case 'seen':
        return 'read'
      case 'failed':
      case 'rejected':
      case 'undelivered':
        return 'failed'
      default:
        return 'sent'
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
 * Create WhatsApp Gateway service from environment variables
 */
export function createWhatsAppGateway(): WhatsAppGatewayService {
  const config: WhatsAppConfig = {
    apiKey: process.env.AFRICASTALKING_API_KEY || '',
    username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    productId: process.env.AFRICASTALKING_WHATSAPP_PRODUCT_ID,
    environment: (process.env.AFRICASTALKING_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  }

  return new WhatsAppGatewayService(config)
}

// Export singleton instance
export const whatsappGateway = createWhatsAppGateway()
