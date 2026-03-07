/**
 * Message Orchestrator Service
 * Central coordinator for all message operations.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 7.1, 7.2, 7.3, 7.4, 7.5
 */
     
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/db'
import {
  SendMessageRequest, BulkMessageRequest, EmergencyAlertRequest,
  MessageOrchestratorResult, BulkMessageResult, EmergencyAlertResult,
  DeliveryReportParams, CommunicationDeliveryReport, Recipient,
} from '../types/entities'
import { MessageChannel, DeliveryStatus, RecipientType, Role, MessageTemplateType, TargetType } from '../types/enums'
import type { IMessageOrchestratorService } from '../types/services'
import { targetingService } from './targeting.service'
import { communicationPermissionService } from './communication-permission.service'
import { messageTemplateService } from './message-template.service'
import { templateRendererService } from './template-renderer.service'
import { MessageLogService } from './message-log.service'
import { contactManagementService } from './contact-management.service'
import { fallbackService } from './fallback.service'
import { smsGateway } from './sms-gateway.service'
import { emailGateway } from './email-gateway.service'

const messageLogService = new MessageLogService()

interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

export class MessageOrchestratorService implements IMessageOrchestratorService {
  private retryConfig: RetryConfig

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig
  }

  async sendMessage(params: SendMessageRequest): Promise<MessageOrchestratorResult> {
    const messageId = uuidv4()
    try {
      const permissionResult = await this.checkPermissions(params)
      if (!permissionResult.allowed) {
        return { messageId, status: DeliveryStatus.FAILED, channel: params.channel || MessageChannel.SMS, error: permissionResult.reason || 'Permission denied' }
      }
      const recipients = await targetingService.resolveRecipients({ schoolId: params.schoolId, targetType: params.targetType, criteria: params.targetCriteria })
      if (recipients.length === 0) {
        return { messageId, status: DeliveryStatus.FAILED, channel: params.channel || MessageChannel.SMS, error: 'No recipients found' }
      }
      const content = await this.renderContent(params)
      if (!content.success) {
        return { messageId, status: DeliveryStatus.FAILED, channel: params.channel || MessageChannel.SMS, error: content.error || 'Failed to render content' }
      }
      const channel = params.channel || MessageChannel.SMS
      return await this.sendToRecipient(messageId, params.schoolId, params.senderId, recipients[0], content.content!, channel, params.priority)
    } catch (error) {
      return { messageId, status: DeliveryStatus.FAILED, channel: params.channel || MessageChannel.SMS, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }


  async sendBulkMessage(params: BulkMessageRequest): Promise<BulkMessageResult> {
    console.log(`[BULK DEBUG] Starting sendBulkMessage with params:`, {
      schoolId: params.schoolId,
      targetType: params.targetType,
      channel: params.channel || 'SMS',
      templateId: params.templateId,
      customContent: !!params.customContent,
      totalRecipients: params.targetCriteria
    })
    
    const jobId = uuidv4()
    const errors: string[] = []
    let queued = 0
    try {
      console.log(`[BULK DEBUG] Checking permissions for job ${jobId}`)
      const permissionResult = await this.checkPermissions(params)
      if (!permissionResult.allowed) {
        console.log(`[BULK DEBUG] Permissions denied: ${permissionResult.reason}`)
        return { jobId, totalRecipients: 0, queued: 0, errors: [permissionResult.reason || 'Permission denied'] }
      }
      
      console.log(`[BULK DEBUG] Resolving recipients for school ${params.schoolId}`)
      let recipients = await targetingService.resolveRecipients({ schoolId: params.schoolId, targetType: params.targetType, criteria: params.targetCriteria })
      console.log(`[BULK DEBUG] Found ${recipients.length} recipients before filtering`)
      
      if (recipients.length === 0) {
        console.log(`[BULK DEBUG] No recipients found`)
        return { jobId, totalRecipients: 0, queued: 0, errors: ['No recipients found'] }
      }
      
      // Get template content if using template
      let templateContent: string | undefined
      let templateType: any
      if (params.templateId) {
        console.log(`[BULK DEBUG] Getting template with ID: ${params.templateId}`)
        
        // Check if this is a default template ID (format: default-TEMPLATE_TYPE)
        if (params.templateId.startsWith('default-')) {
          const extractedType = params.templateId.replace('default-', '')
          console.log(`[BULK DEBUG] Using default template for type: ${extractedType}`)
          
          // Get the default template content from the SMS templates API defaults
          const defaultTemplates: Record<string, string> = {
            'FEES_REMINDER': '{{guardianName}}, {{studentName}} owes UGX {{balance}}. Pay now or child may be sent home. {{schoolName}}',
            'ATTENDANCE_ALERT': '{{studentName}} absent {{date}}. Please confirm safety. {{schoolName}}',
            'REPORT_READY': '{{studentName}} {{term}} report ready. Visit school. {{schoolName}}',
            'TERM_START': 'Welcome back {{guardianName}}! {{studentName}} is in {{className}} for new term. {{schoolName}}',
            'MID_TERM_PROGRESS': '{{guardianName}}, {{studentName}} average: {{average}}%. Keep it up! {{schoolName}}',
            'TERM_SUMMARY': '{{guardianName}}, {{studentName}} finished {{position}} with {{average}}%. Excellent! {{schoolName}}',
            'DISCIPLINE_NOTICE': '{{guardianName}}, regarding {{studentName}}: {{description}}. Let\'s work together. {{schoolName}}',
            'GENERAL_ANNOUNCEMENT': '{{content}} - {{schoolName}}',
          }
          
          templateContent = defaultTemplates[extractedType] || "Dear Parent/Guardian, this is a reminder about outstanding school fees. Please contact the school office for details. Thank you."
          templateType = extractedType
          console.log(`[BULK DEBUG] Using default template content: ${templateContent}`)
        } else {
          // Try to get custom template from database
          const template = await messageTemplateService.getTemplateById(params.templateId)
          if (!template) {
            console.warn(`[BULK DEBUG] Template not found: ${params.templateId}, using custom content or default`)
            // Use custom message if provided, otherwise use a default
            if (params.customMessage) {
              templateContent = params.customMessage
              templateType = 'GENERAL'
            } else {
              // Use a default fee reminder message
              templateContent = "Dear Parent/Guardian, this is a reminder about outstanding school fees. Please contact the school office for details. Thank you."
              templateType = 'FEES_REMINDER'
            }
          } else {
            templateContent = template.content
            templateType = template.type
            console.log(`[BULK DEBUG] Retrieved template with type: ${templateType}`)
          }
        }
      }
      
      // Filter recipients by fee balance ONLY if this is a FEES_REMINDER template OR FEE_DEFAULTERS target type
      const isFeeRelated = templateType === 'FEES_REMINDER' || 
                          templateType === MessageTemplateType.FEES_REMINDER ||
                          params.targetType === TargetType.FEE_DEFAULTERS
      
      if (isFeeRelated) {
        console.log(`[BULK DEBUG] Filtering recipients for fee-related message (template: ${templateType}, target: ${params.targetType})`)
        recipients = await this.filterRecipientsByFeeBalance(recipients, params.schoolId)
        console.log(`[BULK DEBUG] After fee balance filtering: ${recipients.length} recipients`)
        
        if (recipients.length === 0) {
          console.log(`[BULK DEBUG] No recipients with outstanding balances found`)
          return { jobId, totalRecipients: 0, queued: 0, errors: ['No recipients with outstanding balances found'] }
        }
      } else {
        console.log(`[BULK DEBUG] Skipping fee balance filtering - not a fee-related message (template: ${templateType}, target: ${params.targetType})`)
      }
      
      const channel = params.channel || MessageChannel.SMS
      const batchSize = params.batchSize || 100
      const contactable = recipients.filter(r => r.type === RecipientType.GUARDIAN || r.type === RecipientType.STAFF)
      const unique = this.deduplicateRecipients(contactable)
      
      console.log(`[BULK DEBUG] Processing ${unique.length} unique recipients in batches of ${batchSize}`)
      
      for (let i = 0; i < unique.length; i += batchSize) {
        const batch = unique.slice(i, i + batchSize)
        console.log(`[BULK DEBUG] Processing batch ${Math.floor(i/batchSize) + 1}, size: ${batch.length}`)
        
        for (const recipient of batch) {
          const messageId = uuidv4()
          console.log(`[BULK DEBUG] Processing recipient: ${recipient.name}, ID: ${recipient.id}`)
          
          try {
            // Render content for this specific recipient
            let finalContent: string
            if (params.customContent) {
              console.log(`[BULK DEBUG] Using custom content`)
              finalContent = params.customContent
            } else if (templateContent && templateType) {
              console.log(`[BULK DEBUG] Rendering template for recipient`)
              const renderResult = await templateRendererService.renderTemplateForRecipient(
                templateContent,
                templateType,
                recipient,
                params.schoolId
              )
              if (!renderResult.success) {
                console.log(`[BULK DEBUG] Template render failed for ${recipient.name}: ${renderResult.error}`)
                errors.push(`Template render failed for ${recipient.name}: ${renderResult.error}`)
                continue
              }
              finalContent = renderResult.content!
              console.log(`[BULK DEBUG] Template rendered successfully`)
            } else {
              console.log(`[BULK DEBUG] No content available for ${recipient.name}`)
              errors.push(`No content available for ${recipient.name}`)
              continue
            }
            
            console.log(`[BULK DEBUG] Logging message to queue: ${messageId}`)
            await this.logMessage(messageId, params.schoolId, params.senderId, recipient, finalContent, channel, DeliveryStatus.QUEUED)
            
            console.log(`[BULK DEBUG] Sending message via sendToRecipient: ${messageId}`)
            const result = await this.sendToRecipient(messageId, params.schoolId, params.senderId, recipient, finalContent, channel, params.priority)
            console.log(`[BULK DEBUG] Send result:`, result)
            
            if (result.status !== DeliveryStatus.FAILED) {
              console.log(`[BULK DEBUG] Message queued successfully`)
              queued++
            } else {
              console.log(`[BULK DEBUG] Message failed: ${result.error}`)
              errors.push(`Failed: ${recipient.name}: ${result.error}`)
            }
          } catch (e) { 
            console.error(`[BULK DEBUG] Error processing recipient ${recipient.name}:`, e)
            errors.push(`Error: ${recipient.name}: ${e instanceof Error ? e.message : 'Unknown'}`) 
          }
        }
        if (params.rateLimit && i + batchSize < unique.length) {
          console.log(`[BULK DEBUG] Applying rate limit delay`)
          await this.delay(1000 / params.rateLimit)
        }
      }
      
      console.log(`[BULK DEBUG] Bulk message job completed. Total: ${unique.length}, Queued: ${queued}, Errors: ${errors.length}`)
      return { jobId, totalRecipients: unique.length, queued, errors }
    } catch (error) { 
      console.error(`[BULK DEBUG] Error in sendBulkMessage:`, error)
      return { jobId, totalRecipients: 0, queued, errors: [error instanceof Error ? error.message : 'Unknown error'] } 
    }
  }


  async sendEmergencyAlert(params: EmergencyAlertRequest): Promise<EmergencyAlertResult> {
    const alertId = uuidv4()
    const channelResults: EmergencyAlertResult['channelResults'] = []
    try {
      const permissionResult = await communicationPermissionService.canSendMessage({ userId: params.senderId, userRole: Role.SCHOOL_ADMIN, schoolId: params.schoolId, action: 'SEND_EMERGENCY' })
      if (!permissionResult.allowed) return { alertId, channelResults: params.channels.map(channel => ({ channel, sent: 0, failed: 1 })) }
      const recipients = await targetingService.resolveEntireSchool(params.schoolId)
      const contactable = recipients.filter(r => r.type === RecipientType.GUARDIAN || r.type === RecipientType.STAFF)
      const unique = this.deduplicateRecipients(contactable)
      const promises = params.channels.map(async channel => {
        let sent = 0, failed = 0
        for (const recipient of unique) {
          const messageId = `${alertId}_${channel}_${recipient.id}`
          try {
            await this.logMessage(messageId, params.schoolId, params.senderId, recipient, params.content, channel, DeliveryStatus.QUEUED, { isEmergency: true, alertId })
            const result = await this.sendToRecipient(messageId, params.schoolId, params.senderId, recipient, params.content, channel, 'critical')
            if (result.status !== DeliveryStatus.FAILED) sent++; else failed++
          } catch { failed++ }
        }
        return { channel, sent, failed }
      })
      channelResults.push(...await Promise.all(promises))
      await this.logEmergencyAlertSummary(alertId, params, channelResults)
      return { alertId, channelResults }
    } catch { return { alertId, channelResults: params.channels.map(channel => ({ channel, sent: 0, failed: 1 })) } }
  }


  async retryFailedMessage(messageId: string): Promise<MessageOrchestratorResult> {
    try {
      const log = await messageLogService.getMessageLog(messageId)
      if (!log) return { messageId, status: DeliveryStatus.FAILED, channel: MessageChannel.SMS, error: 'Message not found' }
      if (log.status !== DeliveryStatus.FAILED) return { messageId, status: log.status, channel: log.channel, error: 'Message is not in failed state' }
      return await this.retryWithBackoff(messageId, log.schoolId, log.senderId, { id: log.recipientId, type: log.recipientType as RecipientType, name: 'Recipient', phone: log.recipientContact, preferredChannel: log.channel }, log.content, log.channel, 'normal')
    } catch (error) { return { messageId, status: DeliveryStatus.FAILED, channel: MessageChannel.SMS, error: error instanceof Error ? error.message : 'Retry failed' } }
  }

  async getMessageStatus(messageId: string): Promise<DeliveryStatus> {
    const log = await messageLogService.getMessageLog(messageId)
    if (!log) throw new Error(`Message not found: ${messageId}`)
    return log.status
  }

  async getDeliveryReport(params: DeliveryReportParams): Promise<CommunicationDeliveryReport> {
    const logs = await messageLogService.queryMessageLogs({ schoolId: params.schoolId, dateFrom: params.dateFrom, dateTo: params.dateTo, channel: params.channel, status: params.status, limit: 10000, offset: 0 })
    const byChannel: CommunicationDeliveryReport['byChannel'] = { [MessageChannel.SMS]: { sent: 0, delivered: 0, failed: 0, read: 0 }, [MessageChannel.WHATSAPP]: { sent: 0, delivered: 0, failed: 0, read: 0 }, [MessageChannel.EMAIL]: { sent: 0, delivered: 0, failed: 0, read: 0 } }
    const byStatus: CommunicationDeliveryReport['byStatus'] = { [DeliveryStatus.QUEUED]: 0, [DeliveryStatus.SENDING]: 0, [DeliveryStatus.SENT]: 0, [DeliveryStatus.DELIVERED]: 0, [DeliveryStatus.READ]: 0, [DeliveryStatus.FAILED]: 0, [DeliveryStatus.BOUNCED]: 0 }
    let totalSent = 0, delivered = 0, failed = 0, read = 0
    for (const log of logs.logs) {
      byStatus[log.status]++
      const cs = byChannel[log.channel]
      if (cs) {
        if ([DeliveryStatus.SENT, DeliveryStatus.DELIVERED, DeliveryStatus.READ].includes(log.status)) { cs.sent++; totalSent++ }
        if ([DeliveryStatus.DELIVERED, DeliveryStatus.READ].includes(log.status)) { cs.delivered++; delivered++ }
        if ([DeliveryStatus.FAILED, DeliveryStatus.BOUNCED].includes(log.status)) { cs.failed++; failed++ }
        if (log.status === DeliveryStatus.READ) { cs.read++; read++ }
      }
    }
    return { schoolId: params.schoolId, dateRange: { start: params.dateFrom, end: params.dateTo }, totalSent, delivered, failed, read, byChannel, byStatus }
  }


  // Private helper methods
  private async checkPermissions(params: SendMessageRequest): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const sender = await prisma.user.findUnique({ where: { id: params.senderId }, select: { role: true } })
      if (!sender) return { allowed: false, reason: 'Sender not found' }
      return await communicationPermissionService.canSendMessage({ userId: params.senderId, userRole: sender.role as Role, schoolId: params.schoolId, action: 'SEND', targetType: params.targetType })
    } catch { return { allowed: false, reason: 'Permission check failed' } }
  }

  private async renderContent(params: SendMessageRequest): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      if (params.customContent) return { success: true, content: params.customContent }
      if (params.templateId) {
        const template = await messageTemplateService.getTemplateById(params.templateId)
        if (!template) return { success: false, error: 'Template not found' }
        
        // For now, return the template content as-is since we don't have recipient data here
        // The actual variable replacement should happen per-recipient in bulk messaging
        return { success: true, content: template.content }
      }
      return { success: false, error: 'No content or template provided' }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Content rendering failed' } }
  }

  private async sendToRecipient(messageId: string, schoolId: string, senderId: string, recipient: Recipient, content: string, channel: MessageChannel, priority: 'normal' | 'high' | 'critical'): Promise<MessageOrchestratorResult> {
    console.log(`[SEND DEBUG] Starting sendToRecipient for messageId: ${messageId}`)
    console.log(`[SEND DEBUG] Recipient: ${recipient.name} (${recipient.id}), Channel: ${channel}, Priority: ${priority}`)
    console.log(`[SEND DEBUG] Content preview: ${content.substring(0, 100)}...`)
    
    try {
      // Check if school messaging is paused (Requirements 2.7, 2.8)
      const messagingConfig = await prisma.schoolMessagingConfig.findUnique({
        where: { schoolId },
      })

      console.log(`[SEND DEBUG] Messaging config for school ${schoolId}:`, messagingConfig)
      if (messagingConfig?.isPaused) {
        // Allow critical messages to bypass pause if emergency override is enabled
        console.log(`[SEND DEBUG] School messaging is paused: ${messagingConfig.pauseReason}`)
        if (priority !== 'critical' || !messagingConfig.emergencyOverride) {
          console.log(`[SEND DEBUG] Message is not critical or emergency override not enabled, returning FAILED`)
          await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`)
          return {
            messageId,
            status: DeliveryStatus.FAILED,
            channel,
            error: `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`,
          }
        }
      }

      console.log(`[SEND DEBUG] Resolving contact for recipient ${recipient.id} and channel ${channel}`)
      const contact = await contactManagementService.resolveContactForChannel(recipient.id, channel)
      console.log(`[SEND DEBUG] Resolved contact:`, contact)
      
      if (!contact) {
        console.log(`[SEND DEBUG] No contact available, attempting fallback`)
        const fallbackResult = await this.tryFallback(messageId, schoolId, senderId, recipient, content, channel)
        if (fallbackResult) {
          console.log(`[SEND DEBUG] Fallback succeeded:`, fallbackResult)
          return fallbackResult
        }
        console.log(`[SEND DEBUG] No contact available and fallback failed`)
        await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, 'No contact available')
        return { messageId, status: DeliveryStatus.FAILED, channel, error: 'No contact available' }
      }
      
      console.log(`[SEND DEBUG] Validating contact: ${contact}`)
      const validation = await contactManagementService.validateContact(contact, channel === MessageChannel.EMAIL ? 'email' : 'phone')
      console.log(`[SEND DEBUG] Contact validation result:`, validation)
      
      if (!validation.valid) {
        console.log(`[SEND DEBUG] Contact validation failed: ${validation.error}`)
        await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, validation.error || 'Invalid contact')
        return { messageId, status: DeliveryStatus.FAILED, channel, error: validation.error || 'Invalid contact' }
      }
      
      console.log(`[SEND DEBUG] Sending via gateway with contact: ${validation.formatted || contact}`)
      const result = await this.sendViaGateway(channel, validation.formatted || contact, content, recipient)
      console.log(`[SEND DEBUG] Gateway result:`, result)
      
      const status = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED
      console.log(`[SEND DEBUG] Determined status: ${status}`)
      
      await this.updateMessageStatus(messageId, status, result.error)
      
      if (!result.success && priority !== 'critical') {
        console.log(`[SEND DEBUG] Gateway failed, attempting fallback`)
        const fallbackResult = await this.tryFallback(messageId, schoolId, senderId, recipient, content, channel)
        if (fallbackResult && fallbackResult.status !== DeliveryStatus.FAILED) {
          console.log(`[SEND DEBUG] Fallback succeeded after gateway failure:`, fallbackResult)
          return fallbackResult
        }
      }
      
      console.log(`[SEND DEBUG] Returning result: { messageId: ${messageId}, status: ${status}, channel: ${channel} }`)
      return { messageId, status, channel, error: result.error }
    } catch (error) {
      console.error(`[SEND DEBUG] Error in sendToRecipient:`, error)
      await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, error instanceof Error ? error.message : 'Send failed')
      return { messageId, status: DeliveryStatus.FAILED, channel, error: error instanceof Error ? error.message : 'Send failed' }
    }
  }


  private async sendViaGateway(channel: MessageChannel, contact: string, content: string, recipient: Recipient): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[SMS DEBUG] Attempting to send message via channel: ${channel}`)
    console.log(`[SMS DEBUG] Contact: ${contact}`)
    console.log(`[SMS DEBUG] Content length: ${content.length}`)
    console.log(`[SMS DEBUG] Recipient ID: ${recipient.id}, Name: ${recipient.name}`)
    
    try {
      switch (channel) {
        case MessageChannel.SMS:
          console.log(`[SMS DEBUG] Calling smsGateway.sendSMS with contact: ${contact}`)
          const smsResult = await smsGateway.sendSMS({ to: contact, message: content })
          console.log(`[SMS DEBUG] SMS Gateway result:`, smsResult)
          return { success: smsResult.success, messageId: smsResult.messageId, error: smsResult.error }
        case MessageChannel.EMAIL:
          console.log(`[EMAIL DEBUG] Calling emailGateway.sendEmail with contact: ${contact}`)
          const emailResult = await emailGateway.sendEmail({ to: contact, subject: 'School Notification', html: content })
          console.log(`[EMAIL DEBUG] Email Gateway result:`, emailResult)
          return { success: emailResult.success, messageId: emailResult.messageId, error: emailResult.error }
        case MessageChannel.WHATSAPP:
          console.log(`[WHATSAPP DEBUG] WhatsApp is not supported`)
          return { success: false, error: 'WhatsApp is not supported' }
        default:
          console.log(`[CHANNEL DEBUG] Unsupported channel: ${channel}`)
          return { success: false, error: `Unsupported channel: ${channel}` }
      }
    } catch (error) { 
      console.error(`[ERROR DEBUG] Gateway error for channel ${channel}:`, error)
      return { success: false, error: error instanceof Error ? error.message : 'Gateway error' } 
    }
  }

  private async tryFallback(messageId: string, schoolId: string, senderId: string, recipient: Recipient, content: string, failedChannel: MessageChannel): Promise<MessageOrchestratorResult | null> {
    try {
      const fallbackResult = await fallbackService.executeFallback(messageId, failedChannel)
      if (fallbackResult.success && fallbackResult.finalChannel) {
        return { messageId, status: DeliveryStatus.SENT, channel: fallbackResult.finalChannel }
      }
      return null
    } catch { return null }
  }

  private async retryWithBackoff(messageId: string, schoolId: string, senderId: string, recipient: Recipient, content: string, channel: MessageChannel, priority: 'normal' | 'high' | 'critical'): Promise<MessageOrchestratorResult> {
    let lastError: string | undefined
    let delay = this.retryConfig.initialDelayMs
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const result = await this.sendToRecipient(messageId, schoolId, senderId, recipient, content, channel, priority)
      if (result.status !== DeliveryStatus.FAILED) return result
      lastError = result.error
      if (attempt < this.retryConfig.maxAttempts) {
        await this.delay(delay)
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs)
      }
    }
    await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, `Permanently failed after ${this.retryConfig.maxAttempts} attempts: ${lastError}`)
    return { messageId, status: DeliveryStatus.FAILED, channel, error: `Permanently failed after ${this.retryConfig.maxAttempts} attempts` }
  }


  private async logMessage(messageId: string, schoolId: string, senderId: string, recipient: Recipient, content: string, channel: MessageChannel, status: DeliveryStatus, metadata?: Record<string, unknown>): Promise<void> {
    try {
      const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { role: true } })
      const contact = await contactManagementService.resolveContactForChannel(recipient.id, channel)
      await messageLogService.logMessage({
        schoolId, messageId, senderId, senderRole: (sender?.role as Role) || Role.SCHOOL_ADMIN, channel,
        recipientId: recipient.id, recipientType: recipient.type, recipientContact: contact || 'unknown',
        content, status, metadata,
      })
    } catch (error) { console.error('Failed to log message:', error) }
  }

  private async updateMessageStatus(messageId: string, status: DeliveryStatus, reason?: string): Promise<void> {
    console.log(`[STATUS DEBUG] Updating message status for ${messageId}: ${status} - Reason: ${reason || 'none'}`)
    try { 
      await messageLogService.updateMessageStatus(messageId, status, reason) 
      console.log(`[STATUS DEBUG] Successfully updated message status for ${messageId}`)
    }
    catch (error) { 
      console.error('Failed to update message status:', error) 
    }
  }

  private async logEmergencyAlertSummary(alertId: string, params: EmergencyAlertRequest, results: EmergencyAlertResult['channelResults']): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          schoolId: params.schoolId, userId: params.senderId, action: 'emergency_alert_sent', resource: 'communication', resourceId: alertId,
          newValue: { alertId, content: params.content, channels: params.channels, results, timestamp: new Date().toISOString() }, timestamp: new Date(),
        },
      })
    } catch (error) { console.error('Failed to log emergency alert summary:', error) }
  }

  private deduplicateRecipients(recipients: Recipient[]): Recipient[] {
    const seen = new Map<string, Recipient>()
    for (const r of recipients) {
      const key = `${r.type}:${r.id}`
      if (!seen.has(key)) seen.set(key, r)
    }
    return Array.from(seen.values())
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Filter recipients by fee balance - only include students with outstanding balances
   * Used when sending FEES_REMINDER messages with CLASS or other target types
   */
  private async filterRecipientsByFeeBalance(recipients: Recipient[], schoolId: string): Promise<Recipient[]> {
    try {
      // Get current term
      const today = new Date()
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: { 
          terms: {
            where: {
              startDate: { lte: today },
              endDate: { gte: today }
            },
            take: 1
          }
        }
      })

      // If no term matches today's date, get the most recent term that has started
      let currentTerm = currentYear?.terms[0]
      
      if (!currentTerm && currentYear) {
        const yearWithRecentTerm = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true },
          include: { 
            terms: {
              where: {
                startDate: { lte: today }
              },
              orderBy: { startDate: 'desc' },
              take: 1
            }
          }
        })
        currentTerm = yearWithRecentTerm?.terms[0]
      }

      if (!currentTerm) {
        console.log(`[Fee Filter] No active term found for school ${schoolId}`)
        // Return original recipients - don't filter if we can't determine term
        // This prevents breaking non-fee messages when term data is missing
        return recipients
      }

      console.log(`[Fee Filter] Using term: ${currentTerm.name} (${currentTerm.id})`)

      return await this.filterByTerm(recipients, schoolId, currentTerm.id)
    } catch (error) {
      console.error('[Fee Filter] Error filtering recipients by fee balance:', error)
      // On error, return original recipients to avoid breaking non-fee messages
      return recipients
    }
  }

  /**
   * Filter recipients by fee balance for a specific term
   */
  private async filterByTerm(recipients: Recipient[], schoolId: string, termId: string): Promise<Recipient[]> {
    try {
      // Group recipients by student ID
      const studentRecipientMap = new Map<string, Recipient[]>()
      
      for (const recipient of recipients) {
        if (recipient.studentId) {
          if (!studentRecipientMap.has(recipient.studentId)) {
            studentRecipientMap.set(recipient.studentId, [])
          }
          studentRecipientMap.get(recipient.studentId)!.push(recipient)
        }
      }

      console.log(`[Fee Filter] Processing ${studentRecipientMap.size} unique students`)

      // Check fee balance for each student
      const filteredRecipients: Recipient[] = []

      for (const [studentId, studentRecipients] of studentRecipientMap.entries()) {
        // Get student with payments and fee structure
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            payments: {
              where: { 
                termId: termId,
                status: 'CONFIRMED'
              }
            },
            class: {
              include: {
                feeStructures: {
                  where: { 
                    termId: termId,
                    isActive: true
                  }
                }
              }
            }
          }
        })

        if (!student) {
          console.log(`[Fee Filter] Student ${studentId} not found`)
          continue
        }

        // Calculate balance
        const feeStructure = student.class.feeStructures[0]
        if (!feeStructure) {
          console.log(`[Fee Filter] No fee structure for student ${student.firstName} ${student.lastName}`)
          continue
        }

        const totalFees = feeStructure.totalAmount
        const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const balance = totalFees - totalPaid

        console.log(`[Fee Filter] Student: ${student.firstName} ${student.lastName}, Total Fees: ${totalFees}, Total Paid: ${totalPaid}, Balance: ${balance}`)

        // Only include if balance is greater than 0
        if (balance > 0) {
          console.log(`[Fee Filter] Including student ${student.firstName} ${student.lastName} with balance ${balance}`)
          filteredRecipients.push(...studentRecipients)
        } else {
          console.log(`[Fee Filter] Excluding student ${student.firstName} ${student.lastName} - balance ${balance} is not greater than 0`)
        }
      }

      console.log(`[Fee Filter] Filtered from ${recipients.length} to ${filteredRecipients.length} recipients`)
      return filteredRecipients
    } catch (error) {
      console.error('[Fee Filter] Error in filterByTerm:', error)
      return []
    }
  }
}

export const messageOrchestratorService = new MessageOrchestratorService()rent active term based on today's date
      const today = new Date()
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: { 
          terms: {
            where: {
              startDate: { lte: today },
              endDate: { gte: today }
            },
            take: 1
          }
        }
      })

      // If no term matches today's date, get the most recent term that has started
      if (!currentYear || currentYear.terms.length === 0) {
        const yearWithRecentTerm = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true },
          include: { 
            terms: {
              where: {
                startDate: { lte: today }
              },
              orderBy: { startDate: 'desc' },
              take: 1
            }
          }
        })
        
        if (!yearWithRecentTerm || yearWithRecentTerm.terms.length === 0) {
          console.log(`[Fee Filter] No active academic year or terms found for school ${schoolId}`)
          return []
        }
        
        const currentTerm = yearWithRecentTerm.terms[0]
        console.log(`[Fee Filter] Using most recent started term: ${currentTerm.name} (${currentTerm.id})`)
        
        return await this.filterByTerm(recipients, schoolId, currentTerm.id)
      }

      const currentTerm = currentYear.terms[0]
      console.log(`[Fee Filter] Using term: ${currentTerm.name} (${currentTerm.id})`)

      return await this.filterByTerm(recipients, schoolId, currentTerm.id)
    } catch (error) {
      console.error('[Fee Filter] Error filtering recipients by fee balance:', error)
      // On error, return empty array to avoid sending to wrong recipients
      return []
    }
  }

  /**
   * Filter recipients by fee balance for a specific term
   */
  private async filterByTerm(recipients: Recipient[], schoolId: string, termId: string): Promise<Recipient[]> {
    try {
      // Group recipients by student ID
      const studentRecipientMap = new Map<string, Recipient[]>()
      
      for (const recipient of recipients) {
        if (recipient.studentId) {
          if (!studentRecipientMap.has(recipient.studentId)) {
            studentRecipientMap.set(recipient.studentId, [])
          }
          studentRecipientMap.get(recipient.studentId)!.push(recipient)
        }
      }

      console.log(`[Fee Filter] Processing ${studentRecipientMap.size} unique students`)

      // Check fee balance for each student
      const filteredRecipients: Recipient[] = []

      for (const [studentId, studentRecipients] of studentRecipientMap.entries()) {
        // Get student with payments and fee structure
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            payments: {
              where: { 
                termId: termId,
                status: 'CONFIRMED'
              }
            },
            class: {
              include: {
                feeStructures: {
                  where: { 
                    termId: termId,
                    isActive: true
                  }
                }
              }
            }
          }
        })

        if (!student) {
          console.log(`[Fee Filter] Student ${studentId} not found`)
          continue
        }

        // Calculate balance
        const feeStructure = student.class.feeStructures[0]
        if (!feeStructure) {
          console.log(`[Fee Filter] No fee structure for student ${student.firstName} ${student.lastName}`)
          continue
        }

        const totalFees = feeStructure.totalAmount
        const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const balance = totalFees - totalPaid

        console.log(`[Fee Filter] Student: ${student.firstName} ${student.lastName}, Total Fees: ${totalFees}, Total Paid: ${totalPaid}, Balance: ${balance}`)

        // Only include if balance is greater than 0
        if (balance > 0) {
          console.log(`[Fee Filter] Including student ${student.firstName} ${student.lastName} with balance ${balance}`)
          filteredRecipients.push(...studentRecipients)
        } else {
          console.log(`[Fee Filter] Excluding student ${student.firstName} ${student.lastName} - balance ${balance} is not greater than 0`)
        }
      }

      console.log(`[Fee Filter] Filtered from ${recipients.length} to ${filteredRecipients.length} recipients`)
      return filteredRecipients
    } catch (error) {
      console.error('[Fee Filter] Error in filterByTerm:', error)
      return []
    }
  }
}

export const messageOrchestratorService = new MessageOrchestratorService()
