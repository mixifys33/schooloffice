/**
 * NextAuth.js Configuration
 * Implements authentication with JWT strategy and school-first flow
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 5.1
 */
import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { Role, LicenseType, AuthEventType, StaffRole } from '@/types/enums'
import { SESSION_CONFIG, isSessionInactive } from '@/lib/session-config'

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

export class SubscriptionExpiredError extends CredentialsSignin {
  code = 'subscription_expired'
  message = 'Subscription expired. Please contact support.'
}

export class SchoolSuspendedError extends CredentialsSignin {
  code = 'school_suspended'
  message = 'Account suspended. Please contact support.'
}

export class AccountLockedError extends CredentialsSignin {
  code = 'account_locked'
  message = 'Account temporarily locked. Please try again later.'
}

// ============================================
// TYPE DECLARATIONS
// ============================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: Role | StaffRole
      roles: (Role | StaffRole)[]
      activeRole: Role | StaffRole
      schoolId?: string
      schoolCode?: string
      schoolName?: string
      licenseType?: LicenseType
      forcePasswordReset?: boolean
    }
  }
  interface User {
    id: string
    email: string
    role: Role | StaffRole
    roles: (Role | StaffRole)[]
    activeRole: Role | StaffRole
    schoolId?: string
    schoolCode?: string
    schoolName?: string
    licenseType?: LicenseType
    forcePasswordReset?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    role: Role | StaffRole
    roles: (Role | StaffRole)[]
    activeRole: Role | StaffRole
    schoolId?: string
    schoolCode?: string
    schoolName?: string
    licenseType?: LicenseType
    forcePasswordReset?: boolean
    lastActivity?: number // Timestamp of last activity for inactivity timeout
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Log authentication event for audit
 * Requirements: 7.3
 */
async function logAuthEvent(event: {
  userId?: string
  schoolId?: string
  eventType: AuthEventType
  identifier: string
  ipAddress: string
  userAgent?: string
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
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        errorCode: event.errorCode,
        metadata: event.metadata,
      },
    })
  } catch (error) {
    console.error('Failed to log auth event:', error)
  }
}

/**
 * Record failed login attempt for rate limiting
 * Requirements: 7.1, 7.2
 */
async function recordFailedAttempt(userId: string): Promise<void> {
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
      lockedUntil: newAttempts >= maxAttempts ? new Date(Date.now() + lockoutDurationMs) : null,
    },
  })
}

/**
 * Clear failed login attempts on successful login
 */
async function clearFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null },
  })
}

/**
 * Get dashboard path based on role
 * Requirements: 3.2, 4.1, 4.2, 4.3, 4.4, 5.2
 * - Requirement 4.1: School_Admin → school overview, setup menus, reports, finance
 * - Requirement 4.2: Teacher → classes, attendance, marks, timetable
 * - Requirement 4.3: Parent → child list, fees, results, messages
 * - Requirement 4.4: Student → timetable, results, assignments
 * - Requirement 5.2: Super_Admin → Super Admin Console
 */
export function getDashboardPath(role: Role | StaffRole): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/super-admin'
    case Role.SCHOOL_ADMIN:
      return '/dashboard/school-admin'
    case Role.DEPUTY:
      return '/dashboard/school-admin'
    case Role.TEACHER:
      return '/teacher'
    case Role.ACCOUNTANT:
      return '/dashboard/fees'
    case Role.PARENT:
      return '/parent'
    case Role.STUDENT:
      return '/student'
    // Handle StaffRole cases
    case StaffRole.DOS:
      return '/dos'
    case StaffRole.CLASS_TEACHER:
      return '/dashboard/class-teacher'
    case StaffRole.BURSAR:
      return '/dashboard/bursar'
    case StaffRole.HOSTEL_STAFF:
      return '/dashboard/hostel'
    case StaffRole.SUPPORT_STAFF:
      return '/dashboard/support'
    default:
      return '/dashboard/school-admin'
  }
}

// ============================================
// NEXTAUTH CONFIGURATION
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 5.1
// ============================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        schoolCode: { label: 'School Code', type: 'text' },
        identifier: { label: 'Email/Phone/Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null
        }

        const identifier = (credentials.identifier as string).trim().toLowerCase()
        const password = credentials.password as string
        const schoolCode = credentials.schoolCode as string | undefined
        const ipAddress = 'unknown' // In production, extract from request headers

        // Super Admin authentication (no school code required)
        // Requirements: 5.1
        if (!schoolCode || schoolCode.trim() === '') {
          return authenticateSuperAdmin(identifier, password, ipAddress)
        }

        // School-first authentication
        // Requirements: 2.1, 2.2
        const normalizedSchoolCode = normalizeSchoolCode(schoolCode)

        // Validate school code format
        if (!isValidSchoolCodeFormat(normalizedSchoolCode)) {
          await logAuthEvent({
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'INVALID_SCHOOL_CODE_FORMAT',
          })
          return null
        }

        // Find school by code
        // Requirements: 2.2
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

        // School not found - return null (generic error)
        // Requirements: 2.6
        if (!school) {
          await logAuthEvent({
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'SCHOOL_NOT_FOUND',
          })
          return null
        }

        // Check if school is suspended
        if (!school.isActive) {
          await logAuthEvent({
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'SCHOOL_SUSPENDED',
          })
          throw new SchoolSuspendedError()
        }

        // Find user by identifier within school context
        // Requirements: 2.3, 2.4, 2.5
        // Try multiple approaches to handle case sensitivity and special characters
        const lowerIdentifier = identifier.toLowerCase()
        const upperIdentifier = identifier.toUpperCase()
        
        let user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            OR: [
              // Try exact lowercase match first
              { email: lowerIdentifier },
              { username: lowerIdentifier },
              // Try exact uppercase match
              { email: upperIdentifier },
              { username: upperIdentifier },
              // Try exact match as-is
              { email: identifier },
              { username: identifier },
              // Phone numbers - try as-is and cleaned
              { phone: identifier },
              { phone: identifier.replace(/\D/g, '') }, // Remove non-digits
            ],
          },
          include: {
            staff: {
              select: {
                primaryRole: true,
                secondaryRoles: true,
              },
            },
          },
        })

        // If not found with exact matches, try case-insensitive search
        if (!user) {
          try {
            user = await prisma.user.findFirst({
              where: {
                schoolId: school.id,
                OR: [
                  { email: { equals: identifier, mode: 'insensitive' } },
                  { username: { equals: identifier, mode: 'insensitive' } },
                  { phone: identifier },
                ],
              },
              include: {
                staff: {
                  select: {
                    primaryRole: true,
                    secondaryRoles: true,
                  },
                },
              },
            })
          } catch (searchError) {
            // If search still fails, fall back to exact match only
          }
        }

        // User not found - return null (generic error)
        // Requirements: 2.7
        if (!user) {
          await logAuthEvent({
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'USER_NOT_FOUND',
          })
          return null
        }

        // Check if user is active
        if (!user.isActive) {
          await logAuthEvent({
            userId: user.id,
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'USER_INACTIVE',
          })
          return null
        }

        // Check if account is locked
        // Requirements: 7.2
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAuthEvent({
            userId: user.id,
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'ACCOUNT_LOCKED',
          })
          throw new AccountLockedError()
        }

        // Verify password
        if (!user.passwordHash) {
          await logAuthEvent({
            userId: user.id,
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'NO_PASSWORD_SET',
          })
          return null
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash)
        if (!isValidPassword) {
          await recordFailedAttempt(user.id)
          await logAuthEvent({
            userId: user.id,
            schoolId: school.id,
            eventType: AuthEventType.LOGIN_FAILED,
            identifier,
            ipAddress,
            success: false,
            errorCode: 'INVALID_PASSWORD',
          })
          return null
        }

        // Clear failed attempts on successful login
        await clearFailedAttempts(user.id)

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        // Get user roles
        // Requirements: 3.1
        // Combine User roles with Staff roles for comprehensive role management
        const userRoles = user.roles && user.roles.length > 0
          ? user.roles as Role[]
          : [user.role as Role]
        
        // Add staff roles if user has staff record
        const allRoles: (Role | StaffRole)[] = [...userRoles]
        if (user.staff) {
          if (user.staff.primaryRole) {
            allRoles.push(user.staff.primaryRole as StaffRole)
          }
          if (user.staff.secondaryRoles && user.staff.secondaryRoles.length > 0) {
            allRoles.push(...(user.staff.secondaryRoles as StaffRole[]))
          }
        }
        
        // Determine active role - prioritize staff primary role for staff users
        const activeRole = user.staff?.primaryRole 
          ? (user.staff.primaryRole as StaffRole)
          : (user.activeRole as Role) || userRoles[0]

        // Log successful login
        // Requirements: 7.3
        await logAuthEvent({
          userId: user.id,
          schoolId: school.id,
          eventType: AuthEventType.LOGIN_SUCCESS,
          identifier,
          ipAddress,
          success: true,
          metadata: { roles: allRoles, activeRole },
        })

        return {
          id: user.id,
          email: user.email,
          role: activeRole,
          roles: allRoles,
          activeRole,
          schoolId: school.id,
          schoolCode: school.code,
          schoolName: school.name,
          licenseType: school.licenseType as LicenseType,
          forcePasswordReset: user.forcePasswordReset,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role
        token.roles = user.roles
        token.activeRole = user.activeRole
        token.schoolId = user.schoolId
        token.schoolCode = user.schoolCode
        token.schoolName = user.schoolName
        token.licenseType = user.licenseType
        token.forcePasswordReset = user.forcePasswordReset
        token.lastActivity = Date.now() // Set initial activity timestamp
      } else {
        // Check for inactivity timeout
        // Requirements: 7.6 - Require re-authentication after inactivity period
        const lastActivity = token.lastActivity || Date.now()
        
        if (isSessionInactive(lastActivity)) {
          // Session expired due to inactivity - return empty token to force re-auth
          return {} as typeof token
        }
        
        // Update last activity timestamp
        token.lastActivity = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      // If token is empty (expired), return null session
      if (!token.id) {
        return { ...session, user: undefined as any }
      }
      
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          role: token.role,
          roles: token.roles,
          activeRole: token.activeRole,
          schoolId: token.schoolId,
          schoolCode: token.schoolCode,
          schoolName: token.schoolName,
          licenseType: token.licenseType,
          forcePasswordReset: token.forcePasswordReset,
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If redirecting to login page, allow it
      if (url.startsWith(baseUrl + '/login') || url === '/login') {
        return url
      }
      
      // If URL is relative, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      
      // If URL is from same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url
      }
      
      // Default redirect to base URL
      return baseUrl
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_CONFIG.maxAge, // Maximum session lifetime - Requirements: 7.6
    updateAge: SESSION_CONFIG.updateAge, // Update session to track activity
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})

/**
 * Authenticate Super Admin without school context
 * Requirements: 5.1, 5.3
 */
async function authenticateSuperAdmin(
  identifier: string,
  password: string,
  ipAddress: string
) {
  // Find Super Admin user (no schoolId)
  // Try multiple approaches to handle case sensitivity and special characters
  const lowerIdentifier = identifier.toLowerCase()
  const upperIdentifier = identifier.toUpperCase()
  
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        // Try exact lowercase match first
        { email: lowerIdentifier },
        { username: lowerIdentifier },
        // Try exact uppercase match
        { email: upperIdentifier },
        { username: upperIdentifier },
        // Try exact match as-is
        { email: identifier },
        { username: identifier },
        // Phone numbers - try as-is and cleaned
        { phone: identifier },
        { phone: identifier.replace(/\D/g, '') }, // Remove non-digits
      ],
      schoolId: null, // Super Admin has no school - Requirements: 5.3
      role: Role.SUPER_ADMIN,
    },
  })

  // If not found with exact matches, try case-insensitive search with escaped regex
  if (!user) {
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: 'insensitive' } },
            { username: { equals: identifier, mode: 'insensitive' } },
            { phone: identifier },
          ],
          schoolId: null, // Super Admin has no school - Requirements: 5.3
          role: Role.SUPER_ADMIN,
        },
      })
    } catch (regexError) {
      // If regex still fails, fall back to exact match only
      console.warn('Regex search failed for Super Admin, using exact match only:', regexError)
    }
  }

  if (!user) {
    await logAuthEvent({
      eventType: AuthEventType.LOGIN_FAILED,
      identifier,
      ipAddress,
      success: false,
      errorCode: 'SUPER_ADMIN_NOT_FOUND',
    })
    return null
  }

  if (!user.isActive) {
    await logAuthEvent({
      userId: user.id,
      eventType: AuthEventType.LOGIN_FAILED,
      identifier,
      ipAddress,
      success: false,
      errorCode: 'USER_INACTIVE',
    })
    return null
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAuthEvent({
      userId: user.id,
      eventType: AuthEventType.LOGIN_FAILED,
      identifier,
      ipAddress,
      success: false,
      errorCode: 'ACCOUNT_LOCKED',
    })
    throw new AccountLockedError()
  }

  if (!user.passwordHash) {
    await logAuthEvent({
      userId: user.id,
      eventType: AuthEventType.LOGIN_FAILED,
      identifier,
      ipAddress,
      success: false,
      errorCode: 'NO_PASSWORD_SET',
    })
    return null
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash)
  if (!isValidPassword) {
    await recordFailedAttempt(user.id)
    await logAuthEvent({
      userId: user.id,
      eventType: AuthEventType.LOGIN_FAILED,
      identifier,
      ipAddress,
      success: false,
      errorCode: 'INVALID_PASSWORD',
    })
    return null
  }

  await clearFailedAttempts(user.id)

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  await logAuthEvent({
    userId: user.id,
    eventType: AuthEventType.LOGIN_SUCCESS,
    identifier,
    ipAddress,
    success: true,
    metadata: { role: Role.SUPER_ADMIN },
  })

  // Requirements: 5.2 - Super Admin redirects to Super Admin Console
  return {
    id: user.id,
    email: user.email,
    role: Role.SUPER_ADMIN,
    roles: [Role.SUPER_ADMIN],
    activeRole: Role.SUPER_ADMIN,
    schoolId: undefined, // Super Admin has no school
    schoolCode: undefined,
    schoolName: undefined,
    licenseType: undefined,
    forcePasswordReset: user.forcePasswordReset,
  }
}

// ============================================
// BACKWARD COMPATIBILITY EXPORT
// For API routes using getServerSession(authOptions)
// ============================================

/**
 * Auth options for backward compatibility with getServerSession
 * Note: In NextAuth v5, use `auth()` directly instead
 */
export const authOptions = {
  providers: [],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          role: token.role,
          roles: token.roles,
          activeRole: token.activeRole,
          schoolId: token.schoolId,
          schoolCode: token.schoolCode,
          schoolName: token.schoolName,
          licenseType: token.licenseType,
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Higher-order function to protect API routes with authentication
 * Usage: withAuth(handler) or withAuth(handler, { role: 'ADMIN' })
 */
export function withAuth(
  handler: (req: Request, ctx: any) => Promise<Response>,
  options?: {
    role?: Role | StaffRole;
    roles?: (Role | StaffRole)[];
    redirectTo?: string;
  }
) {
  return async (req: Request, ctx: any) => {
    try {
      // Get the auth session using the new NextAuth v5 API
      const session = await auth(req);

      if (!session?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check role permissions if specified
      if (options?.role && session.user.role !== options.role) {
        return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if user has any of the required roles
      if (options?.roles && !options.roles.includes(session.user.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Call the original handler with the session attached
      (req as any).auth = session;
      return handler(req, ctx);
    } catch (error) {
      console.error('Authentication error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
