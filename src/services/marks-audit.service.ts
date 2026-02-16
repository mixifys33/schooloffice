/**
 * Marks Audit Service
 * Comprehensive audit trail for marks management system
 * Requirements: 32.1, 32.2, 32.3, 32.7
 * 
 * IMMUTABILITY GUARANTEE:
 * - All audit entries are IMMUTABLE and READ-ONLY once created
 * - NO update or delete operations are exposed on audit entries
 * - This ensures complete audit trail integrity for inspection readiness
 */
import { prisma } from '@/lib/db'
  
/**
 * Marks audit action types
 */
export enum MarksAuditAction {
  // CA Entry Actions
  CA_ENTRY_CREATED = 'CA_ENTRY_CREATED',
  CA_ENTRY_UPDATED = 'CA_ENTRY_UPDATED',
  CA_ENTRY_DELETED = 'CA_ENTRY_DELETED',
  CA_ENTRY_SUBMITTED = 'CA_ENTRY_SUBMITTED',
  
  // Exam Entry Actions
  EXAM_ENTRY_CREATED = 'EXAM_ENTRY_CREATED',
  EXAM_ENTRY_UPDATED = 'EXAM_ENTRY_UPDATED',
  EXAM_ENTRY_SUBMITTED = 'EXAM_ENTRY_SUBMITTED',
  
  // Approval Workflow Actions
  MARKS_APPROVED = 'MARKS_APPROVED',
  MARKS_REJECTED = 'MARKS_REJECTED',
  MARKS_LOCKED = 'MARKS_LOCKED',
  MARKS_UNLOCKED = 'MARKS_UNLOCKED',
  
  // Grade Calculation Actions
  GRADE_CALCULATED = 'GRADE_CALCULATED',
  GRADE_RECALCULATED = 'GRADE_RECALCULATED',
  
  // Report Generation Actions
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_APPROVED = 'REPORT_APPROVED',
  
  // Batch Operations
  BATCH_SAVE_EXECUTED = 'BATCH_SAVE_EXECUTED',
  BATCH_APPROVAL_EXECUTED = 'BATCH_APPROVAL_EXECUTED',
}

/**
 * Marks audit entry interface
 */
export interface MarksAuditEntry {
  id: string
  schoolId: string
  entryType: 'CA' | 'EXAM'
  entryId: string
  studentId: string
  subjectId: string
  classId: string
  termId: string
  action: MarksAuditAction
  performedBy: string
  performedAt: Date
  comments?: string
  metadata: Record<string, unknown>
  
  // Additional context for inspection
  teacherName?: string
  studentName?: string
  subjectName?: string
  className?: string
  termName?: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}

/**
 * Audit filters for querying
 */
export interface MarksAuditFilter {
  schoolId?: string
  entryType?: 'CA' | 'EXAM'
  studentId?: string
  subjectId?: string
  classId?: string
  termId?: string
  action?: MarksAuditAction
  performedBy?: string
  dateFrom?: Date
  dateTo?: Date
}

/**
 * Input for creating marks audit entry
 */
export interface CreateMarksAuditInput {
  schoolId: string
  entryType: 'CA' | 'EXAM'
  entryId: string
  studentId: string
  subjectId: string
  classId: string
  termId: string
  action: MarksAuditAction
  performedBy: string
  comments?: string
  metadata?: Record<string, unknown>
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}

/**
 * Map Prisma MarksAuditLog to domain type
 */
function mapPrismaMarksAuditLogToDomain(prismaLog: {
  id: string
  schoolId: string
  entryType: string
  entryId: string
  studentId: string
  subjectId: string
  classId: string
  termId: string
  action: string
  performedBy: string
  performedAt: Date
  comments: string | null
  metadata: unknown
}): MarksAuditEntry {
  const metadata = (prismaLog.metadata as Record<string, unknown>) || {}
  
  return {
    id: prismaLog.id,
    schoolId: prismaLog.schoolId,
    entryType: prismaLog.entryType as 'CA' | 'EXAM',
    entryId: prismaLog.entryId,
    studentId: prismaLog.studentId,
    subjectId: prismaLog.subjectId,
    classId: prismaLog.classId,
    termId: prismaLog.termId,
    action: prismaLog.action as MarksAuditAction,
    performedBy: prismaLog.performedBy,
    performedAt: prismaLog.performedAt,
    comments: prismaLog.comments || undefined,
    metadata,
    teacherName: metadata.teacherName as string,
    studentName: metadata.studentName as string,
    subjectName: metadata.subjectName as string,
    className: metadata.className as string,
    termName: metadata.termName as string,
    previousValue: metadata.previousValue as Record<string, unknown>,
    newValue: metadata.newValue as Record<string, unknown>,
  }
}

export class MarksAuditService {
  /**
   * Log a marks audit event
   * Requirement 32.1: Maintain complete audit trails for all grading activities
   */
  async logAction(data: CreateMarksAuditInput): Promise<MarksAuditEntry> {
    // Enrich metadata with contextual information
    const enrichedMetadata = await this.enrichAuditMetadata(data)
    
    const auditLog = await prisma.marksAuditLog.create({
      data: {
        schoolId: data.schoolId,
        entryType: data.entryType,
        entryId: data.entryId,
        studentId: data.studentId,
        subjectId: data.subjectId,
        classId: data.classId,
        termId: data.termId,
        action: data.action,
        performedBy: data.performedBy,
        performedAt: new Date(),
        comments: data.comments || null,
        metadata: {
          ...enrichedMetadata,
          previousValue: data.previousValue,
          newValue: data.newValue,
        },
      },
    })

    return mapPrismaMarksAuditLogToDomain(auditLog)
  }

  /**
   * Enrich audit metadata with contextual information
   */
  private async enrichAuditMetadata(data: CreateMarksAuditInput): Promise<Record<string, unknown>> {
    try {
      // Get teacher information
      const teacher = await prisma.staff.findUnique({
        where: { id: data.performedBy },
        select: { firstName: true, lastName: true },
      })

      // Get student information
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
        select: { firstName: true, lastName: true, admissionNumber: true },
      })

      // Get subject information
      const subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
        select: { name: true, code: true },
      })

      // Get class information
      const classInfo = await prisma.class.findUnique({
        where: { id: data.classId },
        select: { name: true, level: true },
      })

      // Get term information
      const term = await prisma.term.findUnique({
        where: { id: data.termId },
        select: { name: true },
      })

      return {
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        studentAdmissionNumber: student?.admissionNumber,
        subjectName: subject?.name || 'Unknown',
        subjectCode: subject?.code,
        className: classInfo ? `${classInfo.name} ${classInfo.level}` : 'Unknown',
        termName: term?.name || 'Unknown',
        timestamp: new Date().toISOString(),
        ...data.metadata,
      }
    } catch (error) {
      console.error('Error enriching audit metadata:', error)
      return data.metadata || {}
    }
  }

  /**
   * Get audit logs with filters
   * Requirement 32.1: Provide complete audit trail access
   */
  async getAuditLogs(
    filter: MarksAuditFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<MarksAuditEntry[]> {
    const where: Record<string, unknown> = {}

    if (filter.schoolId) where.schoolId = filter.schoolId
    if (filter.entryType) where.entryType = filter.entryType
    if (filter.studentId) where.studentId = filter.studentId
    if (filter.subjectId) where.subjectId = filter.subjectId
    if (filter.classId) where.classId = filter.classId
    if (filter.termId) where.termId = filter.termId
    if (filter.action) where.action = filter.action
    if (filter.performedBy) where.performedBy = filter.performedBy

    if (filter.dateFrom || filter.dateTo) {
      where.performedAt = {}
      if (filter.dateFrom) {
        (where.performedAt as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.performedAt as Record<string, Date>).lte = filter.dateTo
      }
    }

    const auditLogs = await prisma.marksAuditLog.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return auditLogs.map(mapPrismaMarksAuditLogToDomain)
  }

  /**
   * Get audit logs for a specific student
   */
  async getStudentAuditLogs(
    studentId: string,
    termId?: string,
    limit: number = 50
  ): Promise<MarksAuditEntry[]> {
    return this.getAuditLogs(
      { studentId, termId },
      limit,
      0
    )
  }

  /**
   * Get audit logs for a specific subject
   */
  async getSubjectAuditLogs(
    subjectId: string,
    classId?: string,
    termId?: string,
    limit: number = 100
  ): Promise<MarksAuditEntry[]> {
    return this.getAuditLogs(
      { subjectId, classId, termId },
      limit,
      0
    )
  }

  /**
   * Get audit logs for a specific teacher
   */
  async getTeacherAuditLogs(
    teacherId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100
  ): Promise<MarksAuditEntry[]> {
    return this.getAuditLogs(
      { performedBy: teacherId, dateFrom, dateTo },
      limit,
      0
    )
  }

  /**
   * Count audit logs matching filter
   */
  async countAuditLogs(filter: MarksAuditFilter = {}): Promise<number> {
    const where: Record<string, unknown> = {}

    if (filter.schoolId) where.schoolId = filter.schoolId
    if (filter.entryType) where.entryType = filter.entryType
    if (filter.studentId) where.studentId = filter.studentId
    if (filter.subjectId) where.subjectId = filter.subjectId
    if (filter.classId) where.classId = filter.classId
    if (filter.termId) where.termId = filter.termId
    if (filter.action) where.action = filter.action
    if (filter.performedBy) where.performedBy = filter.performedBy

    if (filter.dateFrom || filter.dateTo) {
      where.performedAt = {}
      if (filter.dateFrom) {
        (where.performedAt as Record<string, Date>).gte = filter.dateFrom
      }
      if (filter.dateTo) {
        (where.performedAt as Record<string, Date>).lte = filter.dateTo
      }
    }

    return prisma.marksAuditLog.count({ where })
  }

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC ACTIONS
  // ============================================

  /**
   * Log CA entry creation
   */
  async logCAEntryCreated(params: {
    schoolId: string
    entryId: string
    studentId: string
    subjectId: string
    classId: string
    termId: string
    teacherId: string
    caData: Record<string, unknown>
  }): Promise<MarksAuditEntry> {
    return this.logAction({
      schoolId: params.schoolId,
      entryType: 'CA',
      entryId: params.entryId,
      studentId: params.studentId,
      subjectId: params.subjectId,
      classId: params.classId,
      termId: params.termId,
      action: MarksAuditAction.CA_ENTRY_CREATED,
      performedBy: params.teacherId,
      newValue: params.caData,
    })
  }

  /**
   * Log CA entry update
   */
  async logCAEntryUpdated(params: {
    schoolId: string
    entryId: string
    studentId: string
    subjectId: string
    classId: string
    termId: string
    teacherId: string
    previousData: Record<string, unknown>
    newData: Record<string, unknown>
  }): Promise<MarksAuditEntry> {
    return this.logAction({
      schoolId: params.schoolId,
      entryType: 'CA',
      entryId: params.entryId,
      studentId: params.studentId,
      subjectId: params.subjectId,
      classId: params.classId,
      termId: params.termId,
      action: MarksAuditAction.CA_ENTRY_UPDATED,
      performedBy: params.teacherId,
      previousValue: params.previousData,
      newValue: params.newData,
    })
  }

  /**
   * Log exam entry creation
   */
  async logExamEntryCreated(params: {
    schoolId: string
    entryId: string
    studentId: string
    subjectId: string
    classId: string
    termId: string
    teacherId: string
    examData: Record<string, unknown>
  }): Promise<MarksAuditEntry> {
    return this.logAction({
      schoolId: params.schoolId,
      entryType: 'EXAM',
      entryId: params.entryId,
      studentId: params.studentId,
      subjectId: params.subjectId,
      classId: params.classId,
      termId: params.termId,
      action: MarksAuditAction.EXAM_ENTRY_CREATED,
      performedBy: params.teacherId,
      newValue: params.examData,
    })
  }

  /**
   * Log marks approval
   */
  async logMarksApproved(params: {
    schoolId: string
    entryType: 'CA' | 'EXAM'
    entryId: string
    studentId: string
    subjectId: string
    classId: string
    termId: string
    approvedBy: string
    comments?: string
  }): Promise<MarksAuditEntry> {
    return this.logAction({
      schoolId: params.schoolId,
      entryType: params.entryType,
      entryId: params.entryId,
      studentId: params.studentId,
      subjectId: params.subjectId,
      classId: params.classId,
      termId: params.termId,
      action: MarksAuditAction.MARKS_APPROVED,
      performedBy: params.approvedBy,
      comments: params.comments,
    })
  }

  /**
   * Log batch save operation
   */
  async logBatchSave(params: {
    schoolId: string
    classId: string
    subjectId: string
    termId: string
    teacherId: string
    entriesCount: number
    entryTypes: string[]
  }): Promise<MarksAuditEntry> {
    return this.logAction({
      schoolId: params.schoolId,
      entryType: 'CA', // Default for batch operations
      entryId: `batch-${Date.now()}`,
      studentId: 'multiple',
      subjectId: params.subjectId,
      classId: params.classId,
      termId: params.termId,
      action: MarksAuditAction.BATCH_SAVE_EXECUTED,
      performedBy: params.teacherId,
      metadata: {
        entriesCount: params.entriesCount,
        entryTypes: params.entryTypes,
        batchId: `batch-${Date.now()}`,
      },
    })
  }
}

// Export singleton instance
export const marksAuditService = new MarksAuditService()