/**
 * Authentication Service
 * Handles user authentication operations with school-first login flow
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 5.1, 7.3
 * Staff Dashboard Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
 */
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { User, CreateUserInput, UserSession } from '@/types'
import { Role, LicenseType, AuthEventType, StaffRole, StaffStatus } from '@/types/enums'
import { roleResolutionService } from './role-resolution.service'
import { getUserFriendlyError } from '@/lib/error-messages'

// ============================================
// TYPES
// ============================================

/**
 * Login credentials for school-first authentication
 * Requirements: 2.1, 2.4
 */
export interface LoginCredentials {
  schoolCode?: string // Optional for Super Admin
  identifier: string // Email, phone, or username
  password: string
  ipAddress?: string // For audit logging
  userAgent?: string // For audit logging
}

/**
 * Authentication result with role information
 * Requirements: 3.1, 3.2, 3.3, 3.5
 * Staff Dashboard Requirements: 1.4, 1.6 - Primary role and role switcher
 */
export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  requiresRoleSelection?: boolean
  availableRoles?: Role[]
  dashboardPath?: string // Dashboard path for the active role
  error?: AuthError
  errorMessage?: string // Human-readable error message
  // Staff dashboard specific fields - Requirements: 1.4, 1.6
  staffProfile?: StaffProfileInfo
  showRoleSwitcher?: boolean // True when staff has secondary roles
}

/**
 * Authenticated user with school context
 * Requirements: 2.3, 5.3
 */
export interface AuthenticatedUser {
  id: string
  email: string
  phone?: string
  username?: string
  schoolId?: string // Null for Super Admin
  schoolCode?: string
  schoolName?: string
  roles: Role[]
  activeRole: Role
  licenseType?: LicenseType
}

/**
 * Staff profile information for dashboard routing
 * Requirements: 1.1, 1.4, 1.6 - Staff profile verification and role loading
 */
export interface StaffProfileInfo {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  primaryRole: StaffRole | Role | null
  secondaryRoles: (StaffRole | Role)[]
  status: StaffStatus
  department?: string
  lastActivityAt?: Date
}

/**
 * Authentication error codes
 * Requirements: 2.6, 2.7 - Generic errors that don't reveal which field was incorrect
 * Staff Dashboard Requirements: 1.2, 1.3 - Staff profile and status errors
 */
export type AuthError =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SCHOOL_SUSPENDED'
  | 'RATE_LIMITED'
  | 'NO_STAFF_PROFILE'
  | 'STAFF_INACTIVE'


/**
 * School code validation result
 * Requirements: 2.2, 8.5
 */
export interface SchoolCodeValidationResult {
  isValid: boolean
  normalizedCode: string
}

/**
 * Authentication event for audit logging
 * Requirements: 7.3
 */
export interface AuthEvent {
  userId?: string
  schoolId?: string
  eventType: AuthEventType
  identifier: string
  ipAddress: string
  userAgent?: string
  success: boolean
  errorCode?: string
  metadata?: Record<string, unknown>
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma User to domain User type
 */
function mapPrismaUserToDomain(prismaUser: {
  id: string
  schoolId: string | null
  email: string
  phone: string | null
  username?: string | null
  passwordHash: string | null
  role: string
  roles?: string[]
  activeRole?: string | null
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}): User {
  return {
    id: prismaUser.id,
    schoolId: prismaUser.schoolId ?? '',
    email: prismaUser.email,
    phone: prismaUser.phone ?? undefined,
    passwordHash: prismaUser.passwordHash ?? undefined,
    role: prismaUser.role as Role,
    isActive: prismaUser.isActive,
    lastLogin: prismaUser.lastLogin ?? undefined,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt,
  }
}

/**
 * Normalize school code to uppercase
 * Requirements: 8.5
 */
function normalizeSchoolCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Validate school code format (alphanumeric only)
 * Requirements: 1.2
 */
function isValidSchoolCodeFormat(code: string): boolean {
  return /^[A-Za-z0-9]+$/.test(code)
}


// ============================================
// AUTH SERVICE CLASS
// ============================================

export class AuthService {
  /**
   * Log authentication event for audit
   * Requirements: 7.3
   */
  async logAuthEvent(event: AuthEvent): Promise<void> {
    try {
      await prisma.authAuditLog.create({
        data: {
          userId: event.userId,
          schoolId: event.schoolId,
          eventType: event.eventType,
          identifier: event.identifier,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          errorCode: event.errorCode,
          metadata: event.metadata,
        },
      })
    } catch (error) {
      // Log error but don't fail the authentication flow
      console.error('Failed to log auth event:', error)
    }
  }

  /**
   * Validate school code exists without revealing existence
   * Returns a generic validation result to prevent information leakage
   * Requirements: 2.2, 2.6
   */
  async validateSchoolCode(code: string): Promise<SchoolCodeValidationResult> {
    const normalizedCode = normalizeSchoolCode(code)
    
    // Check format first
    if (!isValidSchoolCodeFormat(normalizedCode)) {
      return {
        isValid: false,
        normalizedCode,
      }
    }

    // Check if school exists (but don't reveal this to caller)
    // The actual existence check happens during authentication
    // This method only validates format to prevent timing attacks
    return {
      isValid: true,
      normalizedCode,
    }
  }

  /**
   * Authenticate user with school-first flow
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 7.3
   */
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { schoolCode, identifier, password, ipAddress = 'unknown', userAgent } = credentials
    const normalizedIdentifier = identifier.trim().toLowerCase()

    // Super Admin authentication (no school code required)
    // Requirements: 5.1
    if (!schoolCode) {
      return this.authenticateSuperAdmin(normalizedIdentifier, password, ipAddress, userAgent)
    }

    // School-first authentication
    // Requirements: 2.1, 2.2
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode)
    
    // Validate school code format
    if (!isValidSchoolCodeFormat(normalizedSchoolCode)) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'INVALID_SCHOOL_CODE_FORMAT',
      })
      // Return generic error - don't reveal format issue
      // Requirements: 2.6
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Find school by code
    const school = await prisma.school.findUnique({
      where: { code: normalizedSchoolCode },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        licenseType: true,
      },
    })

    // School not found - return generic error
    // Requirements: 2.6
    if (!school) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'SCHOOL_NOT_FOUND',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if school is suspended
    if (!school.isActive) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'SCHOOL_SUSPENDED',
      })
      return {
        success: false,
        error: 'SCHOOL_SUSPENDED',
      }
    }

    // Find user by identifier within school context
    // Requirements: 2.3, 2.4, 2.5
    const user = await this.findUserByIdentifierInSchool(normalizedIdentifier, school.id)

    // User not found - return generic error
    // Requirements: 2.7
    if (!user) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'USER_NOT_FOUND',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'USER_INACTIVE',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
      })
      return {
        success: false,
        error: 'ACCOUNT_LOCKED',
      }
    }

    // Verify password
    if (!user.passwordHash) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'NO_PASSWORD_SET',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      // Increment failed attempts
      await this.recordFailedAttempt(user.id)
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        schoolId: school.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier: normalizedIdentifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'INVALID_PASSWORD',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Clear failed attempts on successful login
    await this.clearFailedAttempts(user.id)

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Get user roles
    const roles = user.roles && user.roles.length > 0 
      ? user.roles as Role[]
      : [user.role as Role]

    // Determine if role selection is required
    // Requirements: 3.2, 3.3
    const requiresRoleSelection = roles.length > 1
    const activeRole = user.activeRole as Role || roles[0]

    // ============================================
    // STAFF PROFILE VERIFICATION
    // Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
    // ============================================
    
    // Check if user needs staff profile verification (staff roles)
    const staffRoles = [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.ACCOUNTANT]
    const isStaffRole = staffRoles.includes(activeRole)
    
    let staffProfile: StaffProfileInfo | undefined
    let showRoleSwitcher = false
    let staffDashboardPath: string | undefined
    
    if (isStaffRole) {
      // Verify staff profile linkage - Requirement 1.1
      const staffVerification = await this.verifyStaffProfile(user.id, school.id)
      
      if (!staffVerification.hasProfile) {
        // Requirement 1.2 - Deny access if no staff profile linked
        await this.logAuthEvent({
          userId: user.id,
          schoolId: school.id,
          eventType: AuthEventType.LOGIN_FAILED,
          identifier: normalizedIdentifier,
          ipAddress,
          userAgent,
          success: false,
          errorCode: 'NO_STAFF_PROFILE',
        })
        return {
          success: false,
          error: 'NO_STAFF_PROFILE',
          errorMessage: 'No staff profile linked to this account',
        }
      }
      
      if (!staffVerification.isActive) {
        // Requirement 1.3 - Deny access if staff is inactive
        await this.logAuthEvent({
          userId: user.id,
          schoolId: school.id,
          eventType: AuthEventType.LOGIN_FAILED,
          identifier: normalizedIdentifier,
          ipAddress,
          userAgent,
          success: false,
          errorCode: 'STAFF_INACTIVE',
        })
        return {
          success: false,
          error: 'STAFF_INACTIVE',
          errorMessage: 'Your account is inactive. Contact administrator',
        }
      }
      
      staffProfile = staffVerification.profile
      
      // Requirement 1.4 - Load primary role for dashboard routing
      if (staffProfile?.primaryRole) {
        staffDashboardPath = this.getStaffDashboardPath(staffProfile.primaryRole)
      }
      
      // Requirement 1.6 - Show role switcher when staff has secondary roles
      showRoleSwitcher = (staffProfile?.secondaryRoles?.length ?? 0) > 0
      
      // Update staff last activity
      await this.updateStaffLastActivity(staffVerification.staffId!)
    }

    // Log successful login - Requirements: 7.3
    await this.logAuthEvent({
      userId: user.id,
      schoolId: school.id,
      eventType: AuthEventType.LOGIN_SUCCESS,
      identifier: normalizedIdentifier,
      ipAddress,
      userAgent,
      success: true,
      metadata: { roles, activeRole, staffProfile: staffProfile ? { id: staffProfile.id, primaryRole: staffProfile.primaryRole } : undefined },
    })

    // Get dashboard path for the active role
    // Requirements: 3.2 - Auto-redirect for single role
    // Use staff dashboard path if available, otherwise use role-based path
    const dashboardPath = staffDashboardPath || roleResolutionService.getDashboardPath(activeRole)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        schoolId: school.id,
        schoolCode: school.code,
        schoolName: school.name,
        roles,
        activeRole,
        licenseType: school.licenseType as LicenseType,
      },
      requiresRoleSelection,
      availableRoles: roles,
      dashboardPath,
      staffProfile,
      showRoleSwitcher,
    }
  }


  /**
   * Authenticate Super Admin without school context
   * Requirements: 5.1, 5.3, 7.3
   */
  private async authenticateSuperAdmin(identifier: string, password: string, ipAddress: string = 'unknown', userAgent?: string): Promise<AuthResult> {
    // Find Super Admin user (no schoolId)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier }, // Phone numbers don't need case-insensitive matching
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
        schoolId: null, // Super Admin has no school
        role: Role.SUPER_ADMIN,
      },
    })

    // User not found - return generic error
    if (!user) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILED,
        identifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'SUPER_ADMIN_NOT_FOUND',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if user is active
    if (!user.isActive) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'USER_INACTIVE',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'ACCOUNT_LOCKED',
      })
      return {
        success: false,
        error: 'ACCOUNT_LOCKED',
      }
    }

    // Verify password
    if (!user.passwordHash) {
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'NO_PASSWORD_SET',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await this.recordFailedAttempt(user.id)
      // Log failed attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        eventType: AuthEventType.LOGIN_FAILED,
        identifier,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'INVALID_PASSWORD',
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Clear failed attempts on successful login
    await this.clearFailedAttempts(user.id)

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Log successful login - Requirements: 7.3
    await this.logAuthEvent({
      userId: user.id,
      eventType: AuthEventType.LOGIN_SUCCESS,
      identifier,
      ipAddress,
      userAgent,
      success: true,
      metadata: { role: Role.SUPER_ADMIN },
    })

    // Get dashboard path for Super Admin
    // Requirements: 5.2 - Redirect to Super Admin Console
    const dashboardPath = roleResolutionService.getDashboardPath(Role.SUPER_ADMIN)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        schoolId: undefined, // Super Admin has no school
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      requiresRoleSelection: false,
      availableRoles: [Role.SUPER_ADMIN],
      dashboardPath,
    }
  }

  /**
   * Find user by email, phone, or username within a specific school
   * Requirements: 2.3, 2.4, 2.5
   */
  private async findUserByIdentifierInSchool(identifier: string, schoolId: string) {
    return prisma.user.findFirst({
      where: {
        schoolId,
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier }, // Phone numbers don't need case-insensitive matching
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    })
  }

  /**
   * Record failed login attempt for rate limiting
   * Requirements: 7.1, 7.2
   */
  private async recordFailedAttempt(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedAttempts: true },
    })

    const newAttempts = (user?.failedAttempts ?? 0) + 1
    const maxAttempts = 5
    const lockoutDurationMs = 15 * 60 * 1000 // 15 minutes

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: newAttempts,
        lockedUntil: newAttempts >= maxAttempts 
          ? new Date(Date.now() + lockoutDurationMs)
          : null,
      },
    })
  }

  /**
   * Clear failed login attempts on successful login
   */
  private async clearFailedAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
  }

  // ============================================
  // STAFF PROFILE VERIFICATION METHODS
  // Requirements: 1.1, 1.2, 1.3, 1.4, 1.6
  // ============================================

  /**
   * Verify staff profile linkage and status
   * Requirements: 1.1 - Verify user is linked to active Staff profile
   * Requirements: 1.2 - Check if staff profile exists
   * Requirements: 1.3 - Check staff status (active/inactive)
   * Requirements: 1.4 - Load primary role for dashboard routing
   * Requirements: 1.6 - Load secondary roles for role switcher
   */
  async verifyStaffProfile(userId: string, schoolId: string): Promise<{
    hasProfile: boolean
    isActive: boolean
    staffId?: string
    profile?: StaffProfileInfo
  }> {
    const staff = await prisma.staff.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
        status: true,
        department: true,
        lastActivityAt: true,
        role: true,
      },
    })

    if (!staff) {
      return {
        hasProfile: false,
        isActive: false,
      }
    }

    const isActive = staff.status === StaffStatus.ACTIVE

    const profile: StaffProfileInfo = {
      id: staff.id,
      employeeNumber: staff.employeeNumber,
      firstName: staff.firstName,
      lastName: staff.lastName,
      primaryRole: (staff.primaryRole as StaffRole) || (staff.role as Role),
      secondaryRoles: (staff.secondaryRoles as (StaffRole | Role)[]) || [],
      status: staff.status as StaffStatus,
      department: staff.department || undefined,
      lastActivityAt: staff.lastActivityAt || undefined,
    }

    return {
      hasProfile: true,
      isActive,
      staffId: staff.id,
      profile,
    }
  }

  /**
   * Update staff last activity timestamp
   * Called on successful login to track staff activity
   */
  private async updateStaffLastActivity(staffId: string): Promise<void> {
    try {
      await prisma.staff.update({
        where: { id: staffId },
        data: { lastActivityAt: new Date() },
      })
    } catch (error) {
      // Log error but don't fail the authentication flow
      console.error('Failed to update staff last activity:', error)
    }
  }

  /**
   * Get dashboard path for staff role
   * Requirements: 1.4 - Load dashboard corresponding to primary role
   */
  private getStaffDashboardPath(role: StaffRole | Role): string {
    const staffDashboardPaths: Record<string, string> = {
      [StaffRole.CLASS_TEACHER]: '/dashboard/classes',
      [StaffRole.DOS]: '/dashboard/dos',
      [StaffRole.HOSTEL_STAFF]: '/dashboard/hostel',
      [StaffRole.SUPPORT_STAFF]: '/dashboard/tasks',
      [StaffRole.BURSAR]: '/dashboard/fees',
      [Role.TEACHER]: '/dashboard/classes',
      [Role.SCHOOL_ADMIN]: '/dashboard',
      [Role.DEPUTY]: '/dashboard',
      [Role.ACCOUNTANT]: '/dashboard/fees',
    }

    return staffDashboardPaths[role] || '/dashboard'
  }

  /**
   * Check if a user has a valid staff profile
   * Utility method for external use
   * Requirements: 1.1 - Staff profile verification
   */
  async hasValidStaffProfile(userId: string, schoolId: string): Promise<boolean> {
    const verification = await this.verifyStaffProfile(userId, schoolId)
    return verification.hasProfile && verification.isActive
  }

  /**
   * Get staff profile for a user
   * Returns null if no profile exists or profile is inactive
   * Requirements: 1.1, 1.2, 1.3
   */
  async getStaffProfileForUser(userId: string, schoolId: string): Promise<StaffProfileInfo | null> {
    const verification = await this.verifyStaffProfile(userId, schoolId)
    
    if (!verification.hasProfile || !verification.isActive) {
      return null
    }
    
    return verification.profile || null
  }


  /**
   * Switch active role for multi-role users
   * Requirements: 3.4, 3.5, 3.6, 7.3
   */
  async switchRole(userId: string, newRole: Role, schoolId?: string, ipAddress: string = 'unknown', userAgent?: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
            licenseType: true,
          },
        },
      },
    })

    if (!user) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Get user roles
    const roles = user.roles && user.roles.length > 0 
      ? user.roles as Role[]
      : [user.role as Role]

    // Validate user has the claimed role
    // Requirements: 3.4
    if (!roles.includes(newRole)) {
      // Log failed role switch attempt - Requirements: 7.3
      await this.logAuthEvent({
        userId: user.id,
        schoolId: user.school?.id,
        eventType: AuthEventType.ROLE_SWITCH,
        identifier: user.email,
        ipAddress,
        userAgent,
        success: false,
        errorCode: 'ROLE_NOT_ASSIGNED',
        metadata: { attemptedRole: newRole, assignedRoles: roles },
      })
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
      }
    }

    // Update active role
    await prisma.user.update({
      where: { id: userId },
      data: { activeRole: newRole },
    })

    // Log successful role switch - Requirements: 7.3
    await this.logAuthEvent({
      userId: user.id,
      schoolId: user.school?.id,
      eventType: AuthEventType.ROLE_SWITCH,
      identifier: user.email,
      ipAddress,
      userAgent,
      success: true,
      metadata: { previousRole: user.activeRole, newRole },
    })

    // Get dashboard path for the new role
    // Requirements: 3.5 - Load corresponding dashboard and permissions
    const dashboardPath = roleResolutionService.getDashboardPath(newRole)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        schoolId: user.school?.id,
        schoolCode: user.school?.code,
        schoolName: user.school?.name,
        roles,
        activeRole: newRole,
        licenseType: user.school?.licenseType as LicenseType,
      },
      requiresRoleSelection: false,
      availableRoles: roles,
      dashboardPath,
    }
  }

  /**
   * Log user logout event
   * Requirements: 7.3
   */
  async logout(userId: string, ipAddress: string = 'unknown', userAgent?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
      },
    })

    if (user) {
      await this.logAuthEvent({
        userId: user.id,
        schoolId: user.schoolId ?? undefined,
        eventType: AuthEventType.LOGOUT,
        identifier: user.email,
        ipAddress,
        userAgent,
        success: true,
      })
    }
  }

  // ============================================
  // LEGACY METHODS (kept for backward compatibility)
  // ============================================

  /**
   * Generate a unique username based on email
   */
  private generateUsername(email: string, schoolId: string): string {
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const schoolSuffix = schoolId.slice(-6) // Last 6 chars of schoolId for uniqueness
    return `${emailPrefix}.${schoolSuffix}`
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserInput): Promise<User> {
    try {
      const passwordHash = await hashPassword(data.password)
      
      // Generate unique username to avoid constraint violations
      const username = this.generateUsername(data.email, data.schoolId)

      const user = await prisma.user.create({
        data: {
          schoolId: data.schoolId,
          email: data.email,
          phone: data.phone,
          username,
          passwordHash,
          role: data.role,
          roles: [data.role], // Initialize roles array with primary role
          isActive: true,
        },
      })

      return mapPrismaUserToDomain(user)
    } catch (error) {
      // Convert technical errors to user-friendly messages
      const userError = getUserFriendlyError(error)
      throw new Error(userError.message)
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) return null
    return mapPrismaUserToDomain(user)
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: { email },
    })

    if (!user) return null
    return mapPrismaUserToDomain(user)
  }
}

// Export singleton instance
export const authService = new AuthService()
