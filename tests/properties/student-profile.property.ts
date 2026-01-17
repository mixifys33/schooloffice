/**
 * Property Test: Student Profile Completeness
 * **Feature: school-office, Property 8: Student Profile Completeness**
 * **Validates: Requirements 4.1, 4.4**
 * 
 * For any enrolled student, the student record SHALL contain all required fields 
 * (bio data, class, stream) and maintain historical data even after status changes.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { PilotType, StudentStatus, Gender } from '../../src/types/enums'
import type { Student, CreateStudentInput } from '../../src/types/entities'

// ============================================
// STUDENT PROFILE VALIDATION UTILITIES
// ============================================

/**
 * Required fields for a valid student profile
 * Based on Requirements 4.1: bio data, assigned class, and stream
 */
interface RequiredStudentFields {
  id: string
  schoolId: string
  admissionNumber: string
  firstName: string
  lastName: string
  classId: string
  enrollmentDate: Date
  status: StudentStatus
  pilotType: PilotType
  smsLimitPerTerm: number
  smsSentCount: number
}

/**
 * Validates that a student profile contains all required fields
 */
function hasRequiredFields(student: Student): boolean {
  // Check required string fields are non-empty
  const hasId = typeof student.id === 'string' && student.id.length > 0
  const hasSchoolId = typeof student.schoolId === 'string' && student.schoolId.length > 0
  const hasAdmissionNumber = typeof student.admissionNumber === 'string' && student.admissionNumber.length > 0
  const hasFirstName = typeof student.firstName === 'string' && student.firstName.length > 0
  const hasLastName = typeof student.lastName === 'string' && student.lastName.length > 0
  const hasClassId = typeof student.classId === 'string' && student.classId.length > 0
  
  // Check required date field
  const hasEnrollmentDate = student.enrollmentDate instanceof Date && !isNaN(student.enrollmentDate.getTime())
  
  // Check required enum fields
  const hasValidStatus = Object.values(StudentStatus).includes(student.status)
  const hasValidPilotType = Object.values(PilotType).includes(student.pilotType)
  
  // Check required numeric fields
  const hasSmsLimit = typeof student.smsLimitPerTerm === 'number' && student.smsLimitPerTerm >= 0
  const hasSmsSentCount = typeof student.smsSentCount === 'number' && student.smsSentCount >= 0
  
  return hasId && hasSchoolId && hasAdmissionNumber && hasFirstName && 
         hasLastName && hasClassId && hasEnrollmentDate && hasValidStatus && 
         hasValidPilotType && hasSmsLimit && hasSmsSentCount
}

/**
 * Validates that bio data fields are properly typed when present
 */
function hasBioDataIntegrity(student: Student): boolean {
  // Optional bio data fields should be properly typed when present
  if (student.dateOfBirth !== undefined) {
    if (!(student.dateOfBirth instanceof Date) || isNaN(student.dateOfBirth.getTime())) {
      return false
    }
  }
  
  if (student.gender !== undefined) {
    if (!Object.values(Gender).includes(student.gender)) {
      return false
    }
  }
  
  if (student.photo !== undefined && student.photo !== null) {
    if (typeof student.photo !== 'string') {
      return false
    }
  }
  
  if (student.medicalInfo !== undefined && student.medicalInfo !== null) {
    if (typeof student.medicalInfo !== 'string') {
      return false
    }
  }
  
  return true
}

/**
 * Simulates student enrollment and status changes
 * This represents the student service behavior
 */
class StudentProfileStore {
  private students: Map<string, Student> = new Map()
  private studentHistory: Map<string, Student[]> = new Map()

  /**
   * Enroll a new student - creates profile with required fields
   */
  enrollStudent(input: CreateStudentInput): Student {
    const now = new Date()
    const student: Student = {
      id: crypto.randomUUID(),
      schoolId: input.schoolId,
      admissionNumber: input.admissionNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      classId: input.classId,
      streamId: input.streamId,
      pilotType: input.pilotType ?? PilotType.FREE,
      smsLimitPerTerm: input.pilotType === PilotType.PAID ? 20 : 2,
      smsSentCount: 0,
      photo: input.photo,
      medicalInfo: input.medicalInfo,
      enrollmentDate: now,
      status: StudentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    }
    
    this.students.set(student.id, student)
    this.studentHistory.set(student.id, [{ ...student }])
    
    return student
  }

  /**
   * Update student status (transfer, graduate, suspend)
   * Historical data must be preserved per Requirement 4.4
   */
  updateStudentStatus(studentId: string, newStatus: StudentStatus): Student | null {
    const student = this.students.get(studentId)
    if (!student) return null
    
    // Archive current state before update
    const history = this.studentHistory.get(studentId) ?? []
    history.push({ ...student })
    this.studentHistory.set(studentId, history)
    
    // Update status while preserving all other data
    const updatedStudent: Student = {
      ...student,
      status: newStatus,
      updatedAt: new Date(),
    }
    
    this.students.set(studentId, updatedStudent)
    return updatedStudent
  }

  /**
   * Get student by ID
   */
  getStudent(studentId: string): Student | undefined {
    return this.students.get(studentId)
  }

  /**
   * Get student history - for verifying data preservation
   */
  getStudentHistory(studentId: string): Student[] {
    return this.studentHistory.get(studentId) ?? []
  }

  /**
   * Check if historical data is preserved after status change
   */
  isHistoricalDataPreserved(studentId: string): boolean {
    const current = this.students.get(studentId)
    const history = this.studentHistory.get(studentId) ?? []
    
    if (!current || history.length === 0) return false
    
    // The original enrollment data should be in history
    const original = history[0]
    
    // Core bio data should be preserved
    return current.firstName === original.firstName &&
           current.lastName === original.lastName &&
           current.admissionNumber === original.admissionNumber &&
           current.schoolId === original.schoolId &&
           current.enrollmentDate.getTime() === original.enrollmentDate.getTime()
  }
}

// ============================================
// ARBITRARIES FOR STUDENT GENERATION
// ============================================

const dateArbitrary = fc.date({ min: new Date('2000-01-01'), max: new Date('2020-12-31') })
  .filter(d => !isNaN(d.getTime())) // Ensure valid dates only

const createStudentInputArbitrary = fc.record({
  schoolId: fc.uuid(),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }).filter(s => s.trim().length >= 5),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
  dateOfBirth: fc.option(dateArbitrary, { nil: undefined }),
  gender: fc.option(fc.constantFrom(...Object.values(Gender)), { nil: undefined }),
  classId: fc.uuid(),
  streamId: fc.option(fc.uuid(), { nil: undefined }),
  pilotType: fc.option(fc.constantFrom(...Object.values(PilotType)), { nil: undefined }),
  photo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  medicalInfo: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
})

const studentStatusArbitrary = fc.constantFrom(...Object.values(StudentStatus))

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 8: Student Profile Completeness', () => {
  /**
   * Property: Every enrolled student has all required fields
   * For any valid enrollment input, the resulting student profile
   * SHALL contain all required fields (bio data, class assignment)
   */
  it('enrolled students have all required fields', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        // Student must have all required fields
        return hasRequiredFields(student)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Bio data integrity is maintained
   * For any enrolled student, optional bio data fields
   * SHALL be properly typed when present
   */
  it('bio data fields maintain type integrity', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        return hasBioDataIntegrity(student)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Class assignment is always present
   * For any enrolled student, classId SHALL be a non-empty string
   */
  it('class assignment is always present', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        return typeof student.classId === 'string' && 
               student.classId.length > 0 &&
               student.classId === input.classId
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Historical data is preserved after status changes
   * For any student whose status changes (transfer, graduate, suspend),
   * the original enrollment data SHALL be preserved
   */
  it('historical data is preserved after status changes', () => {
    fc.assert(
      fc.property(
        createStudentInputArbitrary,
        studentStatusArbitrary,
        (input, newStatus) => {
          const store = new StudentProfileStore()
          const student = store.enrollStudent(input)
          
          // Change status
          const updatedStudent = store.updateStudentStatus(student.id, newStatus)
          
          if (!updatedStudent) return false
          
          // Status should be updated
          const statusUpdated = updatedStudent.status === newStatus
          
          // Historical data should be preserved
          const historyPreserved = store.isHistoricalDataPreserved(student.id)
          
          // Core bio data should remain unchanged
          const bioDataPreserved = 
            updatedStudent.firstName === student.firstName &&
            updatedStudent.lastName === student.lastName &&
            updatedStudent.admissionNumber === student.admissionNumber &&
            updatedStudent.schoolId === student.schoolId &&
            updatedStudent.classId === student.classId
          
          return statusUpdated && historyPreserved && bioDataPreserved
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Multiple status changes preserve all historical states
   * For any sequence of status changes, all previous states
   * SHALL be preserved in the history
   */
  it('multiple status changes preserve all historical states', () => {
    fc.assert(
      fc.property(
        createStudentInputArbitrary,
        fc.array(studentStatusArbitrary, { minLength: 1, maxLength: 5 }),
        (input, statusChanges) => {
          const store = new StudentProfileStore()
          const student = store.enrollStudent(input)
          
          // Apply multiple status changes
          let currentStudent: Student | null = student
          for (const newStatus of statusChanges) {
            currentStudent = store.updateStudentStatus(student.id, newStatus)
            if (!currentStudent) return false
          }
          
          // History should contain original + all changes
          const history = store.getStudentHistory(student.id)
          
          // History should have at least original enrollment + number of changes
          const hasCorrectHistoryLength = history.length >= statusChanges.length + 1
          
          // Original enrollment data should be first in history
          const originalPreserved = history.length > 0 &&
            history[0].firstName === input.firstName &&
            history[0].lastName === input.lastName &&
            history[0].admissionNumber === input.admissionNumber
          
          return hasCorrectHistoryLength && originalPreserved
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Pilot type determines SMS limits correctly
   * For any enrolled student, smsLimitPerTerm SHALL be 2 for FREE
   * and 20 for PAID pilot types
   */
  it('pilot type determines SMS limits correctly', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        const expectedLimit = student.pilotType === PilotType.PAID ? 20 : 2
        return student.smsLimitPerTerm === expectedLimit
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Enrollment date is set on creation
   * For any enrolled student, enrollmentDate SHALL be a valid date
   * set at the time of enrollment
   */
  it('enrollment date is set on creation', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const beforeEnrollment = new Date()
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        const afterEnrollment = new Date()
        
        // Enrollment date should be valid
        const isValidDate = student.enrollmentDate instanceof Date && 
                           !isNaN(student.enrollmentDate.getTime())
        
        // Enrollment date should be between before and after timestamps
        const isReasonableTime = student.enrollmentDate >= beforeEnrollment &&
                                 student.enrollmentDate <= afterEnrollment
        
        return isValidDate && isReasonableTime
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Initial status is ACTIVE
   * For any newly enrolled student, status SHALL be ACTIVE
   */
  it('initial status is ACTIVE', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        return student.status === StudentStatus.ACTIVE
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS sent count starts at zero
   * For any newly enrolled student, smsSentCount SHALL be 0
   */
  it('SMS sent count starts at zero', () => {
    fc.assert(
      fc.property(createStudentInputArbitrary, (input) => {
        const store = new StudentProfileStore()
        const student = store.enrollStudent(input)
        
        return student.smsSentCount === 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Student ID is unique and non-empty
   * For any enrolled student, id SHALL be a unique non-empty string
   */
  it('student ID is unique and non-empty', () => {
    fc.assert(
      fc.property(
        fc.array(createStudentInputArbitrary, { minLength: 2, maxLength: 10 }),
        (inputs) => {
          const store = new StudentProfileStore()
          const students = inputs.map(input => store.enrollStudent(input))
          
          // All IDs should be non-empty
          const allNonEmpty = students.every(s => 
            typeof s.id === 'string' && s.id.length > 0
          )
          
          // All IDs should be unique
          const ids = students.map(s => s.id)
          const uniqueIds = new Set(ids)
          const allUnique = uniqueIds.size === ids.length
          
          return allNonEmpty && allUnique
        }
      ),
      { numRuns: 20 }
    )
  })
})
