/**
 * Audit Service - SIMPLIFIED
 * Handles audit logging for CRITICAL actions only
 * 
 * FOCUS: Only log what matters for school operations:
 * - Who changed marks
 * - Who edited payments  
 * - Who closed a term
 * 
 * NOT: Every click, view, or minor action
 */  
import { prisma } from '@/lib/db'
import { AuditLog, CreateAuditLogInput } from '@/types'

/**
 * Critical audit actions only
 */
export enum AuditAction {
  // Financial actions - CRITICAL
  PAYMENT_RECORDED = 'payment_recorded',
  PAYMENT_UPDATED = 'payment_updated',
  
  // Academic data actions - CRITICAL  
  MARKS_ENTERED = 'marks_entered',
  MARKS_UPDATED = 'marks_updated',
  
  // System actions - CRITICAL
  TERM_CLOSED = 'term_closed',
  RESULTS_PUBLISHED = 'results_published',
  
  // User actions - CRITICAL
  USER_CREATED = 'user_created',
  ROLE_CHANGED = 'role_changed',
  
  // Staff actions - CRITICAL
  STAFF_REGISTERED = 'staff_registered',
  STAFF_ROLE_ASSIGNED = 'staff_role_assigned',
  STAFF_DOCUMENT_DELETED = 'staff_document_deleted',
  STAFF_DOCUMENT_UPLOADED = 'staff_document_uploaded',
  STAFF_DOCUMENT_ACCESSED = 'staff_document_accessed',
  
  // Permission actions - CRITICAL
  USE = 'use',
  
  // Generic actions - CRITICAL
  UPDATE = 'update',
  CREATE = 'create',
  DELETE = 'delete',
}

/**
 * Audit resource types for categorization
 */
export enum AuditResource {
  PAYMENT = 'payment',
  MARK = 'mark',
  RESULT = 'result',
  USER = 'user',
  STAFF = 'staff',
  STAFF_DOCUMENT = 'staff_document',
  PERMISSION = 'permission',
  TERM = 'term',
  SCHOOL = 'school',
}

/**
 * Map Prisma AuditLog to domain AuditLog type
 */
function mapPrismaAuditLogToDomain(prismaAuditLog: {
  id: string
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue: unknown
  newValue: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}): AuditLog {
  return {
    id: prismaAuditLog.id,
    schoolId: prismaAuditLog.schoolId,
    userId: prismaAuditLog.userId,
    action: prismaAuditLog.action,
    resource: prismaAuditLog.resource,
    resourceId: prismaAuditLog.resourceId,
    previousValue: prismaAuditLog.previousValue as Record<string, unknown>,
    newValue: prismaAuditLog.newValue as Record<string, unknown>,
    ipAddress: prismaAuditLog.ipAddress ?? undefined,
    userAgent: prismaAuditLog.userAgent ?? undefined,
    timestamp: prismaAuditLog.createdAt,
  }
}

export class AuditService {
  /**
   * Log a critical audit event
   */
  async log(data: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog = await prisma.auditLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        previousValue: data.previousValue,
        newValue: data.newValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })

    return mapPrismaAuditLogToDomain(auditLog)
  }

  /**
   * Get audit logs for a school (simplified)
   */
  async getAuditLogs(
    schoolId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const auditLogs = await prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }
}

// Export singleton instance
export const auditService = new AuditService()