/**
 * Next.js Middleware for Role-Based Route Protection
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * This middleware:
 * - Checks authentication for all dashboard routes
 * - Enforces role-based access control
 * - Redirects unauthorized users
 * - Logs authentication failures
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Role, StaffRole } from '@/types/enums'

/**
 * Role-based route protection mapping
 * Each route pattern maps to allowed roles
 */
const ROLE_ROUTES: Record<string, (Role | StaffRole)[]> = {
  '/super-admin': [Role.SUPER_ADMIN],
  '/dashboard/super-admin': [Role.SUPER_ADMIN],
  '/api/super-admin': [Role.SUPER_ADMIN],
  
  '/dos': [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS],
  '/api/dos': [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS],
  
  '/dashboard/class-teacher': [StaffRole.CLASS_TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  '/api/class-teacher': [StaffRole.CLASS_TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  
  '/dashboard/teacher': [Role.TEACHER, StaffRole.CLASS_TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  '/api/teacher': [Role.TEACHER, StaffRole.CLASS_TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  
  '/dashboard/bursar': [StaffRole.BURSAR, Role.SCHOOL_ADMIN, Role.DEPUTY],
  '/api/bursar': [StaffRole.BURSAR, Role.SCHOOL_ADMIN, Role.DEPUTY],
  
  '/dashboard/students': [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS, StaffRole.CLASS_TEACHER, Role.TEACHER],
  '/api/students': [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS, StaffRole.CLASS_TEACHER, Role.TEACHER],
  
  '/dashboard/parent': [Role.PARENT],
  '/api/parent': [Role.PARENT],
  
  '/dashboard/student': [Role.STUDENT],
  '/api/student': [Role.STUDENT],
}

/**
 * Super Admin protected routes (backward compatibility)
 */
const SUPER_ADMIN_ROUTES = [
  '/super-admin',
  '/dashboard/super-admin',
  '/api/super-admin'
]

/**
 * Log authentication failure for audit purposes
 * Requirements: 12.5
 */
function logAuthenticationFailure(
  request: NextRequest,
  userId?: string,
  email?: string,
  reason?: string
) {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  console.warn('Super Admin authentication failure:', {
    timestamp: new Date().toISOString(),
    userId,
    email,
    path: request.nextUrl.pathname,
    ip,
    userAgent,
    reason
  })
}

/**
 * Check if user has required role for a route
 */
function hasRequiredRole(
  userRole: Role | StaffRole | undefined,
  userActiveRole: Role | StaffRole | undefined,
  allowedRoles: (Role | StaffRole)[]
): boolean {
  if (!userRole) return false
  
  // Check active role first (takes precedence)
  if (userActiveRole && allowedRoles.includes(userActiveRole)) {
    return true
  }
  
  // Check primary role
  if (allowedRoles.includes(userRole)) {
    return true
  }
  
  return false
}

/**
 * Middleware function to protect all dashboard routes with role-based access
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Find matching route pattern
  let matchedRoute: string | null = null
  let allowedRoles: (Role | StaffRole)[] = []
  
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      matchedRoute = route
      allowedRoles = roles
      break
    }
  }

  // If no protected route matched, allow access
  if (!matchedRoute) {
    return NextResponse.next()
  }

  try {
    // Get the JWT token directly (edge-compatible)
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    // If no token, redirect to login (for UI routes) or return 401 (for API routes)
    if (!token?.id) {
      logAuthenticationFailure(request, undefined, undefined, 'No authentication token')
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
      
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has required role
    const userRole = token.role as Role | StaffRole
    const userActiveRole = token.activeRole as Role | StaffRole
    
    if (!hasRequiredRole(userRole, userActiveRole, allowedRoles)) {
      const roleDisplay = userActiveRole || userRole
      logAuthenticationFailure(
        request, 
        token.id as string, 
        token.email as string, 
        `Insufficient permissions - ${roleDisplay} not in ${allowedRoles.join(', ')}`
      )
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            error: 'Forbidden', 
            message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
            code: 'INSUFFICIENT_PERMISSIONS',
            userRole: roleDisplay,
            requiredRoles: allowedRoles
          },
          { status: 403 }
        )
      }
      
      // Redirect to access denied page
      const accessDeniedUrl = new URL('/dashboard/access-denied', request.url)
      return NextResponse.redirect(accessDeniedUrl)
    }

    // Allow access
    return NextResponse.next()

  } catch (error) {
    console.error('Middleware authentication error:', error)
    logAuthenticationFailure(request, undefined, undefined, `Authentication error: ${error}`)
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication failed' },
        { status: 500 }
      )
    }
    
    // Redirect to login on error
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

/**
 * Matcher configuration for middleware
 * Protects all dashboard sections and their API endpoints
 */
export const config = {
  matcher: [
    // Super Admin routes
    '/super-admin/:path*',
    '/dashboard/super-admin/:path*',
    '/api/super-admin/:path*',
    
    // DoS routes
    '/dos/:path*',
    '/api/dos/:path*',
    
    // Class Teacher routes
    '/dashboard/class-teacher/:path*',
    '/api/class-teacher/:path*',
    
    // Teacher routes
    '/dashboard/teacher/:path*',
    '/api/teacher/:path*',
    
    // Bursar routes
    '/dashboard/bursar/:path*',
    '/api/bursar/:path*',
    
    // Students routes (all students management)
    '/dashboard/students/:path*',
    '/api/students/:path*',
    
    // Parent routes
    '/dashboard/parent/:path*',
    '/api/parent/:path*',
    
    // Student routes (individual student portal)
    '/dashboard/student/:path*',
    '/api/student/:path*',
  ]
}