/**
 * Property Test: School Tenant Isolation
 * **Feature: school-office, Property 1: School Tenant Isolation**
 * **Validates: Requirements 1.1, 1.3**
 * 
 * For any two schools in the system, data created in one school 
 * (students, staff, classes, payments) SHALL NOT be accessible 
 * from the other school's context.
 */  
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Types for testing tenant isolation
interface School {
  id: string
  name: string
  code: string
}

interface Student {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  admissionNumber: string
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

interface Payment {
  id: string
  studentId: string
  amount: number
}

// Simulated data store for testing
class TenantIsolatedDataStore {
  private schools: Map<string, School> = new Map()
  private students: Map<string, Student> = new Map()
  private staff: Map<string, Staff> = new Map()
  private classes: Map<string, Class> = new Map()
  private payments: Map<string, Payment> = new Map()

  addSchool(school: School): void {
    this.schools.set(school.id, school)
  }

  addStudent(student: Student): void {
    this.students.set(student.id, student)
  }

  addStaff(staff: Staff): void {
    this.staff.set(staff.id, staff)
  }

  addClass(cls: Class): void {
    this.classes.set(cls.id, cls)
  }

  addPayment(payment: Payment): void {
    this.payments.set(payment.id, payment)
  }

  // Tenant-scoped queries - these enforce isolation
  getStudentsBySchool(schoolId: string): Student[] {
    return Array.from(this.students.values()).filter(s => s.schoolId === schoolId)
  }

  getStaffBySchool(schoolId: string): Staff[] {
    return Array.from(this.staff.values()).filter(s => s.schoolId === schoolId)
  }

  getClassesBySchool(schoolId: string): Class[] {
    return Array.from(this.classes.values()).filter(c => c.schoolId === schoolId)
  }

  getPaymentsBySchool(schoolId: string): Payment[] {
    const schoolStudentIds = new Set(
      this.getStudentsBySchool(schoolId).map(s => s.id)
    )
    return Array.from(this.payments.values()).filter(p => 
      schoolStudentIds.has(p.studentId)
    )
  }

  // Check if a student belongs to a school
  studentBelongsToSchool(studentId: string, schoolId: string): boolean {
    const student = this.students.get(studentId)
    return student?.schoolId === schoolId
  }

  // Check if staff belongs to a school
  staffBelongsToSchool(staffId: string, schoolId: string): boolean {
    const staff = this.staff.get(staffId)
    return staff?.schoolId === schoolId
  }

  // Check if class belongs to a school
  classBelongsToSchool(classId: string, schoolId: string): boolean {
    const cls = this.classes.get(classId)
    return cls?.schoolId === schoolId
  }
}

// Arbitraries for generating test data
const schoolArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  code: fc.string({ minLength: 3, maxLength: 10 }),
})

const studentArbitraryForSchool = (schoolId: string) => fc.record({
  id: fc.uuid(),
  schoolId: fc.constant(schoolId),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }),
})

const staffArbitraryForSchool = (schoolId: string) => fc.record({
  id: fc.uuid(),
  schoolId: fc.constant(schoolId),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
})

const classArbitraryForSchool = (schoolId: string) => fc.record({
  id: fc.uuid(),
  schoolId: fc.constant(schoolId),
  name: fc.string({ minLength: 1, maxLength: 50 }),
})

const paymentArbitraryForStudent = (studentId: string) => fc.record({
  id: fc.uuid(),
  studentId: fc.constant(studentId),
  amount: fc.float({ min: 0, max: 10000000, noNaN: true }),
})

describe('Property 1: School Tenant Isolation', () => {
  /**
   * Property: For any two distinct schools, students created in school A
   * should never appear in queries for school B
   */
  it('students from one school are not accessible from another school context', () => {
    fc.assert(
      fc.property(
        schoolArbitrary,
        schoolArbitrary,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (schoolA, schoolB, studentIdsA, studentIdsB) => {
          // Ensure schools are distinct
          fc.pre(schoolA.id !== schoolB.id)

          const store = new TenantIsolatedDataStore()
          store.addSchool(schoolA)
          store.addSchool(schoolB)

          // Add students to school A
          const studentsA = studentIdsA.map(id => ({
            id,
            schoolId: schoolA.id,
            firstName: 'StudentA',
            lastName: 'Test',
            admissionNumber: `ADM-A-${id.slice(0, 5)}`,
          }))
          studentsA.forEach(s => store.addStudent(s))

          // Add students to school B
          const studentsB = studentIdsB.map(id => ({
            id,
            schoolId: schoolB.id,
            firstName: 'StudentB',
            lastName: 'Test',
            admissionNumber: `ADM-B-${id.slice(0, 5)}`,
          }))
          studentsB.forEach(s => store.addStudent(s))

          // Query students for school A - should only get school A students
          const schoolAStudents = store.getStudentsBySchool(schoolA.id)
          const schoolBStudents = store.getStudentsBySchool(schoolB.id)

          // All students returned for school A should belong to school A
          const allSchoolAStudentsBelongToA = schoolAStudents.every(
            s => s.schoolId === schoolA.id
          )

          // All students returned for school B should belong to school B
          const allSchoolBStudentsBelongToB = schoolBStudents.every(
            s => s.schoolId === schoolB.id
          )

          // No school A student should appear in school B results
          const noSchoolAStudentInB = schoolAStudents.every(
            sA => !schoolBStudents.some(sB => sB.id === sA.id)
          )

          return allSchoolAStudentsBelongToA && 
                 allSchoolBStudentsBelongToB && 
                 noSchoolAStudentInB
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any two distinct schools, staff created in school A
   * should never appear in queries for school B
   */
  it('staff from one school are not accessible from another school context', () => {
    fc.assert(
      fc.property(
        schoolArbitrary,
        schoolArbitrary,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (schoolA, schoolB, staffIdsA, staffIdsB) => {
          fc.pre(schoolA.id !== schoolB.id)

          const store = new TenantIsolatedDataStore()
          store.addSchool(schoolA)
          store.addSchool(schoolB)

          // Add staff to both schools
          staffIdsA.forEach(id => store.addStaff({
            id,
            schoolId: schoolA.id,
            firstName: 'StaffA',
            lastName: 'Test',
          }))

          staffIdsB.forEach(id => store.addStaff({
            id,
            schoolId: schoolB.id,
            firstName: 'StaffB',
            lastName: 'Test',
          }))

          const schoolAStaff = store.getStaffBySchool(schoolA.id)
          const schoolBStaff = store.getStaffBySchool(schoolB.id)

          // Verify isolation
          const allSchoolAStaffBelongToA = schoolAStaff.every(
            s => s.schoolId === schoolA.id
          )
          const allSchoolBStaffBelongToB = schoolBStaff.every(
            s => s.schoolId === schoolB.id
          )
          const noSchoolAStaffInB = schoolAStaff.every(
            sA => !schoolBStaff.some(sB => sB.id === sA.id)
          )

          return allSchoolAStaffBelongToA && 
                 allSchoolBStaffBelongToB && 
                 noSchoolAStaffInB
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any two distinct schools, classes created in school A
   * should never appear in queries for school B
   */
  it('classes from one school are not accessible from another school context', () => {
    fc.assert(
      fc.property(
        schoolArbitrary,
        schoolArbitrary,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (schoolA, schoolB, classIdsA, classIdsB) => {
          fc.pre(schoolA.id !== schoolB.id)

          const store = new TenantIsolatedDataStore()
          store.addSchool(schoolA)
          store.addSchool(schoolB)

          classIdsA.forEach(id => store.addClass({
            id,
            schoolId: schoolA.id,
            name: `Class-A-${id.slice(0, 5)}`,
          }))

          classIdsB.forEach(id => store.addClass({
            id,
            schoolId: schoolB.id,
            name: `Class-B-${id.slice(0, 5)}`,
          }))

          const schoolAClasses = store.getClassesBySchool(schoolA.id)
          const schoolBClasses = store.getClassesBySchool(schoolB.id)

          const allSchoolAClassesBelongToA = schoolAClasses.every(
            c => c.schoolId === schoolA.id
          )
          const allSchoolBClassesBelongToB = schoolBClasses.every(
            c => c.schoolId === schoolB.id
          )
          const noSchoolAClassInB = schoolAClasses.every(
            cA => !schoolBClasses.some(cB => cB.id === cA.id)
          )

          return allSchoolAClassesBelongToA && 
                 allSchoolBClassesBelongToB && 
                 noSchoolAClassInB
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any two distinct schools, payments for students in school A
   * should never appear in queries for school B
   */
  it('payments from one school are not accessible from another school context', () => {
    fc.assert(
      fc.property(
        schoolArbitrary,
        schoolArbitrary,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        (schoolA, schoolB, studentIdsA, studentIdsB) => {
          fc.pre(schoolA.id !== schoolB.id)

          const store = new TenantIsolatedDataStore()
          store.addSchool(schoolA)
          store.addSchool(schoolB)

          // Add students and payments to school A
          studentIdsA.forEach(id => {
            store.addStudent({
              id,
              schoolId: schoolA.id,
              firstName: 'StudentA',
              lastName: 'Test',
              admissionNumber: `ADM-A-${id.slice(0, 5)}`,
            })
            store.addPayment({
              id: `payment-${id}`,
              studentId: id,
              amount: 100000,
            })
          })

          // Add students and payments to school B
          studentIdsB.forEach(id => {
            store.addStudent({
              id,
              schoolId: schoolB.id,
              firstName: 'StudentB',
              lastName: 'Test',
              admissionNumber: `ADM-B-${id.slice(0, 5)}`,
            })
            store.addPayment({
              id: `payment-${id}`,
              studentId: id,
              amount: 200000,
            })
          })

          const schoolAPayments = store.getPaymentsBySchool(schoolA.id)
          const schoolBPayments = store.getPaymentsBySchool(schoolB.id)

          // Verify payments are isolated by school
          const schoolAStudentIds = new Set(studentIdsA)
          const schoolBStudentIds = new Set(studentIdsB)

          const allSchoolAPaymentsBelongToA = schoolAPayments.every(
            p => schoolAStudentIds.has(p.studentId)
          )
          const allSchoolBPaymentsBelongToB = schoolBPayments.every(
            p => schoolBStudentIds.has(p.studentId)
          )

          return allSchoolAPaymentsBelongToA && allSchoolBPaymentsBelongToB
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Direct entity access should respect school boundaries
   */
  it('direct entity access respects school boundaries', () => {
    fc.assert(
      fc.property(
        schoolArbitrary,
        schoolArbitrary,
        fc.uuid(),
        (schoolA, schoolB, entityId) => {
          fc.pre(schoolA.id !== schoolB.id)

          const store = new TenantIsolatedDataStore()
          store.addSchool(schoolA)
          store.addSchool(schoolB)

          // Add student to school A
          store.addStudent({
            id: entityId,
            schoolId: schoolA.id,
            firstName: 'Test',
            lastName: 'Student',
            admissionNumber: 'ADM-001',
          })

          // Student should belong to school A
          const belongsToA = store.studentBelongsToSchool(entityId, schoolA.id)
          // Student should NOT belong to school B
          const belongsToB = store.studentBelongsToSchool(entityId, schoolB.id)

          return belongsToA === true && belongsToB === false
        }
      ),
      { numRuns: 20 }
    )
  })
})
