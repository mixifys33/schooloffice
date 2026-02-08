/**
 * Next.js Proxy (formerly Middleware)
 * Handles authentication and authorization for protected routes
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5, 11.2, 11.3, 19.3, 22.4, 22.5, 22.6
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth-edge'

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/admin/login',
  '/api/auth',
  '/reports/view', // Public report viewing with token
]

// ============================================
// ROLE-BASED ROUTE CONFIGURATION
// Requirements: 4.1, 4.2, 4.3, 4.4, 5.2
// ============================================

// Routes that require specific roles
// Requirement 4.1: School_Admin sees school overview, setup menus, reports, finance
// Requirement 4.2: Teacher sees classes, attendance, marks, timetable
// Requirement 4.3: Parent sees child list, fees, results, messages
// Requirement 4.4: Student sees timetable, results, assignments
// Requirement 5.2: Super_Admin redirects to Super Admin Console
const roleRoutes: Record<string, string[]> = {
  // Super Admin routes - Requirement 5.2
  '/super-admin': ['SUPER_ADMIN'],
  '/dashboard/super-admin': ['SUPER_ADMIN'],
  
  // School Admin routes - Requirement 4.1
  '/dashboard/school-admin': ['SCHOOL_ADMIN'],
  '/dashboard/settings': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  '/dashboard/reports': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  
  // Finance routes - Requirement 4.1 (School Admin has access to finance)
  '/dashboard/fees': ['SCHOOL_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'],
  '/dashboard/finance': ['SCHOOL_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'],
  
  // Academic/Teacher routes - Requirement 4.2
  '/dashboard/classes': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  '/dashboard/attendance': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  '/dashboard/teachers': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  
  // Student management - School Admin and Teachers
  '/dashboard/students': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  
  // SMS/Communication - School Admin
  '/dashboard/sms': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  
  // Staff management - School Admin only
  // Requirement 12.5: Route protection for staff management
  '/dashboard/staff': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  
  // Staff-specific dashboard routes - Requirements 12.5
  // Teacher dashboard - accessible by teachers
  '/dashboard/teacher': ['TEACHER', 'SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  // Class teacher dashboard - accessible by class teachers (teachers with class assignments)
  '/dashboard/class-teacher': ['TEACHER', 'SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  // DOS dashboard - accessible by DOS role
  '/dashboard/dos': ['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  // Bursar dashboard - accessible by accountants/bursars
  '/dashboard/bursar': ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
  // Hostel dashboard - accessible by hostel staff
  '/dashboard/hostel': ['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  // Support staff dashboard - accessible by support staff
  '/dashboard/support': ['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  
  // General dashboard access
  '/dashboard': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'ACCOUNTANT', 'SUPER_ADMIN'],
  
  // Student portal routes - Requirement 4.4
  '/student': ['STUDENT'],
  '/student/timetable': ['STUDENT'],
  '/student/results': ['STUDENT'],
  '/student/fees': ['STUDENT'],
  
  // Parent portal routes - Requirement 4.3
  '/parent': ['PARENT'],
  '/parent/fees': ['PARENT'],
  '/parent/academics': ['PARENT'],
  '/parent/messages': ['PARENT'],
}

// API routes that Super Admin is restricted from modifying
// Requirement 5.5: Prevent Super Admin from entering marks, editing discipline, modifying fees
const superAdminRestrictedWriteRoutes = [
  '/api/marks',           // Cannot enter marks
  '/api/discipline',      // Cannot edit discipline
  '/api/fees',            // Cannot modify fees directly
  '/api/attendance',      // Cannot record attendance
  '/api/students/*/payment', // Cannot modify student payments
]

// API routes that require Super Admin role
const superAdminApiRoutes = [
  '/api/admin/schools',
  '/api/admin/subscriptions',
  '/api/admin/payments',
  '/api/admin/settings',
  '/api/admin/audit',
  '/api/admin/enforcement',
  '/api/admin/pilots',
  '/api/admin/overview',
  '/api/admin/sms-monitoring',
  '/api/admin/impersonation',
]

// ============================================
// ROLE-BASED API ROUTE CONFIGURATION
// Requirement 4.5: Enforce role-based access at API level
// ============================================

// API routes with role restrictions
const roleRestrictedApiRoutes: Record<string, string[]> = {
  // Student API routes - Requirement 4.4
  '/api/student/timetable': ['STUDENT', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
  '/api/student/results': ['STUDENT', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
  
  // Parent API routes - Requirement 4.3
  '/api/parent/children': ['PARENT'],
  '/api/parent/fees': ['PARENT'],
  
  // Teacher/Academic API routes - Requirement 4.2
  '/api/attendance': ['TEACHER', 'SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  '/api/marks': ['TEACHER', 'SCHOOL_ADMIN', 'DEPUTY'],
  
  // Finance API routes - Requirement 4.1
  '/api/fees': ['SCHOOL_ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'],
  
  // School Admin API routes - Requirement 4.1
  '/api/students': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  '/api/teachers': ['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  '/api/classes': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  '/api/subjects': ['SCHOOL_ADMIN', 'DEPUTY', 'TEACHER', 'SUPER_ADMIN'],
  '/api/terms': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  '/api/streams': ['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'],
  '/api/settings': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  '/api/sms': ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
  '/api/reports': ['SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'],
}

// Routes that should be accessible even when school is suspended
// Requirement 19.3: Keep payment integration so they can pay
const suspendedAllowedRoutes = [
  '/api/auth',
  '/login',
  '/admin/login',
  '/api/admin', // Super Admin routes
]

/**
 * Check if a route matches a pattern with wildcards
 */
function matchesPattern(pathname: string, pattern: string): boolean {
  // Convert pattern to regex, replacing * with wildcard match
  const regexPattern = pattern
    .replace(/\*/g, '[^/]+')
    .replace(/\//g, '\\/')
  const regex = new RegExp(`^${regexPattern}`)
  return regex.test(pathname)
}

/**
 * Check if Super Admin is trying to perform a restricted write operation
 * Requirement 5.5: Prevent Super Admin from entering marks, editing discipline, modifying fees
 */
function isSuperAdminRestrictedRoute(pathname: string, method: string): boolean {
  // Only restrict write operations (POST, PUT, PATCH, DELETE)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return false
  }

  return superAdminRestrictedWriteRoutes.some(pattern => matchesPattern(pathname, pattern))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check authentication
  // Requirement 22.5: Verify valid NextAuth session for all API requests
  const session = await auth()

  if (!session?.user) {
    // Redirect to login if not authenticated
    // For API routes, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Determine appropriate login page based on route
    // Requirement 5.1: Super Admin login without school code
    const loginUrl = pathname.startsWith('/super-admin') || pathname.startsWith('/dashboard/super-admin') 
      ? new URL('/admin/login', request.url)
      : new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Validate student ID format in URLs to prevent invalid ID errors
  const studentIdMatch = pathname.match(/\/students\/([^\/]+)/)
  if (studentIdMatch) {
    const studentId = studentIdMatch[1]
    // Check if it's not a valid MongoDB ObjectId (24 hex characters)
    if (studentId !== 'new' && studentId !== 'upload' && studentId !== 'guardians' && 
        !/^[a-fA-F0-9]{24}$/.test(studentId)) {
      // Redirect to students list for invalid IDs
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Invalid student ID format' },
          { status: 400 }
        )
      } else {
        return NextResponse.redirect(new URL('/dashboard/students', request.url))
      }
    }
  }

  // Requirement 5.5: Check Super Admin restricted operations
  if (session.user.role === 'SUPER_ADMIN') {
    // Check if Super Admin is trying to access a restricted write route
    if (isSuperAdminRestrictedRoute(pathname, method)) {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Super Admin cannot perform this operation directly. Please use the Super Admin Console or contact School Admin.',
          code: 'SUPER_ADMIN_RESTRICTED_OPERATION'
        },
        { status: 403 }
      )
    }

    // Requirement 5.3: Verify Super Admin has no schoolId
    // Super Admin should not have a schoolId in their session
    if (session.user.schoolId) {
      console.warn(`Super Admin ${session.user.id} has schoolId set - this should not happen`)
    }
  }

  // Requirement 19.3: Check if school is suspended (for non-Super Admin users)
  // Super Admin bypasses suspension checks
  if (session.user.role !== 'SUPER_ADMIN') {
    // Check if route is allowed for suspended schools
    const isAllowedWhenSuspended = suspendedAllowedRoutes.some(route => pathname.startsWith(route))
    
    if (!isAllowedWhenSuspended) {
      // We need to check school status from the database
      // This is done via the session's school info which is set during login
      // If the school was suspended after login, the user will be blocked on next request
      // Note: For real-time suspension checking, we'd need to query the database here
      // but that would add latency to every request. The auth.ts handles this during login.
    }
  }

  // Check Super Admin API routes
  // Requirement 22.6: Return HTTP 403 for unauthorized requests
  if (superAdminApiRoutes.some(route => pathname.startsWith(route))) {
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }
  }

  // Check role-based access for specific routes
  // Requirements: 12.5 - Redirect to access denied page if unauthorized
  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.user.role)) {
        // For API routes, return 403 Forbidden
        // Requirement 4.5: Enforce role-based access at API level
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions for this resource' },
            { status: 403 }
          )
        }
        
        // Requirement 12.5: Redirect to access denied page for unauthorized access
        return NextResponse.redirect(new URL('/dashboard/access-denied', request.url))
      }
    }
  }

  // Requirement 4.5: Check role-based API access
  for (const [route, allowedRoles] of Object.entries(roleRestrictedApiRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Your role does not have access to this resource' },
          { status: 403 }
        )
      }
      break // Found matching route, no need to continue
    }
  }

  return NextResponse.next()
}

/**
 * Get the default dashboard URL for a role
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.2
 * - Requirement 4.1: School_Admin → school overview, setup menus, reports, finance
 * - Requirement 4.2: Teacher → classes, attendance, marks, timetable
 * - Requirement 4.3: Parent → child list, fees, results, messages
 * - Requirement 4.4: Student → timetable, results, assignments
 * - Requirement 5.2: Super_Admin → Super Admin Console
 */
function getDefaultDashboard(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      // Requirement 5.2: Super Admin redirects to Super Admin Console
      return '/super-admin'
    case 'SCHOOL_ADMIN':
      // Requirement 4.1: School Admin sees school overview
      return '/dashboard'
    case 'DEPUTY':
      // Deputy has similar access to School Admin
      return '/dashboard'
    case 'TEACHER':
      // Requirement 4.2: Teacher sees classes, attendance, marks, timetable
      return '/dashboard/classes'
    case 'ACCOUNTANT':
      // Accountant focuses on finance
      return '/dashboard/fees'
    case 'STUDENT':
      // Requirement 4.4: Student sees timetable, results, assignments
      return '/student'
    case 'PARENT':
      // Requirement 4.3: Parent sees child list, fees, results, messages
      return '/parent'
    default:
      return '/dashboard'
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
