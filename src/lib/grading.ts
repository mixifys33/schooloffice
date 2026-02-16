/**
 * Grading Utilities
 * 
 * Provides grade calculation functions for CA, Exam, and Final scores.
 * Integrates with the GradingSystem model to fetch appropriate grading scales.
 */

import { prisma } from '@/lib/db'
import type { GradingCategory, GradeRange } from '@prisma/client'

export interface GradeResult {
  grade: string
  points: number
  minScore: number
  maxScore: number
  remarks?: string
}

/**
 * Calculate grade from score (async - fetches from database)
 */
export async function calculateGrade(
  score: number,
  schoolId: string,
  category: GradingCategory = 'FINAL',
  classId?: string | null,
  termId?: string | null
): Promise<GradeResult | null> {
  const gradingSystem = await getGradingSystem(schoolId, category, classId, termId)
  
  if (!gradingSystem) {
    return null
  }
  
  return calculateGradeSync(score, gradingSystem.grades)
}

/**
 * Calculate grade from score (sync - uses pre-loaded grading system)
 */
export function calculateGradeSync(
  score: number,
  grades: Array<Pick<GradeRange, 'grade' | 'minScore' | 'maxScore' | 'points' | 'remarks'>>
): GradeResult | null {
  // Find matching grade range
  const gradeRange = grades.find(
    g => score >= g.minScore && score <= g.maxScore
  )
  
  if (!gradeRange) {
    return null
  }
  
  return {
    grade: gradeRange.grade,
    points: gradeRange.points,
    minScore: gradeRange.minScore,
    maxScore: gradeRange.maxScore,
    remarks: gradeRange.remarks || undefined,
  }
}

/**
 * Get appropriate grading system based on priority
 * Priority: Class+Term > Class > Term > School-wide
 */
export async function getGradingSystem(
  schoolId: string,
  category: GradingCategory,
  classId?: string | null,
  termId?: string | null
) {
  return await prisma.gradingSystem.findFirst({
    where: {
      schoolId,
      category,
      OR: [
        { classId, termId }, // Highest priority
        { classId, termId: null },
        { classId: null, termId },
        { classId: null, termId: null }, // Lowest priority (school-wide)
      ],
    },
    include: {
      grades: {
        orderBy: { minScore: 'desc' },
      },
    },
    orderBy: [
      { classId: 'desc' },
      { termId: 'desc' },
      { isDefault: 'desc' },
    ],
  })
}
