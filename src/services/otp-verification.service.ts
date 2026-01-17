/**
 * OTP Verification Service
 * Handles guardian contact verification via SMS with yes/no confirmation
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */
import { prisma } from '@/lib/db'
import {
  OTPVerification,
  CreateOTPVerificationInput,
  VerifyOTPInput,
  OTPVerificationResult,
  UnverifiedContactWarning,
} from '@/types'
import { OTPVerificationType, OTPVerificationStatus } from '@/types/enums'
import { smsGateway } from './sms-gateway.service'
import { auditService } from './audit.service'

// ============================================
// CONSTANTS
// ============================================

// OTP validity period: 3 weeks in milliseconds
const OTP_VALIDITY_WEEKS = 3
const OTP_VALIDITY_MS = OTP_VALIDITY_WEEKS * 7 * 24 * 60 * 60 * 1000

// Maximum verification attempts
const MAX_VERIFICATION_ATTEMPTS = 3

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a 6-digit OTP code
 * Requirement 24.2: Send 6-digit OTP
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Calculate OTP expiry date (3 weeks from now)
 * Requirement 24.2: OTP valid for 3 weeks
 */
export function calculateOTPExpiry(): Date {
  return new Date(Date.now() + OTP_VALIDITY_MS)
}

/**
 * Check if OTP has expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Map Prisma OTPVerification to domain type
 */
function mapPrismaOTPToDomain(prismaOTP: {
  id: string
  guardianId: string
  studentId: string | null
  schoolId: string
  type: string
  contact: string
  otpCode: string
  status: string
  expiresAt: Date
  verifiedAt: Date | null
  attempts: number
  maxAttempts: number
  createdAt: Date
  updatedAt: Date
}): OTPVerification {
  return {
    id: prismaOTP.id,
    guardianId: prismaOTP.guardianId,
    studentId: prismaOTP.studentId ?? undefined,
    schoolId: prismaOTP.schoolId,
    type: prismaOTP.type as OTPVerificationType,
    contact: prismaOTP.contact,
    otpCode: prismaOTP.otpCode,
    status: prismaOTP.status as OTPVerificationStatus,
    expiresAt: prismaOTP.expiresAt,
    verifiedAt: prismaOTP.verifiedAt ?? undefined,
    attempts: prismaOTP.attempts,
    maxAttempts: prismaOTP.maxAttempts,
    createdAt: prismaOTP.createdAt,
    updatedAt: prismaOTP.updatedAt,
  }
}

// ============================================
// OTP VERIFICATION SERVICE
// ============================================

export class OTPVerificationService {
  /**
   * Check if verification is enabled for a school
   * Requirement 24.4: Support optional verification mode
   */
  async isVerificationEnabled(schoolId: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { features: true },
    })

    if (!school) return false

    // Check if verification is enabled in school features
    const features = school.features as Record<string, boolean>
    return features.contactVerificationEnabled ?? false
  }

  /**
   * Enable or disable verification for a school
   * Requirement 24.1, 24.4: School Admin enables/disables contact verification
   */
  async setVerificationEnabled(schoolId: string, enabled: boolean): Promise<void> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { features: true },
    })

    if (!school) {
      throw new Error(`School with id ${schoolId} not found`)
    }

    const features = school.features as Record<string, boolean>
    features.contactVerificationEnabled = enabled

    await prisma.school.update({
      where: { id: schoolId },
      data: { features },
    })
  }


  /**
   * Initiate OTP verification for a guardian's contact
   * Requirement 24.1, 24.2: Send OTP for verification
   * Sends SMS asking "Are you the guardian of [student]? Reply YES or NO"
   */
  async initiateVerification(
    input: CreateOTPVerificationInput
  ): Promise<OTPVerification> {
    const { guardianId, studentId, schoolId, type, contact } = input

    // Check if verification is enabled for this school
    const verificationEnabled = await this.isVerificationEnabled(schoolId)
    if (!verificationEnabled) {
      throw new Error('Contact verification is not enabled for this school')
    }

    // Get guardian info
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Get student info if provided
    let studentName = 'your linked student'
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { firstName: true, lastName: true },
      })
      if (student) {
        studentName = `${student.firstName} ${student.lastName}`
      }
    }

    // Invalidate any existing pending OTPs for this guardian and contact type
    await prisma.oTPVerification.updateMany({
      where: {
        guardianId,
        type,
        status: OTPVerificationStatus.PENDING,
      },
      data: {
        status: OTPVerificationStatus.EXPIRED,
      },
    })

    // Generate new OTP
    const otpCode = generateOTPCode()
    const expiresAt = calculateOTPExpiry()

    // Create OTP record
    const otpRecord = await prisma.oTPVerification.create({
      data: {
        guardianId,
        studentId,
        schoolId,
        type,
        contact,
        otpCode,
        status: OTPVerificationStatus.PENDING,
        expiresAt,
        maxAttempts: MAX_VERIFICATION_ATTEMPTS,
      },
    })

    // Send verification SMS
    // The message asks if they are the guardian and provides the OTP code
    const message = `SchoolOffice: Are you the guardian of ${studentName}? ` +
      `Reply with code ${otpCode} to confirm YES, or ignore to decline. ` +
      `Valid for ${OTP_VALIDITY_WEEKS} weeks.`

    if (type === OTPVerificationType.PHONE) {
      await smsGateway.sendSMS({
        to: contact,
        message,
      })
    }
    // For email verification, we would use email gateway (not implemented in this task)

    return mapPrismaOTPToDomain(otpRecord)
  }

  /**
   * Verify OTP code provided by guardian
   * Requirement 24.3: Mark contacts as verified on correct OTP
   */
  async verifyOTP(input: VerifyOTPInput): Promise<OTPVerificationResult> {
    const { guardianId, otpCode, type } = input

    // Find the pending OTP for this guardian
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        guardianId,
        type,
        status: OTPVerificationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return {
        success: false,
        verified: false,
        error: 'No pending verification found',
      }
    }

    // Check if OTP has expired
    if (isOTPExpired(otpRecord.expiresAt)) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { status: OTPVerificationStatus.EXPIRED },
      })

      return {
        success: false,
        verified: false,
        error: 'Verification code has expired',
      }
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { status: OTPVerificationStatus.FAILED },
      })

      return {
        success: false,
        verified: false,
        error: 'Maximum verification attempts exceeded',
      }
    }

    // Increment attempt count
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    })

    // Verify OTP code
    if (otpRecord.otpCode !== otpCode) {
      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts - 1

      return {
        success: false,
        verified: false,
        error: 'Invalid verification code',
        remainingAttempts,
      }
    }

    // OTP is correct - mark as verified
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: {
        status: OTPVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    })

    // Update guardian's contact verification status
    if (type === OTPVerificationType.PHONE) {
      await prisma.guardian.update({
        where: { id: guardianId },
        data: { phoneVerified: true },
      })
    } else if (type === OTPVerificationType.EMAIL) {
      await prisma.guardian.update({
        where: { id: guardianId },
        data: { emailVerified: true },
      })
    }

    return {
      success: true,
      verified: true,
    }
  }


  /**
   * Get pending verification for a guardian
   */
  async getPendingVerification(
    guardianId: string,
    type: OTPVerificationType
  ): Promise<OTPVerification | null> {
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        guardianId,
        type,
        status: OTPVerificationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) return null
    return mapPrismaOTPToDomain(otpRecord)
  }

  /**
   * Get verification history for a guardian
   */
  async getVerificationHistory(guardianId: string): Promise<OTPVerification[]> {
    const records = await prisma.oTPVerification.findMany({
      where: { guardianId },
      orderBy: { createdAt: 'desc' },
    })

    return records.map(mapPrismaOTPToDomain)
  }

  /**
   * Check if guardian has verified contact
   * Requirement 24.3: Check verification status
   */
  async hasVerifiedContact(guardianId: string): Promise<boolean> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: { phoneVerified: true, emailVerified: true },
    })

    if (!guardian) return false
    return guardian.phoneVerified || guardian.emailVerified
  }

  /**
   * Log warning for unverified contact when communication is sent
   * Requirement 24.5: Log warnings for unverified contacts
   */
  async logUnverifiedContactWarning(
    guardianId: string,
    schoolId: string,
    userId: string,
    contactType: OTPVerificationType,
    studentId?: string
  ): Promise<void> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) return

    const contact = contactType === OTPVerificationType.PHONE
      ? guardian.phone
      : guardian.email

    let studentName: string | undefined
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { firstName: true, lastName: true },
      })
      if (student) {
        studentName = `${student.firstName} ${student.lastName}`
      }
    }

    // Log to audit trail
    await auditService.logAction({
      schoolId,
      userId,
      action: 'UNVERIFIED_CONTACT_WARNING',
      resource: 'Guardian',
      resourceId: guardianId,
      newValue: {
        guardianId,
        guardianName: `${guardian.firstName} ${guardian.lastName}`,
        contact,
        contactType,
        studentId,
        studentName,
        timestamp: new Date().toISOString(),
        message: `Communication sent to unverified ${contactType.toLowerCase()}: ${contact}`,
      },
    })
  }

  /**
   * Get all unverified contacts for a school
   * Requirement 24.5: Admin can review unverified contacts
   */
  async getUnverifiedContacts(schoolId: string): Promise<UnverifiedContactWarning[]> {
    // Get all guardians linked to students in this school with unverified contacts
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
        OR: [
          { phoneVerified: false },
          { emailVerified: false, email: { not: null } },
        ],
      },
      include: {
        studentGuardians: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    const warnings: UnverifiedContactWarning[] = []

    for (const guardian of guardians) {
      // Add phone warning if unverified
      if (!guardian.phoneVerified) {
        for (const sg of guardian.studentGuardians) {
          warnings.push({
            guardianId: guardian.id,
            guardianName: `${guardian.firstName} ${guardian.lastName}`,
            contact: guardian.phone,
            contactType: OTPVerificationType.PHONE,
            studentId: sg.student.id,
            studentName: `${sg.student.firstName} ${sg.student.lastName}`,
            timestamp: guardian.createdAt,
          })
        }
      }

      // Add email warning if unverified and email exists
      if (guardian.email && !guardian.emailVerified) {
        for (const sg of guardian.studentGuardians) {
          warnings.push({
            guardianId: guardian.id,
            guardianName: `${guardian.firstName} ${guardian.lastName}`,
            contact: guardian.email,
            contactType: OTPVerificationType.EMAIL,
            studentId: sg.student.id,
            studentName: `${sg.student.firstName} ${sg.student.lastName}`,
            timestamp: guardian.createdAt,
          })
        }
      }
    }

    return warnings
  }


  /**
   * Resend OTP verification
   * Creates a new OTP and sends it to the guardian
   */
  async resendVerification(
    guardianId: string,
    type: OTPVerificationType,
    schoolId: string
  ): Promise<OTPVerification> {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    const contact = type === OTPVerificationType.PHONE
      ? guardian.phone
      : guardian.email

    if (!contact) {
      throw new Error(`Guardian does not have a ${type.toLowerCase()} to verify`)
    }

    return this.initiateVerification({
      guardianId,
      schoolId,
      type,
      contact,
    })
  }

  /**
   * Cancel pending verification
   */
  async cancelVerification(
    guardianId: string,
    type: OTPVerificationType
  ): Promise<void> {
    await prisma.oTPVerification.updateMany({
      where: {
        guardianId,
        type,
        status: OTPVerificationStatus.PENDING,
      },
      data: {
        status: OTPVerificationStatus.EXPIRED,
      },
    })
  }

  /**
   * Clean up expired OTP records
   * Should be run periodically as a maintenance task
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await prisma.oTPVerification.updateMany({
      where: {
        status: OTPVerificationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: OTPVerificationStatus.EXPIRED,
      },
    })

    return result.count
  }

  /**
   * Get verification statistics for a school
   */
  async getVerificationStats(schoolId: string): Promise<{
    totalGuardians: number
    verifiedPhone: number
    verifiedEmail: number
    unverifiedPhone: number
    unverifiedEmail: number
    pendingVerifications: number
  }> {
    // Count guardians linked to students in this school
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
      select: {
        phoneVerified: true,
        emailVerified: true,
        email: true,
      },
    })

    const pendingCount = await prisma.oTPVerification.count({
      where: {
        schoolId,
        status: OTPVerificationStatus.PENDING,
      },
    })

    let verifiedPhone = 0
    let verifiedEmail = 0
    let unverifiedPhone = 0
    let unverifiedEmail = 0

    for (const g of guardians) {
      if (g.phoneVerified) verifiedPhone++
      else unverifiedPhone++

      if (g.email) {
        if (g.emailVerified) verifiedEmail++
        else unverifiedEmail++
      }
    }

    return {
      totalGuardians: guardians.length,
      verifiedPhone,
      verifiedEmail,
      unverifiedPhone,
      unverifiedEmail,
      pendingVerifications: pendingCount,
    }
  }

  /**
   * Pure function to check if OTP is valid
   * Used for testing
   */
  isOTPValid(
    providedCode: string,
    storedCode: string,
    expiresAt: Date,
    attempts: number,
    maxAttempts: number
  ): { valid: boolean; reason?: string } {
    if (isOTPExpired(expiresAt)) {
      return { valid: false, reason: 'expired' }
    }

    if (attempts >= maxAttempts) {
      return { valid: false, reason: 'max_attempts_exceeded' }
    }

    if (providedCode !== storedCode) {
      return { valid: false, reason: 'invalid_code' }
    }

    return { valid: true }
  }
}

// Export singleton instance
export const otpVerificationService = new OTPVerificationService()
