/**
 * Property Test: Subject-Grading System Integrity
 * **Feature: school-office, Property 4: Subject-Grading System Integrity**
 * **Validates: Requirements 2.4**
 * 
 * For any subject assigned to a class, that subject SHALL have a valid 
 * grading system defined before assignment is allowed.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// PURE FUNCTIONS FOR GRADING SYSTEM VALIDATION
// (Duplicated here to avoid Prisma dependency in tests)
// ============================================

interface GradeRangeInput {
  grade: string
  minScore: number
  maxScore: number
  points: number
  remarks?: string
}

/**
 * Validate grade ranges for a grading system
 * - Each grade must have minScore <= maxScore
 * - Grade ranges should not overlap
 * - Scores should be within 0-100
 */
function validateGradeRanges(
  grades: GradeRangeInput[]
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
function checkGradeRangeGaps(
  grades: GradeRangeInput[]
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

// ============================================
// TYPES FOR TESTING
// ============================================

interface GradingSystem {
  id: string
  schoolId: string
  name: string
  grades: GradeRangeInput[]
}

interface Subject {
  id: string
  schoolId: string
  name: string
  code: string
  gradingSystemId?: string
}

interface ClassSubjectAssignment {
  classId: string
  subjectId: string
}

// ============================================
// SIMULATED STORES WITH VALIDATION
// ============================================

class GradingSystemStore {
  private gradingSystems: Map<string, GradingSystem> = new Map()

  addGradingSystem(system: GradingSystem): { success: boolean; error?: string } {
    // Validate grade ranges
    const validation = validateGradeRanges(system.grades)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    this.gradingSystems.set(system.id, system)
    return { success: true }
  }

  getGradingSystem(id: string): GradingSystem | undefined {
    return this.gradingSystems.get(id)
  }

  hasValidGradingSystem(id: string): boolean {
    const system = this.gradingSystems.get(id)
    if (!system) return false
    return system.grades.length > 0 && validateGradeRanges(system.grades).valid
  }
}

class SubjectStore {
  private subjects: Map<string, Subject> = new Map()
  private gradingSystemStore: GradingSystemStore

  constructor(gradingSystemStore: GradingSystemStore) {
    this.gradingSystemStore = gradingSystemStore
  }

  addSubject(subject: Subject): { success: boolean; error?: string } {
    // If gradingSystemId is provided, validate it exists
    if (subject.gradingSystemId) {
      if (!this.gradingSystemStore.hasValidGradingSystem(subject.gradingSystemId)) {
        return { success: false, error: 'Invalid or non-existent grading system' }
      }
    }

    this.subjects.set(subject.id, subject)
    return { success: true }
  }

  getSubject(id: string): Subject | undefined {
    return this.subjects.get(id)
  }

  assignGradingSystem(subjectId: string, gradingSystemId: string): { success: boolean; error?: string } {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      return { success: false, error: 'Subject not found' }
    }

    if (!this.gradingSystemStore.hasValidGradingSystem(gradingSystemId)) {
      return { success: false, error: 'Invalid or non-existent grading system' }
    }

    subject.gradingSystemId = gradingSystemId
    return { success: true }
  }

  hasValidGradingSystem(subjectId: string): boolean {
    const subject = this.subjects.get(subjectId)
    if (!subject || !subject.gradingSystemId) return false
    return this.gradingSystemStore.hasValidGradingSystem(subject.gradingSystemId)
  }
}

class ClassSubjectStore {
  private assignments: Map<string, ClassSubjectAssignment> = new Map()
  private subjectStore: SubjectStore

  constructor(subjectStore: SubjectStore) {
    this.subjectStore = subjectStore
  }

  /**
   * Assign a subject to a class
   * Property 4: Subject must have a valid grading system before assignment
   */
  assignSubjectToClass(classId: string, subjectId: string): { success: boolean; error?: string } {
    // Check if subject has a valid grading system
    if (!this.subjectStore.hasValidGradingSystem(subjectId)) {
      return { 
        success: false, 
        error: 'Subject must have a valid grading system before assignment to a class' 
      }
    }

    const key = `${classId}-${subjectId}`
    this.assignments.set(key, { classId, subjectId })
    return { success: true }
  }

  getAssignmentsByClass(classId: string): ClassSubjectAssignment[] {
    return Array.from(this.assignments.values())
      .filter(a => a.classId === classId)
  }

  /**
   * Verify all assigned subjects have valid grading systems
   */
  verifyAllAssignmentsHaveGradingSystems(): boolean {
    for (const assignment of this.assignments.values()) {
      if (!this.subjectStore.hasValidGradingSystem(assignment.subjectId)) {
        return false
      }
    }
    return true
  }
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

/**
 * Generate a set of non-overlapping grade ranges
 */
const validGradeRangesArbitrary = fc.integer({ min: 1, max: 5 }).chain(count => {
  // Generate non-overlapping ranges by dividing 0-100 into segments
  const segmentSize = Math.floor(100 / count)
  const grades = ['A', 'B', 'C', 'D', 'E', 'F']
  
  return fc.tuple(
    ...Array.from({ length: count }, (_, i) => {
      const segmentStart = i * segmentSize
      const segmentEnd = i === count - 1 ? 100 : (i + 1) * segmentSize - 1
      
      return fc.record({
        grade: fc.constant(grades[i % grades.length]),
        minScore: fc.constant(segmentStart),
        maxScore: fc.constant(segmentEnd),
        points: fc.integer({ min: 0, max: 10 }),
        remarks: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      })
    })
  )
})

/**
 * Generate a valid grading system
 */
const gradingSystemArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
}).chain(base => 
  validGradeRangesArbitrary.map(grades => ({
    ...base,
    grades: grades as GradeRangeInput[],
  }))
)

/**
 * Generate a subject
 */
const subjectArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  code: fc.string({ minLength: 2, maxLength: 10 }),
  gradingSystemId: fc.option(fc.uuid(), { nil: undefined }),
})

/**
 * Generate a class
 */
const classArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  level: fc.integer({ min: 1, max: 12 }),
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 4: Subject-Grading System Integrity', () => {
  /**
   * Property: validateGradeRanges rejects empty grade arrays
   */
  it('validateGradeRanges rejects empty grade arrays', () => {
    const result = validateGradeRanges([])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('At least one grade range is required')
  })

  /**
   * Property: validateGradeRanges rejects grades with minScore > maxScore
   */
  it('validateGradeRanges rejects grades with minScore > maxScore', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // minScore (will be swapped to be > maxScore)
        fc.integer({ min: 0, max: 99 }),  // maxScore (will be < minScore)
        (min, max) => {
          // Ensure min > max
          const actualMin = Math.max(min, max + 1)
          const actualMax = Math.min(min - 1, max)
          
          if (actualMin <= actualMax) return true // Skip if we can't create invalid range
          
          const grades: GradeRangeInput[] = [{
            grade: 'A',
            minScore: actualMin,
            maxScore: actualMax,
            points: 4,
          }]
          
          const result = validateGradeRanges(grades)
          return result.valid === false && result.error !== undefined
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateGradeRanges rejects negative minScore
   */
  it('validateGradeRanges rejects negative minScore', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: -1 }), // negative minScore
        fc.integer({ min: 0, max: 100 }),   // valid maxScore
        (minScore, maxScore) => {
          const grades: GradeRangeInput[] = [{
            grade: 'A',
            minScore,
            maxScore,
            points: 4,
          }]
          
          const result = validateGradeRanges(grades)
          return result.valid === false && result.error?.includes('negative')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateGradeRanges rejects maxScore > 100
   */
  it('validateGradeRanges rejects maxScore > 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),   // valid minScore
        fc.integer({ min: 101, max: 200 }), // invalid maxScore
        (minScore, maxScore) => {
          const grades: GradeRangeInput[] = [{
            grade: 'A',
            minScore,
            maxScore,
            points: 4,
          }]
          
          const result = validateGradeRanges(grades)
          return result.valid === false && result.error?.includes('greater than 100')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateGradeRanges accepts valid non-overlapping ranges
   */
  it('validateGradeRanges accepts valid non-overlapping ranges', () => {
    fc.assert(
      fc.property(
        validGradeRangesArbitrary,
        (grades) => {
          const result = validateGradeRanges(grades as GradeRangeInput[])
          return result.valid === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateGradeRanges detects overlapping ranges
   */
  it('validateGradeRanges detects overlapping ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),  // first range start
        fc.integer({ min: 20, max: 50 }), // first range end (will overlap with second)
        fc.integer({ min: 70, max: 100 }), // second range end
        (start1, end1, end2) => {
          // Create two overlapping ranges
          // First range: [start1, end1]
          // Second range: [end1 - 10, end2] - overlaps with first
          const overlapStart = Math.max(0, end1 - 10)
          
          // Skip if ranges wouldn't actually overlap or are invalid
          if (end1 < start1 || end2 < overlapStart || end1 < overlapStart) {
            return true
          }
          
          const grades: GradeRangeInput[] = [
            { grade: 'A', minScore: start1, maxScore: end1, points: 4 },
            { grade: 'B', minScore: overlapStart, maxScore: end2, points: 3 },
          ]
          
          // Only test if ranges actually overlap (first.maxScore >= second.minScore)
          if (grades[0].maxScore < grades[1].minScore) {
            return true // Skip non-overlapping cases
          }
          
          const result = validateGradeRanges(grades)
          return result.valid === false && result.error?.includes('overlap')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Subject without grading system cannot be assigned to class
   */
  it('subject without grading system cannot be assigned to class', () => {
    fc.assert(
      fc.property(
        subjectArbitrary,
        classArbitrary,
        (subject, classData) => {
          const gradingSystemStore = new GradingSystemStore()
          const subjectStore = new SubjectStore(gradingSystemStore)
          const classSubjectStore = new ClassSubjectStore(subjectStore)
          
          // Create subject without grading system
          const subjectWithoutGrading = { ...subject, gradingSystemId: undefined }
          subjectStore.addSubject(subjectWithoutGrading)
          
          // Try to assign to class
          const result = classSubjectStore.assignSubjectToClass(classData.id, subjectWithoutGrading.id)
          
          // Should fail because subject has no grading system
          return result.success === false && 
                 result.error?.includes('grading system')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Subject with valid grading system can be assigned to class
   */
  it('subject with valid grading system can be assigned to class', () => {
    fc.assert(
      fc.property(
        gradingSystemArbitrary,
        subjectArbitrary,
        classArbitrary,
        (gradingSystem, subject, classData) => {
          const gradingSystemStore = new GradingSystemStore()
          const subjectStore = new SubjectStore(gradingSystemStore)
          const classSubjectStore = new ClassSubjectStore(subjectStore)
          
          // Add valid grading system
          gradingSystemStore.addGradingSystem(gradingSystem)
          
          // Create subject with grading system
          const subjectWithGrading = { 
            ...subject, 
            schoolId: gradingSystem.schoolId,
            gradingSystemId: gradingSystem.id 
          }
          subjectStore.addSubject(subjectWithGrading)
          
          // Try to assign to class
          const result = classSubjectStore.assignSubjectToClass(classData.id, subjectWithGrading.id)
          
          // Should succeed because subject has valid grading system
          return result.success === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All class-subject assignments maintain grading system integrity
   */
  it('all class-subject assignments maintain grading system integrity', () => {
    fc.assert(
      fc.property(
        fc.array(gradingSystemArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(subjectArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(classArbitrary, { minLength: 1, maxLength: 3 }),
        (gradingSystems, subjects, classes) => {
          const gradingSystemStore = new GradingSystemStore()
          const subjectStore = new SubjectStore(gradingSystemStore)
          const classSubjectStore = new ClassSubjectStore(subjectStore)
          
          // Add all grading systems
          for (const gs of gradingSystems) {
            gradingSystemStore.addGradingSystem(gs)
          }
          
          // Add subjects, some with grading systems, some without
          for (let i = 0; i < subjects.length; i++) {
            const subject = subjects[i]
            if (i < gradingSystems.length) {
              // Assign grading system to some subjects
              subject.gradingSystemId = gradingSystems[i % gradingSystems.length].id
              subject.schoolId = gradingSystems[i % gradingSystems.length].schoolId
            } else {
              // Leave some without grading system
              subject.gradingSystemId = undefined
            }
            subjectStore.addSubject(subject)
          }
          
          // Try to assign all subjects to all classes
          for (const classData of classes) {
            for (const subject of subjects) {
              classSubjectStore.assignSubjectToClass(classData.id, subject.id)
            }
          }
          
          // Verify: all successful assignments have valid grading systems
          return classSubjectStore.verifyAllAssignmentsHaveGradingSystems()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Assigning grading system to subject enables class assignment
   */
  it('assigning grading system to subject enables class assignment', () => {
    fc.assert(
      fc.property(
        gradingSystemArbitrary,
        subjectArbitrary,
        classArbitrary,
        (gradingSystem, subject, classData) => {
          const gradingSystemStore = new GradingSystemStore()
          const subjectStore = new SubjectStore(gradingSystemStore)
          const classSubjectStore = new ClassSubjectStore(subjectStore)
          
          // Add grading system
          gradingSystemStore.addGradingSystem(gradingSystem)
          
          // Create subject without grading system
          const subjectWithoutGrading = { 
            ...subject, 
            schoolId: gradingSystem.schoolId,
            gradingSystemId: undefined 
          }
          subjectStore.addSubject(subjectWithoutGrading)
          
          // First assignment should fail
          const firstResult = classSubjectStore.assignSubjectToClass(classData.id, subjectWithoutGrading.id)
          
          // Assign grading system to subject
          subjectStore.assignGradingSystem(subjectWithoutGrading.id, gradingSystem.id)
          
          // Second assignment should succeed
          const secondResult = classSubjectStore.assignSubjectToClass(classData.id, subjectWithoutGrading.id)
          
          return firstResult.success === false && secondResult.success === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: checkGradeRangeGaps correctly identifies gaps
   */
  it('checkGradeRangeGaps correctly identifies gaps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 40 }), // gap start
        fc.integer({ min: 60, max: 90 }), // gap end
        (gapStart, gapEnd) => {
          // Create grades with a gap in the middle
          const grades: GradeRangeInput[] = [
            { grade: 'A', minScore: 0, maxScore: gapStart - 1, points: 4 },
            { grade: 'B', minScore: gapEnd + 1, maxScore: 100, points: 3 },
          ]
          
          const result = checkGradeRangeGaps(grades)
          
          // Should detect the gap
          return result.hasGaps === true && 
                 result.gaps.some(g => g.from === gapStart && g.to === gapEnd)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Complete grade ranges (0-100) have no gaps
   */
  it('complete grade ranges (0-100) have no gaps', () => {
    fc.assert(
      fc.property(
        validGradeRangesArbitrary,
        (grades) => {
          // Adjust grades to cover 0-100 completely
          const sortedGrades = [...(grades as GradeRangeInput[])].sort((a, b) => a.minScore - b.minScore)
          
          // Set first grade to start at 0
          if (sortedGrades.length > 0) {
            sortedGrades[0].minScore = 0
          }
          
          // Set last grade to end at 100
          if (sortedGrades.length > 0) {
            sortedGrades[sortedGrades.length - 1].maxScore = 100
          }
          
          // Fill gaps between grades
          for (let i = 0; i < sortedGrades.length - 1; i++) {
            sortedGrades[i + 1].minScore = sortedGrades[i].maxScore + 1
          }
          
          const result = checkGradeRangeGaps(sortedGrades)
          
          // Should have no gaps
          return result.hasGaps === false && result.gaps.length === 0
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Subject with invalid grading system (empty grades) cannot be assigned
   */
  it('subject with invalid grading system (empty grades) cannot be assigned', () => {
    fc.assert(
      fc.property(
        subjectArbitrary,
        classArbitrary,
        fc.uuid(),
        (subject, classData, gradingSystemId) => {
          const gradingSystemStore = new GradingSystemStore()
          const subjectStore = new SubjectStore(gradingSystemStore)
          const classSubjectStore = new ClassSubjectStore(subjectStore)
          
          // Add grading system with empty grades (invalid)
          const invalidGradingSystem: GradingSystem = {
            id: gradingSystemId,
            schoolId: subject.schoolId,
            name: 'Invalid System',
            grades: [], // Empty grades
          }
          
          // This should fail because grades are empty
          const gsResult = gradingSystemStore.addGradingSystem(invalidGradingSystem)
          expect(gsResult.success).toBe(false)
          
          // Create subject referencing the (non-existent) grading system
          const subjectWithInvalidGrading = { 
            ...subject, 
            gradingSystemId: gradingSystemId 
          }
          subjectStore.addSubject(subjectWithInvalidGrading)
          
          // Try to assign to class - should fail
          const result = classSubjectStore.assignSubjectToClass(classData.id, subjectWithInvalidGrading.id)
          
          return result.success === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Grade lookup returns correct grade for any score
   */
  it('grade lookup returns correct grade for any score within range', () => {
    fc.assert(
      fc.property(
        validGradeRangesArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (grades, score) => {
          const gradeRanges = grades as GradeRangeInput[]
          
          // Find the grade for the score
          const matchingGrade = gradeRanges.find(
            g => score >= g.minScore && score <= g.maxScore
          )
          
          // If a matching grade exists, verify it's correct
          if (matchingGrade) {
            return score >= matchingGrade.minScore && score <= matchingGrade.maxScore
          }
          
          // If no matching grade, verify score is in a gap
          const gapCheck = checkGradeRangeGaps(gradeRanges)
          return gapCheck.gaps.some(gap => score >= gap.from && score <= gap.to)
        }
      ),
      { numRuns: 20 }
    )
  })
})
