/**
 * Finance Notification Service
 * Handles automated finance-related notifications including payment confirmations,
 * fee reminders, penalty notifications, and bulk balance summaries.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Property 24: Payment Notification
 * For any successfully recorded payment, the system SHALL queue a payment confirmation
 * notification to the guardian.
 */

import { prisma } from '@/lib/db'
import { MessageChannel, DeliveryStatus } from '@/types/enums'

// ============================================
// TYPES
// ============================================

export type FinanceNotificationType = 
  | 'PAYMENT_CONFIRMATION'
  | 'FEE_REMINDER'
  | 'PENALTY_NOTICE'
  | 'BALANCE_SUMMARY'

export interface NotificationResult {
  success: boolean
  notificationId?: string
  messageId?: string
  channel?: MessageChannel
  error?: string
  deliveryStatus?: DeliveryStatus
}

export interface PaymentConfirmationInput {
  schoolId: string
  studentId: string
  guardianId: string
  paymentId: string
  amount: number
  receiptNumber: string
  paymentMethod: string
  newBalance: number
  paymentDate: Date
  senderId: string
  channel?: MessageChannel
}

export interface FeeReminderInput {
  schoolId: string
  studentId: string
  guardianId: string
  termId: string
  totalFees: number
  balance: number
  dueDate: Date
  daysUntilDue: number
  senderId: string
  channel?: MessageChannel
}

export interface PenaltyNotificationInput {
  schoolId: string
  studentId: string
  guardianId: string
  penaltyId: string
  penaltyName: string
  penaltyAmount: number
  reason: string
  newBalance: number
  senderId: string
  channel?: MessageChannel
}

export interface BulkBalanceSummaryInput {
  schoolId: string
  termId: string
  senderId: string
  filters?: {
    classId?: string
    minBalance?: number
    maxBalance?: number
    guardianIds?: string[]
  }
  channel?: MessageChannel
}

export interface BulkNotificationResult {
  totalRecipients: number
  sent: number
  failed: number
  queued: number
  errors: string[]
}

export interface NotificationLogEntry {
  id: string
  schoolId: string
  guardianId: string
  studentId?: string
  type: FinanceNotificationType
  channel: MessageChannel
  content: string
  status: DeliveryStatus
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// ============================================
// FINANCE NOTIFICATION SERVICE
// ============================================

export class FinanceNotificationService {
  /**
   * Send payment confirmation notification
   * Requirement 8.1: When a payment is recorded, send confirmation to guardian
   * Property 24: Payment Notification
   */
  async sendPaymentConfirmation(input: PaymentConfirmationInput): Promise<NotificationResult> {
    const { schoolId, studentId, guardianId, paymentId, amount, receiptNumber,
      paymentMethod, newBalance, paymentDate, channel } = input

    try {
      const [student, guardian, school] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
        prisma.guardian.findUnique({ where: { id: guardianId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
      ])

      if (!student || !guardian || !school) {
        return { success: false, error: !student ? 'Student not found' : !guardian ? 'Guardian not found' : 'School not found' }
      }

      const selectedChannel = channel || guardian.preferredChannel as MessageChannel || MessageChannel.SMS
      const studentName = `${student.firstName} ${student.lastName}`
      const balanceText = newBalance > 0 ? `Outstanding balance: UGX ${newBalance.toLocaleString()}` : 'Fees fully paid. Thank you!'

      const content = this.buildPaymentConfirmationMessage({
        schoolName: school.name, studentName, amount, receiptNumber, paymentMethod, paymentDate, balanceText,
      })

      const notification = await this.logNotification({
        schoolId, guardianId, studentId, type: 'PAYMENT_CONFIRMATION', channel: selectedChannel, content,
        status: DeliveryStatus.QUEUED, metadata: { paymentId, amount, receiptNumber, newBalance },
      })

      const sendResult = await this.sendViaChannel(selectedChannel, guardian, content, school.name, schoolId)
      await this.updateNotificationStatus(notification.id, sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, sendResult.error)

      return {
        success: sendResult.success, notificationId: notification.id, messageId: sendResult.messageId,
        channel: selectedChannel, deliveryStatus: sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, error: sendResult.error,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send payment confirmation' }
    }
  }

  /**
   * Send fee reminder notification
   * Requirement 8.2: Send automated reminders based on school settings
   */
  async sendFeeReminder(input: FeeReminderInput): Promise<NotificationResult> {
    const { schoolId, studentId, guardianId, termId, totalFees, balance, dueDate, daysUntilDue, channel } = input

    try {
      if (balance <= 0) {
        return { success: false, error: 'No outstanding balance - reminder not needed' }
      }

      const [student, guardian, school, term] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
        prisma.guardian.findUnique({ where: { id: guardianId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
        prisma.term.findUnique({ where: { id: termId } }),
      ])

      if (!student || !guardian || !school) {
        return { success: false, error: !student ? 'Student not found' : !guardian ? 'Guardian not found' : 'School not found' }
      }

      const selectedChannel = channel || guardian.preferredChannel as MessageChannel || MessageChannel.SMS
      const studentName = `${student.firstName} ${student.lastName}`

      const content = this.buildFeeReminderMessage({
        schoolName: school.name, studentName, className: student.class.name, totalFees, balance, dueDate, daysUntilDue, termName: term?.name,
      })

      const notification = await this.logNotification({
        schoolId, guardianId, studentId, type: 'FEE_REMINDER', channel: selectedChannel, content,
        status: DeliveryStatus.QUEUED, metadata: { termId, totalFees, balance, dueDate: dueDate.toISOString(), daysUntilDue },
      })

      const sendResult = await this.sendViaChannel(selectedChannel, guardian, content, school.name, schoolId)
      await this.updateNotificationStatus(notification.id, sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, sendResult.error)

      return {
        success: sendResult.success, notificationId: notification.id, messageId: sendResult.messageId,
        channel: selectedChannel, deliveryStatus: sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, error: sendResult.error,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send fee reminder' }
    }
  }


  /**
   * Send penalty notification
   * Requirement 8.3: Notify guardian with penalty details when penalty is applied
   */
  async sendPenaltyNotification(input: PenaltyNotificationInput): Promise<NotificationResult> {
    const { schoolId, studentId, guardianId, penaltyId, penaltyName, penaltyAmount, reason, newBalance, channel } = input

    try {
      const [student, guardian, school] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
        prisma.guardian.findUnique({ where: { id: guardianId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
      ])

      if (!student || !guardian || !school) {
        return { success: false, error: !student ? 'Student not found' : !guardian ? 'Guardian not found' : 'School not found' }
      }

      const selectedChannel = channel || guardian.preferredChannel as MessageChannel || MessageChannel.SMS
      const studentName = `${student.firstName} ${student.lastName}`

      const content = this.buildPenaltyNotificationMessage({
        schoolName: school.name, studentName, penaltyName, penaltyAmount, reason, newBalance,
      })

      const notification = await this.logNotification({
        schoolId, guardianId, studentId, type: 'PENALTY_NOTICE', channel: selectedChannel, content,
        status: DeliveryStatus.QUEUED, metadata: { penaltyId, penaltyName, penaltyAmount, reason, newBalance },
      })

      const sendResult = await this.sendViaChannel(selectedChannel, guardian, content, school.name, schoolId)
      await this.updateNotificationStatus(notification.id, sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, sendResult.error)

      return {
        success: sendResult.success, notificationId: notification.id, messageId: sendResult.messageId,
        channel: selectedChannel, deliveryStatus: sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, error: sendResult.error,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send penalty notification' }
    }
  }

  /**
   * Send bulk balance summaries
   * Requirement 8.4: Support bulk sending to all guardians or filtered groups
   */
  async sendBulkBalanceSummaries(input: BulkBalanceSummaryInput): Promise<BulkNotificationResult> {
    const { schoolId, termId, filters, channel } = input
    const result: BulkNotificationResult = { totalRecipients: 0, sent: 0, failed: 0, queued: 0, errors: [] }

    try {
      const school = await prisma.school.findUnique({ where: { id: schoolId } })
      if (!school) { result.errors.push('School not found'); return result }

      const whereClause: Record<string, unknown> = { schoolId }
      if (filters?.classId) whereClause.student = { classId: filters.classId }
      if (filters?.minBalance !== undefined) whereClause.balance = { ...((whereClause.balance as object) || {}), gte: filters.minBalance }
      if (filters?.maxBalance !== undefined) whereClause.balance = { ...((whereClause.balance as object) || {}), lte: filters.maxBalance }

      const accounts = await prisma.studentAccount.findMany({
        where: whereClause,
        include: { student: { include: { class: true, studentGuardians: { where: { isPrimary: true }, include: { guardian: true } } } } },
      })

      let filteredAccounts = accounts
      if (filters?.guardianIds?.length) {
        filteredAccounts = accounts.filter(a => a.student.studentGuardians.some(sg => filters.guardianIds!.includes(sg.guardianId)))
      }

      result.totalRecipients = filteredAccounts.length
      const term = await prisma.term.findUnique({ where: { id: termId } })

      for (const account of filteredAccounts) {
        const guardian = account.student.studentGuardians[0]?.guardian
        if (!guardian) { result.failed++; result.errors.push(`No guardian for student ${account.studentId}`); continue }

        const selectedChannel = channel || guardian.preferredChannel as MessageChannel || MessageChannel.SMS
        const studentName = `${account.student.firstName} ${account.student.lastName}`

        const content = this.buildBalanceSummaryMessage({
          schoolName: school.name, studentName, className: account.student.class.name, termName: term?.name,
          totalFees: account.totalFees, totalPaid: account.totalPaid, totalDiscounts: account.totalDiscounts,
          totalPenalties: account.totalPenalties, balance: account.balance,
        })

        try {
          const notification = await this.logNotification({
            schoolId, guardianId: guardian.id, studentId: account.studentId, type: 'BALANCE_SUMMARY',
            channel: selectedChannel, content, status: DeliveryStatus.QUEUED,
            metadata: { termId, totalFees: account.totalFees, totalPaid: account.totalPaid, balance: account.balance },
          })

          const sendResult = await this.sendViaChannel(selectedChannel, guardian, content, school.name, schoolId)
          await this.updateNotificationStatus(notification.id, sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, sendResult.error)

          if (sendResult.success) result.sent++
          else { result.failed++; result.errors.push(`${studentName}: ${sendResult.error}`) }
        } catch (error) {
          result.failed++; result.errors.push(`${studentName}: ${error instanceof Error ? error.message : 'Send failed'}`)
        }
      }
      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Bulk send failed')
      return result
    }
  }


  /**
   * Get notification logs with filters
   * Requirement 8.5: Log all sent messages with delivery status
   */
  async getNotificationLogs(
    schoolId: string,
    filters?: { guardianId?: string; studentId?: string; type?: FinanceNotificationType; status?: DeliveryStatus; dateFrom?: Date; dateTo?: Date },
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ logs: NotificationLogEntry[]; total: number }> {
    const where: Record<string, unknown> = { schoolId }
    if (filters?.guardianId) where.guardianId = filters.guardianId
    if (filters?.studentId) where.studentId = filters.studentId
    if (filters?.type) where.type = filters.type
    if (filters?.status) where.status = filters.status
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) (where.createdAt as Record<string, Date>).gte = filters.dateFrom
      if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = filters.dateTo
    }

    const [logs, total] = await Promise.all([
      prisma.financeNotificationLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.financeNotificationLog.count({ where }),
    ])

    return {
      logs: logs.map(log => ({
        id: log.id, schoolId: log.schoolId, guardianId: log.guardianId, studentId: log.studentId ?? undefined,
        type: log.type as FinanceNotificationType, channel: log.channel as MessageChannel, content: log.content,
        status: log.status as DeliveryStatus, sentAt: log.sentAt ?? undefined, deliveredAt: log.deliveredAt ?? undefined,
        error: log.error ?? undefined, metadata: log.metadata ? JSON.parse(log.metadata as string) : undefined, createdAt: log.createdAt,
      })),
      total,
    }
  }

  /**
   * Get notification delivery statistics
   * Requirement 8.5: Track delivery status
   */
  async getDeliveryStatistics(schoolId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    total: number; sent: number; delivered: number; failed: number;
    byType: Record<FinanceNotificationType, number>; byChannel: Record<MessageChannel, number>; deliveryRate: number
  }> {
    const where: Record<string, unknown> = { schoolId }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = dateFrom
      if (dateTo) (where.createdAt as Record<string, Date>).lte = dateTo
    }

    const logs = await prisma.financeNotificationLog.findMany({ where })
    let sent = 0, delivered = 0, failed = 0
    const byType: Record<string, number> = {}
    const byChannel: Record<string, number> = {}

    for (const log of logs) {
      if (log.status === DeliveryStatus.SENT) sent++
      else if (log.status === DeliveryStatus.DELIVERED || log.status === DeliveryStatus.READ) delivered++
      else if (log.status === DeliveryStatus.FAILED || log.status === DeliveryStatus.BOUNCED) failed++
      byType[log.type] = (byType[log.type] || 0) + 1
      byChannel[log.channel] = (byChannel[log.channel] || 0) + 1
    }

    const total = logs.length
    return { total, sent, delivered, failed, byType: byType as Record<FinanceNotificationType, number>,
      byChannel: byChannel as Record<MessageChannel, number>, deliveryRate: total > 0 ? ((sent + delivered) / total) * 100 : 0 }
  }

  /**
   * Process scheduled fee reminders based on due dates
   * Requirement 8.2: Send automated reminders based on school settings
   */
  async processScheduledReminders(schoolId: string, termId: string): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = { totalRecipients: 0, sent: 0, failed: 0, queued: 0, errors: [] }

    try {
      const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })
      if (!settings) { result.errors.push('Finance settings not configured'); return result }

      const feeStructures = await prisma.feeStructure.findMany({
        where: { schoolId, termId, isActive: true, dueDate: { not: null } },
      })

      const today = new Date(); today.setHours(0, 0, 0, 0)

      const accounts = await prisma.studentAccount.findMany({
        where: { schoolId, balance: { gt: 0 } },
        include: { student: { include: { class: true, studentGuardians: { where: { isPrimary: true }, include: { guardian: true } } } } },
      })

      result.totalRecipients = accounts.length

      for (const account of accounts) {
        const guardian = account.student.studentGuardians[0]?.guardian
        if (!guardian) { result.failed++; continue }

        const feeStructure = feeStructures.find(fs => fs.classId === account.student.classId)
        if (!feeStructure?.dueDate) continue

        const dueDate = new Date(feeStructure.dueDate); dueDate.setHours(0, 0, 0, 0)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        const reminderDays = [7, 3, 1, 0, -1, -3, -7]
        if (!reminderDays.includes(daysUntilDue)) continue

        const sendResult = await this.sendFeeReminder({
          schoolId, studentId: account.studentId, guardianId: guardian.id, termId,
          totalFees: account.totalFees, balance: account.balance, dueDate, daysUntilDue, senderId: 'system',
        })

        if (sendResult.success) result.sent++
        else { result.failed++; result.errors.push(`${account.student.firstName} ${account.student.lastName}: ${sendResult.error}`) }
      }
      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Scheduled reminder processing failed')
      return result
    }
  }


  // ============================================
  // MESSAGE BUILDING HELPERS
  // ============================================

  private buildPaymentConfirmationMessage(params: {
    schoolName: string; studentName: string; amount: number; receiptNumber: string;
    paymentMethod: string; paymentDate: Date; balanceText: string
  }): string {
    const { schoolName, studentName, amount, receiptNumber, paymentMethod, paymentDate, balanceText } = params
    return `${schoolName}\nPayment Received for ${studentName}\nAmount: UGX ${amount.toLocaleString()}\nReceipt: ${receiptNumber}\nMethod: ${paymentMethod}\nDate: ${paymentDate.toLocaleDateString()}\n${balanceText}`
  }

  private buildFeeReminderMessage(params: {
    schoolName: string; studentName: string; className: string; totalFees: number;
    balance: number; dueDate: Date; daysUntilDue: number; termName?: string
  }): string {
    const { schoolName, studentName, className, totalFees, balance, dueDate, daysUntilDue, termName } = params
    let urgencyText = daysUntilDue < 0 ? `OVERDUE by ${Math.abs(daysUntilDue)} days`
      : daysUntilDue === 0 ? 'DUE TODAY' : daysUntilDue <= 3 ? `Due in ${daysUntilDue} days` : `Due: ${dueDate.toLocaleDateString()}`
    return `${schoolName}\nFee Reminder for ${studentName} (${className})\n${termName ? `Term: ${termName}\n` : ''}Total Fees: UGX ${totalFees.toLocaleString()}\nOutstanding: UGX ${balance.toLocaleString()}\n${urgencyText}\nPlease make payment to avoid penalties.`
  }

  private buildPenaltyNotificationMessage(params: {
    schoolName: string; studentName: string; penaltyName: string; penaltyAmount: number; reason: string; newBalance: number
  }): string {
    const { schoolName, studentName, penaltyName, penaltyAmount, reason, newBalance } = params
    return `${schoolName}\nPenalty Applied for ${studentName}\nPenalty: ${penaltyName}\nAmount: UGX ${penaltyAmount.toLocaleString()}\nReason: ${reason}\nNew Balance: UGX ${newBalance.toLocaleString()}\nPlease settle your account to avoid further penalties.`
  }

  private buildBalanceSummaryMessage(params: {
    schoolName: string; studentName: string; className: string; termName?: string;
    totalFees: number; totalPaid: number; totalDiscounts: number; totalPenalties: number; balance: number
  }): string {
    const { schoolName, studentName, className, termName, totalFees, totalPaid, totalDiscounts, totalPenalties, balance } = params
    const statusText = balance <= 0 ? 'Status: FULLY PAID ✓' : totalPaid > 0 ? 'Status: PARTIAL PAYMENT' : 'Status: UNPAID'
    return `${schoolName}\nBalance Summary for ${studentName} (${className})\n${termName ? `Term: ${termName}\n` : ''}Total Fees: UGX ${totalFees.toLocaleString()}\nPaid: UGX ${totalPaid.toLocaleString()}\n${totalDiscounts > 0 ? `Discounts: UGX ${totalDiscounts.toLocaleString()}\n` : ''}${totalPenalties > 0 ? `Penalties: UGX ${totalPenalties.toLocaleString()}\n` : ''}Balance: UGX ${balance.toLocaleString()}\n${statusText}`
  }

  // ============================================
  // NOTIFICATION LOGGING
  // ============================================

  private async logNotification(params: {
    schoolId: string; guardianId: string; studentId?: string; type: FinanceNotificationType;
    channel: MessageChannel; content: string; status: DeliveryStatus; metadata?: Record<string, unknown>
  }): Promise<{ id: string }> {
    const log = await prisma.financeNotificationLog.create({
      data: {
        schoolId: params.schoolId, guardianId: params.guardianId, studentId: params.studentId,
        type: params.type, channel: params.channel, content: params.content, status: params.status,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    })
    return { id: log.id }
  }

  private async updateNotificationStatus(notificationId: string, status: DeliveryStatus, error?: string): Promise<void> {
    const updateData: Record<string, unknown> = { status }
    if (status === DeliveryStatus.SENT) updateData.sentAt = new Date()
    else if (status === DeliveryStatus.DELIVERED || status === DeliveryStatus.READ) updateData.deliveredAt = new Date()
    if (error) updateData.error = error
    await prisma.financeNotificationLog.update({ where: { id: notificationId }, data: updateData })
  }


  // ============================================
  // CHANNEL SENDING
  // ============================================

  private async sendViaChannel(
    channel: MessageChannel,
    guardian: { id: string; phone?: string | null; email?: string | null; whatsappNumber?: string | null },
    content: string,
    schoolName: string,
    schoolId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check if school messaging is paused (Requirements 2.7, 2.8)
      if (schoolId) {
        const messagingConfig = await prisma.schoolMessagingConfig.findUnique({
          where: { schoolId },
        })

        if (messagingConfig?.isPaused && !messagingConfig.emergencyOverride) {
          return {
            success: false,
            error: `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`,
          }
        }
      }

      switch (channel) {
        case MessageChannel.SMS: return await this.sendSMS(guardian.phone, content)
        case MessageChannel.WHATSAPP: return await this.sendWhatsApp(guardian.whatsappNumber || guardian.phone, content)
        case MessageChannel.EMAIL: return await this.sendEmail(guardian.email, `${schoolName} - Finance Notification`, content)
        default: return { success: false, error: `Unsupported channel: ${channel}` }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' }
    }
  }

  private async sendSMS(phone: string | null | undefined, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!phone) return { success: false, error: 'No phone number available' }
    try {
      const { smsGateway } = await import('./sms-gateway.service')
      const result = await smsGateway.sendSMS({ to: phone, message: content })
      return { success: result.success, messageId: result.messageId, error: result.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'SMS send failed' }
    }
  }

  private async sendWhatsApp(phone: string | null | undefined, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!phone) return { success: false, error: 'No WhatsApp number available' }
    try {
      const { whatsappGateway } = await import('./whatsapp-gateway.service')
      const result = await whatsappGateway.sendWhatsApp({ to: phone, message: content })
      return { success: result.success, messageId: result.messageId, error: result.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'WhatsApp send failed' }
    }
  }

  private async sendEmail(email: string | null | undefined, subject: string, content: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!email) return { success: false, error: 'No email address available' }
    try {
      const { emailGateway } = await import('./email-gateway.service')
      const result = await emailGateway.sendEmail({ to: email, subject, html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${content}</pre>` })
      return { success: result.success, messageId: result.messageId, error: result.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Email send failed' }
    }
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  shouldSendFeeReminder(balance: number, daysUntilDue: number): boolean {
    if (balance <= 0) return false
    const reminderDays = [7, 3, 1, 0, -1, -3, -7]
    return reminderDays.includes(daysUntilDue)
  }

  calculateDaysUntilDue(dueDate: Date, currentDate: Date = new Date()): number {
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    const current = new Date(currentDate); current.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
  }

  getUrgencyLevel(daysUntilDue: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilDue < 0) return 'critical'
    if (daysUntilDue === 0) return 'high'
    if (daysUntilDue <= 3) return 'medium'
    return 'low'
  }

  formatCurrency(amount: number, currency: string = 'UGX'): string {
    return `${currency} ${amount.toLocaleString()}`
  }
}

// Export singleton instance
export const financeNotificationService = new FinanceNotificationService()
