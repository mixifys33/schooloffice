/**
 * Guardian Service
 * Handles guardian management and student-guardian linking operations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 6.1, 6.2, 19.3
 */   
import { prisma } from '@/lib/db'
import {
  Guardian,
  CreateGuardianInput,
  UpdateGuardianInput,
  StudentGuardian,
  GuardianWithRelationship,
  StudentWithRelationship,
  GuardianFinancialSummary,
  GuardianStudentFinancialInfo,
  Payment,
  GuardianCommunicationHistory,
  GuardianCommunicationHistoryEntry,
  GuardianCommunicationHistoryOptions,
  GuardianMessageResult,
  MessagePriority,
} from '@/types'
import { RelationshipType, MessageChannel, GuardianStatus, GuardianFlag, PaymentMethod, MessageStatus } from '@/types/enums'
import { schoolSettingsService, GuardianSettings } from '@/services/school-settings.service'

/**
 * Phone number validation regex
 * Supports international formats: +1234567890, 1234567890, +12-345-678-90
 * Requirement 1.3: Validate phone number format before saving
 */
const PHONE_REGEX = /^\+?[\d\s\-()]{7,20}$/

/**
 * Validate phone number format
 * Requirement 1.3, 8.3: Phone number format validation
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || phone.trim().length === 0) {
    return false
  }
  // Remove all whitespace and check format
  const cleanPhone = phone.replace(/\s/g, '')
  return PHONE_REGEX.test(cleanPhone)
}

/**
 * Map Prisma Guardian to domain Guardian type
 */
function mapPrismaGuardianToDomain(prismaGuardian: {
  id: string
  firstName: string
  lastName: string
  phone: string
  secondaryPhone: string | null
  phoneVerified: boolean
  email: string | null
  emailVerified: boolean
  whatsappNumber: string | null
  nationalId: string | null
  address: string | null
  relationship: string
  preferredChannel: string
  languagePreference: string
  status: string
  flags: string[]
  optOutNonCritical: boolean
  lastContactDate: Date | null
  consentGiven: boolean
  consentDate: Date | null
  createdAt: Date
  updatedAt: Date
}): Guardian {
  return {
    id: prismaGuardian.id,
    firstName: prismaGuardian.firstName,
    lastName: prismaGuardian.lastName,
    phone: prismaGuardian.phone,
    secondaryPhone: prismaGuardian.secondaryPhone ?? undefined,
    phoneVerified: prismaGuardian.phoneVerified,
    email: prismaGuardian.email ?? undefined,
    emailVerified: prismaGuardian.emailVerified,
    whatsappNumber: prismaGuardian.whatsappNumber ?? undefined,
    nationalId: prismaGuardian.nationalId ?? undefined,
    address: prismaGuardian.address ?? undefined,
    relationship: prismaGuardian.relationship as RelationshipType,
    preferredChannel: prismaGuardian.preferredChannel as MessageChannel,
    languagePreference: prismaGuardian.languagePreference,
    status: prismaGuardian.status as GuardianStatus,
    flags: prismaGuardian.flags as GuardianFlag[],
    optOutNonCritical: prismaGuardian.optOutNonCritical,
    lastContactDate: prismaGuardian.lastContactDate ?? undefined,
    consentGiven: prismaGuardian.consentGiven,
    consentDate: prismaGuardian.consentDate ?? undefined,
    createdAt: prismaGuardian.createdAt,
    updatedAt: prismaGuardian.updatedAt,
  }
}

/**
 * Map Prisma StudentGuardian to domain StudentGuardian type
 */
function mapPrismaStudentGuardianToDomain(prismaStudentGuardian: {
  id: string
  studentId: string
  guardianId: string
  relationshipType: string
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
  createdAt: Date
}): StudentGuardian {
  return {
    id: prismaStudentGuardian.id,
    studentId: prismaStudentGuardian.studentId,
    guardianId: prismaStudentGuardian.guardianId,
    relationshipType: prismaStudentGuardian.relationshipType as RelationshipType,
    isPrimary: prismaStudentGuardian.isPrimary,
    isFinanciallyResponsible: prismaStudentGuardian.isFinanciallyResponsible,
    receivesAcademicMessages: prismaStudentGuardian.receivesAcademicMessages,
    receivesFinanceMessages: prismaStudentGuardian.receivesFinanceMessages,
    createdAt: prismaStudentGuardian.createdAt,
  }
}

export class GuardianService {
  /**
   * Create a new guardian with extended fields
   * Requirement 1.1: Require full name and at least one phone number
   * Requirement 1.3: Validate phone number format before saving
   * Requirement 1.5: Display validation error if required field is missing
   */
  async createGuardian(data: CreateGuardianInput): Promise<Guardian> {
    // Requirement 1.1, 1.5: Validate required fields
    if (!data.firstName || data.firstName.trim().length === 0) {
      throw new Error('First name is required')
    }
    if (!data.lastName || data.lastName.trim().length === 0) {
      throw new Error('Last name is required')
    }
    if (!data.phone || data.phone.trim().length === 0) {
      throw new Error('Phone number is required')
    }

    // Requirement 1.3: Validate phone number format
    if (!validatePhoneNumber(data.phone)) {
      throw new Error('Invalid phone number format')
    }

    // Validate secondary phone if provided
    if (data.secondaryPhone && !validatePhoneNumber(data.secondaryPhone)) {
      throw new Error('Invalid secondary phone number format')
    }

    const guardian = await prisma.guardian.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        secondaryPhone: data.secondaryPhone?.trim(),
        phoneVerified: false,
        email: data.email?.trim(),
        emailVerified: false,
        whatsappNumber: data.whatsappNumber?.trim(),
        nationalId: data.nationalId?.trim(),
        address: data.address?.trim(),
        relationship: data.relationship ?? RelationshipType.GUARDIAN,
        preferredChannel: data.preferredChannel ?? MessageChannel.SMS,
        languagePreference: data.languagePreference ?? 'en',
        status: data.status ?? GuardianStatus.ACTIVE,
        flags: data.flags ?? [],
        optOutNonCritical: data.optOutNonCritical ?? false,
        consentGiven: false,
      },
    })

    return mapPrismaGuardianToDomain(guardian)
  }

  /**
   * Get guardian by ID
   * Requirement 1.2: Display full guardian profile
   */
  async getGuardianById(id: string): Promise<Guardian | null> {
    const guardian = await prisma.guardian.findUnique({
      where: { id },
    })

    if (!guardian) return null
    return mapPrismaGuardianToDomain(guardian)
  }

  /**
   * Get guardian by phone number
   */
  async getGuardianByPhone(phone: string): Promise<Guardian | null> {
    const guardian = await prisma.guardian.findFirst({
      where: { phone },
    })

    if (!guardian) return null
    return mapPrismaGuardianToDomain(guardian)
  }

  /**
   * Get guardian by email
   */
  async getGuardianByEmail(email: string): Promise<Guardian | null> {
    const guardian = await prisma.guardian.findFirst({
      where: { email },
    })

    if (!guardian) return null
    return mapPrismaGuardianToDomain(guardian)
  }


  /**
   * Update guardian information with extended fields
   * Requirement 1.3: Validate phone number format on update
   */
  async updateGuardian(id: string, data: UpdateGuardianInput): Promise<Guardian> {
    const existingGuardian = await prisma.guardian.findUnique({
      where: { id },
    })

    if (!existingGuardian) {
      throw new Error(`Guardian with id ${id} not found`)
    }

    // Requirement 1.3: Validate phone number format if provided
    if (data.phone !== undefined && !validatePhoneNumber(data.phone)) {
      throw new Error('Invalid phone number format')
    }

    // Validate secondary phone if provided
    if (data.secondaryPhone !== undefined && data.secondaryPhone !== null && 
        data.secondaryPhone.trim().length > 0 && !validatePhoneNumber(data.secondaryPhone)) {
      throw new Error('Invalid secondary phone number format')
    }

    const updateData: Record<string, unknown> = {}

    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim()
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim()
    if (data.phone !== undefined) {
      updateData.phone = data.phone.trim()
      // Reset phone verification when phone changes
      updateData.phoneVerified = false
    }
    if (data.secondaryPhone !== undefined) {
      updateData.secondaryPhone = data.secondaryPhone?.trim() || null
    }
    if (data.email !== undefined) {
      updateData.email = data.email?.trim() || null
      // Reset email verification when email changes
      updateData.emailVerified = false
    }
    if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber?.trim() || null
    if (data.nationalId !== undefined) updateData.nationalId = data.nationalId?.trim() || null
    if (data.address !== undefined) updateData.address = data.address?.trim() || null
    if (data.relationship !== undefined) updateData.relationship = data.relationship
    if (data.preferredChannel !== undefined) updateData.preferredChannel = data.preferredChannel
    if (data.languagePreference !== undefined) updateData.languagePreference = data.languagePreference
    if (data.status !== undefined) updateData.status = data.status
    if (data.flags !== undefined) updateData.flags = data.flags
    if (data.optOutNonCritical !== undefined) updateData.optOutNonCritical = data.optOutNonCritical

    const guardian = await prisma.guardian.update({
      where: { id },
      data: updateData,
    })

    return mapPrismaGuardianToDomain(guardian)
  }

  /**
   * Set guardian status
   * Requirement 6.1: Support guardian statuses: Active, Inactive, Blocked, Restricted
   */
  async setGuardianStatus(guardianId: string, status: GuardianStatus): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Validate status is a valid GuardianStatus
    if (!Object.values(GuardianStatus).includes(status)) {
      throw new Error(`Invalid guardian status: ${status}`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: { status },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Add a flag to guardian
   * Requirement 6.2: Support flags: Fee Defaulter, High-Conflict, Legal Restriction
   */
  async addGuardianFlag(guardianId: string, flag: GuardianFlag): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Validate flag is a valid GuardianFlag
    if (!Object.values(GuardianFlag).includes(flag)) {
      throw new Error(`Invalid guardian flag: ${flag}`)
    }

    // Check if flag already exists
    if (guardian.flags.includes(flag)) {
      return mapPrismaGuardianToDomain(guardian)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: {
        flags: [...guardian.flags, flag],
      },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Remove a flag from guardian
   * Requirement 6.2: Support flags management
   */
  async removeGuardianFlag(guardianId: string, flag: GuardianFlag): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Validate flag is a valid GuardianFlag
    if (!Object.values(GuardianFlag).includes(flag)) {
      throw new Error(`Invalid guardian flag: ${flag}`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: {
        flags: guardian.flags.filter(f => f !== flag),
      },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Link a guardian to a student
   * Requirement 2.1: Require selection of relationship type when linking
   * Requirement 4.2: Link guardians to students with relationship type
   * Requirement 19.3: Check maximum guardians per student limit
   */
  async linkGuardianToStudent(
    studentId: string,
    guardianId: string,
    isPrimary: boolean,
    relationshipType: RelationshipType
  ): Promise<StudentGuardian> {
    // Requirement 2.1: Validate relationship type is provided
    if (!relationshipType) {
      throw new Error('Relationship type is required when linking guardian to student')
    }

    // Validate relationship type against allowed types
    if (!Object.values(RelationshipType).includes(relationshipType)) {
      throw new Error(`Invalid relationship type: ${relationshipType}. Allowed types: ${Object.values(RelationshipType).join(', ')}`)
    }

    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      throw new Error(`Student with id ${studentId} not found`)
    }

    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Requirement 19.3: Check maximum guardians per student limit
    const currentGuardianCount = await prisma.studentGuardian.count({
      where: { studentId },
    })

    // Get guardian settings for the school
    const guardianSettings = await schoolSettingsService.getSettings<GuardianSettings>(
      student.schoolId,
      'guardian'
    )
    const maxGuardians = guardianSettings.maxGuardiansPerStudent ?? 4 // Default to 4 if not set

    if (currentGuardianCount >= maxGuardians) {
      throw new Error(`Maximum guardians per student reached (${maxGuardians}). Cannot add more guardians.`)
    }

    // Check if link already exists
    const existingLink = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (existingLink) {
      throw new Error('Guardian is already linked to this student')
    }

    // If this is being set as primary, unset any existing primary guardian
    if (isPrimary) {
      await prisma.studentGuardian.updateMany({
        where: {
          studentId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      })
    }

    const studentGuardian = await prisma.studentGuardian.create({
      data: {
        studentId,
        guardianId,
        relationshipType,
        isPrimary,
        isFinanciallyResponsible: isPrimary, // Default: primary guardian is financially responsible
        receivesAcademicMessages: true,
        receivesFinanceMessages: isPrimary, // Default: only primary receives finance messages
      },
    })

    return mapPrismaStudentGuardianToDomain(studentGuardian)
  }

  /**
   * Unlink a guardian from a student
   */
  async unlinkGuardianFromStudent(studentId: string, guardianId: string): Promise<void> {
    const existingLink = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!existingLink) {
      throw new Error('Guardian is not linked to this student')
    }

    await prisma.studentGuardian.delete({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })
  }


  /**
   * Get all guardians for a student with extended relationship data
   * Requirement 2.4: Display all linked guardians with relationships and primary/secondary status
   */
  async getGuardiansByStudent(studentId: string): Promise<GuardianWithRelationship[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { studentId },
      include: { guardian: true },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return studentGuardians.map(sg => ({
      ...mapPrismaGuardianToDomain(sg.guardian),
      relationshipType: sg.relationshipType as RelationshipType,
      isPrimary: sg.isPrimary,
      isFinanciallyResponsible: sg.isFinanciallyResponsible,
      receivesAcademicMessages: sg.receivesAcademicMessages,
      receivesFinanceMessages: sg.receivesFinanceMessages,
    }))
  }

  /**
   * Get the primary guardian for a student
   * Requirement 4.2: Primary guardian designation
   */
  async getPrimaryGuardian(studentId: string): Promise<Guardian | null> {
    const studentGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        isPrimary: true,
      },
      include: { guardian: true },
    })

    if (!studentGuardian) return null
    return mapPrismaGuardianToDomain(studentGuardian.guardian)
  }

  /**
   * Set financial responsibility for a guardian-student link
   * Requirement 4.1: Link a guardian to specific student fee accounts
   * Requirement 4.2: Support one guardian paying for multiple students
   * Requirement 4.3: Support different guardians paying for different students
   */
  async setFinancialResponsibility(
    studentId: string,
    guardianId: string,
    isFinanciallyResponsible: boolean
  ): Promise<StudentGuardian> {
    // Validate the link exists
    const existingLink = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!existingLink) {
      throw new Error('Guardian is not linked to this student')
    }

    // Update the financial responsibility
    const studentGuardian = await prisma.studentGuardian.update({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
      data: {
        isFinanciallyResponsible,
        // If setting as financially responsible, also enable finance messages
        receivesFinanceMessages: isFinanciallyResponsible ? true : existingLink.receivesFinanceMessages,
      },
    })

    return mapPrismaStudentGuardianToDomain(studentGuardian)
  }

  /**
   * Get all students for which a guardian is financially responsible
   * Requirement 4.2: Support one guardian paying for multiple students
   */
  async getFinanciallyResponsibleStudents(guardianId: string): Promise<string[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        guardianId,
        isFinanciallyResponsible: true,
      },
      select: { studentId: true },
    })

    return studentGuardians.map(sg => sg.studentId)
  }

  /**
   * Get the financially responsible guardian for a student
   * Requirement 4.6: Fee reminders go to guardian with financial responsibility
   */
  async getFinanciallyResponsibleGuardian(studentId: string): Promise<Guardian | null> {
    const studentGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        isFinanciallyResponsible: true,
      },
      include: { guardian: true },
    })

    if (!studentGuardian) return null
    return mapPrismaGuardianToDomain(studentGuardian.guardian)
  }

  /**
   * Set message routing configuration for a guardian-student link
   * Requirement 19.4: Configure which guardian types receive academic vs finance messages
   */
  async setMessageRouting(
    studentId: string,
    guardianId: string,
    options: {
      receivesAcademicMessages?: boolean
      receivesFinanceMessages?: boolean
    }
  ): Promise<StudentGuardian> {
    // Validate the link exists
    const existingLink = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!existingLink) {
      throw new Error('Guardian is not linked to this student')
    }

    const updateData: Record<string, boolean> = {}

    if (options.receivesAcademicMessages !== undefined) {
      updateData.receivesAcademicMessages = options.receivesAcademicMessages
    }

    if (options.receivesFinanceMessages !== undefined) {
      updateData.receivesFinanceMessages = options.receivesFinanceMessages
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return mapPrismaStudentGuardianToDomain(existingLink)
    }

    const studentGuardian = await prisma.studentGuardian.update({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
      data: updateData,
    })

    return mapPrismaStudentGuardianToDomain(studentGuardian)
  }

  /**
   * Get guardians who should receive academic messages for a student
   */
  async getAcademicMessageRecipients(studentId: string): Promise<Guardian[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        studentId,
        receivesAcademicMessages: true,
      },
      include: { guardian: true },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return studentGuardians.map(sg => mapPrismaGuardianToDomain(sg.guardian))
  }

  /**
   * Get guardians who should receive finance messages for a student
   */
  async getFinanceMessageRecipients(studentId: string): Promise<Guardian[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        studentId,
        receivesFinanceMessages: true,
      },
      include: { guardian: true },
      orderBy: [
        { isFinanciallyResponsible: 'desc' },
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return studentGuardians.map(sg => mapPrismaGuardianToDomain(sg.guardian))
  }

  /**
   * Set a guardian as primary for a student
   */
  async setPrimaryGuardian(studentId: string, guardianId: string): Promise<StudentGuardian> {
    // Validate the link exists
    const existingLink = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!existingLink) {
      throw new Error('Guardian is not linked to this student')
    }

    // Unset any existing primary guardian
    await prisma.studentGuardian.updateMany({
      where: {
        studentId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    })

    // Set the new primary guardian
    const studentGuardian = await prisma.studentGuardian.update({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
      data: {
        isPrimary: true,
      },
    })

    return mapPrismaStudentGuardianToDomain(studentGuardian)
  }

  /**
   * Get all students for a guardian with extended relationship data
   * Requirement 2.5: Display all linked students with relationships
   */
  async getStudentsByGuardian(guardianId: string): Promise<StudentWithRelationship[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { guardianId },
      include: {
        student: {
          include: {
            class: true,
            stream: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return studentGuardians.map(sg => ({
      id: sg.student.id,
      admissionNumber: sg.student.admissionNumber,
      firstName: sg.student.firstName,
      lastName: sg.student.lastName,
      classId: sg.student.classId,
      className: sg.student.class?.name,
      streamId: sg.student.streamId ?? undefined,
      streamName: sg.student.stream?.name,
      relationshipType: sg.relationshipType as RelationshipType,
      isPrimary: sg.isPrimary,
      isFinanciallyResponsible: sg.isFinanciallyResponsible,
      receivesAcademicMessages: sg.receivesAcademicMessages,
      receivesFinanceMessages: sg.receivesFinanceMessages,
    }))
  }

  /**
   * Get student IDs for a guardian (simple version)
   */
  async getStudentIdsByGuardian(guardianId: string): Promise<string[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { guardianId },
      select: { studentId: true },
    })

    return studentGuardians.map(sg => sg.studentId)
  }

  /**
   * Verify guardian phone number with OTP
   * Uses the OTPVerification model for secure verification
   */
  async verifyPhone(guardianId: string, otp: string): Promise<boolean> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    if (!otp || otp.trim().length === 0) {
      return false
    }

    // Find the pending OTP verification for this guardian's phone
    const otpVerification = await prisma.oTPVerification.findFirst({
      where: {
        guardianId,
        type: 'PHONE',
        contact: guardian.phone,
        status: 'PENDING',
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' }, // Get the most recent one
    })

    if (!otpVerification) {
      // No pending verification found - check if already verified
      if (guardian.phoneVerified) {
        return true
      }
      throw new Error('No pending verification found. Please request a new OTP.')
    }

    // Check if max attempts exceeded
    if (otpVerification.attempts >= otpVerification.maxAttempts) {
      // Mark as expired
      await prisma.oTPVerification.update({
        where: { id: otpVerification.id },
        data: { status: 'EXPIRED' },
      })
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.')
    }

    // Increment attempt count
    await prisma.oTPVerification.update({
      where: { id: otpVerification.id },
      data: { attempts: { increment: 1 } },
    })

    // Verify the OTP code
    if (otpVerification.otpCode !== otp.trim()) {
      const remainingAttempts = otpVerification.maxAttempts - otpVerification.attempts - 1
      if (remainingAttempts <= 0) {
        await prisma.oTPVerification.update({
          where: { id: otpVerification.id },
          data: { status: 'EXPIRED' },
        })
      }
      return false
    }

    // OTP is valid - update verification status and guardian
    await prisma.$transaction([
      prisma.oTPVerification.update({
        where: { id: otpVerification.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      }),
      prisma.guardian.update({
        where: { id: guardianId },
        data: { phoneVerified: true },
      }),
    ])

    return true
  }

  /**
   * Verify guardian email with OTP
   * Uses the OTPVerification model for secure verification
   */
  async verifyEmail(guardianId: string, otp: string): Promise<boolean> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    if (!guardian.email) {
      throw new Error('Guardian does not have an email address')
    }

    if (!otp || otp.trim().length === 0) {
      return false
    }

    // Find the pending OTP verification for this guardian's email
    const otpVerification = await prisma.oTPVerification.findFirst({
      where: {
        guardianId,
        type: 'EMAIL',
        contact: guardian.email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' }, // Get the most recent one
    })

    if (!otpVerification) {
      // No pending verification found - check if already verified
      if (guardian.emailVerified) {
        return true
      }
      throw new Error('No pending verification found. Please request a new OTP.')
    }

    // Check if max attempts exceeded
    if (otpVerification.attempts >= otpVerification.maxAttempts) {
      // Mark as expired
      await prisma.oTPVerification.update({
        where: { id: otpVerification.id },
        data: { status: 'EXPIRED' },
      })
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.')
    }

    // Increment attempt count
    await prisma.oTPVerification.update({
      where: { id: otpVerification.id },
      data: { attempts: { increment: 1 } },
    })

    // Verify the OTP code
    if (otpVerification.otpCode !== otp.trim()) {
      const remainingAttempts = otpVerification.maxAttempts - otpVerification.attempts - 1
      if (remainingAttempts <= 0) {
        await prisma.oTPVerification.update({
          where: { id: otpVerification.id },
          data: { status: 'EXPIRED' },
        })
      }
      return false
    }

    // OTP is valid - update verification status and guardian
    await prisma.$transaction([
      prisma.oTPVerification.update({
        where: { id: otpVerification.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      }),
      prisma.guardian.update({
        where: { id: guardianId },
        data: { emailVerified: true },
      }),
    ])

    return true
  }

  /**
   * Send OTP for phone verification
   * Creates an OTP record and sends it via SMS
   */
  async sendPhoneVerificationOTP(
    guardianId: string,
    schoolId: string,
    studentId?: string
  ): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    if (!guardian.phone) {
      throw new Error('Guardian does not have a phone number')
    }

    if (guardian.phoneVerified) {
      return { success: true, message: 'Phone number is already verified' }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000) // 3 weeks

    // Invalidate any existing pending OTPs
    await prisma.oTPVerification.updateMany({
      where: {
        guardianId,
        type: 'PHONE',
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    })

    // Create new OTP record
    await prisma.oTPVerification.create({
      data: {
        guardianId,
        studentId,
        schoolId,
        type: 'PHONE',
        contact: guardian.phone,
        otpCode,
        status: 'PENDING',
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
      },
    })

    // Send OTP via SMS
    try {
      const { smsGateway } = await import('./sms-gateway.service')
      const result = await smsGateway.sendSMS({
        to: guardian.phone,
        message: `Your SchoolOffice verification code is: ${otpCode}. This code expires in 3 weeks. Do not share this code with anyone.`,
      })

      if (!result.success) {
        return { success: false, message: `Failed to send SMS: ${result.error}` }
      }

      return {
        success: true,
        message: 'Verification code sent successfully',
        expiresAt,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Send OTP for email verification
   * Creates an OTP record and sends it via email
   */
  async sendEmailVerificationOTP(
    guardianId: string,
    schoolId: string,
    studentId?: string
  ): Promise<{ success: boolean; message: string; expiresAt?: Date }> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    if (!guardian.email) {
      throw new Error('Guardian does not have an email address')
    }

    if (guardian.emailVerified) {
      return { success: true, message: 'Email is already verified' }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 3 * 7 * 24 * 60 * 60 * 1000) // 3 weeks

    // Invalidate any existing pending OTPs
    await prisma.oTPVerification.updateMany({
      where: {
        guardianId,
        type: 'EMAIL',
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    })

    // Create new OTP record
    await prisma.oTPVerification.create({
      data: {
        guardianId,
        studentId,
        schoolId,
        type: 'EMAIL',
        contact: guardian.email,
        otpCode,
        status: 'PENDING',
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
      },
    })

    // Send OTP via email
    try {
      const { emailService } = await import('./email.service')
      const result = await emailService.sendVerificationCode(
        guardian.email,
        `${guardian.firstName} ${guardian.lastName}`,
        otpCode,
        'email_verification',
        undefined, // branding
        30240 // 3 weeks in minutes
      )

      if (!result.success) {
        return { success: false, message: `Failed to send email: ${result.error}` }
      }

      return {
        success: true,
        message: 'Verification code sent successfully',
        expiresAt,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Record consent given by guardian
   */
  async recordConsent(guardianId: string): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: {
        consentGiven: true,
        consentDate: new Date(),
      },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(guardianId: string): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: {
        consentGiven: false,
      },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Update preferred communication channel
   */
  async updatePreferredChannel(guardianId: string, channel: MessageChannel): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: { preferredChannel: channel },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Get student-guardian link details
   */
  async getStudentGuardianLink(studentId: string, guardianId: string): Promise<StudentGuardian | null> {
    const link = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!link) return null
    return mapPrismaStudentGuardianToDomain(link)
  }

  /**
   * Check if guardian has verified contact
   */
  async hasVerifiedContact(guardianId: string): Promise<boolean> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: {
        phoneVerified: true,
        emailVerified: true,
      },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    return guardian.phoneVerified || guardian.emailVerified
  }

  /**
   * Get guardians with unverified contacts for a school
   */
  async getGuardiansWithUnverifiedContacts(schoolId: string): Promise<Guardian[]> {
    // Get all guardians linked to students in the school
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
        phoneVerified: false,
        emailVerified: false,
      },
    })

    return guardians.map(mapPrismaGuardianToDomain)
  }

  /**
   * Count guardians for a student
   */
  async countGuardiansForStudent(studentId: string): Promise<number> {
    return prisma.studentGuardian.count({
      where: { studentId },
    })
  }

  /**
   * Check if student has a primary guardian
   * Requirement 2.6: Flag when no primary guardian assigned
   */
  async hasPrimaryGuardian(studentId: string): Promise<boolean> {
    const count = await prisma.studentGuardian.count({
      where: {
        studentId,
        isPrimary: true,
      },
    })

    return count > 0
  }

  /**
   * Get student guardian status with warning flag
   * Requirement 2.6: Display warning indicator when no primary guardian
   */
  async getStudentGuardianStatus(studentId: string): Promise<{
    hasGuardians: boolean
    hasPrimaryGuardian: boolean
    guardianCount: number
    warningFlag: boolean
    warningMessage?: string
  }> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { studentId },
    })

    const guardianCount = studentGuardians.length
    const hasPrimary = studentGuardians.some(sg => sg.isPrimary)
    const hasGuardians = guardianCount > 0

    let warningFlag = false
    let warningMessage: string | undefined

    if (!hasGuardians) {
      warningFlag = true
      warningMessage = 'Student has no guardians assigned'
    } else if (!hasPrimary) {
      warningFlag = true
      warningMessage = 'Student has no primary guardian assigned'
    }

    return {
      hasGuardians,
      hasPrimaryGuardian: hasPrimary,
      guardianCount,
      warningFlag,
      warningMessage,
    }
  }

  /**
   * Get all students without a primary guardian for a school
   * Requirement 2.6: Identify students missing primary guardian
   */
  async getStudentsWithoutPrimaryGuardian(schoolId: string): Promise<{
    studentId: string
    studentName: string
    admissionNumber: string
    className: string
    guardianCount: number
  }[]> {
    // Get all students in the school
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        studentGuardians: true,
      },
    })

    // Filter students without a primary guardian
    const studentsWithoutPrimary = students.filter(student => {
      const hasPrimary = student.studentGuardians.some(sg => sg.isPrimary)
      return !hasPrimary
    })

    return studentsWithoutPrimary.map(student => ({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class?.name ?? 'Unknown',
      guardianCount: student.studentGuardians.length,
    }))
  }

  /**
   * Update last contact date for guardian
   */
  async updateLastContactDate(guardianId: string): Promise<Guardian> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id: guardianId },
      data: { lastContactDate: new Date() },
    })

    return mapPrismaGuardianToDomain(updatedGuardian)
  }

  /**
   * Get guardian financial summary across all financially-linked students
   * Requirement 4.4: Display total fee balance across all linked students
   * Requirement 4.5: Display payment history for all financially-linked students
   */
  async getGuardianFinancialSummary(
    guardianId: string,
    termId: string
  ): Promise<GuardianFinancialSummary> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Get all students for which this guardian is financially responsible
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        guardianId,
        isFinanciallyResponsible: true,
      },
      include: {
        student: {
          include: {
            class: true,
            payments: {
              where: { termId },
              orderBy: { receivedAt: 'desc' },
            },
          },
        },
      },
    })

    // Calculate financial info for each student
    const students: GuardianStudentFinancialInfo[] = []
    const allPayments: Payment[] = []
    let totalBalance = 0

    for (const sg of studentGuardians) {
      const student = sg.student

      // Get fee structure for the student's class
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          classId: student.classId,
          termId,
        },
      })

      const totalFees = feeStructure?.totalAmount ?? 0
      const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = totalFees - totalPaid

      // Get last payment info
      const lastPayment = student.payments[0]

      students.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class?.name ?? 'Unknown',
        balance,
        totalFees,
        totalPaid,
        lastPaymentDate: lastPayment?.receivedAt,
        lastPaymentAmount: lastPayment?.amount,
      })

      totalBalance += balance

      // Collect all payments for payment history
      for (const payment of student.payments) {
        allPayments.push({
          id: payment.id,
          studentId: payment.studentId,
          termId: payment.termId,
          amount: payment.amount,
          method: payment.method as PaymentMethod,
          reference: payment.reference,
          receivedBy: payment.receivedBy,
          receivedAt: payment.receivedAt,
          receiptNumber: payment.receiptNumber,
          createdAt: payment.createdAt,
        })
      }
    }

    // Sort payment history by date (most recent first)
    allPayments.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())

    return {
      guardianId,
      totalBalance,
      students,
      paymentHistory: allPayments,
    }
  }

  /**
   * Pure function to calculate total balance from student financial info
   * Used for property-based testing
   * Requirement 4.4: Total fee balance equals sum of individual student balances
   */
  calculateTotalBalance(students: GuardianStudentFinancialInfo[]): number {
    return students.reduce((sum, student) => sum + student.balance, 0)
  }

  /**
   * Get the guardian who should receive fee reminders for a student
   * Requirement 4.6: Fee reminders go to guardian with financial responsibility, not necessarily primary guardian
   */
  async getFeeReminderRecipient(studentId: string): Promise<Guardian | null> {
    // First, try to find a guardian with financial responsibility
    const financiallyResponsibleGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        isFinanciallyResponsible: true,
      },
      include: { guardian: true },
    })

    if (financiallyResponsibleGuardian) {
      return mapPrismaGuardianToDomain(financiallyResponsibleGuardian.guardian)
    }

    // Fallback to primary guardian if no financially responsible guardian is set
    const primaryGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        isPrimary: true,
      },
      include: { guardian: true },
    })

    if (primaryGuardian) {
      return mapPrismaGuardianToDomain(primaryGuardian.guardian)
    }

    // Fallback to any guardian if no primary is set
    const anyGuardian = await prisma.studentGuardian.findFirst({
      where: { studentId },
      include: { guardian: true },
      orderBy: { createdAt: 'asc' },
    })

    if (anyGuardian) {
      return mapPrismaGuardianToDomain(anyGuardian.guardian)
    }

    return null
  }

  /**
   * Get all guardians who should receive fee reminders for students with arrears
   * Requirement 4.6: Fee reminders go to guardian with financial responsibility
   */
  async getFeeReminderRecipientsForSchool(
    schoolId: string,
    termId: string,
    minBalance?: number
  ): Promise<{
    guardianId: string
    guardian: Guardian
    students: {
      studentId: string
      studentName: string
      balance: number
    }[]
    totalBalance: number
  }[]> {
    // Get all students in the school with their guardians and payments
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
      include: {
        class: true,
        studentGuardians: {
          include: { guardian: true },
        },
        payments: {
          where: { termId },
        },
      },
    })

    // Group students by their fee reminder recipient guardian
    const guardianStudentsMap = new Map<string, {
      guardian: Guardian
      students: { studentId: string; studentName: string; balance: number }[]
    }>()

    for (const student of students) {
      // Calculate balance
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          classId: student.classId,
          termId,
        },
      })

      const totalFees = feeStructure?.totalAmount ?? 0
      const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = totalFees - totalPaid

      // Skip if no arrears or below minimum
      if (balance <= 0 || (minBalance && balance < minBalance)) {
        continue
      }

      // Find the fee reminder recipient
      // Priority: financially responsible > primary > first guardian
      let recipientGuardian: Guardian | null = null

      const financiallyResponsible = student.studentGuardians.find(sg => sg.isFinanciallyResponsible)
      if (financiallyResponsible) {
        recipientGuardian = mapPrismaGuardianToDomain(financiallyResponsible.guardian)
      } else {
        const primary = student.studentGuardians.find(sg => sg.isPrimary)
        if (primary) {
          recipientGuardian = mapPrismaGuardianToDomain(primary.guardian)
        } else if (student.studentGuardians.length > 0) {
          recipientGuardian = mapPrismaGuardianToDomain(student.studentGuardians[0].guardian)
        }
      }

      if (!recipientGuardian) {
        continue
      }

      // Add to map
      const existing = guardianStudentsMap.get(recipientGuardian.id)
      if (existing) {
        existing.students.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          balance,
        })
      } else {
        guardianStudentsMap.set(recipientGuardian.id, {
          guardian: recipientGuardian,
          students: [{
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            balance,
          }],
        })
      }
    }

    // Convert map to array and calculate total balance per guardian
    const result = Array.from(guardianStudentsMap.entries()).map(([guardianId, data]) => ({
      guardianId,
      guardian: data.guardian,
      students: data.students,
      totalBalance: data.students.reduce((sum, s) => sum + s.balance, 0),
    }))

    // Sort by total balance descending
    return result.sort((a, b) => b.totalBalance - a.totalBalance)
  }

  /**
   * Check if a guardian should receive fee reminders for a student
   * Pure function for testing
   * Requirement 4.6: Fee reminders go to guardian with financial responsibility
   */
  shouldReceiveFeeReminder(
    guardianId: string,
    studentGuardians: {
      guardianId: string
      isPrimary: boolean
      isFinanciallyResponsible: boolean
    }[]
  ): boolean {
    // Find the guardian link
    const guardianLink = studentGuardians.find(sg => sg.guardianId === guardianId)
    if (!guardianLink) {
      return false
    }

    // If this guardian is financially responsible, they should receive reminders
    if (guardianLink.isFinanciallyResponsible) {
      return true
    }

    // Check if any other guardian is financially responsible
    const hasFinanciallyResponsible = studentGuardians.some(sg => sg.isFinanciallyResponsible)
    if (hasFinanciallyResponsible) {
      // Another guardian is financially responsible, this one shouldn't receive reminders
      return false
    }

    // No financially responsible guardian set, fall back to primary
    if (guardianLink.isPrimary) {
      return true
    }

    // Check if any other guardian is primary
    const hasPrimary = studentGuardians.some(sg => sg.isPrimary)
    if (hasPrimary) {
      // Another guardian is primary, this one shouldn't receive reminders
      return false
    }

    // No primary guardian set, first guardian receives reminders
    // Sort by some consistent criteria (we'll use guardianId for determinism)
    const sortedGuardians = [...studentGuardians].sort((a, b) => 
      a.guardianId.localeCompare(b.guardianId)
    )
    return sortedGuardians[0]?.guardianId === guardianId
  }

  // ============================================
  // GUARDIAN COMMUNICATION FEATURES
  // Requirements: 3.1, 3.2, 3.3, 3.5, 6.3
  // ============================================

  /**
   * Get communication history for a guardian
   * Requirement 3.1: Display message history including channel used, delivery status, and timestamp
   * Requirement 3.5: Show the last contact date prominently
   */
  async getGuardianCommunicationHistory(
    guardianId: string,
    options: GuardianCommunicationHistoryOptions = {}
  ): Promise<GuardianCommunicationHistory> {
    const { limit = 50, offset = 0, channel, status, startDate, endDate } = options

    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: { id: true, lastContactDate: true },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Build where clause for messages
    const whereClause: Record<string, unknown> = {
      guardianId,
    }

    if (channel) {
      whereClause.channel = channel
    }

    if (status) {
      whereClause.status = status
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = startDate
      }
      if (endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = endDate
      }
    }

    // Get messages with student info
    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({ where: whereClause }),
    ])

    // Map to communication history entries
    const historyEntries: GuardianCommunicationHistoryEntry[] = messages.map(msg => ({
      id: msg.id,
      studentId: msg.studentId,
      studentName: `${msg.student.firstName} ${msg.student.lastName}`,
      channel: msg.channel as MessageChannel,
      content: msg.content,
      status: msg.status as MessageStatus,
      sentAt: msg.sentAt ?? undefined,
      deliveredAt: msg.deliveredAt ?? undefined,
      readAt: msg.readAt ?? undefined,
      createdAt: msg.createdAt,
    }))

    return {
      guardianId,
      lastContactDate: guardian.lastContactDate ?? undefined,
      messages: historyEntries,
      totalCount,
    }
  }

  /**
   * Get the preferred channel for sending messages to a guardian
   * Requirement 3.2: Use guardian's preferred communication channel
   */
  async getPreferredChannel(guardianId: string): Promise<MessageChannel> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: { preferredChannel: true },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    return guardian.preferredChannel as MessageChannel
  }

  /**
   * Check if a message can be sent to a guardian based on opt-out and status
   * Requirement 3.3: Check optOutNonCritical flag before sending
   * Requirement 6.3: Prevent non-emergency messages to blocked guardians
   * 
   * @param guardianId - The guardian's ID
   * @param priority - Message priority: 'normal', 'critical', or 'emergency'
   * @returns Object with canSend boolean and reason if blocked
   */
  async canSendMessage(
    guardianId: string,
    priority: MessagePriority = 'normal'
  ): Promise<{ canSend: boolean; reason?: string }> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: {
        status: true,
        optOutNonCritical: true,
      },
    })

    if (!guardian) {
      return { canSend: false, reason: 'Guardian not found' }
    }

    // Requirement 6.3: Blocked guardians can only receive emergency messages
    if (guardian.status === GuardianStatus.BLOCKED) {
      if (priority === 'emergency') {
        return { canSend: true }
      }
      return { canSend: false, reason: 'Guardian is blocked - only emergency messages allowed' }
    }

    // Requirement 3.3: Check opt-out for non-critical messages
    if (guardian.optOutNonCritical && priority === 'normal') {
      return { canSend: false, reason: 'Guardian has opted out of non-critical messages' }
    }

    return { canSend: true }
  }

  /**
   * Send a message to a guardian using their preferred channel
   * Requirement 3.2: Use guardian's preferred channel when sending messages
   * Requirement 3.3: Allow critical messages to bypass opt-out
   * Requirement 6.3: Allow emergency messages to blocked guardians
   * 
   * @param guardianId - The guardian's ID
   * @param studentId - The student's ID (for context)
   * @param content - Message content
   * @param priority - Message priority
   * @returns Result of the send operation
   */
  async sendMessageToGuardian(
    guardianId: string,
    studentId: string,
    content: string,
    priority: MessagePriority = 'normal'
  ): Promise<GuardianMessageResult> {
    // Check if message can be sent
    const canSendResult = await this.canSendMessage(guardianId, priority)
    if (!canSendResult.canSend) {
      return {
        success: false,
        channel: MessageChannel.SMS, // Default channel for error response
        error: canSendResult.reason,
        blockedReason: canSendResult.reason,
      }
    }

    // Get guardian details
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: {
        id: true,
        preferredChannel: true,
        phone: true,
        email: true,
        whatsappNumber: true,
      },
    })

    if (!guardian) {
      return {
        success: false,
        channel: MessageChannel.SMS,
        error: 'Guardian not found',
      }
    }

    // Get student and school info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    })

    if (!student) {
      return {
        success: false,
        channel: guardian.preferredChannel as MessageChannel,
        error: 'Student not found',
      }
    }

    // Use preferred channel
    const channel = guardian.preferredChannel as MessageChannel

    // Create message record
    const message = await prisma.message.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        guardianId,
        templateType: 'GENERAL_ANNOUNCEMENT',
        channel,
        content,
        status: 'QUEUED',
      },
    })

    // Update last contact date
    await prisma.guardian.update({
      where: { id: guardianId },
      data: { lastContactDate: new Date() },
    })

    return {
      success: true,
      messageId: message.id,
      channel,
    }
  }

  /**
   * Pure function to check if a message can be sent based on guardian status and opt-out
   * Used for property-based testing
   * Requirement 3.3: Non-critical message opt-out
   * Requirement 6.3: Blocked guardian message prevention
   */
  canSendMessagePure(
    guardianStatus: GuardianStatus,
    optOutNonCritical: boolean,
    priority: MessagePriority
  ): { canSend: boolean; reason?: string } {
    // Blocked guardians can only receive emergency messages
    if (guardianStatus === GuardianStatus.BLOCKED) {
      if (priority === 'emergency') {
        return { canSend: true }
      }
      return { canSend: false, reason: 'Guardian is blocked - only emergency messages allowed' }
    }

    // Check opt-out for non-critical messages
    if (optOutNonCritical && priority === 'normal') {
      return { canSend: false, reason: 'Guardian has opted out of non-critical messages' }
    }

    return { canSend: true }
  }

  /**
   * Get guardians who can receive messages for a student based on message type
   * Requirement 3.2: Route messages based on guardian preferences
   */
  async getMessageRecipientsForStudent(
    studentId: string,
    messageType: 'academic' | 'finance' | 'general',
    priority: MessagePriority = 'normal'
  ): Promise<Guardian[]> {
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: {
        studentId,
        ...(messageType === 'academic' ? { receivesAcademicMessages: true } : {}),
        ...(messageType === 'finance' ? { receivesFinanceMessages: true } : {}),
      },
      include: { guardian: true },
    })

    const eligibleGuardians: Guardian[] = []

    for (const sg of studentGuardians) {
      const canSendResult = await this.canSendMessage(sg.guardianId, priority)
      if (canSendResult.canSend) {
        eligibleGuardians.push(mapPrismaGuardianToDomain(sg.guardian))
      }
    }

    return eligibleGuardians
  }
}

// Export singleton instance
export const guardianService = new GuardianService()


// ============================================
// GUARDIAN LIST AND SEARCH FEATURES
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
// ============================================

/**
 * Guardian search options
 * Requirement 9.2: Search by name, phone, email
 * Requirement 9.3: Filter by status, flags, linked class
 */
export interface GuardianSearchOptions {
  schoolId: string
  search?: string
  status?: GuardianStatus
  flags?: GuardianFlag[]
  classId?: string
  page?: number
  pageSize?: number
}

/**
 * Guardian search result item
 * Requirement 9.4: Show name, phone, number of linked students, and status
 */
export interface GuardianSearchResult {
  id: string
  firstName: string
  lastName: string
  phone: string
  secondaryPhone?: string
  email?: string
  status: GuardianStatus
  flags: GuardianFlag[]
  studentCount: number
  preferredChannel: MessageChannel
  lastContactDate?: Date
}

/**
 * Paginated guardian search results
 * Requirement 9.1: Display a paginated list of all guardians
 */
export interface GuardianSearchResults {
  guardians: GuardianSearchResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Search and filter guardians
 * Requirement 9.1: Display a paginated list of all guardians
 * Requirement 9.2: Allow searching guardians by name, phone number, or email
 * Requirement 9.3: Allow filtering guardians by status, flags, and linked class
 * Requirement 9.4: Show name, phone, number of linked students, and status
 */
export async function searchGuardians(options: GuardianSearchOptions): Promise<GuardianSearchResults> {
  const {
    schoolId,
    search,
    status,
    flags,
    classId,
    page = 1,
    pageSize = 20,
  } = options

  // Build where clause for guardians linked to students in this school
  const whereClause: Record<string, unknown> = {
    studentGuardians: {
      some: {
        student: {
          schoolId,
          ...(classId ? { classId } : {}),
        },
      },
    },
  }

  // Requirement 9.2: Search by name, phone, or email
  if (search && search.trim().length > 0) {
    const searchTerm = search.trim()
    whereClause.OR = [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm } }, // Phone search without case-insensitive mode
      { secondaryPhone: { contains: searchTerm } }, // Phone search without case-insensitive mode
      { email: { contains: searchTerm, mode: 'insensitive' } },
    ]
  }

  // Requirement 9.3: Filter by status
  if (status && Object.values(GuardianStatus).includes(status)) {
    whereClause.status = status
  }

  // Requirement 9.3: Filter by flags
  if (flags && flags.length > 0) {
    const validFlags = flags.filter(f => Object.values(GuardianFlag).includes(f))
    if (validFlags.length > 0) {
      whereClause.flags = { hasEvery: validFlags }
    }
  }

  // Get total count for pagination
  const total = await prisma.guardian.count({
    where: whereClause,
  })

  // Get guardians with student count
  const guardians = await prisma.guardian.findMany({
    where: whereClause,
    include: {
      studentGuardians: {
        where: {
          student: {
            schoolId,
            ...(classId ? { classId } : {}),
          },
        },
        select: {
          studentId: true,
        },
      },
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // Transform to search results
  const results: GuardianSearchResult[] = guardians.map((guardian) => ({
    id: guardian.id,
    firstName: guardian.firstName,
    lastName: guardian.lastName,
    phone: guardian.phone,
    secondaryPhone: guardian.secondaryPhone ?? undefined,
    email: guardian.email ?? undefined,
    status: guardian.status as GuardianStatus,
    flags: guardian.flags as GuardianFlag[],
    studentCount: guardian.studentGuardians.length,
    preferredChannel: guardian.preferredChannel as MessageChannel,
    lastContactDate: guardian.lastContactDate ?? undefined,
  }))

  return {
    guardians: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Pure function to check if a guardian matches search criteria
 * Used for property-based testing
 * Requirement 9.2: Search accuracy
 */
export function guardianMatchesSearch(
  guardian: {
    firstName: string
    lastName: string
    phone: string
    secondaryPhone?: string
    email?: string
  },
  searchTerm: string
): boolean {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return true
  }

  const term = searchTerm.toLowerCase().trim()
  
  return (
    guardian.firstName.toLowerCase().includes(term) ||
    guardian.lastName.toLowerCase().includes(term) ||
    guardian.phone.toLowerCase().includes(term) ||
    (guardian.secondaryPhone?.toLowerCase().includes(term) ?? false) ||
    (guardian.email?.toLowerCase().includes(term) ?? false)
  )
}

/**
 * Pure function to check if a guardian matches filter criteria
 * Used for property-based testing
 * Requirement 9.3: Filter accuracy
 */
export function guardianMatchesFilter(
  guardian: {
    status: GuardianStatus
    flags: GuardianFlag[]
  },
  filter: {
    status?: GuardianStatus
    flags?: GuardianFlag[]
  }
): boolean {
  // Check status filter
  if (filter.status && guardian.status !== filter.status) {
    return false
  }

  // Check flags filter (guardian must have ALL specified flags)
  if (filter.flags && filter.flags.length > 0) {
    for (const flag of filter.flags) {
      if (!guardian.flags.includes(flag)) {
        return false
      }
    }
  }

  return true
}


/**
 * Pure function to check if a new guardian can be linked to a student
 * Used for property-based testing
 * Requirement 19.3: Maximum guardians per student enforcement
 */
export function canLinkGuardianToStudent(
  currentGuardianCount: number,
  maxGuardiansPerStudent: number
): { canLink: boolean; reason?: string } {
  if (currentGuardianCount >= maxGuardiansPerStudent) {
    return {
      canLink: false,
      reason: `Maximum guardians per student reached (${maxGuardiansPerStudent}). Cannot add more guardians.`,
    }
  }
  return { canLink: true }
}
