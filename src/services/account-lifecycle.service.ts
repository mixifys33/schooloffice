/**
 * Account Lifecycle Service
 * Handles user account lifecycle operations including password reset, suspension, reactivation, and deletion
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
 */
import { prisma } from '@/lib/db'
import { Role, AccountStatus, AuthEventType } from '@/types/enums'
import { randomBytes } from 'crypto'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Password reset token configuration
 */
const PASSWORD_RESET_CONFIG = {
  tokenLength: 32, // bytes
  expirationMs: 60 * 60 * 1000, // 1 hour
}

// ============================================
// TYPES
// ============================================

/**
 * Password reset initiation result
 * Requirements: 17.1, 17.2
 */
export interface PasswordResetResult {
  success: boolean
  error?: string
  // Token is returned for testing/development; in production, it would be sent via email/SMS
  token?: string
  expiresAt?: Date
}

/**
 * Account suspension result
 * Requirements: 17.3
 */
export interface AccountSuspensionResult {
  success: boolean
  error?: string
  sessionsInvalidated?: number
}

/**
 * Account reactivation result
 */
export interface AccountReactivationResult {
  success: boolean
  error?: string
}

/**
 * Soft delete result
 * Requirements: 17.4, 17.5
 */
export interface SoftDeleteResult {
  success: boolean
  error?: string
}

/**
 * Role revocation result
 * Requirements: 17.6
 */
export interface RoleRevocationResult {
  success: boolean
  error?: string
  remainingRoles?: Role[]
}

// ============================================
// ACCOUNT LIFECYCLE SERVICE CLASS
// ============================================

export class AccountLifecycleService {
  /**
   * Initiate password reset with school context verification
   * Requirements: 17.1, 17.2
   * 
   * @param schoolCode - The school code for context verification
   * @param identifier - Email, phone, or username of the user
   * @returns Password reset result with token (for development) or success status
   */
  async initiatePasswordReset(
    schoolCode: string,
    identifier: string
  ): Promise<PasswordResetResult> {
    const normalizedSchoolCode = schoolCode.trim().toUpperCase()
    const normalizedIdentifier = identifier.trim().toLowerCase()

    // Find the school by code
    const school = await prisma.school.findUnique({
      where: { code: normalizedSchoolCode },
      select: { id: true, isActive: true },
    })

    // Return generic error to prevent information leakage
    if (!school) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if school is active
    if (!school.isActive) {
      return {
        success: false,
        error: 'SCHOOL_SUSPENDED',
      }
    }

    // Find user by identifier within school context
    // Requirements: 17.1 - Verify school context before sending reset instructions
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: normalizedIdentifier },
          { phone: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
        status: AccountStatus.ACTIVE, // Only allow reset for active accounts
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    })

    // Return generic error to prevent information leakage
    if (!user) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Generate secure reset token
    const token = randomBytes(PASSWORD_RESET_CONFIG.tokenLength).toString('hex')
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CONFIG.expirationMs)

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    })

    // Create new password reset record
    // Requirements: 17.2 - Send reset link only to verified contact method
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        token,
        expiresAt,
      },
    })

    // Log the password reset initiation
    await this.logAuthEvent({
      userId: user.id,
      schoolId: school.id,
      eventType: AuthEventType.PASSWORD_CHANGE,
      identifier: normalizedIdentifier,
      success: true,
      metadata: { action: 'reset_initiated' },
    })

    // In production, this would send an email/SMS with the reset link
    // For now, return the token for testing purposes
    return {
      success: true,
      token,
      expiresAt,
    }
  }

  /**
   * Suspend a user account and invalidate all active sessions
   * Requirements: 17.3, 17.4
   * 
   * @param userId - The ID of the user to suspend
   * @param reason - The reason for suspension
   * @param suspendedBy - The ID of the admin performing the suspension
   * @returns Suspension result
   */
  async suspendAccount(
    userId: string,
    reason: string,
    suspendedBy: string
  ): Promise<AccountSuspensionResult> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        status: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
      }
    }

    // Check if already suspended
    if (user.status === AccountStatus.SUSPENDED) {
      return {
        success: false,
        error: 'ALREADY_SUSPENDED',
      }
    }

    // Check if deleted
    if (user.status === AccountStatus.DELETED) {
      return {
        success: false,
        error: 'ACCOUNT_DELETED',
      }
    }

    // Update user status to suspended
    // Requirements: 17.3 - Immediately invalidate all active sessions
    // Requirements: 17.4 - Preserve all historical data and audit trails
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy,
        suspendReason: reason,
        isActive: false, // This effectively invalidates sessions
      },
    })

    // Log the suspension event
    await this.logAuthEvent({
      userId,
      schoolId: user.schoolId ?? undefined,
      eventType: AuthEventType.SUSPICIOUS_ACTIVITY, // Using this as closest match for suspension
      identifier: user.email,
      success: true,
      metadata: {
        action: 'account_suspended',
        reason,
        suspendedBy,
      },
    })

    // Log to audit trail for compliance
    if (user.schoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          userId: suspendedBy,
          action: 'account_suspended',
          resource: 'user',
          resourceId: userId,
          previousValue: { status: user.status },
          newValue: { status: AccountStatus.SUSPENDED, reason },
          timestamp: new Date(),
        },
      })
    }

    return {
      success: true,
      sessionsInvalidated: 1, // Sessions are invalidated by setting isActive to false
    }
  }

  /**
   * Reactivate a suspended user account
   * 
   * @param userId - The ID of the user to reactivate
   * @param reactivatedBy - The ID of the admin performing the reactivation
   * @returns Reactivation result
   */
  async reactivateAccount(
    userId: string,
    reactivatedBy: string
  ): Promise<AccountReactivationResult> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        status: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
      }
    }

    // Check if not suspended
    if (user.status !== AccountStatus.SUSPENDED) {
      return {
        success: false,
        error: user.status === AccountStatus.DELETED ? 'ACCOUNT_DELETED' : 'NOT_SUSPENDED',
      }
    }

    // Update user status to active
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
        isActive: true,
      },
    })

    // Log the reactivation event
    await this.logAuthEvent({
      userId,
      schoolId: user.schoolId ?? undefined,
      eventType: AuthEventType.ACCOUNT_UNLOCKED,
      identifier: user.email,
      success: true,
      metadata: {
        action: 'account_reactivated',
        reactivatedBy,
      },
    })

    // Log to audit trail for compliance
    if (user.schoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          userId: reactivatedBy,
          action: 'account_reactivated',
          resource: 'user',
          resourceId: userId,
          previousValue: { status: AccountStatus.SUSPENDED },
          newValue: { status: AccountStatus.ACTIVE },
          timestamp: new Date(),
        },
      })
    }

    return {
      success: true,
    }
  }

  /**
   * Soft delete a user while preserving historical data
   * Requirements: 17.5, 17.7
   * 
   * @param userId - The ID of the user to delete
   * @param deletedBy - The ID of the admin performing the deletion
   * @returns Soft delete result
   */
  async softDeleteUser(
    userId: string,
    deletedBy: string
  ): Promise<SoftDeleteResult> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        status: true,
        role: true,
        roles: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
      }
    }

    // Check if already deleted
    if (user.status === AccountStatus.DELETED) {
      return {
        success: false,
        error: 'ALREADY_DELETED',
      }
    }

    // Soft delete - preserve all historical data
    // Requirements: 17.5 - Perform soft deletion retaining historical records
    // Requirements: 17.7 - Retain historical data for minimum 7 years
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.DELETED,
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
    })

    // Log the deletion event
    await this.logAuthEvent({
      userId,
      schoolId: user.schoolId ?? undefined,
      eventType: AuthEventType.SUSPICIOUS_ACTIVITY, // Using as closest match
      identifier: user.email,
      success: true,
      metadata: {
        action: 'account_deleted',
        deletedBy,
      },
    })

    // Log to audit trail for compliance
    if (user.schoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          userId: deletedBy,
          action: 'account_deleted',
          resource: 'user',
          resourceId: userId,
          previousValue: { status: user.status, role: user.role, roles: user.roles },
          newValue: { status: AccountStatus.DELETED },
          timestamp: new Date(),
        },
      })
    }

    return {
      success: true,
    }
  }

  /**
   * Revoke a role from a user while preserving data created in that role
   * Requirements: 17.6
   * 
   * @param userId - The ID of the user
   * @param role - The role to revoke
   * @param revokedBy - The ID of the admin performing the revocation
   * @returns Role revocation result
   */
  async revokeRole(
    userId: string,
    role: Role,
    revokedBy: string
  ): Promise<RoleRevocationResult> {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        role: true,
        roles: true,
        activeRole: true,
        status: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
      }
    }

    // Check if account is active
    if (user.status !== AccountStatus.ACTIVE) {
      return {
        success: false,
        error: 'ACCOUNT_NOT_ACTIVE',
      }
    }

    // Get current roles
    const currentRoles = (user.roles && user.roles.length > 0)
      ? user.roles as Role[]
      : [user.role as Role]

    // Check if user has the role
    if (!currentRoles.includes(role)) {
      return {
        success: false,
        error: 'ROLE_NOT_ASSIGNED',
      }
    }

    // Cannot revoke the last role
    if (currentRoles.length === 1) {
      return {
        success: false,
        error: 'CANNOT_REVOKE_LAST_ROLE',
      }
    }

    // Remove the role from the roles array
    const newRoles = currentRoles.filter(r => r !== role)

    // Determine new active role if the revoked role was active
    let newActiveRole = user.activeRole as Role | null
    if (newActiveRole === role) {
      newActiveRole = newRoles[0]
    }

    // Determine new primary role if the revoked role was primary
    let newPrimaryRole = user.role as Role
    if (newPrimaryRole === role) {
      newPrimaryRole = newRoles[0]
    }

    // Update user roles
    // Requirements: 17.6 - Preserve all data created by that user in that role
    // Note: We only update the roles array, not the data created by the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        roles: newRoles,
        role: newPrimaryRole,
        activeRole: newActiveRole,
      },
    })

    // Log the role revocation event
    await this.logAuthEvent({
      userId,
      schoolId: user.schoolId ?? undefined,
      eventType: AuthEventType.ROLE_SWITCH,
      identifier: user.email,
      success: true,
      metadata: {
        action: 'role_revoked',
        revokedRole: role,
        revokedBy,
        remainingRoles: newRoles,
      },
    })

    // Log to audit trail for compliance
    if (user.schoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: user.schoolId,
          userId: revokedBy,
          action: 'role_revoked',
          resource: 'user',
          resourceId: userId,
          previousValue: { roles: currentRoles, activeRole: user.activeRole },
          newValue: { roles: newRoles, activeRole: newActiveRole, revokedRole: role },
          timestamp: new Date(),
        },
      })
    }

    return {
      success: true,
      remainingRoles: newRoles,
    }
  }

  /**
   * Validate a password reset token
   * 
   * @param token - The reset token to validate
   * @returns Validation result with user info if valid
   */
  async validatePasswordResetToken(token: string): Promise<{
    valid: boolean
    userId?: string
    schoolId?: string
    error?: string
  }> {
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        schoolId: true,
        expiresAt: true,
        usedAt: true,
      },
    })

    if (!resetRecord) {
      return {
        valid: false,
        error: 'INVALID_TOKEN',
      }
    }

    if (resetRecord.usedAt) {
      return {
        valid: false,
        error: 'TOKEN_ALREADY_USED',
      }
    }

    if (resetRecord.expiresAt < new Date()) {
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
      }
    }

    return {
      valid: true,
      userId: resetRecord.userId,
      schoolId: resetRecord.schoolId,
    }
  }

  /**
   * Complete password reset using a valid token
   * 
   * @param token - The reset token
   * @param newPasswordHash - The new password hash
   * @returns Result of the password reset
   */
  async completePasswordReset(
    token: string,
    newPasswordHash: string
  ): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validatePasswordResetToken(token)

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: validation.userId },
        data: {
          passwordHash: newPasswordHash,
          failedAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ])

    // Log the password change
    await this.logAuthEvent({
      userId: validation.userId,
      schoolId: validation.schoolId,
      eventType: AuthEventType.PASSWORD_CHANGE,
      identifier: validation.userId!,
      success: true,
      metadata: { action: 'reset_completed' },
    })

    return { success: true }
  }

  /**
   * Log authentication event for audit
   * Private helper method
   */
  private async logAuthEvent(event: {
    userId?: string
    schoolId?: string
    eventType: AuthEventType
    identifier: string
    success: boolean
    errorCode?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await prisma.authAuditLog.create({
        data: {
          userId: event.userId,
          schoolId: event.schoolId,
          eventType: event.eventType,
          identifier: event.identifier,
          ipAddress: 'system', // System-initiated events
          success: event.success,
          errorCode: event.errorCode,
          metadata: event.metadata,
        },
      })
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to log auth event:', error)
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const accountLifecycleService = new AccountLifecycleService()
