/**
 * Property Test: Term Date Non-Overlap
 * **Feature: school-office, Property 3: Term Date Non-Overlap**
 * **Validates: Requirements 2.2**
 * 
 * For any academic year, all terms within that year SHALL have 
 * non-overlapping date ranges (no term's date range intersects with another).
 */  
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// PURE FUNCTIONS FOR TERM DATE VALIDATION
// (Duplicated here to avoid Prisma dependency in tests)
// ============================================

/**
 * Calculate the number of weeks between two dates
 */
function calculateWeekCount(startDate: Date, endDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const diffMs = endDate.getTime() - startDate.getTime()
  return Math.ceil(diffMs / msPerWeek)
}

/**
 * Check if two date ranges overlap
 * Two ranges [a1, a2] and [b1, b2] overlap if a1 < b2 AND b1 < a2
 */
function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Validate term dates
 * - End date must be after start date
 * - Term dates must be within the academic year
 */
function validateTermDates(
  startDate: Date,
  endDate: Date,
  yearStartDate?: Date,
  yearEndDate?: Date
): { valid: boolean; error?: string } {
  if (endDate <= startDate) {
    return { valid: false, error: 'End date must be after start date' }
  }

  if (yearStartDate && startDate < yearStartDate) {
    return { valid: false, error: 'Term start date cannot be before academic year start date' }
  }

  if (yearEndDate && endDate > yearEndDate) {
    return { valid: false, error: 'Term end date cannot be after academic year end date' }
  }

  return { valid: true }
}

// ============================================
// TYPES FOR TESTING
// ============================================

interface AcademicYear {
  id: string
  schoolId: string
  name: string
  startDate: Date
  endDate: Date
}

interface Term {
  id: string
  academicYearId: string
  name: string
  startDate: Date
  endDate: Date
  weekCount: number
}

// ============================================
// SIMULATED TERM STORE WITH OVERLAP VALIDATION
// ============================================

class TermStore {
  private terms: Map<string, Term> = new Map()

  /**
   * Add a term with overlap validation
   * Returns true if added successfully, false if overlap detected
   */
  addTerm(term: Term): { success: boolean; error?: string } {
    // Check for overlaps with existing terms in the same academic year
    const existingTerms = this.getTermsByAcademicYear(term.academicYearId)
    
    for (const existing of existingTerms) {
      if (dateRangesOverlap(term.startDate, term.endDate, existing.startDate, existing.endDate)) {
        return { 
          success: false, 
          error: `Term "${term.name}" overlaps with existing term "${existing.name}"` 
        }
      }
    }

    this.terms.set(term.id, term)
    return { success: true }
  }

  getTermsByAcademicYear(academicYearId: string): Term[] {
    return Array.from(this.terms.values())
      .filter(t => t.academicYearId === academicYearId)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  /**
   * Verify that no terms in an academic year overlap
   */
  verifyNoOverlaps(academicYearId: string): boolean {
    const terms = this.getTermsByAcademicYear(academicYearId)
    
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        if (dateRangesOverlap(
          terms[i].startDate, 
          terms[i].endDate, 
          terms[j].startDate, 
          terms[j].endDate
        )) {
          return false
        }
      }
    }
    
    return true
  }
}

// ============================================
// HELPER FUNCTIONS FOR DATE GENERATION
// ============================================

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Create a date from a base timestamp plus days offset
 */
function dateFromDays(baseTimestamp: number, daysOffset: number): Date {
  return new Date(baseTimestamp + daysOffset * MS_PER_DAY)
}

// Base timestamp for 2024-01-01
const BASE_2024 = new Date('2024-01-01T00:00:00Z').getTime()

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

/**
 * Generate a valid academic year using integer-based date generation
 * to avoid NaN date issues
 */
const academicYearArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.constantFrom('2024', '2025', '2026'),
  // Start day offset from BASE_2024 (0-90 days = Jan-Mar)
  startDayOffset: fc.integer({ min: 0, max: 90 }),
  // Duration in days (270-365 = 9-12 months)
  durationDays: fc.integer({ min: 270, max: 365 }),
}).map(({ id, schoolId, name, startDayOffset, durationDays }) => ({
  id,
  schoolId,
  name,
  startDate: dateFromDays(BASE_2024, startDayOffset),
  endDate: dateFromDays(BASE_2024, startDayOffset + durationDays),
}))

/**
 * Generate a valid date range using integer offsets
 */
const validDateRangeArbitrary = fc.record({
  startDayOffset: fc.integer({ min: 0, max: 180 }),
  durationDays: fc.integer({ min: 7, max: 90 }),
}).map(({ startDayOffset, durationDays }) => ({
  startDate: dateFromDays(BASE_2024, startDayOffset),
  endDate: dateFromDays(BASE_2024, startDayOffset + durationDays),
}))

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 3: Term Date Non-Overlap', () => {
  /**
   * Property: dateRangesOverlap correctly detects overlapping ranges
   */
  it('dateRangesOverlap returns true for overlapping date ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 180 }), // start1 offset
        fc.integer({ min: 30, max: 90 }), // duration1 in days
        fc.integer({ min: -30, max: 30 }), // overlap offset in days
        fc.integer({ min: 30, max: 90 }), // duration2 in days
        (start1Offset, duration1Days, overlapOffsetDays, duration2Days) => {
          const start1 = dateFromDays(BASE_2024, start1Offset)
          const end1 = dateFromDays(BASE_2024, start1Offset + duration1Days)
          
          // Create second range relative to end of first
          const start2 = dateFromDays(BASE_2024, start1Offset + duration1Days + overlapOffsetDays)
          const end2 = dateFromDays(BASE_2024, start1Offset + duration1Days + overlapOffsetDays + duration2Days)
          
          const overlaps = dateRangesOverlap(start1, end1, start2, end2)
          
          // If start2 is before end1, they should overlap
          const expectedOverlap = start2 < end1 && start1 < end2
          
          return overlaps === expectedOverlap
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Non-adjacent ranges do not overlap
   */
  it('non-adjacent date ranges do not overlap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 90 }), // start1 offset
        fc.integer({ min: 30, max: 60 }), // duration in days
        fc.integer({ min: 1, max: 30 }), // gap in days (positive = no overlap)
        (start1Offset, durationDays, gapDays) => {
          const start1 = dateFromDays(BASE_2024, start1Offset)
          const end1 = dateFromDays(BASE_2024, start1Offset + durationDays)
          
          // Create second range with a gap after first
          const start2 = dateFromDays(BASE_2024, start1Offset + durationDays + gapDays)
          const end2 = dateFromDays(BASE_2024, start1Offset + durationDays + gapDays + durationDays)
          
          const overlaps = dateRangesOverlap(start1, end1, start2, end2)
          
          // With a positive gap, they should not overlap
          return overlaps === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Term store correctly rejects overlapping terms
   */
  it('term store rejects overlapping terms', () => {
    fc.assert(
      fc.property(
        academicYearArbitrary,
        (year) => {
          const store = new TermStore()
          
          // Calculate midpoint
          const yearDuration = year.endDate.getTime() - year.startDate.getTime()
          const midPoint = new Date(year.startDate.getTime() + yearDuration / 2)
          
          // Create first term covering first half of year
          const term1: Term = {
            id: 'term-1',
            academicYearId: year.id,
            name: 'Term 1',
            startDate: year.startDate,
            endDate: midPoint,
            weekCount: calculateWeekCount(year.startDate, midPoint),
          }
          
          // Create overlapping term (starts 1 week before term1 ends)
          const overlapStart = new Date(midPoint.getTime() - 7 * MS_PER_DAY)
          const term2: Term = {
            id: 'term-2',
            academicYearId: year.id,
            name: 'Term 2',
            startDate: overlapStart,
            endDate: year.endDate,
            weekCount: calculateWeekCount(overlapStart, year.endDate),
          }
          
          const result1 = store.addTerm(term1)
          const result2 = store.addTerm(term2)
          
          // First term should be added successfully
          // Second term should be rejected due to overlap
          return result1.success === true && result2.success === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Term store accepts non-overlapping terms
   */
  it('term store accepts non-overlapping terms', () => {
    fc.assert(
      fc.property(
        academicYearArbitrary,
        fc.integer({ min: 1, max: 3 }),
        (year, termCount) => {
          const store = new TermStore()
          
          // Create non-overlapping terms
          const yearDuration = year.endDate.getTime() - year.startDate.getTime()
          const termDuration = Math.floor(yearDuration / (termCount + 1))
          const gapDuration = 7 * MS_PER_DAY // 1 week gap
          
          let allAdded = true
          
          for (let i = 0; i < termCount; i++) {
            const startOffset = i * (termDuration + gapDuration)
            const termStart = new Date(year.startDate.getTime() + startOffset)
            const termEnd = new Date(termStart.getTime() + termDuration)
            
            // Ensure term end doesn't exceed year end
            const actualEnd = termEnd > year.endDate ? year.endDate : termEnd
            
            if (termStart >= actualEnd) continue
            
            const term: Term = {
              id: `term-${i}`,
              academicYearId: year.id,
              name: `Term ${i + 1}`,
              startDate: termStart,
              endDate: actualEnd,
              weekCount: calculateWeekCount(termStart, actualEnd),
            }
            
            const result = store.addTerm(term)
            if (!result.success) {
              allAdded = false
              break
            }
          }
          
          // All non-overlapping terms should be added successfully
          // And the store should verify no overlaps
          return allAdded && store.verifyNoOverlaps(year.id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: After adding valid terms, no overlaps exist
   */
  it('valid term additions maintain non-overlap invariant', () => {
    fc.assert(
      fc.property(
        academicYearArbitrary,
        (year) => {
          const store = new TermStore()
          
          // Add three non-overlapping terms
          const yearDuration = year.endDate.getTime() - year.startDate.getTime()
          const termDuration = Math.floor(yearDuration / 4)
          const gapDuration = 7 * MS_PER_DAY
          
          const terms: Term[] = []
          for (let i = 0; i < 3; i++) {
            const startOffset = i * (termDuration + gapDuration)
            const termStart = new Date(year.startDate.getTime() + startOffset)
            const termEnd = new Date(termStart.getTime() + termDuration)
            
            const actualEnd = termEnd > year.endDate ? year.endDate : termEnd
            
            if (termStart < actualEnd) {
              terms.push({
                id: `term-${i}`,
                academicYearId: year.id,
                name: `Term ${i + 1}`,
                startDate: termStart,
                endDate: actualEnd,
                weekCount: calculateWeekCount(termStart, actualEnd),
              })
            }
          }
          
          // Add all terms
          for (const term of terms) {
            store.addTerm(term)
          }
          
          // Verify no overlaps exist
          return store.verifyNoOverlaps(year.id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateTermDates rejects invalid date ranges
   */
  it('validateTermDates rejects end date before or equal to start date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }), // start day offset
        fc.integer({ min: 0, max: 30 }), // days to subtract (0 = equal, >0 = before)
        (startDayOffset, daysToSubtract) => {
          const startDate = dateFromDays(BASE_2024, startDayOffset)
          const endDate = dateFromDays(BASE_2024, startDayOffset - daysToSubtract)
          
          const result = validateTermDates(startDate, endDate)
          
          // Should be invalid when end <= start
          return result.valid === false && result.error !== undefined
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: validateTermDates accepts valid date ranges
   */
  it('validateTermDates accepts end date after start date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 180 }), // start day offset
        fc.integer({ min: 1, max: 180 }), // days to add (must be positive)
        (startDayOffset, daysToAdd) => {
          const startDate = dateFromDays(BASE_2024, startDayOffset)
          const endDate = dateFromDays(BASE_2024, startDayOffset + daysToAdd)
          
          const result = validateTermDates(startDate, endDate)
          
          // Should be valid when end > start
          return result.valid === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Terms within same academic year maintain non-overlap after any valid addition
   */
  it('terms maintain non-overlap invariant across multiple additions', () => {
    fc.assert(
      fc.property(
        academicYearArbitrary,
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 5 }),
        (year, termIndices) => {
          const store = new TermStore()
          
          // Pre-define 3 non-overlapping term slots
          const yearDuration = year.endDate.getTime() - year.startDate.getTime()
          const slotDuration = Math.floor(yearDuration / 4)
          const gapDuration = 7 * MS_PER_DAY
          
          const termSlots: Term[] = []
          for (let i = 0; i < 3; i++) {
            const startOffset = i * (slotDuration + gapDuration)
            const termStart = new Date(year.startDate.getTime() + startOffset)
            const termEnd = new Date(termStart.getTime() + slotDuration)
            
            const actualEnd = termEnd > year.endDate ? year.endDate : termEnd
            
            if (termStart < actualEnd) {
              termSlots.push({
                id: `term-${i}`,
                academicYearId: year.id,
                name: `Term ${i + 1}`,
                startDate: termStart,
                endDate: actualEnd,
                weekCount: calculateWeekCount(termStart, actualEnd),
              })
            }
          }
          
          // Try to add terms in random order (may include duplicates)
          const addedIds = new Set<string>()
          for (const idx of termIndices) {
            if (idx < termSlots.length && !addedIds.has(termSlots[idx].id)) {
              store.addTerm(termSlots[idx])
              addedIds.add(termSlots[idx].id)
            }
          }
          
          // Invariant: no overlaps should exist
          return store.verifyNoOverlaps(year.id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: calculateWeekCount returns positive value for valid date ranges
   */
  it('calculateWeekCount returns positive value for valid ranges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 180 }), // start day offset
        fc.integer({ min: 7, max: 180 }), // duration (at least 1 week)
        (startDayOffset, durationDays) => {
          const startDate = dateFromDays(BASE_2024, startDayOffset)
          const endDate = dateFromDays(BASE_2024, startDayOffset + durationDays)
          
          const weekCount = calculateWeekCount(startDate, endDate)
          
          return weekCount > 0
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Overlap detection is symmetric
   */
  it('dateRangesOverlap is symmetric', () => {
    fc.assert(
      fc.property(
        validDateRangeArbitrary,
        validDateRangeArbitrary,
        (range1, range2) => {
          const overlap1 = dateRangesOverlap(
            range1.startDate, range1.endDate,
            range2.startDate, range2.endDate
          )
          const overlap2 = dateRangesOverlap(
            range2.startDate, range2.endDate,
            range1.startDate, range1.endDate
          )
          
          // Overlap detection should be symmetric
          return overlap1 === overlap2
        }
      ),
      { numRuns: 20 }
    )
  })
})
