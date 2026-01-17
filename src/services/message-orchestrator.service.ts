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
import { MessageChannel, DeliveryStatus, RecipientType, Role } from '../types/enums'
import type { IMessageOrchestratorService } from '../types/services'
import { targetingService } from './targeting.service'
import { communicationPermissionService } from './communication-permission.service'
import { messageTemplateService } from './message-template.service'
import { MessageLogService } from './message-log.service'
import { contactManagementService } from './contact-management.service'
import { fallbackService } from './fallback.service'
import { smsGateway } from './sms-gateway.service'
import { whatsappGateway } from './whatsapp-gateway.service'
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
    const jobId = uuidv4()
    const errors: string[] = []
    let queued = 0
    try {
      const permissionResult = await this.checkPermissions(params)
      if (!permissionResult.allowed) return { jobId, totalRecipients: 0, queued: 0, errors: [permissionResult.reason || 'Permission denied'] }
      const recipients = await targetingService.resolveRecipients({ schoolId: params.schoolId, targetType: params.targetType, criteria: params.targetCriteria })
      if (recipients.length === 0) return { jobId, totalRecipients: 0, queued: 0, errors: ['No recipients found'] }
      const content = await this.renderContent(params)
      if (!content.success) return { jobId, totalRecipients: recipients.length, queued: 0, errors: [content.error || 'Failed to render content'] }
      const channel = params.channel || MessageChannel.SMS
      const batchSize = params.batchSize || 100
      const contactable = recipients.filter(r => r.type === RecipientType.GUARDIAN || r.type === RecipientType.STAFF)
      const unique = this.deduplicateRecipients(contactable)
      for (let i = 0; i < unique.length; i += batchSize) {
        const batch = unique.slice(i, i + batchSize)
        for (const recipient of batch) {
          const messageId = uuidv4()
          try {
            await this.logMessage(messageId, params.schoolId, params.senderId, recipient, content.content!, channel, DeliveryStatus.QUEUED)
            const result = await this.sendToRecipient(messageId, params.schoolId, params.senderId, recipient, content.content!, channel, params.priority)
            if (result.status !== DeliveryStatus.FAILED) queued++
            else errors.push(`Failed: ${recipient.name}: ${result.error}`)
          } catch (e) { errors.push(`Error: ${recipient.name}: ${e instanceof Error ? e.message : 'Unknown'}`) }
        }
        if (params.rateLimit && i + batchSize < unique.length) await this.delay(1000 / params.rateLimit)
      }
      return { jobId, totalRecipients: unique.length, queued, errors }
    } catch (error) { return { jobId, totalRecipients: 0, queued, errors: [error instanceof Error ? error.message : 'Unknown error'] } }
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
        return { success: true, content: template.content }
      }
      return { success: false, error: 'No content or template provided' }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Content rendering failed' } }
  }

  private async sendToRecipient(messageId: string, schoolId: string, senderId: string, recipient: Recipient, content: string, channel: MessageChannel, priority: 'normal' | 'high' | 'critical'): Promise<MessageOrchestratorResult> {
    try {
      // Check if school messaging is paused (Requirements 2.7, 2.8)
      const messagingConfig = await prisma.schoolMessagingConfig.findUnique({
        where: { schoolId },
      })

      if (messagingConfig?.isPaused) {
        // Allow critical messages to bypass pause if emergency override is enabled
        if (priority !== 'critical' || !messagingConfig.emergencyOverride) {
          await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`)
          return {
            messageId,
            status: DeliveryStatus.FAILED,
            channel,
            error: `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`,
          }
        }
      }

      const contact = await contactManagementService.resolveContactForChannel(recipient.id, channel)
      if (!contact) {
        const fallbackResult = await this.tryFallback(messageId, schoolId, senderId, recipient, content, channel)
        if (fallbackResult) return fallbackResult
        await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, 'No contact available')
        return { messageId, status: DeliveryStatus.FAILED, channel, error: 'No contact available' }
      }
      const validation = await contactManagementService.validateContact(contact, channel === MessageChannel.EMAIL ? 'email' : 'phone')
      if (!validation.valid) {
        await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, validation.error || 'Invalid contact')
        return { messageId, status: DeliveryStatus.FAILED, channel, error: validation.error || 'Invalid contact' }
      }
      const result = await this.sendViaGateway(channel, validation.formatted || contact, content, recipient)
      const status = result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED
      await this.updateMessageStatus(messageId, status, result.error)
      if (!result.success && priority !== 'critical') {
        const fallbackResult = await this.tryFallback(messageId, schoolId, senderId, recipient, content, channel)
        if (fallbackResult && fallbackResult.status !== DeliveryStatus.FAILED) return fallbackResult
      }
      return { messageId, status, channel, error: result.error }
    } catch (error) {
      await this.updateMessageStatus(messageId, DeliveryStatus.FAILED, error instanceof Error ? error.message : 'Send failed')
      return { messageId, status: DeliveryStatus.FAILED, channel, error: error instanceof Error ? error.message : 'Send failed' }
    }
  }


  private async sendViaGateway(channel: MessageChannel, contact: string, content: string, recipient: Recipient): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      switch (channel) {
        case MessageChannel.SMS:
          const smsResult = await smsGateway.sendSMS({ to: contact, message: content })
          return { success: smsResult.success, messageId: smsResult.messageId, error: smsResult.error }
        case MessageChannel.WHATSAPP:
          const waResult = await whatsappGateway.sendWhatsApp({ to: contact, message: content })
          return { success: waResult.success, messageId: waResult.messageId, error: waResult.error }
        case MessageChannel.EMAIL:
          const emailResult = await emailGateway.sendEmail({ to: contact, subject: 'School Notification', html: content })
          return { success: emailResult.success, messageId: emailResult.messageId, error: emailResult.error }
        default:
          return { success: false, error: `Unsupported channel: ${channel}` }
      }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Gateway error' } }
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
    try { await messageLogService.updateMessageStatus(messageId, status, reason) }
    catch (error) { console.error('Failed to update message status:', error) }
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
}

export const messageOrchestratorService = new MessageOrchestratorService()
