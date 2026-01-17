/**
 * Guardian Portal Access Service
 * Handles guardian portal access management, session control, and password reset
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import {
  GuardianPortalAccess,
  CreateGuardianPortalAccessInput,
  UpdateGuardianPortalAccessInput,
  GuardianPasswordResetResult,
} from '@/types'
import { randomBytes } from 'crypto'

// ============================================
// CONSTANTS
// ============================================

/**
 * Password reset token expiry time in hours
 */
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24

/**
 * Minimum password length for guardian portal
 */
const MIN_PASSWORD_LENGTH = 8

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma GuardianPortalAccess to domain type
 */
function mapPrismaPortalAccessToDomain(prismaAccess: {
  id: string
  guardianId: string
  isEnabled: boolean
  canViewAttendance: boolean
  canViewResults: boolean
  canViewFees: boolean
  canDownloadReports: boolean
  passwordHash: string | null
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}): GuardianPortalAccess {
  return {
    id: prismaAccess.id,
    guardianId: prismaAccess.guardianId,
    isEnabled: prismaAccess.isEnabled,
    canViewAttendance: prismaAccess.canViewAttendance,
    canViewResults: prismaAccess.canViewResults,
    canViewFees: prismaAccess.canViewFees,
    canDownloadReports: prismaAccess.canDownloadReports,
    passwordHash: prismaAccess.passwordHash ?? undefined,
    lastLogin: prismaAccess.lastLogin ?? undefined,
    createdAt: prismaAccess.createdAt,
    updatedAt: prismaAccess.updatedAt,
  }
}

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate password meets minimum requirements
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    }
  }
  return { valid: true }
}

// ============================================
// GUARDIAN PORTAL ACCESS SERVICE CLASS
// ============================================

export class GuardianPortalAccessService {
  /**
   * Get portal access configuration for a guardian
   * Requirement 5.1: Enable/disable portal access per guardian
   * Requirement 5.2: Configure visible modules
   */
  async getPortalAccess(guardianId: string): Promise<GuardianPortalAccess | null> {
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
    })

    if (!portalAccess) {
      return null
    }

    return mapPrismaPortalAccessToDomain(portalAccess)
  }

  /**
   * Create portal access for a guardian
   * Requirement 5.1: Enable/disable portal access per guardian
   */
  async createPortalAccess(input: CreateGuardianPortalAccessInput): Promise<GuardianPortalAccess> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: input.guardianId },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${input.guardianId} not found`)
    }

    // Check if portal access already exists
    const existingAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId: input.guardianId },
    })

    if (existingAccess) {
      throw new Error('Portal access already exists for this guardian')
    }

    // Hash password if provided
    let passwordHash: string | undefined
    if (input.password) {
      const validation = validatePassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      passwordHash = await hashPassword(input.password)
    }

    const portalAccess = await prisma.guardianPortalAccess.create({
      data: {
        guardianId: input.guardianId,
        isEnabled: input.isEnabled ?? false,
        canViewAttendance: input.canViewAttendance ?? true,
        canViewResults: input.canViewResults ?? true,
        canViewFees: input.canViewFees ?? true,
        canDownloadReports: input.canDownloadReports ?? false,
        passwordHash,
      },
    })

    return mapPrismaPortalAccessToDomain(portalAccess)
  }

  /**
   * Update portal access configuration for a guardian
   * Requirement 5.1: Enable/disable portal access per guardian
   * Requirement 5.2: Configure visible modules
   * Requirement 5.4: Revoke session when portal access is disabled
   */
  async updatePortalAccess(
    guardianId: string,
    input: UpdateGuardianPortalAccessInput,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianPortalAccess> {
    // Get existing portal access
    const existingAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
    })

    if (!existingAccess) {
      throw new Error(`Portal access not found for guardian ${guardianId}`)
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (input.isEnabled !== undefined) {
      updateData.isEnabled = input.isEnabled
    }
    if (input.canViewAttendance !== undefined) {
      updateData.canViewAttendance = input.canViewAttendance
    }
    if (input.canViewResults !== undefined) {
      updateData.canViewResults = input.canViewResults
    }
    if (input.canViewFees !== undefined) {
      updateData.canViewFees = input.canViewFees
    }
    if (input.canDownloadReports !== undefined) {
      updateData.canDownloadReports = input.canDownloadReports
    }

    // Hash new password if provided
    if (input.password) {
      const validation = validatePassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      updateData.passwordHash = await hashPassword(input.password)
    }

    // Update portal access
    const updatedAccess = await prisma.guardianPortalAccess.update({
      where: { guardianId },
      data: updateData,
    })

    // Requirement 5.5: Log portal access configuration changes
    await this.logPortalAccessChange(
      guardianId,
      existingAccess,
      updatedAccess,
      performedBy,
      ipAddress
    )

    // Requirement 5.4: Revoke sessions if portal access is disabled
    if (input.isEnabled === false && existingAccess.isEnabled === true) {
      await this.revokeAllSessions(guardianId)
    }

    return mapPrismaPortalAccessToDomain(updatedAccess)
  }

  /**
   * Get or create portal access for a guardian
   * Creates default portal access if it doesn't exist
   */
  async getOrCreatePortalAccess(guardianId: string): Promise<GuardianPortalAccess> {
    const existingAccess = await this.getPortalAccess(guardianId)
    
    if (existingAccess) {
      return existingAccess
    }

    return this.createPortalAccess({ guardianId })
  }

  /**
   * Check if guardian has portal access enabled
   * Requirement 5.1: Enable/disable portal access per guardian
   */
  async isPortalAccessEnabled(guardianId: string): Promise<boolean> {
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
      select: { isEnabled: true },
    })

    return portalAccess?.isEnabled ?? false
  }

  /**
   * Enable portal access for a guardian
   * Requirement 5.1: Enable/disable portal access per guardian
   */
  async enablePortalAccess(
    guardianId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianPortalAccess> {
    return this.updatePortalAccess(guardianId, { isEnabled: true }, performedBy, ipAddress)
  }

  /**
   * Disable portal access for a guardian
   * Requirement 5.1: Enable/disable portal access per guardian
   * Requirement 5.4: Revoke session when portal access is disabled
   */
  async disablePortalAccess(
    guardianId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianPortalAccess> {
    return this.updatePortalAccess(guardianId, { isEnabled: false }, performedBy, ipAddress)
  }

  /**
   * Revoke all sessions for a guardian
   * Requirement 5.4: Immediately revoke session when portal access is disabled
   */
  async revokeAllSessions(guardianId: string): Promise<void> {
    // In a real implementation, this would invalidate JWT tokens or session records
    // For now, we'll update the lastLogin to null to indicate session invalidation
    // and any session validation should check if portal access is enabled
    
    await prisma.guardianPortalAccess.update({
      where: { guardianId },
      data: { lastLogin: null },
    })

    // If using a session store, we would delete all sessions here
    // await prisma.guardianPortalSession.deleteMany({ where: { guardianId } })
  }

  /**
   * Log portal access configuration changes
   * Requirement 5.5: Log all portal access configuration changes
   */
  private async logPortalAccessChange(
    guardianId: string,
    previousAccess: {
      isEnabled: boolean
      canViewAttendance: boolean
      canViewResults: boolean
      canViewFees: boolean
      canDownloadReports: boolean
    },
    newAccess: {
      isEnabled: boolean
      canViewAttendance: boolean
      canViewResults: boolean
      canViewFees: boolean
      canDownloadReports: boolean
    },
    performedBy: string,
    ipAddress?: string
  ): Promise<void> {
    const changes: { field: string; previousValue: string; newValue: string }[] = []

    if (previousAccess.isEnabled !== newAccess.isEnabled) {
      changes.push({
        field: 'isEnabled',
        previousValue: String(previousAccess.isEnabled),
        newValue: String(newAccess.isEnabled),
      })
    }
    if (previousAccess.canViewAttendance !== newAccess.canViewAttendance) {
      changes.push({
        field: 'canViewAttendance',
        previousValue: String(previousAccess.canViewAttendance),
        newValue: String(newAccess.canViewAttendance),
      })
    }
    if (previousAccess.canViewResults !== newAccess.canViewResults) {
      changes.push({
        field: 'canViewResults',
        previousValue: String(previousAccess.canViewResults),
        newValue: String(newAccess.canViewResults),
      })
    }
    if (previousAccess.canViewFees !== newAccess.canViewFees) {
      changes.push({
        field: 'canViewFees',
        previousValue: String(previousAccess.canViewFees),
        newValue: String(newAccess.canViewFees),
      })
    }
    if (previousAccess.canDownloadReports !== newAccess.canDownloadReports) {
      changes.push({
        field: 'canDownloadReports',
        previousValue: String(previousAccess.canDownloadReports),
        newValue: String(newAccess.canDownloadReports),
      })
    }

    // Create audit log entries for each change
    for (const change of changes) {
      await prisma.guardianAuditLog.create({
        data: {
          guardianId,
          action: 'PORTAL_ACCESS_UPDATE',
          field: change.field,
          previousValue: change.previousValue,
          newValue: change.newValue,
          performedBy,
          ipAddress,
        },
      })
    }
  }

  // ============================================
  // PASSWORD RESET FUNCTIONALITY
  // Requirement 5.3: Password reset functionality
  // ============================================

  /**
   * Request password reset for guardian portal
   * Requirement 5.3: Password reset functionality
   */
  async requestPasswordReset(guardianId: string): Promise<GuardianPasswordResetResult> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: {
        id: true,
        phone: true,
        email: true,
        preferredChannel: true,
      },
    })

    if (!guardian) {
      return {
        success: false,
        error: 'Guardian not found',
      }
    }

    // Check if portal access exists
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
    })

    if (!portalAccess) {
      return {
        success: false,
        error: 'Portal access not configured for this guardian',
      }
    }

    // Generate reset token
    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    // Store reset token in secure links table (reusing existing infrastructure)
    await prisma.secureLink.create({
      data: {
        token,
        guardianId,
        resourceType: 'PASSWORD_RESET',
        resourceId: portalAccess.id,
        expiresAt,
      },
    })

    // In a real implementation, we would send the reset link via SMS/Email
    // For now, we return success and the token would be sent via the messaging service
    const resetLink = `/portal/reset-password?token=${token}`

    return {
      success: true,
      message: `Password reset link generated. Link: ${resetLink}`,
    }
  }

  /**
   * Validate password reset token
   * Requirement 5.3: Password reset functionality
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; guardianId?: string; error?: string }> {
    const secureLink = await prisma.secureLink.findUnique({
      where: { token },
    })

    if (!secureLink) {
      return { valid: false, error: 'Invalid reset token' }
    }

    if (secureLink.resourceType !== 'PASSWORD_RESET') {
      return { valid: false, error: 'Invalid reset token' }
    }

    if (secureLink.expiresAt < new Date()) {
      return { valid: false, error: 'Reset token has expired' }
    }

    if (secureLink.accessedAt) {
      return { valid: false, error: 'Reset token has already been used' }
    }

    return { valid: true, guardianId: secureLink.guardianId }
  }

  /**
   * Reset password using token
   * Requirement 5.3: Password reset functionality
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<GuardianPasswordResetResult> {
    // Validate token
    const validation = await this.validateResetToken(token)
    if (!validation.valid || !validation.guardianId) {
      return {
        success: false,
        error: validation.error || 'Invalid reset token',
      }
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.error,
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password
    await prisma.guardianPortalAccess.update({
      where: { guardianId: validation.guardianId },
      data: { passwordHash },
    })

    // Mark token as used
    await prisma.secureLink.update({
      where: { token },
      data: {
        accessedAt: new Date(),
        accessIp: ipAddress,
      },
    })

    // Log password reset
    await prisma.guardianAuditLog.create({
      data: {
        guardianId: validation.guardianId,
        action: 'PASSWORD_RESET',
        field: 'passwordHash',
        previousValue: '[REDACTED]',
        newValue: '[REDACTED]',
        performedBy: validation.guardianId, // Self-service reset
        ipAddress,
      },
    })

    return {
      success: true,
      message: 'Password has been reset successfully',
    }
  }

  /**
   * Set password for guardian portal (admin action)
   * Requirement 5.3: Password reset functionality
   */
  async setPassword(
    guardianId: string,
    newPassword: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<GuardianPasswordResetResult> {
    // Validate guardian exists
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
    })

    if (!portalAccess) {
      return {
        success: false,
        error: 'Portal access not configured for this guardian',
      }
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.error,
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password
    await prisma.guardianPortalAccess.update({
      where: { guardianId },
      data: { passwordHash },
    })

    // Log password change
    await prisma.guardianAuditLog.create({
      data: {
        guardianId,
        action: 'PASSWORD_SET',
        field: 'passwordHash',
        previousValue: '[REDACTED]',
        newValue: '[REDACTED]',
        performedBy,
        ipAddress,
      },
    })

    return {
      success: true,
      message: 'Password has been set successfully',
    }
  }

  /**
   * Verify guardian portal password
   */
  async verifyPassword(guardianId: string, password: string): Promise<boolean> {
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
      select: { passwordHash: true, isEnabled: true },
    })

    if (!portalAccess || !portalAccess.isEnabled || !portalAccess.passwordHash) {
      return false
    }

    return verifyPassword(password, portalAccess.passwordHash)
  }

  /**
   * Record successful login
   */
  async recordLogin(guardianId: string): Promise<void> {
    await prisma.guardianPortalAccess.update({
      where: { guardianId },
      data: { lastLogin: new Date() },
    })
  }

  /**
   * Check if guardian can access a specific module
   * Requirement 5.2: Configure visible modules
   */
  async canAccessModule(
    guardianId: string,
    module: 'attendance' | 'results' | 'fees' | 'reports'
  ): Promise<boolean> {
    const portalAccess = await prisma.guardianPortalAccess.findUnique({
      where: { guardianId },
      select: {
        isEnabled: true,
        canViewAttendance: true,
        canViewResults: true,
        canViewFees: true,
        canDownloadReports: true,
      },
    })

    if (!portalAccess || !portalAccess.isEnabled) {
      return false
    }

    switch (module) {
      case 'attendance':
        return portalAccess.canViewAttendance
      case 'results':
        return portalAccess.canViewResults
      case 'fees':
        return portalAccess.canViewFees
      case 'reports':
        return portalAccess.canDownloadReports
      default:
        return false
    }
  }

  /**
   * Get all guardians with portal access for a school
   */
  async getGuardiansWithPortalAccess(schoolId: string): Promise<{
    guardianId: string
    guardianName: string
    isEnabled: boolean
    lastLogin?: Date
  }[]> {
    const guardians = await prisma.guardian.findMany({
      where: {
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
        portalAccess: {
          isNot: null,
        },
      },
      include: {
        portalAccess: {
          select: {
            isEnabled: true,
            lastLogin: true,
          },
        },
      },
    })

    return guardians.map(g => ({
      guardianId: g.id,
      guardianName: `${g.firstName} ${g.lastName}`,
      isEnabled: g.portalAccess?.isEnabled ?? false,
      lastLogin: g.portalAccess?.lastLogin ?? undefined,
    }))
  }
}

// Export singleton instance
export const guardianPortalAccessService = new GuardianPortalAccessService()
