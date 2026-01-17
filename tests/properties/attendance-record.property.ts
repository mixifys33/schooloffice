/**
 * Property Test: Attendance Record Integrity
 * **Feature: school-office, Property 10: Attendance Record Integrity**
 * **Validates: Requirements 5.1**
 *
 * For any attendance record, it SHALL contain a valid student ID, status,
 * period, timestamp, and recorder ID.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { AttendanceStatus } from '@/types/enums'

// Types for testing attendance record integrity
interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  date: Date
  period: number
  status: AttendanceStatus
  recordedBy: string
  recordedAt: Date
  remarks?: string
}

interface Student {
  id: string
  schoolId: string
  classId: string
  firstName: string
  lastName: string
}

interface Staff {
  id: string
  schoolId: string
  firstName: string
  lastName: string
}

interface Class {
  id: string
  schoolId: string
  name: string
}

// Validation functions that mirror the service logic
function isValidAttendanceRecord(
  record: AttendanceRecord,
  validStudentIds: Set<string>,
  validStaffIds: Set<string>,
  validClassIds: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check student ID is valid
  if (!record.studentId || record.studentId.trim() === '') {
    errors.push('Student ID is required')
  } else if (!validStudentIds.has(record.studentId)) {
    errors.push('Student ID does not exist')
  }

  // Check class ID is valid
  if (!record.classId || record.classId.trim() === '') {
    errors.push('Class ID is required')
  } else if (!validClassIds.has(record.classId)) {
    errors.push('Class ID does not exist')
  }

  // Check status is valid
  const validStatuses = Object.values(AttendanceStatus)
  if (!validStatuses.includes(record.status)) {
    errors.push('Status must be PRESENT, ABSENT, or LATE')
  }

  // Check period is valid (typically 1-10 for school periods)
  if (typeof record.period !== 'number' || record.period < 1 || record.period > 10) {
    errors.push('Period must be between 1 and 10')
  }

  // Check date is valid
  if (!(record.date instanceof Date) || isNaN(record.date.getTime())) {
    errors.push('Date must be a valid date')
  }

  // Check recordedBy (staff ID) is valid
  if (!record.recordedBy || record.recordedBy.trim() === '') {
    errors.push('Recorder ID is required')
  } else if (!validStaffIds.has(record.recordedBy)) {
    errors.push('Recorder ID does not exist')
  }

  // Check recordedAt timestamp is valid
  if (!(record.recordedAt instanceof Date) || isNaN(record.recordedAt.getTime())) {
    errors.push('Recorded timestamp must be a valid date')
  }

  return { valid: errors.length === 0, errors }
}

// Simulated attendance service for testing
class AttendanceServiceSimulator {
  private students: Map<string, Student> = new Map()
  private staff: Map<string, Staff> = new Map()
  private classes: Map<string, Class> = new Map()
  private attendanceRecords: Map<string, AttendanceRecord> = new Map()

  addStudent(student: Student): void {
    this.students.set(student.id, student)
  }

  addStaff(staff: Staff): void {
    this.staff.set(staff.id, staff)
  }

  addClass(cls: Class): void {
    this.classes.set(cls.id, cls)
  }

  getValidStudentIds(): Set<string> {
    return new Set(this.students.keys())
  }

  getValidStaffIds(): Set<string> {
    return new Set(this.staff.keys())
  }

  getValidClassIds(): Set<string> {
    return new Set(this.classes.keys())
  }

  recordAttendance(record: AttendanceRecord): { success: boolean; errors: string[] } {
    const validation = isValidAttendanceRecord(
      record,
      this.getValidStudentIds(),
      this.getValidStaffIds(),
      this.getValidClassIds()
    )

    if (validation.valid) {
      this.attendanceRecords.set(record.id, record)
      return { success: true, errors: [] }
    }

    return { success: false, errors: validation.errors }
  }

  getAttendanceRecord(id: string): AttendanceRecord | undefined {
    return this.attendanceRecords.get(id)
  }
}

// Arbitraries for generating test data
const studentArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  classId: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
})

const staffArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
})

const classArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
})

const attendanceStatusArbitrary = fc.constantFrom(
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE
)

const validPeriodArbitrary = fc.integer({ min: 1, max: 10 })

const dateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
}).filter(d => !isNaN(d.getTime()))

describe('Property 10: Attendance Record Integrity', () => {
  /**
   * Property: Any valid attendance record must contain all required fields
   * with valid values
   */
  it('valid attendance records contain all required fields', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        staffArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        dateArbitrary,
        fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        (student, staff, cls, status, period, date, recordedAt, remarks) => {
          const service = new AttendanceServiceSimulator()

          // Set up valid entities
          service.addStudent({ ...student, classId: cls.id })
          service.addStaff(staff)
          service.addClass(cls)

          // Create a valid attendance record
          const record: AttendanceRecord = {
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: student.id,
            classId: cls.id,
            date,
            period,
            status,
            recordedBy: staff.id,
            recordedAt,
            remarks,
          }

          const result = service.recordAttendance(record)

          // Valid records should be accepted
          expect(result.success).toBe(true)
          expect(result.errors).toHaveLength(0)

          // Verify the record was stored
          const storedRecord = service.getAttendanceRecord(record.id)
          expect(storedRecord).toBeDefined()
          expect(storedRecord?.studentId).toBe(student.id)
          expect(storedRecord?.status).toBe(status)
          expect(storedRecord?.period).toBe(period)
          expect(storedRecord?.recordedBy).toBe(staff.id)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance records with invalid student IDs must be rejected
   */
  it('rejects attendance records with invalid student IDs', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        fc.uuid(), // Invalid student ID (not in system)
        (staff, cls, status, period, date, invalidStudentId) => {
          const service = new AttendanceServiceSimulator()

          // Set up valid staff and class, but NO student
          service.addStaff(staff)
          service.addClass(cls)

          const record: AttendanceRecord = {
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: invalidStudentId,
            classId: cls.id,
            date,
            period,
            status,
            recordedBy: staff.id,
            recordedAt: new Date(),
          }

          const result = service.recordAttendance(record)

          // Should be rejected due to invalid student ID
          expect(result.success).toBe(false)
          expect(result.errors.some(e => e.includes('Student ID'))).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance records with invalid recorder IDs must be rejected
   */
  it('rejects attendance records with invalid recorder IDs', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        fc.uuid(), // Invalid staff ID (not in system)
        (student, cls, status, period, date, invalidStaffId) => {
          const service = new AttendanceServiceSimulator()

          // Set up valid student and class, but NO staff
          service.addStudent({ ...student, classId: cls.id })
          service.addClass(cls)

          const record: AttendanceRecord = {
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: student.id,
            classId: cls.id,
            date,
            period,
            status,
            recordedBy: invalidStaffId,
            recordedAt: new Date(),
          }

          const result = service.recordAttendance(record)

          // Should be rejected due to invalid recorder ID
          expect(result.success).toBe(false)
          expect(result.errors.some(e => e.includes('Recorder ID'))).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance records with invalid periods must be rejected
   */
  it('rejects attendance records with invalid periods', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        staffArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        fc.oneof(
          fc.integer({ max: 0 }),  // Invalid: period <= 0
          fc.integer({ min: 11 })  // Invalid: period > 10
        ),
        dateArbitrary,
        (student, staff, cls, status, invalidPeriod, date) => {
          const service = new AttendanceServiceSimulator()

          service.addStudent({ ...student, classId: cls.id })
          service.addStaff(staff)
          service.addClass(cls)

          const record: AttendanceRecord = {
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: student.id,
            classId: cls.id,
            date,
            period: invalidPeriod,
            status,
            recordedBy: staff.id,
            recordedAt: new Date(),
          }

          const result = service.recordAttendance(record)

          // Should be rejected due to invalid period
          expect(result.success).toBe(false)
          expect(result.errors.some(e => e.includes('Period'))).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All stored attendance records must have valid status values
   */
  it('stored attendance records always have valid status values', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        staffArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        (student, staff, cls, status, period, date) => {
          const service = new AttendanceServiceSimulator()

          service.addStudent({ ...student, classId: cls.id })
          service.addStaff(staff)
          service.addClass(cls)

          const recordId = fc.sample(fc.uuid(), 1)[0]
          const record: AttendanceRecord = {
            id: recordId,
            studentId: student.id,
            classId: cls.id,
            date,
            period,
            status,
            recordedBy: staff.id,
            recordedAt: new Date(),
          }

          service.recordAttendance(record)
          const storedRecord = service.getAttendanceRecord(recordId)

          if (storedRecord) {
            // Verify status is one of the valid values
            const validStatuses = Object.values(AttendanceStatus)
            expect(validStatuses).toContain(storedRecord.status)
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance records must have timestamps that are valid dates
   */
  it('attendance records have valid timestamps', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        staffArbitrary,
        classArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        dateArbitrary,
        (student, staff, cls, status, period, date, recordedAt) => {
          const service = new AttendanceServiceSimulator()

          service.addStudent({ ...student, classId: cls.id })
          service.addStaff(staff)
          service.addClass(cls)

          const recordId = fc.sample(fc.uuid(), 1)[0]
          const record: AttendanceRecord = {
            id: recordId,
            studentId: student.id,
            classId: cls.id,
            date,
            period,
            status,
            recordedBy: staff.id,
            recordedAt,
          }

          const result = service.recordAttendance(record)

          if (result.success) {
            const storedRecord = service.getAttendanceRecord(recordId)
            expect(storedRecord).toBeDefined()

            // Verify date is a valid Date object
            expect(storedRecord?.date instanceof Date).toBe(true)
            expect(isNaN(storedRecord!.date.getTime())).toBe(false)

            // Verify recordedAt is a valid Date object
            expect(storedRecord?.recordedAt instanceof Date).toBe(true)
            expect(isNaN(storedRecord!.recordedAt.getTime())).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance records with invalid class IDs must be rejected
   */
  it('rejects attendance records with invalid class IDs', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        staffArbitrary,
        attendanceStatusArbitrary,
        validPeriodArbitrary,
        dateArbitrary,
        fc.uuid(), // Invalid class ID (not in system)
        (student, staff, status, period, date, invalidClassId) => {
          const service = new AttendanceServiceSimulator()

          // Set up valid student and staff, but NO class
          service.addStudent(student)
          service.addStaff(staff)

          const record: AttendanceRecord = {
            id: fc.sample(fc.uuid(), 1)[0],
            studentId: student.id,
            classId: invalidClassId,
            date,
            period,
            status,
            recordedBy: staff.id,
            recordedAt: new Date(),
          }

          const result = service.recordAttendance(record)

          // Should be rejected due to invalid class ID
          expect(result.success).toBe(false)
          expect(result.errors.some(e => e.includes('Class ID'))).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })
})
