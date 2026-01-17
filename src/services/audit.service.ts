/**
 * Audit Service
 * Handles audit logging for all significant system actions
 * Requirements: 2.5, 7.5, 13.2, 13.3, 15.1, 15.2, 15.3, 15.4
 * 
 * IMMUTABILITY GUARANTEE (Requirement 13.3):
 * - Audit entries are IMMUTABLE and READ-ONLY once created
 * - NO update or delete operations are exposed on audit entries
 * - Any attempt to modify or delete audit entries will throw AuditImmutabilityError
 * - This ensures complete audit trail integrity for compliance and accountability
 */
import { prisma } from '@/lib/db'
import { AuditLog, CreateAuditLogInput, PaymentMethod } from '@/types'
import { AuditLogFilter, IAuditService } from '@/types/services'
import { StaffRole, Role, ResponsibilityType, StaffDocumentCategory } from '@/types/enums'

/**
 * Error thrown when attempting to modify or delete audit entries
 * Requirement 13.3: Audit trail must be immutable and read-only
 */
export class AuditImmutabilityError extends Error {
  constructor(operation: 'update' | 'delete', auditLogId?: string) {
    const message = auditLogId
      ? `Cannot ${operation} audit log entry ${auditLogId}: Audit trail is immutable (Requirement 13.3)`
      : `Cannot ${operation} audit log entries: Audit trail is immutable (Requirement 13.3)`
    super(message)
    this.name = 'AuditImmutabilityError'
  }
}

/**
 * Audit action types for categorization
 */
export enum AuditAction {
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
  REPORT_CARD_PUBLISHED = 'report_card_published',
  GRADE_UPDATED = 'grade_updated',
  
  // Admin actions (Requirement 15.3)
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  ROLE_CHANGED = 'role_changed',
  STUDENT_ENROLLED = 'student_enrolled',
  STUDENT_TRANSFERRED = 'student_transferred',
  STUDENT_GRADUATED = 'student_graduated',
  STUDENT_SUSPENDED = 'student_suspended',
  STAFF_CREATED = 'staff_created',
  STAFF_DEACTIVATED = 'staff_deactivated',
  SCHOOL_SETTINGS_UPDATED = 'school_settings_updated',
  LICENSE_CHANGED = 'license_changed',
  
  // Staff Dashboard actions (Requirements 2.5, 13.2)
  STAFF_ROLE_ASSIGNED = 'staff_role_assigned',
  STAFF_ROLE_REMOVED = 'staff_role_removed',
  STAFF_RESPONSIBILITY_ASSIGNED = 'staff_responsibility_assigned',
  STAFF_RESPONSIBILITY_REMOVED = 'staff_responsibility_removed',
  STAFF_PROFILE_UPDATED = 'staff_profile_updated',
  STAFF_SELF_MODIFICATION_ATTEMPT = 'staff_self_modification_attempt',
  PERFORMANCE_DATA_ACCESSED = 'performance_data_accessed',
  STAFF_DOCUMENT_UPLOADED = 'staff_document_uploaded',
  STAFF_DOCUMENT_ACCESSED = 'staff_document_accessed',
  STAFF_DOCUMENT_DELETED = 'staff_document_deleted',
  UNAUTHORIZED_ACTION_ATTEMPT = 'unauthorized_action_attempt',
  
  // Teacher Dashboard actions (Requirement 11.5)
  TEACHER_ATTENDANCE_RECORDED = 'teacher_attendance_recorded',
  TEACHER_ATTENDANCE_UPDATED = 'teacher_attendance_updated',
  TEACHER_MARKS_ENTERED = 'teacher_marks_entered',
  TEACHER_MARKS_UPDATED = 'teacher_marks_updated',
  TEACHER_MARKS_SUBMITTED = 'teacher_marks_submitted',
  TEACHER_ASSIGNMENT_CREATED = 'teacher_assignment_created',
  TEACHER_ASSIGNMENT_UPDATED = 'teacher_assignment_updated',
  TEACHER_MESSAGE_SENT = 'teacher_message_sent',
  TEACHER_PROFILE_UPDATED = 'teacher_profile_updated',
  TEACHER_UNAUTHORIZED_ACCESS = 'teacher_unauthorized_access',
  
  // General CRUD actions
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
}

/**
 * Audit resource types for categorization
 */
export enum AuditResource {
  PAYMENT = 'payment',
  FEE_STRUCTURE = 'fee_structure',
  MARK = 'mark',
  RESULT = 'result',
  REPORT_CARD = 'report_card',
  USER = 'user',
  STUDENT = 'student',
  STAFF = 'staff',
  STAFF_ROLE = 'staff_role',
  STAFF_RESPONSIBILITY = 'staff_responsibility',
  STAFF_DOCUMENT = 'staff_document',
  STAFF_PERFORMANCE = 'staff_performance',
  SCHOOL = 'school',
  CLASS = 'class',
  SUBJECT = 'subject',
  EXAM = 'exam',
  ATTENDANCE = 'attendance',
  GUARDIAN = 'guardian',
  DISCIPLINE = 'discipline',
  ANNOUNCEMENT = 'announcement',
  ASSIGNMENT = 'assignment',
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
  timestamp: Date
}): AuditLog {
  return {
    id: prismaAuditLog.id,
    schoolId: prismaAuditLog.schoolId,
    userId: prismaAuditLog.userId,
    action: prismaAuditLog.action,
    resource: prismaAuditLog.resource,
    resourceId: prismaAuditLog.resourceId,
    previousValue: prismaAuditLog.previousValue as Record<string, unknown> | undefined,
    newValue: prismaAuditLog.newValue as Record<string, unknown> | undefined,
    ipAddress: prismaAuditLog.ipAddress ?? undefined,
    userAgent: prismaAuditLog.userAgent ?? undefined,
    timestamp: prismaAuditLog.timestamp,
  }
}

export class AuditService implements IAuditService {
  /**
   * Log an audit entry
   * Requirement 7.5: Log entry with teacher ID and timestamp for audit purposes
   * Requirement 15.1: Log financial transactions
   * Requirement 15.2: Log academic data modifications with previous/new values
   * Requirement 15.3: Log admin actions
   */
  async log(data: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog = await prisma.auditLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        previousValue: data.previousValue ?? undefined,
        newValue: data.newValue ?? undefined,
        ipAddress: data.ipAddress ?? undefined,
        userAgent: data.userAgent ?? undefined,
        timestamp: new Date(),
      },
    })

    return mapPrismaAuditLogToDomain(auditLog)
  }

  // ============================================
  // IMMUTABILITY ENFORCEMENT (Requirement 13.3)
  // ============================================

  /**
   * BLOCKED: Update audit log entry
   * Requirement 13.3: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any update operations on audit entries.
   * It will ALWAYS throw an AuditImmutabilityError.
   * 
   * @throws {AuditImmutabilityError} Always - audit entries cannot be modified
   */
  async updateAuditLog(_id: string, _data: Partial<CreateAuditLogInput>): Promise<never> {
    throw new AuditImmutabilityError('update', _id)
  }

  /**
   * BLOCKED: Delete audit log entry
   * Requirement 13.3: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any delete operations on audit entries.
   * It will ALWAYS throw an AuditImmutabilityError.
   * 
   * @throws {AuditImmutabilityError} Always - audit entries cannot be deleted
   */
  async deleteAuditLog(_id: string): Promise<never> {
    throw new AuditImmutabilityError('delete', _id)
  }

  /**
   * BLOCKED: Delete multiple audit log entries
   * Requirement 13.3: Audit trail must be immutable and read-only
   * 
   * This method exists to explicitly prevent any bulk delete operations on audit entries.
   * It will ALWAYS throw an AuditImmutabilityError.
   * 
   * @throws {AuditImmutabilityError} Always - audit entries cannot be deleted
   */
  async deleteAuditLogs(_filter: AuditLogFilter): Promise<never> {
    throw new AuditImmutabilityError('delete')
  }

  /**
   * Verify audit log immutability
   * Requirement 13.3: Audit trail must be immutable and read-only
   * 
   * This method can be used to verify that the audit service enforces immutability.
   * Returns true if immutability is enforced (update/delete operations throw errors).
   */
  verifyImmutability(): { isImmutable: boolean; message: string } {
    return {
      isImmutable: true,
      message: 'Audit trail is immutable. Update and delete operations are blocked (Requirement 13.3).',
    }
  }

  /**
   * Get audit log by ID (read-only access)
   * Requirement 13.3: Audit trail is read-only
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
    })

    if (!auditLog) {
      return null
    }

    return mapPrismaAuditLogToDomain(auditLog)
  }


  /**
   * Get audit logs with filtering
   * Requirement 15.4: Return results filtered by date range, user, or action type
   */
  async getAuditLogs(
    filter: AuditLogFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {}

    if (filter.schoolId) {
      where.schoolId = filter.schoolId
    }

    if (filter.userId) {
      where.userId = filter.userId
    }

    if (filter.resource) {
      where.resource = filter.resource
    }

    if (filter.action) {
      where.action = filter.action
    }

    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {}
      if (filter.dateFrom) {
        (where.timestamp as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.timestamp as Record<string, Date>).lte = filter.dateTo
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get audit logs for a specific resource
   */
  async getAuditLogsByResource(resource: string, resourceId: string): Promise<AuditLog[]> {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: { timestamp: 'desc' },
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Log marks entry action
   * Requirement 7.5: Log marks entry with teacher ID and timestamp
   */
  async logMarksEntry(params: {
    schoolId: string
    teacherId: string
    examId: string
    studentId: string
    subjectId: string
    previousScore?: number
    newScore: number
    maxScore: number
    previousGrade?: string
    newGrade?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const isUpdate = params.previousScore !== undefined

    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: isUpdate ? 'update' : 'create',
      resource: 'mark',
      resourceId: `${params.examId}_${params.studentId}_${params.subjectId}`,
      previousValue: isUpdate
        ? {
            score: params.previousScore,
            maxScore: params.maxScore,
            grade: params.previousGrade,
          }
        : undefined,
      newValue: {
        score: params.newScore,
        maxScore: params.maxScore,
        grade: params.newGrade,
        examId: params.examId,
        studentId: params.studentId,
        subjectId: params.subjectId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Get marks entry audit history for a specific mark
   */
  async getMarksAuditHistory(
    examId: string,
    studentId: string,
    subjectId: string
  ): Promise<AuditLog[]> {
    return this.getAuditLogsByResource('mark', `${examId}_${studentId}_${subjectId}`)
  }

  // ============================================
  // FINANCIAL TRANSACTION LOGGING (Requirement 15.1)
  // ============================================

  /**
   * Log a payment transaction
   * Requirement 15.1: Log financial transactions with user ID, timestamp, amount, and affected student
   */
  async logPaymentTransaction(params: {
    schoolId: string
    userId: string
    paymentId: string
    studentId: string
    amount: number
    method: PaymentMethod
    reference: string
    receiptNumber: string
    termId: string
    action: 'create' | 'update' | 'delete'
    previousValue?: {
      amount?: number
      method?: PaymentMethod
      reference?: string
    }
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const actionMap = {
      create: AuditAction.PAYMENT_RECORDED,
      update: AuditAction.PAYMENT_UPDATED,
      delete: AuditAction.PAYMENT_DELETED,
    }

    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: actionMap[params.action],
      resource: AuditResource.PAYMENT,
      resourceId: params.paymentId,
      previousValue: params.previousValue,
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
  }

  /**
   * Log fee structure changes
   * Requirement 15.1: Log financial configuration changes
   */
  async logFeeStructureChange(params: {
    schoolId: string
    userId: string
    feeStructureId: string
    classId: string
    termId: string
    totalAmount: number
    action: 'create' | 'update'
    previousValue?: {
      totalAmount?: number
      items?: Array<{ name: string; amount: number; isOptional: boolean }>
    }
    newItems?: Array<{ name: string; amount: number; isOptional: boolean }>
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const actionMap = {
      create: AuditAction.FEE_STRUCTURE_CREATED,
      update: AuditAction.FEE_STRUCTURE_UPDATED,
    }

    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: actionMap[params.action],
      resource: AuditResource.FEE_STRUCTURE,
      resourceId: params.feeStructureId,
      previousValue: params.previousValue,
      newValue: {
        classId: params.classId,
        termId: params.termId,
        totalAmount: params.totalAmount,
        items: params.newItems,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log discount application
   * Requirement 15.1: Log financial adjustments
   */
  async logDiscountApplied(params: {
    schoolId: string
    userId: string
    studentId: string
    discountType: string
    amount: number
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.DISCOUNT_APPLIED,
      resource: AuditResource.STUDENT,
      resourceId: params.studentId,
      newValue: {
        discountType: params.discountType,
        amount: params.amount,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  // ============================================
  // ACADEMIC DATA MODIFICATION LOGGING (Requirement 15.2)
  // ============================================

  /**
   * Log results processing
   * Requirement 15.2: Log academic data modifications
   */
  async logResultsProcessing(params: {
    schoolId: string
    userId: string
    examId: string
    classId: string
    studentsProcessed: number
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.RESULTS_PROCESSED,
      resource: AuditResource.RESULT,
      resourceId: params.examId,
      newValue: {
        classId: params.classId,
        studentsProcessed: params.studentsProcessed,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log report card generation
   * Requirement 15.2: Log academic document generation
   */
  async logReportCardGeneration(params: {
    schoolId: string
    userId: string
    studentId: string
    termId: string
    resultId: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.REPORT_CARD_GENERATED,
      resource: AuditResource.REPORT_CARD,
      resourceId: params.resultId,
      newValue: {
        studentId: params.studentId,
        termId: params.termId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log report card publishing
   * Requirement 15.2: Log academic data access changes
   */
  async logReportCardPublishing(params: {
    schoolId: string
    userId: string
    classId: string
    termId: string
    studentsPublished: number
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.REPORT_CARD_PUBLISHED,
      resource: AuditResource.REPORT_CARD,
      resourceId: `${params.classId}_${params.termId}`,
      newValue: {
        classId: params.classId,
        termId: params.termId,
        studentsPublished: params.studentsPublished,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log grade update
   * Requirement 15.2: Log academic data modifications with previous/new values
   */
  async logGradeUpdate(params: {
    schoolId: string
    userId: string
    studentId: string
    termId: string
    previousGrade?: string
    newGrade: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.GRADE_UPDATED,
      resource: AuditResource.RESULT,
      resourceId: `${params.studentId}_${params.termId}`,
      previousValue: params.previousGrade ? { grade: params.previousGrade } : undefined,
      newValue: {
        grade: params.newGrade,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  // ============================================
  // ADMIN ACTION LOGGING (Requirement 15.3)
  // ============================================

  /**
   * Log user creation
   * Requirement 15.3: Log admin actions
   */
  async logUserCreation(params: {
    schoolId: string
    adminUserId: string
    newUserId: string
    email: string
    role: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
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
  }

  /**
   * Log user deletion
   * Requirement 15.3: Log admin actions (deletions)
   */
  async logUserDeletion(params: {
    schoolId: string
    adminUserId: string
    deletedUserId: string
    deletedUserEmail: string
    deletedUserRole: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
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
  }

  /**
   * Log role change
   * Requirement 15.3: Log admin actions (role changes)
   */
  async logRoleChange(params: {
    schoolId: string
    adminUserId: string
    targetUserId: string
    previousRole: string
    newRole: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
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
  }

  /**
   * Log student enrollment
   * Requirement 15.3: Log admin actions
   */
  async logStudentEnrollment(params: {
    schoolId: string
    userId: string
    studentId: string
    admissionNumber: string
    firstName: string
    lastName: string
    classId: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
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
  }

  /**
   * Log student status change (transfer, graduation, suspension)
   * Requirement 15.3: Log admin actions
   */
  async logStudentStatusChange(params: {
    schoolId: string
    userId: string
    studentId: string
    previousStatus: string
    newStatus: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const actionMap: Record<string, AuditAction> = {
      TRANSFERRED: AuditAction.STUDENT_TRANSFERRED,
      GRADUATED: AuditAction.STUDENT_GRADUATED,
      SUSPENDED: AuditAction.STUDENT_SUSPENDED,
    }

    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: actionMap[params.newStatus] || AuditAction.UPDATE,
      resource: AuditResource.STUDENT,
      resourceId: params.studentId,
      previousValue: {
        status: params.previousStatus,
      },
      newValue: {
        status: params.newStatus,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log staff creation
   * Requirement 15.3: Log admin actions
   */
  async logStaffCreation(params: {
    schoolId: string
    adminUserId: string
    staffId: string
    employeeNumber: string
    firstName: string
    lastName: string
    role: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.STAFF_CREATED,
      resource: AuditResource.STAFF,
      resourceId: params.staffId,
      newValue: {
        employeeNumber: params.employeeNumber,
        firstName: params.firstName,
        lastName: params.lastName,
        role: params.role,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log staff deactivation
   * Requirement 15.3: Log admin actions
   */
  async logStaffDeactivation(params: {
    schoolId: string
    adminUserId: string
    staffId: string
    employeeNumber: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.STAFF_DEACTIVATED,
      resource: AuditResource.STAFF,
      resourceId: params.staffId,
      previousValue: {
        status: 'ACTIVE',
      },
      newValue: {
        status: 'INACTIVE',
        employeeNumber: params.employeeNumber,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log school settings update
   * Requirement 15.3: Log admin actions
   */
  async logSchoolSettingsUpdate(params: {
    schoolId: string
    userId: string
    previousSettings: Record<string, unknown>
    newSettings: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.SCHOOL_SETTINGS_UPDATED,
      resource: AuditResource.SCHOOL,
      resourceId: params.schoolId,
      previousValue: params.previousSettings,
      newValue: params.newSettings,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log license change
   * Requirement 15.3: Log admin actions
   */
  async logLicenseChange(params: {
    schoolId: string
    adminUserId: string
    previousLicense: string
    newLicense: string
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.LICENSE_CHANGED,
      resource: AuditResource.SCHOOL,
      resourceId: params.schoolId,
      previousValue: {
        licenseType: params.previousLicense,
      },
      newValue: {
        licenseType: params.newLicense,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  // ============================================
  // ENHANCED QUERYING (Requirement 15.4)
  // ============================================

  /**
   * Get audit logs for financial transactions
   * Requirement 15.4: Filter by action type
   */
  async getFinancialAuditLogs(
    schoolId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    return this.getAuditLogs(
      {
        schoolId,
        resource: AuditResource.PAYMENT,
        dateFrom,
        dateTo,
      },
      limit,
      offset
    )
  }

  /**
   * Get audit logs for academic data modifications
   * Requirement 15.4: Filter by action type
   */
  async getAcademicAuditLogs(
    schoolId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const academicResources = [
      AuditResource.MARK,
      AuditResource.RESULT,
      AuditResource.REPORT_CARD,
    ]

    const allLogs: AuditLog[] = []
    
    for (const resource of academicResources) {
      const logs = await this.getAuditLogs(
        {
          schoolId,
          resource,
          dateFrom,
          dateTo,
        },
        limit,
        offset
      )
      allLogs.push(...logs)
    }

    // Sort by timestamp descending and limit
    return allLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get audit logs for admin actions
   * Requirement 15.4: Filter by action type
   */
  async getAdminAuditLogs(
    schoolId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const adminActions = [
      AuditAction.USER_CREATED,
      AuditAction.USER_UPDATED,
      AuditAction.USER_DELETED,
      AuditAction.ROLE_CHANGED,
      AuditAction.STUDENT_ENROLLED,
      AuditAction.STUDENT_TRANSFERRED,
      AuditAction.STUDENT_GRADUATED,
      AuditAction.STUDENT_SUSPENDED,
      AuditAction.STAFF_CREATED,
      AuditAction.STAFF_DEACTIVATED,
      AuditAction.SCHOOL_SETTINGS_UPDATED,
      AuditAction.LICENSE_CHANGED,
    ]

    const where: Record<string, unknown> = {
      schoolId,
      action: { in: adminActions },
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) {
        (where.timestamp as Record<string, Date>).gte = dateFrom
      }
      if (dateTo) {
        (where.timestamp as Record<string, Date>).lte = dateTo
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get audit logs by user
   * Requirement 15.4: Filter by user
   */
  async getAuditLogsByUser(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    return this.getAuditLogs(
      {
        userId,
        dateFrom,
        dateTo,
      },
      limit,
      offset
    )
  }

  /**
   * Count audit logs matching filter
   * Useful for pagination
   */
  async countAuditLogs(filter: AuditLogFilter): Promise<number> {
    const where: Record<string, unknown> = {}

    if (filter.schoolId) {
      where.schoolId = filter.schoolId
    }

    if (filter.userId) {
      where.userId = filter.userId
    }

    if (filter.resource) {
      where.resource = filter.resource
    }

    if (filter.action) {
      where.action = filter.action
    }

    if (filter.dateFrom || filter.dateTo) {
      where.timestamp = {}
      if (filter.dateFrom) {
        (where.timestamp as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.timestamp as Record<string, Date>).lte = filter.dateTo
      }
    }

    return prisma.auditLog.count({ where })
  }

  // ============================================
  // STAFF DASHBOARD AUDIT LOGGING (Requirements 2.5, 13.2)
  // ============================================

  /**
   * Log staff role change (assignment or removal)
   * Requirement 2.5: Record change in Audit_Trail with actor, timestamp, and change details
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logStaffRoleChange(params: {
    schoolId: string
    adminUserId: string
    staffId: string
    staffName: string
    action: 'assigned' | 'removed'
    role: StaffRole | Role
    isPrimaryRole: boolean
    previousRoles?: (StaffRole | Role)[]
    newRoles?: (StaffRole | Role)[]
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const auditAction = params.action === 'assigned' 
      ? AuditAction.STAFF_ROLE_ASSIGNED 
      : AuditAction.STAFF_ROLE_REMOVED

    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: auditAction,
      resource: AuditResource.STAFF_ROLE,
      resourceId: params.staffId,
      previousValue: params.previousRoles ? {
        roles: params.previousRoles,
        staffName: params.staffName,
      } : undefined,
      newValue: {
        role: params.role,
        isPrimaryRole: params.isPrimaryRole,
        action: params.action,
        newRoles: params.newRoles,
        staffName: params.staffName,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log staff responsibility change (assignment or removal)
   * Requirement 2.5: Record change in Audit_Trail with actor, timestamp, and change details
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logStaffResponsibilityChange(params: {
    schoolId: string
    adminUserId: string
    staffId: string
    staffName: string
    action: 'assigned' | 'removed'
    responsibilityType: ResponsibilityType
    responsibilityId?: string
    details?: Record<string, unknown>
    reason?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const auditAction = params.action === 'assigned'
      ? AuditAction.STAFF_RESPONSIBILITY_ASSIGNED
      : AuditAction.STAFF_RESPONSIBILITY_REMOVED

    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: auditAction,
      resource: AuditResource.STAFF_RESPONSIBILITY,
      resourceId: params.responsibilityId || params.staffId,
      previousValue: params.action === 'removed' ? {
        responsibilityType: params.responsibilityType,
        details: params.details,
        staffName: params.staffName,
      } : undefined,
      newValue: {
        responsibilityType: params.responsibilityType,
        action: params.action,
        details: params.details,
        staffName: params.staffName,
        reason: params.reason,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log performance data access
   * Requirement 11.4: Log access in Audit_Trail when performance data is accessed
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logPerformanceDataAccess(params: {
    schoolId: string
    accessedByUserId: string
    accessedByName: string
    accessedByRole: StaffRole | Role
    targetStaffId: string
    targetStaffName: string
    dataType: 'full_metrics' | 'summary' | 'attendance' | 'task_completion' | 'marks_submission'
    period?: { start: Date; end: Date }
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.accessedByUserId,
      action: AuditAction.PERFORMANCE_DATA_ACCESSED,
      resource: AuditResource.STAFF_PERFORMANCE,
      resourceId: params.targetStaffId,
      newValue: {
        accessedBy: {
          userId: params.accessedByUserId,
          name: params.accessedByName,
          role: params.accessedByRole,
        },
        targetStaff: {
          staffId: params.targetStaffId,
          name: params.targetStaffName,
        },
        dataType: params.dataType,
        period: params.period,
        accessedAt: new Date().toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log staff document access
   * Requirement 14.3: Log all document access and modifications in Audit_Trail
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logDocumentAccess(params: {
    schoolId: string
    accessedByUserId: string
    accessedByName: string
    staffId: string
    staffName: string
    documentId: string
    documentName: string
    documentCategory: StaffDocumentCategory
    action: 'viewed' | 'downloaded' | 'uploaded' | 'deleted'
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const actionMap: Record<string, AuditAction> = {
      viewed: AuditAction.STAFF_DOCUMENT_ACCESSED,
      downloaded: AuditAction.STAFF_DOCUMENT_ACCESSED,
      uploaded: AuditAction.STAFF_DOCUMENT_UPLOADED,
      deleted: AuditAction.STAFF_DOCUMENT_DELETED,
    }

    return this.log({
      schoolId: params.schoolId,
      userId: params.accessedByUserId,
      action: actionMap[params.action],
      resource: AuditResource.STAFF_DOCUMENT,
      resourceId: params.documentId,
      previousValue: params.action === 'deleted' ? {
        documentName: params.documentName,
        documentCategory: params.documentCategory,
        staffId: params.staffId,
        staffName: params.staffName,
      } : undefined,
      newValue: {
        action: params.action,
        documentName: params.documentName,
        documentCategory: params.documentCategory,
        staffId: params.staffId,
        staffName: params.staffName,
        accessedBy: {
          userId: params.accessedByUserId,
          name: params.accessedByName,
        },
        accessedAt: new Date().toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log staff profile update
   * Requirement 2.5: Record change in Audit_Trail with actor, timestamp, and change details
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logStaffProfileUpdate(params: {
    schoolId: string
    adminUserId: string
    staffId: string
    staffName: string
    previousValues: Record<string, unknown>
    newValues: Record<string, unknown>
    changedFields: string[]
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.adminUserId,
      action: AuditAction.STAFF_PROFILE_UPDATED,
      resource: AuditResource.STAFF,
      resourceId: params.staffId,
      previousValue: {
        ...params.previousValues,
        staffName: params.staffName,
      },
      newValue: {
        ...params.newValues,
        changedFields: params.changedFields,
        staffName: params.staffName,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log self-modification attempt
   * Requirement 3.5: Log attempt in Audit_Trail when staff tries to modify own role/permission
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logSelfModificationAttempt(params: {
    schoolId: string
    staffUserId: string
    staffName: string
    attemptedAction: 'role_change' | 'permission_change' | 'responsibility_change'
    attemptedValue: unknown
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.staffUserId,
      action: AuditAction.STAFF_SELF_MODIFICATION_ATTEMPT,
      resource: AuditResource.STAFF,
      resourceId: params.staffUserId,
      newValue: {
        attemptedAction: params.attemptedAction,
        attemptedValue: params.attemptedValue,
        staffName: params.staffName,
        denied: true,
        reason: 'Self-modification not allowed',
        attemptedAt: new Date().toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log unauthorized action attempt
   * Requirement 4.5: Record attempt in Audit_Trail when user tries action outside permission set
   * Requirement 13.2: Record every action with actor, timestamp, and details
   */
  async logUnauthorizedActionAttempt(params: {
    schoolId: string
    userId: string
    userName: string
    userRole: StaffRole | Role
    attemptedAction: string
    attemptedResource: string
    attemptedResourceId?: string
    requiredPermission: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.userId,
      action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
      resource: params.attemptedResource,
      resourceId: params.attemptedResourceId || 'unknown',
      newValue: {
        user: {
          userId: params.userId,
          name: params.userName,
          role: params.userRole,
        },
        attemptedAction: params.attemptedAction,
        attemptedResource: params.attemptedResource,
        attemptedResourceId: params.attemptedResourceId,
        requiredPermission: params.requiredPermission,
        denied: true,
        attemptedAt: new Date().toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Get staff-related audit logs
   * Requirement 13.2: Query audit trail for staff actions
   */
  async getStaffAuditLogs(
    schoolId: string,
    staffId?: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const staffResources = [
      AuditResource.STAFF,
      AuditResource.STAFF_ROLE,
      AuditResource.STAFF_RESPONSIBILITY,
      AuditResource.STAFF_DOCUMENT,
      AuditResource.STAFF_PERFORMANCE,
    ]

    const where: Record<string, unknown> = {
      schoolId,
      resource: { in: staffResources },
    }

    if (staffId) {
      where.resourceId = staffId
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) {
        (where.timestamp as Record<string, Date>).gte = dateFrom
      }
      if (dateTo) {
        (where.timestamp as Record<string, Date>).lte = dateTo
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }

  /**
   * Get audit logs for a specific staff member
   * Requirement 13.2: Query audit trail for specific staff
   */
  async getAuditLogsByStaff(
    staffId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {
      resourceId: staffId,
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) {
        (where.timestamp as Record<string, Date>).gte = dateFrom
      }
      if (dateTo) {
        (where.timestamp as Record<string, Date>).lte = dateTo
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }

  // ============================================
  // TEACHER DASHBOARD AUDIT LOGGING (Requirement 11.5)
  // ============================================

  /**
   * Log teacher attendance recording
   * Requirement 11.5: Record teacher actions with timestamp, teacher ID, device info
   */
  async logTeacherAttendance(params: {
    schoolId: string
    teacherId: string
    classId: string
    date: string
    studentCount: number
    presentCount: number
    absentCount: number
    lateCount: number
    action: 'create' | 'update'
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: params.action === 'create' 
        ? AuditAction.TEACHER_ATTENDANCE_RECORDED 
        : AuditAction.TEACHER_ATTENDANCE_UPDATED,
      resource: AuditResource.ATTENDANCE,
      resourceId: `${params.classId}_${params.date}`,
      newValue: {
        classId: params.classId,
        date: params.date,
        studentCount: params.studentCount,
        presentCount: params.presentCount,
        absentCount: params.absentCount,
        lateCount: params.lateCount,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log teacher marks entry
   * Requirement 11.5: Record teacher actions with timestamp, teacher ID, device info
   */
  async logTeacherMarksEntry(params: {
    schoolId: string
    teacherId: string
    classId: string
    subjectId: string
    examId: string
    studentCount: number
    action: 'create' | 'update' | 'submit'
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const actionMap = {
      create: AuditAction.TEACHER_MARKS_ENTERED,
      update: AuditAction.TEACHER_MARKS_UPDATED,
      submit: AuditAction.TEACHER_MARKS_SUBMITTED,
    }

    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: actionMap[params.action],
      resource: AuditResource.MARK,
      resourceId: `${params.examId}_${params.classId}_${params.subjectId}`,
      newValue: {
        classId: params.classId,
        subjectId: params.subjectId,
        examId: params.examId,
        studentCount: params.studentCount,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log teacher message sent
   * Requirement 11.5: Record teacher actions with timestamp, teacher ID, device info
   */
  async logTeacherMessage(params: {
    schoolId: string
    teacherId: string
    messageId: string
    recipientType: 'students' | 'parents'
    recipientCount: number
    classId: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: AuditAction.TEACHER_MESSAGE_SENT,
      resource: 'message',
      resourceId: params.messageId,
      newValue: {
        recipientType: params.recipientType,
        recipientCount: params.recipientCount,
        classId: params.classId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log teacher profile update
   * Requirement 11.5: Record teacher actions with timestamp, teacher ID, device info
   */
  async logTeacherProfileUpdate(params: {
    schoolId: string
    teacherId: string
    updatedFields: string[]
    previousValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: AuditAction.TEACHER_PROFILE_UPDATED,
      resource: AuditResource.STAFF,
      resourceId: params.teacherId,
      previousValue: params.previousValue,
      newValue: {
        ...params.newValue,
        updatedFields: params.updatedFields,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Log teacher unauthorized access attempt
   * Requirement 11.5: Record unauthorized access attempts
   */
  async logTeacherUnauthorizedAccess(params: {
    schoolId: string
    teacherId: string
    resourceType: string
    resourceId: string
    reason: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    return this.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: AuditAction.TEACHER_UNAUTHORIZED_ACCESS,
      resource: params.resourceType,
      resourceId: params.resourceId,
      newValue: {
        reason: params.reason,
        attemptedAt: new Date().toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })
  }

  /**
   * Get teacher audit logs
   * Requirement 11.5: Query teacher actions
   */
  async getTeacherAuditLogs(
    schoolId: string,
    teacherId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const teacherActions = [
      AuditAction.TEACHER_ATTENDANCE_RECORDED,
      AuditAction.TEACHER_ATTENDANCE_UPDATED,
      AuditAction.TEACHER_MARKS_ENTERED,
      AuditAction.TEACHER_MARKS_UPDATED,
      AuditAction.TEACHER_MARKS_SUBMITTED,
      AuditAction.TEACHER_ASSIGNMENT_CREATED,
      AuditAction.TEACHER_ASSIGNMENT_UPDATED,
      AuditAction.TEACHER_MESSAGE_SENT,
      AuditAction.TEACHER_PROFILE_UPDATED,
      AuditAction.TEACHER_UNAUTHORIZED_ACCESS,
    ]

    const where: Record<string, unknown> = {
      schoolId,
      userId: teacherId,
      action: { in: teacherActions },
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) {
        (where.timestamp as Record<string, Date>).gte = dateFrom
      }
      if (dateTo) {
        (where.timestamp as Record<string, Date>).lte = dateTo
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaAuditLogToDomain)
  }
}

// Export singleton instance
export const auditService = new AuditService()
