/**
 * Subject and Grading System Service
 * Handles subject and grading system management operations
 * Requirements: 2.4
 */
import { prisma } from '@/lib/db'
import {
  Subject,
  CreateSubjectInput,
  GradingSystem,
  GradeRange,
  CreateGradingSystemInput,
} from '@/types'
   
/**
 * Map Prisma Subject to domain Subject type
 */
function mapPrismaSubjectToDomain(prismaSubject: {
  id: string
  schoolId: string
  name: string
  code: string
  gradingSystemId: string | null
  createdAt: Date
  updatedAt: Date
}): Subject {
  return {
    id: prismaSubject.id,
    schoolId: prismaSubject.schoolId,
    name: prismaSubject.name,
    code: prismaSubject.code,
    gradingSystemId: prismaSubject.gradingSystemId ?? undefined,
    createdAt: prismaSubject.createdAt,
    updatedAt: prismaSubject.updatedAt,
  }
}

/**
 * Map Prisma GradingSystem to domain GradingSystem type
 */
function mapPrismaGradingSystemToDomain(prismaGradingSystem: {
  id: string
  schoolId: string
  name: string
  createdAt: Date
  updatedAt: Date
}): GradingSystem {
  return {
    id: prismaGradingSystem.id,
    schoolId: prismaGradingSystem.schoolId,
    name: prismaGradingSystem.name,
    createdAt: prismaGradingSystem.createdAt,
    updatedAt: prismaGradingSystem.updatedAt,
  }
}

/**
 * Map Prisma GradeRange to domain GradeRange type
 */
function mapPrismaGradeRangeToDomain(prismaGradeRange: {
  id: string
  gradingSystemId: string
  grade: string
  minScore: number
  maxScore: number
  points: number
  remarks: string | null
  createdAt: Date
}): GradeRange {
  return {
    id: prismaGradeRange.id,
    gradingSystemId: prismaGradeRange.gradingSystemId,
    grade: prismaGradeRange.grade,
    minScore: prismaGradeRange.minScore,
    maxScore: prismaGradeRange.maxScore,
    points: prismaGradeRange.points,
    remarks: prismaGradeRange.remarks ?? undefined,
    createdAt: prismaGradeRange.createdAt,
  }
}

/**
 * Validate grade ranges for a grading system
 * - Each grade must have minScore < maxScore
 * - Grade ranges should not overlap
 * - Grade ranges should cover 0-100 (or be contiguous)
 */
export function validateGradeRanges(
  grades: Omit<GradeRange, 'id' | 'gradingSystemId' | 'createdAt'>[]
): { valid: boolean; error?: string } {
  if (grades.length === 0) {
    return { valid: false, error: 'At least one grade range is required' }
  }

  // Check each grade has valid min/max
  for (const grade of grades) {
    if (grade.minScore > grade.maxScore) {
      return { 
        valid: false, 
        error: `Grade "${grade.grade}" has minScore (${grade.minScore}) greater than maxScore (${grade.maxScore})` 
      }
    }
    if (grade.minScore < 0) {
      return { 
        valid: false, 
        error: `Grade "${grade.grade}" has negative minScore (${grade.minScore})` 
      }
    }
    if (grade.maxScore > 100) {
      return { 
        valid: false, 
        error: `Grade "${grade.grade}" has maxScore (${grade.maxScore}) greater than 100` 
      }
    }
  }

  // Sort by minScore to check for overlaps
  const sortedGrades = [...grades].sort((a, b) => a.minScore - b.minScore)

  // Check for overlaps
  for (let i = 0; i < sortedGrades.length - 1; i++) {
    const current = sortedGrades[i]
    const next = sortedGrades[i + 1]
    
    // Allow adjacent ranges (current.maxScore === next.minScore - 1 or current.maxScore === next.minScore)
    if (current.maxScore >= next.minScore) {
      return { 
        valid: false, 
        error: `Grade ranges overlap: "${current.grade}" (${current.minScore}-${current.maxScore}) and "${next.grade}" (${next.minScore}-${next.maxScore})` 
      }
    }
  }

  return { valid: true }
}

/**
 * Check if grade ranges have gaps
 */
export function checkGradeRangeGaps(
  grades: Omit<GradeRange, 'id' | 'gradingSystemId' | 'createdAt'>[]
): { hasGaps: boolean; gaps: { from: number; to: number }[] } {
  if (grades.length === 0) {
    return { hasGaps: true, gaps: [{ from: 0, to: 100 }] }
  }

  const sortedGrades = [...grades].sort((a, b) => a.minScore - b.minScore)
  const gaps: { from: number; to: number }[] = []

  // Check gap at the beginning
  if (sortedGrades[0].minScore > 0) {
    gaps.push({ from: 0, to: sortedGrades[0].minScore - 1 })
  }

  // Check gaps between ranges
  for (let i = 0; i < sortedGrades.length - 1; i++) {
    const current = sortedGrades[i]
    const next = sortedGrades[i + 1]
    
    if (current.maxScore + 1 < next.minScore) {
      gaps.push({ from: current.maxScore + 1, to: next.minScore - 1 })
    }
  }

  // Check gap at the end
  const lastGrade = sortedGrades[sortedGrades.length - 1]
  if (lastGrade.maxScore < 100) {
    gaps.push({ from: lastGrade.maxScore + 1, to: 100 })
  }

  return { hasGaps: gaps.length > 0, gaps }
}

export class SubjectService {
  // ============================================
  // SUBJECT MANAGEMENT
  // ============================================

  /**
   * Create a new subject
   * Requirement 2.4: Implement subject CRUD
   */
  async createSubject(data: CreateSubjectInput): Promise<Subject> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Check for duplicate subject code in the same school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        schoolId: data.schoolId,
        code: data.code,
      },
    })

    if (existingSubject) {
      throw new Error(`Subject with code "${data.code}" already exists in this school`)
    }

    // If gradingSystemId is provided, validate it exists and belongs to the same school
    if (data.gradingSystemId) {
      const gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: data.gradingSystemId },
      })

      if (!gradingSystem) {
        throw new Error(`Grading system with id ${data.gradingSystemId} not found`)
      }

      if (gradingSystem.schoolId !== data.schoolId) {
        throw new Error('Grading system must belong to the same school as the subject')
      }
    }

    const subject = await prisma.subject.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        gradingSystemId: data.gradingSystemId,
      },
    })

    return mapPrismaSubjectToDomain(subject)
  }

  /**
   * Get subject by ID
   */
  async getSubjectById(id: string): Promise<Subject | null> {
    const subject = await prisma.subject.findUnique({
      where: { id },
    })

    if (!subject) return null
    return mapPrismaSubjectToDomain(subject)
  }

  /**
   * Get all subjects for a school
   */
  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    })

    return subjects.map(mapPrismaSubjectToDomain)
  }

  /**
   * Update a subject
   */
  async updateSubject(
    id: string,
    data: Partial<Pick<Subject, 'name' | 'code' | 'gradingSystemId'>>
  ): Promise<Subject> {
    const existingSubject = await prisma.subject.findUnique({
      where: { id },
    })

    if (!existingSubject) {
      throw new Error(`Subject with id ${id} not found`)
    }

    // If code is being updated, check for duplicates
    if (data.code && data.code !== existingSubject.code) {
      const duplicateSubject = await prisma.subject.findFirst({
        where: {
          schoolId: existingSubject.schoolId,
          code: data.code,
          id: { not: id },
        },
      })

      if (duplicateSubject) {
        throw new Error(`Subject with code "${data.code}" already exists in this school`)
      }
    }

    // If gradingSystemId is being updated, validate it
    if (data.gradingSystemId) {
      const gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: data.gradingSystemId },
      })

      if (!gradingSystem) {
        throw new Error(`Grading system with id ${data.gradingSystemId} not found`)
      }

      if (gradingSystem.schoolId !== existingSubject.schoolId) {
        throw new Error('Grading system must belong to the same school as the subject')
      }
    }

    const subject = await prisma.subject.update({
      where: { id },
      data,
    })

    return mapPrismaSubjectToDomain(subject)
  }

  /**
   * Assign a grading system to a subject
   * Requirement 2.4: Validate that each subject has a defined grading system
   */
  async assignGradingSystem(subjectId: string, gradingSystemId: string): Promise<Subject> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`)
    }

    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id: gradingSystemId },
    })

    if (!gradingSystem) {
      throw new Error(`Grading system with id ${gradingSystemId} not found`)
    }

    if (gradingSystem.schoolId !== subject.schoolId) {
      throw new Error('Grading system must belong to the same school as the subject')
    }

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: { gradingSystemId },
    })

    return mapPrismaSubjectToDomain(updatedSubject)
  }

  /**
   * Remove grading system from a subject
   */
  async removeGradingSystem(subjectId: string): Promise<Subject> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`)
    }

    // Check if subject is assigned to any class
    const classAssignments = await prisma.classSubject.count({
      where: { subjectId },
    })

    if (classAssignments > 0) {
      throw new Error('Cannot remove grading system from a subject that is assigned to classes')
    }

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: { gradingSystemId: null },
    })

    return mapPrismaSubjectToDomain(updatedSubject)
  }

  /**
   * Delete a subject (only if it has no class assignments or marks)
   */
  async deleteSubject(id: string): Promise<void> {
    // Check for class assignments
    const classAssignmentCount = await prisma.classSubject.count({
      where: { subjectId: id },
    })

    if (classAssignmentCount > 0) {
      throw new Error('Cannot delete subject with existing class assignments')
    }

    // Check for marks
    const markCount = await prisma.mark.count({
      where: { subjectId: id },
    })

    if (markCount > 0) {
      throw new Error('Cannot delete subject with existing marks')
    }

    // Check for staff assignments
    const staffAssignmentCount = await prisma.staffSubject.count({
      where: { subjectId: id },
    })

    if (staffAssignmentCount > 0) {
      throw new Error('Cannot delete subject with existing staff assignments')
    }

    await prisma.subject.delete({
      where: { id },
    })
  }

  /**
   * Check if a subject has a valid grading system
   * Requirement 2.4: Validate that each subject has a defined grading system
   */
  async hasValidGradingSystem(subjectId: string): Promise<boolean> {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { gradingSystem: true },
    })

    if (!subject || !subject.gradingSystemId) {
      return false
    }

    // Check if the grading system has grade ranges
    const gradeRangeCount = await prisma.gradeRange.count({
      where: { gradingSystemId: subject.gradingSystemId },
    })

    return gradeRangeCount > 0
  }

  /**
   * Get subject with grading system details
   */
  async getSubjectWithGradingSystem(id: string): Promise<{
    subject: Subject
    gradingSystem: GradingSystem | null
    gradeRanges: GradeRange[]
  } | null> {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        gradingSystem: {
          include: {
            grades: true,
          },
        },
      },
    })

    if (!subject) return null

    return {
      subject: mapPrismaSubjectToDomain(subject),
      gradingSystem: subject.gradingSystem 
        ? mapPrismaGradingSystemToDomain(subject.gradingSystem) 
        : null,
      gradeRanges: subject.gradingSystem?.grades.map(mapPrismaGradeRangeToDomain) ?? [],
    }
  }

  // ============================================
  // GRADING SYSTEM MANAGEMENT
  // ============================================

  /**
   * Create a new grading system with grade ranges
   * Requirement 2.4: Implement grading system configuration
   */
  async createGradingSystem(data: CreateGradingSystemInput): Promise<GradingSystem> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Check for duplicate grading system name in the same school
    const existingSystem = await prisma.gradingSystem.findFirst({
      where: {
        schoolId: data.schoolId,
        name: data.name,
      },
    })

    if (existingSystem) {
      throw new Error(`Grading system with name "${data.name}" already exists in this school`)
    }

    // Validate grade ranges
    const validation = validateGradeRanges(data.grades)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Create grading system with grade ranges in a transaction
    const gradingSystem = await prisma.$transaction(async (tx) => {
      const system = await tx.gradingSystem.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
        },
      })

      // Create grade ranges
      if (data.grades.length > 0) {
        await tx.gradeRange.createMany({
          data: data.grades.map(grade => ({
            gradingSystemId: system.id,
            grade: grade.grade,
            minScore: grade.minScore,
            maxScore: grade.maxScore,
            points: grade.points,
            remarks: grade.remarks,
          })),
        })
      }

      return system
    })

    return mapPrismaGradingSystemToDomain(gradingSystem)
  }

  /**
   * Get grading system by ID
   */
  async getGradingSystemById(id: string): Promise<GradingSystem | null> {
    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
    })

    if (!gradingSystem) return null
    return mapPrismaGradingSystemToDomain(gradingSystem)
  }

  /**
   * Get all grading systems for a school
   */
  async getGradingSystemsBySchool(schoolId: string): Promise<GradingSystem[]> {
    const gradingSystems = await prisma.gradingSystem.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    })

    return gradingSystems.map(mapPrismaGradingSystemToDomain)
  }

  /**
   * Get grading system with grade ranges
   */
  async getGradingSystemWithRanges(id: string): Promise<{
    gradingSystem: GradingSystem
    gradeRanges: GradeRange[]
  } | null> {
    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
      include: { grades: { orderBy: { minScore: 'desc' } } },
    })

    if (!gradingSystem) return null

    return {
      gradingSystem: mapPrismaGradingSystemToDomain(gradingSystem),
      gradeRanges: gradingSystem.grades.map(mapPrismaGradeRangeToDomain),
    }
  }

  /**
   * Update grading system name
   */
  async updateGradingSystem(
    id: string,
    data: { name: string }
  ): Promise<GradingSystem> {
    const existingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
    })

    if (!existingSystem) {
      throw new Error(`Grading system with id ${id} not found`)
    }

    // Check for duplicate name
    if (data.name !== existingSystem.name) {
      const duplicateSystem = await prisma.gradingSystem.findFirst({
        where: {
          schoolId: existingSystem.schoolId,
          name: data.name,
          id: { not: id },
        },
      })

      if (duplicateSystem) {
        throw new Error(`Grading system with name "${data.name}" already exists in this school`)
      }
    }

    const gradingSystem = await prisma.gradingSystem.update({
      where: { id },
      data: { name: data.name },
    })

    return mapPrismaGradingSystemToDomain(gradingSystem)
  }

  /**
   * Update grade ranges for a grading system
   * Replaces all existing grade ranges
   */
  async updateGradeRanges(
    gradingSystemId: string,
    grades: Omit<GradeRange, 'id' | 'gradingSystemId' | 'createdAt'>[]
  ): Promise<GradeRange[]> {
    const gradingSystem = await prisma.gradingSystem.findUnique({
      where: { id: gradingSystemId },
    })

    if (!gradingSystem) {
      throw new Error(`Grading system with id ${gradingSystemId} not found`)
    }

    // Validate grade ranges
    const validation = validateGradeRanges(grades)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Replace grade ranges in a transaction
    const gradeRanges = await prisma.$transaction(async (tx) => {
      // Delete existing grade ranges
      await tx.gradeRange.deleteMany({
        where: { gradingSystemId },
      })

      // Create new grade ranges
      await tx.gradeRange.createMany({
        data: grades.map(grade => ({
          gradingSystemId,
          grade: grade.grade,
          minScore: grade.minScore,
          maxScore: grade.maxScore,
          points: grade.points,
          remarks: grade.remarks,
        })),
      })

      // Return the new grade ranges
      return tx.gradeRange.findMany({
        where: { gradingSystemId },
        orderBy: { minScore: 'desc' },
      })
    })

    return gradeRanges.map(mapPrismaGradeRangeToDomain)
  }

  /**
   * Delete a grading system (only if not used by any subjects)
   */
  async deleteGradingSystem(id: string): Promise<void> {
    // Check for subjects using this grading system
    const subjectCount = await prisma.subject.count({
      where: { gradingSystemId: id },
    })

    if (subjectCount > 0) {
      throw new Error('Cannot delete grading system that is assigned to subjects')
    }

    // Delete grade ranges and grading system in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.gradeRange.deleteMany({
        where: { gradingSystemId: id },
      })

      await tx.gradingSystem.delete({
        where: { id },
      })
    })
  }

  /**
   * Get grade for a score based on grading system
   */
  async getGradeForScore(gradingSystemId: string, score: number): Promise<GradeRange | null> {
    const gradeRange = await prisma.gradeRange.findFirst({
      where: {
        gradingSystemId,
        minScore: { lte: score },
        maxScore: { gte: score },
      },
    })

    if (!gradeRange) return null
    return mapPrismaGradeRangeToDomain(gradeRange)
  }

  /**
   * Get grade ranges for a grading system
   */
  async getGradeRanges(gradingSystemId: string): Promise<GradeRange[]> {
    const gradeRanges = await prisma.gradeRange.findMany({
      where: { gradingSystemId },
      orderBy: { minScore: 'desc' },
    })

    return gradeRanges.map(mapPrismaGradeRangeToDomain)
  }
}

// Export singleton instance
export const subjectService = new SubjectService()
