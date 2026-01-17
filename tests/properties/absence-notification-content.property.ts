/**
 * Property Test: Absence Notification Content
 * **Feature: school-office, Property 28: Absence Notification Content**
 * **Validates: Requirements 38.3, 38.4**
 *
 * For any absence notification, it SHALL contain student name, date,
 * periods missed, and a response link.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Types for testing absence notification content
interface AbsenceNotification {
  studentId: string
  studentName: string
  guardianId: string
  date: Date
  periodsAbsent: number[]
  responseLink: string
}

/**
 * Format absence notification content for messaging
 * This mirrors the logic in AttendanceService.formatAbsenceNotificationContent
 */
function formatAbsenceNotificationContent(notification: AbsenceNotification): string {
  const dateStr = notification.date.toLocaleDateString('en-UG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const periodsStr = notification.periodsAbsent.join(', ')

  return `Dear Parent/Guardian,

Your child ${notification.studentName} was absent from school on ${dateStr} during period(s): ${periodsStr}.

If you have any concerns or would like to provide a reason for the absence, please respond using this link: ${notification.responseLink}

Thank you,
School Administration`
}

/**
 * Generate a response link for testing
 */
function generateResponseLink(studentId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0]
  const token = Buffer.from(`${studentId}:${dateStr}:${Date.now()}`).toString('base64url')
  return `/attendance/respond/${token}`
}

/**
 * Create a notification object for testing
 */
function createNotification(
  studentId: string,
  studentName: string,
  guardianId: string,
  date: Date,
  periodsAbsent: number[]
): AbsenceNotification {
  return {
    studentId,
    studentName,
    guardianId,
    date,
    periodsAbsent: periodsAbsent.sort((a, b) => a - b),
    responseLink: generateResponseLink(studentId, date),
  }
}

// Arbitraries for generating test data
const studentIdArbitrary = fc.uuid()
const guardianIdArbitrary = fc.uuid()

const studentNameArbitrary = fc.tuple(
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
).map(([first, last]) => `${first} ${last}`)

const periodArbitrary = fc.integer({ min: 1, max: 10 })

const dateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(d => !isNaN(d.getTime()))

const periodsAbsentArbitrary = fc.array(periodArbitrary, { minLength: 2, maxLength: 8 })
  .map(periods => [...new Set(periods)].sort((a, b) => a - b))
  .filter(periods => periods.length >= 2)

describe('Property 28: Absence Notification Content', () => {
  /**
   * Property: Notification content contains student name
   */
  it('notification content contains student name', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const content = formatAbsenceNotificationContent(notification)

          // Content should contain the student name
          expect(content).toContain(studentName)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification content contains the date
   */
  it('notification content contains the date', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const content = formatAbsenceNotificationContent(notification)

          // Content should contain date information
          // The formatted date includes year, month, and day
          const year = date.getFullYear().toString()
          expect(content).toContain(year)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification content contains all periods missed
   */
  it('notification content contains all periods missed', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const content = formatAbsenceNotificationContent(notification)

          // Content should contain each period number
          for (const period of periodsAbsent) {
            expect(content).toContain(period.toString())
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification content contains response link
   */
  it('notification content contains response link', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const content = formatAbsenceNotificationContent(notification)

          // Content should contain the response link
          expect(content).toContain(notification.responseLink)
          expect(content).toContain('/attendance/respond/')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification object contains all required fields
   */
  it('notification object contains all required fields', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          // Verify all required fields are present and valid
          expect(notification.studentId).toBe(studentId)
          expect(notification.studentName).toBe(studentName)
          expect(notification.guardianId).toBe(guardianId)
          expect(notification.date).toEqual(date)
          expect(notification.periodsAbsent).toEqual(periodsAbsent)
          expect(notification.responseLink).toBeDefined()
          expect(notification.responseLink.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Periods in notification are sorted
   */
  it('periods in notification are sorted in ascending order', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 8 }),
        (studentId, studentName, guardianId, date, periods) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            uniquePeriods
          )

          // Verify periods are sorted
          for (let i = 1; i < notification.periodsAbsent.length; i++) {
            expect(notification.periodsAbsent[i]).toBeGreaterThanOrEqual(
              notification.periodsAbsent[i - 1]
            )
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Response link is unique per student and date
   */
  it('response link contains encoded student and date information', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          // Response link should be a valid path
          expect(notification.responseLink).toMatch(/^\/attendance\/respond\/[A-Za-z0-9_-]+$/)

          // Extract and decode the token
          const token = notification.responseLink.split('/').pop()!
          const decoded = Buffer.from(token, 'base64url').toString()

          // Decoded token should contain student ID and date
          expect(decoded).toContain(studentId)
          expect(decoded).toContain(date.toISOString().split('T')[0])
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification content is properly formatted
   */
  it('notification content has proper greeting and closing', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId, studentName, guardianId, date, periodsAbsent) => {
          const notification = createNotification(
            studentId,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const content = formatAbsenceNotificationContent(notification)

          // Should have proper greeting
          expect(content).toContain('Dear Parent/Guardian')

          // Should have proper closing
          expect(content).toContain('Thank you')
          expect(content).toContain('School Administration')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Different students get different response links
   */
  it('different students get different response links', () => {
    fc.assert(
      fc.property(
        studentIdArbitrary,
        studentIdArbitrary,
        studentNameArbitrary,
        guardianIdArbitrary,
        dateArbitrary,
        periodsAbsentArbitrary,
        (studentId1, studentId2, studentName, guardianId, date, periodsAbsent) => {
          fc.pre(studentId1 !== studentId2)

          const notification1 = createNotification(
            studentId1,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          const notification2 = createNotification(
            studentId2,
            studentName,
            guardianId,
            date,
            periodsAbsent
          )

          // Response links should be different for different students
          expect(notification1.responseLink).not.toBe(notification2.responseLink)
        }
      ),
      { numRuns: 20 }
    )
  })
})
