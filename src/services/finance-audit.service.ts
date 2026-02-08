/**
 * Finance Audit Service
 * Provides immutable audit logging for all finance operations
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * Property 7: Reversal Audit Trail
 * For any payment reversal, the system SHALL create an audit entry containing the original
 * payment details, reversal reason, and user who performed the reversal.
 */
import { prisma } from '@/lib/db'
import type { FinanceAuditAction, FinanceAuditEntry } from '@/types/finance'

// Error codes for audit operations
export const AUDIT_ERRORS = {
  INVALID_ACTION: 'INVALID_ACTION',
  MISSING_DETAILS: 'MISSING_DETAILS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const

export class AuditError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AuditError'
  }
}

interface LogActionInput {
  action: FinanceAuditAction
  entityType: string
  entityId: string
  details: Record<string, unknown>
  userId: string
  schoolId?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log a finance audit action
 * Creates an immutable audit trail entry
 */
export async function logAction(input: LogActionInput): Promise<FinanceAuditEntry> {
  // Validate required fields
  if (!input.action || !input.entityType || !input.entityId || !input.userId) {
    throw new AuditError(
      AUDIT_ERRORS.MISSING_DETAILS,
      'Action, entityType, entityId, and userId are required'
    )
  }

  // Get user information for audit context
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      staff: true,
    },
  })

  if (!user) {
    throw new AuditError(
      AUDIT_ERRORS.USER_NOT_FOUND,
      'User not found'
    )
  }

  // Determine school ID if not provided
  const schoolId = input.schoolId || user.schoolId

  // Create audit entry
  const auditEntry = await prisma.financeAuditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details,
      userId: input.userId,
      userName: user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : user.email,
      userRole: user.role,
      schoolId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      timestamp: new Date(),
    },
  })

  return {
    id: auditEntry.id,
    action: auditEntry.action as FinanceAuditAction,
    entityType: auditEntry.entityType,
    entityId: auditEntry.entityId,
    details: auditEntry.details as Record<string, unknown>,
    userId: auditEntry.userId,
    userName: auditEntry.userName,
    userRole: auditEntry.userRole,
    schoolId: auditEntry.schoolId,
    ipAddress: auditEntry.ipAddress,
    userAgent: auditEntry.userAgent,
    timestamp: auditEntry.timestamp.toISOString(),
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<FinanceAuditEntry[]> {
  const entries = await prisma.financeAuditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  return entries.map(entry => ({
    id: entry.id,
    action: entry.action as FinanceAuditAction,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details as Record<string, unknown>,
    userId: entry.userId,
    userName: entry.userName,
    userRole: entry.userRole,
    schoolId: entry.schoolId,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp.toISOString(),
  }))
}

/**
 * Get audit trail for a user's actions
 */
export async function getUserAuditTrail(
  userId: string,
  schoolId?: string,
  limit: number = 100
): Promise<FinanceAuditEntry[]> {
  const where: any = { userId }
  
  if (schoolId) {
    where.schoolId = schoolId
  }

  const entries = await prisma.financeAuditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  return entries.map(entry => ({
    id: entry.id,
    action: entry.action as FinanceAuditAction,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details as Record<string, unknown>,
    userId: entry.userId,
    userName: entry.userName,
    userRole: entry.userRole,
    schoolId: entry.schoolId,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp.toISOString(),
  }))
}

/**
 * Search audit trail with filters
 */
export async function searchAuditTrail(
  schoolId: string,
  filters: {
    actions?: FinanceAuditAction[]
    entityTypes?: string[]
    userIds?: string[]
    startDate?: Date
    endDate?: Date
    searchTerm?: string
  } = {},
  page: number = 1,
  limit: number = 50
): Promise<{
  entries: FinanceAuditEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  const offset = (page - 1) * limit

  // Build where clause
  const where: any = { schoolId }

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions }
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    where.entityType = { in: filters.entityTypes }
  }

  if (filters.userIds && filters.userIds.length > 0) {
    where.userId = { in: filters.userIds }
  }

  if (filters.startDate || filters.endDate) {
    where.timestamp = {}
    if (filters.startDate) {
      where.timestamp.gte = filters.startDate
    }
    if (filters.endDate) {
      where.timestamp.lte = filters.endDate
    }
  }

  if (filters.searchTerm) {
    where.OR = [
      { userName: { contains: filters.searchTerm, mode: 'insensitive' } },
      { entityType: { contains: filters.searchTerm, mode: 'insensitive' } },
      { entityId: { contains: filters.searchTerm, mode: 'insensitive' } },
    ]
  }

  // Get total count
  const total = await prisma.financeAuditLog.count({ where })

  // Get entries
  const entries = await prisma.financeAuditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    skip: offset,
    take: limit,
  })

  return {
    entries: entries.map(entry => ({
      id: entry.id,
      action: entry.action as FinanceAuditAction,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details as Record<string, unknown>,
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      schoolId: entry.schoolId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: entry.timestamp.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get audit statistics for a school
 */
export async function getAuditStatistics(
  schoolId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalActions: number
  actionBreakdown: Array<{ action: string; count: number }>
  userBreakdown: Array<{ userId: string; userName: string; count: number }>
  dailyActivity: Array<{ date: string; count: number }>
}> {
  const where: any = { schoolId }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) {
      where.timestamp.gte = startDate
    }
    if (endDate) {
      where.timestamp.lte = endDate
    }
  }

  // Get total actions
  const totalActions = await prisma.financeAuditLog.count({ where })

  // Get action breakdown
  const actionBreakdown = await prisma.financeAuditLog.groupBy({
    by: ['action'],
    where,
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
  })

  // Get user breakdown
  const userBreakdown = await prisma.financeAuditLog.groupBy({
    by: ['userId', 'userName'],
    where,
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 10,
  })

  // Get daily activity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const dailyActivity = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as count
    FROM FinanceAuditLog
    WHERE schoolId = ${schoolId}
      AND timestamp >= ${thirtyDaysAgo}
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `

  return {
    totalActions,
    actionBreakdown: actionBreakdown.map(item => ({
      action: item.action,
      count: item._count.action,
    })),
    userBreakdown: userBreakdown.map(item => ({
      userId: item.userId,
      userName: item.userName,
      count: item._count.userId,
    })),
    dailyActivity: dailyActivity.map(item => ({
      date: item.date,
      count: Number(item.count),
    })),
  }
}

// Export the service as a class for consistency
export class FinanceAuditService {
  static logAction = logAction
  static getEntityAuditTrail = getEntityAuditTrail
  static getUserAuditTrail = getUserAuditTrail
  static searchAuditTrail = searchAuditTrail
  static getAuditStatistics = getAuditStatistics
}