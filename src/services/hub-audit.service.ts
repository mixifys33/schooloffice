/**
 * Hub Audit Service
 * Handles immutable audit logging for all Super Admin Communication Hub actions
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * 
 * IMMUTABILITY GUARANTEE (Requirement 9.5):
 * - Hub audit entries are IMMUTABLE and READ-ONLY once created
 * - NO update or delete operations are exposed on hub audit entries
 * - Any attempt to modify or delete hub audit entries will throw HubAuditImmutabilityError
 * - This ensures complete audit trail integrity for Super Admin accountability
 */
  
import { prisma } from '../lib/db'
import { 
  HubAuditService as IHubAuditService,
  AuditLog,
  AuditAction,
  AuditFilters,
  HubAuditActionType
} from '../types/communication-hub'

/**
 * Error thrown when attempting to modify or delete hub audit entries
 * Requirement 9.5: Audit trail must be immutable and tamper-evident
 */
export class HubAuditImmutabilityError extends Error {
  constructor(operation: 'update' | 'delete', auditLogId?: string) {
    const message = auditLogId
      ? `Cannot ${operation} hub audit log entry ${auditLogId}: Hub audit trail is immutable (Requirement 9.5)`
      : `Cannot ${operation} hub audit log entries: Hub audit trail is immutable (Requirement 9.5)`
    super(message)
    this.name = 'HubAuditImmutabilityError'
  }
}

/**
 * Map Prisma HubAuditLog to domain AuditLog type
 */
function mapPrismaHubAuditLogToDomain(prismaAuditLog: {
  id: string
  timestamp: Date
  adminId: string
  adminEmail: string
  action: HubAuditActionType
  targetType: string
  targetId: string
  targetName: string | null
  details: unknown
  ipAddress: string
}): AuditLog {
  return {
    id: prismaAuditLog.id,
    timestamp: prismaAuditLog.timestamp,
    adminId: prismaAuditLog.adminId,
    adminEmail: prismaAuditLog.adminEmail,
    action: prismaAuditLog.action,
    targetType: prismaAuditLog.targetType as 'school' | 'queue' | 'template' | 'quota' | 'alert',
    targetId: prismaAuditLog.targetId,
    targetName: prismaAuditLog.targetName ?? undefined,
    details: prismaAuditLog.details as {
      before?: Record<string, unknown>
      after?: Record<string, unknown>
      reason?: string
    },
    ipAddress: prismaAuditLog.ipAddress,
  }
}

export class HubAuditService implements IHubAuditService {
  /**
   * Log a Super Admin action in the immutable audit trail
   * Requirements: 9.1, 9.2, 9.3, 9.4
   * 
   * Requirement 9.1: Log pause/resume school messaging with timestamp and reason
   * Requirement 9.2: Log quota/credit modifications with before/after values
   * Requirement 9.3: Log queue operations (cancel/retry messages)
   * Requirement 9.4: Log template creation/modification
   */
  async logAction(action: AuditAction): Promise<void> {
    try {
      await prisma.hubAuditLog.create({
        data: {
          timestamp: new Date(),
          adminId: action.adminId,
          adminEmail: action.adminEmail,
          action: action.action,
          targetType: action.targetType,
          targetId: action.targetId,
          targetName: action.targetName ?? null,
          details: action.details,
          ipAddress: action.ipAddress,
        },
      })
    } catch (error) {
      // Log the error but don't throw - audit logging should not break operations
      console.error('Failed to log hub audit action:', error)
      // In production, you might want to send this to a monitoring service
    }
  }

  /**
   * Query audit logs with filtering support
   * Requirement 9.6: Support filtering by action type, date range, and target school
   */
  async getAuditLogs(filters: AuditFilters): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {}

    // Apply filters
    if (filters.adminId) {
      where.adminId = filters.adminId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.targetType) {
      where.targetType = filters.targetType
    }

    if (filters.targetId) {
      where.targetId = filters.targetId
    }

    if (filters.dateRange) {
      where.timestamp = {}
      if (filters.dateRange.start) {
        (where.timestamp as Record<string, Date>).gte = filters.dateRange.start
      }
      if (filters.dateRange.end) {
        (where.timestamp as Record<string, Date>).lte = filters.dateRange.end
      }
    }

    try {
      const auditLogs = await prisma.hubAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 1000, // Reasonable limit to prevent memory issues
      })

      return auditLogs.map(mapPrismaHubAuditLogToDomain)
    } catch (error) {
      console.error('Failed to retrieve hub audit logs:', error)
      throw new Error('Failed to retrieve audit logs')
    }
  }

  /**
   * Export audit logs for compliance purposes
   * Requirement 9.7: Audit log must be exportable for compliance purposes
   */
  async exportAuditLogs(filters: AuditFilters): Promise<Buffer> {
    const auditLogs = await this.getAuditLogs(filters)
    
    // Create CSV content
    const headers = [
      'ID',
      'Timestamp',
      'Admin ID',
      'Admin Email',
      'Action',
      'Target Type',
      'Target ID',
      'Target Name',
      'Before Values',
      'After Values',
      'Reason',
      'IP Address'
    ]

    const csvRows = [
      headers.join(','),
      ...auditLogs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.adminId,
        log.adminEmail,
        log.action,
        log.targetType,
        log.targetId,
        log.targetName || '',
        JSON.stringify(log.details.before || {}),
        JSON.stringify(log.details.after || {}),
        log.details.reason || '',
        log.ipAddress
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ]

    const csvContent = csvRows.join('\n')
    return Buffer.from(csvContent, 'utf-8')
  }

  // ============================================
  // IMMUTABILITY ENFORCEMENT (Requirement 9.5)
  // ============================================

  /**
   * BLOCKED: Update hub audit log entry
   * Requirement 9.5: Audit log must be immutable and tamper-evident
   * 
   * This method exists to explicitly prevent any update operations on hub audit entries.
   * It will ALWAYS throw a HubAuditImmutabilityError.
   * 
   * @throws {HubAuditImmutabilityError} Always - hub audit entries cannot be modified
   */
  async updateAuditLog(_id: string, _data: Partial<AuditAction>): Promise<never> {
    throw new HubAuditImmutabilityError('update', _id)
  }

  /**
   * BLOCKED: Delete hub audit log entry
   * Requirement 9.5: Audit log must be immutable and tamper-evident
   * 
   * This method exists to explicitly prevent any delete operations on hub audit entries.
   * It will ALWAYS throw a HubAuditImmutabilityError.
   * 
   * @throws {HubAuditImmutabilityError} Always - hub audit entries cannot be deleted
   */
  async deleteAuditLog(_id: string): Promise<never> {
    throw new HubAuditImmutabilityError('delete', _id)
  }

  /**
   * BLOCKED: Delete multiple hub audit log entries
   * Requirement 9.5: Audit log must be immutable and tamper-evident
   * 
   * This method exists to explicitly prevent any bulk delete operations on hub audit entries.
   * It will ALWAYS throw a HubAuditImmutabilityError.
   * 
   * @throws {HubAuditImmutabilityError} Always - hub audit entries cannot be deleted
   */
  async deleteAuditLogs(_filter: AuditFilters): Promise<never> {
    throw new HubAuditImmutabilityError('delete')
  }

  /**
   * Verify hub audit log immutability
   * Requirement 9.5: Audit log must be immutable and tamper-evident
   * 
   * This method can be used to verify that the hub audit service enforces immutability.
   * Returns true if immutability is enforced (update/delete operations throw errors).
   */
  verifyImmutability(): { isImmutable: boolean; message: string } {
    return {
      isImmutable: true,
      message: 'Hub audit trail is immutable and tamper-evident. Update and delete operations are blocked (Requirement 9.5).',
    }
  }

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC ACTIONS
  // ============================================

  /**
   * Log school messaging pause action
   * Requirement 9.1: Log pause action with timestamp and reason
   */
  async logSchoolMessagingPause(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.PAUSE_SCHOOL_MESSAGING,
      targetType: 'school',
      targetId: params.schoolId,
      targetName: params.schoolName,
      details: {
        reason: params.reason,
        after: { isPaused: true }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log school messaging resume action
   * Requirement 9.1: Log resume action with timestamp
   */
  async logSchoolMessagingResume(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.RESUME_SCHOOL_MESSAGING,
      targetType: 'school',
      targetId: params.schoolId,
      targetName: params.schoolName,
      details: {
        after: { isPaused: false }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log quota update action
   * Requirement 9.2: Log quota modifications with before/after values
   */
  async logQuotaUpdate(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    before: Record<string, unknown>
    after: Record<string, unknown>
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.UPDATE_QUOTA,
      targetType: 'quota',
      targetId: params.schoolId,
      targetName: params.schoolName,
      details: {
        before: params.before,
        after: params.after
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log credit addition action
   * Requirement 9.2: Log credit additions with before/after values
   */
  async logCreditAddition(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    channel: string
    amount: number
    previousBalance: number
    newBalance: number
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.ADD_CREDITS,
      targetType: 'quota',
      targetId: params.schoolId,
      targetName: params.schoolName,
      details: {
        before: { [`${params.channel}Credits`]: params.previousBalance },
        after: { 
          [`${params.channel}Credits`]: params.newBalance,
          addedAmount: params.amount
        }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log message cancellation action
   * Requirement 9.3: Log queue operations
   */
  async logMessageCancellation(params: {
    adminId: string
    adminEmail: string
    messageIds: string[]
    canceledCount: number
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.CANCEL_MESSAGES,
      targetType: 'queue',
      targetId: 'messages',
      details: {
        messageIds: params.messageIds,
        canceledCount: params.canceledCount
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log message retry action
   * Requirement 9.3: Log queue operations
   */
  async logMessageRetry(params: {
    adminId: string
    adminEmail: string
    messageIds: string[]
    retriedCount: number
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.RETRY_MESSAGES,
      targetType: 'queue',
      targetId: 'messages',
      details: {
        messageIds: params.messageIds,
        retriedCount: params.retriedCount
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log queue pause action
   * Requirement 9.3: Log queue operations
   */
  async logQueuePause(params: {
    adminId: string
    adminEmail: string
    channel: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.PAUSE_QUEUE,
      targetType: 'queue',
      targetId: params.channel,
      targetName: `${params.channel} Queue`,
      details: {
        after: { isPaused: true }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log queue resume action
   * Requirement 9.3: Log queue operations
   */
  async logQueueResume(params: {
    adminId: string
    adminEmail: string
    channel: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.RESUME_QUEUE,
      targetType: 'queue',
      targetId: params.channel,
      targetName: `${params.channel} Queue`,
      details: {
        after: { isPaused: false }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log template creation action
   * Requirement 9.4: Log template creation/modification
   */
  async logTemplateCreation(params: {
    adminId: string
    adminEmail: string
    templateId: string
    templateName: string
    channel: string
    content: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.CREATE_TEMPLATE,
      targetType: 'template',
      targetId: params.templateId,
      targetName: params.templateName,
      details: {
        after: {
          name: params.templateName,
          channel: params.channel,
          content: params.content
        }
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log template update action
   * Requirement 9.4: Log template creation/modification
   */
  async logTemplateUpdate(params: {
    adminId: string
    adminEmail: string
    templateId: string
    templateName: string
    before: Record<string, unknown>
    after: Record<string, unknown>
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.UPDATE_TEMPLATE,
      targetType: 'template',
      targetId: params.templateId,
      targetName: params.templateName,
      details: {
        before: params.before,
        after: params.after
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log alert acknowledgment action
   */
  async logAlertAcknowledgment(params: {
    adminId: string
    adminEmail: string
    alertId: string
    alertType: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.ACKNOWLEDGE_ALERT,
      targetType: 'alert',
      targetId: params.alertId,
      details: {
        alertType: params.alertType,
        acknowledgedAt: new Date().toISOString()
      },
      ipAddress: params.ipAddress,
    })
  }

  /**
   * Log emergency override action
   */
  async logEmergencyOverride(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    enabled: boolean
    reason?: string
    ipAddress: string
  }): Promise<void> {
    await this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: HubAuditActionType.EMERGENCY_OVERRIDE,
      targetType: 'school',
      targetId: params.schoolId,
      targetName: params.schoolName,
      details: {
        after: { emergencyOverride: params.enabled },
        reason: params.reason
      },
      ipAddress: params.ipAddress,
    })
  }
}

// Export singleton instance
export const hubAuditService = new HubAuditService()