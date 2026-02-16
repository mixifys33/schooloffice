/**
 * Deletion Prevention Service
 * Prevents unauthorized deletion of financial records and maintains data integrity
 * 
 * Requirements: Deletion Prevention - Protecting financial records from unauthorized deletion
 *    
 * Property 1: Financial Record Permanence
 * For any financial record (payment, receipt, etc.), direct deletion SHALL be prevented
 * and records SHALL be maintained permanently for audit purposes.
 * 
 * Property 2: Soft Delete with Audit Trail
 * For any administrative action that requires removal of a record from view, 
 * the system SHALL use soft deletion and maintain complete audit trail.
 */
import { prisma } from '@/lib/db'
import { FinanceAuditService } from './finance-audit.service'
import type { PaymentMethod, StudentAccount } from '@/types/finance'

// Error codes for deletion prevention operations
export const DELETION_PREVENTION_ERRORS = {
  RECORD_DELETION_PROHIBITED: 'RECORD_DELETION_PROHIBITED',
  PAYMENT_RECORD_PERMANENT: 'PAYMENT_RECORD_PERMANENT',
  RECEIPT_RECORD_PERMANENT: 'RECEIPT_RECORD_PERMANENT',
  UNAUTHORIZED_DELETION_ATTEMPT: 'UNAUTHORIZED_DELETION_ATTEMPT',
  SOFT_DELETE_ONLY_ALLOWED: 'SOFT_DELETE_ONLY_ALLOWED',
  SYSTEM_RECORD_CANNOT_DELETE: 'SYSTEM_RECORD_CANNOT_DELETE',
  REQUIRED_FOR_AUDIT_CANNOT_DELETE: 'REQUIRED_FOR_AUDIT_CANNOT_DELETE',
} as const

export class DeletionPreventionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DeletionPreventionError'
  }
}

/**
 * Deletion attempt record
 */
export interface DeletionAttempt {
  id: string
  recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT'
  recordId: string
  attemptedBy: string
  attemptedAt: Date
  justification?: string
  ipAddress?: string
  userAgent?: string
  status: 'BLOCKED' | 'ALLOWED_SOFT_DELETE' | 'ESCALATED' | 'APPROVAL_PENDING'
  reason: string
  auditTrailId?: string
}

/**
 * Deletion prevention service
 */
export class DeletionPreventionService {
  /**
   * Check if a record can be deleted
   * 
   * Property 1: Financial Record Permanence
   * For any financial record (payment, receipt, etc.), direct deletion SHALL be prevented
   * and records SHALL be maintained permanently for audit purposes.
   */
  static async canDeleteRecord(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string,
    userId: string,
    justification?: string
  ): Promise<{
    canDelete: boolean
    canSoftDelete: boolean
    reason: string
    requiredAction: 'BLOCK' | 'SOFT_DELETE' | 'REVERSAL_NEEDED' | 'ESCALATE'
  }> {
    // Financial records should never be hard deleted
    switch (recordType) {
      case 'PAYMENT':
        // Payments should only be "deleted" by reversal, not actual deletion
        return {
          canDelete: false,
          canSoftDelete: false, // Even soft deletes should be avoided for payments
          reason: 'Payments represent financial transactions and must be preserved permanently. Use payment reversal instead.',
          requiredAction: 'REVERSAL_NEEDED'
        }
        
      case 'RECEIPT':
        // Receipts are immutable and represent proof of payment
        return {
          canDelete: false,
          canSoftDelete: false,
          reason: 'Receipts are immutable financial documents that must be preserved permanently for audit purposes',
          requiredAction: 'BLOCK'
        }
        
      case 'FINANCE_AUDIT':
        // Audit logs must never be deleted
        return {
          canDelete: false,
          canSoftDelete: false,
          reason: 'Finance audit logs are critical for compliance and must be preserved permanently',
          requiredAction: 'BLOCK'
        }
        
      case 'STUDENT_ACCOUNT':
        // Student accounts contain financial history
        return {
          canDelete: false,
          canSoftDelete: true, // Could potentially soft delete in rare cases
          reason: 'Student accounts contain financial history and should only be soft-deleted with proper authorization',
          requiredAction: 'ESCALATE'
        }
        
      case 'DISCOUNT':
      case 'PENALTY':
        // These affect financial records and should be preserved
        return {
          canDelete: false,
          canSoftDelete: true, // Could potentially soft delete with proper process
          reason: 'Discounts and penalties affect financial records and should be preserved. Consider marking as inactive instead.',
          requiredAction: 'ESCALATE'
        }
        
      default:
        return {
          canDelete: false,
          canSoftDelete: false,
          reason: 'Unknown record type',
          requiredAction: 'BLOCK'
        }
    }
  }

  /**
   * Attempt to delete a protected record and log the attempt
   * 
   * Property 2: Soft Delete with Audit Trail
   * For any administrative action that requires removal of a record from view, 
   * the system SHALL use soft deletion and maintain complete audit trail.
   */
  static async attemptDeleteRecord(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string,
    userId: string,
    justification?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean
    actionTaken: 'BLOCKED' | 'SOFT_DELETED' | 'REVERSAL_CREATED' | 'ESCALATED'
    reason: string
    deletionAttempt: DeletionAttempt
  }> {
    // Check if deletion is allowed
    const permissionCheck = await this.canDeleteRecord(recordType, recordId, userId, justification)
    
    // Create deletion attempt record
    const deletionAttempt: DeletionAttempt = {
      id: `del_${Date.now()}_${userId.substring(0, 8)}`,
      recordType,
      recordId,
      attemptedBy: userId,
      attemptedAt: new Date(),
      justification,
      ipAddress,
      userAgent,
      status: permissionCheck.requiredAction === 'BLOCK' ? 'BLOCKED' : 
              permissionCheck.requiredAction === 'SOFT_DELETE' ? 'ALLOWED_SOFT_DELETE' :
              permissionCheck.requiredAction === 'ESCALATE' ? 'ESCALATED' : 'BLOCKED',
      reason: permissionCheck.reason
    }
    
    // Log the deletion attempt in audit trail
    const auditEntry = await FinanceAuditService.logAction({
      action: permissionCheck.requiredAction === 'BLOCK' ? 'DELETION_ATTEMPT_BLOCKED' : 
               permissionCheck.requiredAction === 'SOFT_DELETE' ? 'RECORD_SOFT_DELETED' :
               permissionCheck.requiredAction === 'REVERSAL_NEEDED' ? 'REVERSAL_INITIATED' : 'DELETION_ESCALATED',
      entityType: recordType,
      entityId: recordId,
      details: {
        attemptedBy: userId,
        justification,
        reason: permissionCheck.reason,
        requiredAction: permissionCheck.requiredAction,
        canSoftDelete: permissionCheck.canSoftDelete
      },
      userId,
      ipAddress,
      userAgent
    })
    
    deletionAttempt.auditTrailId = auditEntry.id
    
    if (permissionCheck.requiredAction === 'BLOCK') {
      // Block the deletion attempt
      throw new DeletionPreventionError(
        DELETION_PREVENTION_ERRORS.RECORD_DELETION_PROHIBITED,
        `Deletion of ${recordType.toLowerCase()} record is prohibited: ${permissionCheck.reason}`,
        {
          recordType,
          recordId,
          userId,
          reason: permissionCheck.reason
        }
      )
    }
    
    // For different required actions, perform appropriate response
    switch (permissionCheck.requiredAction) {
      case 'REVERSAL_NEEDED':
        return {
          success: false, // Not truly successful, but the attempt was processed
          actionTaken: 'REVERSAL_CREATED',
          reason: 'Payment reversal needed instead of deletion',
          deletionAttempt
        }
        
      case 'ESCALATE':
        return {
          success: false,
          actionTaken: 'ESCALATED',
          reason: 'Deletion request escalated for administrative review',
          deletionAttempt
        }
        
      case 'SOFT_DELETE':
        // For soft deletable records, mark as deleted (in a real system)
        // This would typically update a "deletedAt" field
        return {
          success: true,
          actionTaken: 'SOFT_DELETED',
          reason: 'Record soft-deleted successfully',
          deletionAttempt
        }
        
      default:
        return {
          success: false,
          actionTaken: 'BLOCKED',
          reason: permissionCheck.reason,
          deletionAttempt
        }
    }
  }

  /**
   * Perform a soft delete on a record that allows it
   */
  static async softDeleteRecord(
    recordType: 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    userId: string,
    justification: string
  ): Promise<{
    success: boolean
    softDeleted: boolean
    auditTrailId: string
  }> {
    // Log the soft delete action
    const auditEntry = await FinanceAuditService.logAction({
      action: 'RECORD_SOFT_DELETED',
      entityType: recordType,
      entityId: recordId,
      details: {
        deletedBy: userId,
        justification,
        softDelete: true
      },
      userId
    })
    
    // Perform the soft delete based on record type
    // In a real system, this would update a deletedAt field
    switch (recordType) {
      case 'STUDENT_ACCOUNT':
        await prisma.studentAccount.update({
          where: { id: recordId },
          data: { 
            deletedAt: new Date(),
            deletedBy: userId,
            deletedReason: justification
          }
        })
        break
      case 'DISCOUNT':
        await prisma.studentDiscount.update({
          where: { id: recordId },
          data: { 
            deletedAt: new Date(),
            deletedBy: userId,
            deletedReason: justification
          }
        })
        break
      case 'PENALTY':
        await prisma.studentPenalty.update({
          where: { id: recordId },
          data: { 
            deletedAt: new Date(),
            deletedBy: userId,
            deletedReason: justification
          }
        })
        break
    }
    
    return {
      success: true,
      softDeleted: true,
      auditTrailId: auditEntry.id
    }
  }

  /**
   * Validate deletion request against business rules
   */
  static async validateDeletionRequest(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string,
    userId: string,
    justification?: string
  ): Promise<{
    isValid: boolean
    violations: Array<{ rule: string; severity: 'ERROR' | 'WARNING'; message: string }>
    recommendedAction: 'BLOCK' | 'ESCALATE' | 'SOFT_DELETE' | 'REVERSE'
  }> {
    const violations: Array<{ rule: string; severity: 'ERROR' | 'WARNING'; message: string }> = []
    
    // Check if user has appropriate permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true }
    })
    
    if (!user) {
      violations.push({
        rule: 'USER_EXISTS',
        severity: 'ERROR',
        message: 'User does not exist'
      })
    } else {
      // Check if user has admin rights for deletion
      if (!['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(user.role)) {
        violations.push({
          rule: 'ADMIN_PERMISSION',
          severity: 'ERROR',
          message: 'User does not have administrative permissions to delete records'
        })
      }
    }
    
    // Check if record exists
    const recordExists = await this.checkRecordExists(recordType, recordId)
    if (!recordExists) {
      violations.push({
        rule: 'RECORD_EXISTS',
        severity: 'ERROR',
        message: 'Record does not exist'
      })
    }
    
    // Check if record is too old to delete (for compliance)
    const recordAge = await this.getRecordAge(recordType, recordId)
    if (recordAge && recordAge > 365) { // Older than 1 year
      violations.push({
        rule: 'COMPLIANCE_RETENTION',
        severity: ConflictSeverity.WARNING,
        message: 'Record is older than 1 year and may be required for compliance auditing'
      })
    }
    
    // Check if record is referenced by other records
    const hasDependencies = await this.checkRecordDependencies(recordType, recordId)
    if (hasDependencies) {
      violations.push({
        rule: 'REFERENTIAL_INTEGRITY',
        severity: 'ERROR',
        message: 'Record is referenced by other records and cannot be safely deleted'
      })
    }
    
    // Determine recommended action based on violations
    let recommendedAction: 'BLOCK' | 'ESCALATE' | 'SOFT_DELETE' | 'REVERSE' = 'BLOCK'
    
    if (violations.some(v => v.severity === 'ERROR')) {
      recommendedAction = 'BLOCK'
    } else if (recordType === 'PAYMENT' || recordType === 'RECEIPT') {
      recommendedAction = 'REVERSE' // For financial transactions, recommend reversal
    } else if (recordType === 'FINANCE_AUDIT') {
      recommendedAction = 'BLOCK' // Never delete audit logs
    } else {
      recommendedAction = 'ESCALATE' // For other types, escalate for review
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      recommendedAction
    }
  }

  /**
   * Check if a record exists
   */
  private static async checkRecordExists(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string
  ): Promise<boolean> {
    try {
      switch (recordType) {
        case 'PAYMENT':
          const payment = await prisma.payment.findUnique({ where: { id: recordId } })
          return !!payment
        case 'RECEIPT':
          const receipt = await prisma.receipt.findUnique({ where: { id: recordId } })
          return !!receipt
        case 'STUDENT_ACCOUNT':
          const account = await prisma.studentAccount.findUnique({ where: { id: recordId } })
          return !!account
        case 'DISCOUNT':
          const discount = await prisma.studentDiscount.findUnique({ where: { id: recordId } })
          return !!discount
        case 'PENALTY':
          const penalty = await prisma.studentPenalty.findUnique({ where: { id: recordId } })
          return !!penalty
        case 'FINANCE_AUDIT':
          const audit = await prisma.financeAuditLog.findUnique({ where: { id: recordId } })
          return !!audit
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Get the age of a record in days
   */
  private static async getRecordAge(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string
  ): Promise<number | null> {
    try {
      let createdAt: Date | null = null
      
      switch (recordType) {
        case 'PAYMENT':
          const payment = await prisma.payment.findUnique({ 
            where: { id: recordId },
            select: { createdAt: true }
          })
          createdAt = payment?.createdAt || null
          break
        case 'RECEIPT':
          const receipt = await prisma.receipt.findUnique({ 
            where: { id: recordId },
            select: { createdAt: true }
          })
          createdAt = receipt?.createdAt || null
          break
        case 'STUDENT_ACCOUNT':
          const account = await prisma.studentAccount.findUnique({ 
            where: { id: recordId },
            select: { createdAt: true }
          })
          createdAt = account?.createdAt || null
          break
        case 'DISCOUNT':
          const discount = await prisma.studentDiscount.findUnique({ 
            where: { id: recordId },
            select: { createdAt: true }
          })
          createdAt = discount?.createdAt || null
          break
        case 'PENALTY':
          const penalty = await prisma.studentPenalty.findUnique({ 
            where: { id: recordId },
            select: { createdAt: true }
          })
          createdAt = penalty?.createdAt || null
          break
        case 'FINANCE_AUDIT':
          const audit = await prisma.financeAuditLog.findUnique({ 
            where: { id: recordId },
            select: { timestamp: true }
          })
          createdAt = audit?.timestamp || null
          break
      }
      
      if (!createdAt) return null
      
      const diffTime = Math.abs(new Date().getTime() - createdAt.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      return null
    }
  }

  /**
   * Check if a record has dependencies that would be affected by deletion
   */
  private static async checkRecordDependencies(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string
  ): Promise<boolean> {
    try {
      switch (recordType) {
        case 'PAYMENT':
          // Check if payment is linked to receipt
          const paymentWithReceipt = await prisma.payment.findUnique({ 
            where: { id: recordId },
            include: { receipt: true }
          })
          return !!paymentWithReceipt?.receipt
          
        case 'RECEIPT':
          // Receipts shouldn't have dependencies that would be broken
          return false
          
        case 'STUDENT_ACCOUNT':
          // Check if account is linked to other records
          const accountLinks = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count 
            FROM Payment 
            WHERE "studentAccountId" = ${recordId}
          `
          return Number(accountLinks[0].count) > 0
          
        case 'DISCOUNT':
          // Check if discount is linked to other records
          return false // Usually discounts stand alone
          
        case 'PENALTY':
          // Check if penalty is linked to other records
          return false // Usually penalties stand alone
          
        case 'FINANCE_AUDIT':
          // Audit logs shouldn't be deleted
          return true
          
        default:
          return false
      }
    } catch (error) {
      return true // If we can't check, assume there are dependencies
    }
  }

  /**
   * Get deletion prevention summary for a record
   */
  static async getDeletionPreventionSummary(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY' | 'FINANCE_AUDIT',
    recordId: string
  ): Promise<{
    recordType: string
    recordId: string
    isDeletable: boolean
    isSoftDeletable: boolean
    reasonForProtection: string
    lastDeletionAttempt?: {
      user: string
      timestamp: Date
      status: string
    }
    totalDeletionAttempts: number
  }> {
    const permissionCheck = await this.canDeleteRecord(recordType, recordId, 'system', 'summary_request')
    
    // Get recent deletion attempts for this record
    const recentAuditEntries = await prisma.financeAuditLog.findMany({
      where: {
        entityType: recordType,
        entityId: recordId,
        action: { in: ['DELETION_ATTEMPT_BLOCKED', 'RECORD_SOFT_DELETED', 'DELETION_ESCALATED'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 1
    })
    
    const lastDeletionAttempt = recentAuditEntries.length > 0 ? {
      user: recentAuditEntries[0].userName,
      timestamp: recentAuditEntries[0].timestamp,
      status: recentAuditEntries[0].action
    } : undefined
    
    // Count total deletion attempts
    const totalDeletionAttempts = await prisma.financeAuditLog.count({
      where: {
        entityType: recordType,
        entityId: recordId,
        action: { in: ['DELETION_ATTEMPT_BLOCKED', 'RECORD_SOFT_DELETED', 'DELETION_ESCALATED', 'REVERSAL_INITIATED'] }
      }
    })
    
    return {
      recordType,
      recordId,
      isDeletable: permissionCheck.canDelete,
      isSoftDeletable: permissionCheck.canSoftDelete,
      reasonForProtection: permissionCheck.reason,
      lastDeletionAttempt,
      totalDeletionAttempts
    }
  }

  /**
   * Generate compliance report on deletion attempts
   */
  static async generateComplianceReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    reportDate: Date
    dateRange: { start: Date; end: Date }
    totalDeletionAttempts: number
    blockedDeletionAttempts: number
    softDeletions: number
    escalationRequests: number
    byRecordType: Record<string, number>
    byUser: Array<{ userId: string; userName: string; attempts: number }>
    summary: string
  }> {
    // Get all finance audit logs for deletion-related actions
    const auditLogs = await prisma.financeAuditLog.findMany({
      where: {
        schoolId,
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        action: { in: ['DELETION_ATTEMPT_BLOCKED', 'RECORD_SOFT_DELETED', 'DELETION_ESCALATED', 'REVERSAL_INITIATED'] }
      },
      include: {
        user: {
          include: { staff: true }
        }
      }
    })
    
    // Calculate statistics
    const totalDeletionAttempts = auditLogs.length
    const blockedDeletionAttempts = auditLogs.filter(log => log.action === 'DELETION_ATTEMPT_BLOCKED').length
    const softDeletions = auditLogs.filter(log => log.action === 'RECORD_SOFT_DELETED').length
    const escalationRequests = auditLogs.filter(log => log.action === 'DELETION_ESCALATED').length
    
    // Group by record type
    const byRecordType = auditLogs.reduce((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Group by user
    const userMap = new Map()
    auditLogs.forEach(log => {
      const userName = log.user?.staff 
        ? `${log.user.staff.firstName} ${log.user.staff.lastName}`
        : log.user?.email || 'Unknown'
      
      if (userMap.has(log.userId)) {
        userMap.set(log.userId, {
          ...userMap.get(log.userId),
          attempts: userMap.get(log.userId).attempts + 1
        })
      } else {
        userMap.set(log.userId, {
          userId: log.userId,
          userName,
          attempts: 1
        })
      }
    })
    
    const byUser = Array.from(userMap.values()) as Array<{ userId: string; userName: string; attempts: number }>
    
    const summary = `Compliance Report for deletion attempts from ${startDate.toDateString()} to ${endDate.toDateString()}:
    - Total deletion attempts: ${totalDeletionAttempts}
    - Blocked attempts: ${blockedDeletionAttempts}
    - Soft deletions: ${softDeletions}
    - Escalations: ${escalationRequests}
    - Protected financial records preserved: ${totalDeletionAttempts - softDeletions}`
    
    return {
      reportDate: new Date(),
      dateRange: { start: startDate, end: endDate },
      totalDeletionAttempts,
      blockedDeletionAttempts,
      softDeletions,
      escalationRequests,
      byRecordType,
      byUser,
      summary
    }
  }
}

export default DeletionPreventionService