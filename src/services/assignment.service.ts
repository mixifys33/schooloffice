/**
 * Assignment Service
 * Handles teacher assignment (homework/task) management for the Teacher Dashboard.
 * Requirements: 7.1-7.5 - Assignment Management Module
 */
import { prisma } from '@/lib/db'
import { auditService, AuditAction, AuditResource } from './audit.service'
import { teacherAssignmentService } from './teacher-assignment.service'

// Types
export interface CreateAssignmentInput {
  schoolId: string
  teacherId: string
  classId: string
  subjectId: string
  title: string
  description: string
  deadline: Date
  attachments?: string[]
}

export interface UpdateAssignmentInput {
  title?: string
  description?: string
  deadline?: Date
  attachments?: string[]
}

export interface AssignmentWithSubmissions {
  id: string
  schoolId: string
  teacherId: string
  classId: string
  subjectId: string
  title: string
  description: string
  deadline: Date
  attachments: string[]
  status: string
  createdAt: Date
  updatedAt: Date
  submissions: SubmissionSummary[]
  className?: string
  subjectName?: string
}

export interface SubmissionSummary {
  studentId: string
  studentName: string
  admissionNumber: string
  status: string
  submittedAt: Date | null
  grade: string | null
}

export class AssignmentValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'AssignmentValidationError'
  }
}


export class AssignmentService {
  /**
   * Create a new assignment
   * Requirement 7.1: Create assignment with subject, class, title, description, deadline, attachments
   * Requirement 7.2: Make visible only to students in assigned class
   */
  async createAssignment(
    input: CreateAssignmentInput,
    createdBy: string
  ): Promise<AssignmentWithSubmissions> {
    const { schoolId, teacherId, classId, subjectId, title, description, deadline, attachments = [] } = input

    // Validate teacher can create assignments for this class/subject
    const canEnterMarks = await teacherAssignmentService.canEnterMarks(
      teacherId,
      schoolId,
      classId,
      subjectId
    )

    if (!canEnterMarks) {
      throw new AssignmentValidationError(
        'Teacher is not assigned to this class and subject combination',
        'NOT_ASSIGNED'
      )
    }

    // Validate deadline is in the future
    if (new Date(deadline) <= new Date()) {
      throw new AssignmentValidationError(
        'Deadline must be in the future',
        'INVALID_DEADLINE'
      )
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        schoolId,
        teacherId,
        classId,
        subjectId,
        title,
        description,
        deadline,
        attachments,
        status: 'PUBLISHED',
      },
    })

    // Get students in the class to create submission records
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
    })

    // Create submission records for all students (Requirement 7.2 - visible to class students)
    if (students.length > 0) {
      await prisma.assignmentSubmission.createMany({
        data: students.map(student => ({
          assignmentId: assignment.id,
          studentId: student.id,
          status: 'NOT_SUBMITTED',
        })),
      })
    }

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: AuditResource.ASSIGNMENT,
      resourceId: assignment.id,
      newValue: {
        title,
        classId,
        subjectId,
        deadline,
        studentCount: students.length,
      },
    })

    return this.getAssignmentWithSubmissions(assignment.id, teacherId, schoolId)
  }

  /**
   * Get assignment with submission status for each student
   * Requirement 7.3: Display submission status for each student
   */
  async getAssignmentWithSubmissions(
    assignmentId: string,
    teacherId: string,
    schoolId: string
  ): Promise<AssignmentWithSubmissions> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        schoolId,
      },
      include: {
        submissions: {
          include: {
            // We need to get student info separately due to MongoDB limitations
          },
        },
      },
    })

    if (!assignment) {
      throw new AssignmentValidationError(
        'Assignment not found or access denied',
        'NOT_FOUND'
      )
    }

    // Get class and subject names
    const [classRecord, subject] = await Promise.all([
      prisma.class.findUnique({
        where: { id: assignment.classId },
        select: { name: true },
      }),
      prisma.subject.findUnique({
        where: { id: assignment.subjectId },
        select: { name: true },
      }),
    ])

    // Get student details for submissions
    const studentIds = assignment.submissions.map(s => s.studentId)
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
    })

    const studentMap = new Map(students.map(s => [s.id, s]))

    const submissions: SubmissionSummary[] = assignment.submissions.map(sub => {
      const student = studentMap.get(sub.studentId)
      return {
        studentId: sub.studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        admissionNumber: student?.admissionNumber || '',
        status: sub.status,
        submittedAt: sub.submittedAt,
        grade: sub.grade,
      }
    })

    return {
      id: assignment.id,
      schoolId: assignment.schoolId,
      teacherId: assignment.teacherId,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      attachments: assignment.attachments,
      status: assignment.status,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      submissions,
      className: classRecord?.name,
      subjectName: subject?.name,
    }
  }


  /**
   * Get all assignments for a teacher
   */
  async getTeacherAssignments(
    teacherId: string,
    schoolId: string,
    options?: {
      classId?: string
      subjectId?: string
      status?: string
    }
  ): Promise<AssignmentWithSubmissions[]> {
    const where: Record<string, unknown> = {
      teacherId,
      schoolId,
    }

    if (options?.classId) {
      where.classId = options.classId
    }
    if (options?.subjectId) {
      where.subjectId = options.subjectId
    }
    if (options?.status) {
      where.status = options.status
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { deadline: 'asc' },
    })

    return Promise.all(
      assignments.map(a => this.getAssignmentWithSubmissions(a.id, teacherId, schoolId))
    )
  }

  /**
   * Update an assignment
   * Requirement 7.4: Prevent deadline modifications after deadline passes
   */
  async updateAssignment(
    assignmentId: string,
    teacherId: string,
    schoolId: string,
    input: UpdateAssignmentInput,
    updatedBy: string
  ): Promise<AssignmentWithSubmissions> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        schoolId,
      },
    })

    if (!assignment) {
      throw new AssignmentValidationError(
        'Assignment not found or access denied',
        'NOT_FOUND'
      )
    }

    const now = new Date()
    const deadlinePassed = assignment.deadline <= now

    // Requirement 7.4: Prevent deadline modifications after deadline passes
    if (deadlinePassed && input.deadline !== undefined) {
      throw new AssignmentValidationError(
        'Cannot modify deadline after the original deadline has passed',
        'DEADLINE_LOCKED'
      )
    }

    // Validate new deadline is in the future if provided
    if (input.deadline && new Date(input.deadline) <= now) {
      throw new AssignmentValidationError(
        'New deadline must be in the future',
        'INVALID_DEADLINE'
      )
    }

    const previousValue = {
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      attachments: assignment.attachments,
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.deadline && { deadline: input.deadline }),
        ...(input.attachments && { attachments: input.attachments }),
      },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.ASSIGNMENT,
      resourceId: assignmentId,
      previousValue,
      newValue: input,
    })

    return this.getAssignmentWithSubmissions(updated.id, teacherId, schoolId)
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(
    assignmentId: string,
    teacherId: string,
    schoolId: string,
    deletedBy: string
  ): Promise<void> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        schoolId,
      },
    })

    if (!assignment) {
      throw new AssignmentValidationError(
        'Assignment not found or access denied',
        'NOT_FOUND'
      )
    }

    // Delete submissions first (cascade should handle this, but being explicit)
    await prisma.assignmentSubmission.deleteMany({
      where: { assignmentId },
    })

    await prisma.assignment.delete({
      where: { id: assignmentId },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: deletedBy,
      action: AuditAction.DELETE,
      resource: AuditResource.ASSIGNMENT,
      resourceId: assignmentId,
      previousValue: {
        title: assignment.title,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
      },
    })
  }

  /**
   * Check if deadline can be modified
   * Requirement 7.4: Prevent deadline modifications after deadline passes
   */
  canModifyDeadline(assignment: { deadline: Date }): boolean {
    return assignment.deadline > new Date()
  }

  /**
   * Get submission statistics for an assignment
   */
  async getSubmissionStats(
    assignmentId: string,
    teacherId: string,
    schoolId: string
  ): Promise<{
    total: number
    submitted: number
    notSubmitted: number
    late: number
    graded: number
  }> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId,
        schoolId,
      },
    })

    if (!assignment) {
      throw new AssignmentValidationError(
        'Assignment not found or access denied',
        'NOT_FOUND'
      )
    }

    const submissions = await prisma.assignmentSubmission.groupBy({
      by: ['status'],
      where: { assignmentId },
      _count: { status: true },
    })

    const stats = {
      total: 0,
      submitted: 0,
      notSubmitted: 0,
      late: 0,
      graded: 0,
    }

    for (const sub of submissions) {
      stats.total += sub._count.status
      switch (sub.status) {
        case 'SUBMITTED':
          stats.submitted += sub._count.status
          break
        case 'NOT_SUBMITTED':
          stats.notSubmitted += sub._count.status
          break
        case 'LATE':
          stats.late += sub._count.status
          break
        case 'GRADED':
          stats.graded += sub._count.status
          break
      }
    }

    return stats
  }
}

// Export singleton instance
export const assignmentService = new AssignmentService()
