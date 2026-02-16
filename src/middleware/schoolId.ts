/**
 * SchoolId Middleware - Multi-Tenancy Enforcement
 * 
 * Provides utilities for:
 * 1. Extracting schoolId from session
 * 2. Validating schoolId access
 * 3. Filtering queries by schoolId
 * 4. Injecting schoolId into create operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@prisma/client'

/**
 * Get schoolId from session
 * Throws error if no schoolId found
 */
export async function getSchoolIdFromSession(): Promise<string> {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized: No session found')
  }

  const schoolId = session.user.schoolId

  if (!schoolId) {
    throw new Error('Forbidden: No school context found')
  }

  return schoolId
}

/**
 * Get schoolId from session (returns null if not found)
 * Use this for optional schoolId scenarios
 */
export async function getSchoolIdFromSessionOptional(): Promise<string | null> {
  try {
    return await getSchoolIdFromSession()
  } catch {
    return null
  }
}

/**
 * Check if user is super admin
 * Super admins can access any school's data
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === Role.SUPER_ADMIN
}

/**
 * Validate that a resource belongs to the user's school
 * Throws error if schoolId mismatch (unless super admin)
 */
export async function validateSchoolAccess(
  resourceSchoolId: string | null | undefined,
  customErrorMessage?: string
): Promise<void> {
  // Super admins can access any school
  if (await isSuperAdmin()) {
    return
  }

  const sessionSchoolId = await getSchoolIdFromSession()

  if (!resourceSchoolId) {
    throw new Error('Resource has no school association')
  }

  if (resourceSchoolId !== sessionSchoolId) {
    throw new Error(
      customErrorMessage ||
        'Access denied: This resource belongs to a different school'
    )
  }
}

/**  
 * Add schoolId filter to Prisma where clause
 * Automatically handles super admin access
 */
export async function addSchoolIdFilter<T extends Record<string, unknown>>(
  where: T
): Promise<T> {
  // Super admins see all schools
  if (await isSuperAdmin()) {
    return where
  }

  const schoolId = await getSchoolIdFromSession()

  return {
    ...where,
    schoolId,
  } as T
}

/**
 * Add schoolId to create data
 * Automatically injects schoolId from session
 */
export async function addSchoolIdToData<T extends Record<string, unknown>>(
  data: T
): Promise<T & { schoolId: string }> {
  const schoolId = await getSchoolIdFromSession()

  return {
    ...data,
    schoolId,
  }
}

/**
 * Middleware wrapper for API routes
 * Automatically validates session and injects schoolId
 */
export function withSchoolId<T = unknown>(
  handler: (
    req: NextRequest,
    context: { params: T; schoolId: string }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: T }) => {
    try {
      const schoolId = await getSchoolIdFromSession()

      return await handler(req, { ...context, schoolId })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return NextResponse.json(
            { error: 'Unauthorized', details: error.message },
            { status: 401 }
          )
        }
        if (error.message.includes('Forbidden')) {
          return NextResponse.json(
            { error: 'Forbidden', details: error.message },
            { status: 403 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper with optional schoolId
 * Use for endpoints that work with or without school context
 */
export function withOptionalSchoolId<T = unknown>(
  handler: (
    req: NextRequest,
    context: { params: T; schoolId: string | null }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params: T }) => {
    const schoolId = await getSchoolIdFromSessionOptional()

    return await handler(req, { ...context, schoolId })
  }
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Helper to create success responses
 */
export function createSuccessResponse<T = unknown>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}
