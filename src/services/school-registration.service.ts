/**
 * School Registration Service
 * Handles school tenant registration with atomic transactions
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 8.5
 */
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { Role, LicenseType } from '@/types/enums'
import { FeatureFlags } from '@/types'
import { securityService } from './security.service'
import { getUserFriendlyError } from '@/lib/error-messages'

// ============================================
// TYPES
// ============================================

export type SchoolType = 'PRIMARY' | 'SECONDARY' | 'BOTH'
export type Ownership = 'PRIVATE' | 'GOVERNMENT'

export interface SchoolRegistrationInput {
  // Section 1: School Identity
  schoolName: string
  schoolType: SchoolType
  registrationNumber?: string
  ownership: Ownership
  country: string
  district?: string
  contactPhone?: string
  contactEmail: string
  physicalLocation?: string

  // Section 2: System Identity
  schoolCode: string // Immutable tenant identifier
  schoolLogo?: string // Optional school logo URL or base64 data

  // Section 3: First Admin Account
  adminFullName: string
  adminEmail: string
  adminPhone?: string
  adminPassword: string

  // Section 4: Legal & Control
  termsAccepted: boolean
  dataResponsibilityAcknowledged: boolean
}

export interface SchoolRegistrationResult {
  success: boolean
  schoolId?: string
  adminUserId?: string
  error?: string
  errorCode?: SchoolRegistrationErrorCode
}

export interface SchoolCodeValidationResult {
  isValid: boolean
  isAvailable: boolean
  normalizedCode: string
  error?: string
}

export type SchoolRegistrationErrorCode =
  | 'SCHOOL_CODE_TAKEN'
  | 'INVALID_SCHOOL_CODE_FORMAT'
  | 'MISSING_REQUIRED_FIELD'
  | 'TERMS_NOT_ACCEPTED'
  | 'REGISTRATION_FAILED'
  | 'INVALID_EMAIL_FORMAT'
  | 'PASSWORD_TOO_WEAK'

// ============================================
// CONSTANTS
// ============================================

// Default feature flags for new schools - SIMPLIFIED
const DEFAULT_FEATURES: FeatureFlags = {
  smsEnabled: true,
  emailEnabled: true,
  paymentIntegration: true,
}

// School code validation regex - alphanumeric only
const SCHOOL_CODE_REGEX = /^[A-Za-z0-9]+$/

// Minimum password length
const MIN_PASSWORD_LENGTH = 8

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ============================================
// SERVICE CLASS
// ============================================

export class SchoolRegistrationService {
  /**
   * Validates school code format and uniqueness
   * Returns real-time availability feedback
   * Requirements: 1.2, 8.5
   * 
   * Property 2: School Code Format Validation
   * Property 3: School Code Uniqueness
   * Property 33: School Code Normalization
   */
  async validateSchoolCode(code: string): Promise<SchoolCodeValidationResult> {
    // Normalize to uppercase before any validation
    // Requirement 8.5: Normalize School_Code to uppercase before storage and comparison
    const normalizedCode = code.toUpperCase().trim()

    // Check if code is empty
    if (!normalizedCode) {
      return {
        isValid: false,
        isAvailable: false,
        normalizedCode,
        error: 'School code is required',
      }
    }

    // Check minimum length (at least 3 characters)
    if (normalizedCode.length < 3) {
      return {
        isValid: false,
        isAvailable: false,
        normalizedCode,
        error: 'School code must be at least 3 characters',
      }
    }

    // Check maximum length (max 20 characters)
    if (normalizedCode.length > 20) {
      return {
        isValid: false,
        isAvailable: false,
        normalizedCode,
        error: 'School code must be at most 20 characters',
      }
    }

    // Property 2: School Code Format Validation
    // Requirement 1.2: Validate it contains only alphanumeric characters
    if (!SCHOOL_CODE_REGEX.test(normalizedCode)) {
      return {
        isValid: false,
        isAvailable: false,
        normalizedCode,
        error: 'School code must contain only letters and numbers',
      }
    }

    // Property 3: School Code Uniqueness
    // Requirement 1.2: Validate it is unique across all tenants
    const existingSchool = await prisma.school.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    })

    if (existingSchool) {
      return {
        isValid: true, // Format is valid
        isAvailable: false, // But not available
        normalizedCode,
        error: 'This school code is already in use',
      }
    }

    return {
      isValid: true,
      isAvailable: true,
      normalizedCode,
    }
  }

  /**
   * Validates required fields for registration
   * Requirement 1.1: Require School Name, School Type, School Code, Country, and Contact Email
   * Property 1: Registration Required Fields Validation
   */
  private validateRequiredFields(input: SchoolRegistrationInput): { valid: boolean; error?: string } {
    const requiredFields: { field: keyof SchoolRegistrationInput; name: string }[] = [
      { field: 'schoolName', name: 'School Name' },
      { field: 'schoolType', name: 'School Type' },
      { field: 'schoolCode', name: 'School Code' },
      { field: 'country', name: 'Country' },
      { field: 'contactEmail', name: 'Contact Email' },
      { field: 'adminFullName', name: 'Admin Full Name' },
      { field: 'adminEmail', name: 'Admin Email' },
      { field: 'adminPassword', name: 'Admin Password' },
    ]

    for (const { field, name } of requiredFields) {
      const value = input[field]
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        return { valid: false, error: `${name} is required` }
      }
    }

    return { valid: true }
  }

  /**
   * Validates email format
   */
  private validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email)
  }

  /**
   * Validates password strength using SecurityService
   * Requirements: 7.4
   */
  private validatePassword(password: string): { valid: boolean; error?: string } {
    const result = securityService.validatePasswordComplexity(password)
    if (!result.isValid) {
      return { valid: false, error: result.errors[0] || 'Password does not meet complexity requirements' }
    }
    return { valid: true }
  }

  /**
   * Registers a new school tenant atomically
   * Creates: School record, tenant data space, seed admin account
   * Rolls back all changes on any failure
   * 
   * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 8.5
   * Property 5: Registration Transaction Atomicity
   * Property 6: Seed Admin Role Lock
   * Property 7: Legal Acknowledgment Required
   */
  async registerSchool(input: SchoolRegistrationInput): Promise<SchoolRegistrationResult> {
    try {
      // Step 1: Validate required fields
      // Property 1: Registration Required Fields Validation
      const requiredFieldsValidation = this.validateRequiredFields(input)
      if (!requiredFieldsValidation.valid) {
        return {
          success: false,
          error: requiredFieldsValidation.error,
          errorCode: 'MISSING_REQUIRED_FIELD',
        }
      }

      // Step 2: Validate legal acknowledgments
      // Property 7: Legal Acknowledgment Required
      // Requirement 1.8: Collect legal acknowledgment before submission
      if (!input.termsAccepted) {
        return {
          success: false,
          error: 'You must accept the terms to continue',
          errorCode: 'TERMS_NOT_ACCEPTED',
        }
      }

      if (!input.dataResponsibilityAcknowledged) {
        return {
          success: false,
          error: 'You must acknowledge data responsibility to continue',
          errorCode: 'TERMS_NOT_ACCEPTED',
        }
      }

      // Step 3: Validate school code format and uniqueness
      // Property 2: School Code Format Validation
      // Property 3: School Code Uniqueness
      const codeValidation = await this.validateSchoolCode(input.schoolCode)
      if (!codeValidation.isValid) {
        return {
          success: false,
          error: codeValidation.error,
          errorCode: 'INVALID_SCHOOL_CODE_FORMAT',
        }
      }

      if (!codeValidation.isAvailable) {
        return {
          success: false,
          error: codeValidation.error,
          errorCode: 'SCHOOL_CODE_TAKEN',
        }
      }

      // Step 4: Validate email formats
      if (!this.validateEmail(input.contactEmail)) {
        return {
          success: false,
          error: 'Invalid contact email format',
          errorCode: 'INVALID_EMAIL_FORMAT',
        }
      }

      if (!this.validateEmail(input.adminEmail)) {
        return {
          success: false,
          error: 'Invalid admin email format',
          errorCode: 'INVALID_EMAIL_FORMAT',
        }
      }

      // Step 5: Validate password
      const passwordValidation = this.validatePassword(input.adminPassword)
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error,
          errorCode: 'PASSWORD_TOO_WEAK',
        }
      }

      // Step 6: Hash password before transaction
      const passwordHash = await hashPassword(input.adminPassword)

      // Step 7: Execute atomic transaction
      // Property 5: Registration Transaction Atomicity
      // Requirement 1.4: Create School record, isolated tenant data space, and seed School_Admin account atomically
      // Requirement 1.7: Rollback all changes on any failure
      const result = await prisma.$transaction(async (tx) => {
        // Create School record
        const school = await tx.school.create({
          data: {
            name: input.schoolName.trim(),
            code: codeValidation.normalizedCode, // Use normalized uppercase code
            schoolType: input.schoolType,
            registrationNumber: input.registrationNumber?.trim() || null,
            ownership: input.ownership,
            country: input.country.trim(),
            district: input.district?.trim() || null,
            address: input.physicalLocation?.trim() || null,
            phone: input.contactPhone?.trim() || null,
            email: input.contactEmail.trim().toLowerCase(),
            logo: input.schoolLogo?.trim() || null,
            licenseType: LicenseType.FREE_PILOT,
            features: DEFAULT_FEATURES,
            smsBudgetPerTerm: 0,
            isActive: true,
            termsAcceptedAt: new Date(),
            dataAcknowledgedAt: new Date(),
          },
        })

        // Parse admin name into first and last name
        const nameParts = input.adminFullName.trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''

        // Generate unique username based on actual names to avoid constraint violations
        const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, '')
        const schoolSuffix = school.id.slice(-6) // Last 6 chars of schoolId for uniqueness
        const username = `${baseUsername}.${schoolSuffix}`

        // Create seed School_Admin user
        // Property 6: Seed Admin Role Lock
        // Requirement 1.5: Lock the role to School_Admin and not allow role selection
        const adminUser = await tx.user.create({
          data: {
            schoolId: school.id,
            email: input.adminEmail.trim().toLowerCase(),
            phone: input.adminPhone?.trim() || null,
            username,
            passwordHash,
            role: Role.SCHOOL_ADMIN, // Locked to SCHOOL_ADMIN
            roles: [Role.SCHOOL_ADMIN], // Multi-role support with single role
            activeRole: Role.SCHOOL_ADMIN,
            isActive: true,
            failedAttempts: 0,
          },
        })

        // Create Staff record for the admin
        await tx.staff.create({
          data: {
            userId: adminUser.id,
            schoolId: school.id,
            employeeNumber: 'ADMIN-001',
            firstName,
            lastName,
            phone: input.adminPhone?.trim() || null,
            email: input.adminEmail.trim().toLowerCase(),
            role: Role.SCHOOL_ADMIN,
            status: 'ACTIVE',
          },
        })

        return {
          schoolId: school.id,
          adminUserId: adminUser.id,
        }
      })

      return {
        success: true,
        schoolId: result.schoolId,
        adminUserId: result.adminUserId,
      }
    } catch (error) {
      // Log error for debugging (in production, use proper logging)
      console.error('School registration failed:', error)

      // Convert technical errors to user-friendly messages
      const userError = getUserFriendlyError(error)
      
      // Map specific error codes to registration error codes
      let errorCode: SchoolRegistrationErrorCode = 'REGISTRATION_FAILED'
      
      if (userError.code === 'SCHOOL_CODE_EXISTS') {
        errorCode = 'SCHOOL_CODE_TAKEN'
      } else if (userError.code === 'EMAIL_EXISTS') {
        errorCode = 'INVALID_EMAIL_FORMAT'
      } else if (userError.code === 'WEAK_PASSWORD') {
        errorCode = 'PASSWORD_TOO_WEAK'
      } else if (userError.field === 'email') {
        errorCode = 'INVALID_EMAIL_FORMAT'
      }

      return {
        success: false,
        error: userError.message,
        errorCode,
      }
    }
  }

  /**
   * Check if a school code is available (simple check)
   * Used for real-time availability feedback
   * Requirement 8.1: Display real-time availability feedback
   */
  async isSchoolCodeAvailable(code: string): Promise<boolean> {
    const normalizedCode = code.toUpperCase().trim()
    
    if (!normalizedCode || !SCHOOL_CODE_REGEX.test(normalizedCode)) {
      return false
    }

    const existing = await prisma.school.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    })

    return !existing
  }

  /**
   * Get school by code (for login flow)
   * Returns null if school doesn't exist (without revealing existence)
   */
  async getSchoolByCode(code: string): Promise<{ id: string; name: string; isActive: boolean } | null> {
    const normalizedCode = code.toUpperCase().trim()

    const school = await prisma.school.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    return school
  }
}

// Export singleton instance
export const schoolRegistrationService = new SchoolRegistrationService()
