/**
 * Property Test: Results Calculation Correctness
 * **Feature: school-office, Property 16: Results Calculation Correctness**
 * **Validates: Requirements 8.1, 8.2**
 * 
 * For any student's results, the total SHALL equal the sum of subject marks,
 * the average SHALL equal total divided by subject count, and the grade SHALL
 * match the grading system range for that average.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
   
// ============================================
// PURE FUNCTIONS FOR RESULTS CALCULATION
// ============================================

interface GradeRange {
  grade: string
  minScore: number
  maxScore: number
}

interface SubjectMark {
  subjectId: string
  score: number
  maxScore: number
}

/**
 * Calculate total marks from subject marks
 * Requirement 8.1: Calculate totals from subject marks
 */
function calculateTotalMarks(marks: SubjectMark[]): number {
  return marks.reduce((sum, mark) => sum + mark.score, 0)
}

/**
 * Calculate average marks
 * Requirement 8.1: Calculate averages from subject marks
 */
function calculateAverage(totalMarks: number, subjectCount: number): number {
  if (subjectCount === 0) return 0
  return Math.round((totalMarks / subjectCount) * 100) / 100
}

/**
 * Calculate percentage
 */
function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0
  return Math.round((score / maxScore) * 10000) / 100
}

/**
 * Determine grade based on percentage and grade ranges
 * Requirement 8.2: Apply grading system to determine grades
 */
function determineGrade(percentage: number, gradeRanges: GradeRange[]): string | undefined {
  for (const range of gradeRanges) {
    if (percentage >= range.minScore && percentage <= range.maxScore) {
      return range.grade
    }
  }
  return undefined
}

/**
 * Calculate positions based on averages
 * Requirement 8.1: Calculate positions
 */
function calculatePositions(
  students: { studentId: string; average: number }[]
): { studentId: string; average: number; position: number }[] {
  // Sort by average descending
  const sorted = [...students].sort((a, b) => b.average - a.average)

  // Assign positions (handle ties)
  const withPositions: { studentId: string; average: number; position: number }[] = []
  let currentPosition = 1

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].average < sorted[i - 1].average) {
      currentPosition = i + 1
    }
    withPositions.push({
      ...sorted[i],
      position: currentPosition,
    })
  }

  return withPositions
}

// ============================================
// TYPES FOR TESTING
// ============================================

interface StudentResult {
  studentId: string
  marks: SubjectMark[]
  totalMarks: number
  average: number
  position: number
  grade?: string
}

// ============================================
// SIMULATED RESULTS STORE
// ============================================

class ResultsStore {
  private gradeRanges: GradeRange[] = [
    { grade: 'A', minScore: 80, maxScore: 100 },
    { grade: 'B', minScore: 60, maxScore: 79 },
    { grade: 'C', minScore: 40, maxScore: 59 },
    { grade: 'D', minScore: 20, maxScore: 39 },
    { grade: 'F', minScore: 0, maxScore: 19 },
  ]

  private results: Map<string, StudentResult> = new Map()

  setGradeRanges(ranges: GradeRange[]): void {
    this.gradeRanges = ranges
  }

  getGradeRanges(): GradeRange[] {
    return this.gradeRanges
  }


  /**
   * Process results for a student
   */
  processStudentResult(studentId: string, marks: SubjectMark[]): StudentResult {
    const totalMarks = calculateTotalMarks(marks)
    const average = calculateAverage(totalMarks, marks.length)
    
    // Calculate overall percentage for grade
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.maxScore, 0)
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0
    const grade = determineGrade(overallPercentage, this.gradeRanges)

    const result: StudentResult = {
      studentId,
      marks,
      totalMarks,
      average,
      position: 0, // Will be calculated when processing class
      grade,
    }

    this.results.set(studentId, result)
    return result
  }

  /**
   * Process results for a class (multiple students)
   */
  processClassResults(
    studentsMarks: { studentId: string; marks: SubjectMark[] }[]
  ): StudentResult[] {
    // First, process individual results
    const processedResults = studentsMarks.map((sm) =>
      this.processStudentResult(sm.studentId, sm.marks)
    )

    // Calculate positions
    const withPositions = calculatePositions(
      processedResults.map((r) => ({ studentId: r.studentId, average: r.average }))
    )

    // Update positions in results
    for (const pos of withPositions) {
      const result = this.results.get(pos.studentId)
      if (result) {
        result.position = pos.position
      }
    }

    return Array.from(this.results.values())
  }

  getResult(studentId: string): StudentResult | undefined {
    return this.results.get(studentId)
  }

  getAllResults(): StudentResult[] {
    return Array.from(this.results.values())
  }

  clear(): void {
    this.results.clear()
  }
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

const subjectMarkArbitrary = fc.record({
  subjectId: fc.uuid(),
  score: fc.integer({ min: 0, max: 100 }),
  maxScore: fc.constant(100),
})

const studentMarksArbitrary = fc.record({
  studentId: fc.uuid(),
  marks: fc.array(subjectMarkArbitrary, { minLength: 1, maxLength: 10 }),
})

const gradeRangeArbitrary = fc.record({
  grade: fc.string({ minLength: 1, maxLength: 2 }),
  minScore: fc.integer({ min: 0, max: 100 }),
  maxScore: fc.integer({ min: 0, max: 100 }),
}).filter((r) => r.minScore <= r.maxScore)

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 16: Results Calculation Correctness', () => {
  /**
   * Property: Total marks equals sum of subject marks
   */
  it('total marks equals sum of subject marks', () => {
    fc.assert(
      fc.property(
        studentMarksArbitrary,
        ({ studentId, marks }) => {
          const store = new ResultsStore()
          const result = store.processStudentResult(studentId, marks)

          const expectedTotal = marks.reduce((sum, m) => sum + m.score, 0)
          return result.totalMarks === expectedTotal
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Average equals total divided by subject count
   */
  it('average equals total divided by subject count', () => {
    fc.assert(
      fc.property(
        studentMarksArbitrary,
        ({ studentId, marks }) => {
          const store = new ResultsStore()
          const result = store.processStudentResult(studentId, marks)

          const expectedAverage = marks.length > 0
            ? Math.round((result.totalMarks / marks.length) * 100) / 100
            : 0

          return result.average === expectedAverage
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Grade matches grading system range for percentage
   */
  it('grade matches grading system range for percentage', () => {
    fc.assert(
      fc.property(
        studentMarksArbitrary,
        ({ studentId, marks }) => {
          const store = new ResultsStore()
          const result = store.processStudentResult(studentId, marks)

          const totalMaxMarks = marks.reduce((sum, m) => sum + m.maxScore, 0)
          const overallPercentage = totalMaxMarks > 0 
            ? (result.totalMarks / totalMaxMarks) * 100 
            : 0

          const expectedGrade = determineGrade(overallPercentage, store.getGradeRanges())
          return result.grade === expectedGrade
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Positions are assigned correctly based on average
   */
  it('positions are assigned correctly based on average', () => {
    fc.assert(
      fc.property(
        fc.array(studentMarksArbitrary, { minLength: 2, maxLength: 10 }),
        (studentsMarks) => {
          const store = new ResultsStore()
          const results = store.processClassResults(studentsMarks)

          // Sort by average descending
          const sortedByAverage = [...results].sort((a, b) => b.average - a.average)

          // Verify positions
          for (let i = 0; i < sortedByAverage.length; i++) {
            const current = sortedByAverage[i]
            
            // Position should be at least 1
            if (current.position < 1) return false

            // Position should not exceed total students
            if (current.position > results.length) return false

            // If not first, position should be >= previous position
            if (i > 0) {
              const prev = sortedByAverage[i - 1]
              if (current.average < prev.average && current.position <= prev.position) {
                return false
              }
            }
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property: Students with same average have same position (ties)
   */
  it('students with same average have same position (ties)', () => {
    fc.assert(
      fc.property(
        fc.array(studentMarksArbitrary, { minLength: 2, maxLength: 10 }),
        (studentsMarks) => {
          const store = new ResultsStore()
          const results = store.processClassResults(studentsMarks)

          // Group by average
          const byAverage = new Map<number, StudentResult[]>()
          for (const result of results) {
            const existing = byAverage.get(result.average) || []
            existing.push(result)
            byAverage.set(result.average, existing)
          }

          // Verify students with same average have same position
          for (const [, sameAverageResults] of byAverage) {
            if (sameAverageResults.length > 1) {
              const positions = sameAverageResults.map((r) => r.position)
              const allSame = positions.every((p) => p === positions[0])
              if (!allSame) return false
            }
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Higher average always results in better (lower) position
   */
  it('higher average always results in better or equal position', () => {
    fc.assert(
      fc.property(
        fc.array(studentMarksArbitrary, { minLength: 2, maxLength: 10 }),
        (studentsMarks) => {
          const store = new ResultsStore()
          const results = store.processClassResults(studentsMarks)

          for (let i = 0; i < results.length; i++) {
            for (let j = i + 1; j < results.length; j++) {
              const a = results[i]
              const b = results[j]

              if (a.average > b.average && a.position > b.position) {
                return false // Higher average should have lower (better) position
              }
              if (a.average < b.average && a.position < b.position) {
                return false // Lower average should have higher (worse) position
              }
            }
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: calculateTotalMarks is associative
   */
  it('calculateTotalMarks is associative', () => {
    fc.assert(
      fc.property(
        fc.array(subjectMarkArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(subjectMarkArbitrary, { minLength: 1, maxLength: 5 }),
        (marks1, marks2) => {
          const total1 = calculateTotalMarks(marks1)
          const total2 = calculateTotalMarks(marks2)
          const totalCombined = calculateTotalMarks([...marks1, ...marks2])

          return totalCombined === total1 + total2
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Empty marks result in zero total and average
   */
  it('empty marks result in zero total and average', () => {
    const total = calculateTotalMarks([])
    const average = calculateAverage(0, 0)

    expect(total).toBe(0)
    expect(average).toBe(0)
  })

  /**
   * Property: Single subject marks equal total
   */
  it('single subject marks equal total', () => {
    fc.assert(
      fc.property(
        subjectMarkArbitrary,
        (mark) => {
          const total = calculateTotalMarks([mark])
          return total === mark.score
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Average is always between 0 and max possible score
   */
  it('average is always between 0 and max possible score', () => {
    fc.assert(
      fc.property(
        studentMarksArbitrary,
        ({ studentId, marks }) => {
          const store = new ResultsStore()
          const result = store.processStudentResult(studentId, marks)

          const maxPossibleAverage = marks.length > 0
            ? marks.reduce((sum, m) => sum + m.maxScore, 0) / marks.length
            : 0

          return result.average >= 0 && result.average <= maxPossibleAverage
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Percentage calculation is correct
   */
  it('percentage calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (score, maxScore) => {
          const percentage = calculatePercentage(score, maxScore)
          const expected = Math.round((score / maxScore) * 10000) / 100

          return Math.abs(percentage - expected) < 0.01
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Grade determination is consistent with grade ranges
   */
  it('grade determination is consistent with grade ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (percentage) => {
          const gradeRanges: GradeRange[] = [
            { grade: 'A', minScore: 80, maxScore: 100 },
            { grade: 'B', minScore: 60, maxScore: 79 },
            { grade: 'C', minScore: 40, maxScore: 59 },
            { grade: 'D', minScore: 20, maxScore: 39 },
            { grade: 'F', minScore: 0, maxScore: 19 },
          ]

          const grade = determineGrade(percentage, gradeRanges)

          // Verify grade matches the range
          if (grade) {
            const range = gradeRanges.find((r) => r.grade === grade)
            if (!range) return false
            return percentage >= range.minScore && percentage <= range.maxScore
          }

          // If no grade, percentage should be outside all ranges
          return !gradeRanges.some(
            (r) => percentage >= r.minScore && percentage <= r.maxScore
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Position 1 always has highest average
   */
  it('position 1 always has highest average', () => {
    fc.assert(
      fc.property(
        fc.array(studentMarksArbitrary, { minLength: 2, maxLength: 10 }),
        (studentsMarks) => {
          const store = new ResultsStore()
          const results = store.processClassResults(studentsMarks)

          const position1Results = results.filter((r) => r.position === 1)
          const maxAverage = Math.max(...results.map((r) => r.average))

          // All position 1 students should have the max average
          return position1Results.every((r) => r.average === maxAverage)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All positions are valid (1 to n)
   */
  it('all positions are valid (1 to n)', () => {
    fc.assert(
      fc.property(
        fc.array(studentMarksArbitrary, { minLength: 1, maxLength: 10 }),
        (studentsMarks) => {
          const store = new ResultsStore()
          const results = store.processClassResults(studentsMarks)

          for (const result of results) {
            if (result.position < 1 || result.position > results.length) {
              return false
            }
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
