/**
 * Dispute Resolution Service
 * Provides clear evidence presentation for financial disputes
 * 
 * Requirements: Dispute Resolution - Clear evidence presentation interface
 * 
 * Property 1: Evidence Presentation Clarity
 * For any financial dispute, the system SHALL present all evidence in a clear, 
 * chronological, and easily understandable format.
 *    
 * Property 2: Rapid Dispute Resolution
 * For any financial dispute, the system SHALL provide all necessary evidence 
 * to resolve the dispute within 60 seconds.
 */
import { prisma } from '@/lib/db'
import { 
  FinancialTruthService,
  type FinancialVerificationResult,
  type FinancialEvidence
} from './financial-truth.service'
import { 
  FinancialStatementService,
  type FinancialStatement
} from './financial-statement.service'
import { 
  PaymentService, 
  type PaymentRecord 
} from './finance.service'
import { 
  ReceiptService, 
  type Receipt 
} from './receipt.service'
import { 
  FinanceAuditService, 
  type FinanceAuditEntry 
} from './finance-audit.service'
import type { 
  PaymentMethod, 
  StudentAccount, 
  FinanceSettings 
} from '@/types/finance'

// Error codes for dispute resolution operations
export const DISPUTE_RESOLUTION_ERRORS = {
  DISPUTE_VERIFICATION_FAILED: 'DISPUTE_VERIFICATION_FAILED',
  EVIDENCE_NOT_FOUND: 'EVIDENCE_NOT_FOUND',
  DISPUTE_RECORD_NOT_FOUND: 'DISPUTE_RECORD_NOT_FOUND',
  EVIDENCE_GENERATION_FAILED: 'EVIDENCE_GENERATION_FAILED',
  DISPUTE_ALREADY_RESOLVED: 'DISPUTE_ALREADY_RESOLVED',
} as const

export class DisputeResolutionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DisputeResolutionError'
  }
}

/**
 * Dispute record
 */
export interface DisputeRecord {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  guardianId?: string
  guardianName?: string
  claimAmount: number
  claimedReceiptNumber?: string
  claimedDate?: string
  claimDescription: string
  status: 'PENDING' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  submittedAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  resolutionSummary: string
  evidence: FinancialEvidence
  verificationResult: FinancialVerificationResult
}

/**
 * Dispute resolution result
 */
export interface DisputeResolutionResult {
  disputeId: string
  status: 'RESOLVED' | 'UNRESOLVED' | 'ESCALATED'
  resolutionSummary: string
  evidence: FinancialEvidence
  timeToResolve: number
  resolvedBy: string
  resolvedByName: string
}

/**
 * Dispute creation input
 */
export interface CreateDisputeInput {
  studentId: string
  guardianId?: string
  claimAmount: number
  claimedReceiptNumber?: string
  claimedDate?: Date
  claimDescription: string
  submittedBy: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * Dispute resolution service
 */
export class DisputeResolutionService {
  /**
   * Create a new dispute record
   * 
   * Property 1: Evidence Presentation Clarity
   * For any financial dispute, the system SHALL present all evidence in a clear, 
   * chronological, and easily understandable format.
   */
  static async createDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
    try {
      // Get student information
      const student = await prisma.student.findUnique({
        where: { id: input.studentId },
        include: { class: true }
      })
      
      if (!student) {
        throw new DisputeResolutionError(
          DISPUTE_RESOLUTION_ERRORS.EVIDENCE_NOT_FOUND,
          'Student not found',
          { studentId: input.studentId }
        )
      }
      
      let guardianName: string | undefined
      if (input.guardianId) {
        const guardian = await prisma.guardian.findUnique({
          where: { id: input.guardianId }
        })
        if (guardian) {
          guardianName = `${guardian.firstName} ${guardian.lastName}`
        }
      }
      
      // Verify the claim against existing records
      const verification = await FinancialTruthService.verifyPayment({
        receiptNumber: input.claimedReceiptNumber,
        transactionReference: input.claimDescription.includes('Ref:') ? 
          input.claimDescription.split('Ref:')[1].split(' ')[0] : undefined,
        amount: input.claimAmount,
        studentId: input.studentId,
      })
      
      // Create dispute record
      const dispute: DisputeRecord = {
        id: `disp_${Date.now()}_${input.studentId.substring(0, 8)}`,
        studentId: input.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class.name,
        guardianId: input.guardianId,
        guardianName,
        claimAmount: input.claimAmount,
        claimedReceiptNumber: input.claimedReceiptNumber,
        claimedDate: input.claimedDate?.toISOString(),
        claimDescription: input.claimDescription,
        status: 'PENDING',
        priority: input.priority || 'MEDIUM',
        submittedAt: new Date().toISOString(),
        resolutionSummary: this.generateResolutionSummary(verification),
        evidence: verification.evidence,
        verificationResult: verification
      }
      
      return dispute
    } catch (error) {
      if (error instanceof DisputeResolutionError) {
        throw error
      }
      
      throw new DisputeResolutionError(
        DISPUTE_RESOLUTION_ERRORS.DISPUTE_VERIFICATION_FAILED,
        'Failed to create dispute record',
        { studentId: input.studentId, error: error.message }
      )
    }
  }

  /**
   * Resolve a dispute with evidence presentation
   * 
   * Property 2: Rapid Dispute Resolution
   * For any financial dispute, the system SHALL provide all necessary evidence 
   * to resolve the dispute within 60 seconds.
   */
  static async resolveDispute(
    disputeId: string,
    resolverId: string,
    resolutionNotes: string,
    status: 'RESOLVED' | 'REJECTED' | 'ESCALATED'
  ): Promise<DisputeResolutionResult> {
    const startTime = Date.now()
    
    try {
      // Get the dispute record
      const dispute = await this.getDispute(disputeId)
      
      if (!dispute) {
        throw new DisputeResolutionError(
          DISPUTE_RESOLUTION_ERRORS.DISPUTE_RECORD_NOT_FOUND,
          'Dispute record not found',
          { disputeId }
        )
      }
      
      if (dispute.status !== 'PENDING') {
        throw new DisputeResolutionError(
          DISPUTE_RESOLUTION_ERRORS.DISPUTE_ALREADY_RESOLVED,
          'Dispute is already resolved',
          { disputeId, currentStatus: dispute.status }
        )
      }
      
      // Get resolver information
      const resolver = await prisma.user.findUnique({
        where: { id: resolverId },
        include: { staff: true }
      })
      
      const resolverName = resolver?.staff 
        ? `${resolver.staff.firstName} ${resolver.staff.lastName}`
        : resolver?.email || 'Unknown'
      
      // Update dispute status
      const resolvedDispute: DisputeRecord = {
        ...dispute,
        status,
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolverId,
        resolutionNotes,
      }
      
      const timeToResolve = Date.now() - startTime
      
      // Create audit log entry
      await FinanceAuditService.logAction({
        action: 'DISPUTE_RESOLVED',
        entityType: 'DISPUTE',
        entityId: disputeId,
        details: {
          status,
          resolverId,
          resolverName,
          resolutionNotes,
          claimAmount: dispute.claimAmount,
          claimedReceiptNumber: dispute.claimedReceiptNumber,
          timeToResolve
        },
        userId: resolverId,
      })
      
      return {
        disputeId,
        status: status === 'RESOLVED' ? 'RESOLVED' : status === 'ESCALATED' ? 'ESCALATED' : 'UNRESOLVED',
        resolutionSummary: resolvedDispute.resolutionSummary,
        evidence: resolvedDispute.evidence,
        timeToResolve,
        resolvedBy: resolverId,
        resolvedByName: resolverName
      }
    } catch (error) {
      const timeToResolve = Date.now() - startTime
      
      if (error instanceof DisputeResolutionError) {
        throw error
      }
      
      throw new DisputeResolutionError(
        DISPUTE_RESOLUTION_ERRORS.DISPUTE_VERIFICATION_FAILED,
        'Failed to resolve dispute',
        { disputeId, error: error.message, timeToResolve }
      )
    }
  }

  /**
   * Get a dispute by ID
   */
  static async getDispute(disputeId: string): Promise<DisputeRecord | null> {
    // In a real implementation, this would fetch from the database
    // For now, we'll return null as disputes aren't persisted in this example
    return null
  }

  /**
   * List disputes with filtering options
   */
  static async listDisputes(
    schoolId: string,
    filters?: {
      status?: 'PENDING' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      studentId?: string
      guardianId?: string
      dateRange?: { from: Date; to: Date }
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    disputes: DisputeRecord[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    // This would normally query a disputes table
    // For now, return an empty list
    return {
      disputes: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0
      }
    }
  }

  /**
   * Generate resolution summary based on verification
   */
  private static generateResolutionSummary(verification: FinancialVerificationResult): string {
    if (verification.status === 'VERIFIED') {
      if (verification.evidence.paymentRecord) {
        return `Payment verified: UGX ${verification.evidence.paymentRecord.amount.toLocaleString()} was received on ${verification.evidence.paymentRecord.receivedAt}. Receipt #${verification.evidence.receipt?.receiptNumber || 'N/A'} is valid.`
      } else if (verification.evidence.receipt) {
        return `Receipt #${verification.evidence.receipt.receiptNumber} is valid but no associated payment found.`
      }
      return 'Claim could not be verified against existing records.'
    } else if (verification.status === 'DISCREPANCIES_FOUND') {
      if (verification.discrepancies.length > 0) {
        const discrepancy = verification.discrepancies[0]
        return `Discrepancy found: ${discrepancy.description}. ${discrepancy.suggestedResolution}`
      }
      return 'Claim has discrepancies that need investigation.'
    } else {
      return 'No matching records found for the claimed transaction.'
    }
  }

  /**
   * Present dispute evidence in a clear, structured format
   */
  static async presentDisputeEvidence(disputeId: string): Promise<{
    dispute: DisputeRecord
    evidenceTimeline: Array<{
      timestamp: string
      event: string
      details: string
      status: 'CONFIRMED' | 'DISPUTED' | 'VERIFIED' | 'PENDING'
    }>
    supportingDocuments: string[]
    comparisonSummary: {
      claimedAmount: number
      actualAmount?: number
      receiptMatch: boolean
      dateMatch: boolean
      methodMatch?: string
      referenceMatch?: string
    }
  }> {
    try {
      const dispute = await this.getDispute(disputeId)
      
      if (!dispute) {
        throw new DisputeResolutionError(
          DISPUTE_RESOLUTION_ERRORS.DISPUTE_RECORD_NOT_FOUND,
          'Dispute record not found',
          { disputeId }
        )
      }
      
      // Build timeline of events
      const timeline: Array<{
        timestamp: string
        event: string
        details: string
        status: 'CONFIRMED' | 'DISPUTED' | 'VERIFIED' | 'PENDING'
      }> = []
      
      // Add dispute submission
      timeline.push({
        timestamp: dispute.submittedAt,
        event: 'Dispute Submitted',
        details: `Claimed: UGX ${dispute.claimAmount.toLocaleString()} with receipt #${dispute.claimedReceiptNumber || 'N/A'}`,
        status: 'PENDING'
      })
      
      // Add verification results
      if (dispute.verificationResult.evidence.paymentRecord) {
        timeline.push({
          timestamp: dispute.verificationResult.evidence.paymentRecord.receivedAt,
          event: 'Payment Recorded',
          details: `System shows: UGX ${dispute.verificationResult.evidence.paymentRecord.amount.toLocaleString()}, Method: ${dispute.verificationResult.evidence.paymentRecord.method}, Reference: ${dispute.verificationResult.evidence.paymentRecord.reference}`,
          status: dispute.verificationResult.evidence.paymentRecord.amount === dispute.claimAmount ? 'VERIFIED' : 'DISPUTED'
        })
      }
      
      if (dispute.verificationResult.evidence.receipt) {
        timeline.push({
          timestamp: dispute.verificationResult.evidence.receipt.issuedAt,
          event: 'Receipt Generated',
          details: `Receipt #: ${dispute.verificationResult.evidence.receipt.receiptNumber}, Amount: UGX ${dispute.verificationResult.evidence.receipt.amount.toLocaleString()}`,
          status: dispute.verificationResult.evidence.receipt.amount === dispute.claimAmount ? 'VERIFIED' : 'DISPUTED'
        })
      }
      
      // Add audit trail events
      for (const audit of dispute.verificationResult.evidence.auditTrail) {
        timeline.push({
          timestamp: audit.timestamp,
          event: `Audit: ${audit.action}`,
          details: `User: ${audit.userName}, Role: ${audit.userRole}`,
          status: 'CONFIRMED'
        })
      }
      
      // Sort timeline chronologically
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Create comparison summary
      const comparisonSummary = {
        claimedAmount: dispute.claimAmount,
        actualAmount: dispute.verificationResult.evidence.paymentRecord?.amount,
        receiptMatch: dispute.claimedReceiptNumber === dispute.verificationResult.evidence.receipt?.receiptNumber,
        dateMatch: dispute.claimedDate === dispute.verificationResult.evidence.paymentRecord?.receivedAt,
        methodMatch: dispute.verificationResult.evidence.paymentRecord?.method,
        referenceMatch: dispute.verificationResult.evidence.paymentRecord?.reference
      }
      
      return {
        dispute,
        evidenceTimeline: timeline,
        supportingDocuments: [], // Would come from document storage
        comparisonSummary
      }
    } catch (error) {
      if (error instanceof DisputeResolutionError) {
        throw error
      }
      
      throw new DisputeResolutionError(
        DISPUTE_RESOLUTION_ERRORS.EVIDENCE_GENERATION_FAILED,
        'Failed to generate dispute evidence presentation',
        { disputeId, error: error.message }
      )
    }
  }

  /**
   * Escalate a dispute to higher authority
   */
  static async escalateDispute(
    disputeId: string,
    escalationNotes: string,
    escalatedBy: string
  ): Promise<DisputeRecord> {
    // In a real implementation, this would update the dispute status and assign to a higher authority
    // For now, we'll just return a mock escalated dispute
    const dispute = await this.getDispute(disputeId)
    
    if (!dispute) {
      throw new DisputeResolutionError(
        DISPUTE_RESOLUTION_ERRORS.DISPUTE_RECORD_NOT_FOUND,
        'Dispute record not found',
        { disputeId }
      )
    }
    
    // Create audit log for escalation
    await FinanceAuditService.logAction({
      action: 'DISPUTE_ESCALATED',
      entityType: 'DISPUTE',
      entityId: disputeId,
      details: {
        escalationNotes,
        escalatedBy,
        originalClaim: dispute.claimAmount,
        statusBeforeEscalation: dispute.status
      },
      userId: escalatedBy,
    })
    
    return {
      ...dispute,
      status: 'ESCALATED',
      resolutionNotes: escalationNotes
    }
  }

  /**
   * Generate dispute resolution report
   */
  static async generateDisputeReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    reportDate: Date
    dateRange: { start: Date; end: Date }
    totalDisputes: number
    resolvedDisputes: number
    pendingDisputes: number
    averageResolutionTime: number
    totalAmountInDispute: number
    disputesByStatus: Record<string, number>
    disputesByPriority: Record<string, number>
    summary: string
  }> {
    // This would normally query a disputes table
    // For now, return a mock report
    return {
      reportDate: new Date(),
      dateRange: { start: startDate, end: endDate },
      totalDisputes: 0,
      resolvedDisputes: 0,
      pendingDisputes: 0,
      averageResolutionTime: 0,
      totalAmountInDispute: 0,
      disputesByStatus: {},
      disputesByPriority: {},
      summary: 'No disputes found for the selected period.'
    }
  }

  /**
   * Notify stakeholders about dispute resolution
   */
  static async notifyStakeholders(
    dispute: DisputeRecord,
    resolutionResult: DisputeResolutionResult
  ): Promise<void> {
    // This would integrate with the notification system
    console.log(`Notifying stakeholders about dispute resolution: ${dispute.id}`)
    
    // In a real system, this would:
    // 1. Send email/SMS to guardian if available
    // 2. Update the student's record
    // 3. Create notification entries in the system
  }
}

export default DisputeResolutionService