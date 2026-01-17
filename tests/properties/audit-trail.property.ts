/**
 * Property Test: Audit Trail Completeness
 * **Feature: school-office, Property 15: Audit Trail Completeness**
 * **Validates: Requirements 7.5, 15.1, 15.2, 15.3**
 * 
 * For any marks entry, financial transaction, or admin action, an audit log entry 
 * SHALL be created with user ID, timestamp, and action details.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// TYPES FOR TESTING
// ============================================

interface AuditLog {
  id: string
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

interface CreateAuditLogInput {
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// Audit action types
enum AuditAction {
  // Financial actions (Requirement 15.1)
  PAYMENT_RECORDED = 'payment_recorded',
  PAYMENT_UPDATED = 'payment_updated',
  PAYMENT_DELETED = 'payment_deleted',
  FEE_STRUCTURE_CREATED = 'fee_structure_created',
  FEE_STRUCTURE_UPDATED = 'fee_structure_updated',
  DISCOUNT_APPLIED = 'discount_applied',
  
  // Academic data actions (Requirement 15.2)
  MARKS_ENTERED = 'marks_entered',
  MARKS_UPDATED = 'marks_updated',
  MARKS_DELETED = 'marks_deleted',
  RESULTS_PROCESSED = 'results_processed',
  REPORT_CARD_GENERATED = 'report_card_generated',
  GRADE_UPDATED = 'grade_updated',
  
  // Admin actions (Requirement 15.3)
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  ROLE_CHANGED = 'role_changed',
  STUDENT_ENROLLED = 'student_enrolled',
  STUDENT_TRANSFERRED = 'student_transferred',
  STAFF_CREATED = 'staff_created',
  STAFF_DEACTIVATED = 'staff_deactivated',
}

enum AuditResource {
  PAYMENT = 'payment',
  FEE_STRUCTURE = 'fee_structure',
  MARK = 'mark',
  RESULT = 'result',
  REPORT_CARD = 'report_card',
  USER = 'user',
  STUDENT = 'student',
  STAFF = 'staff',
  SCHOOL = 'school',
}

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK'

// ============================================
// SIMULATED AUDIT STORE
// ============================================

class AuditStore {
  private auditLogs: Map<string, AuditLog> = new Map()
  private logIdCounter = 0

  /**
   * Log an audit entry
   * Requirement 7.5, 15.1, 15.2, 15.3: Log with user ID, timestamp, and details
   */
  log(data: CreateAuditLogInput): AuditLog {
    const id = `audit-${++this.logIdCounter}`
    const auditLog: AuditLog = {
      id,
      schoolId: data.schoolId,
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      previousValue: data.previousValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date(),
    }
    this.auditLogs.set(id, auditLog)
    return auditLog
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(filter: {
    schoolId?: string
    userId?: string
    resource?: string
    action?: string
    dateFrom?: Date
    dateTo?: Date
  }): AuditLog[] {
    return Array.from(this.auditLogs.values()).filter(log => {
      if (filter.schoolId && log.schoolId !== filter.schoolId) return false
      if (filter.userId && log.userId !== filter.userId) return false
      if (filter.resource && log.resource !== filter.resource) return false
      if (filter.action && log.action !== filter.action) return false
      if (filter.dateFrom && log.timestamp < filter.dateFrom) return false
      if (filter.dateTo && log.timestamp > filter.dateTo) return false
      return true
    })
  }

  /**
   * Get audit logs by resource
   */
  getAuditLogsByResource(resource: string, resourceId: string): AuditLog[] {
    return Array.from(this.auditLogs.values()).filter(
      log => log.resource === resource && log.resourceId === resourceId
    )
  }

  getAllLogs(): AuditLog[] {
    return Array.from(this.auditLogs.values())
  }

  clear(): void {
    this.auditLogs.clear()
    this.logIdCounter = 0
  }
}

// ============================================
// SIMULATED SERVICES WITH AUDIT LOGGING
// ============================================

class FinanceServiceWithAudit {
  constructor(private auditStore: AuditStore) {}

  /**
   * Record a payment with audit logging
   * Requirement 15.1: Log financial transactions
   */
  recordPayment(params: {
    schoolId: string
    userId: string
    paymentId: string
    studentId: string
    amount: number
    method: PaymentMethod
    reference: string
    receiptNumber: string
    termId: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.PAYMENT_RECORDED,
      resource: AuditResource.PAYMENT,
      resourceId: params.paymentId,
      newValue: {
        studentId: params.studentId,
        amount: params.amount,
        method: params.method,
        reference: params.reference,
        receiptNumber: params.receiptNumber,
        termId: params.termId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }

  /**
   * Update a payment with audit logging
   * Requirement 15.1: Log financial transactions with previous/new values
   */
  updatePayment(params: {
    schoolId: string
    userId: string
    paymentId: string
    previousAmount: number
    newAmount: number
    previousMethod: PaymentMethod
    newMethod: PaymentMethod
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.PAYMENT_UPDATED,
      resource: AuditResource.PAYMENT,
      resourceId: params.paymentId,
      previousValue: {
        amount: params.previousAmount,
        method: params.previousMethod,
      },
      newValue: {
        amount: params.newAmount,
        method: params.newMethod,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }
}

class ExaminationServiceWithAudit {
  constructor(private auditStore: AuditStore) {}

  /**
   * Enter marks with audit logging
   * Requirement 7.5: Log marks entry with teacher ID and timestamp
   */
  enterMarks(params: {
    schoolId: string
    teacherId: string
    examId: string
    studentId: string
    subjectId: string
    score: number
    maxScore: number
    grade?: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: AuditAction.MARKS_ENTERED,
      resource: AuditResource.MARK,
      resourceId: `${params.examId}_${params.studentId}_${params.subjectId}`,
      newValue: {
        score: params.score,
        maxScore: params.maxScore,
        grade: params.grade,
        examId: params.examId,
        studentId: params.studentId,
        subjectId: params.subjectId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }

  /**
   * Update marks with audit logging
   * Requirement 15.2: Log academic data modifications with previous/new values
   */
  updateMarks(params: {
    schoolId: string
    teacherId: string
    examId: string
    studentId: string
    subjectId: string
    previousScore: number
    newScore: number
    maxScore: number
    previousGrade?: string
    newGrade?: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: AuditAction.MARKS_UPDATED,
      resource: AuditResource.MARK,
      resourceId: `${params.examId}_${params.studentId}_${params.subjectId}`,
      previousValue: {
        score: params.previousScore,
        maxScore: params.maxScore,
        grade: params.previousGrade,
      },
      newValue: {
        score: params.newScore,
        maxScore: params.maxScore,
        grade: params.newGrade,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }
}

class AdminServiceWithAudit {
  constructor(private auditStore: AuditStore) {}

  /**
   * Create user with audit logging
   * Requirement 15.3: Log admin actions
   */
  createUser(params: {
    schoolId: string
    adminUserId: string
    newUserId: string
    email: string
    role: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.USER_CREATED,
      resource: AuditResource.USER,
      resourceId: params.newUserId,
      newValue: {
        email: params.email,
        role: params.role,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }

  /**
   * Delete user with audit logging
   * Requirement 15.3: Log admin actions (deletions)
   */
  deleteUser(params: {
    schoolId: string
    adminUserId: string
    deletedUserId: string
    deletedUserEmail: string
    deletedUserRole: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.USER_DELETED,
      resource: AuditResource.USER,
      resourceId: params.deletedUserId,
      previousValue: {
        email: params.deletedUserEmail,
        role: params.deletedUserRole,
      },
      newValue: {
        deleted: true,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }

  /**
   * Change user role with audit logging
   * Requirement 15.3: Log admin actions (role changes)
   */
  changeRole(params: {
    schoolId: string
    adminUserId: string
    targetUserId: string
    previousRole: string
    newRole: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.ROLE_CHANGED,
      resource: AuditResource.USER,
      resourceId: params.targetUserId,
      previousValue: {
        role: params.previousRole,
      },
      newValue: {
        role: params.newRole,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }

  /**
   * Enroll student with audit logging
   * Requirement 15.3: Log admin actions
   */
  enrollStudent(params: {
    schoolId: string
    userId: string
    studentId: string
    admissionNumber: string
    firstName: string
    lastName: string
    classId: string
    ipAddress?: string
    userAgent?: string
  }): { success: boolean; auditLogId: string } {
    const auditLog = this.auditStore.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.STUDENT_ENROLLED,
      resource: AuditResource.STUDENT,
      resourceId: params.studentId,
      newValue: {
        admissionNumber: params.admissionNumber,
        firstName: params.firstName,
        lastName: params.lastName,
        classId: params.classId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
    return { success: true, auditLogId: auditLog.id }
  }
}

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

const schoolIdArb = fc.uuid()
const userIdArb = fc.uuid()
const resourceIdArb = fc.uuid()
const ipAddressArb = fc.ipV4()
const userAgentArb = fc.constantFrom(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Mozilla/5.0 (Linux; Android 10)',
  undefined
)

const paymentMethodArb: fc.Arbitrary<PaymentMethod> = fc.constantFrom('CASH', 'MOBILE_MONEY', 'BANK')

const roleArb = fc.constantFrom(
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'DEPUTY',
  'TEACHER',
  'ACCOUNTANT',
  'STUDENT',
  'PARENT'
)

const emailArb = fc.emailAddress()

const paymentParamsArb = fc.record({
  schoolId: schoolIdArb,
  userId: userIdArb,
  paymentId: resourceIdArb,
  studentId: resourceIdArb,
  amount: fc.integer({ min: 1, max: 10000000 }),
  method: paymentMethodArb,
  reference: fc.string({ minLength: 5, maxLength: 20 }),
  receiptNumber: fc.string({ minLength: 5, maxLength: 15 }),
  termId: resourceIdArb,
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const marksEntryParamsArb = fc.record({
  schoolId: schoolIdArb,
  teacherId: userIdArb,
  examId: resourceIdArb,
  studentId: resourceIdArb,
  subjectId: resourceIdArb,
  score: fc.integer({ min: 0, max: 100 }),
  maxScore: fc.constant(100),
  grade: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', undefined),
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const marksUpdateParamsArb = fc.record({
  schoolId: schoolIdArb,
  teacherId: userIdArb,
  examId: resourceIdArb,
  studentId: resourceIdArb,
  subjectId: resourceIdArb,
  previousScore: fc.integer({ min: 0, max: 100 }),
  newScore: fc.integer({ min: 0, max: 100 }),
  maxScore: fc.constant(100),
  previousGrade: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', undefined),
  newGrade: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', undefined),
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const userCreationParamsArb = fc.record({
  schoolId: schoolIdArb,
  adminUserId: userIdArb,
  newUserId: resourceIdArb,
  email: emailArb,
  role: roleArb,
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const userDeletionParamsArb = fc.record({
  schoolId: schoolIdArb,
  adminUserId: userIdArb,
  deletedUserId: resourceIdArb,
  deletedUserEmail: emailArb,
  deletedUserRole: roleArb,
  reason: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const roleChangeParamsArb = fc.record({
  schoolId: schoolIdArb,
  adminUserId: userIdArb,
  targetUserId: resourceIdArb,
  previousRole: roleArb,
  newRole: roleArb,
  reason: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

const studentEnrollmentParamsArb = fc.record({
  schoolId: schoolIdArb,
  userId: userIdArb,
  studentId: resourceIdArb,
  admissionNumber: fc.string({ minLength: 5, maxLength: 10 }),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  classId: resourceIdArb,
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 15: Audit Trail Completeness', () => {
  /**
   * **Feature: school-office, Property 15: Audit Trail Completeness**
   * **Validates: Requirements 7.5, 15.1, 15.2, 15.3**
   * 
   * For any marks entry, financial transaction, or admin action, an audit log entry 
   * SHALL be created with user ID, timestamp, and action details.
   */

  describe('Requirement 15.1: Financial Transaction Audit Logging', () => {
    it('should create audit log with user ID, timestamp, and details for every payment recorded', () => {
      fc.assert(
        fc.property(paymentParamsArb, (params) => {
          const auditStore = new AuditStore()
          const financeService = new FinanceServiceWithAudit(auditStore)

          // Record a payment
          const result = financeService.recordPayment(params)

          // Verify audit log was created
          expect(result.success).toBe(true)
          expect(result.auditLogId).toBeDefined()

          // Get the audit log
          const logs = auditStore.getAllLogs()
          expect(logs.length).toBe(1)

          const auditLog = logs[0]

          // Verify required fields per Property 15
          expect(auditLog.userId).toBe(params.userId)
          expect(auditLog.timestamp).toBeInstanceOf(Date)
          expect(auditLog.action).toBe(AuditAction.PAYMENT_RECORDED)
          expect(auditLog.resource).toBe(AuditResource.PAYMENT)
          expect(auditLog.resourceId).toBe(params.paymentId)
          expect(auditLog.schoolId).toBe(params.schoolId)

          // Verify action details are captured
          expect(auditLog.newValue).toBeDefined()
          expect(auditLog.newValue?.studentId).toBe(params.studentId)
          expect(auditLog.newValue?.amount).toBe(params.amount)
          expect(auditLog.newValue?.method).toBe(params.method)
        }),
        { numRuns: 20 }
      )
    })

    it('should capture previous and new values for payment updates', () => {
      fc.assert(
        fc.property(
          fc.record({
            schoolId: schoolIdArb,
            userId: userIdArb,
            paymentId: resourceIdArb,
            previousAmount: fc.integer({ min: 1, max: 5000000 }),
            newAmount: fc.integer({ min: 1, max: 5000000 }),
            previousMethod: paymentMethodArb,
            newMethod: paymentMethodArb,
            ipAddress: ipAddressArb,
            userAgent: userAgentArb,
          }),
          (params) => {
            const auditStore = new AuditStore()
            const financeService = new FinanceServiceWithAudit(auditStore)

            // Update a payment
            const result = financeService.updatePayment(params)

            expect(result.success).toBe(true)

            const logs = auditStore.getAllLogs()
            const auditLog = logs[0]

            // Verify previous and new values are captured (Requirement 15.2 pattern)
            expect(auditLog.previousValue).toBeDefined()
            expect(auditLog.previousValue?.amount).toBe(params.previousAmount)
            expect(auditLog.previousValue?.method).toBe(params.previousMethod)

            expect(auditLog.newValue).toBeDefined()
            expect(auditLog.newValue?.amount).toBe(params.newAmount)
            expect(auditLog.newValue?.method).toBe(params.newMethod)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Requirement 7.5 & 15.2: Academic Data Modification Audit Logging', () => {
    it('should create audit log with teacher ID and timestamp for every marks entry', () => {
      fc.assert(
        fc.property(marksEntryParamsArb, (params) => {
          const auditStore = new AuditStore()
          const examService = new ExaminationServiceWithAudit(auditStore)

          // Enter marks
          const result = examService.enterMarks(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          expect(logs.length).toBe(1)

          const auditLog = logs[0]

          // Verify required fields per Requirement 7.5
          expect(auditLog.userId).toBe(params.teacherId) // Teacher ID
          expect(auditLog.timestamp).toBeInstanceOf(Date) // Timestamp
          expect(auditLog.action).toBe(AuditAction.MARKS_ENTERED)
          expect(auditLog.resource).toBe(AuditResource.MARK)

          // Verify action details
          expect(auditLog.newValue).toBeDefined()
          expect(auditLog.newValue?.score).toBe(params.score)
          expect(auditLog.newValue?.examId).toBe(params.examId)
          expect(auditLog.newValue?.studentId).toBe(params.studentId)
          expect(auditLog.newValue?.subjectId).toBe(params.subjectId)
        }),
        { numRuns: 20 }
      )
    })

    it('should capture previous and new values for marks updates', () => {
      fc.assert(
        fc.property(marksUpdateParamsArb, (params) => {
          const auditStore = new AuditStore()
          const examService = new ExaminationServiceWithAudit(auditStore)

          // Update marks
          const result = examService.updateMarks(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          const auditLog = logs[0]

          // Verify previous and new values are captured (Requirement 15.2)
          expect(auditLog.previousValue).toBeDefined()
          expect(auditLog.previousValue?.score).toBe(params.previousScore)

          expect(auditLog.newValue).toBeDefined()
          expect(auditLog.newValue?.score).toBe(params.newScore)

          // Verify the change is logged with modifier (teacher)
          expect(auditLog.userId).toBe(params.teacherId)
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Requirement 15.3: Admin Action Audit Logging', () => {
    it('should create audit log for user creation', () => {
      fc.assert(
        fc.property(userCreationParamsArb, (params) => {
          const auditStore = new AuditStore()
          const adminService = new AdminServiceWithAudit(auditStore)

          // Create user
          const result = adminService.createUser(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          expect(logs.length).toBe(1)

          const auditLog = logs[0]

          // Verify required fields
          expect(auditLog.userId).toBe(params.adminUserId)
          expect(auditLog.timestamp).toBeInstanceOf(Date)
          expect(auditLog.action).toBe(AuditAction.USER_CREATED)
          expect(auditLog.resource).toBe(AuditResource.USER)
          expect(auditLog.resourceId).toBe(params.newUserId)

          // Verify full details are logged
          expect(auditLog.newValue).toBeDefined()
          expect(auditLog.newValue?.email).toBe(params.email)
          expect(auditLog.newValue?.role).toBe(params.role)
        }),
        { numRuns: 20 }
      )
    })

    it('should create audit log for user deletion with full details', () => {
      fc.assert(
        fc.property(userDeletionParamsArb, (params) => {
          const auditStore = new AuditStore()
          const adminService = new AdminServiceWithAudit(auditStore)

          // Delete user
          const result = adminService.deleteUser(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          const auditLog = logs[0]

          // Verify deletion is logged with full details
          expect(auditLog.action).toBe(AuditAction.USER_DELETED)
          expect(auditLog.previousValue).toBeDefined()
          expect(auditLog.previousValue?.email).toBe(params.deletedUserEmail)
          expect(auditLog.previousValue?.role).toBe(params.deletedUserRole)
          expect(auditLog.newValue?.deleted).toBe(true)
        }),
        { numRuns: 20 }
      )
    })

    it('should create audit log for role changes with previous and new values', () => {
      fc.assert(
        fc.property(roleChangeParamsArb, (params) => {
          const auditStore = new AuditStore()
          const adminService = new AdminServiceWithAudit(auditStore)

          // Change role
          const result = adminService.changeRole(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          const auditLog = logs[0]

          // Verify role change is logged with previous and new values
          expect(auditLog.action).toBe(AuditAction.ROLE_CHANGED)
          expect(auditLog.previousValue?.role).toBe(params.previousRole)
          expect(auditLog.newValue?.role).toBe(params.newRole)
        }),
        { numRuns: 20 }
      )
    })

    it('should create audit log for student enrollment', () => {
      fc.assert(
        fc.property(studentEnrollmentParamsArb, (params) => {
          const auditStore = new AuditStore()
          const adminService = new AdminServiceWithAudit(auditStore)

          // Enroll student
          const result = adminService.enrollStudent(params)

          expect(result.success).toBe(true)

          const logs = auditStore.getAllLogs()
          const auditLog = logs[0]

          // Verify enrollment is logged
          expect(auditLog.action).toBe(AuditAction.STUDENT_ENROLLED)
          expect(auditLog.resource).toBe(AuditResource.STUDENT)
          expect(auditLog.resourceId).toBe(params.studentId)
          expect(auditLog.newValue?.admissionNumber).toBe(params.admissionNumber)
          expect(auditLog.newValue?.firstName).toBe(params.firstName)
          expect(auditLog.newValue?.lastName).toBe(params.lastName)
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Cross-cutting: Audit Log Completeness Invariants', () => {
    it('should always include schoolId, userId, timestamp, action, resource, and resourceId', () => {
      // Test with a mix of different action types
      const actionArb = fc.oneof(
        paymentParamsArb.map(p => ({ type: 'payment' as const, params: p })),
        marksEntryParamsArb.map(p => ({ type: 'marks' as const, params: p })),
        userCreationParamsArb.map(p => ({ type: 'user' as const, params: p })),
        studentEnrollmentParamsArb.map(p => ({ type: 'student' as const, params: p }))
      )

      fc.assert(
        fc.property(actionArb, ({ type, params }) => {
          const auditStore = new AuditStore()

          // Execute the action based on type
          if (type === 'payment') {
            const service = new FinanceServiceWithAudit(auditStore)
            service.recordPayment(params as Parameters<typeof service.recordPayment>[0])
          } else if (type === 'marks') {
            const service = new ExaminationServiceWithAudit(auditStore)
            service.enterMarks(params as Parameters<typeof service.enterMarks>[0])
          } else if (type === 'user') {
            const service = new AdminServiceWithAudit(auditStore)
            service.createUser(params as Parameters<typeof service.createUser>[0])
          } else if (type === 'student') {
            const service = new AdminServiceWithAudit(auditStore)
            service.enrollStudent(params as Parameters<typeof service.enrollStudent>[0])
          }

          const logs = auditStore.getAllLogs()
          expect(logs.length).toBe(1)

          const auditLog = logs[0]

          // Property 15: Every audit log MUST have these required fields
          expect(auditLog.id).toBeDefined()
          expect(auditLog.schoolId).toBeDefined()
          expect(typeof auditLog.schoolId).toBe('string')
          expect(auditLog.userId).toBeDefined()
          expect(typeof auditLog.userId).toBe('string')
          expect(auditLog.timestamp).toBeInstanceOf(Date)
          expect(auditLog.action).toBeDefined()
          expect(typeof auditLog.action).toBe('string')
          expect(auditLog.resource).toBeDefined()
          expect(typeof auditLog.resource).toBe('string')
          expect(auditLog.resourceId).toBeDefined()
          expect(typeof auditLog.resourceId).toBe('string')
        }),
        { numRuns: 20 }
      )
    })

    it('should be queryable by user ID', () => {
      fc.assert(
        fc.property(
          fc.array(paymentParamsArb, { minLength: 2, maxLength: 10 }),
          (paymentsList) => {
            const auditStore = new AuditStore()
            const financeService = new FinanceServiceWithAudit(auditStore)

            // Record multiple payments
            for (const params of paymentsList) {
              financeService.recordPayment(params)
            }

            // Query by a specific user
            const targetUserId = paymentsList[0].userId
            const userLogs = auditStore.getAuditLogs({ userId: targetUserId })

            // All returned logs should belong to that user
            for (const log of userLogs) {
              expect(log.userId).toBe(targetUserId)
            }

            // Count should match
            const expectedCount = paymentsList.filter(p => p.userId === targetUserId).length
            expect(userLogs.length).toBe(expectedCount)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should be queryable by resource', () => {
      fc.assert(
        fc.property(
          fc.record({
            paymentParams: paymentParamsArb,
            marksParams: marksEntryParamsArb,
            userParams: userCreationParamsArb,
          }),
          ({ paymentParams, marksParams, userParams }) => {
            const auditStore = new AuditStore()

            // Create different types of audit logs
            const financeService = new FinanceServiceWithAudit(auditStore)
            const examService = new ExaminationServiceWithAudit(auditStore)
            const adminService = new AdminServiceWithAudit(auditStore)

            financeService.recordPayment(paymentParams)
            examService.enterMarks(marksParams)
            adminService.createUser(userParams)

            // Query by resource type
            const paymentLogs = auditStore.getAuditLogs({ resource: AuditResource.PAYMENT })
            const markLogs = auditStore.getAuditLogs({ resource: AuditResource.MARK })
            const userLogs = auditStore.getAuditLogs({ resource: AuditResource.USER })

            expect(paymentLogs.length).toBe(1)
            expect(paymentLogs[0].resource).toBe(AuditResource.PAYMENT)

            expect(markLogs.length).toBe(1)
            expect(markLogs[0].resource).toBe(AuditResource.MARK)

            expect(userLogs.length).toBe(1)
            expect(userLogs[0].resource).toBe(AuditResource.USER)
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
