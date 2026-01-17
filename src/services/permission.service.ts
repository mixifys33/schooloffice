/**
 * Permission Service
 * Implements role-to-permission mappings and access control
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.7
 */
import { prisma } from '@/lib/db'
import { Role, PermissionType } from '@/types/enums'

/**
 * Permission definition for a role-feature combination
 */
export interface Permission {
  feature: string
  type: PermissionType
}

/**
 * Result of a combined permission check
 */
export interface CombinedPermissionResult {
  allowed: boolean
  reason?: string
}

/**
 * Feature names used in the permission system
 */
export const FEATURES = {
  // Core features
  STUDENTS: 'students',
  STAFF: 'staff',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  STREAMS: 'streams',
  
  // Academic features
  ATTENDANCE: 'attendance',
  MARKS: 'marks',
  RESULTS: 'results',
  REPORT_CARDS: 'report_cards',
  EXAMS: 'exams',
  TIMETABLE: 'timetable',
  
  // Financial features
  FEES: 'fees',
  PAYMENTS: 'payments',
  FEE_STRUCTURES: 'fee_structures',
  
  // Communication features
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  SMS: 'sms',
  
  // Administrative features
  SCHOOL_SETTINGS: 'school_settings',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs',
  REPORTS: 'reports',
  
  // Discipline
  DISCIPLINE: 'discipline',
  
  // Documents
  DOCUMENTS: 'documents',
  
  // Super Admin only
  SCHOOLS: 'schools',
  SYSTEM_CONFIG: 'system_config',
  LICENSING: 'licensing',
  BILLING: 'billing',
} as const

export type Feature = typeof FEATURES[keyof typeof FEATURES]

/**
 * Role-Permission Mapping
 * Requirement 19.1: Define explicit role-to-permission mappings for each role type
 * Requirement 19.6: Support view, create, edit, delete, approve, export permission types
 */
const ROLE_PERMISSION_MAP: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    // Super Admin has full access to platform-level features
    { feature: FEATURES.SCHOOLS, type: PermissionType.VIEW },
    { feature: FEATURES.SCHOOLS, type: PermissionType.CREATE },
    { feature: FEATURES.SCHOOLS, type: PermissionType.EDIT },
    { feature: FEATURES.SCHOOLS, type: PermissionType.DELETE },
    { feature: FEATURES.SYSTEM_CONFIG, type: PermissionType.VIEW },
    { feature: FEATURES.SYSTEM_CONFIG, type: PermissionType.EDIT },
    { feature: FEATURES.LICENSING, type: PermissionType.VIEW },
    { feature: FEATURES.LICENSING, type: PermissionType.EDIT },
    { feature: FEATURES.BILLING, type: PermissionType.VIEW },
    { feature: FEATURES.BILLING, type: PermissionType.EDIT },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.VIEW },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.EXPORT },
    { feature: FEATURES.USERS, type: PermissionType.VIEW },
    // Super Admin can view school data but not modify directly (Requirement 5.5)
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
  ],

  [Role.SCHOOL_ADMIN]: [
    // Full access to school-level features
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STUDENTS, type: PermissionType.CREATE },
    { feature: FEATURES.STUDENTS, type: PermissionType.EDIT },
    { feature: FEATURES.STUDENTS, type: PermissionType.DELETE },
    { feature: FEATURES.STUDENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.STAFF, type: PermissionType.CREATE },
    { feature: FEATURES.STAFF, type: PermissionType.EDIT },
    { feature: FEATURES.STAFF, type: PermissionType.DELETE },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.CREATE },
    { feature: FEATURES.CLASSES, type: PermissionType.EDIT },
    { feature: FEATURES.CLASSES, type: PermissionType.DELETE },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.CREATE },
    { feature: FEATURES.SUBJECTS, type: PermissionType.EDIT },
    { feature: FEATURES.SUBJECTS, type: PermissionType.DELETE },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.CREATE },
    { feature: FEATURES.STREAMS, type: PermissionType.EDIT },
    { feature: FEATURES.STREAMS, type: PermissionType.DELETE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.CREATE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EDIT },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EXPORT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.CREATE },
    { feature: FEATURES.MARKS, type: PermissionType.EDIT },
    { feature: FEATURES.MARKS, type: PermissionType.DELETE },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.CREATE },
    { feature: FEATURES.RESULTS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.APPROVE },
    { feature: FEATURES.RESULTS, type: PermissionType.EXPORT },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.CREATE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.APPROVE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EXPORT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.EXAMS, type: PermissionType.CREATE },
    { feature: FEATURES.EXAMS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.DELETE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.CREATE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.DELETE },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.CREATE },
    { feature: FEATURES.FEES, type: PermissionType.EDIT },
    { feature: FEATURES.FEES, type: PermissionType.DELETE },
    { feature: FEATURES.FEES, type: PermissionType.EXPORT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.VIEW },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.CREATE },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.EDIT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.DELETE },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.CREATE },
    { feature: FEATURES.MESSAGES, type: PermissionType.DELETE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.DELETE },
    { feature: FEATURES.SMS, type: PermissionType.VIEW },
    { feature: FEATURES.SMS, type: PermissionType.CREATE },
    { feature: FEATURES.SCHOOL_SETTINGS, type: PermissionType.VIEW },
    { feature: FEATURES.SCHOOL_SETTINGS, type: PermissionType.EDIT },
    { feature: FEATURES.USERS, type: PermissionType.VIEW },
    { feature: FEATURES.USERS, type: PermissionType.CREATE },
    { feature: FEATURES.USERS, type: PermissionType.EDIT },
    { feature: FEATURES.USERS, type: PermissionType.DELETE },
    { feature: FEATURES.AUDIT_LOGS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.CREATE },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.EDIT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.DELETE },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.DOCUMENTS, type: PermissionType.DELETE },
  ],

  [Role.DEPUTY]: [
    // Deputy has academic management access
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.STUDENTS, type: PermissionType.EDIT },
    { feature: FEATURES.STAFF, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.EDIT },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.EDIT },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.EDIT },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EXPORT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.APPROVE },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.EXAMS, type: PermissionType.CREATE },
    { feature: FEATURES.EXAMS, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.CREATE },
    { feature: FEATURES.TIMETABLE, type: PermissionType.EDIT },
    { feature: FEATURES.TIMETABLE, type: PermissionType.DELETE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.EDIT },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
  ],

  [Role.TEACHER]: [
    // Teacher has class-level access (Requirement 14.4)
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.SUBJECTS, type: PermissionType.VIEW },
    { feature: FEATURES.STREAMS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.CREATE },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.EDIT },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.CREATE },
    { feature: FEATURES.MARKS, type: PermissionType.EDIT },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.EDIT },
    { feature: FEATURES.EXAMS, type: PermissionType.VIEW },
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.CREATE },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
  ],

  [Role.ACCOUNTANT]: [
    // Accountant has financial access
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.CLASSES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.CREATE },
    { feature: FEATURES.FEES, type: PermissionType.EDIT },
    { feature: FEATURES.FEES, type: PermissionType.EXPORT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.CREATE },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EDIT },
    { feature: FEATURES.PAYMENTS, type: PermissionType.EXPORT },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.VIEW },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.CREATE },
    { feature: FEATURES.FEE_STRUCTURES, type: PermissionType.EDIT },
    { feature: FEATURES.REPORTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORTS, type: PermissionType.EXPORT },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
  ],

  [Role.STUDENT]: [
    // Student has read-only access (Requirement 16.3)
    { feature: FEATURES.TIMETABLE, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
  ],

  [Role.PARENT]: [
    // Parent has read access to children's data (Requirement 15.3)
    { feature: FEATURES.STUDENTS, type: PermissionType.VIEW },
    { feature: FEATURES.ATTENDANCE, type: PermissionType.VIEW },
    { feature: FEATURES.MARKS, type: PermissionType.VIEW },
    { feature: FEATURES.RESULTS, type: PermissionType.VIEW },
    { feature: FEATURES.REPORT_CARDS, type: PermissionType.VIEW },
    { feature: FEATURES.FEES, type: PermissionType.VIEW },
    { feature: FEATURES.PAYMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.DISCIPLINE, type: PermissionType.VIEW },
    { feature: FEATURES.ANNOUNCEMENTS, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.VIEW },
    { feature: FEATURES.MESSAGES, type: PermissionType.CREATE },
  ],
}


/**
 * Permission Service Implementation
 * Requirement 19.1: Define explicit role-to-permission mappings
 * Requirement 19.2: Enforce feature-level access control
 * Requirement 19.3: Distinguish between read and write permissions
 * Requirement 19.4: Verify user has required permission before execution
 * Requirement 19.5: Log all permission check failures
 * Requirement 19.7: Consider both role permissions and school-level feature availability
 */
export class PermissionService {
  /**
   * Get all permissions for a role
   * Requirement 19.1: Define explicit role-to-permission mappings for each role type
   */
  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSION_MAP[role] || []
  }

  /**
   * Check if a user has a specific permission
   * Requirement 19.2: Enforce feature-level access control based on assigned permissions
   * Requirement 19.3: Distinguish between read and write permissions for each feature
   * Requirement 19.4: Verify user has required permission before execution
   */
  async hasPermission(
    userId: string,
    schoolId: string | null,
    feature: string,
    type: PermissionType
  ): Promise<boolean> {
    // Get user with their roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        activeRole: true,
        schoolId: true,
        status: true,
      },
    })

    if (!user) {
      return false
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return false
    }

    // Determine which role to check - use activeRole if set, otherwise check all roles
    const rolesToCheck = user.activeRole ? [user.activeRole] : user.roles

    // Check if any of the user's roles have the required permission
    for (const role of rolesToCheck) {
      const permissions = this.getPermissionsForRole(role as Role)
      const hasPermission = permissions.some(
        (p) => p.feature === feature && p.type === type
      )
      if (hasPermission) {
        return true
      }
    }

    return false
  }

  /**
   * Check permission considering both role permissions and school feature availability
   * Requirement 19.7: Consider both role permissions and school-level feature availability
   */
  async checkCombinedPermission(
    userId: string,
    schoolId: string | null,
    feature: string,
    type: PermissionType
  ): Promise<CombinedPermissionResult> {
    // First check role-based permission
    const hasRolePermission = await this.hasPermission(userId, schoolId, feature, type)

    if (!hasRolePermission) {
      return {
        allowed: false,
        reason: 'PERMISSION_DENIED: You do not have permission to perform this action.',
      }
    }

    // For Super Admin, skip school feature check (they don't have a school)
    if (!schoolId) {
      // Check if user is Super Admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: true, activeRole: true },
      })

      if (user?.activeRole === Role.SUPER_ADMIN || user?.roles.includes(Role.SUPER_ADMIN)) {
        return { allowed: true }
      }

      return {
        allowed: false,
        reason: 'INVALID_CONTEXT: No school context provided.',
      }
    }

    // Check school-level feature availability
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        isActive: true,
        features: true,
        licenseType: true,
      },
    })

    if (!school) {
      return {
        allowed: false,
        reason: 'SCHOOL_NOT_FOUND: The specified school does not exist.',
      }
    }

    if (!school.isActive) {
      return {
        allowed: false,
        reason: 'SCHOOL_SUSPENDED: This school has been suspended.',
      }
    }

    // Check if the feature is enabled for this school based on license/features
    const schoolFeatures = school.features as Record<string, boolean> | null
    const featureEnabled = this.isFeatureEnabledForSchool(feature, schoolFeatures, school.licenseType)

    if (!featureEnabled) {
      return {
        allowed: false,
        reason: 'FEATURE_NOT_AVAILABLE: This feature is not available for your school.',
      }
    }

    return { allowed: true }
  }

  /**
   * Log permission check failure for audit
   * Requirement 19.5: Log all permission check failures for audit purposes
   */
  async logPermissionFailure(
    userId: string,
    schoolId: string | null,
    feature: string,
    type: PermissionType,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Only log if we have a valid schoolId (for audit log relation)
    if (schoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'permission_denied',
          resource: feature,
          resourceId: `${feature}_${type}`,
          newValue: {
            feature,
            permissionType: type,
            timestamp: new Date().toISOString(),
          },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          timestamp: new Date(),
        },
      })
    }

    // Also log to AuthAuditLog for cross-school visibility
    await prisma.authAuditLog.create({
      data: {
        userId,
        schoolId,
        eventType: 'SUSPICIOUS_ACTIVITY',
        identifier: userId,
        ipAddress: ipAddress ?? 'unknown',
        userAgent: userAgent ?? null,
        success: false,
        errorCode: 'PERMISSION_DENIED',
        metadata: {
          feature,
          permissionType: type,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    })
  }

  /**
   * Check if a feature is enabled for a school based on its license and feature flags
   */
  private isFeatureEnabledForSchool(
    feature: string,
    schoolFeatures: Record<string, boolean> | null,
    licenseType: string
  ): boolean {
    // Map features to their required license level or feature flag
    const featureRequirements: Record<string, { minLicense?: string; featureFlag?: string }> = {
      [FEATURES.SMS]: { featureFlag: 'smsEnabled' },
      [FEATURES.MESSAGES]: { featureFlag: 'smsEnabled' },
      [FEATURES.REPORTS]: { featureFlag: 'advancedReporting', minLicense: 'BASIC' },
    }

    const requirement = featureRequirements[feature]

    // If no specific requirement, feature is available to all
    if (!requirement) {
      return true
    }

    // Check feature flag if specified
    if (requirement.featureFlag && schoolFeatures) {
      if (!schoolFeatures[requirement.featureFlag]) {
        return false
      }
    }

    // Check license level if specified
    if (requirement.minLicense) {
      const licenseHierarchy = ['FREE_PILOT', 'BASIC', 'PREMIUM']
      const schoolLicenseIndex = licenseHierarchy.indexOf(licenseType)
      const requiredLicenseIndex = licenseHierarchy.indexOf(requirement.minLicense)

      if (schoolLicenseIndex < requiredLicenseIndex) {
        return false
      }
    }

    return true
  }

  /**
   * Check if a role has a specific permission (static check without database)
   * Useful for quick permission checks when role is already known
   */
  roleHasPermission(role: Role, feature: string, type: PermissionType): boolean {
    const permissions = this.getPermissionsForRole(role)
    return permissions.some((p) => p.feature === feature && p.type === type)
  }

  /**
   * Get all features a role has access to
   */
  getFeaturesForRole(role: Role): string[] {
    const permissions = this.getPermissionsForRole(role)
    return [...new Set(permissions.map((p) => p.feature))]
  }

  /**
   * Get all permission types a role has for a specific feature
   */
  getPermissionTypesForFeature(role: Role, feature: string): PermissionType[] {
    const permissions = this.getPermissionsForRole(role)
    return permissions
      .filter((p) => p.feature === feature)
      .map((p) => p.type)
  }

  /**
   * Check if permission type is a write operation
   * Requirement 19.3: Distinguish between read and write permissions
   */
  isWritePermission(type: PermissionType): boolean {
    return [
      PermissionType.CREATE,
      PermissionType.EDIT,
      PermissionType.DELETE,
      PermissionType.APPROVE,
    ].includes(type)
  }

  /**
   * Check if permission type is a read operation
   * Requirement 19.3: Distinguish between read and write permissions
   */
  isReadPermission(type: PermissionType): boolean {
    return [PermissionType.VIEW, PermissionType.EXPORT].includes(type)
  }

  /**
   * Seed role-permission mappings to the database
   * Requirement 19.1: Define explicit role-to-permission mappings for each role type
   * Requirement 19.6: Support view, create, edit, delete, approve, export permission types
   */
  async seedPermissions(): Promise<{ seeded: number; roles: Record<string, number> }> {
    // Clear existing permissions
    await prisma.rolePermission.deleteMany({})

    // Prepare all permission records
    const permissionRecords: { role: Role; feature: string; type: PermissionType }[] = []

    for (const [role, permissions] of Object.entries(ROLE_PERMISSION_MAP)) {
      for (const permission of permissions) {
        permissionRecords.push({
          role: role as Role,
          feature: permission.feature,
          type: permission.type,
        })
      }
    }

    // Insert all permissions
    const result = await prisma.rolePermission.createMany({
      data: permissionRecords,
      skipDuplicates: true,
    })

    // Calculate counts by role
    const rolesCounts: Record<string, number> = {}
    for (const role of Object.values(Role)) {
      rolesCounts[role] = permissionRecords.filter((p) => p.role === role).length
    }

    return {
      seeded: result.count,
      roles: rolesCounts,
    }
  }

  /**
   * Get permissions from database for a role
   * This queries the database instead of using the in-memory map
   */
  async getPermissionsFromDatabase(role: Role): Promise<Permission[]> {
    const permissions = await prisma.rolePermission.findMany({
      where: { role },
      select: {
        feature: true,
        type: true,
      },
    })

    return permissions.map((p) => ({
      feature: p.feature,
      type: p.type,
    }))
  }

  /**
   * Check if permissions are seeded in the database
   */
  async arePermissionsSeeded(): Promise<boolean> {
    const count = await prisma.rolePermission.count()
    return count > 0
  }
}

// Export singleton instance
export const permissionService = new PermissionService()

// Export the role permission map for seeding
export { ROLE_PERMISSION_MAP }
