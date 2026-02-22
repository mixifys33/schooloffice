/**
 * Teacher Assignment Service
 * Handles academic assignments for teachers including subjects, classes, streams,
 * class teacher designation, and examination roles.
 * Requirements: 3.1-3.5, 3.8
 * 
 * Core principle: Academic assignments directly control data access permissions.
 * Changes to assignments take effect immediately.
 */   
import { prisma } from '@/lib/db'
import {
  Teacher,
  ExaminationRole,
  ExaminationRoleAssignment,
  TeacherEventType,
  TeacherEmploymentStatus,
  INACTIVE_STATUSES,
} from '@/types/teacher'
import { auditService, AuditAction, AuditResource } from './audit.service'

/**
 * Validation error for assignment operations
 */
export class AssignmentValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AssignmentValidationError'
  }
}

/**
 * Result of an assignment operation
 */
export interface AssignmentResult {
  success: boolean
  teacherId: string
  assignedIds: string[]
  removedIds: string[]
  message: string
}

/**
 * Result of class teacher designation
 */
export interface ClassTeacherResult {
  success: boolean
  teacherId: string
  classId: string
  isClassTeacher: boolean
  previousTeacherId?: string
  message: string
}

/**
 * Result of examination role assignment
 */
export interface ExamRoleResult {
  success: boolean
  teacherId: string
  examId: string
  role: ExaminationRole
  message: string
}

export class TeacherAssignmentService {
  /**
   * Assign subjects to a teacher
   * Requirement 3.1: Allow assignment of subjects taught to each teacher
   * Requirement 3.8: Apply changes immediately to permissions
   */
  async assignSubjects(
    teacherId: string,
    schoolId: string,
    subjectIds: string[],
    assignedBy: string
  ): Promise<AssignmentResult> {
    // Verify teacher exists and belongs to school
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Verify all subjects exist and belong to the school
    if (subjectIds.length > 0) {
      const subjects = await prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          schoolId,
        },
        select: { id: true },
      })

      const foundIds = new Set(subjects.map(s => s.id))
      const invalidIds = subjectIds.filter(id => !foundIds.has(id))
      
      if (invalidIds.length > 0) {
        throw new AssignmentValidationError(
          `Invalid subject IDs: ${invalidIds.join(', ')}`,
          'subjectIds',
          'INVALID_SUBJECT_IDS'
        )
      }
    }

    const previousSubjects = teacher.assignedSubjectIds
    const addedSubjects = subjectIds.filter(id => !previousSubjects.includes(id))
    const removedSubjects = previousSubjects.filter(id => !subjectIds.includes(id))

    // Update teacher with new subject assignments (Requirement 3.8 - immediate effect)
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { assignedSubjectIds: subjectIds },
    })

    // Log history entries for added subjects
    for (const subjectId of addedSubjects) {
      await this.logAssignmentHistory(
        teacherId,
        TeacherEventType.SUBJECT_ASSIGNED,
        assignedBy,
        undefined,
        subjectId
      )
    }

    // Log history entries for removed subjects
    for (const subjectId of removedSubjects) {
      await this.logAssignmentHistory(
        teacherId,
        TeacherEventType.SUBJECT_REMOVED,
        assignedBy,
        subjectId,
        undefined
      )
    }

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: assignedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { assignedSubjects: previousSubjects },
      newValue: { 
        assignedSubjects: subjectIds,
        added: addedSubjects,
        removed: removedSubjects,
      },
    })

    return {
      success: true,
      teacherId,
      assignedIds: addedSubjects,
      removedIds: removedSubjects,
      message: `Assigned ${subjectIds.length} subjects to teacher`,
    }
  }

  /**
   * Assign classes to a teacher
   * Requirement 3.2: Allow assignment of classes to each teacher
   * Requirement 3.8: Apply changes immediately to permissions
   */
  async assignClasses(
    teacherId: string,
    schoolId: string,
    classIds: string[],
    assignedBy: string
  ): Promise<AssignmentResult> {
    // Verify teacher exists and belongs to school
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Verify all classes exist and belong to the school
    if (classIds.length > 0) {
      const classes = await prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId,
        },
        select: { id: true },
      })

      const foundIds = new Set(classes.map(c => c.id))
      const invalidIds = classIds.filter(id => !foundIds.has(id))
      
      if (invalidIds.length > 0) {
        throw new AssignmentValidationError(
          `Invalid class IDs: ${invalidIds.join(', ')}`,
          'classIds',
          'INVALID_CLASS_IDS'
        )
      }
    }

    const previousClasses = teacher.assignedClassIds
    const addedClasses = classIds.filter(id => !previousClasses.includes(id))
    const removedClasses = previousClasses.filter(id => !classIds.includes(id))

    // If removing classes, also remove class teacher designation for those classes
    const classTeacherForIds = teacher.classTeacherForIds.filter(
      id => !removedClasses.includes(id)
    )

    // Update teacher with new class assignments (Requirement 3.8 - immediate effect)
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { 
        assignedClassIds: classIds,
        classTeacherForIds,
      },
    })

    // Log history entries for added classes
    for (const classId of addedClasses) {
      await this.logAssignmentHistory(
        teacherId,
        TeacherEventType.CLASS_ASSIGNED,
        assignedBy,
        undefined,
        classId
      )
    }

    // Log history entries for removed classes
    for (const classId of removedClasses) {
      await this.logAssignmentHistory(
        teacherId,
        TeacherEventType.CLASS_REMOVED,
        assignedBy,
        classId,
        undefined
      )
    }

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: assignedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { assignedClasses: previousClasses },
      newValue: { 
        assignedClasses: classIds,
        added: addedClasses,
        removed: removedClasses,
      },
    })

    return {
      success: true,
      teacherId,
      assignedIds: addedClasses,
      removedIds: removedClasses,
      message: `Assigned ${classIds.length} classes to teacher`,
    }
  }

  /**
   * Assign streams to a teacher
   * Requirement 3.3: Allow assignment of streams or sections to each teacher
   * Requirement 3.8: Apply changes immediately to permissions
   */
  async assignStreams(
    teacherId: string,
    schoolId: string,
    streamIds: string[],
    assignedBy: string
  ): Promise<AssignmentResult> {
    // Verify teacher exists and belongs to school
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Verify all streams exist and belong to the school
    if (streamIds.length > 0) {
      const streams = await prisma.stream.findMany({
        where: {
          id: { in: streamIds },
          class: { schoolId },
        },
        select: { id: true },
      })

      const foundIds = new Set(streams.map(s => s.id))
      const invalidIds = streamIds.filter(id => !foundIds.has(id))
      
      if (invalidIds.length > 0) {
        throw new AssignmentValidationError(
          `Invalid stream IDs: ${invalidIds.join(', ')}`,
          'streamIds',
          'INVALID_STREAM_IDS'
        )
      }
    }

    const previousStreams = teacher.assignedStreamIds
    const addedStreams = streamIds.filter(id => !previousStreams.includes(id))
    const removedStreams = previousStreams.filter(id => !streamIds.includes(id))

    // Update teacher with new stream assignments (Requirement 3.8 - immediate effect)
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { assignedStreamIds: streamIds },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: assignedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { assignedStreams: previousStreams },
      newValue: { 
        assignedStreams: streamIds,
        added: addedStreams,
        removed: removedStreams,
      },
    })

    return {
      success: true,
      teacherId,
      assignedIds: addedStreams,
      removedIds: removedStreams,
      message: `Assigned ${streamIds.length} streams to teacher`,
    }
  }

  /**
   * Set class teacher designation for a teacher-class combination
   * Requirement 3.4: Allow designation of class teacher role (Yes/No)
   * Requirement 3.8: Apply changes immediately to permissions
   * 
   * Note: A class can only have one class teacher at a time.
   * Setting a new class teacher will remove the designation from the previous one.
   */
  async setClassTeacher(
    teacherId: string,
    schoolId: string,
    classId: string,
    isClassTeacher: boolean,
    assignedBy: string
  ): Promise<ClassTeacherResult> {
    // Verify teacher exists and belongs to school
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Verify class exists and belongs to the school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
      select: { id: true, name: true },
    })

    if (!classRecord) {
      throw new AssignmentValidationError(
        `Class with id ${classId} not found in this school`,
        'classId',
        'CLASS_NOT_FOUND'
      )
    }

    // Teacher must be assigned to the class to be designated as class teacher
    if (isClassTeacher && !teacher.assignedClassIds.includes(classId)) {
      throw new AssignmentValidationError(
        'Teacher must be assigned to the class before being designated as class teacher',
        'classId',
        'NOT_ASSIGNED_TO_CLASS'
      )
    }

    let previousTeacherId: string | undefined

    // If setting as class teacher, remove designation from any other teacher
    if (isClassTeacher) {
      const currentClassTeacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          classTeacherForIds: { has: classId },
          id: { not: teacherId },
        },
        select: { id: true, classTeacherForIds: true },
      })

      if (currentClassTeacher) {
        previousTeacherId = currentClassTeacher.id
        const updatedClassTeacherFor = currentClassTeacher.classTeacherForIds.filter(
          id => id !== classId
        )
        
        await prisma.teacher.update({
          where: { id: currentClassTeacher.id },
          data: { classTeacherForIds: updatedClassTeacherFor },
        })

        // Log removal from previous teacher
        await this.logAssignmentHistory(
          currentClassTeacher.id,
          TeacherEventType.CLASS_TEACHER_DESIGNATED,
          assignedBy,
          classId,
          undefined,
          `Replaced by teacher ${teacherId}`
        )
      }
    }

    // Update the teacher's class teacher designation
    let newClassTeacherForIds: string[]
    if (isClassTeacher) {
      // Add class to class teacher list if not already there
      newClassTeacherForIds = teacher.classTeacherForIds.includes(classId)
        ? teacher.classTeacherForIds
        : [...teacher.classTeacherForIds, classId]
    } else {
      // Remove class from class teacher list
      newClassTeacherForIds = teacher.classTeacherForIds.filter(id => id !== classId)
    }

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { classTeacherForIds: newClassTeacherForIds },
    })

    // Log history entry
    await this.logAssignmentHistory(
      teacherId,
      TeacherEventType.CLASS_TEACHER_DESIGNATED,
      assignedBy,
      isClassTeacher ? undefined : classId,
      isClassTeacher ? classId : undefined,
      isClassTeacher ? `Designated as class teacher for ${classRecord.name}` : `Removed as class teacher for ${classRecord.name}`
    )

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: assignedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { 
        classTeacherFor: teacher.classTeacherForIds,
        previousClassTeacher: previousTeacherId,
      },
      newValue: { 
        classTeacherFor: newClassTeacherForIds,
        classId,
        isClassTeacher,
      },
    })

    return {
      success: true,
      teacherId,
      classId,
      isClassTeacher,
      previousTeacherId,
      message: isClassTeacher 
        ? `Teacher designated as class teacher for class ${classRecord.name}`
        : `Teacher removed as class teacher for class ${classRecord.name}`,
    }
  }

  /**
   * Assign examination role to a teacher
   * Requirement 3.5: Allow assignment of examination roles (Setter, Marker, Moderator)
   * Requirement 3.8: Apply changes immediately to permissions
   */
  async assignExaminationRole(
    teacherId: string,
    schoolId: string,
    examId: string,
    role: ExaminationRole,
    assignedBy: string
  ): Promise<ExamRoleResult> {
    // Verify teacher exists and belongs to school
    await this.getTeacherWithValidation(teacherId, schoolId)

    // Validate examination role
    if (!Object.values(ExaminationRole).includes(role)) {
      throw new AssignmentValidationError(
        `Invalid examination role: ${role}`,
        'role',
        'INVALID_EXAM_ROLE'
      )
    }

    // Check if this exact assignment already exists
    const existingAssignment = await prisma.teacherExaminationRoleAssignment.findUnique({
      where: {
        teacherId_examId_role: {
          teacherId,
          examId,
          role,
        },
      },
    })

    if (existingAssignment) {
      return {
        success: true,
        teacherId,
        examId,
        role,
        message: `Teacher already has ${role} role for this exam`,
      }
    }

    // Create the examination role assignment
    await prisma.teacherExaminationRoleAssignment.create({
      data: {
        schoolId,
        teacherId,
        examId,
        role,
        assignedBy,
        assignedAt: new Date(),
      },
    })

    // Log history entry
    await this.logAssignmentHistory(
      teacherId,
      TeacherEventType.EXAM_ROLE_ASSIGNED,
      assignedBy,
      undefined,
      JSON.stringify({ examId, role })
    )

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: assignedBy,
      action: AuditAction.CREATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      newValue: { 
        examId,
        role,
        action: 'examination_role_assigned',
      },
    })

    return {
      success: true,
      teacherId,
      examId,
      role,
      message: `Assigned ${role} role to teacher for exam`,
    }
  }

  /**
   * Remove examination role from a teacher
   */
  async removeExaminationRole(
    teacherId: string,
    schoolId: string,
    examId: string,
    role: ExaminationRole,
    removedBy: string
  ): Promise<ExamRoleResult> {
    // Verify teacher exists and belongs to school
    await this.getTeacherWithValidation(teacherId, schoolId)

    // Find and delete the assignment
    const existingAssignment = await prisma.teacherExaminationRoleAssignment.findUnique({
      where: {
        teacherId_examId_role: {
          teacherId,
          examId,
          role,
        },
      },
    })

    if (!existingAssignment) {
      throw new AssignmentValidationError(
        `Teacher does not have ${role} role for this exam`,
        'role',
        'ROLE_NOT_FOUND'
      )
    }

    await prisma.teacherExaminationRoleAssignment.delete({
      where: {
        teacherId_examId_role: {
          teacherId,
          examId,
          role,
        },
      },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: removedBy,
      action: AuditAction.DELETE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { 
        examId,
        role,
        action: 'examination_role_removed',
      },
    })

    return {
      success: true,
      teacherId,
      examId,
      role,
      message: `Removed ${role} role from teacher for exam`,
    }
  }

  /**
   * Get all examination roles for a teacher
   */
  async getExaminationRoles(
    teacherId: string,
    schoolId: string
  ): Promise<ExaminationRoleAssignment[]> {
    // Verify teacher exists and belongs to school
    await this.getTeacherWithValidation(teacherId, schoolId)

    const roles = await prisma.teacherExaminationRoleAssignment.findMany({
      where: { teacherId },
      orderBy: { assignedAt: 'desc' },
    })

    return roles.map(role => ({
      examId: role.examId,
      role: role.role as ExaminationRole,
      assignedAt: role.assignedAt,
      assignedBy: role.assignedBy,
    }))
  }

  /**
   * Bulk update all academic assignments for a teacher
   * Useful for form submissions where all assignments are updated at once
   * Requirement 3.8: Apply changes immediately to permissions
   */
  async updateAllAssignments(
    teacherId: string,
    schoolId: string,
    assignments: {
      subjectIds?: string[]
      classIds?: string[]
      streamIds?: string[]
      classTeacherForIds?: string[]
    },
    updatedBy: string
  ): Promise<{
    subjects: AssignmentResult
    classes: AssignmentResult
    streams: AssignmentResult
    classTeacher: string[]
  }> {
    const results = {
      subjects: { success: true, teacherId, assignedIds: [], removedIds: [], message: 'No changes' } as AssignmentResult,
      classes: { success: true, teacherId, assignedIds: [], removedIds: [], message: 'No changes' } as AssignmentResult,
      streams: { success: true, teacherId, assignedIds: [], removedIds: [], message: 'No changes' } as AssignmentResult,
      classTeacher: [] as string[],
    }

    // Update subjects if provided
    if (assignments.subjectIds !== undefined) {
      results.subjects = await this.assignSubjects(
        teacherId,
        schoolId,
        assignments.subjectIds,
        updatedBy
      )
    }

    // Update classes if provided
    if (assignments.classIds !== undefined) {
      results.classes = await this.assignClasses(
        teacherId,
        schoolId,
        assignments.classIds,
        updatedBy
      )
    }

    // Update streams if provided
    if (assignments.streamIds !== undefined) {
      results.streams = await this.assignStreams(
        teacherId,
        schoolId,
        assignments.streamIds,
        updatedBy
      )
    }

    // Update class teacher designations if provided
    if (assignments.classTeacherForIds !== undefined) {
      const teacher = await this.getTeacherWithValidation(teacherId, schoolId)
      const currentClassTeacherFor = teacher.classTeacherForIds
      const newClassTeacherFor = assignments.classTeacherForIds

      // Classes to add as class teacher
      const toAdd = newClassTeacherFor.filter(id => !currentClassTeacherFor.includes(id))
      // Classes to remove as class teacher
      const toRemove = currentClassTeacherFor.filter(id => !newClassTeacherFor.includes(id))

      for (const classId of toAdd) {
        await this.setClassTeacher(teacherId, schoolId, classId, true, updatedBy)
      }

      for (const classId of toRemove) {
        await this.setClassTeacher(teacherId, schoolId, classId, false, updatedBy)
      }

      results.classTeacher = newClassTeacherFor
    }

    return results
  }

  /**
   * Get teachers assigned to a specific subject
   */
  async getTeachersBySubject(
    schoolId: string,
    subjectId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string }>> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        assignedSubjectIds: { has: subjectId },
        employmentStatus: { notIn: INACTIVE_STATUSES },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return teachers
  }

  /**
   * Get teachers assigned to a specific class
   */
  async getTeachersByClass(
    schoolId: string,
    classId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; isClassTeacher: boolean }>> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        assignedClassIds: { has: classId },
        employmentStatus: { notIn: INACTIVE_STATUSES },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classTeacherForIds: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return teachers.map(t => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      isClassTeacher: t.classTeacherForIds.includes(classId),
    }))
  }

  /**
   * Get the class teacher for a specific class
   */
  async getClassTeacher(
    schoolId: string,
    classId: string
  ): Promise<{ id: string; firstName: string; lastName: string } | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        classTeacherForIds: { has: classId },
        employmentStatus: { notIn: INACTIVE_STATUSES },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    return teacher
  }

  /**
   * Get teachers with a specific examination role for an exam
   */
  async getTeachersByExamRole(
    schoolId: string,
    examId: string,
    role?: ExaminationRole
  ): Promise<Array<{ id: string; firstName: string; lastName: string; role: ExaminationRole }>> {
    const whereClause: Record<string, unknown> = { examId }
    if (role) {
      whereClause.role = role
    }

    const assignments = await prisma.teacherExaminationRoleAssignment.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolId: true,
            employmentStatus: true,
          },
        },
      },
    })

    return assignments
      .filter(a => 
        a.teacher.schoolId === schoolId && 
        !INACTIVE_STATUSES.includes(a.teacher.employmentStatus as TeacherEmploymentStatus)
      )
      .map(a => ({
        id: a.teacher.id,
        firstName: a.teacher.firstName,
        lastName: a.teacher.lastName,
        role: a.role as ExaminationRole,
      }))
  }

  /**
   * Check if a teacher can enter marks for a specific class-subject combination
   * Requirement 3.6: Prevent marks entry without subject assignment
   */
  async canEnterMarks(
    teacherId: string,
    schoolId: string,
    classId: string,
    subjectId: string
  ): Promise<boolean> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        employmentStatus: true,
        hasSystemAccess: true,
        canEnterMarks: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher) {
      return false
    }

    // Check if teacher is active
    if (INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return false
    }

    // Check if teacher has system access
    if (!teacher.hasSystemAccess) {
      return false
    }

    // Check if teacher has marks entry permission
    if (!teacher.canEnterMarks) {
      return false
    }

    // Check if teacher is assigned to this class AND subject (Requirement 3.6)
    if (!teacher.assignedClassIds.includes(classId)) {
      return false
    }

    if (!teacher.assignedSubjectIds.includes(subjectId)) {
      return false
    }

    return true
  }

  /**
   * Check if a teacher can take attendance for a specific class
   * Requirement 3.7: Prevent attendance marking without class assignment
   */
  async canTakeAttendance(
    teacherId: string,
    schoolId: string,
    classId: string
  ): Promise<boolean> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        employmentStatus: true,
        hasSystemAccess: true,
        canTakeAttendance: true,
        assignedClassIds: true,
      },
    })

    if (!teacher) {
      return false
    }

    // Check if teacher is active
    if (INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return false
    }

    // Check if teacher has system access
    if (!teacher.hasSystemAccess) {
      return false
    }

    // Check if teacher has attendance permission
    if (!teacher.canTakeAttendance) {
      return false
    }

    // Check if teacher is assigned to this class (Requirement 3.7)
    if (!teacher.assignedClassIds.includes(classId)) {
      return false
    }

    return true
  }

  /**
   * Get assignment summary for a teacher
   */
  async getAssignmentSummary(
    teacherId: string,
    schoolId: string
  ): Promise<{
    subjectCount: number
    classCount: number
    streamCount: number
    classTeacherCount: number
    examRoleCount: number
    subjects: Array<{ id: string; name: string }>
    classes: Array<{ id: string; name: string; isClassTeacher: boolean }>
    streams: Array<{ id: string; name: string; className: string }>
    examRoles: ExaminationRoleAssignment[]
  }> {
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Get subject details
    const subjects = teacher.assignedSubjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: teacher.assignedSubjectIds } },
          select: { id: true, name: true },
        })
      : []

    // Get class details
    const classes = teacher.assignedClassIds.length > 0
      ? await prisma.class.findMany({
          where: { id: { in: teacher.assignedClassIds } },
          select: { id: true, name: true },
        })
      : []

    // Get stream details
    const streams = teacher.assignedStreamIds.length > 0
      ? await prisma.stream.findMany({
          where: { id: { in: teacher.assignedStreamIds } },
          select: { id: true, name: true, class: { select: { name: true } } },
        })
      : []

    // Get examination roles
    const examRoles = await this.getExaminationRoles(teacherId, schoolId)

    return {
      subjectCount: subjects.length,
      classCount: classes.length,
      streamCount: streams.length,
      classTeacherCount: teacher.classTeacherForIds.length,
      examRoleCount: examRoles.length,
      subjects: subjects.map(s => ({ id: s.id, name: s.name })),
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        isClassTeacher: teacher.classTeacherForIds.includes(c.id),
      })),
      streams: streams.map(s => ({
        id: s.id,
        name: s.name,
        className: s.class.name,
      })),
      examRoles,
    }
  }

  /**
   * Clear all assignments for a teacher (used when teacher leaves)
   * Note: This preserves historical data per Requirement 3.9
   */
  async clearAllAssignments(
    teacherId: string,
    schoolId: string,
    clearedBy: string,
    reason?: string
  ): Promise<void> {
    const teacher = await this.getTeacherWithValidation(teacherId, schoolId)

    // Store previous values for audit
    const previousAssignments = {
      subjects: teacher.assignedSubjectIds,
      classes: teacher.assignedClassIds,
      streams: teacher.assignedStreamIds,
      classTeacherFor: teacher.classTeacherForIds,
    }

    // Clear all assignments
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        assignedSubjectIds: [],
        assignedClassIds: [],
        assignedStreamIds: [],
        classTeacherForIds: [],
      },
    })

    // Note: Examination role assignments are NOT cleared - they remain for historical purposes

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: clearedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: previousAssignments,
      newValue: {
        subjects: [],
        classes: [],
        streams: [],
        classTeacherFor: [],
        reason: reason || 'All assignments cleared',
      },
    })
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Get teacher with validation for tenant isolation
   */
  private async getTeacherWithValidation(
    teacherId: string,
    schoolId: string
  ): Promise<{
    id: string
    schoolId: string
    employmentStatus: string
    assignedSubjectIds: string[]
    assignedClassIds: string[]
    assignedStreamIds: string[]
    classTeacherForIds: string[]
  }> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId, // Tenant isolation
      },
      select: {
        id: true,
        schoolId: true,
        employmentStatus: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        assignedStreamIds: true,
        classTeacherForIds: true,
      },
    })

    if (!teacher) {
      throw new AssignmentValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    return teacher
  }

  /**
   * Log assignment history entry for audit trail
   * Requirement 3.9: Preserve historical data
   */
  private async logAssignmentHistory(
    teacherId: string,
    eventType: TeacherEventType,
    performedBy: string,
    previousValue?: string,
    newValue?: string,
    reason?: string
  ): Promise<void> {
    // Get teacher to retrieve schoolId
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { schoolId: true },
    })

    if (!teacher) {
      throw new Error(`Teacher ${teacherId} not found`)
    }

    await prisma.teacherHistoryEntry.create({
      data: {
        schoolId: teacher.schoolId,
        teacherId,
        eventType,
        previousValue,
        newValue,
        reason,
        performedBy,
        performedAt: new Date(),
      },
    })
  }
}

// Export singleton instance
export const teacherAssignmentService = new TeacherAssignmentService()
