/**
 * Fake Payment Detection Service
 * Identifies potentially fraudulent or fake payments in the system
 * 
 * Requirements: Fake Payment Detection - Identify and flag potentially fraudulent payments
 * 
 * Property 1: Fraud Pattern Recognition
 * For any payment, the system SHALL detect common patterns of fraudulent payments
 * including round amounts, frequent small payments, and suspicious timing.
 * 
 * Property 2: Risk Scoring
 * For any payment, the system SHALL assign a risk score based on multiple factors
 * to identify potentially fake payments.
 */
import { prisma } from '@/lib/db'
import { FinanceAuditService } from './finance-audit.service'
import type { PaymentMethod, StudentAccount } from '@/types/finance'

// Error codes for fake payment detection operations
export const FAKE_PAYMENT_DETECTION_ERRORS = {
  FRAUD_PATTERN_DETECTED: 'FRAUD_PATTERN_DETECTED',
  HIGH_RISK_PAYMENT: 'HIGH_RISK_PAYMENT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  PATTERN_MATCH_FRAUD: 'PATTERN_MATCH_FRAUD',
  BEHAVIOR_ANOMALY: 'BEHAVIOR_ANOMALY',
  REFERENCE_CHECK_FAILED: 'REFERENCE_CHECK_FAILED',
  PAYMENT_SOURCE_INVALID: 'PAYMENT_SOURCE_INVALID',
} as const

export class FakePaymentDetectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FakePaymentDetectionError'
  }
}

/**
 * Risk factor for a payment
 */
export interface RiskFactor {
  factor: string
  description: string
  weight: number // 1-10 scale
  contribution: number // How much this factor contributes to total risk score
}

/**
 * Fake payment detection result
 */
export interface FakePaymentDetectionResult {
  paymentId: string
  riskScore: number // 0-100 scale
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskFactors: RiskFactor[]
  isSuspicious: boolean
  recommendations: string[]
  probabilityOfFraud: number // 0-1 scale
}

/**
 * Fraud pattern types
 */
export type FraudPattern = 
  | 'ROUND_NUMBER_AMOUNT'
  | 'FREQUENT_SMALL_PAYMENTS'
  | 'BUSINESS_HOURS_ABSENCE'
  | 'SAME_DAY_MULTIPLE_PAYMENTS'
  | 'ABNORMAL_AMOUNT_FOR_STUDENT'
  | 'COMMON_DENOMINATION'
  | 'WEEKEND_PAYMENT'
  | 'UNUSUAL_REFERENCE_PATTERN'
  | 'UNAUTHORIZED_GUARDIAN'
  | 'BALANCE_ZEROING_ATTEMPT'

/**
 * Fake payment detection service
 */
export class FakePaymentDetectionService {
  /**
   * Analyze a payment for potential fraud indicators
   * 
   * Property 1: Fraud Pattern Recognition
   * For any payment, the system SHALL detect common patterns of fraudulent payments
   * including round amounts, frequent small payments, and suspicious timing.
   */
  static async analyzePaymentForFraud(
    paymentId: string
  ): Promise<FakePaymentDetectionResult> {
    // Get the payment record
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: {
          include: {
            class: true,
            studentGuardians: {
              include: { guardian: true }
            }
          }
        },
        guardian: true,
        receipt: true
      }
    })
    
    if (!payment) {
      throw new FakePaymentDetectionError(
        FAKE_PAYMENT_DETECTION_ERRORS.FRAUD_PATTERN_DETECTED,
        'Payment not found',
        { paymentId }
      )
    }
    
    // Initialize risk factors
    const riskFactors: RiskFactor[] = []
    let totalRiskScore = 0
    
    // Factor 1: Round number amount
    if (this.isRoundNumber(payment.amount)) {
      const factor: RiskFactor = {
        factor: 'ROUND_NUMBER_AMOUNT',
        description: `Payment amount is a round number: UGX ${payment.amount.toLocaleString()}`,
        weight: 8,
        contribution: 8
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Factor 2: Check if payment amount is common Ugandan denomination
    if (this.isCommonDenomination(payment.amount)) {
      const factor: RiskFactor = {
        factor: 'COMMON_DENOMINATION',
        description: `Payment matches common Ugandan denomination: UGX ${payment.amount.toLocaleString()}`,
        weight: 6,
        contribution: 6
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Factor 3: Business hours check
    const hour = payment.receivedAt.getHours()
    if (hour < 6 || hour > 20) {
      const factor: RiskFactor = {
        factor: 'BUSINESS_HOURS_ABSENCE',
        description: `Payment recorded outside business hours: ${hour}:00`,
        weight: 7,
        contribution: 7
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Factor 4: Weekend payment check
    const dayOfWeek = payment.receivedAt.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      const factor: RiskFactor = {
        factor: 'WEEKEND_PAYMENT',
        description: `Payment recorded on weekend`,
        weight: 5,
        contribution: 5
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Factor 5: Check if guardian is authorized
    if (payment.guardianId) {
      const isAuthorized = payment.student.studentGuardians.some(
        sg => sg.guardianId === payment.guardianId
      )
      if (!isAuthorized) {
        const factor: RiskFactor = {
          factor: 'UNAUTHORIZED_GUARDIAN',
          description: `Guardian is not authorized for this student`,
          weight: 10,
          contribution: 10
        }
        riskFactors.push(factor)
        totalRiskScore += factor.contribution
      }
    }
    
    // Factor 6: Check payment amount relative to student's balance
    const account = await prisma.studentAccount.findUnique({
      where: {
        studentId_schoolId: {
          studentId: payment.studentId,
          schoolId: payment.schoolId
        }
      }
    })
    
    if (account) {
      const balanceRatio = payment.amount / (account.balance || 1) // Avoid division by zero
      if (balanceRatio > 1.5) {
        // Payment is significantly higher than current balance
        const factor: RiskFactor = {
          factor: 'ABNORMAL_AMOUNT_FOR_STUDENT',
          description: `Payment amount is ${Math.round(balanceRatio * 100)}% of current balance`,
          weight: 9,
          contribution: 9
        }
        riskFactors.push(factor)
        totalRiskScore += factor.contribution
      }
    }
    
    // Factor 7: Check for suspicious reference pattern
    if (this.hasSuspiciousReferencePattern(payment.reference)) {
      const factor: RiskFactor = {
        factor: 'UNUSUAL_REFERENCE_PATTERN',
        description: `Payment reference has suspicious pattern: ${payment.reference}`,
        weight: 7,
        contribution: 7
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Factor 8: Check if payment would zero out balance unusually
    if (account && Math.abs(account.balance - payment.amount) < 1000) {
      const factor: RiskFactor = {
        factor: 'BALANCE_ZEROING_ATTEMPT',
        description: `Payment appears designed to zero out balance with small remainder`,
        weight: 6,
        contribution: 6
      }
      riskFactors.push(factor)
      totalRiskScore += factor.contribution
    }
    
    // Cap the risk score at 100
    totalRiskScore = Math.min(totalRiskScore, 100)
    
    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    if (totalRiskScore <= 10) riskLevel = 'LOW'
    else if (totalRiskScore <= 30) riskLevel = 'MEDIUM'
    else if (totalRiskScore <= 60) riskLevel = 'HIGH'
    else riskLevel = 'CRITICAL'
    
    // Calculate probability of fraud (simplified calculation)
    const probabilityOfFraud = totalRiskScore / 100
    
    // Generate recommendations
    const recommendations: string[] = []
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      recommendations.push('Verify payment with guardian directly')
      recommendations.push('Check original receipt')
      recommendations.push('Review payment method authenticity')
    }
    
    if (riskFactors.some(rf => rf.factor === 'UNAUTHORIZED_GUARDIAN')) {
      recommendations.push('Confirm guardian authorization status')
    }
    
    if (riskFactors.some(rf => rf.factor === 'ROUND_NUMBER_AMOUNT')) {
      recommendations.push('Verify exact payment amount with source')
    }
    
    return {
      paymentId,
      riskScore: totalRiskScore,
      riskLevel,
      riskFactors,
      isSuspicious: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      recommendations,
      probabilityOfFraud
    }
  }

  /**
   * Check if a number is a round number (multiple of common denominations)
   */
  private static isRoundNumber(amount: number): boolean {
    // Check if amount is a round number (multiple of 1000, 5000, 10000, etc.)
    return (
      amount % 1000 === 0 || 
      amount % 5000 === 0 || 
      amount % 10000 === 0 ||
      amount % 25000 === 0 ||
      amount % 50000 === 0
    )
  }

  /**
   * Check if amount matches common Ugandan denominations
   */
  private static isCommonDenomination(amount: number): boolean {
    const commonDenominations = [
      1000, 2000, 3000, 4000, 5000, 10000, 20000, 30000, 40000, 50000, 
      100000, 200000, 500000
    ]
    return commonDenominations.includes(amount)
  }

  /**
   * Check if reference has suspicious pattern
   */
  private static hasSuspiciousReferencePattern(reference: string): boolean {
    // Check for patterns like repeated digits, simple sequences, etc.
    if (!reference) return false
    
    // Check for repeated characters
    if (/(\d)\1{3,}/.test(reference)) {
      return true
    }
    
    // Check for simple sequences
    if (/(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(reference)) {
      return true
    }
    
    // Check if reference is all the same digit
    if (/^(\d)\1+$/.test(reference)) {
      return true
    }
    
    return false
  }

  /**
   * Analyze multiple payments for fraud patterns
   */
  static async analyzeMultiplePaymentsForFraud(
    paymentIds: string[]
  ): Promise<FakePaymentDetectionResult[]> {
    const results: FakePaymentDetectionResult[] = []
    
    for (const paymentId of paymentIds) {
      try {
        const result = await this.analyzePaymentForFraud(paymentId)
        results.push(result)
      } catch (error) {
        // Skip payments that can't be analyzed
        console.error(`Could not analyze payment ${paymentId}:`, error.message)
      }
    }
    
    return results
  }

  /**
   * Find suspicious payments in a date range
   */
  static async findSuspiciousPayments(
    schoolId: string,
    startDate: Date,
    endDate: Date,
    minRiskScore: number = 30
  ): Promise<FakePaymentDetectionResult[]> {
    // Get all payments in the date range
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        receivedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })
    
    const suspiciousPayments: FakePaymentDetectionResult[] = []
    
    for (const payment of payments) {
      try {
        const analysis = await this.analyzePaymentForFraud(payment.id)
        if (analysis.riskScore >= minRiskScore) {
          suspiciousPayments.push(analysis)
        }
      } catch (error) {
        // Skip payments that can't be analyzed
        console.error(`Could not analyze payment ${payment.id}:`, error.message)
      }
    }
    
    return suspiciousPayments
  }

  /**
   * Check for suspicious payment patterns for a student
   */
  static async checkStudentPaymentPatterns(
    studentId: string,
    schoolId: string
  ): Promise<{
    studentId: string
    patternFlags: FraudPattern[]
    riskScore: number
    recentSuspiciousPayments: FakePaymentDetectionResult[]
  }> {
    // Get recent payments for the student
    const payments = await prisma.payment.findMany({
      where: {
        studentId,
        schoolId
      },
      orderBy: {
        receivedAt: 'desc'
      },
      take: 20 // Last 20 payments
    })
    
    const patternFlags: FraudPattern[] = []
    let riskScore = 0
    
    // Check for same-day multiple payments
    const paymentsByDate = payments.reduce((acc, payment) => {
      const dateStr = payment.receivedAt.toISOString().split('T')[0]
      if (!acc[dateStr]) acc[dateStr] = []
      acc[dateStr].push(payment)
      return acc
    }, {} as Record<string, any[]>)
    
    for (const [date, dayPayments] of Object.entries(paymentsByDate)) {
      if (dayPayments.length > 3) {
        patternFlags.push('SAME_DAY_MULTIPLE_PAYMENTS')
        riskScore += 10
      }
    }
    
    // Check for frequent small payments (could indicate fabricated payments)
    const smallPayments = payments.filter(p => p.amount < 5000) // Less than 5k UGX
    if (smallPayments.length > 5) {
      patternFlags.push('FREQUENT_SMALL_PAYMENTS')
      riskScore += 15
    }
    
    // Analyze each payment for individual fraud indicators
    const recentSuspiciousPayments = []
    for (const payment of payments.slice(0, 10)) { // Check most recent 10
      try {
        const analysis = await this.analyzePaymentForFraud(payment.id)
        if (analysis.isSuspicious) {
          recentSuspiciousPayments.push(analysis)
          riskScore += analysis.riskScore / 10 // Add portion of risk score
        }
      } catch (error) {
        // Skip payments that can't be analyzed
      }
    }
    
    return {
      studentId,
      patternFlags,
      riskScore: Math.min(riskScore, 100),
      recentSuspiciousPayments
    }
  }

  /**
   * Validate a payment reference against known fraud patterns
   */
  static async validatePaymentReference(
    reference: string,
    paymentAmount: number,
    method: PaymentMethod
  ): Promise<{
    isValid: boolean
    riskFactors: string[]
    confidence: number
  }> {
    const riskFactors: string[] = []
    
    // Check for suspicious reference patterns
    if (this.hasSuspiciousReferencePattern(reference)) {
      riskFactors.push('Suspicious reference pattern detected')
    }
    
    // Check if reference is too short
    if (reference.length < 6) {
      riskFactors.push('Reference too short to be legitimate')
    }
    
    // Check if reference contains only numbers (for non-cash payments)
    if (method !== 'CASH' && /^\d+$/.test(reference)) {
      riskFactors.push('Numeric-only reference for non-cash payment method')
    }
    
    // Calculate confidence (lower confidence if risk factors exist)
    const baseConfidence = 0.95
    const confidenceReduction = riskFactors.length * 0.15
    const confidence = Math.max(baseConfidence - confidenceReduction, 0.1)
    
    return {
      isValid: riskFactors.length === 0,
      riskFactors,
      confidence
    }
  }

  /**
   * Generate fraud detection report
   */
  static async generateFraudDetectionReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    reportDate: Date
    dateRange: { start: Date; end: Date }
    totalPayments: number
    suspiciousPayments: number
    highRiskPayments: number
    fraudPatternsDetected: Record<string, number>
    topRiskStudents: Array<{ studentId: string; studentName: string; riskScore: number; suspiciousCount: number }>
    recommendations: string[]
    summary: string
  }> {
    // Get all payments in the date range
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        receivedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        student: {
          include: { class: true }
        }
      }
    })
    
    const totalPayments = payments.length
    const suspiciousPaymentsAnalysis = await this.analyzeMultiplePaymentsForFraud(
      payments.map(p => p.id)
    )
    
    const suspiciousPayments = suspiciousPaymentsAnalysis.filter(p => p.isSuspicious).length
    const highRiskPayments = suspiciousPaymentsAnalysis.filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length
    
    // Count fraud patterns
    const fraudPatternsDetected: Record<string, number> = {}
    for (const analysis of suspiciousPaymentsAnalysis) {
      for (const factor of analysis.riskFactors) {
        fraudPatternsDetected[factor.factor] = (fraudPatternsDetected[factor.factor] || 0) + 1
      }
    }
    
    // Get top risk students
    const studentRiskMap = new Map<string, { riskScore: number; suspiciousCount: number; studentName: string }>()
    for (const analysis of suspiciousPaymentsAnalysis) {
      const payment = payments.find(p => p.id === analysis.paymentId)
      if (payment && analysis.isSuspicious) {
        const key = payment.studentId
        if (!studentRiskMap.has(key)) {
          studentRiskMap.set(key, {
            riskScore: analysis.riskScore,
            suspiciousCount: 1,
            studentName: `${payment.student.firstName} ${payment.student.lastName}`
          })
        } else {
          const existing = studentRiskMap.get(key)!
          studentRiskMap.set(key, {
            riskScore: existing.riskScore + analysis.riskScore,
            suspiciousCount: existing.suspiciousCount + 1,
            studentName: existing.studentName
          })
        }
      }
    }
    
    const topRiskStudents = Array.from(studentRiskMap.entries())
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.studentName,
        riskScore: data.riskScore,
        suspiciousCount: data.suspiciousCount
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10) // Top 10 risk students
    
    const recommendations = [
      'Review all high-risk payments with guardians',
      'Verify payment references with payment sources',
      'Implement additional verification for round number payments',
      'Monitor students with multiple suspicious payments closely'
    ]
    
    const summary = `Fraud Detection Report for ${startDate.toDateString()} to ${endDate.toDateString()}:
    - Total payments analyzed: ${totalPayments}
    - Suspicious payments detected: ${suspiciousPayments}
    - High-risk payments: ${highRiskPayments}
    - Most common fraud patterns: ${Object.entries(fraudPatternsDetected)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([pattern]) => pattern)
        .join(', ')}
    - Students requiring attention: ${topRiskStudents.length}`
    
    return {
      reportDate: new Date(),
      dateRange: { start: startDate, end: endDate },
      totalPayments,
      suspiciousPayments,
      highRiskPayments,
      fraudPatternsDetected,
      topRiskStudents,
      recommendations,
      summary
    }
  }

  /**
   * Flag a payment as potentially fraudulent and create audit trail
   */
  static async flagPaymentAsFraudulent(
    paymentId: string,
    flaggedBy: string,
    reason: string
  ): Promise<{
    success: boolean
    auditTrailId: string
    actionTaken: string
  }> {
    // Get payment details for audit
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { student: true }
    })
    
    if (!payment) {
      throw new FakePaymentDetectionError(
        FAKE_PAYMENT_DETECTION_ERRORS.FRAUD_PATTERN_DETECTED,
        'Payment not found',
        { paymentId }
      )
    }
    
    // Log the fraud flag in audit trail
    const auditEntry = await FinanceAuditService.logAction({
      action: 'PAYMENT_FLAGGED_AS_FRAUDULENT',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: {
        flaggedBy,
        reason,
        paymentAmount: payment.amount,
        paymentMethod: payment.method,
        paymentReference: payment.reference,
        studentId: payment.studentId,
        studentName: `${payment.student.firstName} ${payment.student.lastName}`
      },
      userId: flaggedBy
    })
    
    // In a real system, you might want to add a fraud flag to the payment record
    // For now, we'll just return success
    
    return {
      success: true,
      auditTrailId: auditEntry.id,
      actionTaken: 'Payment flagged and audit trail created'
    }
  }
}

export default FakePaymentDetectionService