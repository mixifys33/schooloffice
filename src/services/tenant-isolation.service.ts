/**
 * Tenant Isolation Service
 * Ensures complete data isolation between school tenants
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */    

import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * Context for tenant-scoped operations
 */
export interface TenantContext {
  schoolId: string
  userId: string
  role: Role
}

/**
 * Result of a resource access validation
 */
export interface AccessValidationResult {
  allowed: boolean
  reason?: string
}

/**
 * Violation log entry structure
 */
export interface ViolationLogEntry {
  userId: string
  userSchoolId: string
  attemptedSchoolId: string
  resource: string
  action: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Query filter that can be applied to scope queries by school
 */
export interface SchoolScopedFilter {
  schoolId: string
}

/**
 * TenantIsolationService
 * 
 * Provides methods to ensure complete data isolation between school tenants.
 * All database queries for non-Super Admin users must be scoped by school_id.
 * 
 * Key responsibilities:
 * - Scope database queries by school_id
 * - Validate resource access against user's school context
 * - Log violation attempts for audit purposes
 * - Handle multi-school users (Parent/Teacher) with current school context
 */
export class TenantIsolationService {
  /**
   * Scopes a query filter by adding school_id constraint
   * 
   * For non-Super Admin users, this ensures all queries are filtered
   * to only return data from the user's school.
   * 
   * @param query - The base query filter object
   * @param context - The tenant context containing schoolId, userId, and role
   * @returns The query with school_id filter applied
   * @throws Error if context is invalid or missing schoolId for non-Super Admin
   * 
   * Requirements: 6.1
   */
  scopeQuery<T extends Record<string, unknown>>(
    query: T,
    context: TenantContext
  ): T & SchoolScopedFilter {
    // Super Admin users don't have school scoping
    if (context.role === Role.SUPER_ADMIN) {
      // Super Admin can access all schools, but we still validate context
      if (!context.userId) {
        throw new TenantIsolationError(
          'INVALID_CONTEXT',
          'User ID is required for query scoping'
        )
      }
      // Return query without school filter for Super Admin
      return query as T & SchoolScopedFilter
    }

    // Non-Super Admin users must have a schoolId
    if (!context.schoolId) {
      throw new TenantIsolationError(
        'MISSING_SCHOOL_CONTEXT',
        'School context is required for non-Super Admin users'
      )
    }

    // Add school_id filter to the query
    return {
      ...query,
      schoolId: context.schoolId,
    }
  }

  /**
   * Validates that a resource belongs to the user's school
   * 
   * This method checks if the authenticated user has permission to access
   * a resource based on school ownership. Cross-tenant access is always denied.
   * 
   * @param resourceSchoolId - The school_id of the resource being accessed
   * @param context - The tenant context of the requesting user
   * @returns AccessValidationResult indicating if access is allowed
   * 
   * Requirements: 6.2, 6.4
   */
  validateResourceAccess(
    resourceSchoolId: string,
    context: TenantContext
  ): AccessValidationResult {
    // Super Admin can access resources from any school
    if (context.role === Role.SUPER_ADMIN) {
      return { allowed: true }
    }

    // Non-Super Admin users must have a school context
    if (!context.schoolId) {
      return {
        allowed: false,
        reason: 'No school context available for the current user',
      }
    }

    // Check if resource belongs to user's school
    if (resourceSchoolId !== context.schoolId) {
      return {
        allowed: false,
        reason: 'Resource belongs to a different school',
      }
    }

    return { allowed: true }
  }

  /**
   * Validates access and throws if denied
   * 
   * Convenience method that combines validation and error throwing.
   * Use this in API routes to enforce tenant isolation.
   * 
   * @param resourceSchoolId - The school_id of the resource being accessed
   * @param context - The tenant context of the requesting user
   * @throws TenantIsolationError if access is denied
   * 
   * Requirements: 6.2, 6.4
   */
  enforceResourceAccess(
    resourceSchoolId: string,
    context: TenantContext
  ): void {
    const result = this.validateResourceAccess(resourceSchoolId, context)
    
    if (!result.allowed) {
      throw new TenantIsolationError(
        'CROSS_TENANT_ACCESS_DENIED',
        result.reason || 'Access denied to resource from different school'
      )
    }
  }

  /**
   * Logs a tenant isolation violation attempt
   * 
   * Records an audit log entry when a user attempts to access
   * data from a school they don't belong to.
   * 
   * @param userId - The ID of the user attempting the violation
   * @param attemptedSchoolId - The school_id the user tried to access
   * @param resource - Description of the resource being accessed
   * @param additionalInfo - Optional additional context (IP, user agent, etc.)
   * 
   * Requirements: 6.5
   */
  async logViolationAttempt(
    userId: string,
    attemptedSchoolId: string,
    resource: string,
    additionalInfo?: {
      userSchoolId?: string
      action?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    try {
      // Get user's actual school for the log
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { schoolId: true, email: true },
      })

      const logEntry: ViolationLogEntry = {
        userId,
        userSchoolId: additionalInfo?.userSchoolId || user?.schoolId || 'unknown',
        attemptedSchoolId,
        resource,
        action: additionalInfo?.action || 'ACCESS_ATTEMPT',
        timestamp: new Date(),
        ipAddress: additionalInfo?.ipAddress,
        userAgent: additionalInfo?.userAgent,
      }

      // Log to AuditLog table
      await prisma.auditLog.create({
        data: {
          userId,
          schoolId: user?.schoolId || attemptedSchoolId,
          action: 'TENANT_ISOLATION_VIOLATION',
          resource: 'SECURITY',
          resourceId: attemptedSchoolId,
          previousValue: null,
          newValue: logEntry as any,
          ipAddress: additionalInfo?.ipAddress,
          userAgent: additionalInfo?.userAgent,
        },
      })

      // Also log to console for immediate visibility in development
      console.warn('[TENANT ISOLATION VIOLATION]', {
        userId,
        userEmail: user?.email,
        userSchoolId: user?.schoolId,
        attemptedSchoolId,
        resource,
        timestamp: logEntry.timestamp.toISOString(),
      })
    } catch (error) {
      // Don't throw on logging failure - security check should still proceed
      console.error('[TENANT ISOLATION] Failed to log violation:', error)
    }
  }

  /**
   * Validates and logs violation if access is denied
   * 
   * Combines access validation with automatic violation logging.
   * Returns the validation result without throwing.
   * 
   * @param resourceSchoolId - The school_id of the resource being accessed
   * @param context - The tenant context of the requesting user
   * @param resource - Description of the resource for logging
   * @param additionalInfo - Optional additional context for logging
   * @returns AccessValidationResult
   * 
   * Requirements: 6.2, 6.4, 6.5
   */
  async validateAndLogAccess(
    resourceSchoolId: string,
    context: TenantContext,
    resource: string,
    additionalInfo?: {
      action?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<AccessValidationResult> {
    const result = this.validateResourceAccess(resourceSchoolId, context)

    if (!result.allowed) {
      await this.logViolationAttempt(
        context.userId,
        resourceSchoolId,
        resource,
        {
          userSchoolId: context.schoolId,
          ...additionalInfo,
        }
      )
    }

    return result
  }

  /**
   * Gets the current school context for a multi-school user
   * 
   * For users who exist in multiple schools (e.g., Parent or Teacher
   * working at multiple schools), this returns only the data from
   * the currently authenticated school context.
   * 
   * @param userId - The user's ID
   * @param currentSchoolId - The school ID from the current session
   * @returns The validated school context
   * @throws TenantIsolationError if user doesn't belong to the school
   * 
   * Requirements: 6.3
   */
  async validateMultiSchoolUserContext(
    userId: string,
    currentSchoolId: string
  ): Promise<{ schoolId: string; isValid: boolean }> {
    // Verify user belongs to the claimed school
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: currentSchoolId,
        isActive: true,
      },
      select: { id: true, schoolId: true },
    })

    if (!user || user.schoolId !== currentSchoolId) {
      return {
        schoolId: currentSchoolId,
        isValid: false,
      }
    }

    return {
      schoolId: currentSchoolId,
      isValid: true,
    }
  }

  /**
   * Creates a tenant context from session data
   * 
   * Helper method to construct a TenantContext from session information.
   * 
   * @param session - Session data containing user info
   * @returns TenantContext for use in other methods
   */
  createContextFromSession(session: {
    userId: string
    schoolId?: string | null
    role: Role
  }): TenantContext {
    return {
      userId: session.userId,
      schoolId: session.schoolId || '',
      role: session.role,
    }
  }

  /**
   * Checks if a user is a Super Admin (no school scoping required)
   * 
   * @param context - The tenant context
   * @returns true if user is Super Admin
   */
  isSuperAdmin(context: TenantContext): boolean {
    return context.role === Role.SUPER_ADMIN
  }

  /**
   * Scopes a Prisma where clause for common entity types
   * 
   * Convenience method for scoping queries on entities that have
   * a direct schoolId field.
   * 
   * @param where - The base where clause
   * @param context - The tenant context
   * @returns Scoped where clause
   * 
   * Requirements: 6.1
   */
  scopeWhereClause<T extends { schoolId?: string }>(
    where: T,
    context: TenantContext
  ): T {
    if (this.isSuperAdmin(context)) {
      return where
    }

    if (!context.schoolId) {
      throw new TenantIsolationError(
        'MISSING_SCHOOL_CONTEXT',
        'School context is required for database queries'
      )
    }

    return {
      ...where,
      schoolId: context.schoolId,
    }
  }
}

/**
 * Custom error class for tenant isolation violations
 */
export class TenantIsolationError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(
    code: string,
    message: string,
    statusCode: number = 403
  ) {
    super(message)
    this.name = 'TenantIsolationError'
    this.code = code
    this.statusCode = statusCode
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    }
  }
}

// Export singleton instance
export const tenantIsolationService = new TenantIsolationService()
