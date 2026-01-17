/**
 * Hub Alert Service
 * 
 * Handles alert generation, management, and notification delivery for the Super Admin Communication Hub.
 * Monitors system health and generates alerts based on configurable thresholds.
 * Requirements: 1.6, 1.7, 1.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { prisma } from '../lib/db'
import {
  HubAlert,
  HubAlertService as IHubAlertService,
  HubAlertType,
  HubAlertSeverity,
  AlertFilters,
  AlertSettings,
  AlertSettingsUpdate,
  MessageChannel,
} from '../types/communication-hub'
import { communicationHubService } from './communication-hub.service'

export class HubAlertService implements IHubAlertService {

  // ============================================
  // ALERT GENERATION - Requirements 1.6, 1.7, 1.8, 6.1, 6.2, 6.3
  // ============================================

  /**
   * Check system metrics and generate alerts based on thresholds
   * Requirements: 1.6, 1.7, 1.8, 6.1, 6.2, 6.3
   */
  async checkAndGenerateAlerts(): Promise<void> {
    try {
      // Get alert settings to determine thresholds
      const settings = await this.getAlertSettings()
      
      // Run all alert checks in parallel
      await Promise.all([
        this.checkDeliveryFailureAlerts(settings),
        this.checkQueueStuckAlerts(settings),
        this.checkQuotaExceededAlerts(),
        this.checkLowBalanceAlerts(settings),
      ])
    } catch (error) {
      console.error('Error during alert generation:', error)
      // Generate a system error alert
      await this.generateAlert({
        type: HubAlertType.SYSTEM_ERROR,
        severity: HubAlertSeverity.CRITICAL,
        title: 'Alert System Error',
        message: 'Failed to check system metrics for alert generation',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
    }
  }

  /**
   * Check for delivery failure alerts
   * Requirements: 1.6, 6.1
   */
  private async checkDeliveryFailureAlerts(settings: AlertSettings): Promise<void> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check each channel for delivery failures
    for (const channel of [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL]) {
      const messages = await prisma.communicationLog.findMany({
        where: {
          channel,
          createdAt: { gte: todayStart },
        },
        select: { status: true, schoolId: true },
      })

      if (messages.length === 0) continue

      const failedCount = messages.filter(m => m.status === 'FAILED').length
      const failureRate = (failedCount / messages.length) * 100

      if (failureRate >= settings.deliveryFailureThreshold) {
        // Check if we already have an active alert for this channel today
        const existingAlert = await this.findExistingAlert(
          HubAlertType.DELIVERY_FAILURE,
          { channel },
          todayStart
        )

        if (!existingAlert) {
          await this.generateAlert({
            type: HubAlertType.DELIVERY_FAILURE,
            severity: failureRate >= 50 ? HubAlertSeverity.CRITICAL : HubAlertSeverity.WARNING,
            title: `High ${channel} Delivery Failure Rate`,
            message: `${channel} delivery failure rate is ${failureRate.toFixed(1)}% (${failedCount}/${messages.length} messages failed)`,
            channel,
            metadata: {
              channel,
              failureRate,
              failedCount,
              totalCount: messages.length,
              threshold: settings.deliveryFailureThreshold,
            },
          })
        }
      }
    }
  }

  /**
   * Check for queue stuck alerts
   * Requirements: 1.7, 6.2
   */
  private async checkQueueStuckAlerts(settings: AlertSettings): Promise<void> {
    const stuckThreshold = new Date(Date.now() - settings.queueStuckThreshold * 1000)

    // Check for messages stuck in queue beyond threshold
    const stuckMessages = await prisma.message.findMany({
      where: {
        status: 'QUEUED',
        createdAt: { lt: stuckThreshold },
      },
      select: {
        id: true,
        channel: true,
        createdAt: true,
        schoolId: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to prevent memory issues
    })

    if (stuckMessages.length > 0) {
      // Group by channel
      const stuckByChannel = stuckMessages.reduce((acc, msg) => {
        const channel = msg.channel as MessageChannel
        if (!acc[channel]) acc[channel] = []
        acc[channel].push(msg)
        return acc
      }, {} as Record<MessageChannel, typeof stuckMessages>)

      // Generate alerts for each affected channel
      for (const [channel, messages] of Object.entries(stuckByChannel)) {
        const oldestMessage = messages[0]
        const ageInMinutes = Math.floor((Date.now() - oldestMessage.createdAt.getTime()) / (1000 * 60))

        // Check if we already have an active alert for this channel
        const existingAlert = await this.findExistingAlert(
          HubAlertType.QUEUE_STUCK,
          { channel },
          new Date(Date.now() - 60 * 60 * 1000) // Within last hour
        )

        if (!existingAlert) {
          await this.generateAlert({
            type: HubAlertType.QUEUE_STUCK,
            severity: ageInMinutes >= 60 ? HubAlertSeverity.CRITICAL : HubAlertSeverity.WARNING,
            title: `${channel} Queue Stuck`,
            message: `${messages.length} messages stuck in ${channel} queue. Oldest message is ${ageInMinutes} minutes old.`,
            channel: channel as MessageChannel,
            metadata: {
              channel,
              stuckCount: messages.length,
              oldestMessageAge: ageInMinutes,
              threshold: settings.queueStuckThreshold,
            },
          })
        }
      }
    }
  }

  /**
   * Check for quota exceeded alerts
   * Requirements: 1.8, 6.3
   */
  private async checkQuotaExceededAlerts(): Promise<void> {
    // Get all schools with messaging stats
    const schoolStats = await communicationHubService.getSchoolMessagingStats()

    for (const school of schoolStats) {
      const channels = [
        { name: 'SMS', usage: school.sms },
        { name: 'WhatsApp', usage: school.whatsapp },
        { name: 'Email', usage: school.email },
      ]

      for (const { name, usage } of channels) {
        if (usage.limit && usage.sent >= usage.limit) {
          // Check if we already have an active alert for this school and channel today
          const existingAlert = await this.findExistingAlert(
            HubAlertType.QUOTA_EXCEEDED,
            { schoolId: school.schoolId, channel: name },
            new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          )

          if (!existingAlert) {
            await this.generateAlert({
              type: HubAlertType.QUOTA_EXCEEDED,
              severity: HubAlertSeverity.WARNING,
              title: `${name} Quota Exceeded`,
              message: `${school.schoolName} has exceeded their ${name} quota (${usage.sent}/${usage.limit} messages)`,
              schoolId: school.schoolId,
              schoolName: school.schoolName,
              channel: name as MessageChannel,
              metadata: {
                schoolId: school.schoolId,
                schoolName: school.schoolName,
                channel: name,
                sent: usage.sent,
                limit: usage.limit,
                exceeded: usage.sent - usage.limit,
              },
            })
          }
        }
      }
    }
  }

  /**
   * Check for low balance alerts
   * Requirements: 6.3
   */
  private async checkLowBalanceAlerts(settings: AlertSettings): Promise<void> {
    // Get all schools with messaging stats
    const schoolStats = await communicationHubService.getSchoolMessagingStats()

    for (const school of schoolStats) {
      // For now, we'll focus on SMS credits since that's implemented
      // TODO: Add WhatsApp and Email credit checking when implemented
      const quotas = await communicationHubService.getSchoolQuotas(school.schoolId)

      if (quotas.smsCredits <= settings.lowBalanceThreshold) {
        // Check if we already have an active alert for this school
        const existingAlert = await this.findExistingAlert(
          HubAlertType.LOW_BALANCE,
          { schoolId: school.schoolId, channel: 'SMS' },
          new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
        )

        if (!existingAlert) {
          await this.generateAlert({
            type: HubAlertType.LOW_BALANCE,
            severity: quotas.smsCredits <= 0 ? HubAlertSeverity.CRITICAL : HubAlertSeverity.WARNING,
            title: 'Low SMS Balance',
            message: `${school.schoolName} has low SMS balance (${quotas.smsCredits} credits remaining)`,
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            channel: MessageChannel.SMS,
            metadata: {
              schoolId: school.schoolId,
              schoolName: school.schoolName,
              channel: 'SMS',
              balance: quotas.smsCredits,
              threshold: settings.lowBalanceThreshold,
            },
          })
        }
      }
    }
  }

  /**
   * Generate a new alert
   */
  private async generateAlert(alertData: {
    type: HubAlertType
    severity: HubAlertSeverity
    title: string
    message: string
    schoolId?: string
    schoolName?: string
    channel?: MessageChannel
    metadata: Record<string, unknown>
  }): Promise<HubAlert> {
    const alert = await prisma.hubAlert.create({
      data: {
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        schoolId: alertData.schoolId || null,
        channel: alertData.channel || null,
        metadata: alertData.metadata,
        createdAt: new Date(),
      },
      include: {
        school: {
          select: { name: true },
        },
      },
    })

    const hubAlert: HubAlert = {
      id: alert.id,
      type: alert.type as HubAlertType,
      severity: alert.severity as HubAlertSeverity,
      title: alert.title,
      message: alert.message,
      schoolId: alert.schoolId || undefined,
      schoolName: alert.school?.name || alertData.schoolName,
      channel: alert.channel as MessageChannel | undefined,
      metadata: alert.metadata as Record<string, unknown>,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      dismissedAt: alert.dismissedAt || undefined,
    }

    // Send notification if enabled
    await this.sendAlertNotification(hubAlert)

    return hubAlert
  }

  /**
   * Find existing alert to prevent duplicates
   */
  private async findExistingAlert(
    type: HubAlertType,
    criteria: { schoolId?: string; channel?: string },
    since: Date
  ): Promise<boolean> {
    const where: any = {
      type,
      createdAt: { gte: since },
      dismissedAt: null, // Only check non-dismissed alerts
    }

    if (criteria.schoolId) {
      where.schoolId = criteria.schoolId
    }

    if (criteria.channel) {
      where.channel = criteria.channel
    }

    const existingAlert = await prisma.hubAlert.findFirst({ where })
    return !!existingAlert
  }

  // ============================================
  // ALERT MANAGEMENT - Requirements 6.7, 6.8
  // ============================================

  /**
   * Get all active (non-dismissed) alerts
   * Requirement: 6.7
   */
  async getActiveAlerts(): Promise<HubAlert[]> {
    const alerts = await prisma.hubAlert.findMany({
      where: {
        dismissedAt: null,
      },
      orderBy: [
        { severity: 'desc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
      include: {
        school: {
          select: { name: true },
        },
      },
    })

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type as HubAlertType,
      severity: alert.severity as HubAlertSeverity,
      title: alert.title,
      message: alert.message,
      schoolId: alert.schoolId || undefined,
      schoolName: alert.school?.name,
      channel: alert.channel as MessageChannel | undefined,
      metadata: alert.metadata as Record<string, unknown>,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      dismissedAt: alert.dismissedAt || undefined,
    }))
  }

  /**
   * Get alert history with filtering
   * Requirement: 6.8
   */
  async getAlertHistory(filters: AlertFilters): Promise<HubAlert[]> {
    const where: any = {}

    // Apply filters
    if (filters.type) {
      where.type = filters.type
    }

    if (filters.severity) {
      where.severity = filters.severity
    }

    if (filters.schoolId) {
      where.schoolId = filters.schoolId
    }

    if (filters.dateRange) {
      where.createdAt = {}
      if (filters.dateRange.start) {
        where.createdAt.gte = filters.dateRange.start
      }
      if (filters.dateRange.end) {
        where.createdAt.lte = filters.dateRange.end
      }
    }

    if (filters.acknowledged !== undefined) {
      if (filters.acknowledged) {
        where.acknowledgedAt = { not: null }
      } else {
        where.acknowledgedAt = null
      }
    }

    const alerts = await prisma.hubAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Reasonable limit
      include: {
        school: {
          select: { name: true },
        },
      },
    })

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type as HubAlertType,
      severity: alert.severity as HubAlertSeverity,
      title: alert.title,
      message: alert.message,
      schoolId: alert.schoolId || undefined,
      schoolName: alert.school?.name,
      channel: alert.channel as MessageChannel | undefined,
      metadata: alert.metadata as Record<string, unknown>,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      dismissedAt: alert.dismissedAt || undefined,
    }))
  }

  /**
   * Acknowledge an alert
   * Requirement: 6.7
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = await prisma.hubAlert.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      throw new Error('Alert not found')
    }

    if (alert.acknowledgedAt) {
      throw new Error('Alert already acknowledged')
    }

    await prisma.hubAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        // TODO: Add acknowledgedBy when we have admin context
      },
    })
  }

  /**
   * Dismiss an alert
   * Requirement: 6.7
   */
  async dismissAlert(alertId: string): Promise<void> {
    const alert = await prisma.hubAlert.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      throw new Error('Alert not found')
    }

    if (alert.dismissedAt) {
      throw new Error('Alert already dismissed')
    }

    await prisma.hubAlert.update({
      where: { id: alertId },
      data: {
        dismissedAt: new Date(),
      },
    })
  }

  // ============================================
  // ALERT SETTINGS - Requirements 6.4, 6.5, 6.6
  // ============================================

  /**
   * Get alert settings
   * Requirement: 6.4
   */
  async getAlertSettings(): Promise<AlertSettings> {
    let settings = await prisma.hubAlertSettings.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.hubAlertSettings.create({
        data: {
          deliveryFailureThreshold: 10, // 10%
          queueStuckThreshold: 300, // 5 minutes
          lowBalanceThreshold: 100, // 100 messages
          abnormalUsageMultiplier: 2.0,
          emailNotifications: true,
          slackNotifications: false,
          notificationEmails: [],
        },
      })
    }

    return {
      id: settings.id,
      deliveryFailureThreshold: settings.deliveryFailureThreshold,
      queueStuckThreshold: settings.queueStuckThreshold,
      lowBalanceThreshold: settings.lowBalanceThreshold,
      abnormalUsageMultiplier: settings.abnormalUsageMultiplier,
      emailNotifications: settings.emailNotifications,
      slackNotifications: settings.slackNotifications,
      slackWebhookUrl: settings.slackWebhookUrl || undefined,
      notificationEmails: settings.notificationEmails as string[],
    }
  }

  /**
   * Update alert settings
   * Requirement: 6.4
   */
  async updateAlertSettings(updates: AlertSettingsUpdate): Promise<void> {
    // Get existing settings or create default
    let settings = await prisma.hubAlertSettings.findFirst()

    if (!settings) {
      settings = await prisma.hubAlertSettings.create({
        data: {
          deliveryFailureThreshold: 10,
          queueStuckThreshold: 300,
          lowBalanceThreshold: 100,
          abnormalUsageMultiplier: 2.0,
          emailNotifications: true,
          slackNotifications: false,
          notificationEmails: [],
        },
      })
    }

    // Update settings
    await prisma.hubAlertSettings.update({
      where: { id: settings.id },
      data: {
        ...updates,
        notificationEmails: updates.notificationEmails || settings.notificationEmails,
      },
    })
  }

  // ============================================
  // ALERT NOTIFICATIONS - Requirements 6.5, 6.6
  // ============================================

  /**
   * Send alert notification via configured channels
   * Requirements: 6.5, 6.6
   */
  async sendAlertNotification(alert: HubAlert): Promise<void> {
    try {
      const settings = await this.getAlertSettings()

      // Only send notifications for WARNING and CRITICAL alerts
      if (alert.severity === HubAlertSeverity.INFO) {
        return
      }

      // Send email notifications if enabled
      if (settings.emailNotifications && settings.notificationEmails.length > 0) {
        await this.sendEmailNotification(alert, settings.notificationEmails)
      }

      // Send Slack notifications if enabled
      if (settings.slackNotifications && settings.slackWebhookUrl) {
        await this.sendSlackNotification(alert, settings.slackWebhookUrl)
      }
    } catch (error) {
      console.error('Failed to send alert notification:', error)
      // Don't throw - notification failures shouldn't break alert generation
    }
  }

  /**
   * Send email notification for alerts
   * Requirement: 6.5
   */
  private async sendEmailNotification(alert: HubAlert, emails: string[]): Promise<void> {
    try {
      const { emailService } = await import('./email.service')
      
      const severityEmoji = alert.severity === HubAlertSeverity.CRITICAL ? '🚨' : '⚠️'
      const severityColor = alert.severity === HubAlertSeverity.CRITICAL ? '#dc2626' : '#f59e0b'
      
      const subject = `${severityEmoji} [SchoolOffice Alert] ${alert.title}`
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severityColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${severityEmoji} Communication Hub Alert</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">${alert.title}</h2>
            <p style="color: #4b5563; font-size: 16px;">${alert.message}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Severity</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: ${severityColor}; font-weight: bold;">${alert.severity}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Type</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${alert.type.replace(/_/g, ' ')}</td>
              </tr>
              ${alert.schoolName ? `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">School</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${alert.schoolName}</td>
              </tr>
              ` : ''}
              ${alert.channel ? `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Channel</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${alert.channel}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Time</td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${alert.createdAt.toISOString()}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Action Required:</strong> Please review this alert in the SchoolOffice Communication Hub dashboard.
              </p>
            </div>
          </div>
          
          <div style="padding: 15px; background-color: #1f2937; color: #9ca3af; text-align: center; font-size: 12px;">
            <p style="margin: 0;">This is an automated alert from SchoolOffice Communication Hub.</p>
            <p style="margin: 5px 0 0 0;">Do not reply to this email.</p>
          </div>
        </div>
      `
      
      const text = `
${severityEmoji} SchoolOffice Communication Hub Alert

${alert.title}

${alert.message}

Severity: ${alert.severity}
Type: ${alert.type.replace(/_/g, ' ')}
${alert.schoolName ? `School: ${alert.schoolName}` : ''}
${alert.channel ? `Channel: ${alert.channel}` : ''}
Time: ${alert.createdAt.toISOString()}

Action Required: Please review this alert in the SchoolOffice Communication Hub dashboard.

---
This is an automated alert from SchoolOffice Communication Hub.
      `.trim()
      
      // Send to all notification emails
      const results = await Promise.allSettled(
        emails.map(email => 
          emailService.sendEmail({
            to: email,
            subject,
            html,
            text,
          })
        )
      )
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
      const failed = results.length - successful
      
      if (failed > 0) {
        console.error(`Alert email notification: ${successful} sent, ${failed} failed`)
      }
    } catch (error) {
      console.error('Failed to send email notification:', error)
      throw error
    }
  }

  /**
   * Send Slack notification
   * Requirement: 6.6
   */
  private async sendSlackNotification(alert: HubAlert, webhookUrl: string): Promise<void> {
    try {
      const color = alert.severity === HubAlertSeverity.CRITICAL ? 'danger' : 'warning'
      const emoji = alert.severity === HubAlertSeverity.CRITICAL ? '🚨' : '⚠️'

      const payload = {
        text: `${emoji} SchoolOffice Communication Hub Alert`,
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            fields: [
              {
                title: 'Severity',
                value: alert.severity,
                short: true,
              },
              {
                title: 'Type',
                value: alert.type.replace('_', ' '),
                short: true,
              },
              ...(alert.schoolName ? [{
                title: 'School',
                value: alert.schoolName,
                short: true,
              }] : []),
              ...(alert.channel ? [{
                title: 'Channel',
                value: alert.channel,
                short: true,
              }] : []),
            ],
            ts: Math.floor(alert.createdAt.getTime() / 1000),
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      throw error
    }
  }
}

// Export singleton instance
export const hubAlertService = new HubAlertService()