/**
 * Property Test: Marks Value Validation
 * **Feature: school-office, Property 14: Marks Value Validation**
 * **Validates: Requirements 7.3**
 * 
 * For any marks entry, the score SHALL be between 0 and the maximum marks 
 * defined for that exam/subject.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// PURE FUNCTIONS FOR MARKS VALIDATION
// ============================================

/**
 * Validate marks value against maximum
 * Requirement 7.3: Validate values against maximum marks defined
 */
function validateMarksValue(
  score: number,
  maxScore: number
): { valid: boolean; error?: string } {
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

/**
 * Calculate percentage from score and max score
 */
function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return (score / maxScore) * 100
}

/**
 * Determine grade based on percentage and grade ranges
 */
interface GradeRange {
  grade: string
  minScore: number
  maxScore: number
}

function determineGrade(
  percentage: number,
  gradeRanges: GradeRange[]
): string | undefined {
  for (const range of gradeRanges) {
    if (percentage >= range.minScore && percentage <= range.maxScore) {
      return range.grade
    }
  }
  return undefined
}

// ============================================
// TYPES FOR TESTING
// ============================================

interface Mark {
  id: string
  examId: string
  studentId: string
  subjectId: string
  score: number
  maxScore: number
  grade?: string
}

// ============================================
// SIMULATED MARKS STORE WITH VALIDATION
// ============================================

class MarksStore {
  private marks: Map<string, Mark> = new Map()
  private gradeRanges: GradeRange[] = [
    { grade: 'A', minScore: 80, maxScore: 100 },
    { grade: 'B', minScore: 60, maxScore: 79 },
    { grade: 'C', minScore: 40, maxScore: 59 },
    { grade: 'D', minScore: 20, maxScore: 39 },
    { grade: 'F', minScore: 0, maxScore: 19 },
  ]

  /**
   * Enter marks with validation
   * Property 14: Score must be between 0 and maxScore
   */
  enterMark(
    examId: string,
    studentId: string,
    subjectId: string,
    score: number,
    maxScore: number
  ): { success: boolean; error?: string; mark?: Mark } {
    // Validate marks value
    const validation = validateMarksValue(score, maxScore)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Calculate grade
    const percentage = calculatePercentage(score, maxScore)
    const grade = determineGrade(percentage, this.gradeRanges)

    const markId = `${examId}-${studentId}-${subjectId}`
    const mark: Mark = {
      id: markId,
      examId,
      studentId,
      subjectId,
      score,
      maxScore,
      grade,
    }

    this.marks.set(markId, mark)
    return { success: true, mark }
  }

  getMark(examId: string, studentId: string, subjectId: string): Mark | undefined {
    const markId = `${examId}-${studentId}-${subjectId}`
    return this.marks.get(markId)
  }

  getAllMarks(): Mark[] {
    return Array.from(this.marks.values())
  }

  setGradeRanges(ranges: GradeRange[]): void {
    this.gradeRanges = ranges
  }
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

const validScoreArbitrary = (maxScore: number) => 
  fc.integer({ min: 0, max: maxScore })

const invalidNegativeScoreArbitrary = fc.integer({ min: -1000, max: -1 })

const invalidExceedingScoreArbitrary = (maxScore: number) =>
  fc.integer({ min: maxScore + 1, max: maxScore + 1000 })

const validMaxScoreArbitrary = fc.integer({ min: 1, max: 1000 })

const invalidMaxScoreArbitrary = fc.integer({ min: -1000, max: 0 })

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 14: Marks Value Validation', () => {
  /**
   * Property: Valid scores (0 to maxScore) are accepted
   */
  it('valid scores (0 to maxScore) are accepted', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          return fc.assert(
            fc.property(
              validScoreArbitrary(maxScore),
              (score) => {
                const store = new MarksStore()
                const result = store.enterMark(examId, studentId, subjectId, score, maxScore)
                
                return result.success === true && 
                       result.mark !== undefined &&
                       result.mark.score === score &&
                       result.mark.maxScore === maxScore
              }
            ),
            { numRuns: 20 }
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Negative scores are rejected
   */
  it('negative scores are rejected', () => {
    fc.assert(
      fc.property(
        invalidNegativeScoreArbitrary,
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (score, maxScore, examId, studentId, subjectId) => {
          const store = new MarksStore()
          const result = store.enterMark(examId, studentId, subjectId, score, maxScore)
          
          return result.success === false && 
                 result.error?.includes('negative')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Scores exceeding maximum are rejected
   */
  it('scores exceeding maximum are rejected', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          return fc.assert(
            fc.property(
              invalidExceedingScoreArbitrary(maxScore),
              (score) => {
                const store = new MarksStore()
                const result = store.enterMark(examId, studentId, subjectId, score, maxScore)
                
                return result.success === false && 
                       result.error?.includes('exceeds')
              }
            ),
            { numRuns: 20 }
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Invalid maximum scores (0 or negative) are rejected
   */
  it('invalid maximum scores (0 or negative) are rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // Any score
        invalidMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (score, maxScore, examId, studentId, subjectId) => {
          const store = new MarksStore()
          const result = store.enterMark(examId, studentId, subjectId, score, maxScore)
          
          return result.success === false && 
                 result.error?.includes('Maximum score must be greater than 0')
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property: Score of exactly 0 is valid
   */
  it('score of exactly 0 is valid', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          const store = new MarksStore()
          const result = store.enterMark(examId, studentId, subjectId, 0, maxScore)
          
          return result.success === true && 
                 result.mark?.score === 0
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Score of exactly maxScore is valid
   */
  it('score of exactly maxScore is valid', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          const store = new MarksStore()
          const result = store.enterMark(examId, studentId, subjectId, maxScore, maxScore)
          
          return result.success === true && 
                 result.mark?.score === maxScore
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All stored marks have valid score ranges
   */
  it('all stored marks have valid score ranges', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            examId: fc.uuid(),
            studentId: fc.uuid(),
            subjectId: fc.uuid(),
            score: fc.integer({ min: -100, max: 200 }), // Mix of valid and invalid
            maxScore: fc.integer({ min: -10, max: 150 }), // Mix of valid and invalid
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (entries) => {
          const store = new MarksStore()
          
          // Try to enter all marks
          entries.forEach(entry => {
            store.enterMark(
              entry.examId,
              entry.studentId,
              entry.subjectId,
              entry.score,
              entry.maxScore
            )
          })
          
          // Verify: all marks in the store have valid ranges
          const allMarks = store.getAllMarks()
          
          for (const mark of allMarks) {
            // Score must be >= 0
            if (mark.score < 0) return false
            
            // MaxScore must be > 0
            if (mark.maxScore <= 0) return false
            
            // Score must be <= maxScore
            if (mark.score > mark.maxScore) return false
          }
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Percentage calculation is correct for valid marks
   */
  it('percentage calculation is correct for valid marks', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          return fc.assert(
            fc.property(
              validScoreArbitrary(maxScore),
              (score) => {
                const expectedPercentage = (score / maxScore) * 100
                const actualPercentage = calculatePercentage(score, maxScore)
                
                // Allow for floating point precision
                return Math.abs(expectedPercentage - actualPercentage) < 0.0001
              }
            ),
            { numRuns: 20 }
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Grade is assigned based on percentage
   */
  it('grade is assigned based on percentage', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          return fc.assert(
            fc.property(
              validScoreArbitrary(maxScore),
              (score) => {
                const store = new MarksStore()
                const result = store.enterMark(examId, studentId, subjectId, score, maxScore)
                
                if (!result.success || !result.mark) return false
                
                const percentage = calculatePercentage(score, maxScore)
                
                // The grade ranges use >= minScore and <= maxScore
                // So we need to check if the percentage falls within the range
                // Grade ranges: A: 80-100, B: 60-79, C: 40-59, D: 20-39, F: 0-19
                const expectedGrade = determineGrade(percentage, [
                  { grade: 'A', minScore: 80, maxScore: 100 },
                  { grade: 'B', minScore: 60, maxScore: 79 },
                  { grade: 'C', minScore: 40, maxScore: 59 },
                  { grade: 'D', minScore: 20, maxScore: 39 },
                  { grade: 'F', minScore: 0, maxScore: 19 },
                ])
                
                return result.mark.grade === expectedGrade
              }
            ),
            { numRuns: 20 }
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateMarksValue function is consistent
   */
  it('validateMarksValue function is consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 200 }),
        fc.integer({ min: -10, max: 150 }),
        (score, maxScore) => {
          const result = validateMarksValue(score, maxScore)
          
          // If valid, all conditions must be met
          if (result.valid) {
            return score >= 0 && maxScore > 0 && score <= maxScore
          }
          
          // If invalid, at least one condition must be violated
          return score < 0 || maxScore <= 0 || score > maxScore
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Boundary values are handled correctly
   */
  it('boundary values are handled correctly', () => {
    fc.assert(
      fc.property(
        validMaxScoreArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (maxScore, examId, studentId, subjectId) => {
          const store = new MarksStore()
          
          // Test boundary: score = 0
          const result0 = store.enterMark(examId, studentId + '-0', subjectId, 0, maxScore)
          if (!result0.success) return false
          
          // Test boundary: score = maxScore
          const resultMax = store.enterMark(examId, studentId + '-max', subjectId, maxScore, maxScore)
          if (!resultMax.success) return false
          
          // Test boundary: score = maxScore + 1 (should fail)
          const resultOver = store.enterMark(examId, studentId + '-over', subjectId, maxScore + 1, maxScore)
          if (resultOver.success) return false
          
          // Test boundary: score = -1 (should fail)
          const resultNeg = store.enterMark(examId, studentId + '-neg', subjectId, -1, maxScore)
          if (resultNeg.success) return false
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Different maxScore values are handled independently
   */
  it('different maxScore values are handled independently', () => {
    fc.assert(
      fc.property(
        fc.array(validMaxScoreArbitrary, { minLength: 2, maxLength: 5 }),
        fc.uuid(),
        fc.uuid(),
        (maxScores, examId, studentId) => {
          const store = new MarksStore()
          
          // Enter marks with different maxScores
          maxScores.forEach((maxScore, i) => {
            const score = Math.floor(maxScore / 2) // Valid score for each maxScore
            store.enterMark(examId, studentId, `subject-${i}`, score, maxScore)
          })
          
          // Verify each mark has correct maxScore
          const allMarks = store.getAllMarks()
          
          for (let i = 0; i < maxScores.length; i++) {
            const mark = allMarks.find(m => m.subjectId === `subject-${i}`)
            if (!mark) return false
            if (mark.maxScore !== maxScores[i]) return false
            if (mark.score !== Math.floor(maxScores[i] / 2)) return false
          }
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
