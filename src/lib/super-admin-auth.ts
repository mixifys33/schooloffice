/**
 * Super Admin Authentication Utilities
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Provides server-side authentication and authorization utilities
 * for super admin operations in API routes and server components.
 */

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'

/**
 * Authentication error types
 */
export class SuperAdminAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'SuperAdminAuthError'
  }
}

/**
 * Authentication result interface
 */
export interface SuperAdminAuthResult {
  user: {
    id: string
    email: string
    role: Role
    activeRole: Role
  }
}

/**
 * Log authentication failure for audit purposes
 * Requirements: 12.5
 */
export function logSuperAdminAuthFailure(
  userId?: string,
  email?: string,
  reason?: string,
  path?: string,
  ip?: string
) {
  console.warn('Super Admin authentication failure:', {
    timestamp: new Date().toISOString(),
    userId,
    email,
    path,
    ip,
    reason
  })
}

/**
 * Verify super admin authentication and authorization
 * Requirements: 12.1, 12.2, 12.4
 * 
 * @param request - Optional NextRequest for logging context
 * @returns Promise<SuperAdminAuthResult> - Authenticated user info
 * @throws SuperAdminAuthError - If authentication or authorization fails
 */
export async function requireSuperAdmin(
  request?: NextRequest
): Promise<SuperAdminAuthResult> {
  const session = await auth()
  
  const path = request?.nextUrl?.pathname
  const ip = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown'

  // Check if user is authenticated
  if (!session?.user) {
    logSuperAdminAuthFailure(undefined, undefined, 'No session', path, ip)
    throw new SuperAdminAuthError(
      'Authentication required',
      'UNAUTHENTICATED',
      401
    )
  }

  // Check if user has SUPER_ADMIN role
  if (session.user.role !== Role.SUPER_ADMIN && session.user.activeRole !== Role.SUPER_ADMIN) {
    logSuperAdminAuthFailure(
      session.user.id,
      session.user.email,
      'Insufficient permissions - not SUPER_ADMIN',
      path,
      ip
    )
    throw new SuperAdminAuthError(
      'Super Admin access required',
      'INSUFFICIENT_PERMISSIONS',
      403
    )
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      activeRole: session.user.activeRole
    }
  }
}

/**
 * Check if current user is a super admin (non-throwing version)
 * Requirements: 12.2
 * 
 * @returns Promise<boolean> - True if user is super admin, false otherwise
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin()
    return true
  } catch {
    return false
  }
}

/**
 * Middleware-compatible super admin check
 * Requirements: 12.1, 12.2, 12.3
 * 
 * @param request - NextRequest object
 * @returns Promise<SuperAdminAuthResult | null> - User info if authorized, null if not
 */
export async function checkSuperAdminAccess(
  request: NextRequest
): Promise<SuperAdminAuthResult | null> {
  try {
    return await requireSuperAdmin(request)
  } catch (error) {
    // Error already logged in requireSuperAdmin
    return null
  }
}

/**
 * API route wrapper for super admin authentication
 * Requirements: 12.1, 12.2, 12.4, 12.5
 * 
 * @param handler - API route handler function
 * @returns Wrapped handler with authentication
 */
export function withSuperAdminAuth<T extends any[]>(
  handler: (auth: SuperAdminAuthResult, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const authResult = await requireSuperAdmin(request)
      return await handler(authResult, ...args)
    } catch (error) {
      if (error instanceof SuperAdminAuthError) {
        return new Response(
          JSON.stringify({
            error: error.code === 'UNAUTHENTICATED' ? 'Unauthorized' : 'Forbidden',
            message: error.message,
            code: error.code
          }),
          {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Unexpected error
      console.error('Unexpected authentication error:', error)
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'Authentication failed'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

/**
 * Get super admin user info (for use in server components)
 * Requirements: 12.1, 12.2
 * 
 * @returns Promise<SuperAdminAuthResult | null> - User info if authorized, null if not
 */
export async function getSuperAdminUser(): Promise<SuperAdminAuthResult | null> {
  try {
    return await requireSuperAdmin()
  } catch {
    return null
  }
}