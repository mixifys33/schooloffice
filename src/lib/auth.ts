/**
 * NextAuth.js Configuration
 * Implements authentication with JWT strategy and school-first flow
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 5.1
 */
import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { Role, LicenseType, AuthEventType } from '@/types/enums'
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
      role: Role
      roles: Role[]
      activeRole: Role
      schoolId?: string
      schoolCode?: string
      schoolName?: string
      licenseType?: LicenseType
    }
  }
  interface User {
    id: string
    email: string
    role: Role
    roles: Role[]
    activeRole: Role
    schoolId?: string
    schoolCode?: string
    schoolName?: string
    licenseType?: LicenseType
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    role: Role
    roles: Role[]
    activeRole: Role
    schoolId?: string
    schoolCode?: string
    schoolName?: string
    licenseType?: LicenseType
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
export function getDashboardPath(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return '/super-admin'
    case Role.SCHOOL_ADMIN:
      return '/dashboard'
    case Role.DEPUTY:
      return '/dashboard'
    case Role.TEACHER:
      return '/dashboard/classes'
    case Role.ACCOUNTANT:
      return '/dashboard/fees'
    case Role.PARENT:
      return '/parent'
    case Role.STUDENT:
      return '/student'
    default:
      return '/dashboard'
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
        const user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            OR: [
              { email: identifier },
              { phone: identifier },
              { username: identifier },
            ],
          },
        })

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
        const roles = user.roles && user.roles.length > 0
          ? user.roles as Role[]
          : [user.role as Role]
        const activeRole = (user.activeRole as Role) || roles[0]

        // Log successful login
        // Requirements: 7.3
        await logAuthEvent({
          userId: user.id,
          schoolId: school.id,
          eventType: AuthEventType.LOGIN_SUCCESS,
          identifier,
          ipAddress,
          success: true,
          metadata: { roles, activeRole },
        })

        return {
          id: user.id,
          email: user.email,
          role: activeRole,
          roles,
          activeRole,
          schoolId: school.id,
          schoolCode: school.code,
          schoolName: school.name,
          licenseType: school.licenseType as LicenseType,
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
        }
      }
      return session
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
  // Use case-insensitive search for email
  const lowerIdentifier = identifier.toLowerCase()
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: lowerIdentifier },
        { phone: identifier },
        { username: lowerIdentifier },
      ],
      schoolId: null, // Super Admin has no school - Requirements: 5.3
      role: Role.SUPER_ADMIN,
    },
  })

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
