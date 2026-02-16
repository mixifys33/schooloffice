/**
 * Financial Message Service
 * Handles fee reminders, payment confirmations, and penalty warnings with accurate balance data.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
    
import { prisma } from '../lib/db'
import { PaymentService as financeService } from './finance.service'
import { messageOrchestratorService } from './message-orchestrator.service'
import { messageTemplateService } from './message-template.service'
import { contactManagementService } from './contact-management.service'
import { MessageLogService } from './message-log.service'
import {
  MessageChannel,
  DeliveryStatus,
  MessageTemplateType,
  RecipientType,
  TargetType,
  Role,
} from '../types/enums'
import type { StudentBalance, Recipient } from '../types/entities'

const messageLogService = new MessageLogService()

// ============================================
// TYPES
// ============================================

/**
 * Result of a financial message send operation
 */
export interface FinancialMessageResult {
  success: boolean
  messageId?: string
  error?: string
  balanceAtSend?: number
  channel?: MessageChannel
}

/**
 * Fee reminder request parameters
 * Requirement 9.1: Send fee reminders with current balance
 */
export interface FeeReminderRequest {
  schoolId: string
  studentId: string
  termId: string
  senderId: string
  channel?: MessageChannel
  customMessage?: string
}

/**
 * Bulk fee reminder request
 */
export interface BulkFeeReminderRequest {
  schoolId: string
  termId: string
  senderId: string
  minBalance?: number
  channel?: MessageChannel
}

/**
 * Payment confirmation request parameters
 * Requirement 9.2: Send payment confirmation with payment details and new balance
 */
export interface PaymentConfirmationRequest {
  schoolId: string
  studentId: string
  termId: string
  paymentId: string
  senderId: string
  channel?: MessageChannel
}

/**
 * Penalty warning request parameters
 * Requirement 9.3: Send penalty warnings with penalty amount and deadline
 */
export interface PenaltyWarningRequest {
  schoolId: string
  studentId: string
  termId: string
  penaltyAmount: number
  deadline: Date
  senderId: string
  channel?: MessageChannel
  customMessage?: string
}

/**
 * Balance validation result
 * Requirement 9.4, 9.5: Validate balance accuracy before sending
 */
export interface BalanceValidationResult {
  valid: boolean
  balance?: StudentBalance
  error?: string
}

/**
 * Bulk fee reminder result
 */
export interface BulkFeeReminderResult {
  totalStudents: number
  sent: number
  failed: number
  blocked: number
  errors: string[]
}

// ============================================
// FINANCIAL MESSAGE SERVICE
// ============================================

export class FinancialMessageService {
  /**
   * Validate that balance data is available and accurate
   * Requirement 9.4: Validate balance accuracy before sending any financial message
   * Requirement 9.5: Block message if balance data unavailable
   */
  async validateBalance(studentId: string, termId: string): Promise<BalanceValidationResult> {
    try {
      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, schoolId: true, classId: true, firstName: true, lastName: true },
      })

      if (!student) {
        return {
          valid: false,
          error: `Student with id ${studentId} not found`,
        }
      }

      // Check if term exists
      const term = await prisma.term.findUnique({
        where: { id: termId },
      })

      if (!term) {
        return {
          valid: false,
          error: `Term with id ${termId} not found`,
        }
      }

      // Calculate balance
      const balance = await financeService.calculateStudentBalance(studentId, termId)

      // Validate balance data is complete
      if (balance.totalFees === undefined || balance.totalFees === null) {
        return {
          valid: false,
          error: 'Fee structure not configured for student class',
        }
      }

      if (balance.totalPaid === undefined || balance.totalPaid === null) {
        return {
          valid: false,
          error: 'Payment data unavailable',
        }
      }

      if (balance.balance === undefined || balance.balance === null) {
        return {
          valid: false,
          error: 'Balance calculation failed',
        }
      }

      return {
        valid: true,
        balance,
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Balance validation failed',
      }
    }
  }

  /**
   * Send fee reminder with current balance
   * Requirement 9.1: Pull current balance for each student when sending fee reminders
   */
  async sendFeeReminder(request: FeeReminderRequest): Promise<FinancialMessageResult> {
    const { schoolId, studentId, termId, senderId, channel, customMessage } = request

    // Validate balance before sending
    const balanceValidation = await this.validateBalance(studentId, termId)
    if (!balanceValidation.valid) {
      return {
        success: false,
        error: `Balance data unavailable: ${balanceValidation.error}`,
      }
    }

    const balance = balanceValidation.balance!

    // If no outstanding balance, no need to send reminder
    if (balance.balance <= 0) {
      return {
        success: false,
        error: 'No outstanding balance - fee reminder not needed',
      }
    }

    try {
      // Get student details
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          school: true,
        },
      })

      if (!student) {
        return {
          success: false,
          error: 'Student not found',
        }
      }

      // Get guardian contact
      const contacts = await contactManagementService.getStudentContacts(studentId)
      if (!contacts.primaryGuardian) {
        return {
          success: false,
          error: 'No primary guardian contact found',
        }
      }

      const guardian = contacts.primaryGuardian
      const selectedChannel = channel || guardian.preferredChannel || MessageChannel.SMS

      // Render message content
      const templateData = {
        studentName: `${student.firstName} ${student.lastName}`,
        balance: balance.balance.toLocaleString(),
        totalFees: balance.totalFees.toLocaleString(),
        totalPaid: balance.totalPaid.toLocaleString(),
        className: student.class.name,
        link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://schooloffice.app'}/parent/fees`,
      }

      let content: string
      if (customMessage) {
        content = customMessage
          .replace(/{{studentName}}/g, templateData.studentName)
          .replace(/{{balance}}/g, templateData.balance)
          .replace(/{{totalFees}}/g, templateData.totalFees)
          .replace(/{{totalPaid}}/g, templateData.totalPaid)
          .replace(/{{className}}/g, templateData.className)
      } else {
        const renderResult = await messageTemplateService.renderTemplateStrictAsync(
          schoolId,
          MessageTemplateType.FEES_REMINDER,
          selectedChannel,
          templateData
        )

        if (!renderResult.success) {
          return {
            success: false,
            error: `Template rendering failed: ${renderResult.error}`,
          }
        }
        content = renderResult.content!
      }

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [guardian.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'normal',
        senderId,
      })

      // Log the financial message with balance info
      await this.logFinancialMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: guardian.guardianId,
        messageType: 'FEE_REMINDER',
        balanceAtSend: balance.balance,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        balanceAtSend: balance.balance,
        channel: selectedChannel,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send fee reminder',
      }
    }
  }

  /**
   * Send bulk fee reminders to students with outstanding balances
   */
  async sendBulkFeeReminders(request: BulkFeeReminderRequest): Promise<BulkFeeReminderResult> {
    const { schoolId, termId, senderId, minBalance = 0, channel } = request

    const result: BulkFeeReminderResult = {
      totalStudents: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
      errors: [],
    }

    try {
      // Get students with arrears
      const studentsWithArrears = await financeService.getStudentsWithArrears(
        schoolId,
        termId,
        minBalance
      )

      result.totalStudents = studentsWithArrears.length

      for (const student of studentsWithArrears) {
        const sendResult = await this.sendFeeReminder({
          schoolId,
          studentId: student.studentId,
          termId,
          senderId,
          channel,
        })

        if (sendResult.success) {
          result.sent++
        } else if (sendResult.error?.includes('Balance data unavailable')) {
          result.blocked++
          result.errors.push(`${student.studentName}: ${sendResult.error}`)
        } else {
          result.failed++
          result.errors.push(`${student.studentName}: ${sendResult.error}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Bulk send failed')
      return result
    }
  }

  /**
   * Send payment confirmation with payment details and new balance
   * Requirement 9.2: Send confirmation with payment details and new balance
   */
  async sendPaymentConfirmation(request: PaymentConfirmationRequest): Promise<FinancialMessageResult> {
    const { schoolId, studentId, termId, paymentId, senderId, channel } = request

    try {
      // Get payment details
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          student: {
            include: {
              class: true,
            },
          },
        },
      })

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        }
      }

      // Validate balance after payment
      const balanceValidation = await this.validateBalance(studentId, termId)
      if (!balanceValidation.valid) {
        return {
          success: false,
          error: `Balance data unavailable: ${balanceValidation.error}`,
        }
      }

      const balance = balanceValidation.balance!

      // Get guardian contact
      const contacts = await contactManagementService.getStudentContacts(studentId)
      if (!contacts.primaryGuardian) {
        return {
          success: false,
          error: 'No primary guardian contact found',
        }
      }

      const guardian = contacts.primaryGuardian
      const selectedChannel = channel || guardian.preferredChannel || MessageChannel.SMS

      // Build confirmation message
      const studentName = `${payment.student.firstName} ${payment.student.lastName}`
      const content = this.buildPaymentConfirmationMessage({
        studentName,
        amount: payment.amount,
        receiptNumber: payment.receiptNumber,
        paymentMethod: payment.method,
        newBalance: balance.balance,
        paymentDate: payment.receivedAt,
      })

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [guardian.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'normal',
        senderId,
      })

      // Log the financial message
      await this.logFinancialMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: guardian.guardianId,
        messageType: 'PAYMENT_CONFIRMATION',
        balanceAtSend: balance.balance,
        paymentId,
        paymentAmount: payment.amount,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        balanceAtSend: balance.balance,
        channel: selectedChannel,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send payment confirmation',
      }
    }
  }

  /**
   * Send penalty warning with penalty amount and deadline
   * Requirement 9.3: Send penalty warnings with penalty amount and deadline
   */
  async sendPenaltyWarning(request: PenaltyWarningRequest): Promise<FinancialMessageResult> {
    const { schoolId, studentId, termId, penaltyAmount, deadline, senderId, channel, customMessage } = request

    // Validate balance before sending
    const balanceValidation = await this.validateBalance(studentId, termId)
    if (!balanceValidation.valid) {
      return {
        success: false,
        error: `Balance data unavailable: ${balanceValidation.error}`,
      }
    }

    const balance = balanceValidation.balance!

    try {
      // Get student details
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
        },
      })

      if (!student) {
        return {
          success: false,
          error: 'Student not found',
        }
      }

      // Get guardian contact
      const contacts = await contactManagementService.getStudentContacts(studentId)
      if (!contacts.primaryGuardian) {
        return {
          success: false,
          error: 'No primary guardian contact found',
        }
      }

      const guardian = contacts.primaryGuardian
      const selectedChannel = channel || guardian.preferredChannel || MessageChannel.SMS

      // Build penalty warning message
      const studentName = `${student.firstName} ${student.lastName}`
      const content = customMessage || this.buildPenaltyWarningMessage({
        studentName,
        currentBalance: balance.balance,
        penaltyAmount,
        deadline,
        totalAfterPenalty: balance.balance + penaltyAmount,
      })

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [guardian.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'high',
        senderId,
      })

      // Log the financial message
      await this.logFinancialMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: guardian.guardianId,
        messageType: 'PENALTY_WARNING',
        balanceAtSend: balance.balance,
        penaltyAmount,
        deadline,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        balanceAtSend: balance.balance,
        channel: selectedChannel,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send penalty warning',
      }
    }
  }

  /**
   * Build payment confirmation message content
   */
  private buildPaymentConfirmationMessage(params: {
    studentName: string
    amount: number
    receiptNumber: string
    paymentMethod: string
    newBalance: number
    paymentDate: Date
  }): string {
    const { studentName, amount, receiptNumber, paymentMethod, newBalance, paymentDate } = params
    
    const balanceText = newBalance > 0 
      ? `Outstanding balance: UGX ${newBalance.toLocaleString()}`
      : 'Fees fully paid. Thank you!'

    return `Payment Received for ${studentName}.\n` +
      `Amount: UGX ${amount.toLocaleString()}\n` +
      `Receipt: ${receiptNumber}\n` +
      `Method: ${paymentMethod}\n` +
      `Date: ${paymentDate.toLocaleDateString()}\n` +
      `${balanceText}`
  }

  /**
   * Build penalty warning message content
   */
  private buildPenaltyWarningMessage(params: {
    studentName: string
    currentBalance: number
    penaltyAmount: number
    deadline: Date
    totalAfterPenalty: number
  }): string {
    const { studentName, currentBalance, penaltyAmount, deadline, totalAfterPenalty } = params

    return `PENALTY WARNING for ${studentName}.\n` +
      `Current Balance: UGX ${currentBalance.toLocaleString()}\n` +
      `Penalty Amount: UGX ${penaltyAmount.toLocaleString()}\n` +
      `Deadline: ${deadline.toLocaleDateString()}\n` +
      `Total if unpaid: UGX ${totalAfterPenalty.toLocaleString()}\n` +
      `Please pay before the deadline to avoid the penalty.`
  }

  /**
   * Log financial message for audit trail
   */
  private async logFinancialMessage(params: {
    schoolId: string
    messageId: string
    studentId: string
    guardianId: string
    messageType: 'FEE_REMINDER' | 'PAYMENT_CONFIRMATION' | 'PENALTY_WARNING'
    balanceAtSend: number
    paymentId?: string
    paymentAmount?: number
    penaltyAmount?: number
    deadline?: Date
    channel: MessageChannel
    status: DeliveryStatus
    senderId: string
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          schoolId: params.schoolId,
          userId: params.senderId,
          action: `financial_message_${params.messageType.toLowerCase()}`,
          resource: 'financial_message',
          resourceId: params.messageId,
          newValue: {
            messageType: params.messageType,
            studentId: params.studentId,
            guardianId: params.guardianId,
            balanceAtSend: params.balanceAtSend,
            paymentId: params.paymentId,
            paymentAmount: params.paymentAmount,
            penaltyAmount: params.penaltyAmount,
            deadline: params.deadline?.toISOString(),
            channel: params.channel,
            status: params.status,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log financial message:', error)
    }
  }

  /**
   * Get balance at the time of sending for a specific message
   * Useful for audit and verification
   */
  async getMessageBalanceInfo(messageId: string): Promise<{
    found: boolean
    balanceAtSend?: number
    messageType?: string
    timestamp?: Date
  }> {
    try {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: messageId,
          resource: 'financial_message',
        },
      })

      if (!auditLog || !auditLog.newValue) {
        return { found: false }
      }

      const value = auditLog.newValue as Record<string, unknown>
      return {
        found: true,
        balanceAtSend: value.balanceAtSend as number,
        messageType: value.messageType as string,
        timestamp: auditLog.timestamp,
      }
    } catch {
      return { found: false }
    }
  }

  /**
   * Pure function to check if balance data is valid
   * Used for testing
   */
  isBalanceDataValid(balance: StudentBalance | null | undefined): boolean {
    if (!balance) return false
    if (balance.totalFees === undefined || balance.totalFees === null) return false
    if (balance.totalPaid === undefined || balance.totalPaid === null) return false
    if (balance.balance === undefined || balance.balance === null) return false
    return true
  }

  /**
   * Pure function to format balance for message
   * Used for testing
   */
  formatBalanceForMessage(balance: number): string {
    return `UGX ${balance.toLocaleString()}`
  }

  /**
   * Pure function to check if fee reminder should be sent
   * Used for testing
   */
  shouldSendFeeReminder(balance: StudentBalance): boolean {
    return this.isBalanceDataValid(balance) && balance.balance > 0
  }
}

// Export singleton instance
export const financialMessageService = new FinancialMessageService()
