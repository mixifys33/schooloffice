/**
 * Edit Protection Service
 * Prevents unauthorized edits to financial records and maintains immutability
 * 
 * Requirements: Edit Protection - Maintaining financial record immutability
 * 
 * Property 1: Financial Record Immutability
 * For any financial record (payment, receipt, etc.), direct modification SHALL be prevented
 * and corrections SHALL only be possible through proper reversal/adjustment mechanisms.
 *      
 * Property 2: Audit Trail for Modifications
 * For any attempted modification to financial records, the system SHALL create an 
 * audit trail documenting the attempt.
 */
import { prisma } from '@/lib/db'
import { FinanceAuditService } from './finance-audit.service'
import type { PaymentMethod, StudentAccount } from '@/types/finance'

// Error codes for edit protection operations
export const EDIT_PROTECTION_ERRORS = {
  RECORD_IMMUTABLE: 'RECORD_IMMUTABLE',
  ILLEGAL_FIELD_MODIFICATION: 'ILLEGAL_FIELD_MODIFICATION',
  PAYMENT_STATUS_LOCKED: 'PAYMENT_STATUS_LOCKED',
  RECEIPT_IMMUTABLE: 'RECEIPT_IMMUTABLE',
  UNAUTHORIZED_EDIT_ATTEMPT: 'UNAUTHORIZED_EDIT_ATTEMPT',
  REVERSAL_REQUIRED_FOR_CORRECTION: 'REVERSAL_REQUIRED_FOR_CORRECTION',
  SYSTEM_USER_ACCESS_DENIED: 'SYSTEM_USER_ACCESS_DENIED',
} as const

export class EditProtectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'EditProtectionError'
  }
}

/**
 * Protected field types
 */
export type ProtectedField = 
  | 'amount'
  | 'method' 
  | 'reference'
  | 'receivedAt'
  | 'receiptNumber'
  | 'balanceBefore'
  | 'balanceAfter'
  | 'studentId'
  | 'guardianId'
  | 'termId'

/**
 * Edit attempt record
 */
export interface EditAttempt {
  id: string
  recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY'
  recordId: string
  attemptedField: ProtectedField
  oldValue: any
  newValue: any
  attemptedBy: string
  attemptedAt: Date
  ipAddress?: string
  userAgent?: string
  status: 'BLOCKED' | 'ALLOWED' | 'REQUIRES_APPROVAL'
  reason: string
  auditTrailId?: string
}

/**
 * Edit protection service
 */
export class EditProtectionService {
  /**
   * Check if a field can be edited
   * 
   * Property 1: Financial Record Immutability
   * For any financial record (payment, receipt, etc.), direct modification SHALL be prevented
   * and corrections SHALL only be possible through proper reversal/adjustment mechanisms.
   */
  static async canEditField(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    field: ProtectedField,
    newValue: any,
    userId: string
  ): Promise<{
    canEdit: boolean
    reason: string
    requiresReversal: boolean
    allowedAlternative: string | null
  }> {
    // Define protected fields by record type
    const protectedFields: Record<string, ProtectedField[]> = {
      PAYMENT: ['amount', 'method', 'reference', 'receivedAt', 'studentId', 'guardianId', 'termId'],
      RECEIPT: ['receiptNumber', 'amount', 'method', 'reference', 'balanceBefore', 'balanceAfter', 'studentName', 'className', 'termName', 'issuedAt'],
      STUDENT_ACCOUNT: ['totalFees', 'totalPaid', 'totalDiscounts', 'totalPenalties', 'balance'],
      DISCOUNT: ['calculatedAmount', 'value', 'appliedAt', 'studentId', 'termId'],
      PENALTY: ['amount', 'appliedAt', 'studentId', 'termId']
    }
    
    // Check if field is protected
    if (protectedFields[recordType]?.includes(field)) {
      // For protected fields, editing is generally not allowed
      // The only allowed "edit" is changing status to reversed for payments
      if (recordType === 'PAYMENT' && field === 'status' && newValue === 'REVERSED') {
        return {
          canEdit: true,
          reason: 'Payment reversal is allowed through proper mechanism',
          requiresReversal: false,
          allowedAlternative: 'reversePayment'
        }
      }
      
      // For receipt status changes
      if (recordType === 'RECEIPT' && field === 'status') {
        return {
          canEdit: false,
          reason: 'Receipts are immutable and cannot be modified',
          requiresReversal: true,
          allowedAlternative: 'createAdjustmentPayment'
        }
      }
      
      // For student account balance changes, only allow through proper calculation
      if (recordType === 'STUDENT_ACCOUNT' && field === 'balance') {
        return {
          canEdit: false,
          reason: 'Balance should be calculated from transactions, not directly edited',
          requiresReversal: false,
          allowedAlternative: 'adjustThroughTransaction'
        }
      }
      
      return {
        canEdit: false,
        reason: `Field '${field}' is protected and cannot be directly modified in ${recordType.toLowerCase()} records`,
        requiresReversal: true,
        allowedAlternative: 'reverseAndRecreate'
      }
    }
    
    // If field is not protected, check if user has permission
    // This is a simplified check - in a real system you'd have more granular permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true }
    })
    
    if (!user) {
      return {
        canEdit: false,
        reason: 'User not found',
        requiresReversal: false,
        allowedAlternative: null
      }
    }
    
    // Allow certain edits based on user role
    if (user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      return {
        canEdit: true,
        reason: 'Administrative user with elevated privileges',
        requiresReversal: false,
        allowedAlternative: null
      }
    }
    
    // Default: allow edit if not protected
    return {
      canEdit: true,
      reason: 'Field is not protected',
      requiresReversal: false,
      allowedAlternative: null
    }
  }

  /**
   * Attempt to edit a protected field and log the attempt
   * 
   * Property 2: Audit Trail for Modifications
   * For any attempted modification to financial records, the system SHALL create an 
   * audit trail documenting the attempt.
   */
  static async attemptEditField(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    field: ProtectedField,
    newValue: any,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean
    reason: string
    editAttempt: EditAttempt
    requiresReversal: boolean
  }> {
    // Check if edit is allowed
    const permissionCheck = await this.canEditField(recordType, recordId, field, newValue, userId)
    
    // Create edit attempt record
    const editAttempt: EditAttempt = {
      id: `edit_${Date.now()}_${userId.substring(0, 8)}`,
      recordType,
      recordId,
      attemptedField: field,
      oldValue: await this.getFieldValue(recordType, recordId, field),
      newValue,
      attemptedBy: userId,
      attemptedAt: new Date(),
      ipAddress,
      userAgent,
      status: permissionCheck.canEdit ? 'ALLOWED' : 'BLOCKED',
      reason: permissionCheck.reason
    }
    
    // Log the edit attempt in audit trail
    const auditEntry = await FinanceAuditService.logAction({
      action: permissionCheck.canEdit ? 'FIELD_EDIT_ALLOWED' : 'FIELD_EDIT_BLOCKED',
      entityType: recordType,
      entityId: recordId,
      details: {
        field,
        oldValue: editAttempt.oldValue,
        newValue,
        attemptedBy: userId,
        reason: permissionCheck.reason,
        requiresReversal: permissionCheck.requiresReversal,
        allowedAlternative: permissionCheck.allowedAlternative
      },
      userId,
      ipAddress,
      userAgent
    })
    
    editAttempt.auditTrailId = auditEntry.id
    
    if (!permissionCheck.canEdit) {
      // Block the edit attempt
      throw new EditProtectionError(
        EDIT_PROTECTION_ERRORS.RECORD_IMMUTABLE,
        `Cannot modify protected field '${field}' in ${recordType.toLowerCase()} record`,
        {
          recordType,
          recordId,
          field,
          newValue,
          reason: permissionCheck.reason,
          requiresReversal: permissionCheck.requiresReversal
        }
      )
    }
    
    return {
      success: true,
      reason: 'Edit allowed',
      editAttempt,
      requiresReversal: permissionCheck.requiresReversal
    }
  }

  /**
   * Get the current value of a field
   */
  private static async getFieldValue(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    field: ProtectedField
  ): Promise<any> {
    try {
      switch (recordType) {
        case 'PAYMENT':
          const payment = await prisma.payment.findUnique({
            where: { id: recordId }
          })
          return payment?.[field as keyof typeof payment]
          
        case 'RECEIPT':
          const receipt = await prisma.receipt.findUnique({
            where: { id: recordId }
          })
          return receipt?.[field as keyof typeof receipt]
          
        case 'STUDENT_ACCOUNT':
          const account = await prisma.studentAccount.findUnique({
            where: { id: recordId }
          })
          return account?.[field as keyof typeof account]
          
        case 'DISCOUNT':
          const discount = await prisma.studentDiscount.findUnique({
            where: { id: recordId }
          })
          return discount?.[field as keyof typeof discount]
          
        case 'PENALTY':
          const penalty = await prisma.studentPenalty.findUnique({
            where: { id: recordId }
          })
          return penalty?.[field as keyof typeof penalty]
          
        default:
          return null
      }
    } catch (error) {
      console.error(`Error getting field value: ${error.message}`)
      return null
    }
  }

  /**
   * Validate payment record before any update operation
   */
  static async validatePaymentUpdate(
    paymentId: string,
    updates: Partial<{
      amount: number
      method: PaymentMethod
      reference: string
      receivedAt: Date
      status: string
      studentId: string
      guardianId: string
      termId: string
    }>,
    userId: string
  ): Promise<{
    isValid: boolean
    blockedUpdates: Array<{ field: string; reason: string }>
    allowedUpdates: Array<{ field: string; value: any }>
    requiresReversal: boolean
  }> {
    const blockedUpdates: Array<{ field: string; reason: string }> = []
    const allowedUpdates: Array<{ field: string; value: any }> = []
    
    // Check each field in the updates
    for (const [field, value] of Object.entries(updates)) {
      try {
        const canEditResult = await this.canEditField('PAYMENT', paymentId, field as ProtectedField, value, userId)
        
        if (canEditResult.canEdit) {
          allowedUpdates.push({ field, value })
        } else {
          blockedUpdates.push({ field, reason: canEditResult.reason })
        }
      } catch (error) {
        blockedUpdates.push({ field, reason: error.message })
      }
    }
    
    // Determine if reversal is required
    const requiresReversal = blockedUpdates.some(update => 
      ['amount', 'method', 'reference', 'studentId'].includes(update.field)
    )
    
    return {
      isValid: blockedUpdates.length === 0,
      blockedUpdates,
      allowedUpdates,
      requiresReversal
    }
  }

  /**
   * Validate receipt record before any update operation
   */
  static async validateReceiptUpdate(
    receiptId: string,
    updates: Partial<{
      receiptNumber: string
      amount: number
      method: PaymentMethod
      reference: string
      balanceBefore: number
      balanceAfter: number
      issuedAt: Date
    }>,
    userId: string
  ): Promise<{
    isValid: boolean
    blockedUpdates: Array<{ field: string; reason: string }>
    allowedUpdates: Array<{ field: string; value: any }>
    requiresReversal: boolean
  }> {
    const blockedUpdates: Array<{ field: string; reason: string }> = []
    const allowedUpdates: Array<{ field: string; value: any }> = []
    
    // Receipts should generally not be editable at all
    for (const [field, value] of Object.entries(updates)) {
      blockedUpdates.push({ 
        field, 
        reason: 'Receipts are immutable and cannot be modified. Create a reversal payment instead.' 
      })
    }
    
    return {
      isValid: false,
      blockedUpdates,
      allowedUpdates,
      requiresReversal: true
    }
  }

  /**
   * Process a protected edit request with proper authorization
   */
  static async processProtectedEditRequest(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    updates: Record<string, any>,
    userId: string,
    justification: string,
    ipAddress?: string
  ): Promise<{
    success: boolean
    processedUpdates: Array<{ field: string; oldValue: any; newValue: any; status: 'APPLIED' | 'REJECTED' }>
    auditTrailId: string
  }> {
    const processedUpdates: Array<{ field: string; oldValue: any; newValue: any; status: 'APPLIED' | 'REJECTED' }> = []
    
    // Log the edit request
    const auditEntry = await FinanceAuditService.logAction({
      action: 'PROTECTED_EDIT_REQUEST',
      entityType: recordType,
      entityId: recordId,
      details: {
        requestedUpdates: updates,
        requestedBy: userId,
        justification,
        ipAddress
      },
      userId,
      ipAddress
    })
    
    // Process each update individually
    for (const [field, newValue] of Object.entries(updates)) {
      try {
        // Check if this specific field can be edited
        const permissionCheck = await this.canEditField(recordType, recordId, field as ProtectedField, newValue, userId)
        
        if (permissionCheck.canEdit) {
          // Apply the update
          await this.applyFieldUpdate(recordType, recordId, field, newValue)
          processedUpdates.push({
            field,
            oldValue: await this.getFieldValue(recordType, recordId, field as ProtectedField),
            newValue,
            status: 'APPLIED'
          })
        } else {
          processedUpdates.push({
            field,
            oldValue: await this.getFieldValue(recordType, recordId, field as ProtectedField),
            newValue,
            status: 'REJECTED'
          })
        }
      } catch (error) {
        processedUpdates.push({
          field,
          oldValue: await this.getFieldValue(recordType, recordId, field as ProtectedField),
          newValue,
          status: 'REJECTED'
        })
      }
    }
    
    return {
      success: processedUpdates.every(u => u.status === 'APPLIED'),
      processedUpdates,
      auditTrailId: auditEntry.id
    }
  }

  /**
   * Apply a field update (internal method - use with caution)
   */
  private static async applyFieldUpdate(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string,
    field: string,
    newValue: any
  ): Promise<void> {
    // This is a simplified implementation
    // In a real system, you'd have specific update logic for each record type
    switch (recordType) {
      case 'PAYMENT':
        await prisma.payment.update({
          where: { id: recordId },
          data: { [field]: newValue }
        })
        break
      case 'STUDENT_ACCOUNT':
        await prisma.studentAccount.update({
          where: { id: recordId },
          data: { [field]: newValue }
        })
        break
      // Note: Receipts should not be updated directly in a real system
      // Other record types would have similar implementations
    }
  }

  /**
   * Get edit protection summary for a record
   */
  static async getEditProtectionSummary(
    recordType: 'PAYMENT' | 'RECEIPT' | 'STUDENT_ACCOUNT' | 'DISCOUNT' | 'PENALTY',
    recordId: string
  ): Promise<{
    recordType: string
    recordId: string
    protectedFields: ProtectedField[]
    lastEditAttempt?: {
      user: string
      timestamp: Date
      field: string
      status: string
    }
    totalEditAttempts: number
  }> {
    const protectedFields: Record<string, ProtectedField[]> = {
      PAYMENT: ['amount', 'method', 'reference', 'receivedAt', 'studentId', 'guardianId', 'termId'],
      RECEIPT: ['receiptNumber', 'amount', 'method', 'reference', 'balanceBefore', 'balanceAfter', 'studentName', 'className', 'termName', 'issuedAt'],
      STUDENT_ACCOUNT: ['totalFees', 'totalPaid', 'totalDiscounts', 'totalPenalties', 'balance'],
      DISCOUNT: ['calculatedAmount', 'value', 'appliedAt', 'studentId', 'termId'],
      PENALTY: ['amount', 'appliedAt', 'studentId', 'termId']
    }
    
    // Get recent edit attempts for this record
    const recentAuditEntries = await prisma.financeAuditLog.findMany({
      where: {
        entityType: recordType,
        entityId: recordId,
        action: { contains: 'EDIT' }
      },
      orderBy: { timestamp: 'desc' },
      take: 1
    })
    
    const lastEditAttempt = recentAuditEntries.length > 0 ? {
      user: recentAuditEntries[0].userName,
      timestamp: recentAuditEntries[0].timestamp,
      field: (recentAuditEntries[0].details as any)?.field || 'unknown',
      status: (recentAuditEntries[0].details as any)?.status || 'unknown'
    } : undefined
    
    // Count total edit attempts
    const totalEditAttempts = await prisma.financeAuditLog.count({
      where: {
        entityType: recordType,
        entityId: recordId,
        action: { contains: 'EDIT' }
      }
    })
    
    return {
      recordType,
      recordId,
      protectedFields: protectedFields[recordType] || [],
      lastEditAttempt,
      totalEditAttempts
    }
  }
}

export default EditProtectionService