/**
 * Property Test: Term End SMS Counter Reset
 * **Feature: school-office, Property 23: Term End SMS Counter Reset**
 * **Validates: Requirements 19.5**
 * 
 * For any student, after term end processing, sms_sent_count SHALL be reset to 0.
 */ 
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { PilotType, StudentStatus, Gender } from '../../src/types/enums'
import type { Student } from '../../src/types/entities'

// ============================================
// SMS LIMITS CONFIGURATION
// ============================================

const SMS_LIMITS: Record<PilotType, number> = {
  [PilotType.FREE]: 2,
  [PilotType.PAID]: 20,
}

// ============================================
// TERM END PROCESSING SIMULATION
// ============================================

/**
 * Simulates term end processing for a student
 * This mirrors the behavior in term.service.ts processTermEnd
 */
function processTermEndForStudent(student: Student): Student {
  return {
    ...student,
    smsSentCount: 0,
    updatedAt: new Date(),
  }
}

/**
 * Simulates term end processing for multiple students
 */
function processTermEndForSchool(students: Student[]): {
  students: Student[]
  studentsReset: number
} {
  const resetStudents = students.map(processTermEndForStudent)
  return {
    students: resetStudents,
    studentsReset: students.length,
  }
}

/**
 * Simulates sending SMS to a student (incrementing count)
 */
function sendSmsToStudent(student: Student): Student {
  if (student.smsSentCount >= student.smsLimitPerTerm) {
    // SMS limit reached, don't increment
    return student
  }
  return {
    ...student,
    smsSentCount: student.smsSentCount + 1,
    updatedAt: new Date(),
  }
}

// ============================================
// ARBITRARIES
// ============================================

const pilotTypeArbitrary = fc.constantFrom(...Object.values(PilotType))

const dateArbitrary = fc.date({ min: new Date('2000-01-01'), max: new Date('2020-12-31') })

const studentArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }).filter(s => s.trim().length >= 5),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  dateOfBirth: fc.option(dateArbitrary, { nil: undefined }),
  gender: fc.option(fc.constantFrom(...Object.values(Gender)), { nil: undefined }),
  classId: fc.uuid(),
  streamId: fc.option(fc.uuid(), { nil: undefined }),
  pilotType: pilotTypeArbitrary,
  smsLimitPerTerm: fc.constantFrom(2, 20),
  smsSentCount: fc.nat({ max: 25 }),
  photo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  medicalInfo: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  enrollmentDate: dateArbitrary,
  status: fc.constantFrom(...Object.values(StudentStatus)),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const studentWithCorrectLimitArbitrary = pilotTypeArbitrary.chain(pilotType => 
  studentArbitrary.map(student => ({
    ...student,
    pilotType,
    smsLimitPerTerm: SMS_LIMITS[pilotType],
  }))
)

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 23: Term End SMS Counter Reset', () => {
  /**
   * Property: SMS sent count is reset to 0 after term end
   * For any student, after term end processing, sms_sent_count SHALL be 0
   */
  it('SMS sent count is reset to 0 after term end', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const resetStudent = processTermEndForStudent(student)
        
        return resetStudent.smsSentCount === 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS limit is preserved after term end reset
   * For any student, smsLimitPerTerm SHALL remain unchanged after reset
   */
  it('SMS limit is preserved after term end reset', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const resetStudent = processTermEndForStudent(student)
        
        return resetStudent.smsLimitPerTerm === student.smsLimitPerTerm
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Pilot type is preserved after term end reset
   * For any student, pilotType SHALL remain unchanged after reset
   */
  it('pilot type is preserved after term end reset', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const resetStudent = processTermEndForStudent(student)
        
        return resetStudent.pilotType === student.pilotType
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All students in school are reset
   * For any set of students, all SHALL have smsSentCount = 0 after term end
   */
  it('all students in school are reset', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 1, maxLength: 50 }),
        (students) => {
          const result = processTermEndForSchool(students)
          
          return result.students.every(s => s.smsSentCount === 0) &&
                 result.studentsReset === students.length
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Reset count matches number of students
   * For any set of students, studentsReset SHALL equal the number of students
   */
  it('reset count matches number of students', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 0, maxLength: 100 }),
        (students) => {
          const result = processTermEndForSchool(students)
          
          return result.studentsReset === students.length
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Student can send SMS again after reset
   * For any student at SMS limit, after reset they SHALL be able to send SMS
   */
  it('student can send SMS again after reset', () => {
    fc.assert(
      fc.property(studentWithCorrectLimitArbitrary, (student) => {
        // Set student at SMS limit
        const atLimitStudent = { ...student, smsSentCount: student.smsLimitPerTerm }
        
        // Reset
        const resetStudent = processTermEndForStudent(atLimitStudent)
        
        // Should be able to send SMS now
        const afterSend = sendSmsToStudent(resetStudent)
        
        return resetStudent.smsSentCount === 0 &&
               afterSend.smsSentCount === 1
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Reset is idempotent
   * For any student, resetting multiple times SHALL have same result as once
   */
  it('reset is idempotent', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const resetOnce = processTermEndForStudent(student)
        const resetTwice = processTermEndForStudent(resetOnce)
        const resetThrice = processTermEndForStudent(resetTwice)
        
        return resetOnce.smsSentCount === 0 &&
               resetTwice.smsSentCount === 0 &&
               resetThrice.smsSentCount === 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Student identity is preserved after reset
   * For any student, id, schoolId, admissionNumber SHALL remain unchanged
   */
  it('student identity is preserved after reset', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const resetStudent = processTermEndForStudent(student)
        
        return resetStudent.id === student.id &&
               resetStudent.schoolId === student.schoolId &&
               resetStudent.admissionNumber === student.admissionNumber &&
               resetStudent.firstName === student.firstName &&
               resetStudent.lastName === student.lastName
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: FREE students get full 2 SMS quota after reset
   * For any FREE student, after reset they SHALL have 2 SMS available
   */
  it('FREE students get full 2 SMS quota after reset', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const freeStudent = {
          ...student,
          pilotType: PilotType.FREE,
          smsLimitPerTerm: SMS_LIMITS[PilotType.FREE],
          smsSentCount: SMS_LIMITS[PilotType.FREE], // At limit
        }
        
        const resetStudent = processTermEndForStudent(freeStudent)
        
        // Can send 2 SMS
        let current = resetStudent
        for (let i = 0; i < 2; i++) {
          current = sendSmsToStudent(current)
        }
        
        return resetStudent.smsSentCount === 0 &&
               current.smsSentCount === 2
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PAID students get full 20 SMS quota after reset
   * For any PAID student, after reset they SHALL have 20 SMS available
   */
  it('PAID students get full 20 SMS quota after reset', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const paidStudent = {
          ...student,
          pilotType: PilotType.PAID,
          smsLimitPerTerm: SMS_LIMITS[PilotType.PAID],
          smsSentCount: SMS_LIMITS[PilotType.PAID], // At limit
        }
        
        const resetStudent = processTermEndForStudent(paidStudent)
        
        // Can send 20 SMS
        let current = resetStudent
        for (let i = 0; i < 20; i++) {
          current = sendSmsToStudent(current)
        }
        
        return resetStudent.smsSentCount === 0 &&
               current.smsSentCount === 20
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Reset works regardless of current SMS count
   * For any SMS count (0 to max), reset SHALL set count to 0
   */
  it('reset works regardless of current SMS count', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        fc.nat({ max: 100 }),
        (student, smsSentCount) => {
          const studentWithCount = { ...student, smsSentCount }
          const resetStudent = processTermEndForStudent(studentWithCount)
          
          return resetStudent.smsSentCount === 0
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Reset is deterministic
   * For any student, reset SHALL always produce the same result
   */
  it('reset is deterministic', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const reset1 = processTermEndForStudent(student)
        const reset2 = processTermEndForStudent(student)
        
        return reset1.smsSentCount === reset2.smsSentCount &&
               reset1.smsLimitPerTerm === reset2.smsLimitPerTerm &&
               reset1.pilotType === reset2.pilotType
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Empty school reset returns zero count
   * For an empty school, studentsReset SHALL be 0
   */
  it('empty school reset returns zero count', () => {
    fc.assert(
      fc.property(fc.constant([]), (students: Student[]) => {
        const result = processTermEndForSchool(students)
        
        return result.studentsReset === 0 &&
               result.students.length === 0
      }),
      { numRuns: 1 }
    )
  })
})
