/**
 * Payment Validation Service
 * Prevents wrong amounts and invalid payments from being recorded
 * 
 * Requirements: Payment Validation - Prevention of incorrect amounts
 *    
 * Property 1: Amount Validation
 * For any payment recording attempt, the system SHALL validate the amount against 
 * expected fee structure before allowing the transaction.
 * 
 * Property 2: Duplicate Payment Prevention
 * For any payment recording attempt, the system SHALL check for duplicate transactions 
 * before allowing the transaction.
 */
import { prisma } from '@/lib/db'
import type { PaymentMethod, StudentAccount } from '@/types/finance'

// Error codes for payment validation operations
export const PAYMENT_VALIDATION_ERRORS = {
  AMOUNT_OUT_OF_RANGE: 'AMOUNT_OUT_OF_RANGE',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  PAYMENT_EXCEEDS_BALANCE: 'PAYMENT_EXCEEDS_BALANCE',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  PAYMENT_DATE_INVALID: 'PAYMENT_DATE_INVALID',
  STUDENT_ACCOUNT_INACTIVE: 'STUDENT_ACCOUNT_INACTIVE',
  PAYMENT_BELOW_MINIMUM: 'PAYMENT_BELOW_MINIMUM',
  PAYMENT_PATTERN_SUSPICIOUS: 'PAYMENT_PATTERN_SUSPICIOUS',
  REFERENCE_ALREADY_USED: 'REFERENCE_ALREADY_USED',
  GUARDIAN_UNAUTHORIZED: 'GUARDIAN_UNAUTHORIZED',
} as const

export class PaymentValidationError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PaymentValidationError'
  }
}

/**
 * Payment validation result
 */
export interface PaymentValidationResult {
  isValid: boolean
  errors: PaymentValidationError[]
  warnings: string[]
  suggestedAmount?: number
  feeBreakdown?: {
    totalFees: number
    totalPaid: number
    totalDiscounts: number
    totalPenalties: number
    currentBalance: number
    expectedPayments: Array<{
      description: string
      amount: number
      dueDate?: string
    }>
  }
}

/**
 * Payment validation criteria
 */
export interface PaymentValidationCriteria {
  studentId: string
  amount: number
  method: PaymentMethod
  reference: string
  receivedAt: Date
  guardianId?: string
  termId: string
  schoolId: string
}

/**
 * Payment validation service
 */
export class PaymentValidationService {
  /**
   * Validate a payment before recording it
   * 
   * Property 1: Amount Validation
   * For any payment recording attempt, the system SHALL validate the amount against 
   * expected fee structure before allowing the transaction.
   */
  static async validatePayment(criteria: PaymentValidationCriteria): Promise<PaymentValidationResult> {
    const errors: PaymentValidationError[] = []
    const warnings: string[] = []
    
    try {
      // Get student account information
      const studentAccount = await prisma.studentAccount.findUnique({
        where: {
          studentId_schoolId: {
            studentId: criteria.studentId,
            schoolId: criteria.schoolId
          }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                include: { guardian: true }
              }
            }
          }
        }
      })
      
      if (!studentAccount) {
        throw new PaymentValidationError(
          PAYMENT_VALIDATION_ERRORS.STUDENT_ACCOUNT_INACTIVE,
          'Student account not found',
          { studentId: criteria.studentId }
        )
      }
      
      // Check if guardian is authorized (if provided)
      if (criteria.guardianId) {
        const isAuthorizedGuardian = studentAccount.student.studentGuardians.some(
          sg => sg.guardianId === criteria.guardianId
        )
        
        if (!isAuthorizedGuardian) {
          errors.push(new PaymentValidationError(
            PAYMENT_VALIDATION_ERRORS.GUARDIAN_UNAUTHORIZED,
            'Guardian is not authorized for this student',
            { guardianId: criteria.guardianId, studentId: criteria.studentId }
          ))
        }
      }
      
      // Get fee structure for the student's class and term
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          classId: studentAccount.student.classId,
          termId: criteria.termId,
          isActive: true
        },
        include: { items: true }
      })
      
      // Calculate current balance and expected payments
      const currentBalance = studentAccount.balance
      const totalFees = studentAccount.totalFees
      const totalPaid = studentAccount.totalPaid
      
      // Check if payment amount is reasonable compared to balance
      if (criteria.amount > currentBalance * 1.5) {
        // Payment is significantly higher than current balance
        warnings.push(`Payment amount (${criteria.amount}) is significantly higher than current balance (${currentBalance}). This may indicate an overpayment or error.`)
      }
      
      if (criteria.amount <= 0) {
        errors.push(new PaymentValidationError(
          PAYMENT_VALIDATION_ERRORS.AMOUNT_OUT_OF_RANGE,
          'Payment amount must be greater than zero',
          { amount: criteria.amount }
        ))
      }
      
      // Check if payment is below minimum expected amount (if fees exist)
      if (totalFees > 0 && criteria.amount < 1000) { // Minimum of 1000 UGX
        warnings.push(`Payment amount is very low (${criteria.amount} UGX). Verify this is intentional.`)
      }
      
      // Validate payment method
      const validMethods: PaymentMethod[] = ['CASH', 'MOBILE_MONEY', 'BANK']
      if (!validMethods.includes(criteria.method)) {
        errors.push(new PaymentValidationError(
          PAYMENT_VALIDATION_ERRORS.INVALID_PAYMENT_METHOD,
          `Invalid payment method: ${criteria.method}`,
          { method: criteria.method }
        ))
      }
      
      // Validate payment date (should not be in the future)
      const now = new Date()
      if (criteria.receivedAt > now) {
        errors.push(new PaymentValidationError(
          PAYMENT_VALIDATION_ERRORS.PAYMENT_DATE_INVALID,
          'Payment date cannot be in the future',
          { receivedAt: criteria.receivedAt, currentDate: now }
        ))
      }
      
      // Check for duplicate reference
      const duplicatePayment = await prisma.payment.findFirst({
        where: {
          reference: criteria.reference,
          studentId: criteria.studentId,
          schoolId: criteria.schoolId
        }
      })
      
      if (duplicatePayment) {
        errors.push(new PaymentValidationError(
          PAYMENT_VALIDATION_ERRORS.REFERENCE_ALREADY_USED,
          'Payment reference already exists for this student',
          { reference: criteria.reference, existingPaymentId: duplicatePayment.id }
        ))
      }
      
      // Check for suspicious payment patterns
      // Round number amounts might indicate estimated/fictional payments
      if (criteria.amount % 1000 === 0 && criteria.amount >= 50000) {
        warnings.push(`Payment amount is a round number (${criteria.amount.toLocaleString()} UGX). Verify authenticity.`)
      }
      
      // Check if payment is made outside normal business hours
      const hour = criteria.receivedAt.getHours()
      if (hour < 6 || hour > 20) {
        warnings.push(`Payment recorded outside business hours (${hour}:00). Verify authenticity.`)
      }
      
      // Prepare fee breakdown for suggestions
      const feeBreakdown = {
        totalFees,
        totalPaid,
        totalDiscounts: studentAccount.totalDiscounts,
        totalPenalties: studentAccount.totalPenalties,
        currentBalance,
        expectedPayments: feeStructure?.items.map(item => ({
          description: item.name,
          amount: item.amount,
          dueDate: item.dueDate?.toISOString()
        })) || []
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        feeBreakdown,
        suggestedAmount: currentBalance < 0 ? 0 : currentBalance // Suggest paying the full balance
      }
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        return {
          isValid: false,
          errors: [error],
          warnings: [],
          feeBreakdown: undefined
        }
      }
      
      throw new PaymentValidationError(
        PAYMENT_VALIDATION_ERRORS.AMOUNT_OUT_OF_RANGE,
        'Failed to validate payment',
        { criteria, error: error.message }
      )
    }
  }

  /**
   * Check for duplicate payments before recording
   * 
   * Property 2: Duplicate Payment Prevention
   * For any payment recording attempt, the system SHALL check for duplicate transactions 
   * before allowing the transaction.
   */
  static async checkForDuplicatePayment(criteria: PaymentValidationCriteria): Promise<{
    isDuplicate: boolean
    similarPayments: Array<{
      id: string
      amount: number
      reference: string
      receivedAt: Date
      studentId: string
      similarityScore: number
    }>
    duplicateRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  }> {
    // Find payments with similar characteristics
    const similarPayments = await prisma.payment.findMany({
      where: {
        OR: [
          { reference: criteria.reference }, // Exact reference match
          { 
            studentId: criteria.studentId,
            amount: criteria.amount,
            receivedAt: {
              gte: new Date(criteria.receivedAt.getTime() - 30 * 60000), // Within 30 minutes
              lte: new Date(criteria.receivedAt.getTime() + 30 * 60000)
            }
          }, // Same student, amount, and close time
          {
            studentId: criteria.studentId,
            amount: criteria.amount,
            method: criteria.method
          } // Same student, amount, and method
        ],
        schoolId: criteria.schoolId
      },
      take: 10 // Limit to 10 similar payments
    })
    
    // Calculate similarity scores
    const scoredPayments = similarPayments.map(payment => {
      let score = 0
      
      // Exact reference match is highest priority
      if (payment.reference === criteria.reference) score += 100
      // Same amount and student is high priority
      if (payment.amount === criteria.amount && payment.studentId === criteria.studentId) score += 50
      // Same method adds to score
      if (payment.method === criteria.method) score += 25
      // Close time proximity adds to score
      const timeDiff = Math.abs(payment.receivedAt.getTime() - criteria.receivedAt.getTime())
      if (timeDiff < 60000) score += 30 // Within 1 minute
      else if (timeDiff < 300000) score += 15 // Within 5 minutes
      
      return {
        ...payment,
        similarityScore: score
      }
    }).sort((a, b) => b.similarityScore - a.similarityScore) // Sort by highest similarity
    
    // Determine duplicate risk level
    let duplicateRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (scoredPayments.length > 0) {
      const highestScore = scoredPayments[0].similarityScore
      if (highestScore >= 100) duplicateRiskLevel = 'HIGH' // Exact reference match
      else if (highestScore >= 50) duplicateRiskLevel = 'MEDIUM' // Same amount and student
      else duplicateRiskLevel = 'LOW' // Other similarities
    }
    
    return {
      isDuplicate: duplicateRiskLevel === 'HIGH',
      similarPayments: scoredPayments,
      duplicateRiskLevel
    }
  }

  /**
   * Validate payment amount against expected fee structure
   */
  static async validateAmountAgainstFeeStructure(
    studentId: string,
    termId: string,
    amount: number
  ): Promise<{
    isValid: boolean
    expectedAmount?: number
    suggestedAmount?: number
    reason: string
  }> {
    // Get the student's fee structure
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    })
    
    if (!student) {
      return {
        isValid: false,
        reason: 'Student not found'
      }
    }
    
    // Get fee structure for the class and term
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        termId: termId,
        isActive: true
      },
      include: { items: true }
    })
    
    if (!feeStructure) {
      return {
        isValid: true, // If no fee structure exists, accept any payment
        reason: 'No fee structure defined for this class and term'
      }
    }
    
    // Get current account balance
    const account = await prisma.studentAccount.findUnique({
      where: {
        studentId_schoolId: {
          studentId,
          schoolId: student.schoolId
        }
      }
    })
    
    if (!account) {
      return {
        isValid: false,
        reason: 'Student account not found'
      }
    }
    
    const currentBalance = account.balance
    
    // Check if payment amount is reasonable
    if (amount > currentBalance * 1.2) {
      return {
        isValid: false,
        expectedAmount: currentBalance,
        suggestedAmount: currentBalance,
        reason: `Payment amount (${amount}) is significantly higher than current balance (${currentBalance}). Possible overpayment or error.`
      }
    }
    
    if (amount > feeStructure.totalAmount) {
      return {
        isValid: false,
        expectedAmount: feeStructure.totalAmount,
        suggestedAmount: currentBalance,
        reason: `Payment amount (${amount}) exceeds total fee structure amount (${feeStructure.totalAmount}).`
      }
    }
    
    // If payment is within reasonable bounds of the balance, it's valid
    return {
      isValid: true,
      expectedAmount: currentBalance,
      suggestedAmount: currentBalance,
      reason: 'Payment amount is consistent with current balance'
    }
  }

  /**
   * Pre-validate payment before recording
   */
  static async preValidatePayment(criteria: PaymentValidationCriteria): Promise<{
    canProceed: boolean
    validation: PaymentValidationResult
    duplicateCheck: ReturnType<typeof this.checkForDuplicatePayment> extends Promise<infer T> ? T : never
  }> {
    // Run both validation and duplicate check simultaneously
    const [validation, duplicateCheck] = await Promise.all([
      this.validatePayment(criteria),
      this.checkForDuplicatePayment(criteria)
    ])
    
    // Determine if payment can proceed
    const canProceed = validation.isValid && !duplicateCheck.isDuplicate
    
    return {
      canProceed,
      validation,
      duplicateCheck
    }
  }

  /**
   * Validate payment pattern for suspicious activity
   */
  static async validatePaymentPattern(
    studentId: string,
    amount: number,
    method: PaymentMethod,
    receivedAt: Date
  ): Promise<{
    isSuspicious: boolean
    riskFactors: string[]
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  }> {
    const riskFactors: string[] = []
    
    // Check for round number amounts
    if (amount % 1000 === 0 && amount >= 50000) {
      riskFactors.push(`Round number amount: ${amount.toLocaleString()}`)
    }
    
    // Check for unusual timing
    const hour = receivedAt.getHours()
    if (hour < 6 || hour > 20) {
      riskFactors.push(`Outside business hours: ${hour}:00`)
    }
    
    // Check for weekend payments
    const dayOfWeek = receivedAt.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      riskFactors.push(`Weekend payment`)
    }
    
    // Check for payments matching common denominations that might be fictional
    const commonUgxDenominations = [10000, 20000, 30000, 40000, 50000, 100000]
    if (commonUgxDenominations.includes(amount)) {
      riskFactors.push(`Common denomination: ${amount.toLocaleString()}`)
    }
    
    // Calculate risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (riskFactors.length >= 3) riskLevel = 'HIGH'
    else if (riskFactors.length >= 1) riskLevel = 'MEDIUM'
    
    return {
      isSuspicious: riskLevel !== 'LOW',
      riskFactors,
      riskLevel
    }
  }
}

export default PaymentValidationService