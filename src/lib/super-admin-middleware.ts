/**
 * Super Admin API Middleware
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Provides middleware functions for protecting super admin API routes
 * with proper authentication, authorization, and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'

/**
 * Authentication failure logging
 * Requirements: 12.5
 */
export function logSuperAdminAuthFailure(
  request: NextRequest,
  userId?: string,
  email?: string,
  reason?: string
) {
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  
  console.warn('Super Admin API authentication failure:', {
    timestamp: new Date().toISOString(),
    userId,
    email,
    path: request.nextUrl.pathname,
    method: request.method,
    ip,
    userAgent,
    reason
  })
}

/**
 * Super Admin API authentication result
 */
export interface SuperAdminApiAuth {
  user: {
    id: string
    email: string
    role: Role
    activeRole: Role
  }
}

/**
 * Authenticate and authorize super admin for API routes
 * Requirements: 12.1, 12.2, 12.4
 */
export async function authenticateSuperAdminApi(
  request: NextRequest
): Promise<SuperAdminApiAuth | NextResponse> {
  try {
    const session = await auth()
    
    // Check if user is authenticated
    if (!session?.user) {
      logSuperAdminAuthFailure(request, undefined, undefined, 'No session')
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Authentication required',
          code: 'UNAUTHENTICATED'
        },
        { status: 401 }
      )
    }

    // Check if user has SUPER_ADMIN role
    if (session.user.role !== Role.SUPER_ADMIN && session.user.activeRole !== Role.SUPER_ADMIN) {
      logSuperAdminAuthFailure(
        request,
        session.user.id,
        session.user.email,
        'Insufficient permissions - not SUPER_ADMIN'
      )
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Super Admin access required',
          code: 'SUPER_ADMIN_REQUIRED'
        },
        { status: 403 }
      )
    }

    // Return authenticated user info
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        activeRole: session.user.activeRole
      }
    }

  } catch (error) {
    console.error('Super Admin API authentication error:', error)
    logSuperAdminAuthFailure(request, undefined, undefined, `Authentication error: ${error}`)
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * Higher-order function to wrap API route handlers with super admin authentication
 * Requirements: 12.1, 12.2, 12.4, 12.5
 * 
 * Usage:
 * export const GET = withSuperAdminApiAuth(async (auth, request) => {
 *   // Your API logic here
 *   // auth.user contains authenticated super admin info
 * })
 */
export function withSuperAdminApiAuth<T extends any[]>(
  handler: (auth: SuperAdminApiAuth, request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateSuperAdminApi(request)
    
    // If authentication failed, return the error response
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    // Authentication successful, call the handler
    try {
      return await handler(authResult, request, ...args)
    } catch (error) {
      console.error('Super Admin API handler error:', error)
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Request failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate super admin permissions for specific operations
 * Requirements: 12.4
 */
export function validateSuperAdminOperation(
  auth: SuperAdminApiAuth,
  operation: string,
  resourceId?: string
): boolean {
  // Log the operation attempt
  console.info('Super Admin operation:', {
    timestamp: new Date().toISOString(),
    userId: auth.user.id,
    email: auth.user.email,
    operation,
    resourceId
  })
  
  // All operations are allowed for super admin
  // This function can be extended for more granular permissions if needed
  return true
}

/**
 * Create audit log entry for super admin operations
 * Requirements: 12.5
 */
export function logSuperAdminOperation(
  auth: SuperAdminApiAuth,
  operation: string,
  resourceId?: string,
  success: boolean = true,
  details?: Record<string, any>
) {
  console.info('Super Admin operation audit:', {
    timestamp: new Date().toISOString(),
    userId: auth.user.id,
    email: auth.user.email,
    operation,
    resourceId,
    success,
    details
  })
}