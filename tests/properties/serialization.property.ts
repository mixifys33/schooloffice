/**
 * Property Test: JSON Serialization Round-Trip
 * **Feature: school-office, Property 20: JSON Serialization Round-Trip**
 * **Validates: Requirements 17.1, 17.2, 17.4**
 * 
 * For any data entity (student, payment, result, etc.), serializing to JSON 
 * and deserializing back SHALL produce an equivalent object with no data loss.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  LicenseType,
  PilotType,
  StudentStatus,
  Gender,
  AttendanceStatus,
  ExamType,
  PaymentMethod,
  MessageChannel,
  MessageStatus,
  RelationshipType,
  Role,
} from '../../src/types/enums'

// ============================================
// SERIALIZATION UTILITIES
// ============================================

/**
 * Preprocess an object to convert undefined values to a special marker
 * This is needed because JSON.stringify skips undefined values
 */
function preprocessForSerialization(obj: unknown): unknown {
  if (obj === undefined) {
    return { __type: 'undefined' }
  }
  if (obj === null) {
    return null
  }
  if (obj instanceof Date) {
    // Handle invalid dates
    if (isNaN(obj.getTime())) {
      return { __type: 'InvalidDate' }
    }
    return { __type: 'Date', value: obj.toISOString() }
  }
  if (Array.isArray(obj)) {
    return obj.map(preprocessForSerialization)
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      result[key] = preprocessForSerialization((obj as Record<string, unknown>)[key])
    }
    return result
  }
  return obj
}

/**
 * Postprocess an object to restore undefined values and Date objects
 */
function postprocessAfterDeserialization(obj: unknown): unknown {
  if (obj === null) {
    return null
  }
  if (typeof obj === 'object' && obj !== null) {
    const typedObj = obj as Record<string, unknown>
    if (typedObj.__type === 'undefined') {
      return undefined
    }
    if (typedObj.__type === 'InvalidDate') {
      return new Date(NaN)
    }
    if (typedObj.__type === 'Date' && typeof typedObj.value === 'string') {
      return new Date(typedObj.value)
    }
    if (Array.isArray(obj)) {
      return obj.map(postprocessAfterDeserialization)
    }
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(typedObj)) {
      result[key] = postprocessAfterDeserialization(typedObj[key])
    }
    return result
  }
  return obj
}

/**
 * Serialize an entity to JSON string
 * Handles Date objects and preserves undefined values as a special marker
 */
function serialize<T>(entity: T): string {
  const preprocessed = preprocessForSerialization(entity)
  return JSON.stringify(preprocessed)
}

/**
 * Deserialize a JSON string back to an entity
 * Restores Date objects and undefined values
 */
function deserialize<T>(json: string): T {
  const parsed = JSON.parse(json)
  return postprocessAfterDeserialization(parsed) as T
}

/**
 * Deep equality check that handles Date objects and undefined values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Handle identical values (including both undefined)
  if (a === b) return true
  
  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    // Handle invalid dates (NaN)
    if (isNaN(a.getTime()) && isNaN(b.getTime())) return true
    return a.getTime() === b.getTime()
  }
  
  // Handle type mismatches
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  if (a === null || b === null) return a === b
  
  const objA = a as Record<string, unknown>
  const objB = b as Record<string, unknown>
  
  // Get all keys from both objects (including those with undefined values)
  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)
  
  // Check if both have the same keys
  if (keysA.length !== keysB.length) return false
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(objA[key], objB[key])) {
      return false
    }
  }
  
  return true
}

// ============================================
// ARBITRARIES FOR ENTITY GENERATION
// ============================================

const dateArbitrary = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })

const featureFlagsArbitrary = fc.record({
  smsEnabled: fc.boolean(),
  whatsappEnabled: fc.boolean(),
  paymentIntegration: fc.boolean(),
  advancedReporting: fc.boolean(),
  bulkMessaging: fc.boolean(),
})

const schoolArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  code: fc.string({ minLength: 3, maxLength: 10 }),
  address: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  phone: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  logo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  licenseType: fc.constantFrom(...Object.values(LicenseType)),
  features: featureFlagsArbitrary,
  smsBudgetPerTerm: fc.integer({ min: 0, max: 10000000 }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
  isActive: fc.boolean(),
})

const studentArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  admissionNumber: fc.string({ minLength: 5, maxLength: 15 }),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  dateOfBirth: fc.option(dateArbitrary, { nil: undefined }),
  gender: fc.option(fc.constantFrom(...Object.values(Gender)), { nil: undefined }),
  classId: fc.uuid(),
  streamId: fc.option(fc.uuid(), { nil: undefined }),
  pilotType: fc.constantFrom(...Object.values(PilotType)),
  smsLimitPerTerm: fc.constantFrom(2, 20),
  smsSentCount: fc.integer({ min: 0, max: 25 }),
  photo: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  medicalInfo: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  enrollmentDate: dateArbitrary,
  status: fc.constantFrom(...Object.values(StudentStatus)),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const guardianArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  phoneVerified: fc.boolean(),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  emailVerified: fc.boolean(),
  whatsappNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  relationship: fc.constantFrom(...Object.values(RelationshipType)),
  preferredChannel: fc.constantFrom(...Object.values(MessageChannel)),
  consentGiven: fc.boolean(),
  consentDate: fc.option(dateArbitrary, { nil: undefined }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const paymentArbitrary = fc.record({
  id: fc.uuid(),
  studentId: fc.uuid(),
  termId: fc.uuid(),
  amount: fc.float({ min: 0, max: 10000000, noNaN: true }),
  method: fc.constantFrom(...Object.values(PaymentMethod)),
  reference: fc.string({ minLength: 10, maxLength: 30 }),
  receivedBy: fc.uuid(),
  receivedAt: dateArbitrary,
  receiptNumber: fc.string({ minLength: 8, maxLength: 20 }),
  createdAt: dateArbitrary,
})

const attendanceArbitrary = fc.record({
  id: fc.uuid(),
  studentId: fc.uuid(),
  classId: fc.uuid(),
  date: dateArbitrary,
  period: fc.integer({ min: 1, max: 8 }),
  status: fc.constantFrom(...Object.values(AttendanceStatus)),
  recordedBy: fc.uuid(),
  recordedAt: dateArbitrary,
  remarks: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const markArbitrary = fc.record({
  id: fc.uuid(),
  examId: fc.uuid(),
  studentId: fc.uuid(),
  subjectId: fc.uuid(),
  score: fc.float({ min: 0, max: 100, noNaN: true }),
  maxScore: fc.float({ min: 1, max: 100, noNaN: true }),
  grade: fc.option(fc.string({ minLength: 1, maxLength: 3 }), { nil: undefined }),
  enteredBy: fc.uuid(),
  enteredAt: dateArbitrary,
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const resultArbitrary = fc.record({
  id: fc.uuid(),
  studentId: fc.uuid(),
  termId: fc.uuid(),
  totalMarks: fc.float({ min: 0, max: 1000, noNaN: true }),
  average: fc.float({ min: 0, max: 100, noNaN: true }),
  position: fc.integer({ min: 1, max: 500 }),
  totalStudents: fc.option(fc.integer({ min: 1, max: 500 }), { nil: undefined }),
  grade: fc.option(fc.string({ minLength: 1, maxLength: 3 }), { nil: undefined }),
  teacherRemarks: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  headTeacherRemarks: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

const messageArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  studentId: fc.uuid(),
  guardianId: fc.uuid(),
  templateType: fc.constantFrom(
    'TERM_START', 'ATTENDANCE_ALERT', 'FEES_REMINDER', 
    'MID_TERM_PROGRESS', 'REPORT_READY', 'TERM_SUMMARY',
    'DISCIPLINE_NOTICE', 'GENERAL_ANNOUNCEMENT'
  ),
  channel: fc.constantFrom(...Object.values(MessageChannel)),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  shortUrl: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  status: fc.constantFrom(...Object.values(MessageStatus)),
  cost: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
  sentAt: fc.option(dateArbitrary, { nil: undefined }),
  deliveredAt: fc.option(dateArbitrary, { nil: undefined }),
  readAt: fc.option(dateArbitrary, { nil: undefined }),
  retryCount: fc.integer({ min: 0, max: 5 }),
  errorMessage: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
})

// Safe string arbitrary that excludes special JavaScript property names
const safeKeyArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter(
  s => !['__proto__', 'constructor', 'prototype', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'].includes(s)
)

// Safe JSON value arbitrary that uses safe keys for objects
const safeJsonValueArbitrary: fc.Arbitrary<unknown> = fc.letrec(tie => ({
  value: fc.oneof(
    fc.constant(null),
    fc.boolean(),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.string(),
    fc.array(tie('value'), { maxLength: 3 }),
    fc.dictionary(safeKeyArbitrary, tie('value'), { maxKeys: 3 })
  )
})).value

const auditLogArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  userId: fc.uuid(),
  action: fc.string({ minLength: 1, maxLength: 50 }),
  resource: fc.string({ minLength: 1, maxLength: 50 }),
  resourceId: fc.uuid(),
  previousValue: fc.option(fc.dictionary(safeKeyArbitrary, safeJsonValueArbitrary, { maxKeys: 5 }), { nil: undefined }),
  newValue: fc.option(fc.dictionary(safeKeyArbitrary, safeJsonValueArbitrary, { maxKeys: 5 }), { nil: undefined }),
  ipAddress: fc.option(fc.string({ maxLength: 45 }), { nil: undefined }),
  userAgent: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  timestamp: dateArbitrary,
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 20: JSON Serialization Round-Trip', () => {
  /**
   * Property: School entities round-trip without data loss
   */
  it('School entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(schoolArbitrary, (school) => {
        const serialized = serialize(school)
        const deserialized = deserialize(serialized)
        return deepEqual(school, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Student entities round-trip without data loss
   */
  it('Student entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const serialized = serialize(student)
        const deserialized = deserialize(serialized)
        return deepEqual(student, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Guardian entities round-trip without data loss
   */
  it('Guardian entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(guardianArbitrary, (guardian) => {
        const serialized = serialize(guardian)
        const deserialized = deserialize(serialized)
        return deepEqual(guardian, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Payment entities round-trip without data loss
   */
  it('Payment entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(paymentArbitrary, (payment) => {
        const serialized = serialize(payment)
        const deserialized = deserialize(serialized)
        return deepEqual(payment, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Attendance entities round-trip without data loss
   */
  it('Attendance entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(attendanceArbitrary, (attendance) => {
        const serialized = serialize(attendance)
        const deserialized = deserialize(serialized)
        return deepEqual(attendance, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Mark entities round-trip without data loss
   */
  it('Mark entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(markArbitrary, (mark) => {
        const serialized = serialize(mark)
        const deserialized = deserialize(serialized)
        return deepEqual(mark, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Result entities round-trip without data loss
   */
  it('Result entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(resultArbitrary, (result) => {
        const serialized = serialize(result)
        const deserialized = deserialize(serialized)
        return deepEqual(result, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Message entities round-trip without data loss
   */
  it('Message entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(messageArbitrary, (message) => {
        const serialized = serialize(message)
        const deserialized = deserialize(serialized)
        return deepEqual(message, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: AuditLog entities round-trip without data loss
   */
  it('AuditLog entities serialize and deserialize without data loss', () => {
    fc.assert(
      fc.property(auditLogArbitrary, (auditLog) => {
        const serialized = serialize(auditLog)
        const deserialized = deserialize(serialized)
        return deepEqual(auditLog, deserialized)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Serialized JSON is valid JSON
   */
  it('serialized output is always valid JSON', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const serialized = serialize(student)
        // Should not throw
        JSON.parse(serialized)
        return true
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Multiple round-trips produce same result
   */
  it('multiple round-trips produce identical results', () => {
    fc.assert(
      fc.property(studentArbitrary, (student) => {
        const firstRoundTrip = deserialize(serialize(student))
        const secondRoundTrip = deserialize(serialize(firstRoundTrip))
        const thirdRoundTrip = deserialize(serialize(secondRoundTrip))
        
        return deepEqual(firstRoundTrip, secondRoundTrip) && 
               deepEqual(secondRoundTrip, thirdRoundTrip)
      }),
      { numRuns: 20 }
    )
  })
})
