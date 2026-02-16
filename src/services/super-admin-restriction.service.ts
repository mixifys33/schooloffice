/**
 * Super Admin Restriction Service
 * Implements operation restrictions and impersonation controls for Super Admin users
 * Requirements: 5.5, 5.6
 */
import { prisma } from '@/lib/db'
import { Role, AuthEventType } from '@/types/enums'

// ============================================
// TYPES
// ============================================

/**  
 * Restricted operations that Super Admin cannot perform directly
 * Requirements: 5.5
 */
export type RestrictedOperation =
  | 'ENTER_MARKS'
  | 'EDIT_DISCIPLINE'
  | 'MODIFY_FEES'
  | 'ACT_AS_TEACHER'
  | 'ACT_AS_PARENT'
  | 'RECORD_ATTENDANCE'
  | 'EDIT_STUDENT_RECORDS'

/**
 * Impersonation session data
 * Requirements: 5.6
 */
export interface ImpersonationSession {
  id: string
  superAdminId: string
  targetSchoolId: string
  targetSchoolCode: string
  targetSchoolName: string
  startedAt: Date
  expiresAt: Date
  isReadOnly: boolean
  actions: ImpersonationAction[]
}

/**
 * Logged impersonation action
 * Requirements: 5.6
 */
export interface ImpersonationAction {
  timestamp: Date
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
}

/**
 * Result of operation restriction check
 */
export interface RestrictionCheckResult {
  allowed: boolean
  reason?: string
  alternativeAction?: string
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Operations that Super Admin is restricted from performing
 * Requirements: 5.5
 */
const RESTRICTED_OPERATIONS: Record<RestrictedOperation, string> = {
  ENTER_MARKS: 'Super Admin cannot enter marks directly. Use impersonation with read-only access to view marks.',
  EDIT_DISCIPLINE: 'Super Admin cannot edit student discipline records directly.',
  MODIFY_FEES: 'Super Admin cannot modify fee records directly. School Admin must handle fee management.',
  ACT_AS_TEACHER: 'Super Admin cannot perform teacher-specific operations.',
  ACT_AS_PARENT: 'Super Admin cannot perform parent-specific operations.',
  RECORD_ATTENDANCE: 'Super Admin cannot record attendance directly.',
  EDIT_STUDENT_RECORDS: 'Super Admin cannot edit student records directly.',
}

/**
 * Default impersonation session duration (30 minutes)
 */
const DEFAULT_IMPERSONATION_DURATION_MS = 30 * 60 * 1000

/**
 * Maximum impersonation session duration (2 hours)
 */
const MAX_IMPERSONATION_DURATION_MS = 2 * 60 * 60 * 1000

// ============================================
// SUPER ADMIN RESTRICTION SERVICE CLASS
// ============================================

export class SuperAdminRestrictionService {
  /**
   * Check if a user is a Super Admin
   * Requirements: 5.3
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, schoolId: true },
    })

    // Super Admin has SUPER_ADMIN role and null schoolId
    return user?.role === Role.SUPER_ADMIN && user?.schoolId === null
  }

  /**
   * Check if an operation is restricted for Super Admin
   * Requirements: 5.5
   */
  isOperationRestricted(operation: RestrictedOperation): RestrictionCheckResult {
    const reason = RESTRICTED_OPERATIONS[operation]
    if (reason) {
      return {
        allowed: false,
        reason,
        alternativeAction: this.getAlternativeAction(operation),
      }
    }
    return { allowed: true }
  }

  /**
   * Get alternative action suggestion for restricted operation
   */
  private getAlternativeAction(operation: RestrictedOperation): string {
    switch (operation) {
      case 'ENTER_MARKS':
        return 'View marks through the Super Admin Console or use read-only impersonation.'
      case 'EDIT_DISCIPLINE':
        return 'Contact School Admin to handle discipline records.'
      case 'MODIFY_FEES':
        return 'Contact School Admin to manage fee structures and payments.'
      case 'ACT_AS_TEACHER':
        return 'Use read-only impersonation to view teacher dashboards.'
      case 'ACT_AS_PARENT':
        return 'Use read-only impersonation to view parent dashboards.'
      case 'RECORD_ATTENDANCE':
        return 'Contact School Admin or Teacher to record attendance.'
      case 'EDIT_STUDENT_RECORDS':
        return 'Contact School Admin to edit student records.'
      default:
        return 'Contact School Admin for this operation.'
    }
  }

  /**
   * Check if Super Admin can perform an action on a resource
   * Requirements: 5.5
   */
  async canPerformAction(
    userId: string,
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
  ): Promise<RestrictionCheckResult> {
    // Check if user is Super Admin
    const isSuperAdmin = await this.isSuperAdmin(userId)
    if (!isSuperAdmin) {
      return { allowed: true } // Non-Super Admin users are not restricted by this service
    }

    // Map resource/action to restricted operations
    const restrictedOp = this.mapToRestrictedOperation(resource, action)
    if (restrictedOp) {
      return this.isOperationRestricted(restrictedOp)
    }

    // Super Admin can read most resources
    if (action === 'read') {
      return { allowed: true }
    }

    return { allowed: true }
  }

  /**
   * Map resource and action to restricted operation
   */
  private mapToRestrictedOperation(
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete'
  ): RestrictedOperation | null {
    // Read operations are generally allowed
    if (action === 'read') {
      return null
    }

    // Map write operations to restricted operations
    switch (resource) {
      case 'mark':
      case 'marks':
        return 'ENTER_MARKS'
      case 'discipline':
      case 'disciplineCase':
        return 'EDIT_DISCIPLINE'
      case 'fee':
      case 'fees':
      case 'payment':
      case 'feeStructure':
        return 'MODIFY_FEES'
      case 'attendance':
        return 'RECORD_ATTENDANCE'
      case 'student':
        if (action !== 'read') {
          return 'EDIT_STUDENT_RECORDS'
        }
        return null
      default:
        return null
    }
  }


  // ============================================
  // IMPERSONATION MANAGEMENT
  // Requirements: 5.6
  // ============================================

  /**
   * Start an impersonation session for a Super Admin
   * Requirements: 5.6 - Enforce read-only or time-boxed access
   */
  async startImpersonation(
    superAdminId: string,
    targetSchoolId: string,
    durationMs: number = DEFAULT_IMPERSONATION_DURATION_MS,
    isReadOnly: boolean = true
  ): Promise<ImpersonationSession> {
    // Verify user is Super Admin
    const isSuperAdmin = await this.isSuperAdmin(superAdminId)
    if (!isSuperAdmin) {
      throw new Error('Only Super Admin can use impersonation')
    }

    // Verify target school exists
    const school = await prisma.school.findUnique({
      where: { id: targetSchoolId },
      select: { id: true, code: true, name: true },
    })

    if (!school) {
      throw new Error('Target school not found')
    }

    // Enforce maximum duration
    const actualDuration = Math.min(durationMs, MAX_IMPERSONATION_DURATION_MS)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + actualDuration)

    // Create impersonation session
    const session: ImpersonationSession = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      superAdminId,
      targetSchoolId: school.id,
      targetSchoolCode: school.code,
      targetSchoolName: school.name,
      startedAt: now,
      expiresAt,
      isReadOnly,
      actions: [],
    }

    // Log impersonation start - Requirement 5.6
    await this.logImpersonationEvent(
      superAdminId,
      targetSchoolId,
      AuthEventType.IMPERSONATION_START,
      {
        sessionId: session.id,
        isReadOnly,
        expiresAt: expiresAt.toISOString(),
        targetSchoolCode: school.code,
        targetSchoolName: school.name,
      }
    )

    return session
  }

  /**
   * Log an action performed during impersonation
   * Requirements: 5.6 - Log all impersonation actions
   */
  async logImpersonationAction(
    session: ImpersonationSession,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const impersonationAction: ImpersonationAction = {
      timestamp: new Date(),
      action,
      resource,
      resourceId,
      details,
    }

    session.actions.push(impersonationAction)

    // Log to audit log - Requirement 5.6
    await this.logImpersonationEvent(
      session.superAdminId,
      session.targetSchoolId,
      AuthEventType.IMPERSONATION_ACTION,
      {
        sessionId: session.id,
        action,
        resource,
        resourceId,
        details,
      }
    )
  }

  /**
   * End an impersonation session
   * Requirements: 5.6
   */
  async endImpersonation(session: ImpersonationSession): Promise<void> {
    await this.logImpersonationEvent(
      session.superAdminId,
      session.targetSchoolId,
      AuthEventType.IMPERSONATION_END,
      {
        sessionId: session.id,
        duration: Date.now() - session.startedAt.getTime(),
        actionsCount: session.actions.length,
      }
    )
  }

  /**
   * Check if impersonation session is still valid
   * Requirements: 5.6 - Time-boxed access
   */
  isSessionValid(session: ImpersonationSession): boolean {
    return new Date() < session.expiresAt
  }

  /**
   * Check if action is allowed in impersonation session
   * Requirements: 5.6 - Read-only access enforcement
   */
  isActionAllowedInSession(
    session: ImpersonationSession,
    action: 'create' | 'read' | 'update' | 'delete'
  ): boolean {
    // If session is read-only, only allow read actions
    if (session.isReadOnly && action !== 'read') {
      return false
    }

    // Check if session is still valid
    return this.isSessionValid(session)
  }

  /**
   * Log impersonation event to audit log
   * Requirements: 5.6
   */
  private async logImpersonationEvent(
    superAdminId: string,
    targetSchoolId: string,
    eventType: AuthEventType,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.authAuditLog.create({
        data: {
          userId: superAdminId,
          schoolId: targetSchoolId,
          eventType: eventType,
          identifier: `impersonation:${eventType}`,
          ipAddress: 'system',
          success: true,
          metadata: {
            ...metadata,
            impersonationType: eventType,
          },
        },
      })
    } catch (error) {
      console.error('Failed to log impersonation event:', error)
    }
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate Super Admin has null schoolId
   * Requirements: 5.3
   */
  async validateSuperAdminNoSchool(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, schoolId: true },
    })

    if (!user) {
      return false
    }

    // Super Admin must have SUPER_ADMIN role and null schoolId
    return user.role === Role.SUPER_ADMIN && user.schoolId === null
  }

  /**
   * Get Super Admin dashboard path
   * Requirements: 5.2
   */
  getSuperAdminDashboardPath(): string {
    return '/super-admin'
  }

  /**
   * Check if a path is the Super Admin console
   * Requirements: 5.2
   */
  isSuperAdminConsolePath(path: string): boolean {
    return path.startsWith('/super-admin')
  }

  /**
   * Get list of restricted operations for documentation
   */
  getRestrictedOperationsList(): { operation: RestrictedOperation; reason: string }[] {
    return Object.entries(RESTRICTED_OPERATIONS).map(([operation, reason]) => ({
      operation: operation as RestrictedOperation,
      reason,
    }))
  }
}

// Export singleton instance
export const superAdminRestrictionService = new SuperAdminRestrictionService()
