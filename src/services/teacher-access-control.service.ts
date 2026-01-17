/**
 * Teacher Access Control Service
 * Implements strict access control enforcement for teacher dashboard
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
import { prisma } from '@/lib/db'
import { auditService } from './audit.service'
import { getTeacherAssignments, type TeacherAssignments } from '@/lib/teacher-access'

/**
 * Error thrown when teacher access is denied
 * Requirement 11.1, 11.2: Deny access and display authorization error
 */
export class TeacherAccessDeniedError extends Error {
  public readonly statusCode = 403
  public readonly code: string

  constructor(
    message: string,
    public readonly teacherId: string,
    public readonly resourceType: string,
    public readonly resourceId?: string,
    code?: string
  ) {
    super(message)
    this.name = 'TeacherAccessDeniedError'
    this.code = code || 'TEACHER_ACCESS_DENIED'
  }
}

/**
 * Term context for teacher operations
 */
export interface TeacherTermContext {
  currentTerm: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    isActive: boolean
  } | null
  academicYear: {
    id: string
    name: string
    isActive: boolean
  } | null
  previousTerms: Array<{
    id: string
    name: string
    startDate: Date
    endDate: Date
  }>
  contextError: string | null
}

/**
 * Hidden features for teachers
 * Requirement 11.3: Hide fees, school settings, other teacher data, SMS balance, analytics
 */
export const TEACHER_HIDDEN_FEATURES = [
  'fees',
  'fee_structure',
  'payments',
  'school_settings',
  'other_teachers',
  'sms_balance',
  'sms_settings',
  'analytics',
  'system_analytics',
  'financial_reports',
  'staff_management',
  'user_management',
  'subscription',
  'license',
] as const

export type HiddenFeature = typeof TEACHER_HIDDEN_FEATURES[number]

/**
 * Device information for audit logging
 */
export interface DeviceInfo {
  ipAddress?: string
  userAgent?: string
  deviceType?: string
}

export class TeacherAccessControlService {
  /**
   * Validate teacher has access to a specific class
   * Requirement 11.1: Deny access to classes not assigned to teacher
   */
  async validateClassAccess(
    userId: string,
    classId: string,
    _schoolId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const assignments = await getTeacherAssignments(userId)
    
    if (!assignments) {
      return { allowed: false, reason: 'Teacher profile not found' }
    }

    if (!assignments.classIds.includes(classId)) {
      return { allowed: false, reason: 'Not assigned to this class' }
    }

    return { allowed: true }
  }

  /**
   * Validate teacher has access to student data
   * Requirement 11.2: Deny access to student data outside assigned classes
   */
  async validateStudentAccess(
    userId: string,
    studentId: string,
    _schoolId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const assignments = await getTeacherAssignments(userId)
    
    if (!assignments) {
      return { allowed: false, reason: 'Teacher profile not found' }
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    })

    if (!student) {
      return { allowed: false, reason: 'Student not found' }
    }

    if (!assignments.classIds.includes(student.classId)) {
      return { allowed: false, reason: 'Student not in assigned class' }
    }

    return { allowed: true }
  }

  /**
   * Check if a feature is hidden for teachers
   * Requirement 11.3: Hide fees, school settings, other teacher data, SMS balance, analytics
   */
  isFeatureHidden(feature: string): boolean {
    return TEACHER_HIDDEN_FEATURES.includes(feature as HiddenFeature)
  }

  /**
   * Get list of hidden features for teachers
   */
  getHiddenFeatures(): readonly string[] {
    return TEACHER_HIDDEN_FEATURES
  }


  /**
   * Get current term context for teacher
   * Requirement 11.4: Auto-transition to new term when term ends
   */
  async getTermContext(schoolId: string): Promise<TeacherTermContext> {
    const today = new Date()

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!academicYear) {
      return {
        currentTerm: null,
        academicYear: null,
        previousTerms: [],
        contextError: 'No active academic year found',
      }
    }

    // Get current term (where today falls within start and end dates)
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    })

    // Get previous terms for read-only access
    const previousTerms = await prisma.term.findMany({
      where: {
        academicYearId: academicYear.id,
        endDate: { lt: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { endDate: 'desc' },
    })

    // If no current term, check if we're between terms
    if (!currentTerm) {
      const upcomingTerm = await prisma.term.findFirst({
        where: {
          academicYearId: academicYear.id,
          startDate: { gt: today },
        },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          name: true,
          startDate: true,
        },
      })

      const contextError = upcomingTerm
        ? `Between terms. Next term (${upcomingTerm.name}) starts ${upcomingTerm.startDate.toLocaleDateString()}`
        : 'No active term found for current date'

      return {
        currentTerm: null,
        academicYear: {
          id: academicYear.id,
          name: academicYear.name,
          isActive: academicYear.isActive,
        },
        previousTerms,
        contextError,
      }
    }

    return {
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
        isActive: true,
      },
      academicYear: {
        id: academicYear.id,
        name: academicYear.name,
        isActive: academicYear.isActive,
      },
      previousTerms,
      contextError: null,
    }
  }

  /**
   * Check if term data is read-only (archived)
   * Requirement 11.4: Archive previous term data as read-only
   */
  isTermReadOnly(termId: string, currentTermId: string | null): boolean {
    if (!currentTermId) return true
    return termId !== currentTermId
  }

  /**
   * Validate teacher can perform data entry operations
   * Requirement 11.4: Only allow data entry in current term
   */
  async canPerformDataEntry(
    schoolId: string,
    termId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const context = await this.getTermContext(schoolId)

    if (context.contextError) {
      return { allowed: false, reason: context.contextError }
    }

    if (!context.currentTerm) {
      return { allowed: false, reason: 'No active term' }
    }

    // If termId is provided, check if it matches current term
    if (termId && termId !== context.currentTerm.id) {
      return { allowed: false, reason: 'Cannot modify data from previous terms' }
    }

    return { allowed: true }
  }

  /**
   * Log teacher action to audit service
   * Requirement 11.5: Record all teacher actions with timestamp, teacher ID, device info
   */
  async logTeacherAction(params: {
    schoolId: string
    teacherId: string
    action: string
    resource: string
    resourceId: string
    details?: Record<string, unknown>
    deviceInfo?: DeviceInfo
  }): Promise<void> {
    await auditService.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      newValue: {
        ...params.details,
        timestamp: new Date().toISOString(),
        deviceInfo: params.deviceInfo,
      },
      ipAddress: params.deviceInfo?.ipAddress,
      userAgent: params.deviceInfo?.userAgent,
    })
  }

  /**
   * Log unauthorized access attempt
   * Requirement 11.5: Record unauthorized access attempts
   */
  async logUnauthorizedAccess(params: {
    schoolId: string
    teacherId: string
    resourceType: string
    resourceId: string
    reason: string
    deviceInfo?: DeviceInfo
  }): Promise<void> {
    await auditService.log({
      schoolId: params.schoolId,
      userId: params.teacherId,
      action: 'unauthorized_access_attempt',
      resource: params.resourceType,
      resourceId: params.resourceId,
      newValue: {
        reason: params.reason,
        timestamp: new Date().toISOString(),
        deviceInfo: params.deviceInfo,
      },
      ipAddress: params.deviceInfo?.ipAddress,
      userAgent: params.deviceInfo?.userAgent,
    })
  }

  /**
   * Require class access or throw error
   * Requirement 11.1: Deny access and display authorization error
   */
  async requireClassAccess(
    userId: string,
    classId: string,
    schoolId: string,
    deviceInfo?: DeviceInfo
  ): Promise<TeacherAssignments> {
    const result = await this.validateClassAccess(userId, classId, schoolId)
    
    if (!result.allowed) {
      // Log unauthorized access attempt
      await this.logUnauthorizedAccess({
        schoolId,
        teacherId: userId,
        resourceType: 'class',
        resourceId: classId,
        reason: result.reason || 'Access denied',
        deviceInfo,
      })

      throw new TeacherAccessDeniedError(
        result.reason || 'Access denied to this class',
        userId,
        'class',
        classId,
        'CLASS_ACCESS_DENIED'
      )
    }

    const assignments = await getTeacherAssignments(userId)
    return assignments!
  }

  /**
   * Require student access or throw error
   * Requirement 11.2: Deny access and display authorization error
   */
  async requireStudentAccess(
    userId: string,
    studentId: string,
    schoolId: string,
    deviceInfo?: DeviceInfo
  ): Promise<TeacherAssignments> {
    const result = await this.validateStudentAccess(userId, studentId, schoolId)
    
    if (!result.allowed) {
      // Log unauthorized access attempt
      await this.logUnauthorizedAccess({
        schoolId,
        teacherId: userId,
        resourceType: 'student',
        resourceId: studentId,
        reason: result.reason || 'Access denied',
        deviceInfo,
      })

      throw new TeacherAccessDeniedError(
        result.reason || 'Access denied to this student',
        userId,
        'student',
        studentId,
        'STUDENT_ACCESS_DENIED'
      )
    }

    const assignments = await getTeacherAssignments(userId)
    return assignments!
  }

  /**
   * Validate multiple students belong to teacher's assigned classes
   * Requirement 11.2: Deny access to student data outside assigned classes
   */
  async validateMultipleStudentsAccess(
    userId: string,
    studentIds: string[],
    schoolId: string
  ): Promise<{ allowed: boolean; invalidStudentIds: string[]; reason?: string }> {
    const assignments = await getTeacherAssignments(userId)
    
    if (!assignments) {
      return { 
        allowed: false, 
        invalidStudentIds: studentIds,
        reason: 'Teacher profile not found' 
      }
    }

    // Get all students and their classes
    const students = await prisma.student.findMany({
      where: { 
        id: { in: studentIds },
        schoolId,
      },
      select: { id: true, classId: true },
    })

    const invalidStudentIds: string[] = []
    
    for (const student of students) {
      if (!assignments.classIds.includes(student.classId)) {
        invalidStudentIds.push(student.id)
      }
    }

    // Check for students not found
    const foundIds = new Set(students.map(s => s.id))
    for (const id of studentIds) {
      if (!foundIds.has(id)) {
        invalidStudentIds.push(id)
      }
    }

    if (invalidStudentIds.length > 0) {
      return {
        allowed: false,
        invalidStudentIds,
        reason: `Access denied to ${invalidStudentIds.length} student(s) outside assigned classes`,
      }
    }

    return { allowed: true, invalidStudentIds: [] }
  }

  /**
   * Get teacher's accessible data scope
   * Returns the IDs of classes and subjects the teacher can access
   */
  async getAccessibleScope(userId: string): Promise<{
    classIds: string[]
    subjectIds: string[]
    studentIds: string[]
  } | null> {
    const assignments = await getTeacherAssignments(userId)
    
    if (!assignments) {
      return null
    }

    // Get all students in assigned classes
    const students = await prisma.student.findMany({
      where: {
        classId: { in: assignments.classIds },
      },
      select: { id: true },
    })

    return {
      classIds: assignments.classIds,
      subjectIds: assignments.subjectIds,
      studentIds: students.map(s => s.id),
    }
  }
}

// Export singleton instance
export const teacherAccessControlService = new TeacherAccessControlService()
