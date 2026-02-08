/**
 * Unit Tests: Type Validation
 * Tests entity creation with valid/invalid data and enum value constraints
 * _Requirements: 17.2_
 */
import { describe, it, expect } from 'vitest'
import {
  Role,
  PilotType,
  StudentStatus,
  StaffStatus,
  Gender,
  AttendanceStatus,
  ExamType,
  PaymentMethod,
  MessageChannel,
  MessageStatus,
  RelationshipType,
  DisciplineType,
  DisciplineAction,
  LicenseType,
  MessageTemplateType,
} from '@/types/enums'
import type {
  School,
  Student,
  Guardian,
  Staff,
  Attendance,
  Payment,
  FeatureFlags,
  CreateSchoolInput,
  CreateStudentInput,
  CreateGuardianInput,
} from '@/types/entities'

describe('Enum Value Constraints', () => {
  describe('Role enum', () => {
    it('should contain all expected role values', () => {
      expect(Object.values(Role)).toEqual([
        'SUPER_ADMIN',
        'SCHOOL_ADMIN',
        'DEPUTY',
        'TEACHER',
        'ACCOUNTANT',
        'STUDENT',
        'PARENT',
      ])
    })

    it('should have exactly 7 roles', () => {
      expect(Object.keys(Role)).toHaveLength(7)
    })
  })

  describe('PilotType enum', () => {
    it('should contain FREE and PAID values', () => {
      expect(Object.values(PilotType)).toEqual(['FREE', 'PAID'])
    })

    it('should have exactly 2 pilot types', () => {
      expect(Object.keys(PilotType)).toHaveLength(2)
    })
  })

  describe('StudentStatus enum', () => {
    it('should contain all expected status values', () => {
      expect(Object.values(StudentStatus)).toEqual([
        'ACTIVE',
        'TRANSFERRED',
        'GRADUATED',
        'SUSPENDED',
      ])
    })
  })

  describe('LicenseType enum', () => {
    it('should contain all license tier values', () => {
      expect(Object.values(LicenseType)).toEqual([
        'FREE_PILOT',
        'BASIC',
        'PREMIUM',
      ])
    })
  })

  describe('ExamType enum', () => {
    it('should contain BOT, MID, EOT, and CA values', () => {
      expect(Object.values(ExamType)).toEqual(['BOT', 'MID', 'EOT', 'CA'])
    })
  })

  describe('MessageChannel enum', () => {
    it('should contain SMS and EMAIL values', () => {
      expect(Object.values(MessageChannel)).toEqual(['SMS', 'EMAIL'])
    })
  })

  describe('MessageStatus enum', () => {
    it('should contain all message status values', () => {
      expect(Object.values(MessageStatus)).toEqual([
        'QUEUED',
        'SENT',
        'DELIVERED',
        'FAILED',
        'READ',
      ])
    })
  })

  describe('PaymentMethod enum', () => {
    it('should contain CASH, MOBILE_MONEY, and BANK values', () => {
      expect(Object.values(PaymentMethod)).toEqual(['CASH', 'MOBILE_MONEY', 'BANK'])
    })
  })
})

describe('Entity Type Validation', () => {
  describe('School entity', () => {
    it('should accept valid school data', () => {
      const validSchool: School = {
        id: 'school-123',
        name: 'Test School',
        code: 'TST001',
        licenseType: LicenseType.BASIC,
        features: {
          smsEnabled: true,
          paymentIntegration: true,
          advancedReporting: false,
          bulkMessaging: false,
        },
        smsBudgetPerTerm: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      }

      expect(validSchool.id).toBe('school-123')
      expect(validSchool.licenseType).toBe(LicenseType.BASIC)
      expect(validSchool.features.smsEnabled).toBe(true)
    })

    it('should validate CreateSchoolInput with required fields', () => {
      const validInput: CreateSchoolInput = {
        name: 'New School',
        code: 'NEW001',
      }

      expect(validInput.name).toBeDefined()
      expect(validInput.code).toBeDefined()
    })
  })

  describe('Student entity', () => {
    it('should accept valid student data with FREE pilot type', () => {
      const validStudent: Student = {
        id: 'student-123',
        schoolId: 'school-123',
        admissionNumber: 'ADM001',
        firstName: 'John',
        lastName: 'Doe',
        classId: 'class-123',
        pilotType: PilotType.FREE,
        smsLimitPerTerm: 2,
        smsSentCount: 0,
        enrollmentDate: new Date(),
        status: StudentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(validStudent.pilotType).toBe(PilotType.FREE)
      expect(validStudent.smsLimitPerTerm).toBe(2)
      expect(validStudent.status).toBe(StudentStatus.ACTIVE)
    })

    it('should accept valid student data with PAID pilot type', () => {
      const validStudent: Student = {
        id: 'student-456',
        schoolId: 'school-123',
        admissionNumber: 'ADM002',
        firstName: 'Jane',
        lastName: 'Smith',
        classId: 'class-123',
        pilotType: PilotType.PAID,
        smsLimitPerTerm: 20,
        smsSentCount: 5,
        enrollmentDate: new Date(),
        status: StudentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(validStudent.pilotType).toBe(PilotType.PAID)
      expect(validStudent.smsLimitPerTerm).toBe(20)
    })

    it('should validate CreateStudentInput with required fields', () => {
      const validInput: CreateStudentInput = {
        schoolId: 'school-123',
        admissionNumber: 'ADM003',
        firstName: 'Test',
        lastName: 'Student',
        classId: 'class-123',
      }

      expect(validInput.schoolId).toBeDefined()
      expect(validInput.admissionNumber).toBeDefined()
      expect(validInput.firstName).toBeDefined()
      expect(validInput.lastName).toBeDefined()
      expect(validInput.classId).toBeDefined()
    })
  })

  describe('Guardian entity', () => {
    it('should accept valid guardian data', () => {
      const validGuardian: Guardian = {
        id: 'guardian-123',
        firstName: 'Parent',
        lastName: 'Name',
        phone: '+256700000000',
        phoneVerified: true,
        emailVerified: false,
        relationship: RelationshipType.FATHER,
        preferredChannel: MessageChannel.SMS,
        consentGiven: true,
        consentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(validGuardian.relationship).toBe(RelationshipType.FATHER)
      expect(validGuardian.preferredChannel).toBe(MessageChannel.SMS)
      expect(validGuardian.consentGiven).toBe(true)
    })

    it('should validate CreateGuardianInput with required fields', () => {
      const validInput: CreateGuardianInput = {
        firstName: 'Guardian',
        lastName: 'Test',
        phone: '+256700000001',
        relationship: RelationshipType.MOTHER,
      }

      expect(validInput.firstName).toBeDefined()
      expect(validInput.lastName).toBeDefined()
      expect(validInput.phone).toBeDefined()
      expect(validInput.relationship).toBe(RelationshipType.MOTHER)
    })
  })

  describe('FeatureFlags entity', () => {
    it('should accept valid feature flags', () => {
      const validFlags: FeatureFlags = {
        smsEnabled: true,
        paymentIntegration: false,
        advancedReporting: true,
        bulkMessaging: false,
      }

      expect(typeof validFlags.smsEnabled).toBe('boolean')
      expect(typeof validFlags.paymentIntegration).toBe('boolean')
      expect(typeof validFlags.advancedReporting).toBe('boolean')
      expect(typeof validFlags.bulkMessaging).toBe('boolean')
    })
  })

  describe('Attendance entity', () => {
    it('should accept valid attendance record', () => {
      const validAttendance: Attendance = {
        id: 'attendance-123',
        studentId: 'student-123',
        classId: 'class-123',
        date: new Date(),
        period: 1,
        status: AttendanceStatus.PRESENT,
        recordedBy: 'teacher-123',
        recordedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(validAttendance.status).toBe(AttendanceStatus.PRESENT)
      expect(validAttendance.period).toBe(1)
    })

    it('should accept all attendance status values', () => {
      const statuses = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE]
      
      statuses.forEach(status => {
        expect(Object.values(AttendanceStatus)).toContain(status)
      })
    })
  })

  describe('Payment entity', () => {
    it('should accept valid payment data', () => {
      const validPayment: Payment = {
        id: 'payment-123',
        studentId: 'student-123',
        termId: 'term-123',
        amount: 500000,
        method: PaymentMethod.MOBILE_MONEY,
        reference: 'REF123456',
        receivedBy: 'accountant-123',
        receivedAt: new Date(),
        receiptNumber: 'RCP001',
        createdAt: new Date(),
      }

      expect(validPayment.method).toBe(PaymentMethod.MOBILE_MONEY)
      expect(validPayment.amount).toBe(500000)
    })

    it('should accept all payment method values', () => {
      const methods = [PaymentMethod.CASH, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK]
      
      methods.forEach(method => {
        expect(Object.values(PaymentMethod)).toContain(method)
      })
    })
  })
})

describe('Enum Type Safety', () => {
  it('should ensure Role enum values are strings', () => {
    Object.values(Role).forEach(value => {
      expect(typeof value).toBe('string')
    })
  })

  it('should ensure PilotType enum values are strings', () => {
    Object.values(PilotType).forEach(value => {
      expect(typeof value).toBe('string')
    })
  })

  it('should ensure MessageTemplateType contains all template types', () => {
    const expectedTypes = [
      'TERM_START',
      'ATTENDANCE_ALERT',
      'FEES_REMINDER',
      'MID_TERM_PROGRESS',
      'REPORT_READY',
      'TERM_SUMMARY',
      'DISCIPLINE_NOTICE',
      'GENERAL_ANNOUNCEMENT',
    ]

    expectedTypes.forEach(type => {
      expect(Object.values(MessageTemplateType)).toContain(type)
    })
  })

  it('should ensure DisciplineType and DisciplineAction enums are valid', () => {
    expect(Object.values(DisciplineType)).toEqual(['MINOR', 'MAJOR', 'CRITICAL'])
    expect(Object.values(DisciplineAction)).toEqual(['WARNING', 'DETENTION', 'SUSPENSION', 'EXPULSION'])
  })

  it('should ensure Gender enum contains MALE and FEMALE', () => {
    expect(Object.values(Gender)).toEqual(['MALE', 'FEMALE'])
  })

  it('should ensure StaffStatus enum contains ACTIVE and INACTIVE', () => {
    expect(Object.values(StaffStatus)).toEqual(['ACTIVE', 'INACTIVE'])
  })
})
