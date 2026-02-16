/**
 * Critical Message Service
 * Handles emergency override for critical alerts that bypass SMS limits
 * Requirements: 32.1, 32.2, 32.3, 32.4, 32.5
 */   
import { prisma } from '@/lib/db'
import { MessageChannel, MessageStatus, MessageTemplateType, Role } from '@/types/enums'
import { auditService, AuditResource } from './audit.service'
import { smsGateway } from './sms-gateway.service'

/**
 * Maximum critical overrides per term before requiring Super Admin approval
 * Requirement 32.3: Require Super Admin approval after 3 overrides
 */
const MAX_OVERRIDES_BEFORE_APPROVAL = 3

/**
 * Critical override audit action
 */
export const CRITICAL_OVERRIDE_ACTION = 'critical_message_override'

/**
 * Critical override status
 */
export enum CriticalOverrideStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Critical override record
 */
export interface CriticalOverride {
  id: string
  schoolId: string
  adminId: string
  studentId: string
  reason: string
  messageContent: string
  templateType: string
  status: CriticalOverrideStatus
  requiresApproval: boolean
  approvedBy?: string
  approvedAt?: Date
  rejectedBy?: string
  rejectedAt?: Date
  rejectionReason?: string
  messageId?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Critical message send parameters
 */
export interface SendCriticalMessageParams {
  schoolId: string
  adminId: string
  studentId: string
  reason: string
  templateType: MessageTemplateType
  data: Record<string, unknown>
}

/**
 * Critical message result
 */
export interface CriticalMessageResult {
  success: boolean
  overrideId: string
  requiresApproval: boolean
  messageId?: string
  error?: string
}

/**
 * Override count for a school in a term
 */
export interface OverrideCount {
  schoolId: string
  termId: string
  count: number
  limit: number
  requiresApproval: boolean
}

/**
 * Override audit report entry
 */
export interface OverrideAuditEntry {
  id: string
  schoolId: string
  adminId: string
  adminName?: string
  studentId: string
  studentName?: string
  reason: string
  status: CriticalOverrideStatus
  approvedBy?: string
  approverName?: string
  createdAt: Date
  approvedAt?: Date
}

/**
 * Override audit report
 * Requirement 32.5: Generate override audit report
 */
export interface OverrideAuditReport {
  schoolId: string
  termId: string
  termName?: string
  totalOverrides: number
  pendingApproval: number
  approved: number
  rejected: number
  sent: number
  failed: number
  entries: OverrideAuditEntry[]
}

export class CriticalMessageService {
  // ============================================
  // OVERRIDE COUNT MANAGEMENT
  // ============================================

  /**
   * Get the current override count for a school in the current term
   * Requirement 32.3: Track overrides per term
   */
  async getOverrideCount(schoolId: string): Promise<OverrideCount> {
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
      },
      orderBy: { startDate: 'desc' },
    })

    if (!currentTerm) {
      return {
        schoolId,
        termId: '',
        count: 0,
        limit: MAX_OVERRIDES_BEFORE_APPROVAL,
        requiresApproval: false,
      }
    }

    // Count overrides in current term that were sent or approved
    const count = await prisma.criticalOverride.count({
      where: {
        schoolId,
        createdAt: {
          gte: currentTerm.startDate,
          lte: currentTerm.endDate,
        },
        status: {
          in: [CriticalOverrideStatus.SENT, CriticalOverrideStatus.APPROVED],
        },
      },
    })

    return {
      schoolId,
      termId: currentTerm.id,
      count,
      limit: MAX_OVERRIDES_BEFORE_APPROVAL,
      requiresApproval: count >= MAX_OVERRIDES_BEFORE_APPROVAL,
    }
  }

  // ============================================
  // CRITICAL MESSAGE SENDING
  // ============================================

  /**
   * Send a critical message that bypasses SMS limits
   * Requirement 32.1: Bypass SMS limits for critical messages
   * Requirement 32.2: Log overrides with admin ID and reason
   * Requirement 32.3: Require Super Admin approval after 3 overrides
   * Requirement 32.4: Require admin to provide justification reason
   */
  async sendCriticalMessage(params: SendCriticalMessageParams): Promise<CriticalMessageResult> {
    const { schoolId, adminId, studentId, reason, templateType, data } = params

    // Validate reason is provided (Requirement 32.4)
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        overrideId: '',
        requiresApproval: false,
        error: 'Justification reason is required for critical messages',
      }
    }

    // Get override count to determine if approval is needed
    const overrideCount = await this.getOverrideCount(schoolId)
    const requiresApproval = overrideCount.requiresApproval

    // Generate message content from template
    const messageContent = await this.generateMessageContent(schoolId, templateType, data)

    // Create the critical override record
    const override = await prisma.criticalOverride.create({
      data: {
        schoolId,
        adminId,
        studentId,
        reason: reason.trim(),
        messageContent,
        templateType,
        status: requiresApproval 
          ? CriticalOverrideStatus.PENDING_APPROVAL 
          : CriticalOverrideStatus.APPROVED,
        requiresApproval,
      },
    })

    // Log the override action (Requirement 32.2)
    await auditService.log({
      schoolId,
      userId: adminId,
      action: CRITICAL_OVERRIDE_ACTION,
      resource: AuditResource.MESSAGE,
      resourceId: override.id,
      newValue: {
        studentId,
        reason,
        templateType,
        requiresApproval,
        overrideNumber: overrideCount.count + 1,
      },
    })

    // If approval is required, return pending status
    if (requiresApproval) {
      return {
        success: true,
        overrideId: override.id,
        requiresApproval: true,
        error: 'Critical message requires Super Admin approval (3+ overrides this term)',
      }
    }

    // Send the message immediately (bypassing SMS limits)
    const sendResult = await this.sendOverrideMessage(override.id, studentId, messageContent, schoolId)

    return {
      success: sendResult.success,
      overrideId: override.id,
      requiresApproval: false,
      messageId: sendResult.messageId,
      error: sendResult.error,
    }
  }

  /**
   * Generate message content from template
   */
  private async generateMessageContent(
    schoolId: string,
    templateType: MessageTemplateType,
    data: Record<string, unknown>
  ): Promise<string> {
    // Try to get template from database
    const template = await prisma.messageTemplate.findFirst({
      where: {
        schoolId,
        type: templateType,
        isActive: true,
      },
    })

    if (template) {
      // Replace placeholders in template
      let content = template.content
      for (const [key, value] of Object.entries(data)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
      return content
    }

    // Fallback: generate basic message from data
    const studentName = data.studentName || 'Student'
    const message = data.message || 'Important school notification'
    return `URGENT: ${studentName} - ${message}`
  }

  /**
   * Send the override message bypassing SMS limits
   * Requirement 32.1: Bypass SMS limits for critical messages
   */
  private async sendOverrideMessage(
    overrideId: string,
    studentId: string,
    content: string,
    schoolId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check if school messaging is paused (Requirements 2.7, 2.8)
      const messagingConfig = await prisma.schoolMessagingConfig.findUnique({
        where: { schoolId },
      })

      if (messagingConfig?.isPaused && !messagingConfig.emergencyOverride) {
        await this.updateOverrideStatus(overrideId, CriticalOverrideStatus.FAILED)
        return {
          success: false,
          error: `School messaging is paused and emergency override is disabled: ${messagingConfig.pauseReason || 'No reason provided'}`,
        }
      }

      // Get student and primary guardian
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          studentGuardians: {
            where: { isPrimary: true },
            include: { guardian: true },
          },
        },
      })

      if (!student || student.studentGuardians.length === 0) {
        await this.updateOverrideStatus(overrideId, CriticalOverrideStatus.FAILED)
        return {
          success: false,
          error: 'Student or primary guardian not found',
        }
      }

      const guardian = student.studentGuardians[0].guardian

      // Create message record (bypassing SMS limit check)
      const message = await prisma.message.create({
        data: {
          schoolId,
          studentId,
          guardianId: guardian.id,
          templateType: 'CRITICAL_ALERT',
          channel: MessageChannel.SMS,
          content,
          status: MessageStatus.QUEUED,
        },
      })

      // Send via SMS gateway directly (bypassing normal SMS limit check)
      // Requirement 32.1: Critical messages bypass SMS limits
      const sendResult = await smsGateway.sendSMS({
        to: guardian.phone,
        message: content,
      })

      // Update message status
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: sendResult.success ? MessageStatus.SENT : MessageStatus.FAILED,
          sentAt: sendResult.success ? new Date() : undefined,
          errorMessage: sendResult.error,
          cost: sendResult.cost,
        },
      })

      // Update override status
      await prisma.criticalOverride.update({
        where: { id: overrideId },
        data: {
          status: sendResult.success 
            ? CriticalOverrideStatus.SENT 
            : CriticalOverrideStatus.FAILED,
          messageId: message.id,
        },
      })

      return {
        success: sendResult.success,
        messageId: message.id,
        error: sendResult.error,
      }
    } catch (error) {
      await this.updateOverrideStatus(overrideId, CriticalOverrideStatus.FAILED)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send critical message',
      }
    }
  }

  // ============================================
  // APPROVAL MANAGEMENT
  // ============================================

  /**
   * Approve a pending critical override (Super Admin only)
   * Requirement 32.3: Require Super Admin approval after 3 overrides
   */
  async approveOverride(
    overrideId: string,
    superAdminId: string
  ): Promise<CriticalMessageResult> {
    const override = await prisma.criticalOverride.findUnique({
      where: { id: overrideId },
    })

    if (!override) {
      return {
        success: false,
        overrideId,
        requiresApproval: false,
        error: 'Override not found',
      }
    }

    if (override.status !== CriticalOverrideStatus.PENDING_APPROVAL) {
      return {
        success: false,
        overrideId,
        requiresApproval: false,
        error: `Override is not pending approval (status: ${override.status})`,
      }
    }

    // Update override as approved
    await prisma.criticalOverride.update({
      where: { id: overrideId },
      data: {
        status: CriticalOverrideStatus.APPROVED,
        approvedBy: superAdminId,
        approvedAt: new Date(),
      },
    })

    // Log approval action
    await auditService.log({
      schoolId: override.schoolId,
      userId: superAdminId,
      action: 'critical_override_approved',
      resource: AuditResource.MESSAGE,
      resourceId: overrideId,
      previousValue: { status: CriticalOverrideStatus.PENDING_APPROVAL },
      newValue: { status: CriticalOverrideStatus.APPROVED, approvedBy: superAdminId },
    })

    // Send the message now that it's approved
    const sendResult = await this.sendOverrideMessage(
      overrideId,
      override.studentId,
      override.messageContent,
      override.schoolId
    )

    return {
      success: sendResult.success,
      overrideId,
      requiresApproval: false,
      messageId: sendResult.messageId,
      error: sendResult.error,
    }
  }

  /**
   * Reject a pending critical override (Super Admin only)
   */
  async rejectOverride(
    overrideId: string,
    superAdminId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; error?: string }> {
    const override = await prisma.criticalOverride.findUnique({
      where: { id: overrideId },
    })

    if (!override) {
      return { success: false, error: 'Override not found' }
    }

    if (override.status !== CriticalOverrideStatus.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Override is not pending approval (status: ${override.status})`,
      }
    }

    // Update override as rejected
    await prisma.criticalOverride.update({
      where: { id: overrideId },
      data: {
        status: CriticalOverrideStatus.REJECTED,
        rejectedBy: superAdminId,
        rejectedAt: new Date(),
        rejectionReason,
      },
    })

    // Log rejection action
    await auditService.log({
      schoolId: override.schoolId,
      userId: superAdminId,
      action: 'critical_override_rejected',
      resource: AuditResource.MESSAGE,
      resourceId: overrideId,
      previousValue: { status: CriticalOverrideStatus.PENDING_APPROVAL },
      newValue: { 
        status: CriticalOverrideStatus.REJECTED, 
        rejectedBy: superAdminId,
        rejectionReason,
      },
    })

    return { success: true }
  }

  // ============================================
  // AUDIT REPORT
  // ============================================

  /**
   * Generate override audit report
   * Requirement 32.5: Generate override audit report
   */
  async generateOverrideAuditReport(
    schoolId: string,
    termId?: string
  ): Promise<OverrideAuditReport> {
    // Get term info
    let term = null
    let dateFilter: { gte?: Date; lte?: Date } = {}

    if (termId) {
      term = await prisma.term.findUnique({ where: { id: termId } })
      if (term) {
        dateFilter = {
          gte: term.startDate,
          lte: term.endDate,
        }
      }
    } else {
      // Get current term
      term = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
            isActive: true,
          },
        },
        orderBy: { startDate: 'desc' },
      })
      if (term) {
        dateFilter = {
          gte: term.startDate,
          lte: term.endDate,
        }
      }
    }

    // Get all overrides for the school/term
    const overrides = await prisma.criticalOverride.findMany({
      where: {
        schoolId,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get admin and student names for the report
    const adminIds = [...new Set(overrides.map(o => o.adminId))]
    const studentIds = [...new Set(overrides.map(o => o.studentId))]
    const approverIds = [...new Set(overrides.filter(o => o.approvedBy).map(o => o.approvedBy!))]

    const [users, students] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: [...adminIds, ...approverIds] } },
        include: { staff: true },
      }),
      prisma.student.findMany({
        where: { id: { in: studentIds } },
      }),
    ])

    const userMap = new Map(users.map(u => [u.id, u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email]))
    const studentMap = new Map(students.map(s => [s.id, `${s.firstName} ${s.lastName}`]))

    // Build report entries
    const entries: OverrideAuditEntry[] = overrides.map(o => ({
      id: o.id,
      schoolId: o.schoolId,
      adminId: o.adminId,
      adminName: userMap.get(o.adminId),
      studentId: o.studentId,
      studentName: studentMap.get(o.studentId),
      reason: o.reason,
      status: o.status as CriticalOverrideStatus,
      approvedBy: o.approvedBy || undefined,
      approverName: o.approvedBy ? userMap.get(o.approvedBy) : undefined,
      createdAt: o.createdAt,
      approvedAt: o.approvedAt || undefined,
    }))

    // Calculate counts by status
    const statusCounts = {
      pendingApproval: overrides.filter(o => o.status === CriticalOverrideStatus.PENDING_APPROVAL).length,
      approved: overrides.filter(o => o.status === CriticalOverrideStatus.APPROVED).length,
      rejected: overrides.filter(o => o.status === CriticalOverrideStatus.REJECTED).length,
      sent: overrides.filter(o => o.status === CriticalOverrideStatus.SENT).length,
      failed: overrides.filter(o => o.status === CriticalOverrideStatus.FAILED).length,
    }

    return {
      schoolId,
      termId: term?.id || '',
      termName: term?.name,
      totalOverrides: overrides.length,
      ...statusCounts,
      entries,
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Update override status
   */
  private async updateOverrideStatus(
    overrideId: string,
    status: CriticalOverrideStatus
  ): Promise<void> {
    await prisma.criticalOverride.update({
      where: { id: overrideId },
      data: { status },
    })
  }

  /**
   * Get pending overrides for a school (for Super Admin dashboard)
   */
  async getPendingOverrides(schoolId: string): Promise<CriticalOverride[]> {
    const overrides = await prisma.criticalOverride.findMany({
      where: {
        schoolId,
        status: CriticalOverrideStatus.PENDING_APPROVAL,
      },
      orderBy: { createdAt: 'asc' },
    })

    return overrides as CriticalOverride[]
  }

  /**
   * Get override by ID
   */
  async getOverride(overrideId: string): Promise<CriticalOverride | null> {
    const override = await prisma.criticalOverride.findUnique({
      where: { id: overrideId },
    })

    return override as CriticalOverride | null
  }

  /**
   * Check if a message can be sent as critical (validates admin role)
   */
  async canSendCriticalMessage(adminId: string, schoolId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        id: adminId,
        schoolId,
        role: { in: [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN] },
        isActive: true,
      },
    })

    return !!user
  }
}

// Export singleton instance
export const criticalMessageService = new CriticalMessageService()
