/**
 * Guardian Audit Service
 * Handles audit logging for all guardian-related changes
 * Requirements: 5.5, 6.5
 */
import { prisma } from '@/lib/db'
import { GuardianStatus, GuardianFlag } from '@/types/enums'

// ============================================
// TYPES
// ============================================
    
/**
 * Guardian audit log entry
 */
export interface GuardianAuditLogEntry {
  id: string
  guardianId: string
  action: GuardianAuditAction
  field?: string
  previousValue?: string
  newValue?: string
  performedBy: string
  performedAt: Date
  ipAddress?: string
}

/**
 * Guardian audit action types
 */
export enum GuardianAuditAction {
  // Profile actions
  GUARDIAN_CREATED = 'GUARDIAN_CREATED',
  GUARDIAN_UPDATED = 'GUARDIAN_UPDATED',
  GUARDIAN_DELETED = 'GUARDIAN_DELETED',
  
  // Status and flag actions (Requirement 6.5)
  STATUS_CHANGED = 'STATUS_CHANGED',
  FLAG_ADDED = 'FLAG_ADDED',
  FLAG_REMOVED = 'FLAG_REMOVED',
  
  // Portal access actions (Requirement 5.5)
  PORTAL_ACCESS_CREATED = 'PORTAL_ACCESS_CREATED',
  PORTAL_ACCESS_UPDATE = 'PORTAL_ACCESS_UPDATE',
  PORTAL_ACCESS_ENABLED = 'PORTAL_ACCESS_ENABLED',
  PORTAL_ACCESS_DISABLED = 'PORTAL_ACCESS_DISABLED',
  PASSWORD_SET = 'PASSWORD_SET',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SESSION_REVOKED = 'SESSION_REVOKED',
  
  // Student linking actions
  STUDENT_LINKED = 'STUDENT_LINKED',
  STUDENT_UNLINKED = 'STUDENT_UNLINKED',
  PRIMARY_GUARDIAN_SET = 'PRIMARY_GUARDIAN_SET',
  FINANCIAL_RESPONSIBILITY_SET = 'FINANCIAL_RESPONSIBILITY_SET',
  MESSAGE_ROUTING_UPDATED = 'MESSAGE_ROUTING_UPDATED',
  
  // Document actions
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  
  // Communication actions
  OPT_OUT_CHANGED = 'OPT_OUT_CHANGED',
  PREFERRED_CHANNEL_CHANGED = 'PREFERRED_CHANNEL_CHANGED',
  
  // Consent actions
  CONSENT_GIVEN = 'CONSENT_GIVEN',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',
}

/**
 * Input for logging a guardian change
 */
export interface LogGuardianChangeInput {
  guardianId: string
  action: GuardianAuditAction
  field?: string
  previousValue?: string
  newValue?: string
  performedBy: string
  ipAddress?: string
}

/**
 * Filter options for querying audit logs
 */
export interface GuardianAuditLogFilter {
  guardianId?: string
  action?: GuardianAuditAction
  performedBy?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Pagination options for audit log queries
 */
export interface GuardianAuditLogPaginationOptions {
  page?: number
  pageSize?: number
}

/**
 * Paginated audit log result
 */
export interface PaginatedGuardianAuditLogs {
  logs: GuardianAuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma GuardianAuditLog to domain type
 */
function mapPrismaAuditLogToDomain(prismaLog: {
  id: string
  guardianId: string
  action: string
  field: string | null
  previousValue: string | null
  newValue: string | null
  performedBy: string
  performedAt: Date
  ipAddress: string | null
}): GuardianAuditLogEntry {
  return {
    id: prismaLog.id,
    guardianId: prismaLog.guardianId,
    action: prismaLog.action as GuardianAuditAction,
    field: prismaLog.field ?? undefined,
    previousValue: prismaLog.previousValue ?? undefined,
    newValue: prismaLog.newValue ?? undefined,
    performedBy: prismaLog.performedBy,
    performedAt: prismaLog.performedAt,
    ipAddress: prismaLog.ipAddress ?? undefined,
  }
}

// ============================================
// GUARDIAN AUDIT SERVICE CLASS
// ============================================

/**
 * Guardian Audit Service
 * Handles audit logging for all guardian-related changes
 * Requirements: 5.5, 6.5
 */
export class GuardianAuditService {
  /**
   * Log a guardian change
   * Requirement 5.5: Log all portal access configuration changes
   * Requirement 6.5: Create audit log entry when status or flag changes
   */
  async logChange(input: LogGuardianChangeInput): Promise<GuardianAuditLogEntry> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: input.guardianId },
      select: { id: true },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${input.guardianId} not found`)
    }

    // Create audit log entry
    const auditLog = await prisma.guardianAuditLog.create({
      data: {
        guardianId: input.guardianId,
        action: input.action,
        field: input.field,
        previousValue: input.previousValue,
        newValue: input.newValue,
        performedBy: input.performedBy,
        ipAddress: input.ipAddress,
      },
    })

    return mapPrismaAuditLogToDomain(auditLog)
  }

  /**
   * Log a status change
   * Requirement 6.5: Create audit log entry when status changes
   */
  async logStatusChange(
    guardianId: string,
    previousStatus: GuardianStatus,
    newStatus: GuardianStatus,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.STATUS_CHANGED,
      field: 'status',
      previousValue: previousStatus,
      newValue: newStatus,
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log a flag addition
   * Requirement 6.5: Create audit log entry when flag is added
   */
  async logFlagAdded(
    guardianId: string,
    flag: GuardianFlag,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.FLAG_ADDED,
      field: 'flags',
      previousValue: undefined,
      newValue: flag,
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log a flag removal
   * Requirement 6.5: Create audit log entry when flag is removed
   */
  async logFlagRemoved(
    guardianId: string,
    flag: GuardianFlag,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.FLAG_REMOVED,
      field: 'flags',
      previousValue: flag,
      newValue: undefined,
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log portal access configuration change
   * Requirement 5.5: Log all portal access configuration changes
   */
  async logPortalAccessChange(
    guardianId: string,
    field: string,
    previousValue: string,
    newValue: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.PORTAL_ACCESS_UPDATE,
      field,
      previousValue,
      newValue,
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log portal access enabled
   * Requirement 5.5: Log all portal access configuration changes
   */
  async logPortalAccessEnabled(
    guardianId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.PORTAL_ACCESS_ENABLED,
      field: 'isEnabled',
      previousValue: 'false',
      newValue: 'true',
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log portal access disabled
   * Requirement 5.5: Log all portal access configuration changes
   */
  async logPortalAccessDisabled(
    guardianId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.PORTAL_ACCESS_DISABLED,
      field: 'isEnabled',
      previousValue: 'true',
      newValue: 'false',
      performedBy,
      ipAddress,
    })
  }

  /**
   * Log session revocation
   * Requirement 5.5: Log all portal access configuration changes
   */
  async logSessionRevoked(
    guardianId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianAuditLogEntry> {
    return this.logChange({
      guardianId,
      action: GuardianAuditAction.SESSION_REVOKED,
      field: 'session',
      previousValue: 'active',
      newValue: 'revoked',
      performedBy,
      ipAddress,
    })
  }

  /**
   * Get audit logs for a guardian
   */
  async getAuditLogs(
    guardianId: string,
    options?: GuardianAuditLogPaginationOptions
  ): Promise<PaginatedGuardianAuditLogs> {
    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const [logs, total] = await Promise.all([
      prisma.guardianAuditLog.findMany({
        where: { guardianId },
        orderBy: { performedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.guardianAuditLog.count({
        where: { guardianId },
      }),
    ])

    return {
      logs: logs.map(mapPrismaAuditLogToDomain),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogsWithFilter(
    filter: GuardianAuditLogFilter,
    options?: GuardianAuditLogPaginationOptions
  ): Promise<PaginatedGuardianAuditLogs> {
    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 20
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Record<string, unknown> = {}

    if (filter.guardianId) {
      where.guardianId = filter.guardianId
    }
    if (filter.action) {
      where.action = filter.action
    }
    if (filter.performedBy) {
      where.performedBy = filter.performedBy
    }
    if (filter.startDate || filter.endDate) {
      where.performedAt = {}
      if (filter.startDate) {
        (where.performedAt as Record<string, Date>).gte = filter.startDate
      }
      if (filter.endDate) {
        (where.performedAt as Record<string, Date>).lte = filter.endDate
      }
    }

    const [logs, total] = await Promise.all([
      prisma.guardianAuditLog.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.guardianAuditLog.count({ where }),
    ])

    return {
      logs: logs.map(mapPrismaAuditLogToDomain),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  /**
   * Get recent audit logs for a guardian
   */
  async getRecentAuditLogs(
    guardianId: string,
    limit: number = 10
  ): Promise<GuardianAuditLogEntry[]> {
    const logs = await prisma.guardianAuditLog.findMany({
      where: { guardianId },
      orderBy: { performedAt: 'desc' },
      take: limit,
    })

    return logs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByAction(
    guardianId: string,
    action: GuardianAuditAction
  ): Promise<GuardianAuditLogEntry[]> {
    const logs = await prisma.guardianAuditLog.findMany({
      where: {
        guardianId,
        action,
      },
      orderBy: { performedAt: 'desc' },
    })

    return logs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get status change history for a guardian
   * Requirement 6.5: Track status changes
   */
  async getStatusChangeHistory(guardianId: string): Promise<GuardianAuditLogEntry[]> {
    return this.getAuditLogsByAction(guardianId, GuardianAuditAction.STATUS_CHANGED)
  }

  /**
   * Get flag change history for a guardian
   * Requirement 6.5: Track flag changes
   */
  async getFlagChangeHistory(guardianId: string): Promise<GuardianAuditLogEntry[]> {
    const logs = await prisma.guardianAuditLog.findMany({
      where: {
        guardianId,
        action: {
          in: [GuardianAuditAction.FLAG_ADDED, GuardianAuditAction.FLAG_REMOVED],
        },
      },
      orderBy: { performedAt: 'desc' },
    })

    return logs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get portal access change history for a guardian
   * Requirement 5.5: Track portal access changes
   */
  async getPortalAccessChangeHistory(guardianId: string): Promise<GuardianAuditLogEntry[]> {
    const logs = await prisma.guardianAuditLog.findMany({
      where: {
        guardianId,
        action: {
          in: [
            GuardianAuditAction.PORTAL_ACCESS_CREATED,
            GuardianAuditAction.PORTAL_ACCESS_UPDATE,
            GuardianAuditAction.PORTAL_ACCESS_ENABLED,
            GuardianAuditAction.PORTAL_ACCESS_DISABLED,
            GuardianAuditAction.PASSWORD_SET,
            GuardianAuditAction.PASSWORD_RESET,
            GuardianAuditAction.SESSION_REVOKED,
          ],
        },
      },
      orderBy: { performedAt: 'desc' },
    })

    return logs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Count audit logs for a guardian
   */
  async countAuditLogs(guardianId: string): Promise<number> {
    return prisma.guardianAuditLog.count({
      where: { guardianId },
    })
  }

  /**
   * Delete old audit logs (for data retention policies)
   * Note: Use with caution - audit logs are important for compliance
   */
  async deleteOldAuditLogs(olderThan: Date): Promise<number> {
    const result = await prisma.guardianAuditLog.deleteMany({
      where: {
        performedAt: {
          lt: olderThan,
        },
      },
    })

    return result.count
  }
}

// Export singleton instance
export const guardianAuditService = new GuardianAuditService()