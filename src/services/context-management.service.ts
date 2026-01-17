/**
 * Context Management Service
 * Handles session context management for multi-tenant authentication
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.6
 */
import { prisma } from '@/lib/db'
import { Role, LicenseType, AuthEventType } from '@/types/enums'
import { getPermissionsForRole } from '@/lib/rbac'
import { Permission } from '@/types/services'

// ============================================
// TYPES
// ============================================

/**
 * Session context containing school and role information
 * Requirements: 18.1, 18.4, 18.5
 */
export interface SessionContext {
  userId: string
  schoolId: string
  schoolCode: string
  schoolName: string
  activeRole: Role
  permissions: Permission[]
  termId?: string
  academicYear?: string
  licenseType?: LicenseType
  lastValidated?: Date
}

/**
 * Context validation result
 * Requirements: 18.6
 */
export interface ContextValidationResult {
  valid: boolean
  reason?: string
  shouldRedirectToLogin?: boolean
}

/**
 * Context invalidation reasons
 * Requirements: 18.6
 */
export type ContextInvalidationReason =
  | 'SCHOOL_SUSPENDED'
  | 'ROLE_REVOKED'
  | 'SESSION_EXPIRED'
  | 'MANUAL_LOGOUT'
  | 'SECURITY_CONCERN'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_DELETED'

// ============================================
// IN-MEMORY CONTEXT STORE
// In production, this would be Redis or similar
// ============================================

const contextStore = new Map<string, SessionContext>()

// ============================================
// CONTEXT MANAGEMENT SERVICE CLASS
// ============================================

export class ContextManagementService {
  /**
   * Get the current session context
   * Requirements: 18.4 - Persist context across page refreshes
   */
  async getContext(sessionId: string): Promise<SessionContext | null> {
    // First check in-memory store
    const cachedContext = contextStore.get(sessionId)
    if (cachedContext) {
      return cachedContext
    }

    // If not in cache, return null (context needs to be set after login)
    return null
  }

  /**
   * Set the active school context
   * Requirements: 18.1 - Only one active school context per session
   * Requirements: 18.3 - Require re-auth for different school
   */
  async setSchoolContext(
    sessionId: string,
    schoolId: string,
    userId: string
  ): Promise<SessionContext> {
    // Get existing context
    const existingContext = contextStore.get(sessionId)

    // If there's an existing context with a different school, require re-auth
    // Requirements: 18.3
    if (existingContext && existingContext.schoolId !== schoolId) {
      throw new Error('SCHOOL_SWITCH_REQUIRES_REAUTH')
    }

    // Fetch school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        licenseType: true,
      },
    })

    if (!school) {
      throw new Error('SCHOOL_NOT_FOUND')
    }

    // Check if school is suspended
    // Requirements: 18.6 - Context becomes invalid if school suspended
    if (!school.isActive) {
      throw new Error('SCHOOL_SUSPENDED')
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        roles: true,
        activeRole: true,
        isActive: true,
        status: true,
      },
    })

    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }

    // Validate user belongs to this school
    if (user.schoolId !== schoolId) {
      throw new Error('USER_SCHOOL_MISMATCH')
    }

    // Check user status
    if (!user.isActive || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new Error('USER_INACTIVE')
    }

    // Get active role
    const roles = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]
    const activeRole = (user.activeRole as Role) || roles[0]

    // Get permissions for the active role
    const permissions = getPermissionsForRole(activeRole)

    // Get current term and academic year
    const currentTerm = await this.getCurrentTermInfo(schoolId)

    // Create session context
    const context: SessionContext = {
      userId,
      schoolId: school.id,
      schoolCode: school.code,
      schoolName: school.name,
      activeRole,
      permissions,
      termId: currentTerm?.termId,
      academicYear: currentTerm?.academicYear,
      licenseType: school.licenseType as LicenseType,
      lastValidated: new Date(),
    }

    // Store in cache
    contextStore.set(sessionId, context)

    return context
  }

  /**
   * Switch role within current school context
   * Requirements: 18.2 - Role switch maintains school context
   */
  async switchRoleContext(
    sessionId: string,
    newRole: Role
  ): Promise<SessionContext> {
    const existingContext = contextStore.get(sessionId)

    if (!existingContext) {
      throw new Error('NO_ACTIVE_CONTEXT')
    }

    // Validate user has the new role
    const user = await prisma.user.findUnique({
      where: { id: existingContext.userId },
      select: {
        id: true,
        role: true,
        roles: true,
        isActive: true,
        status: true,
      },
    })

    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }

    // Check user status
    if (!user.isActive || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new Error('USER_INACTIVE')
    }

    // Get user roles
    const roles = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]

    // Validate user has the claimed role
    // Requirements: 18.2 - Cannot switch to unassigned role
    if (!roles.includes(newRole)) {
      throw new Error('ROLE_NOT_ASSIGNED')
    }

    // Update active role in database
    await prisma.user.update({
      where: { id: existingContext.userId },
      data: { activeRole: newRole },
    })

    // Get permissions for the new role
    const permissions = getPermissionsForRole(newRole)

    // Update context - school context is preserved
    // Requirements: 18.2 - Role switch preserves school context
    const updatedContext: SessionContext = {
      ...existingContext,
      activeRole: newRole,
      permissions,
      lastValidated: new Date(),
    }

    // Update cache
    contextStore.set(sessionId, updatedContext)

    // Log role switch event
    await this.logContextEvent(
      existingContext.userId,
      existingContext.schoolId,
      AuthEventType.ROLE_SWITCH,
      { previousRole: existingContext.activeRole, newRole }
    )

    return updatedContext
  }

  /**
   * Validate context is still valid
   * Requirements: 18.6 - Check school/role validity
   */
  async validateContext(sessionId: string): Promise<ContextValidationResult> {
    const context = contextStore.get(sessionId)

    if (!context) {
      return {
        valid: false,
        reason: 'No active session context',
        shouldRedirectToLogin: true,
      }
    }

    // Check if school is still active
    const school = await prisma.school.findUnique({
      where: { id: context.schoolId },
      select: { isActive: true },
    })

    if (!school) {
      return {
        valid: false,
        reason: 'School not found',
        shouldRedirectToLogin: true,
      }
    }

    if (!school.isActive) {
      // Invalidate context
      await this.invalidateContext(sessionId, 'SCHOOL_SUSPENDED')
      return {
        valid: false,
        reason: 'School has been suspended. Please contact support.',
        shouldRedirectToLogin: true,
      }
    }

    // Check if user is still active and has the role
    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        isActive: true,
        status: true,
        role: true,
        roles: true,
      },
    })

    if (!user) {
      return {
        valid: false,
        reason: 'User not found',
        shouldRedirectToLogin: true,
      }
    }

    if (!user.isActive) {
      await this.invalidateContext(sessionId, 'ACCOUNT_SUSPENDED')
      return {
        valid: false,
        reason: 'Your account has been deactivated. Please contact your administrator.',
        shouldRedirectToLogin: true,
      }
    }

    if (user.status === 'SUSPENDED') {
      await this.invalidateContext(sessionId, 'ACCOUNT_SUSPENDED')
      return {
        valid: false,
        reason: 'Your account has been suspended. Please contact your administrator.',
        shouldRedirectToLogin: true,
      }
    }

    if (user.status === 'DELETED') {
      await this.invalidateContext(sessionId, 'ACCOUNT_DELETED')
      return {
        valid: false,
        reason: 'Your account is no longer active.',
        shouldRedirectToLogin: true,
      }
    }

    // Check if user still has the active role
    const roles = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]

    if (!roles.includes(context.activeRole)) {
      await this.invalidateContext(sessionId, 'ROLE_REVOKED')
      return {
        valid: false,
        reason: 'Your role has been changed. Please log in again.',
        shouldRedirectToLogin: true,
      }
    }

    // Update last validated timestamp
    context.lastValidated = new Date()
    contextStore.set(sessionId, context)

    return { valid: true }
  }

  /**
   * Invalidate context and force re-authentication
   * Requirements: 18.6 - Redirect to login with appropriate message
   */
  async invalidateContext(
    sessionId: string,
    reason: ContextInvalidationReason
  ): Promise<void> {
    const context = contextStore.get(sessionId)

    if (context) {
      // Log the invalidation event
      await this.logContextEvent(
        context.userId,
        context.schoolId,
        AuthEventType.LOGOUT,
        { reason, forced: true }
      )
    }

    // Remove from cache
    contextStore.delete(sessionId)
  }

  /**
   * Initialize context after successful login
   * Called by authentication flow to set up initial context
   */
  async initializeContext(
    sessionId: string,
    userId: string,
    schoolId: string | null,
    activeRole: Role
  ): Promise<SessionContext | null> {
    // Super Admin has no school context
    if (!schoolId) {
      const superAdminContext: SessionContext = {
        userId,
        schoolId: '',
        schoolCode: '',
        schoolName: 'Platform Administration',
        activeRole: Role.SUPER_ADMIN,
        permissions: getPermissionsForRole(Role.SUPER_ADMIN),
        lastValidated: new Date(),
      }
      contextStore.set(sessionId, superAdminContext)
      return superAdminContext
    }

    // Set school context for regular users
    return this.setSchoolContext(sessionId, schoolId, userId)
  }

  /**
   * Get current term and academic year info for a school
   */
  private async getCurrentTermInfo(schoolId: string): Promise<{
    termId: string
    academicYear: string
  } | null> {
    try {
      // Find active academic year
      const academicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      })

      if (!academicYear) {
        return null
      }

      // Find current term within the academic year
      const now = new Date()
      const currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: academicYear.id,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: {
          id: true,
        },
      })

      return {
        termId: currentTerm?.id || '',
        academicYear: academicYear.name,
      }
    } catch {
      return null
    }
  }

  /**
   * Log context-related events for audit
   */
  private async logContextEvent(
    userId: string,
    schoolId: string,
    eventType: AuthEventType,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.authAuditLog.create({
        data: {
          userId,
          schoolId: schoolId || undefined,
          eventType,
          identifier: userId,
          ipAddress: 'context-service',
          success: true,
          metadata,
        },
      })
    } catch (error) {
      console.error('Failed to log context event:', error)
    }
  }

  /**
   * Clear all contexts for a user (used when user is suspended/deleted)
   * Requirements: 18.6 - Invalidate all sessions when account status changes
   */
  async clearAllUserContexts(userId: string, reason: ContextInvalidationReason): Promise<void> {
    // Find and remove all contexts for this user
    for (const [sessionId, context] of contextStore.entries()) {
      if (context.userId === userId) {
        await this.invalidateContext(sessionId, reason)
      }
    }
  }

  /**
   * Clear all contexts for a school (used when school is suspended)
   * Requirements: 18.6 - Invalidate all sessions when school is suspended
   */
  async clearAllSchoolContexts(schoolId: string, reason: ContextInvalidationReason): Promise<void> {
    // Find and remove all contexts for this school
    for (const [sessionId, context] of contextStore.entries()) {
      if (context.schoolId === schoolId) {
        await this.invalidateContext(sessionId, reason)
      }
    }
  }

  /**
   * Check if a session has an active context
   */
  hasActiveContext(sessionId: string): boolean {
    return contextStore.has(sessionId)
  }

  /**
   * Get context display info for UI header
   * Requirements: 18.5 - Display active school name and role
   */
  getContextDisplayInfo(sessionId: string): {
    schoolName: string
    activeRole: string
    termInfo?: string
  } | null {
    const context = contextStore.get(sessionId)
    if (!context) {
      return null
    }

    return {
      schoolName: context.schoolName,
      activeRole: context.activeRole,
      termInfo: context.academicYear
        ? `${context.academicYear}${context.termId ? '' : ''}`
        : undefined,
    }
  }
}

// Export singleton instance
export const contextManagementService = new ContextManagementService()
