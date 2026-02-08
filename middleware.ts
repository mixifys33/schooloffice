/**
 * Next.js Middleware for Super Admin Route Protection
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * This middleware:
 * - Checks authentication for super admin routes
 * - Redirects unauthorized users
 * - Logs authentication failures
 * - Enforces SUPER_ADMIN role requirement
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { Role } from '@/types/enums'

/**
 * Super Admin protected routes
 * All routes starting with these paths require SUPER_ADMIN role
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
 * Middleware function to protect super admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the route requires super admin access
  const requiresSuperAdmin = SUPER_ADMIN_ROUTES.some(route => 
    pathname.startsWith(route)
  )

  if (!requiresSuperAdmin) {
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

    // Check if user has SUPER_ADMIN role
    if (token.role !== Role.SUPER_ADMIN && token.activeRole !== Role.SUPER_ADMIN) {
      logAuthenticationFailure(
        request, 
        token.id as string, 
        token.email as string, 
        'Insufficient permissions - not SUPER_ADMIN'
      )
      
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            error: 'Forbidden', 
            message: 'Super Admin access required',
            code: 'SUPER_ADMIN_REQUIRED'
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
 */
export const config = {
  matcher: [
    '/super-admin/:path*',
    '/dashboard/super-admin/:path*',
    '/api/super-admin/:path*'
  ]
}