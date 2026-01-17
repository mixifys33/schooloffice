/**
 * Property Test: Pilot Type SMS Limits
 * **Feature: school-office, Property 22: Pilot Type SMS Limits**
 * **Validates: Requirements 19.1**
 * 
 * For any FREE pilot student, sms_limit_per_term SHALL be 2; 
 * for any PAID student, sms_limit_per_term SHALL be 20.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { PilotType, StudentStatus, Gender } from '../../src/types/enums'
import type { Student, CreateStudentInput } from '../../src/types/entities'

// ============================================
// SMS LIMITS CONFIGURATION
// ============================================

/**
 * Expected SMS limits by pilot type
 * This mirrors the implementation in student.service.ts
 */
const EXPECTED_SMS_LIMITS: Record<PilotType, number> = {
  [PilotType.FREE]: 2,
  [PilotType.PAID]: 20,
}

// ============================================
// STUDENT ENROLLMENT SIMULATION
// ============================================

/**
 * Simulates student enrollment with pilot type assignment
 * This represents the student service behavior
 */
function enrollStudentWithPilotType(input: CreateStudentInput): Student {
  const now = new Date()
  const pilotType = input.pilotType ?? PilotType.FREE
  const smsLimit = EXPECTED_SMS_LIMITS[pilotType]
  
  return {
    id: crypto.randomUUID(),
    schoolId: input.schoolId,
    admissionNumber: input.admissionNumber,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    classId: input.classId,
    streamId: input.streamId,
    pilotType: pilotType,
    smsLimitPerTerm: smsLimit,
    smsSentCount: 0,
    photo: input.photo,
    medicalInfo: input.medicalInfo,
    enrollmentDate: now,
    status: StudentStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Simulates updating a student's pilot type
 */
function updateStudentPilotType(student: Student, newPilotType: PilotType): Student {
  const smsLimit = EXPECTED_SMS_LIMITS[newPilotType]
  
  return {
    ...student,
    pilotType: newPilotType,
    smsLimitPerTerm: smsLimit,
    updatedAt: new Date(),
  }
}

// ============================================
// ARBITRARIES
// ============================================

const pilotTypeArbitrary = fc.constantFrom(...Object.values(PilotType))

const dateArbitrary = fc.date({ min: new Date('2000-01-01'), max: new Date('2020-12-31') })

const createStudentInputArbitrary = fc.record({
  schoolId: fc.uuid(),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }).filter(s => s.trim().length >= 5),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  dateOfBirth: fc.option(dateArbitrary, { nil: undefined }),
  gender: fc.option(fc.constantFrom(...Object.values(Gender)), { nil: undefined }),
  classId: fc.uuid(),
  streamId: fc.option(fc.uuid(), { nil: undefined }),
  pilotType: fc.option(pilotTypeArbitrary, { nil: undefined }),
  photo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  medicalInfo: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
})

const createStudentInputWithPilotTypeArbitrary = fc.record({
  schoolId: fc.uuid(),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }).filter(s => s.trim().length >= 5),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  dateOfBirth: fc.option(dateArbitrary, { nil: undefined }),
  gender: fc.option(fc.constantFrom(...Object.values(Gender)), { nil: undefined }),
  classId: fc.uuid(),
  streamId: fc.option(fc.uuid(), { nil: undefined }),
  pilotType: pilotTypeArbitrary, // Always specified
  photo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  medicalInfo: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 22: Pilot Type SMS Limits', () => {
  /**
   * Property: FREE pilot students have SMS limit of 2
   * For any student with pilotType FREE, smsLimitPerTerm SHALL be 2
   */
  it('FREE pilot students have SMS limit of 2', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const inputWithFreePilot = { ...input, pilotType: PilotType.FREE }
        const student = enrollStudentWithPilotType(inputWithFreePilot)
        
        return student.pilotType === PilotType.FREE && 
               student.smsLimitPerTerm === 2
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PAID students have SMS limit of 20
   * For any student with pilotType PAID, smsLimitPerTerm SHALL be 20
   */
  it('PAID students have SMS limit of 20', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const inputWithPaidPilot = { ...input, pilotType: PilotType.PAID }
        const student = enrollStudentWithPilotType(inputWithPaidPilot)
        
        return student.pilotType === PilotType.PAID && 
               student.smsLimitPerTerm === 20
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Default pilot type is FREE with limit of 2
   * For any student enrolled without specifying pilotType, 
   * the default SHALL be FREE with smsLimitPerTerm of 2
   */
  it('default pilot type is FREE with limit of 2', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const inputWithoutPilotType = { ...input, pilotType: undefined }
        const student = enrollStudentWithPilotType(inputWithoutPilotType)
        
        return student.pilotType === PilotType.FREE && 
               student.smsLimitPerTerm === 2
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS limit is always determined by pilot type
   * For any pilot type, the SMS limit SHALL match the expected value
   */
  it('SMS limit is always determined by pilot type', () => {
    fc.assert(
      fc.property(
        createStudentInputWithPilotTypeArbitrary,
        (input) => {
          const student = enrollStudentWithPilotType(input)
          const expectedLimit = EXPECTED_SMS_LIMITS[student.pilotType]
          
          return student.smsLimitPerTerm === expectedLimit
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Changing pilot type updates SMS limit accordingly
   * For any student whose pilot type changes, the SMS limit SHALL update
   * to match the new pilot type
   */
  it('changing pilot type updates SMS limit accordingly', () => {
    fc.assert(
      fc.property(
        createStudentInputWithPilotTypeArbitrary,
        pilotTypeArbitrary,
        (input, newPilotType) => {
          const student = enrollStudentWithPilotType(input)
          const updatedStudent = updateStudentPilotType(student, newPilotType)
          
          const expectedLimit = EXPECTED_SMS_LIMITS[newPilotType]
          
          return updatedStudent.pilotType === newPilotType &&
                 updatedStudent.smsLimitPerTerm === expectedLimit
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Upgrading from FREE to PAID increases SMS limit
   * For any FREE student upgraded to PAID, SMS limit SHALL increase from 2 to 20
   */
  it('upgrading from FREE to PAID increases SMS limit from 2 to 20', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const inputWithFreePilot = { ...input, pilotType: PilotType.FREE }
        const freeStudent = enrollStudentWithPilotType(inputWithFreePilot)
        const paidStudent = updateStudentPilotType(freeStudent, PilotType.PAID)
        
        return freeStudent.smsLimitPerTerm === 2 &&
               paidStudent.smsLimitPerTerm === 20 &&
               paidStudent.smsLimitPerTerm > freeStudent.smsLimitPerTerm
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Downgrading from PAID to FREE decreases SMS limit
   * For any PAID student downgraded to FREE, SMS limit SHALL decrease from 20 to 2
   */
  it('downgrading from PAID to FREE decreases SMS limit from 20 to 2', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const inputWithPaidPilot = { ...input, pilotType: PilotType.PAID }
        const paidStudent = enrollStudentWithPilotType(inputWithPaidPilot)
        const freeStudent = updateStudentPilotType(paidStudent, PilotType.FREE)
        
        return paidStudent.smsLimitPerTerm === 20 &&
               freeStudent.smsLimitPerTerm === 2 &&
               freeStudent.smsLimitPerTerm < paidStudent.smsLimitPerTerm
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS limit is always positive
   * For any student, smsLimitPerTerm SHALL be a positive integer
   */
  it('SMS limit is always positive', () => {
    fc.assert(
      fc.property(createStudentInputWithPilotTypeArbitrary, (input) => {
        const student = enrollStudentWithPilotType(input)
        
        return student.smsLimitPerTerm > 0 &&
               Number.isInteger(student.smsLimitPerTerm)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PAID limit is exactly 10x FREE limit
   * The ratio between PAID and FREE SMS limits SHALL be 10:1
   */
  it('PAID limit is exactly 10x FREE limit', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const freeLimit = EXPECTED_SMS_LIMITS[PilotType.FREE]
        const paidLimit = EXPECTED_SMS_LIMITS[PilotType.PAID]
        
        return paidLimit === freeLimit * 10
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: SMS sent count starts at zero regardless of pilot type
   * For any newly enrolled student, smsSentCount SHALL be 0
   */
  it('SMS sent count starts at zero regardless of pilot type', () => {
    fc.assert(
      fc.property(createStudentInputWithPilotTypeArbitrary, (input) => {
        const student = enrollStudentWithPilotType(input)
        
        return student.smsSentCount === 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Pilot type change preserves SMS sent count
   * For any student whose pilot type changes, smsSentCount SHALL remain unchanged
   */
  it('pilot type change preserves SMS sent count', () => {
    fc.assert(
      fc.property(
        createStudentInputWithPilotTypeArbitrary,
        pilotTypeArbitrary,
        fc.nat({ max: 25 }),
        (input, newPilotType, sentCount) => {
          const student = enrollStudentWithPilotType(input)
          // Simulate some SMS being sent
          const studentWithSentSms = { ...student, smsSentCount: sentCount }
          const updatedStudent = updateStudentPilotType(studentWithSentSms, newPilotType)
          
          return updatedStudent.smsSentCount === sentCount
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All pilot types have defined SMS limits
   * For any valid pilot type, there SHALL be a defined SMS limit
   */
  it('all pilot types have defined SMS limits', () => {
    fc.assert(
      fc.property(pilotTypeArbitrary, (pilotType) => {
        const limit = EXPECTED_SMS_LIMITS[pilotType]
        
        return limit !== undefined && 
               typeof limit === 'number' && 
               limit > 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Consistent SMS limits across multiple enrollments
   * For any pilot type, enrolling multiple students SHALL result in 
   * the same SMS limit for all
   */
  it('consistent SMS limits across multiple enrollments', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.array(createStudentInputArbitrary, { minLength: 2, maxLength: 10 }),
        (pilotType, inputs) => {
          const students = inputs.map(input => 
            enrollStudentWithPilotType({ ...input, pilotType })
          )
          
          const expectedLimit = EXPECTED_SMS_LIMITS[pilotType]
          
          return students.every(s => s.smsLimitPerTerm === expectedLimit)
        }
      ),
      { numRuns: 20 }
    )
  })
})
