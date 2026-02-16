/**
 * SMS Gateway Service - Africa's Talking Integration
 * Handles SMS sending, delivery status polling, and cost tracking
 * Requirements: 18.1, 23.1, 25.1, 25.2
 */

import { MessageStatus } from '@/types/enums'

// ============================================
// TYPES   
// ============================================

export interface SMSConfig {
  apiKey: string
  username: string
  senderId?: string
  environment?: 'sandbox' | 'production'
}

export interface SMSSendRequest {
  to: string | string[]
  message: string
  from?: string
  enqueue?: boolean
}

export interface SMSSendResult {
  success: boolean
  messageId?: string
  cost?: number
  status: MessageStatus
  error?: string
  recipient: string
}

export interface SMSDeliveryStatus {
  messageId: string
  status: 'Success' | 'Sent' | 'Buffered' | 'Rejected' | 'Failed'
  failureReason?: string
  deliveredAt?: Date
}

export interface SMSBatchResult {
  totalSent: number
  totalFailed: number
  totalCost: number
  results: SMSSendResult[]
}

// Africa's Talking API response types
interface ATRecipient {
  statusCode: number
  number: string
  status: string
  cost: string
  messageId: string
}

interface ATSMSResponse {
  SMSMessageData: {
    Message: string
    Recipients: ATRecipient[]
  }
}

interface ATDeliveryReport {
  id: string
  status: string
  failureReason?: string
}

// ============================================
// SMS COST CONSTANTS (Uganda)
// ============================================

const SMS_COST_UGX = 45 // UGX 45 per SMS segment (updated for Uganda market)

// ============================================
// SMS GATEWAY SERVICE
// ============================================

export class SMSGatewayService {
  private config: SMSConfig
  private baseUrl: string

  constructor(config: SMSConfig) {
    this.config = config
    this.baseUrl = config.environment === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1'
      : 'https://api.africastalking.com/version1'
  }

  /**
   * Send a single SMS
   * Requirement 18.1: Transmit messages through Africa's Talking
   */
  async sendSMS(request: SMSSendRequest): Promise<SMSSendResult> {
    console.log(`[SMS GATEWAY DEBUG] Starting sendSMS request:`, {
      to: request.to,
      messageLength: request.message.length,
      messagePreview: request.message.substring(0, 100) + (request.message.length > 100 ? '...' : ''),
      from: request.from,
      enqueue: request.enqueue
    });
    
    const recipients = Array.isArray(request.to) ? request.to : [request.to]
    
    if (recipients.length === 0) {
      console.log(`[SMS GATEWAY DEBUG] No recipients provided`);
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: 'No recipients provided',
        recipient: '',
      }
    }

    try {
      console.log(`[SMS GATEWAY DEBUG] Building request data for ${recipients.length} recipients`);
      
      // Build request data - only include 'from' if sender ID is configured
      const requestData: Record<string, string> = {
        username: this.config.username,
        to: recipients.join(','),
        message: request.message,
        enqueue: request.enqueue ? '1' : '0',
      }
      
      // Only add 'from' if we have a valid sender ID (not for sandbox)
      const senderId = request.from || this.config.senderId
      if (senderId && senderId.trim() !== '') {
        requestData.from = senderId
        console.log(`[SMS GATEWAY DEBUG] Using sender ID: ${senderId}`);
      } else {
        console.log(`[SMS GATEWAY DEBUG] No sender ID configured`);
      }

      console.log(`[SMS GATEWAY DEBUG] Making API request to /messaging`);
      const response = await this.makeAPIRequest('/messaging', requestData)
      console.log(`[SMS GATEWAY DEBUG] API response received`);

      const data = response as ATSMSResponse
      const recipient = data.SMSMessageData.Recipients[0]

      if (!recipient) {
        console.log(`[SMS GATEWAY DEBUG] No recipient response from API`);
        return {
          success: false,
          status: MessageStatus.FAILED,
          error: 'No recipient response from API',
          recipient: recipients[0],
        }
      }

      console.log(`[SMS GATEWAY DEBUG] Recipient response:`, recipient);
      
      // Parse cost from response (format: "UGX 25.0000")
      const cost = this.parseCost(recipient.cost)
      console.log(`[SMS GATEWAY DEBUG] Parsed cost: ${cost}`);

      // Map Africa's Talking status to our MessageStatus
      const status = this.mapATStatus(recipient.status)
      console.log(`[SMS GATEWAY DEBUG] Mapped status: ${status}, Success: ${recipient.statusCode === 101}`);

      return {
        success: recipient.statusCode === 101,
        messageId: recipient.messageId,
        cost,
        status,
        error: recipient.statusCode !== 101 ? recipient.status : undefined,
        recipient: recipient.number,
      }
    } catch (error) {
      console.error(`[SMS GATEWAY DEBUG] Error sending SMS:`, error);
      return {
        success: false,
        status: MessageStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipient: recipients[0],
      }
    }
  }

  /**
   * Send SMS to multiple recipients
   * Requirement 29.2: Process in batches with rate limiting
   */
  async sendBulkSMS(
    recipients: string[],
    message: string,
    batchSize: number = 100
  ): Promise<SMSBatchResult> {
    const results: SMSSendResult[] = []
    let totalCost = 0
    let totalSent = 0
    let totalFailed = 0

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      try {
        // Build request data - only include 'from' if sender ID is configured
        const requestData: Record<string, string> = {
          username: this.config.username,
          to: batch.join(','),
          message,
          enqueue: '1', // Always enqueue for bulk
        }
        
        // Only add 'from' if we have a valid sender ID (not for sandbox)
        if (this.config.senderId && this.config.senderId.trim() !== '') {
          requestData.from = this.config.senderId
        }

        const response = await this.makeAPIRequest('/messaging', requestData)

        const data = response as ATSMSResponse
        
        for (const recipient of data.SMSMessageData.Recipients) {
          const cost = this.parseCost(recipient.cost)
          const success = recipient.statusCode === 101
          
          results.push({
            success,
            messageId: recipient.messageId,
            cost,
            status: this.mapATStatus(recipient.status),
            error: !success ? recipient.status : undefined,
            recipient: recipient.number,
          })

          totalCost += cost
          if (success) totalSent++
          else totalFailed++
        }
      } catch (error) {
        // Mark all recipients in this batch as failed
        for (const recipient of batch) {
          results.push({
            success: false,
            status: MessageStatus.FAILED,
            error: error instanceof Error ? error.message : 'Batch send failed',
            recipient,
          })
          totalFailed++
        }
      }

      // Rate limiting: wait between batches
      if (i + batchSize < recipients.length) {
        await this.delay(1000) // 1 second between batches
      }
    }

    return {
      totalSent,
      totalFailed,
      totalCost,
      results,
    }
  }

  /**
   * Poll delivery status for a message
   * Requirement 25.1: Poll Africa's Talking delivery status API
   */
  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus> {
    try {
      // Note: Africa's Talking uses webhooks for delivery reports
      // This is a placeholder for the delivery report endpoint
      const response = await this.makeAPIRequest('/messaging/delivery', {
        username: this.config.username,
        messageId,
      })

      const data = response as ATDeliveryReport

      return {
        messageId: data.id,
        status: this.normalizeDeliveryStatus(data.status),
        failureReason: data.failureReason,
        deliveredAt: data.status === 'Success' ? new Date() : undefined,
      }
    } catch (error) {
      return {
        messageId,
        status: 'Failed',
        failureReason: error instanceof Error ? error.message : 'Status check failed',
      }
    }
  }

  /**
   * Process delivery report webhook callback
   * Requirement 25.2: Record status as pending, delivered, failed, or rejected
   */
  processDeliveryCallback(payload: Record<string, string>): SMSDeliveryStatus {
    const { id, status, failureReason } = payload

    return {
      messageId: id,
      status: this.normalizeDeliveryStatus(status),
      failureReason,
      deliveredAt: status === 'Success' ? new Date() : undefined,
    }
  }

  /**
   * Validate phone number format for Uganda
   */
  validatePhoneNumber(phone: string): { valid: boolean; formatted: string; error?: string } {
    // Remove spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, '')

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

    // Validate Uganda phone number format
    const ugandaRegex = /^\+256[37][0-9]{8}$/
    
    if (!ugandaRegex.test(cleaned)) {
      return {
        valid: false,
        formatted: cleaned,
        error: 'Invalid Uganda phone number format',
      }
    }

    return {
      valid: true,
      formatted: cleaned,
    }
  }

  /**
   * Calculate SMS cost estimate
   * Requirement 23.1: Log cost (UGX 45 per SMS for Uganda market)
   */
  estimateCost(messageCount: number): number {
    return messageCount * SMS_COST_UGX
  }

  /**
   * Get SMS character count and segment info
   */
  getMessageInfo(message: string): {
    characters: number
    segments: number
    encoding: 'GSM' | 'Unicode'
    maxPerSegment: number
  } {
    // Check if message contains non-GSM characters
    const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑܧ¿a-zäöñüà]*$/
    const isGSM = gsmRegex.test(message)

    const maxPerSegment = isGSM ? 160 : 70
    const characters = message.length
    const segments = Math.ceil(characters / maxPerSegment)

    return {
      characters,
      segments,
      encoding: isGSM ? 'GSM' : 'Unicode',
      maxPerSegment,
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async makeAPIRequest(
    endpoint: string,
    data: Record<string, string>
  ): Promise<unknown> {
    const url = this.baseUrl + endpoint
    
    // Log request details for debugging (remove in production)
    console.log('[SMS Gateway] Request URL:', url)
    console.log('[SMS Gateway] Username:', this.config.username)
    console.log('[SMS Gateway] API Key present:', !!this.config.apiKey)
    console.log('[SMS Gateway] Environment:', this.config.environment)
    console.log('[SMS Gateway] Request data:', { ...data, apiKey: '[REDACTED]' })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': this.config.apiKey,
      },
      body: new URLSearchParams(data).toString(),
    })

    const responseText = await response.text()
    console.log('[SMS Gateway] Response status:', response.status)
    console.log('[SMS Gateway] Response body:', responseText)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${responseText}`)
    }

    try {
      return JSON.parse(responseText)
    } catch {
      throw new Error(`Failed to parse response: ${responseText}`)
    }
  }

  private parseCost(costString: string): number {
    // Format: "UGX 25.0000" or "KES 1.0000"
    const match = costString.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : SMS_COST_UGX
  }

  private mapATStatus(status: string): MessageStatus {
    switch (status.toLowerCase()) {
      case 'success':
        return MessageStatus.DELIVERED
      case 'sent':
        return MessageStatus.SENT
      case 'buffered':
      case 'queued':
        return MessageStatus.QUEUED
      case 'rejected':
      case 'failed':
        return MessageStatus.FAILED
      default:
        return MessageStatus.QUEUED
    }
  }

  private normalizeDeliveryStatus(
    status: string
  ): 'Success' | 'Sent' | 'Buffered' | 'Rejected' | 'Failed' {
    const normalized = status.toLowerCase()
    switch (normalized) {
      case 'success':
      case 'delivered':
        return 'Success'
      case 'sent':
        return 'Sent'
      case 'buffered':
      case 'queued':
        return 'Buffered'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Failed'
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
 * Create SMS Gateway service from environment variables
 */
export function createSMSGateway(): SMSGatewayService {
  console.log('[SMS GATEWAY INIT] Loading configuration from environment variables');
  console.log('[SMS GATEWAY INIT] AFRICASTALKING_API_KEY exists:', !!process.env.AFRICASTALKING_API_KEY);
  console.log('[SMS GATEWAY INIT] AFRICASTALKING_USERNAME:', process.env.AFRICASTALKING_USERNAME);
  console.log('[SMS GATEWAY INIT] AFRICASTALKING_SENDER_ID:', process.env.AFRICASTALKING_SENDER_ID);
  console.log('[SMS GATEWAY INIT] AFRICASTALKING_ENVIRONMENT:', process.env.AFRICASTALKING_ENVIRONMENT);
  
  const config: SMSConfig = {
    apiKey: process.env.AFRICASTALKING_API_KEY || '',
    username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    senderId: process.env.AFRICASTALKING_SENDER_ID,
    environment: (process.env.AFRICASTALKING_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  }

  // Check if required configuration is missing
  if (!config.apiKey) {
    console.warn('[SMS GATEWAY WARN] AFRICASTALKING_API_KEY is not set. SMS sending will fail.');
  }

  return new SMSGatewayService(config)
}

// Export singleton instance
export const smsGateway = createSMSGateway()
