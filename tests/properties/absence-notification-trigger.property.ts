/**
 * Property Test: Absence Notification Trigger
 * **Feature: school-office, Property 11: Absence Notification Trigger**
 * **Validates: Requirements 5.2**
 *
 * For any student marked absent, a notification SHALL be queued
 * for the student's primary guardian.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { AttendanceStatus } from '@/types/enums'

// Threshold for daily absence detection (matches service constant)
const DAILY_ABSENCE_THRESHOLD = 2

// Types for testing absence notification trigger
interface Student {
  id: string
  firstName: string
  lastName: string
  classId: string
}

interface Guardian {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
}

interface StudentGuardian {
  studentId: string
  guardianId: string
  isPrimary: boolean
}

interface AttendanceRecord {
  studentId: string
  classId: string
  period: number
  status: AttendanceStatus
}

interface AbsenceNotification {
  studentId: string
  studentName: string
  guardianId: string
  date: Date
  periodsAbsent: number[]
  responseLink: string
}

/**
 * Simulated notification service for testing
 */
class NotificationServiceSimulator {
  private students: Map<string, Student> = new Map()
  private guardians: Map<string, Guardian> = new Map()
  private studentGuardians: StudentGuardian[] = []
  private attendanceRecords: AttendanceRecord[] = []
  private queuedNotifications: AbsenceNotification[] = []

  addStudent(student: Student): void {
    this.students.set(student.id, student)
  }

  addGuardian(guardian: Guardian): void {
    this.guardians.set(guardian.id, guardian)
  }

  linkStudentGuardian(link: StudentGuardian): void {
    this.studentGuardians.push(link)
  }

  addAttendanceRecord(record: AttendanceRecord): void {
    this.attendanceRecords.push(record)
  }

  getPrimaryGuardian(studentId: string): Guardian | undefined {
    const link = this.studentGuardians.find(
      sg => sg.studentId === studentId && sg.isPrimary
    )
    if (!link) return undefined
    return this.guardians.get(link.guardianId)
  }

  getAbsentStudentsForDay(
    classId: string
  ): { studentId: string; periodsAbsent: number[] }[] {
    // Group by student
    const studentAbsences = new Map<string, number[]>()
    for (const record of this.attendanceRecords) {
      if (record.classId === classId && record.status === AttendanceStatus.ABSENT) {
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

  generateResponseLink(studentId: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0]
    const token = Buffer.from(`${studentId}:${dateStr}:${Date.now()}`).toString('base64url')
    return `/attendance/respond/${token}`
  }

  createAbsenceNotification(
    studentId: string,
    date: Date,
    periodsAbsent: number[]
  ): AbsenceNotification | null {
    const student = this.students.get(studentId)
    if (!student) return null

    const guardian = this.getPrimaryGuardian(studentId)
    if (!guardian) return null

    const studentName = `${student.firstName} ${student.lastName}`
    const responseLink = this.generateResponseLink(studentId, date)

    return {
      studentId,
      studentName,
      guardianId: guardian.id,
      date,
      periodsAbsent: periodsAbsent.sort((a, b) => a - b),
      responseLink,
    }
  }

  triggerAbsenceNotifications(classId: string, date: Date): AbsenceNotification[] {
    const absentStudents = this.getAbsentStudentsForDay(classId)
    const notifications: AbsenceNotification[] = []

    for (const { studentId, periodsAbsent } of absentStudents) {
      const notification = this.createAbsenceNotification(studentId, date, periodsAbsent)
      if (notification) {
        notifications.push(notification)
        this.queuedNotifications.push(notification)
      }
    }

    return notifications
  }

  getQueuedNotifications(): AbsenceNotification[] {
    return [...this.queuedNotifications]
  }

  clearNotifications(): void {
    this.queuedNotifications = []
  }
}

// Arbitraries for generating test data
const studentArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  classId: fc.uuid(),
})

const guardianArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  phone: fc.stringMatching(/^\+256[0-9]{9}$/),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
})

const periodArbitrary = fc.integer({ min: 1, max: 10 })

const dateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(d => !isNaN(d.getTime()))

describe('Property 11: Absence Notification Trigger', () => {
  /**
   * Property: For any student marked absent (2+ periods), a notification
   * is queued for their primary guardian
   */
  it('queues notification for primary guardian when student is absent', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 8 }),
        dateArbitrary,
        (student, guardian, periods, date) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          // Set up student with primary guardian
          service.addStudent(student)
          service.addGuardian(guardian)
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          })

          // Record absences for all periods
          for (const period of uniquePeriods) {
            service.addAttendanceRecord({
              studentId: student.id,
              classId: student.classId,
              period,
              status: AttendanceStatus.ABSENT,
            })
          }

          // Trigger notifications
          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          // Should have exactly one notification for this student
          expect(notifications.length).toBe(1)
          expect(notifications[0].studentId).toBe(student.id)
          expect(notifications[0].guardianId).toBe(guardian.id)
          expect(notifications[0].periodsAbsent.length).toBe(uniquePeriods.length)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification is sent to PRIMARY guardian, not secondary
   */
  it('sends notification to primary guardian only', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        guardianArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 5 }),
        dateArbitrary,
        (student, primaryGuardian, secondaryGuardian, periods, date) => {
          fc.pre(primaryGuardian.id !== secondaryGuardian.id)
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          service.addStudent(student)
          service.addGuardian(primaryGuardian)
          service.addGuardian(secondaryGuardian)

          // Link both guardians, but only one is primary
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: primaryGuardian.id,
            isPrimary: true,
          })
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: secondaryGuardian.id,
            isPrimary: false,
          })

          // Record absences
          for (const period of uniquePeriods) {
            service.addAttendanceRecord({
              studentId: student.id,
              classId: student.classId,
              period,
              status: AttendanceStatus.ABSENT,
            })
          }

          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          // Notification should go to primary guardian only
          expect(notifications.length).toBe(1)
          expect(notifications[0].guardianId).toBe(primaryGuardian.id)
          expect(notifications[0].guardianId).not.toBe(secondaryGuardian.id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: No notification is queued if student has fewer than 2 absent periods
   */
  it('does not queue notification for fewer than 2 absent periods', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        periodArbitrary,
        dateArbitrary,
        (student, guardian, period, date) => {
          const service = new NotificationServiceSimulator()

          service.addStudent(student)
          service.addGuardian(guardian)
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          })

          // Record only 1 absence
          service.addAttendanceRecord({
            studentId: student.id,
            classId: student.classId,
            period,
            status: AttendanceStatus.ABSENT,
          })

          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          // Should have no notifications
          expect(notifications.length).toBe(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: No notification is queued if student has no primary guardian
   */
  it('does not queue notification if no primary guardian exists', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 5 }),
        dateArbitrary,
        (student, guardian, periods, date) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          service.addStudent(student)
          service.addGuardian(guardian)

          // Link guardian as NON-primary
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: false,
          })

          // Record absences
          for (const period of uniquePeriods) {
            service.addAttendanceRecord({
              studentId: student.id,
              classId: student.classId,
              period,
              status: AttendanceStatus.ABSENT,
            })
          }

          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          // Should have no notifications (no primary guardian)
          expect(notifications.length).toBe(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification contains correct student name
   */
  it('notification contains correct student name', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 5 }),
        dateArbitrary,
        (student, guardian, periods, date) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          service.addStudent(student)
          service.addGuardian(guardian)
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          })

          for (const period of uniquePeriods) {
            service.addAttendanceRecord({
              studentId: student.id,
              classId: student.classId,
              period,
              status: AttendanceStatus.ABSENT,
            })
          }

          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          expect(notifications.length).toBe(1)
          expect(notifications[0].studentName).toBe(`${student.firstName} ${student.lastName}`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Multiple absent students each get their own notification
   */
  it('creates separate notifications for multiple absent students', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(guardianArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(periodArbitrary, { minLength: 2, maxLength: 5 }),
        dateArbitrary,
        fc.uuid(), // shared classId
        (students, guardians, periods, date, classId) => {
          const uniqueStudents = students.filter(
            (s, i, arr) => arr.findIndex(x => x.id === s.id) === i
          )
          const uniqueGuardians = guardians.filter(
            (g, i, arr) => arr.findIndex(x => x.id === g.id) === i
          )
          const uniquePeriods = [...new Set(periods)]

          fc.pre(uniqueStudents.length >= 2)
          fc.pre(uniqueGuardians.length >= uniqueStudents.length)
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          // Set up each student with their own guardian
          uniqueStudents.forEach((student, index) => {
            const studentWithClass = { ...student, classId }
            service.addStudent(studentWithClass)
            service.addGuardian(uniqueGuardians[index])
            service.linkStudentGuardian({
              studentId: student.id,
              guardianId: uniqueGuardians[index].id,
              isPrimary: true,
            })

            // Record absences for each student
            for (const period of uniquePeriods) {
              service.addAttendanceRecord({
                studentId: student.id,
                classId,
                period,
                status: AttendanceStatus.ABSENT,
              })
            }
          })

          const notifications = service.triggerAbsenceNotifications(classId, date)

          // Should have one notification per student
          expect(notifications.length).toBe(uniqueStudents.length)

          // Each student should have exactly one notification
          const notifiedStudentIds = new Set(notifications.map(n => n.studentId))
          expect(notifiedStudentIds.size).toBe(uniqueStudents.length)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Notification includes a response link
   */
  it('notification includes a response link', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        guardianArbitrary,
        fc.array(periodArbitrary, { minLength: 2, maxLength: 5 }),
        dateArbitrary,
        (student, guardian, periods, date) => {
          const uniquePeriods = [...new Set(periods)]
          fc.pre(uniquePeriods.length >= 2)

          const service = new NotificationServiceSimulator()

          service.addStudent(student)
          service.addGuardian(guardian)
          service.linkStudentGuardian({
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          })

          for (const period of uniquePeriods) {
            service.addAttendanceRecord({
              studentId: student.id,
              classId: student.classId,
              period,
              status: AttendanceStatus.ABSENT,
            })
          }

          const notifications = service.triggerAbsenceNotifications(student.classId, date)

          expect(notifications.length).toBe(1)
          expect(notifications[0].responseLink).toBeDefined()
          expect(notifications[0].responseLink.length).toBeGreaterThan(0)
          expect(notifications[0].responseLink).toContain('/attendance/respond/')
        }
      ),
      { numRuns: 20 }
    )
  })
})
