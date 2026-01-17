/**
 * Role Resolution Service
 * Handles multi-role support, role resolution, and dashboard routing
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { getPermissionsForRole } from '@/lib/rbac'
import { Permission } from '@/types/services'

// ============================================
// TYPES
// ============================================

/**
 * Result of role resolution for a user
 * Requirements: 3.1, 3.2, 3.3
 */
export interface RoleResolutionResult {
  roles: Role[]
  primaryRole: Role
  dashboardPath: string
  requiresSelection: boolean
  permissions: Permission[]
}

/**
 * Dashboard path configuration for each role
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.2
 * - Requirement 4.1: School_Admin → school overview, setup menus, reports, finance
 * - Requirement 4.2: Teacher → classes, attendance, marks, timetable
 * - Requirement 4.3: Parent → child list, fees, results, messages
 * - Requirement 4.4: Student → timetable, results, assignments
 * - Requirement 5.2: Super_Admin → Super Admin Console
 */
const DASHBOARD_PATHS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/super-admin',
  [Role.SCHOOL_ADMIN]: '/dashboard',
  [Role.DEPUTY]: '/dashboard',
  [Role.TEACHER]: '/dashboard/classes',
  [Role.ACCOUNTANT]: '/dashboard/fees',
  [Role.STUDENT]: '/student',
  [Role.PARENT]: '/parent',
}

// ============================================
// ROLE RESOLUTION SERVICE CLASS
// ============================================

export class RoleResolutionService {
  /**
   * Resolve all roles for a user within a school context
   * Requirements: 3.1 - Query all roles assigned to user within authenticated school
   * Requirements: 3.2 - Auto-redirect for single role
   * Requirements: 3.3 - Show role switcher for multiple roles
   */
  async resolveRoles(userId: string, schoolId?: string): Promise<RoleResolutionResult> {
    // Find user with their roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        roles: true,
        activeRole: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Validate school context if provided
    if (schoolId && user.schoolId && user.schoolId !== schoolId) {
      throw new Error('User does not belong to the specified school')
    }

    // Get all roles - use roles array if available, otherwise fall back to single role
    const roles: Role[] = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]

    // Determine primary role (active role or first role)
    const primaryRole = (user.activeRole as Role) || roles[0]

    // Get dashboard path for primary role
    const dashboardPath = this.getDashboardPath(primaryRole)

    // Determine if role selection is required
    // Requirements: 3.2 - Single role auto-redirects
    // Requirements: 3.3 - Multiple roles show role switcher
    const requiresSelection = roles.length > 1

    // Get permissions for the primary role
    // Requirements: 3.5 - Load corresponding permissions
    const permissions = getPermissionsForRole(primaryRole)

    return {
      roles,
      primaryRole,
      dashboardPath,
      requiresSelection,
      permissions,
    }
  }

  /**
   * Get dashboard path for a specific role
   * Requirements: 4.1, 4.2, 4.3, 4.4, 5.2
   */
  getDashboardPath(role: Role): string {
    return DASHBOARD_PATHS[role] || '/dashboard'
  }

  /**
   * Validate that a user has a specific role assigned
   * Requirements: 3.4 - Never allow users to select or claim roles they are not assigned
   */
  async validateRole(userId: string, role: Role, schoolId?: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        roles: true,
      },
    })

    if (!user) {
      return false
    }

    // Validate school context if provided
    if (schoolId && user.schoolId && user.schoolId !== schoolId) {
      return false
    }

    // Get all roles
    const roles: Role[] = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]

    // Check if the requested role is in the user's assigned roles
    return roles.includes(role)
  }

  /**
   * Get all available dashboard paths for a user's roles
   * Useful for navigation and role switching UI
   */
  async getAvailableDashboards(userId: string): Promise<{ role: Role; path: string }[]> {
    const { roles } = await this.resolveRoles(userId)
    
    return roles.map(role => ({
      role,
      path: this.getDashboardPath(role),
    }))
  }

  /**
   * Check if a user has multiple roles
   * Requirements: 3.3 - Display role switcher for multi-role users
   */
  async hasMultipleRoles(userId: string): Promise<boolean> {
    const { roles } = await this.resolveRoles(userId)
    return roles.length > 1
  }

  /**
   * Get the active role for a user
   * Returns the currently active role or the primary role if none is set
   */
  async getActiveRole(userId: string): Promise<Role | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        roles: true,
        activeRole: true,
      },
    })

    if (!user) {
      return null
    }

    // Return active role if set, otherwise return primary role
    if (user.activeRole) {
      return user.activeRole as Role
    }

    // Fall back to roles array or single role
    const roles: Role[] = user.roles && user.roles.length > 0
      ? user.roles as Role[]
      : [user.role as Role]

    return roles[0]
  }

  /**
   * Get permissions for a specific role
   * Requirements: 3.5 - Load corresponding permissions
   */
  getPermissionsForRole(role: Role): Permission[] {
    return getPermissionsForRole(role)
  }

  /**
   * Get role resolution result for a specific role (used during role switching)
   * Requirements: 3.5 - Load corresponding dashboard and permissions for new role
   */
  getRoleDetails(role: Role): { dashboardPath: string; permissions: Permission[] } {
    return {
      dashboardPath: this.getDashboardPath(role),
      permissions: this.getPermissionsForRole(role),
    }
  }
}

// Export singleton instance
export const roleResolutionService = new RoleResolutionService()
