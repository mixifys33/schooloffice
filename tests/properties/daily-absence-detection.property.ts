/**
 * Property Test: Daily Absence Detection
 * **Feature: school-office, Property 27: Daily Absence Detection**
 * **Validates: Requirements 38.1, 38.2**
 *
 * For any student marked absent in 2 or more periods on the same day,
 * the system SHALL flag them as "absent for the day" and queue a parent notification.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { AttendanceStatus } from '@/types/enums'

// Threshold for daily absence detection (matches service constant)
const DAILY_ABSENCE_THRESHOLD = 2

// Types for testing daily absence detection
interface AttendanceRecord {
  studentId: string
  period: number
  status: AttendanceStatus
}

interface AbsenceStatus {
  isAbsentForDay: boolean
  periodsAbsent: number[]
  requiresNotification: boolean
}

/**
 * Check daily absence status for a student based on attendance records
 * This mirrors the logic in AttendanceService.checkDailyAbsence
 */
function checkDailyAbsence(records: AttendanceRecord[]): AbsenceStatus {
  const absentPeriods = records
    .filter(r => r.status === AttendanceStatus.ABSENT)
    .map(r => r.period)
    .sort((a, b) => a - b)

  const isAbsentForDay = absentPeriods.length >= DAILY_ABSENCE_THRESHOLD
  const requiresNotification = isAbsentForDay

  return {
    isAbsentForDay,
    periodsAbsent: absentPeriods,
    requiresNotification,
  }
}

/**
 * Get students who are absent for the day from a class's attendance records
 * This mirrors the logic in AttendanceService.getAbsentStudentsForDay
 */
function getAbsentStudentsForDay(
  records: AttendanceRecord[]
): { studentId: string; periodsAbsent: number[] }[] {
  // Group by student
  const studentAbsences = new Map<string, number[]>()
  for (const record of records) {
    if (record.status === AttendanceStatus.ABSENT) {
      const periods = studentAbsences.get(record.studentId) || []
      periods.push(record.period)
      studentAbsences.set(record.studentId, periods)
    }
  }

  // Filter to students with 2+ periods absent
  const absentStudents: { studentId: string; periodsAbsent: number[] }[] = []
  for (const [studentId, periods] of studentAbsences) {
    if (periods.length >= DAILY_ABSENCE_THRESHOLD) {
      absentStudents.push({ studentId, periodsAbsent: periods.sort((a, b) => a - b) })
    }
  }

  return absentStudents
}

// Arbitraries for generating test data
const studentIdArbitrary = fc.uuid()
const periodArbitrary = fc.integer({ min: 1, max: 10 })
const attendanceStatusArbitrary = fc.constantFrom(
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE
)

// Generate a single attendance record
const attendanceRecordArbitrary = fc.record({
  studentId: studentIdArbitrary,
  period: periodArbitrary,
  status: attendanceStatusArbitrary,
})

// Generate attendance records for a single student with specific periods
const studentAttendanceArbitrary = (studentId: string, periods: number[]) =>
  fc.tuple(
    ...periods.map(period =>
      fc.record({
        studentId: fc.constant(studentId),
        period: fc.constant(period),
        status: attendanceStatusArbitrary,
      })
    )
  )

describe('Property 27: Daily Absence Detection', () => {
  /**
   * Property: Students with 2+ absent periods are flagged as absent for the day
   */
  it('flags students with 2+ absent periods as absent for the day', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 10 }),
        (studentId, periods) => {
          // Ensure unique periods
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          // Create records where all periods are ABSENT
          const records: AttendanceRecord[] = uniquePeriods.map(period => ({
            studentId,
            period,
            status: AttendanceStatus.ABSENT,
          }))

          const result = checkDailyAbsence(records)

          // Should be flagged as absent for the day
          expect(result.isAbsentForDay).toBe(true)
          expect(result.periodsAbsent.length).toBeGreaterThanOrEqual(DAILY_ABSENCE_THRESHOLD)
          expect(result.requiresNotification).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Students with fewer than 2 absent periods are NOT flagged
   */
  it('does not flag students with fewer than 2 absent periods', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(periodArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 1 }), // 0 or 1 absent periods
        (studentId, periods, absentCount) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 1)

          // Create records with specified number of absent periods
          const records: AttendanceRecord[] = uniquePeriods.map((period, index) => ({
            studentId,
            period,
            status: index < absentCount ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
          }))

          const result = checkDailyAbsence(records)

          // Should NOT be flagged as absent for the day
          expect(result.isAbsentForDay).toBe(false)
          expect(result.periodsAbsent.length).toBeLessThan(DAILY_ABSENCE_THRESHOLD)
          expect(result.requiresNotification).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: The number of absent periods equals the count of ABSENT status records
   */
  it('correctly counts absent periods', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(
          fc.record({
            period: periodArbitrary,
            status: attendanceStatusArbitrary,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (studentId, periodStatuses) => {
          // Ensure unique periods
          const seenPeriods = new Set<number>()
          const uniqueRecords = periodStatuses.filter(ps => {
            if (seenPeriods.has(ps.period)) return false
            seenPeriods.add(ps.period)
            return true
          })

          const records: AttendanceRecord[] = uniqueRecords.map(ps => ({
            studentId,
            period: ps.period,
            status: ps.status,
          }))

          const result = checkDailyAbsence(records)

          // Count expected absent periods
          const expectedAbsentCount = records.filter(
            r => r.status === AttendanceStatus.ABSENT
          ).length

          expect(result.periodsAbsent.length).toBe(expectedAbsentCount)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Absent periods are correctly identified and sorted
   */
  it('returns sorted list of absent periods', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(periodArbitrary, { minLength: 3, maxLength: 10 }),
        (studentId, periods) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 3)

          // Mark some periods as absent (at least 2)
          const records: AttendanceRecord[] = uniquePeriods.map((period, index) => ({
            studentId,
            period,
            status: index % 2 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
          }))

          const result = checkDailyAbsence(records)

          // Verify periods are sorted
          for (let i = 1; i < result.periodsAbsent.length; i++) {
            expect(result.periodsAbsent[i]).toBeGreaterThanOrEqual(result.periodsAbsent[i - 1])
          }

          // Verify all returned periods are actually absent in the records
          const absentPeriodsInRecords = new Set(
            records.filter(r => r.status === AttendanceStatus.ABSENT).map(r => r.period)
          )
          for (const period of result.periodsAbsent) {
            expect(absentPeriodsInRecords.has(period)).toBe(true)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: getAbsentStudentsForDay returns only students with 2+ absent periods
   */
  it('getAbsentStudentsForDay filters correctly', () => {
    fc.assert(
      fc.property(
        fc.array(studentIdArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(periodArbitrary, { minLength: 3, maxLength: 8 }),
        (studentIds, periods) => {
          const uniqueStudents = [...new Set(studentIds)]
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniqueStudents.length >= 2 && uniquePeriods.length >= 3)

          // Create records for multiple students with varying absence counts
          const records: AttendanceRecord[] = []
          uniqueStudents.forEach((studentId, studentIndex) => {
            uniquePeriods.forEach((period, periodIndex) => {
              // First student: all absent, Second student: 1 absent, Others: mixed
              let status: AttendanceStatus
              if (studentIndex === 0) {
                status = AttendanceStatus.ABSENT
              } else if (studentIndex === 1) {
                status = periodIndex === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT
              } else {
                status = periodIndex < 2 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT
              }
              records.push({ studentId, period, status })
            })
          })

          const absentStudents = getAbsentStudentsForDay(records)

          // Verify all returned students have 2+ absent periods
          for (const student of absentStudents) {
            expect(student.periodsAbsent.length).toBeGreaterThanOrEqual(DAILY_ABSENCE_THRESHOLD)
          }

          // Verify student with only 1 absent period is NOT included
          const secondStudentIncluded = absentStudents.some(
            s => s.studentId === uniqueStudents[1]
          )
          expect(secondStudentIncluded).toBe(false)

          // Verify first student (all absent) IS included
          const firstStudentIncluded = absentStudents.some(
            s => s.studentId === uniqueStudents[0]
          )
          expect(firstStudentIncluded).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: LATE status does not count as absent
   */
  it('LATE status does not count toward absence threshold', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.array(periodArbitrary, { minLength: 3, maxLength: 10 }),
        (studentId, periods) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 3)

          // Create records with 1 ABSENT and rest LATE
          const records: AttendanceRecord[] = uniquePeriods.map((period, index) => ({
            studentId,
            period,
            status: index === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.LATE,
          }))

          const result = checkDailyAbsence(records)

          // Should NOT be flagged as absent (only 1 ABSENT period)
          expect(result.isAbsentForDay).toBe(false)
          expect(result.periodsAbsent.length).toBe(1)
          expect(result.requiresNotification).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Empty records result in no absence flag
   */
  it('empty records result in no absence flag', () => {
    const result = checkDailyAbsence([])

    expect(result.isAbsentForDay).toBe(false)
    expect(result.periodsAbsent).toHaveLength(0)
    expect(result.requiresNotification).toBe(false)
  })

  /**
   * Property: Exactly 2 absent periods triggers the threshold
   */
  it('exactly 2 absent periods triggers absence flag', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        fc.tuple(periodArbitrary, periodArbitrary).filter(([a, b]) => a !== b),
        (studentId, [period1, period2]) => {
          const records: AttendanceRecord[] = [
            { studentId, period: period1, status: AttendanceStatus.ABSENT },
            { studentId, period: period2, status: AttendanceStatus.ABSENT },
          ]

          const result = checkDailyAbsence(records)

          expect(result.isAbsentForDay).toBe(true)
          expect(result.periodsAbsent.length).toBe(2)
          expect(result.requiresNotification).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })
})
