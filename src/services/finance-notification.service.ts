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
import { MessageChannel, DeliveryStatus, MessageType } from '@/types/enums'
import { AutomationFrequency, StudentAccountStatus, TrackerStatus } from '@prisma/client'

type PaymentMilestone = {
  week: number;
  percentage: number;
}

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
    byType: Record<FinanceNotificationType, number>; byChannel: Record<string, number>; deliveryRate: number
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
    return {
      total, sent, delivered, failed, byType: byType as Record<FinanceNotificationType, number>,
      byChannel: byChannel as Record<MessageChannel, number>, deliveryRate: total > 0 ? ((sent + delivered) / total) * 100 : 0
    }
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
    guardian: { id: string; phone?: string | null; email?: string | null },
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

  // ============================================
  // PRODUCTION-GRADE AUTOMATION ENGINE
  // ============================================

  /**
   * Run Automated Fee Reminders (DRY-RUN MODE)
   * Preview what automation would send without actually sending messages
   * 
   * @returns Preview of students who would receive messages with full details
   */
  async previewAutomatedFeeReminders(schoolId: string): Promise<{
    totalTargets: number;
    students: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      totalFees: number;
      paidAmount: number;
      paidPercentage: number;
      balance: number;
      requiredPercentage: number;
      shortfall: number;
      guardianPhone: string | null;
      reminderCount: number;
      lastReminderSent: Date | null;
      wouldSend: boolean;
      skipReason?: string;
    }>;
    errors: string[];
  }> {
    const result = { totalTargets: 0, students: [], errors: [] as string[] }
    const LOG_PREFIX = `[DRY-RUN ${schoolId}]`

    try {
      const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })
      if (!settings?.enableAutomatedReminders) {
        result.errors.push('Automation disabled')
        return result
      }

      const today = new Date()
      const activeTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isActive: true },
          startDate: { lte: today },
          endDate: { gte: today }
        }
      })

      if (!activeTerm) {
        result.errors.push('No active term found')
        return result
      }

      const msPerWeek = 1000 * 60 * 60 * 24 * 7
      const weeksSinceStart = Math.floor((today.getTime() - activeTerm.startDate.getTime()) / msPerWeek) + 1
      const milestones = (settings.paymentMilestones as unknown as PaymentMilestone[]) || []
      const relevantMilestone = milestones
        .filter(m => m.week <= weeksSinceStart)
        .sort((a, b) => b.week - a.week)[0]

      if (!relevantMilestone) {
        result.errors.push(`Week ${weeksSinceStart}: No applicable milestone`)
        return result
      }

      const accounts = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          isExempted: false,
          balance: { gt: 0 }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      })

      result.totalTargets = accounts.length

      for (const account of accounts) {
        const totalFees = account.totalFees
        if (totalFees <= 0) continue

        const requiredAmount = (totalFees * relevantMilestone.percentage) / 100
        const paidAmount = account.totalPaid
        const paidPercentage = totalFees > 0 ? (paidAmount / totalFees) * 100 : 100
        const balance = account.balance
        const shortfall = requiredAmount - paidAmount

        const guardian = account.student.studentGuardians[0]?.guardian
        let wouldSend = true
        let skipReason: string | undefined

        if (paidAmount >= requiredAmount) {
          wouldSend = false
          skipReason = 'Already met milestone requirement'
        }

        const milestoneDate = new Date(activeTerm.startDate.getTime() + (relevantMilestone.week * 7 * 24 * 60 * 60 * 1000))
        const daysPastMilestone = Math.floor((today.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysPastMilestone < settings.gracePeriodDays) {
          wouldSend = false
          skipReason = `Within grace period (${settings.gracePeriodDays} days)`
        }

        const tracker = await prisma.studentMilestoneTracker.findUnique({
          where: {
            studentId_termId_milestonePercentage: {
              studentId: account.studentId,
              termId: activeTerm.id,
              milestonePercentage: relevantMilestone.percentage
            }
          }
        })

        if (tracker && tracker.reminderCount >= settings.maxRemindersPerMilestone) {
          wouldSend = false
          skipReason = `Max reminders reached (${settings.maxRemindersPerMilestone})`
        }

        if (tracker && tracker.lastReminderSentAt) {
          const daysSinceLast = Math.floor((today.getTime() - tracker.lastReminderSentAt.getTime()) / (1000 * 60 * 60 * 24))
          if (daysSinceLast < 3) {
            wouldSend = false
            skipReason = `Last reminder sent ${daysSinceLast} days ago (min 3 days)`
          }
        }

        if (!guardian || !guardian.phone) {
          wouldSend = false
          skipReason = 'No guardian phone number'
        }

        result.students.push({
          studentId: account.studentId,
          studentName: `${account.student.firstName} ${account.student.lastName}`,
          admissionNumber: account.student.admissionNumber,
          className: account.student.class.name,
          totalFees,
          paidAmount,
          paidPercentage: parseFloat(paidPercentage.toFixed(1)),
          balance,
          requiredPercentage: relevantMilestone.percentage,
          shortfall,
          guardianPhone: guardian?.phone || null,
          reminderCount: tracker?.reminderCount || 0,
          lastReminderSent: tracker?.lastReminderSentAt || null,
          wouldSend,
          skipReason
        })
      }

      console.log(`${LOG_PREFIX} Preview complete: ${result.students.filter(s => s.wouldSend).length}/${result.totalTargets} would receive SMS`)
      return result

    } catch (error) {
      console.error(`${LOG_PREFIX} Preview error:`, error)
      result.errors.push('Preview generation failed')
      return result
    }
  }

  /**
   * Run Automated Fee Reminders
   * This is the core engine for the "Silent by default" automation system.
   * 
   * Safety Checks:
   * 1. Term must be ACTIVE and Current (now inside start/end dates)
   * 2. Automation must be ENABLED in FinanceSettings
   * 3. Current day must match configured Automation Day
   * 4. Milestones must be valid
   * 5. No guessing - abort if validation fails
   * 6. Phone validation
   * 7. SMS throttling
   * 8. Duplicate detection
   * 
   * Execution Logic:
   * - Calculates "Required Amount" based on active milestone %
   * - Checks Grace Period (default 3 days)
   * - Checks Max Reminders Cap
   * - Updates StudentMilestoneTracker to prevent spam
   * - Logs snapshot of legal evidence (Phone, Milestones)
   */
  async runAutomatedFeeReminders(schoolId: string, dryRun: boolean = false): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = { totalRecipients: 0, sent: 0, failed: 0, queued: 0, errors: [] }
    const LOG_PREFIX = dryRun ? `[DRY-RUN ${schoolId}]` : `[AUTO-FEES ${schoolId}]`

    try {
      // 1. PRE-FLIGHT VALIDATION (FAIL FAST)
      console.log(`${LOG_PREFIX} Starting automated fee reminders...`)
      
      const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })

      if (!settings?.enableAutomatedReminders) {
        console.log(`${LOG_PREFIX} Automation disabled. Skipping.`)
        return { ...result, errors: ['Automation disabled'] }
      }

      // Validate payment milestones are correctly configured
      const milestones = (settings.paymentMilestones as unknown as PaymentMilestone[]) || []
      if (milestones.length === 0) {
        console.error(`${LOG_PREFIX} No payment milestones configured. Aborting.`)
        return { ...result, errors: ['No payment milestones configured'] }
      }

      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.1) {
        console.error(`${LOG_PREFIX} Milestones do not total 100% (total: ${totalPercentage}%). Aborting.`)
        return { ...result, errors: [`Milestones total ${totalPercentage}%, must be 100%`] }
      }

      // Check if term is locked
      if (settings.lockedAt) {
        console.log(`${LOG_PREFIX} Finance settings locked at ${settings.lockedAt}. Settings cannot be changed.`)
      }

      // Validate Frequency/Schedule
      const today = new Date()
      // Note: getDay() returns 0 (Sun) - 6 (Sat). Our settings use 1 (Mon) - 7 (Sun)
      const currentDay = today.getDay() === 0 ? 7 : today.getDay()

      if (!dryRun && settings.automationDayOfWeek !== currentDay && process.env.NODE_ENV === 'production') {
        console.log(`${LOG_PREFIX} Skipping: Scheduled for day ${settings.automationDayOfWeek}, today is ${currentDay}`)
        return { ...result, errors: ['Not scheduled day'] }
      }

      // Find ACTIVE Term
      const activeTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isActive: true },
          startDate: { lte: today },
          endDate: { gte: today }
        },
        include: {
          academicYear: true
        }
      })

      if (!activeTerm) {
        console.error(`${LOG_PREFIX} No active term found. Automation aborted.`)
        return { ...result, errors: ['No active term found'] }
      }

      // Check if we've already run today
      if (!dryRun && settings.lastAutomationRunAt) {
        const lastRun = new Date(settings.lastAutomationRunAt)
        lastRun.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)
        
        if (lastRun.getTime() === todayStart.getTime()) {
          console.log(`${LOG_PREFIX} Automation already ran today. Skipping.`)
          return { ...result, errors: ['Automation already ran today'] }
        }
      }

      console.log(`${LOG_PREFIX} Active term: ${activeTerm.name} (${activeTerm.academicYear.name})`)

      // 2. CALCULATE ACADEMIC WEEK
      const msPerWeek = 1000 * 60 * 60 * 24 * 7
      const weeksSinceStart = Math.floor((today.getTime() - activeTerm.startDate.getTime()) / msPerWeek) + 1

      // 3. DETERMINE MILESTONE
      // Sort descending to find highest applicable milestone
      const relevantMilestone = milestones
        .filter(m => m.week <= weeksSinceStart)
        .sort((a, b) => b.week - a.week)[0]

      if (!relevantMilestone) {
        console.log(`${LOG_PREFIX} Week ${weeksSinceStart}: No milestone reached yet.`)
        return { ...result, errors: [`Week ${weeksSinceStart}: No applicable milestone`] }
      }

      console.log(`${LOG_PREFIX} Running for Week ${weeksSinceStart}. Milestone: ${relevantMilestone.percentage}%`)

      // 4. FETCH TARGET ACCOUNTS
      // Only Active students, with balances
      const accounts = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          isExempted: false,
          status: { not: StudentAccountStatus.OK }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      })

      // Optimization: If fetched accounts is 0, we can try fetching ALL accounts with balance > 0 if status isn't reliable yet
      // But for production safety, we assume status is maintained.
      // If implementation is new, we might want to fallback to balance check.
      // Let's rely on balance check for now to be safe until status sync is perfect.
      const accountsToCheck = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          isExempted: false,
          balance: { gt: 0 }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      })

      result.totalRecipients = accountsToCheck.length

      // 5. EVALUATE & EXECUTE
      for (const account of accountsToCheck) {
        try {
          if (account.isExempted) continue
          const totalFees = account.totalFees
          if (totalFees <= 0) continue

          const requiredAmount = (totalFees * relevantMilestone.percentage) / 100
          const paidAmount = account.totalPaid
          const paidPercentage = totalFees > 0 ? (paidAmount / totalFees) * 100 : 100

          if (paidAmount >= requiredAmount) continue

          // Grace Period Check
          const milestoneDate = new Date(activeTerm.startDate.getTime() + (relevantMilestone.week * 7 * 24 * 60 * 60 * 1000))
          const daysPastMilestone = Math.floor((today.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysPastMilestone < settings.gracePeriodDays) continue

          // Tracker Check
          const tracker = await prisma.studentMilestoneTracker.upsert({
            where: {
              studentId_termId_milestonePercentage: {
                studentId: account.studentId,
                termId: activeTerm.id,
                milestonePercentage: relevantMilestone.percentage
              }
            },
            create: {
              studentId: account.studentId,
              termId: activeTerm.id,
              milestonePercentage: relevantMilestone.percentage,
              requiredByWeek: relevantMilestone.week,
              status: TrackerStatus.PENDING
            },
            update: {}
          })

          if (tracker.status === TrackerStatus.CLEARED) continue
          if (tracker.reminderCount >= settings.maxRemindersPerMilestone) continue

          if (tracker.lastReminderSentAt) {
            const daysSinceLast = Math.floor((today.getTime() - tracker.lastReminderSentAt.getTime()) / (1000 * 60 * 60 * 24))
            if (daysSinceLast < 3) continue
          }

          // 6. SEND MESSAGE (or skip if dry run)
          const guardian = account.student.studentGuardians[0]?.guardian
          if (!guardian || !guardian.phone) {
            result.errors.push(`Student ${account.student.admissionNumber}: No guardian/phone`)
            result.failed++
            continue
          }

          // Phone validation
          if (!this.isValidUgandanPhone(guardian.phone)) {
            result.errors.push(`Student ${account.student.admissionNumber}: Invalid phone format`)
            result.failed++
            continue
          }

          const balance = account.balance
          const shortfall = requiredAmount - paidAmount
          const message = `Dear Parent, our records show that ${account.student.firstName} ${account.student.lastName} (${account.student.class.name}) has paid ${paidPercentage.toFixed(1)}% of the required ${relevantMilestone.percentage}% fees for ${activeTerm.name}. Balance: UGX ${balance.toLocaleString()}. Please clear by Week ${relevantMilestone.week}.`

          if (dryRun) {
            console.log(`${LOG_PREFIX} [DRY-RUN] Would send to ${guardian.phone}: ${message}`)
            result.queued++
            continue
          }

          const sendResult = await this.sendViaChannel(
            MessageChannel.SMS,
            guardian,
            message,
            "SchoolOffice",
            schoolId
          )

          if (sendResult.success) {
            result.sent++
            await prisma.studentMilestoneTracker.update({
              where: { id: tracker.id },
              data: {
                reminderCount: { increment: 1 },
                lastReminderSentAt: new Date()
              }
            })
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                type: 'FEE_REMINDER',
                channel: MessageChannel.SMS,
                content: message,
                status: DeliveryStatus.SENT,
                sentAt: new Date(),
                recipientPhone: guardian.phone,
                milestonePercentage: relevantMilestone.percentage,
                messageType: MessageType.AUTOMATED,
                metadata: JSON.stringify({ week: weeksSinceStart, required: relevantMilestone.percentage, paidPct: paidPercentage, balance })
              }
            })
          } else {
            result.failed++
            result.errors.push(`${account.student.firstName}: ${sendResult.error}`)
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                type: 'FEE_REMINDER',
                channel: MessageChannel.SMS,
                content: message,
                status: DeliveryStatus.FAILED,
                error: sendResult.error,
                recipientPhone: guardian.phone,
                messageType: MessageType.AUTOMATED
              }
            })
          }

        } catch (innerError) {
          console.error(`${LOG_PREFIX} Error processing student ${account.studentId}:`, innerError)
          result.errors.push(`Student ${account.studentId} error`)
          result.failed++
        }
      }

      if (!dryRun) {
        await prisma.financeSettings.update({
          where: { id: settings.id },
          data: { lastAutomationRunAt: new Date() }
        })
        
        // Create audit log
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: 'SYSTEM',
            action: 'AUTOMATED_FEE_REMINDERS',
            resource: 'FinanceNotification',
            resourceId: schoolId,
            newValue: {
              sent: result.sent,
              failed: result.failed,
              totalTargets: result.totalRecipients,
              milestone: relevantMilestone.percentage,
              week: weeksSinceStart
            },
            timestamp: new Date()
          }
        })
      }

      console.log(`${LOG_PREFIX} Completed: ${result.sent} sent, ${result.failed} failed, ${result.queued} queued`)
      return result

    } catch (error) {
      console.error(`${LOG_PREFIX} Fatal automation error:`, error)
      return { ...result, errors: ['Fatal system error'] }
    }
  }

  /**
   * Run Guaranteed Friday Fee Reminders
   * This method runs every Friday at 7:45 PM and sends SMS regardless of automation settings,
   * with explicit override rules when automation is disabled.
   *
   * Safety Checks:
   * 1. Term must be ACTIVE and Current (now inside start/end dates)
   * 2. If automation is disabled, check if Friday override is enabled
   * 3. Current day must be Friday (for production, bypassed in dry-run/force-run)
   * 4. Milestones must be valid
   * 5. No guessing - abort if validation fails
   * 6. Phone validation
   * 7. SMS throttling
   * 8. Duplicate detection
   *
   * Execution Logic:
   * - Calculates "Required Amount" based on active milestone %
   * - Checks Grace Period (default 3 days)
   * - Checks Max Reminders Cap
   * - Updates StudentMilestoneTracker to prevent spam
   * - Logs snapshot of legal evidence (Phone, Milestones)
   */
  async runGuaranteedFridayFeeReminders(schoolId: string, dryRun: boolean = false, forceRun: boolean = false): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = { totalRecipients: 0, sent: 0, failed: 0, queued: 0, errors: [] }
    const LOG_PREFIX = dryRun ? `[FRIDAY-DRY-RUN ${schoolId}]` : `[FRIDAY-AUTO ${schoolId}]`

    try {
      // 1. PRE-FLIGHT VALIDATION (FAIL FAST)
      console.log(`${LOG_PREFIX} Starting guaranteed Friday fee reminders...`)

      const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })

      // Check if we should run despite automation being disabled
      const isAutomationEnabled = settings?.enableAutomatedReminders
      const isFridayOverrideEnabled = settings?.fridayOverrideEnabled
      const isGuaranteedFridayEnabled = settings?.enableGuaranteedFridayReminders
      
      if (!isAutomationEnabled && !isFridayOverrideEnabled && !isGuaranteedFridayEnabled && !forceRun) {
        console.log(`${LOG_PREFIX} Automation disabled, Friday override disabled, and guaranteed Friday disabled. Skipping.`)
        return { ...result, errors: ['Automation and Friday features disabled'] }
      }

      // Validate payment milestones are correctly configured
      const milestones = (settings?.paymentMilestones as unknown as PaymentMilestone[]) || []
      if (milestones.length === 0) {
        console.error(`${LOG_PREFIX} No payment milestones configured. Aborting.`)
        return { ...result, errors: ['No payment milestones configured'] }
      }

      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.1) {
        console.error(`${LOG_PREFIX} Milestones do not total 100% (total: ${totalPercentage}%). Aborting.`)
        return { ...result, errors: [`Milestones total ${totalPercentage}%, must be 100%`] }
      }

      // Check if term is locked
      if (settings?.lockedAt) {
        console.log(`${LOG_PREFIX} Finance settings locked at ${settings.lockedAt}. Settings cannot be changed.`)
      }

      // Validate it's Friday (unless dry-run or force-run)
      const today = new Date()
      const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, ..., 5 = Friday

      if (!dryRun && !forceRun && currentDay !== 5 && process.env.NODE_ENV === 'production') {
        console.log(`${LOG_PREFIX} Skipping: Today is not Friday (today is ${currentDay === 0 ? 'Sunday' : currentDay === 1 ? 'Monday' : currentDay === 2 ? 'Tuesday' : currentDay === 3 ? 'Wednesday' : currentDay === 4 ? 'Thursday' : currentDay === 5 ? 'Friday' : 'Saturday'})`)
        return { ...result, errors: ['Not Friday'] }
      }

      // Check if we've already run today (for Friday runs)
      if (!dryRun && !forceRun && settings?.lastFridayRunAt) {
        const lastRun = new Date(settings.lastFridayRunAt)
        lastRun.setHours(0, 0, 0, 0)
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)

        if (lastRun.getTime() === todayStart.getTime()) {
          console.log(`${LOG_PREFIX} Friday automation already ran today. Skipping.`)
          return { ...result, errors: ['Friday automation already ran today'] }
        }
      }

      // Find ACTIVE Term
      const activeTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isActive: true },
          startDate: { lte: today },
          endDate: { gte: today }
        },
        include: {
          academicYear: true
        }
      })

      if (!activeTerm) {
        console.error(`${LOG_PREFIX} No active term found. Automation aborted.`)
        return { ...result, errors: ['No active term found'] }
      }

      console.log(`${LOG_PREFIX} Active term: ${activeTerm.name} (${activeTerm.academicYear.name})`)

      // 2. CALCULATE ACADEMIC WEEK
      const msPerWeek = 1000 * 60 * 60 * 24 * 7
      const weeksSinceStart = Math.floor((today.getTime() - activeTerm.startDate.getTime()) / msPerWeek) + 1

      // 3. DETERMINE MILESTONE
      // Sort descending to find highest applicable milestone
      const relevantMilestone = milestones
        .filter(m => m.week <= weeksSinceStart)
        .sort((a, b) => b.week - a.week)[0]

      if (!relevantMilestone) {
        console.log(`${LOG_PREFIX} Week ${weeksSinceStart}: No milestone reached yet.`)
        return { ...result, errors: [`Week ${weeksSinceStart}: No applicable milestone`] }
      }

      console.log(`${LOG_PREFIX} Running for Week ${weeksSinceStart}. Milestone: ${relevantMilestone.percentage}%`)

      // 4. FETCH TARGET ACCOUNTS
      // Only Active students, with balances
      const accountsToCheck = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          isExempted: false,
          balance: { gt: 0 }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      })

      result.totalRecipients = accountsToCheck.length

      // 5. EVALUATE & EXECUTE
      for (const account of accountsToCheck) {
        try {
          if (account.isExempted) continue
          const totalFees = account.totalFees
          if (totalFees <= 0) continue

          const requiredAmount = (totalFees * relevantMilestone.percentage) / 100
          const paidAmount = account.totalPaid
          const paidPercentage = totalFees > 0 ? (paidAmount / totalFees) * 100 : 100

          // For Friday guaranteed reminders, we send if they haven't met the milestone
          if (paidAmount >= requiredAmount) continue

          // Grace Period Check
          const milestoneDate = new Date(activeTerm.startDate.getTime() + (relevantMilestone.week * 7 * 24 * 60 * 60 * 1000))
          const daysPastMilestone = Math.floor((today.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24))

          // For Friday guaranteed reminders, we may still send even within grace period
          // (This could be configurable, but for now we'll respect the grace period)
          if (daysPastMilestone < (settings?.gracePeriodDays || 3)) continue

          // Tracker Check
          const tracker = await prisma.studentMilestoneTracker.upsert({
            where: {
              studentId_termId_milestonePercentage: {
                studentId: account.studentId,
                termId: activeTerm.id,
                milestonePercentage: relevantMilestone.percentage
              }
            },
            create: {
              studentId: account.studentId,
              termId: activeTerm.id,
              milestonePercentage: relevantMilestone.percentage,
              requiredByWeek: relevantMilestone.week,
              status: TrackerStatus.PENDING
            },
            update: {}
          })

          // For Friday guaranteed reminders, we may allow more reminders than usual
          // This could be configured separately if needed
          if (tracker.status === TrackerStatus.CLEARED) continue
          
          // Check max reminders but potentially allow more for Friday guaranteed
          if (tracker.reminderCount >= (settings?.maxRemindersPerMilestone || 2)) continue

          if (tracker.lastReminderSentAt) {
            // For Friday guaranteed, we might want to allow sending even if recent
            // For now, keeping the 3-day minimum to prevent excessive spam
            const daysSinceLast = Math.floor((today.getTime() - tracker.lastReminderSentAt.getTime()) / (1000 * 60 * 60 * 24))
            if (daysSinceLast < 3) continue
          }

          // 6. SEND MESSAGE (or skip if dry run)
          const guardian = account.student.studentGuardians[0]?.guardian
          if (!guardian || !guardian.phone) {
            result.errors.push(`Student ${account.student.admissionNumber}: No guardian/phone`)
            result.failed++
            continue
          }

          // Phone validation
          if (!this.isValidUgandanPhone(guardian.phone)) {
            result.errors.push(`Student ${account.student.admissionNumber}: Invalid phone format`)
            result.failed++
            continue
          }

          const balance = account.balance
          const shortfall = requiredAmount - paidAmount
          const message = `Dear Parent, our records show that ${account.student.firstName} ${account.student.lastName} (${account.student.class.name}) has paid ${paidPercentage.toFixed(1)}% of the required ${relevantMilestone.percentage}% fees for ${activeTerm.name}. Balance: UGX ${balance.toLocaleString()}. Please clear by Week ${relevantMilestone.week}. This is an urgent reminder sent weekly.`

          if (dryRun) {
            console.log(`${LOG_PREFIX} [DRY-RUN] Would send to ${guardian.phone}: ${message}`)
            result.queued++
            continue
          }

          const sendResult = await this.sendViaChannel(
            MessageChannel.SMS,
            guardian,
            message,
            "SchoolOffice",
            schoolId
          )

          if (sendResult.success) {
            result.sent++
            await prisma.studentMilestoneTracker.update({
              where: { id: tracker.id },
              data: {
                reminderCount: { increment: 1 },
                lastReminderSentAt: new Date()
              }
            })
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                type: 'FEE_REMINDER',
                channel: MessageChannel.SMS,
                content: message,
                status: DeliveryStatus.SENT,
                sentAt: new Date(),
                recipientPhone: guardian.phone,
                milestonePercentage: relevantMilestone.percentage,
                messageType: MessageType.AUTOMATED,
                metadata: JSON.stringify({ 
                  week: weeksSinceStart, 
                  required: relevantMilestone.percentage, 
                  paidPct: paidPercentage, 
                  balance,
                  source: 'FRIDAY_GUARANTEED'
                })
              }
            })
          } else {
            result.failed++
            result.errors.push(`${account.student.firstName}: ${sendResult.error}`)
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                type: 'FEE_REMINDER',
                channel: MessageChannel.SMS,
                content: message,
                status: DeliveryStatus.FAILED,
                error: sendResult.error,
                recipientPhone: guardian.phone,
                messageType: MessageType.AUTOMATED,
                metadata: JSON.stringify({ source: 'FRIDAY_GUARANTEED' })
              }
            })
          }

        } catch (innerError) {
          console.error(`${LOG_PREFIX} Error processing student ${account.studentId}:`, innerError)
          result.errors.push(`Student ${account.studentId} error`)
          result.failed++
        }
      }

      if (!dryRun && !forceRun) {
        await prisma.financeSettings.update({
          where: { id: settings!.id },
          data: { lastFridayRunAt: new Date() }
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: 'SYSTEM',
            action: 'GUARANTEED_FRIDAY_FEE_REMINDERS',
            resource: 'FinanceNotification',
            resourceId: schoolId,
            newValue: {
              sent: result.sent,
              failed: result.failed,
              totalTargets: result.totalRecipients,
              milestone: relevantMilestone.percentage,
              week: weeksSinceStart,
              source: 'FRIDAY_GUARANTEED'
            },
            timestamp: new Date()
          }
        })
      }

      console.log(`${LOG_PREFIX} Completed: ${result.sent} sent, ${result.failed} failed, ${result.queued} queued`)
      return result

    } catch (error) {
      console.error(`${LOG_PREFIX} Fatal Friday automation error:`, error)
      return { ...result, errors: ['Fatal system error'] }
    }
  }

  /**
   * Manual Send: Pause reminders for a specific student
   * Useful when parent has special arrangement
   */
  async pauseRemindersForStudent(schoolId: string, studentId: string, reason: string, pausedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = await prisma.studentAccount.findFirst({
        where: { schoolId, studentId }
      })

      if (!account) {
        return { success: false, error: 'Student account not found' }
      }

      await prisma.studentAccount.update({
        where: { id: account.id },
        data: {
          isExempted: true,
          exemptionReason: reason
        }
      })

      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: pausedBy,
          action: 'PAUSE_FEE_REMINDERS',
          resource: 'StudentAccount',
          resourceId: account.id,
          newValue: { reason, pausedAt: new Date() },
          timestamp: new Date()
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to pause reminders' }
    }
  }

  /**
   * Resume reminders for a student
   */
  async resumeRemindersForStudent(schoolId: string, studentId: string, resumedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const account = await prisma.studentAccount.findFirst({
        where: { schoolId, studentId }
      })

      if (!account) {
        return { success: false, error: 'Student account not found' }
      }

      await prisma.studentAccount.update({
        where: { id: account.id },
        data: {
          isExempted: false,
          exemptionReason: null
        }
      })

      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: resumedBy,
          action: 'RESUME_FEE_REMINDERS',
          resource: 'StudentAccount',
          resourceId: account.id,
          newValue: { resumedAt: new Date() },
          timestamp: new Date()
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resume reminders' }
    }
  }

  /**
   * Send manual fee reminder (bypasses automation checks)
   */
  async sendManualFeeReminder(input: {
    schoolId: string;
    studentId: string;
    guardianId: string;
    customMessage?: string;
    senderId: string;
  }): Promise<NotificationResult> {
    const { schoolId, studentId, guardianId, customMessage, senderId } = input

    try {
      const [student, guardian, school] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
        prisma.guardian.findUnique({ where: { id: guardianId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
      ])

      if (!student || !guardian || !school) {
        return { success: false, error: 'Student, guardian, or school not found' }
      }

      const account = await prisma.studentAccount.findFirst({
        where: { schoolId, studentId }
      })

      if (!account) {
        return { success: false, error: 'Student account not found' }
      }

      const studentName = `${student.firstName} ${student.lastName}`
      const content = customMessage || `Dear Parent, this is a reminder regarding ${studentName}'s (${student.class.name}) school fees. Balance: UGX ${account.balance.toLocaleString()}. Please contact the bursar for details.`

      const notification = await this.logNotification({
        schoolId,
        guardianId,
        studentId,
        type: 'FEE_REMINDER',
        channel: MessageChannel.SMS,
        content,
        status: DeliveryStatus.QUEUED,
        metadata: { manual: true, sentBy: senderId }
      })

      const sendResult = await this.sendViaChannel(MessageChannel.SMS, guardian, content, school.name, schoolId)
      await this.updateNotificationStatus(notification.id, sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED, sendResult.error)

      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: senderId,
          action: 'MANUAL_FEE_REMINDER',
          resource: 'FinanceNotification',
          resourceId: notification.id,
          newValue: { studentId, guardianId, success: sendResult.success },
          timestamp: new Date()
        }
      })

      return {
        success: sendResult.success,
        notificationId: notification.id,
        messageId: sendResult.messageId,
        channel: MessageChannel.SMS,
        deliveryStatus: sendResult.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        error: sendResult.error
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send manual reminder' }
    }
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate Ugandan phone number format
   * Accepts: +256..., 256..., 0...
   */
  private isValidUgandanPhone(phone: string): boolean {
    if (!phone) return false
    const cleaned = phone.replace(/\s+/g, '')
    
    // Valid formats:
    // +256XXXXXXXXX (13 chars)
    // 256XXXXXXXXX (12 chars)
    // 0XXXXXXXXX (10 chars)
    const ugandanPattern = /^(\+256|256|0)[37]\d{8}$/
    return ugandanPattern.test(cleaned)
  }
}

// Export singleton instance
export const financeNotificationService = new FinanceNotificationService()
