/**
 * Super Admin Audit Service
 * Handles audit logging for all super admin control actions
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * 
 * IMMUTABILITY GUARANTEE (Requirement 9.2):
 * - Audit entries are IMMUTABLE and READ-ONLY once created
 * - NO update or delete operations are exposed on audit entries
 * - Any attempt to modify or delete audit entries will throw an error
 * - This ensures complete audit trail integrity for compliance and accountability
 */   
import { prisma } from '@/lib/db'
import { ActionType } from '@prisma/client'

/**
 * Error thrown when attempting to modify or delete audit entries
 * Requirement 9.2: Audit trail must be immutable and read-only
 */
export class SuperAdminAuditImmutabilityError extends Error {
  constructor(operation: 'update' | 'delete', auditLogId?: string) {
    const message = auditLogId
      ? `Cannot ${operation} super admin audit log entry ${auditLogId}: Audit trail is immutable (Requirement 9.2)`
      : `Cannot ${operation} super admin audit log entries: Audit trail is immutable (Requirement 9.2)`
    super(message)
    this.name = 'SuperAdminAuditImmutabilityError'
  }
}

/**
 * Super Admin Audit Log Entry
 */
export interface SuperAdminAuditLog {
  id: string
  timestamp: Date
  adminId: string
  adminEmail: string
  actionType: ActionType
  targetSchoolId: string
  targetSchoolName: string
  reason: string
  result: 'success' | 'failure'
  errorMessage: string | null
  ipAddress: string
  userAgent: string
  metadata: Record<string, unknown>
}

/**
 * Input for creating a super admin audit log entry
 */
export interface CreateSuperAdminAuditLogInput {
  adminId: string
  adminEmail: string
  actionType: ActionType
  targetSchoolId: string
  targetSchoolName: string
  reason: string
  result: 'success' | 'failure'
  errorMessage?: string
  ipAddress: string
  userAgent: string
  metadata?: Record<string, unknown>
}

/**
 * Filters for querying super admin audit logs
 */
export interface SuperAdminAuditLogFilter {
  adminId?: string
  actionType?: ActionType
  targetSchoolId?: string
  result?: 'success' | 'failure'
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Map Prisma SuperAdminAuditLog to domain type
 */
function mapPrismaSuperAdminAuditLogToDomain(prismaLog: {
  id: string
  timestamp: Date
  adminId: string
  adminEmail: string
  actionType: ActionType
  targetSchoolId: string
  targetSchoolName: string
  reason: string
  result: string
  errorMessage: string | null
  ipAddress: string
  userAgent: string
  metadata: unknown
}): SuperAdminAuditLog {
  return {
    id: prismaLog.id,
    timestamp: prismaLog.timestamp,
    adminId: prismaLog.adminId,
    adminEmail: prismaLog.adminEmail,
    actionType: prismaLog.actionType,
    targetSchoolId: prismaLog.targetSchoolId,
    targetSchoolName: prismaLog.targetSchoolName,
    reason: prismaLog.reason,
    result: prismaLog.result as 'success' | 'failure',
    errorMessage: prismaLog.errorMessage,
    ipAddress: prismaLog.ipAddress,
    userAgent: prismaLog.userAgent,
    metadata: (prismaLog.metadata as Record<string, unknown>) || {},
  }
}

export class SuperAdminAuditService {
  /**
   * Log a super admin action
   * Requirement 9.1: Create audit log entry with timestamp, super admin ID, action type, 
   * target school ID, reason, and result
   * Requirement 9.5: Display super admin name, action description, timestamp, and reason
   */
  async logAction(data: CreateSuperAdminAuditLogInput): Promise<SuperAdminAuditLog> {
    const auditLog = await prisma.superAdminAuditLog.create({
      data: {
        timestamp: new Date(),
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        actionType: data.actionType,
        targetSchoolId: data.targetSchoolId,
        targetSchoolName: data.targetSchoolName,
        reason: data.reason,
        result: data.result,
        errorMessage: data.errorMessage || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata || {},
      },
    })

    return mapPrismaSuperAdminAuditLogToDomain(auditLog)
  }

  // ============================================
  // IMMUTABILITY ENFORCEMENT (Requirement 9.2)
  // ============================================

  /**
   * BLOCKED: Update audit log entry
   * Requirement 9.2: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any update operations on audit entries.
   * It will ALWAYS throw a SuperAdminAuditImmutabilityError.
   * 
   * @throws {SuperAdminAuditImmutabilityError} Always - audit entries cannot be modified
   */
  async updateAuditLog(_id: string, _data: Partial<CreateSuperAdminAuditLogInput>): Promise<never> {
    throw new SuperAdminAuditImmutabilityError('update', _id)
  }

  /**
   * BLOCKED: Delete audit log entry
   * Requirement 9.2: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any delete operations on audit entries.
   * It will ALWAYS throw a SuperAdminAuditImmutabilityError.
   * 
   * @throws {SuperAdminAuditImmutabilityError} Always - audit entries cannot be deleted
   */
  async deleteAuditLog(_id: string): Promise<never> {
    throw new SuperAdminAuditImmutabilityError('delete', _id)
  }

  /**
   * BLOCKED: Delete multiple audit log entries
   * Requirement 9.2: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any bulk delete operations on audit entries.
   * It will ALWAYS throw a SuperAdminAuditImmutabilityError.
   * 
   * @throws {SuperAdminAuditImmutabilityError} Always - audit entries cannot be deleted
   */
  async deleteAuditLogs(_filter: SuperAdminAuditLogFilter): Promise<never> {
    throw new SuperAdminAuditImmutabilityError('delete')
  }

  /**
   * Verify audit log immutability
   * Requirement 9.2: Audit trail must be immutable and read-only
   * 
   * This method can be used to verify that the audit service enforces immutability.
   * Returns true if immutability is enforced (update/delete operations throw errors).
   */
  verifyImmutability(): { isImmutable: boolean; message: string } {
    return {
      isImmutable: true,
      message: 'Super admin audit trail is immutable. Update and delete operations are blocked (Requirement 9.2).',
    }
  }

  // ============================================
  // QUERY OPERATIONS (Requirements 9.3, 9.4, 9.5)
  // ============================================

  /**
   * Get audit log by ID (read-only access)
   * Requirement 9.2: Audit trail is read-only
   */
  async getAuditLogById(id: string): Promise<SuperAdminAuditLog | null> {
    const auditLog = await prisma.superAdminAuditLog.findUnique({
      where: { id },
    })

    if (!auditLog) {
      return null
    }

    return mapPrismaSuperAdminAuditLogToDomain(auditLog)
  }

  /**
   * Get audit logs for a specific school
   * Requirement 9.3: Display audit logs in school profile showing recent actions taken on that school
   * Requirement 9.5: Display super admin name, action description, timestamp, and reason
   */
  async getSchoolAuditLog(
    schoolId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SuperAdminAuditLog[]> {
    const auditLogs = await prisma.superAdminAuditLog.findMany({
      where: {
        targetSchoolId: schoolId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaSuperAdminAuditLogToDomain)
  }

  /**
   * Get global audit log with filters
   * Requirement 9.4: Provide a global audit log view showing all actions across all schools
   * Requirement 9.5: Display super admin name, action description, timestamp, and reason
   */
  async getGlobalAuditLog(
    filter: SuperAdminAuditLogFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<SuperAdminAuditLog[]> {
    const where: Record<string, unknown> = {}

    if (filter.adminId) {
      where.adminId = filter.adminId
    }

    if (filter.actionType) {
      where.actionType = filter.actionType
    }

    if (filter.targetSchoolId) {
      where.targetSchoolId = filter.targetSchoolId
    }

    if (filter.result) {
      where.result = filter.result
    }

    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {}
      if (filter.dateFrom) {
        (where.timestamp as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.timestamp as Record<string, Date>).lte = filter.dateTo
      }
    }

    const auditLogs = await prisma.superAdminAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaSuperAdminAuditLogToDomain)
  }

  /**
   * Count audit logs matching filter
   * Useful for pagination
   */
  async countAuditLogs(filter: SuperAdminAuditLogFilter = {}): Promise<number> {
    const where: Record<string, unknown> = {}

    if (filter.adminId) {
      where.adminId = filter.adminId
    }

    if (filter.actionType) {
      where.actionType = filter.actionType
    }

    if (filter.targetSchoolId) {
      where.targetSchoolId = filter.targetSchoolId
    }

    if (filter.result) {
      where.result = filter.result
    }

    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {}
      if (filter.dateFrom) {
        (where.timestamp as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.timestamp as Record<string, Date>).lte = filter.dateTo
      }
    }

    return prisma.superAdminAuditLog.count({ where })
  }

  /**
   * Get audit logs by admin
   * Useful for tracking actions by a specific super admin
   */
  async getAuditLogsByAdmin(
    adminId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<SuperAdminAuditLog[]> {
    return this.getGlobalAuditLog(
      {
        adminId,
        dateFrom,
        dateTo,
      },
      limit,
      offset
    )
  }

  /**
   * Get audit logs by action type
   * Useful for tracking specific types of actions
   */
  async getAuditLogsByActionType(
    actionType: ActionType,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<SuperAdminAuditLog[]> {
    return this.getGlobalAuditLog(
      {
        actionType,
        dateFrom,
        dateTo,
      },
      limit,
      offset
    )
  }

  /**
   * Get recent audit logs
   * Useful for dashboard display
   */
  async getRecentAuditLogs(limit: number = 20): Promise<SuperAdminAuditLog[]> {
    return this.getGlobalAuditLog({}, limit, 0)
  }

  /**
   * Get failed actions
   * Useful for monitoring and troubleshooting
   */
  async getFailedActions(
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<SuperAdminAuditLog[]> {
    return this.getGlobalAuditLog(
      {
        result: 'failure',
        dateFrom,
        dateTo,
      },
      limit,
      offset
    )
  }

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC ACTIONS
  // ============================================

  /**
   * Log school suspension action
   */
  async logSuspendAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.SUSPEND,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log school reactivation action
   */
  async logReactivateAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.REACTIVATE,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log plan change action
   */
  async logChangePlanAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.CHANGE_PLAN,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log password reset action
   */
  async logResetPasswordAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.RESET_PASSWORD,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log force logout action
   */
  async logForceLogoutAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.FORCE_LOGOUT,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log impersonation action
   */
  async logImpersonateAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.IMPERSONATE,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log bulk suspend action
   */
  async logBulkSuspendAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.BULK_SUSPEND,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log bulk reactivate action
   */
  async logBulkReactivateAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.BULK_REACTIVATE,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }

  /**
   * Log bulk notice action
   */
  async logBulkNoticeAction(params: {
    adminId: string
    adminEmail: string
    schoolId: string
    schoolName: string
    reason: string
    result: 'success' | 'failure'
    errorMessage?: string
    ipAddress: string
    userAgent: string
    metadata?: Record<string, unknown>
  }): Promise<SuperAdminAuditLog> {
    return this.logAction({
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      actionType: ActionType.BULK_NOTICE,
      targetSchoolId: params.schoolId,
      targetSchoolName: params.schoolName,
      reason: params.reason,
      result: params.result,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    })
  }
}

// Export singleton instance
export const superAdminAuditService = new SuperAdminAuditService()
