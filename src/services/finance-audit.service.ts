/**
 * Finance Audit Service
 * Creates and queries immutable audit logs for all finance operations
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.7
 * 
 * Property 19: Finance Audit Log Immutability
 * For any finance audit log entry, modification or deletion attempts SHALL be rejected.
 */
import { prisma } from '@/lib/db'
import type {
  FinanceAuditEntry,
  AuditLogInput,
  AuditLogFilters,
  FinanceAuditAction,
  PaginatedAuditLogs,
} from '@/types/finance'

export const AUDIT_ERRORS = {
  AUDIT_LOG_IMMUTABLE: 'AUDIT_LOG_IMMUTABLE',
  AUDIT_LOG_NOT_FOUND: 'AUDIT_LOG_NOT_FOUND',
  INVALID_ACTION: 'INVALID_ACTION',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
} as const

export class FinanceAuditError extends Error {
  constructor(public code: string, message: string, public details?: Record<string, unknown>) {
    super(message)
    this.name = 'FinanceAuditError'
  }
}

const VALID_ACTIONS: FinanceAuditAction[] = [
  'PAYMENT_RECORDED', 'PAYMENT_REVERSED', 'DISCOUNT_APPLIED', 'DISCOUNT_APPROVED',
  'DISCOUNT_REJECTED', 'DISCOUNT_REMOVED', 'PENALTY_APPLIED', 'PENALTY_WAIVED',
  'FEE_STRUCTURE_CREATED', 'FEE_STRUCTURE_UPDATED', 'RECEIPT_CANCELLED',
  'SETTINGS_UPDATED', 'INVOICE_GENERATED', 'INVOICE_CANCELLED',
]

const VALID_RESOURCE_TYPES = ['Payment', 'Invoice', 'Receipt', 'Discount', 'Penalty', 'FeeStructure', 'Settings'] as const
type ResourceType = typeof VALID_RESOURCE_TYPES[number]

function isValidAction(action: string): action is FinanceAuditAction {
  return VALID_ACTIONS.includes(action as FinanceAuditAction)
}

function isValidResourceType(type: string): type is ResourceType {
  return VALID_RESOURCE_TYPES.includes(type as ResourceType)
}

interface AuditLogRecord {
  id: string; schoolId: string; userId: string; action: string; resourceType: string
  resourceId: string; previousValue: unknown; newValue: unknown
  reason: string | null; ipAddress: string | null; timestamp: Date
}

function mapToAuditEntry(record: AuditLogRecord): FinanceAuditEntry {
  return {
    id: record.id, schoolId: record.schoolId, userId: record.userId,
    action: record.action as FinanceAuditAction,
    resourceType: record.resourceType as FinanceAuditEntry['resourceType'],
    resourceId: record.resourceId,
    previousValue: record.previousValue as Record<string, unknown> | undefined,
    newValue: record.newValue as Record<string, unknown> | undefined,
    reason: record.reason ?? undefined, ipAddress: record.ipAddress ?? undefined,
    timestamp: record.timestamp.toISOString(),
  }
}

export const FinanceAuditService = {
  async logAction(data: AuditLogInput): Promise<FinanceAuditEntry> {
    if (!data.schoolId || !data.userId || !data.action || !data.resourceType || !data.resourceId) {
      throw new FinanceAuditError(AUDIT_ERRORS.MISSING_REQUIRED_FIELDS,
        'Missing required fields: schoolId, userId, action, resourceType, and resourceId are required',
        { provided: Object.keys(data) })
    }
    if (!isValidAction(data.action)) {
      throw new FinanceAuditError(AUDIT_ERRORS.INVALID_ACTION,
        `Invalid action: ${data.action}. Must be one of: ${VALID_ACTIONS.join(', ')}`,
        { action: data.action, validActions: VALID_ACTIONS })
    }
    if (!isValidResourceType(data.resourceType)) {
      throw new FinanceAuditError(AUDIT_ERRORS.INVALID_ACTION,
        `Invalid resource type: ${data.resourceType}. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
        { resourceType: data.resourceType, validTypes: VALID_RESOURCE_TYPES })
    }
    const auditLog = await prisma.financeAuditLog.create({
      data: {
        schoolId: data.schoolId, userId: data.userId, action: data.action,
        resourceType: data.resourceType, resourceId: data.resourceId,
        previousValue: data.previousValue ?? undefined, newValue: data.newValue ?? undefined,
        reason: data.reason ?? undefined, ipAddress: data.ipAddress ?? undefined,
        timestamp: new Date(),
      },
    })
    return mapToAuditEntry(auditLog)
  },

  async queryLogs(schoolId: string, filters: AuditLogFilters = {}, page = 1, pageSize = 50): Promise<PaginatedAuditLogs> {
    const validPage = Math.max(1, page)
    const validPageSize = Math.min(100, Math.max(1, pageSize))
    const skip = (validPage - 1) * validPageSize
    const where: Record<string, unknown> = { schoolId }
    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.resourceType) where.resourceType = filters.resourceType
    if (filters.resourceId) where.resourceId = filters.resourceId
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {}
      if (filters.dateFrom) (where.timestamp as Record<string, Date>).gte = filters.dateFrom
      if (filters.dateTo) (where.timestamp as Record<string, Date>).lte = filters.dateTo
    }
    const [logs, total] = await Promise.all([
      prisma.financeAuditLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip, take: validPageSize }),
      prisma.financeAuditLog.count({ where }),
    ])
    return {
      data: logs.map(mapToAuditEntry),
      pagination: { page: validPage, pageSize: validPageSize, total, totalPages: Math.ceil(total / validPageSize) },
    }
  },

  async getResourceAuditTrail(resourceType: string, resourceId: string): Promise<FinanceAuditEntry[]> {
    const logs = await prisma.financeAuditLog.findMany({
      where: { resourceType, resourceId }, orderBy: { timestamp: 'desc' },
    })
    return logs.map(mapToAuditEntry)
  },

  async updateLog(): Promise<never> {
    throw new FinanceAuditError(AUDIT_ERRORS.AUDIT_LOG_IMMUTABLE, 'Finance audit logs are immutable and cannot be updated')
  },

  async deleteLog(): Promise<never> {
    throw new FinanceAuditError(AUDIT_ERRORS.AUDIT_LOG_IMMUTABLE, 'Finance audit logs are immutable and cannot be deleted')
  },

  async getLogById(id: string): Promise<FinanceAuditEntry | null> {
    const log = await prisma.financeAuditLog.findUnique({ where: { id } })
    return log ? mapToAuditEntry(log) : null
  },

  async getUserAuditTrail(schoolId: string, userId: string, limit = 100): Promise<FinanceAuditEntry[]> {
    const logs = await prisma.financeAuditLog.findMany({
      where: { schoolId, userId }, orderBy: { timestamp: 'desc' }, take: Math.min(limit, 1000),
    })
    return logs.map(mapToAuditEntry)
  },

  async getRecentLogs(schoolId: string, limit = 20): Promise<FinanceAuditEntry[]> {
    const logs = await prisma.financeAuditLog.findMany({
      where: { schoolId }, orderBy: { timestamp: 'desc' }, take: Math.min(limit, 100),
    })
    return logs.map(mapToAuditEntry)
  },

  async countLogs(schoolId: string, filters: AuditLogFilters = {}): Promise<number> {
    const where: Record<string, unknown> = { schoolId }
    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.resourceType) where.resourceType = filters.resourceType
    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {}
      if (filters.dateFrom) (where.timestamp as Record<string, Date>).gte = filters.dateFrom
      if (filters.dateTo) (where.timestamp as Record<string, Date>).lte = filters.dateTo
    }
    return prisma.financeAuditLog.count({ where })
  },
}
