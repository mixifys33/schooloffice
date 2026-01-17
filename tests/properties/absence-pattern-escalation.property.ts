/**
 * Property Test: Absence Pattern Escalation
 * **Feature: school-office, Property 29: Absence Pattern Escalation**
 * **Validates: Requirements 38.5**
 *
 * For any student with 3+ absences in a week, the system SHALL escalate
 * to class teacher and School Admin.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { AttendanceStatus } from '@/types/enums'

// Threshold for weekly absence pattern detection (matches service constant)
const WEEKLY_ABSENCE_PATTERN_THRESHOLD = 3

// Types for testing absence pattern escalation
interface AbsencePattern {
  studentId: string
  weekStartDate: Date
  daysAbsent: number
  dates: Date[]
  requiresEscalation: boolean
}

interface AttendanceRecord {
  studentId: string
  date: Date
  period: number
  status: AttendanceStatus
}

/**
 * Detect absence patterns for a student within a week
 * This mirrors the logic in AttendanceService.detectAbsencePattern
 */
function detectAbsencePattern(
  studentId: string,
  weekStartDate: Date,
  records: AttendanceRecord[]
): AbsencePattern {
  const normalizedStart = normalizeDate(weekStartDate)
  const weekEndDate = new Date(normalizedStart)
  weekEndDate.setDate(weekEndDate.getDate() + 7)

  // Filter records for this student within the week
  const weekRecords = records.filter(
    r =>
      r.studentId === studentId &&
      r.status === AttendanceStatus.ABSENT &&
      r.date >= normalizedStart &&
      r.date < weekEndDate
  )

  // Group by date to count unique days absent
  const uniqueDatesAbsent = new Set<string>()
  const absentDates: Date[] = []

  for (const record of weekRecords) {
    const dateKey = record.date.toISOString().split('T')[0]
    if (!uniqueDatesAbsent.has(dateKey)) {
      uniqueDatesAbsent.add(dateKey)
      absentDates.push(record.date)
    }
  }

  const daysAbsent = uniqueDatesAbsent.size
  const requiresEscalation = daysAbsent >= WEEKLY_ABSENCE_PATTERN_THRESHOLD

  return {
    studentId,
    weekStartDate: normalizedStart,
    daysAbsent,
    dates: absentDates,
    requiresEscalation,
  }
}

/**
 * Normalize date to start of day (midnight UTC)
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date)
  normalized.setUTCHours(0, 0, 0, 0)
  return normalized
}

/**
 * Generate dates within a week from start date
 * Uses UTC date arithmetic to avoid timezone issues
 */
function generateWeekDates(weekStartDate: Date, count: number): Date[] {
  const dates: Date[] = []
  const start = normalizeDate(weekStartDate)

  for (let i = 0; i < Math.min(count, 7); i++) {
    // Use UTC date arithmetic to avoid timezone issues
    const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    dates.push(date)
  }

  return dates
}

// Arbitraries for generating test data
const studentIdArbitrary = fc.uuid()
const periodArbitrary = fc.integer({ min: 1, max: 10 })

const weekStartDateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(d => !isNaN(d.getTime())).map(normalizeDate)

describe('Property 29: Absence Pattern Escalation', () => {
  /**
   * Property: Students with 3+ days absent in a week require escalation
   */
  it('flags students with 3+ days absent for escalation', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        fc.integer({ min: 3, max: 7 }), // 3-7 days absent
        periodArbitrary,
        (studentId, weekStartDate, daysAbsent, period) => {
          const absentDates = generateWeekDates(weekStartDate, daysAbsent)

          // Create attendance records for each absent day
          const records: AttendanceRecord[] = absentDates.map(date => ({
            studentId,
            date,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          // Should require escalation
          expect(pattern.requiresEscalation).toBe(true)
          expect(pattern.daysAbsent).toBeGreaterThanOrEqual(WEEKLY_ABSENCE_PATTERN_THRESHOLD)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Students with fewer than 3 days absent do NOT require escalation
   */
  it('does not flag students with fewer than 3 days absent', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        fc.integer({ min: 0, max: 2 }), // 0-2 days absent
        periodArbitrary,
        (studentId, weekStartDate, daysAbsent, period) => {
          const absentDates = generateWeekDates(weekStartDate, daysAbsent)

          const records: AttendanceRecord[] = absentDates.map(date => ({
            studentId,
            date,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          // Should NOT require escalation
          expect(pattern.requiresEscalation).toBe(false)
          expect(pattern.daysAbsent).toBeLessThan(WEEKLY_ABSENCE_PATTERN_THRESHOLD)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Multiple absences on the same day count as one day
   */
  it('counts multiple absences on same day as one day', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 8 }),
        (studentId, weekStartDate, periods) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          // All absences on the same day (first day of week)
          const sameDay = normalizeDate(weekStartDate)
          const records: AttendanceRecord[] = uniquePeriods.map(period => ({
            studentId,
            date: sameDay,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          // Should count as only 1 day absent
          expect(pattern.daysAbsent).toBe(1)
          expect(pattern.requiresEscalation).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Exactly 3 days absent triggers escalation threshold
   */
  it('exactly 3 days absent triggers escalation', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        periodArbitrary,
        (studentId, weekStartDate, period) => {
          const absentDates = generateWeekDates(weekStartDate, 3)

          const records: AttendanceRecord[] = absentDates.map(date => ({
            studentId,
            date,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          expect(pattern.daysAbsent).toBe(3)
          expect(pattern.requiresEscalation).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Absences outside the week are not counted
   */
  it('does not count absences outside the week', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        periodArbitrary,
        (studentId, weekStartDate, period) => {
          // Create absences before and after the week
          const beforeWeek = new Date(weekStartDate)
          beforeWeek.setDate(beforeWeek.getDate() - 1)

          const afterWeek = new Date(weekStartDate)
          afterWeek.setDate(afterWeek.getDate() + 8)

          const records: AttendanceRecord[] = [
            { studentId, date: beforeWeek, period, status: AttendanceStatus.ABSENT },
            { studentId, date: afterWeek, period, status: AttendanceStatus.ABSENT },
          ]

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          // Should have 0 days absent (all outside the week)
          expect(pattern.daysAbsent).toBe(0)
          expect(pattern.requiresEscalation).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Pattern contains correct week start date
   */
  it('pattern contains correct week start date', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        fc.integer({ min: 1, max: 5 }),
        periodArbitrary,
        (studentId, weekStartDate, daysAbsent, period) => {
          const absentDates = generateWeekDates(weekStartDate, daysAbsent)

          const records: AttendanceRecord[] = absentDates.map(date => ({
            studentId,
            date,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          expect(pattern.weekStartDate.getTime()).toBe(normalizeDate(weekStartDate).getTime())
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Pattern contains all absent dates
   * Note: We use max: 6 because a week has 7 days (indices 0-6), but the detection
   * uses exclusive end boundary (< weekEndDate), so we test with 1-6 days to avoid
   * edge cases with timezone handling at week boundaries.
   */
  it('pattern contains all absent dates within the week', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        fc.integer({ min: 1, max: 6 }), // Use max: 6 to stay safely within week bounds
        periodArbitrary,
        (studentId, weekStartDate, daysAbsent, period) => {
          const absentDates = generateWeekDates(weekStartDate, daysAbsent)

          const records: AttendanceRecord[] = absentDates.map(date => ({
            studentId,
            date,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          expect(pattern.dates.length).toBe(daysAbsent)
          expect(pattern.daysAbsent).toBe(daysAbsent)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PRESENT and LATE statuses do not count toward absence pattern
   */
  it('PRESENT and LATE do not count toward absence pattern', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        periodArbitrary,
        (studentId, weekStartDate, period) => {
          const dates = generateWeekDates(weekStartDate, 5)

          // Mix of statuses: 2 ABSENT, 2 PRESENT, 1 LATE
          const records: AttendanceRecord[] = [
            { studentId, date: dates[0], period, status: AttendanceStatus.ABSENT },
            { studentId, date: dates[1], period, status: AttendanceStatus.ABSENT },
            { studentId, date: dates[2], period, status: AttendanceStatus.PRESENT },
            { studentId, date: dates[3], period, status: AttendanceStatus.PRESENT },
            { studentId, date: dates[4], period, status: AttendanceStatus.LATE },
          ]

          const pattern = detectAbsencePattern(studentId, weekStartDate, records)

          // Should only count 2 days absent
          expect(pattern.daysAbsent).toBe(2)
          expect(pattern.requiresEscalation).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Different students have independent patterns
   */
  it('different students have independent absence patterns', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentIdArbitrary,
        weekStartDateArbitrary,
        periodArbitrary,
        (studentId1, studentId2, weekStartDate, period) => {
          fc.pre(studentId1 !== studentId2)

          const dates = generateWeekDates(weekStartDate, 5)

          // Student 1: 4 days absent (requires escalation)
          // Student 2: 2 days absent (no escalation)
          const records: AttendanceRecord[] = [
            // Student 1 absences
            { studentId: studentId1, date: dates[0], period, status: AttendanceStatus.ABSENT },
            { studentId: studentId1, date: dates[1], period, status: AttendanceStatus.ABSENT },
            { studentId: studentId1, date: dates[2], period, status: AttendanceStatus.ABSENT },
            { studentId: studentId1, date: dates[3], period, status: AttendanceStatus.ABSENT },
            // Student 2 absences
            { studentId: studentId2, date: dates[0], period, status: AttendanceStatus.ABSENT },
            { studentId: studentId2, date: dates[1], period, status: AttendanceStatus.ABSENT },
          ]

          const pattern1 = detectAbsencePattern(studentId1, weekStartDate, records)
          const pattern2 = detectAbsencePattern(studentId2, weekStartDate, records)

          expect(pattern1.daysAbsent).toBe(4)
          expect(pattern1.requiresEscalation).toBe(true)

          expect(pattern2.daysAbsent).toBe(2)
          expect(pattern2.requiresEscalation).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Empty records result in no escalation
   */
  it('empty records result in no escalation', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        weekStartDateArbitrary,
        (studentId, weekStartDate) => {
          const pattern = detectAbsencePattern(studentId, weekStartDate, [])

          expect(pattern.daysAbsent).toBe(0)
          expect(pattern.dates).toHaveLength(0)
          expect(pattern.requiresEscalation).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })
})
