/**
 * Property Test: Timetable Conflict Prevention
 * **Feature: school-office, Property 12: Timetable Conflict Prevention**
 * **Validates: Requirements 6.1, 6.2**
 *
 * For any timetable entry, no teacher or room SHALL be double-booked at the same time slot.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Types for testing timetable conflict prevention
interface TimetableEntry {
  id: string
  classId: string
  subjectId: string
  staffId: string
  dayOfWeek: number  // 1-7 (Monday-Sunday)
  period: number     // 1-10
  room?: string
}

interface CreateTimetableEntryInput {
  classId: string
  subjectId: string
  staffId: string
  dayOfWeek: number
  period: number
  room?: string
}

interface TimetableConflict {
  type: 'teacher' | 'room' | 'class'
  existingEntry: TimetableEntry
  conflictingEntry: CreateTimetableEntryInput
}

interface Class {
  id: string
  schoolId: string
  name: string
}

interface Subject {
  id: string
  schoolId: string
  name: string
}

interface Staff {
  id: string
  schoolId: string
  name: string
}

/**
 * Simulated timetable service for testing conflict detection
 */
class TimetableServiceSimulator {
  private entries: Map<string, TimetableEntry> = new Map()
  private classes: Map<string, Class> = new Map()
  private subjects: Map<string, Subject> = new Map()
  private staff: Map<string, Staff> = new Map()
  private nextId = 1

  addClass(cls: Class): void {
    this.classes.set(cls.id, cls)
  }

  addSubject(subject: Subject): void {
    this.subjects.set(subject.id, subject)
  }

  addStaff(staff: Staff): void {
    this.staff.set(staff.id, staff)
  }

  /**
   * Check for conflicts when creating a timetable entry
   * Requirement 6.1: Validate no teacher or room is double-booked
   */
  checkConflicts(data: CreateTimetableEntryInput, excludeEntryId?: string): TimetableConflict[] {
    const conflicts: TimetableConflict[] = []

    for (const [id, entry] of this.entries) {
      // Skip the entry being updated
      if (excludeEntryId && id === excludeEntryId) {
        continue
      }

      // Check if same time slot (day and period)
      if (entry.dayOfWeek === data.dayOfWeek && entry.period === data.period) {
        // Check for teacher double-booking
        if (entry.staffId === data.staffId) {
          conflicts.push({
            type: 'teacher',
            existingEntry: entry,
            conflictingEntry: data,
          })
        }

        // Check for room double-booking (only if both have rooms specified)
        if (data.room && entry.room && entry.room === data.room) {
          conflicts.push({
            type: 'room',
            existingEntry: entry,
            conflictingEntry: data,
          })
        }

        // Check for class double-booking
        if (entry.classId === data.classId) {
          conflicts.push({
            type: 'class',
            existingEntry: entry,
            conflictingEntry: data,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Create a timetable entry with conflict detection
   * Requirement 6.1, 6.2: Validate and reject on conflict
   */
  createEntry(data: CreateTimetableEntryInput): { success: boolean; entry?: TimetableEntry; conflicts?: TimetableConflict[] } {
    // Validate day of week (1-7)
    if (data.dayOfWeek < 1 || data.dayOfWeek > 7) {
      return { success: false, conflicts: [] }
    }

    // Validate period (1-10)
    if (data.period < 1 || data.period > 10) {
      return { success: false, conflicts: [] }
    }

    // Check for conflicts
    const conflicts = this.checkConflicts(data)

    if (conflicts.length > 0) {
      return { success: false, conflicts }
    }

    // Create the entry
    const entry: TimetableEntry = {
      id: `entry-${this.nextId++}`,
      ...data,
    }

    this.entries.set(entry.id, entry)
    return { success: true, entry }
  }

  /**
   * Get all entries
   */
  getAllEntries(): TimetableEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Get entries by teacher
   */
  getEntriesByTeacher(staffId: string): TimetableEntry[] {
    return Array.from(this.entries.values()).filter(e => e.staffId === staffId)
  }

  /**
   * Get entries by class
   */
  getEntriesByClass(classId: string): TimetableEntry[] {
    return Array.from(this.entries.values()).filter(e => e.classId === classId)
  }

  /**
   * Get entries by room
   */
  getEntriesByRoom(room: string): TimetableEntry[] {
    return Array.from(this.entries.values()).filter(e => e.room === room)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear()
    this.nextId = 1
  }
}

// Arbitraries for generating test data
const dayOfWeekArbitrary = fc.integer({ min: 1, max: 7 })
const periodArbitrary = fc.integer({ min: 1, max: 10 })
const roomArbitrary = fc.option(
  fc.stringMatching(/^Room [A-Z][0-9]{1,2}$/),
  { nil: undefined }
)

const classArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.stringMatching(/^Class [1-9][A-Z]?$/),
})

const subjectArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.constantFrom('Math', 'English', 'Science', 'History', 'Geography'),
})

const staffArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 50 }),
})

describe('Property 12: Timetable Conflict Prevention', () => {
  /**
   * Property: No teacher can be double-booked at the same time slot
   * Requirement 6.1: Validate no teacher is double-booked at that time
   */
  it('prevents teacher double-booking at the same time slot', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        fc.array(classArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(subjectArbitrary, { minLength: 2, maxLength: 5 }),
        dayOfWeekArbitrary,
        periodArbitrary,
        roomArbitrary,
        roomArbitrary,
        (teacher, classes, subjects, day, period, room1, room2) => {
          const service = new TimetableServiceSimulator()

          // Ensure we have at least 2 different classes and subjects
          if (classes.length < 2 || subjects.length < 2) return true

          const class1 = classes[0]
          const class2 = classes[1]
          const subject1 = subjects[0]
          const subject2 = subjects[1]

          // First entry should succeed
          const result1 = service.createEntry({
            classId: class1.id,
            subjectId: subject1.id,
            staffId: teacher.id,
            dayOfWeek: day,
            period: period,
            room: room1,
          })

          expect(result1.success).toBe(true)

          // Second entry with same teacher at same time should fail
          const result2 = service.createEntry({
            classId: class2.id,
            subjectId: subject2.id,
            staffId: teacher.id,  // Same teacher
            dayOfWeek: day,       // Same day
            period: period,       // Same period
            room: room2,          // Different room is fine
          })

          expect(result2.success).toBe(false)
          expect(result2.conflicts).toBeDefined()
          expect(result2.conflicts!.some(c => c.type === 'teacher')).toBe(true)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: No room can be double-booked at the same time slot
   * Requirement 6.1: Validate no room is double-booked at that time
   */
  it('prevents room double-booking at the same time slot', () => {
    fc.assert(
      fc.property(
        fc.array(staffArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(classArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(subjectArbitrary, { minLength: 2, maxLength: 5 }),
        dayOfWeekArbitrary,
        periodArbitrary,
        fc.stringMatching(/^Room [A-Z][0-9]{1,2}$/),  // Shared room
        (teachers, classes, subjects, day, period, sharedRoom) => {
          const service = new TimetableServiceSimulator()

          // Ensure we have at least 2 different teachers, classes, and subjects
          if (teachers.length < 2 || classes.length < 2 || subjects.length < 2) return true

          const teacher1 = teachers[0]
          const teacher2 = teachers[1]
          const class1 = classes[0]
          const class2 = classes[1]
          const subject1 = subjects[0]
          const subject2 = subjects[1]

          // First entry should succeed
          const result1 = service.createEntry({
            classId: class1.id,
            subjectId: subject1.id,
            staffId: teacher1.id,
            dayOfWeek: day,
            period: period,
            room: sharedRoom,
          })

          expect(result1.success).toBe(true)

          // Second entry with same room at same time should fail
          const result2 = service.createEntry({
            classId: class2.id,
            subjectId: subject2.id,
            staffId: teacher2.id,  // Different teacher
            dayOfWeek: day,        // Same day
            period: period,        // Same period
            room: sharedRoom,      // Same room - conflict!
          })

          expect(result2.success).toBe(false)
          expect(result2.conflicts).toBeDefined()
          expect(result2.conflicts!.some(c => c.type === 'room')).toBe(true)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: No class can have two subjects at the same time slot
   * Requirement 6.1: Implicit - a class can only be in one place at a time
   */
  it('prevents class double-booking at the same time slot', () => {
    fc.assert(
      fc.property(
        fc.array(staffArbitrary, { minLength: 2, maxLength: 5 }),
        classArbitrary,  // Single class
        fc.array(subjectArbitrary, { minLength: 2, maxLength: 5 }),
        dayOfWeekArbitrary,
        periodArbitrary,
        roomArbitrary,
        roomArbitrary,
        (teachers, cls, subjects, day, period, room1, room2) => {
          const service = new TimetableServiceSimulator()

          // Ensure we have at least 2 different teachers and subjects
          if (teachers.length < 2 || subjects.length < 2) return true

          const teacher1 = teachers[0]
          const teacher2 = teachers[1]
          const subject1 = subjects[0]
          const subject2 = subjects[1]

          // First entry should succeed
          const result1 = service.createEntry({
            classId: cls.id,
            subjectId: subject1.id,
            staffId: teacher1.id,
            dayOfWeek: day,
            period: period,
            room: room1,
          })

          expect(result1.success).toBe(true)

          // Second entry with same class at same time should fail
          const result2 = service.createEntry({
            classId: cls.id,       // Same class - conflict!
            subjectId: subject2.id,
            staffId: teacher2.id,  // Different teacher
            dayOfWeek: day,        // Same day
            period: period,        // Same period
            room: room2,           // Different room
          })

          expect(result2.success).toBe(false)
          expect(result2.conflicts).toBeDefined()
          expect(result2.conflicts!.some(c => c.type === 'class')).toBe(true)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Entries at different time slots never conflict
   */
  it('allows entries at different time slots without conflict', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        classArbitrary,
        subjectArbitrary,
        dayOfWeekArbitrary,
        dayOfWeekArbitrary,
        periodArbitrary,
        periodArbitrary,
        fc.stringMatching(/^Room [A-Z][0-9]{1,2}$/),
        (teacher, cls, subject, day1, day2, period1, period2, room) => {
          // Skip if same time slot
          if (day1 === day2 && period1 === period2) return true

          const service = new TimetableServiceSimulator()

          // First entry
          const result1 = service.createEntry({
            classId: cls.id,
            subjectId: subject.id,
            staffId: teacher.id,
            dayOfWeek: day1,
            period: period1,
            room: room,
          })

          expect(result1.success).toBe(true)

          // Second entry at different time slot should succeed
          // even with same teacher, class, and room
          const result2 = service.createEntry({
            classId: cls.id,
            subjectId: subject.id,
            staffId: teacher.id,
            dayOfWeek: day2,
            period: period2,
            room: room,
          })

          expect(result2.success).toBe(true)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: After successful creation, no conflicts exist in the timetable
   * This is an invariant property
   */
  it('maintains no conflicts invariant after successful entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            staffId: fc.uuid(),
            classId: fc.uuid(),
            subjectId: fc.uuid(),
            dayOfWeek: dayOfWeekArbitrary,
            period: periodArbitrary,
            room: roomArbitrary,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (entryInputs) => {
          const service = new TimetableServiceSimulator()

          // Try to create all entries
          for (const input of entryInputs) {
            service.createEntry(input)
          }

          // Get all successfully created entries
          const entries = service.getAllEntries()

          // Verify no conflicts exist among created entries
          for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
              const entry1 = entries[i]
              const entry2 = entries[j]

              // If same time slot
              if (entry1.dayOfWeek === entry2.dayOfWeek && entry1.period === entry2.period) {
                // No teacher double-booking
                expect(entry1.staffId).not.toBe(entry2.staffId)

                // No class double-booking
                expect(entry1.classId).not.toBe(entry2.classId)

                // No room double-booking (if both have rooms)
                if (entry1.room && entry2.room) {
                  expect(entry1.room).not.toBe(entry2.room)
                }
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
   * Property: Conflict detection returns the correct conflicting entry
   * Requirement 6.2: Display the conflicting allocation
   */
  it('returns correct conflicting entry details', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        classArbitrary,
        classArbitrary,
        subjectArbitrary,
        subjectArbitrary,
        dayOfWeekArbitrary,
        periodArbitrary,
        (teacher, class1, class2, subject1, subject2, day, period) => {
          const service = new TimetableServiceSimulator()

          // Create first entry
          const result1 = service.createEntry({
            classId: class1.id,
            subjectId: subject1.id,
            staffId: teacher.id,
            dayOfWeek: day,
            period: period,
          })

          expect(result1.success).toBe(true)
          const firstEntry = result1.entry!

          // Try to create conflicting entry
          const conflictingInput: CreateTimetableEntryInput = {
            classId: class2.id,
            subjectId: subject2.id,
            staffId: teacher.id,  // Same teacher
            dayOfWeek: day,
            period: period,
          }

          const result2 = service.createEntry(conflictingInput)

          expect(result2.success).toBe(false)
          expect(result2.conflicts).toBeDefined()

          // Verify the conflict contains the correct existing entry
          const teacherConflict = result2.conflicts!.find(c => c.type === 'teacher')
          expect(teacherConflict).toBeDefined()
          expect(teacherConflict!.existingEntry.id).toBe(firstEntry.id)
          expect(teacherConflict!.existingEntry.staffId).toBe(teacher.id)
          expect(teacherConflict!.conflictingEntry.staffId).toBe(teacher.id)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Entries without rooms don't cause room conflicts
   */
  it('entries without rooms do not cause room conflicts', () => {
    fc.assert(
      fc.property(
        fc.array(staffArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(classArbitrary, { minLength: 2, maxLength: 5 }),
        fc.array(subjectArbitrary, { minLength: 2, maxLength: 5 }),
        dayOfWeekArbitrary,
        periodArbitrary,
        (teachers, classes, subjects, day, period) => {
          const service = new TimetableServiceSimulator()

          if (teachers.length < 2 || classes.length < 2 || subjects.length < 2) return true

          // Create first entry without room
          const result1 = service.createEntry({
            classId: classes[0].id,
            subjectId: subjects[0].id,
            staffId: teachers[0].id,
            dayOfWeek: day,
            period: period,
            room: undefined,  // No room
          })

          expect(result1.success).toBe(true)

          // Create second entry without room - should succeed (no room conflict)
          // but may fail due to other conflicts
          const result2 = service.createEntry({
            classId: classes[1].id,
            subjectId: subjects[1].id,
            staffId: teachers[1].id,
            dayOfWeek: day,
            period: period,
            room: undefined,  // No room
          })

          // If it failed, it should NOT be due to room conflict
          if (!result2.success && result2.conflicts) {
            expect(result2.conflicts.every(c => c.type !== 'room')).toBe(true)
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Valid day and period ranges are enforced
   */
  it('rejects entries with invalid day or period values', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        classArbitrary,
        subjectArbitrary,
        fc.oneof(
          fc.integer({ max: 0 }),   // Invalid: day <= 0
          fc.integer({ min: 8 })    // Invalid: day > 7
        ),
        periodArbitrary,
        (teacher, cls, subject, invalidDay, period) => {
          const service = new TimetableServiceSimulator()

          const result = service.createEntry({
            classId: cls.id,
            subjectId: subject.id,
            staffId: teacher.id,
            dayOfWeek: invalidDay,
            period: period,
          })

          expect(result.success).toBe(false)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  it('rejects entries with invalid period values', () => {
    fc.assert(
      fc.property(
        staffArbitrary,
        classArbitrary,
        subjectArbitrary,
        dayOfWeekArbitrary,
        fc.oneof(
          fc.integer({ max: 0 }),    // Invalid: period <= 0
          fc.integer({ min: 11 })    // Invalid: period > 10
        ),
        (teacher, cls, subject, day, invalidPeriod) => {
          const service = new TimetableServiceSimulator()

          const result = service.createEntry({
            classId: cls.id,
            subjectId: subject.id,
            staffId: teacher.id,
            dayOfWeek: day,
            period: invalidPeriod,
          })

          expect(result.success).toBe(false)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
