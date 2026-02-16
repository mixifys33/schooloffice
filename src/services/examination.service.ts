/**
 * Examination Service
 * Handles exam creation, grading system configuration, and exam status management
 * Requirements: 3.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */   
import { prisma } from '@/lib/db'
import {
  Exam,
  CreateExamInput,
  Mark,
  CreateMarkInput,
  MarkEntry,
  GradeRange,
} from '@/types'
import { ExamType } from '@/types/enums'
import { auditService } from './audit.service'
import { teacherAssignmentService } from './teacher-assignment.service'

/**
 * Map Prisma Exam to domain Exam type
 */
function mapPrismaExamToDomain(prismaExam: {
  id: string
  schoolId: string
  termId: string
  name: string
  type: string
  startDate: Date | null
  endDate: Date | null
  isOpen: boolean
  createdAt: Date
  updatedAt: Date
}): Exam {
  return {
    id: prismaExam.id,
    schoolId: prismaExam.schoolId,
    termId: prismaExam.termId,
    name: prismaExam.name,
    type: prismaExam.type as ExamType,
    startDate: prismaExam.startDate ?? undefined,
    endDate: prismaExam.endDate ?? undefined,
    isOpen: prismaExam.isOpen,
    createdAt: prismaExam.createdAt,
    updatedAt: prismaExam.updatedAt,
  }
}

/**
 * Map Prisma Mark to domain Mark type
 */
function mapPrismaMarkToDomain(prismaMark: {
  id: string
  examId: string
  studentId: string
  subjectId: string
  score: number
  maxScore: number
  grade: string | null
  enteredBy: string
  enteredAt: Date
  createdAt: Date
  updatedAt: Date
}): Mark {
  return {
    id: prismaMark.id,
    examId: prismaMark.examId,
    studentId: prismaMark.studentId,
    subjectId: prismaMark.subjectId,
    score: prismaMark.score,
    maxScore: prismaMark.maxScore,
    grade: prismaMark.grade ?? undefined,
    enteredBy: prismaMark.enteredBy,
    enteredAt: prismaMark.enteredAt,
    createdAt: prismaMark.createdAt,
    updatedAt: prismaMark.updatedAt,
  }
}


/**
 * Validation result for marks entry authorization
 */
export interface MarksEntryValidationResult {
  authorized: boolean
  error?: string
  teacherAssignedToSubject: boolean
  teacherAssignedToClass: boolean
  examIsOpen: boolean
}

/**
 * Audit log entry for marks changes
 */
export interface MarksAuditEntry {
  examId: string
  studentId: string
  subjectId: string
  teacherId: string
  previousScore?: number
  newScore: number
  timestamp: Date
}

export class ExaminationService {
  // ============================================
  // EXAM MANAGEMENT
  // ============================================

  /**
   * Create a new exam
   * Requirement 7.1: Define exam type (BOT, MID, EOT), term, and applicable classes
   */
  async createExam(data: CreateExamInput): Promise<Exam> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Validate term exists and belongs to the school
    const term = await prisma.term.findUnique({
      where: { id: data.termId },
      include: { academicYear: true },
    })

    if (!term) {
      throw new Error(`Term with id ${data.termId} not found`)
    }

    if (term.academicYear.schoolId !== data.schoolId) {
      throw new Error('Term must belong to the same school')
    }

    // Validate exam type
    if (!Object.values(ExamType).includes(data.type)) {
      throw new Error(`Invalid exam type: ${data.type}`)
    }

    // Validate dates if provided
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error('Start date must be before end date')
    }

    const exam = await prisma.exam.create({
      data: {
        schoolId: data.schoolId,
        termId: data.termId,
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        isOpen: true, // New exams are open by default
      },
    })

    return mapPrismaExamToDomain(exam)
  }

  /**
   * Get exam by ID
   */
  async getExamById(id: string): Promise<Exam | null> {
    const exam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!exam) return null
    return mapPrismaExamToDomain(exam)
  }

  /**
   * Get all exams for a school
   */
  async getExamsBySchool(schoolId: string): Promise<Exam[]> {
    const exams = await prisma.exam.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    })

    return exams.map(mapPrismaExamToDomain)
  }

  /**
   * Get exams for a specific term
   */
  async getExamsByTerm(termId: string): Promise<Exam[]> {
    const exams = await prisma.exam.findMany({
      where: { termId },
      orderBy: { createdAt: 'desc' },
    })

    return exams.map(mapPrismaExamToDomain)
  }

  /**
   * Update exam details
   */
  async updateExam(
    id: string,
    data: Partial<Pick<Exam, 'name' | 'type' | 'startDate' | 'endDate'>>
  ): Promise<Exam> {
    const existingExam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!existingExam) {
      throw new Error(`Exam with id ${id} not found`)
    }

    // Validate dates if both are provided
    const startDate = data.startDate ?? existingExam.startDate
    const endDate = data.endDate ?? existingExam.endDate
    if (startDate && endDate && startDate > endDate) {
      throw new Error('Start date must be before end date')
    }

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })

    return mapPrismaExamToDomain(exam)
  }

  /**
   * Open an exam for marks entry
   * Requirement 7.4: Manage exam open/close status
   */
  async openExam(id: string): Promise<Exam> {
    const exam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!exam) {
      throw new Error(`Exam with id ${id} not found`)
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: { isOpen: true },
    })

    return mapPrismaExamToDomain(updatedExam)
  }

  /**
   * Close an exam to prevent further marks entry
   * Requirement 7.4: Prevent marks entry when exam is closed
   */
  async closeExam(id: string): Promise<Exam> {
    const exam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!exam) {
      throw new Error(`Exam with id ${id} not found`)
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: { isOpen: false },
    })

    return mapPrismaExamToDomain(updatedExam)
  }

  /**
   * Check if an exam is open for marks entry
   */
  async isExamOpen(examId: string): Promise<boolean> {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { isOpen: true },
    })

    return exam?.isOpen ?? false
  }

  /**
   * Delete an exam (only if no marks have been entered)
   */
  async deleteExam(id: string): Promise<void> {
    const markCount = await prisma.mark.count({
      where: { examId: id },
    })

    if (markCount > 0) {
      throw new Error('Cannot delete exam with existing marks')
    }

    await prisma.exam.delete({
      where: { id },
    })
  }


  // ============================================
  // MARKS ENTRY VALIDATION
  // ============================================

  /**
   * Validate teacher authorization for marks entry
   * Requirement 3.6: Prevent marks entry without subject assignment for teachers
   * Requirement 7.2: Validate teacher is assigned to subject and class
   * Requirement 7.4: Prevent entry when exam is closed
   */
  async validateMarksEntry(
    teacherId: string,
    examId: string,
    subjectId: string,
    classId: string
  ): Promise<MarksEntryValidationResult> {
    // Check if exam exists and is open
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    })

    if (!exam) {
      return {
        authorized: false,
        error: 'Exam not found',
        teacherAssignedToSubject: false,
        teacherAssignedToClass: false,
        examIsOpen: false,
      }
    }

    const examIsOpen = exam.isOpen

    // First, check if this is a Teacher (from Teacher model)
    // Requirement 3.6: Prevent marks entry without subject assignment
    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId },
    })

    let teacherAssignedToSubject = false
    let teacherAssignedToClass = false

    if (teacher) {
      // This is a teacher from the Teacher model - use teacher assignment service
      const canEnterMarks = await teacherAssignmentService.canEnterMarks(
        teacherId,
        exam.schoolId,
        classId,
        subjectId
      )

      if (!canEnterMarks) {
        return {
          authorized: false,
          error: 'Teacher is not authorized to enter marks for this class-subject combination. ' +
                 'Teacher must be assigned to both the class and subject, have system access, ' +
                 'and have marks entry permission.',
          teacherAssignedToSubject: false,
          teacherAssignedToClass: false,
          examIsOpen,
        }
      }

      // If canEnterMarks is true, both assignments are valid
      teacherAssignedToSubject = true
      teacherAssignedToClass = true
    } else {
      // Fall back to Staff model for backward compatibility
      // Check if teacher is assigned to the subject
      const staffSubject = await prisma.staffSubject.findFirst({
        where: {
          staffId: teacherId,
          subjectId: subjectId,
        },
      })

      teacherAssignedToSubject = staffSubject !== null

      // Check if teacher is assigned to the class
      const staffClass = await prisma.staffClass.findFirst({
        where: {
          staffId: teacherId,
          classId: classId,
        },
      })

      teacherAssignedToClass = staffClass !== null
    }

    // Determine authorization
    const authorized = examIsOpen && teacherAssignedToSubject && teacherAssignedToClass

    let error: string | undefined
    if (!examIsOpen) {
      error = 'Exam is closed for marks entry'
    } else if (!teacherAssignedToSubject) {
      error = 'Teacher is not assigned to this subject'
    } else if (!teacherAssignedToClass) {
      error = 'Teacher is not assigned to this class'
    }

    return {
      authorized,
      error,
      teacherAssignedToSubject,
      teacherAssignedToClass,
      examIsOpen,
    }
  }

  /**
   * Validate marks value against maximum
   * Requirement 7.3: Validate values against maximum marks defined
   */
  validateMarksValue(score: number, maxScore: number): { valid: boolean; error?: string } {
    if (score < 0) {
      return { valid: false, error: 'Score cannot be negative' }
    }

    if (maxScore <= 0) {
      return { valid: false, error: 'Maximum score must be greater than 0' }
    }

    if (score > maxScore) {
      return { valid: false, error: `Score (${score}) exceeds maximum marks (${maxScore})` }
    }

    return { valid: true }
  }

  // ============================================
  // MARKS ENTRY
  // ============================================

  /**
   * Enter marks for a student
   * Requirement 7.2: Validate teacher assignment
   * Requirement 7.3: Validate marks against maximum
   * Requirement 7.4: Prevent entry when exam is closed
   * Requirement 7.5: Log entry with teacher ID and timestamp
   */
  async enterMark(data: CreateMarkInput): Promise<Mark> {
    // Get student to determine their class
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      throw new Error(`Student with id ${data.studentId} not found`)
    }

    // Validate teacher authorization
    const validation = await this.validateMarksEntry(
      data.enteredBy,
      data.examId,
      data.subjectId,
      student.classId
    )

    if (!validation.authorized) {
      throw new Error(validation.error || 'Not authorized to enter marks')
    }

    // Validate marks value
    const marksValidation = this.validateMarksValue(data.score, data.maxScore)
    if (!marksValidation.valid) {
      throw new Error(marksValidation.error)
    }

    // Get grade for the score
    const grade = await this.calculateGrade(data.subjectId, data.score, data.maxScore)

    const now = new Date()

    // Check if mark already exists (for update)
    const existingMark = await prisma.mark.findUnique({
      where: {
        examId_studentId_subjectId: {
          examId: data.examId,
          studentId: data.studentId,
          subjectId: data.subjectId,
        },
      },
    })

    let mark
    if (existingMark) {
      // Update existing mark
      mark = await prisma.mark.update({
        where: { id: existingMark.id },
        data: {
          score: data.score,
          maxScore: data.maxScore,
          grade,
          enteredBy: data.enteredBy,
          enteredAt: now,
        },
      })

      // Log audit entry for marks update
      // Requirement 7.5: Log entry with teacher ID and timestamp for audit purposes
      await auditService.logMarksEntry({
        schoolId: student.schoolId,
        teacherId: data.enteredBy,
        examId: data.examId,
        studentId: data.studentId,
        subjectId: data.subjectId,
        previousScore: existingMark.score,
        newScore: data.score,
        maxScore: data.maxScore,
        previousGrade: existingMark.grade ?? undefined,
        newGrade: grade,
      })
    } else {
      // Create new mark
      mark = await prisma.mark.create({
        data: {
          examId: data.examId,
          studentId: data.studentId,
          subjectId: data.subjectId,
          score: data.score,
          maxScore: data.maxScore,
          grade,
          enteredBy: data.enteredBy,
          enteredAt: now,
        },
      })

      // Log audit entry for new marks entry
      // Requirement 7.5: Log entry with teacher ID and timestamp for audit purposes
      await auditService.logMarksEntry({
        schoolId: student.schoolId,
        teacherId: data.enteredBy,
        examId: data.examId,
        studentId: data.studentId,
        subjectId: data.subjectId,
        newScore: data.score,
        maxScore: data.maxScore,
        newGrade: grade,
      })
    }

    return mapPrismaMarkToDomain(mark)
  }

  /**
   * Enter marks for multiple students in a class
   * Requirement 7.2, 7.3, 7.4, 7.5
   */
  async enterMarksForClass(
    examId: string,
    subjectId: string,
    classId: string,
    entries: MarkEntry[],
    enteredBy: string
  ): Promise<{ successful: Mark[]; failed: { studentId: string; error: string }[] }> {
    // Validate teacher authorization once for the class
    const validation = await this.validateMarksEntry(enteredBy, examId, subjectId, classId)

    if (!validation.authorized) {
      throw new Error(validation.error || 'Not authorized to enter marks')
    }

    const successful: Mark[] = []
    const failed: { studentId: string; error: string }[] = []

    for (const entry of entries) {
      try {
        // Validate marks value
        const marksValidation = this.validateMarksValue(entry.score, entry.maxScore)
        if (!marksValidation.valid) {
          failed.push({ studentId: entry.studentId, error: marksValidation.error! })
          continue
        }

        // Verify student belongs to the class
        const student = await prisma.student.findUnique({
          where: { id: entry.studentId },
        })

        if (!student || student.classId !== classId) {
          failed.push({ studentId: entry.studentId, error: 'Student not found in this class' })
          continue
        }

        const mark = await this.enterMark({
          examId,
          studentId: entry.studentId,
          subjectId,
          score: entry.score,
          maxScore: entry.maxScore,
          enteredBy,
        })

        successful.push(mark)
      } catch (error) {
        failed.push({
          studentId: entry.studentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { successful, failed }
  }


  /**
   * Get marks for a student in an exam
   */
  async getStudentMarks(studentId: string, examId: string): Promise<Mark[]> {
    const marks = await prisma.mark.findMany({
      where: {
        studentId,
        examId,
      },
      orderBy: { subjectId: 'asc' },
    })

    return marks.map(mapPrismaMarkToDomain)
  }

  /**
   * Get all marks for an exam
   */
  async getExamMarks(examId: string): Promise<Mark[]> {
    const marks = await prisma.mark.findMany({
      where: { examId },
      orderBy: [{ studentId: 'asc' }, { subjectId: 'asc' }],
    })

    return marks.map(mapPrismaMarkToDomain)
  }

  /**
   * Get marks for a subject in an exam
   */
  async getSubjectMarks(examId: string, subjectId: string): Promise<Mark[]> {
    const marks = await prisma.mark.findMany({
      where: {
        examId,
        subjectId,
      },
      orderBy: { studentId: 'asc' },
    })

    return marks.map(mapPrismaMarkToDomain)
  }

  /**
   * Get marks entered by a specific teacher
   * Requirement 5.4 (data ownership): Teachers see only their entered marks
   */
  async getTeacherEnteredMarks(teacherId: string, examId?: string): Promise<Mark[]> {
    const marks = await prisma.mark.findMany({
      where: {
        enteredBy: teacherId,
        ...(examId && { examId }),
      },
      orderBy: { enteredAt: 'desc' },
    })

    return marks.map(mapPrismaMarkToDomain)
  }

  /**
   * Delete a mark (only if exam is open)
   */
  async deleteMark(markId: string, teacherId: string): Promise<void> {
    const mark = await prisma.mark.findUnique({
      where: { id: markId },
      include: { exam: true },
    })

    if (!mark) {
      throw new Error(`Mark with id ${markId} not found`)
    }

    if (!mark.exam.isOpen) {
      throw new Error('Cannot delete marks when exam is closed')
    }

    // Verify the teacher entered this mark or has admin privileges
    if (mark.enteredBy !== teacherId) {
      throw new Error('Only the teacher who entered the mark can delete it')
    }

    await prisma.mark.delete({
      where: { id: markId },
    })
  }

  // ============================================
  // GRADING
  // ============================================

  /**
   * Calculate grade for a score based on subject's grading system
   */
  async calculateGrade(
    subjectId: string,
    score: number,
    maxScore: number
  ): Promise<string | undefined> {
    // Get subject with grading system
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        gradingSystem: {
          include: { grades: true },
        },
      },
    })

    if (!subject?.gradingSystem) {
      return undefined
    }

    // Calculate percentage
    const percentage = (score / maxScore) * 100

    // Find matching grade range
    const gradeRange = subject.gradingSystem.grades.find(
      (g) => percentage >= g.minScore && percentage <= g.maxScore
    )

    return gradeRange?.grade
  }

  /**
   * Get grade ranges for a subject
   */
  async getSubjectGradeRanges(subjectId: string): Promise<GradeRange[]> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        gradingSystem: {
          include: { grades: { orderBy: { minScore: 'desc' } } },
        },
      },
    })

    if (!subject?.gradingSystem) {
      return []
    }

    return subject.gradingSystem.grades.map((g) => ({
      id: g.id,
      gradingSystemId: g.gradingSystemId,
      grade: g.grade,
      minScore: g.minScore,
      maxScore: g.maxScore,
      points: g.points,
      remarks: g.remarks ?? undefined,
      createdAt: g.createdAt,
    }))
  }

  /**
   * Recalculate grades for all marks in an exam
   * Useful when grading system is updated
   */
  async recalculateExamGrades(examId: string): Promise<number> {
    const marks = await prisma.mark.findMany({
      where: { examId },
    })

    let updatedCount = 0

    for (const mark of marks) {
      const newGrade = await this.calculateGrade(mark.subjectId, mark.score, mark.maxScore)

      if (newGrade !== mark.grade) {
        await prisma.mark.update({
          where: { id: mark.id },
          data: { grade: newGrade },
        })
        updatedCount++
      }
    }

    return updatedCount
  }
}

// Export singleton instance
export const examinationService = new ExaminationService()
