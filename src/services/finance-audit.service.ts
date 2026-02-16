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
  const schoolId = input.schoolId || user.schoolId || ''

  // Create audit entry
  const auditEntry = await prisma.financeAuditLog.create({
    data: {
      action: input.action,
      resourceType: input.entityType,
      resourceId: input.entityId,
      previousValue: input.details.previousValue || null,
      newValue: input.details.newValue || null,
      reason: (input.details.reason as string) || null,
      userId: input.userId,
      schoolId,
      ipAddress: input.ipAddress || null,
      timestamp: new Date(),
    },
  })

  return {
    id: auditEntry.id,
    action: auditEntry.action as FinanceAuditAction,
    resource: auditEntry.resourceType as FinanceAuditEntry['resource'],
    resourceId: auditEntry.resourceId,
    previousValue: auditEntry.previousValue as Record<string, unknown> | undefined,
    newValue: auditEntry.newValue as Record<string, unknown> | undefined,
    reason: auditEntry.reason || undefined,
    userId: auditEntry.userId,
    userName: user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : user.email,
    schoolId: auditEntry.schoolId,
    ipAddress: auditEntry.ipAddress || undefined,
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
      resourceType: entityType,
      resourceId: entityId,
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        include: {
          staff: true,
        },
      },
    },
  })

  return entries.map(entry => ({
    id: entry.id,
    action: entry.action as FinanceAuditAction,
    resource: entry.resourceType as FinanceAuditEntry['resource'],
    resourceId: entry.resourceId,
    previousValue: entry.previousValue as Record<string, unknown> | undefined,
    newValue: entry.newValue as Record<string, unknown> | undefined,
    reason: entry.reason || undefined,
    userId: entry.userId,
    userName: entry.user.staff ? `${entry.user.staff.firstName} ${entry.user.staff.lastName}` : entry.user.email,
    schoolId: entry.schoolId,
    ipAddress: entry.ipAddress || undefined,
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
  const where: { userId: string; schoolId?: string } = { userId }
  
  if (schoolId) {
    where.schoolId = schoolId
  }

  const entries = await prisma.financeAuditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        include: {
          staff: true,
        },
      },
    },
  })

  return entries.map(entry => ({
    id: entry.id,
    action: entry.action as FinanceAuditAction,
    resource: entry.resourceType as FinanceAuditEntry['resource'],
    resourceId: entry.resourceId,
    previousValue: entry.previousValue as Record<string, unknown> | undefined,
    newValue: entry.newValue as Record<string, unknown> | undefined,
    reason: entry.reason || undefined,
    userId: entry.userId,
    userName: entry.user.staff ? `${entry.user.staff.firstName} ${entry.user.staff.lastName}` : entry.user.email,
    schoolId: entry.schoolId,
    ipAddress: entry.ipAddress || undefined,
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
  const where: {
    schoolId: string
    action?: { in: FinanceAuditAction[] }
    resourceType?: { in: string[] }
    userId?: { in: string[] }
    timestamp?: { gte?: Date; lte?: Date }
    OR?: Array<{ resourceType?: { contains: string; mode: 'insensitive' }; resourceId?: { contains: string; mode: 'insensitive' } }>
  } = { schoolId }

  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions }
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    where.resourceType = { in: filters.entityTypes }
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
      { resourceType: { contains: filters.searchTerm, mode: 'insensitive' } },
      { resourceId: { contains: filters.searchTerm, mode: 'insensitive' } },
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
    include: {
      user: {
        include: {
          staff: true,
        },
      },
    },
  })

  return {
    entries: entries.map(entry => ({
      id: entry.id,
      action: entry.action as FinanceAuditAction,
      resource: entry.resourceType as FinanceAuditEntry['resource'],
      resourceId: entry.resourceId,
      previousValue: entry.previousValue as Record<string, unknown> | undefined,
      newValue: entry.newValue as Record<string, unknown> | undefined,
      reason: entry.reason || undefined,
      userId: entry.userId,
      userName: entry.user.staff ? `${entry.user.staff.firstName} ${entry.user.staff.lastName}` : entry.user.email,
      schoolId: entry.schoolId,
      ipAddress: entry.ipAddress || undefined,
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
  userBreakdown: Array<{ userId: string; count: number }>
  dailyActivity: Array<{ date: string; count: number }>
}> {
  const where: { schoolId: string; timestamp?: { gte?: Date; lte?: Date } } = { schoolId }

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
    by: ['userId'],
    where,
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 10,
  })

  // Get daily activity (last 30 days) - simplified without raw SQL
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentWhere = { ...where, timestamp: { gte: thirtyDaysAgo } }
  const recentEntries = await prisma.financeAuditLog.findMany({
    where: recentWhere,
    select: { timestamp: true },
  })

  // Group by date manually
  const dailyMap = new Map<string, number>()
  recentEntries.forEach(entry => {
    const date = entry.timestamp.toISOString().split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  })

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))

  return {
    totalActions,
    actionBreakdown: actionBreakdown.map(item => ({
      action: item.action,
      count: item._count.action,
    })),
    userBreakdown: userBreakdown.map(item => ({
      userId: item.userId,
      count: item._count?.userId || 0,
    })),
    dailyActivity,
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