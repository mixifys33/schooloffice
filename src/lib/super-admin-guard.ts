/**
 * Super Admin Guard
 * Helper functions for enforcing Super Admin operation restrictions in API routes
 * Requirements: 5.5, 5.6
 */
import { NextResponse } from 'next/server'
import { Role } from '@/types/enums'

/**
 * Restricted operations that Super Admin cannot perform
 * Requirements: 5.5
 */
export type RestrictedResource = 
  | 'marks'
  | 'discipline'
  | 'fees'
  | 'attendance'
  | 'student-payment'

/**
 * Error response for Super Admin restricted operations
 */
export interface SuperAdminRestrictionError {
  error: string
  message: string
  code: string
  suggestion: string
}

/**
 * Get restriction error message for a resource
 */
function getRestrictionMessage(resource: RestrictedResource): SuperAdminRestrictionError {
  const messages: Record<RestrictedResource, SuperAdminRestrictionError> = {
    marks: {
      error: 'Forbidden',
      message: 'Super Admin cannot enter or modify marks directly.',
      code: 'SUPER_ADMIN_MARKS_RESTRICTED',
      suggestion: 'Use the Super Admin Console to view marks or contact School Admin.',
    },
    discipline: {
      error: 'Forbidden',
      message: 'Super Admin cannot edit student discipline records directly.',
      code: 'SUPER_ADMIN_DISCIPLINE_RESTRICTED',
      suggestion: 'Contact School Admin to handle discipline records.',
    },
    fees: {
      error: 'Forbidden',
      message: 'Super Admin cannot modify fee records directly.',
      code: 'SUPER_ADMIN_FEES_RESTRICTED',
      suggestion: 'Contact School Admin to manage fee structures and payments.',
    },
    attendance: {
      error: 'Forbidden',
      message: 'Super Admin cannot record attendance directly.',
      code: 'SUPER_ADMIN_ATTENDANCE_RESTRICTED',
      suggestion: 'Contact School Admin or Teacher to record attendance.',
    },
    'student-payment': {
      error: 'Forbidden',
      message: 'Super Admin cannot modify student payment records directly.',
      code: 'SUPER_ADMIN_PAYMENT_RESTRICTED',
      suggestion: 'Contact School Admin to manage student payments.',
    },
  }

  return messages[resource]
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(userRole: string | Role): boolean {
  return userRole === Role.SUPER_ADMIN || userRole === 'SUPER_ADMIN'
}

/**
 * Check if Super Admin is allowed to perform a write operation on a resource
 * Returns null if allowed, or an error response if restricted
 * Requirements: 5.5
 */
export function checkSuperAdminWriteRestriction(
  userRole: string | Role,
  resource: RestrictedResource,
  method: string
): NextResponse | null {
  // Only check for Super Admin
  if (!isSuperAdmin(userRole)) {
    return null // Not Super Admin, no restriction
  }

  // Only restrict write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    return null // Read operations are allowed
  }

  // Return restriction error
  const errorMessage = getRestrictionMessage(resource)
  return NextResponse.json(errorMessage, { status: 403 })
}

/**
 * Guard function for API routes - checks Super Admin restrictions
 * Use at the beginning of API route handlers
 * Requirements: 5.5
 */
export function guardSuperAdminWrite(
  session: { user: { role: string | Role } } | null,
  resource: RestrictedResource,
  method: string
): NextResponse | null {
  if (!session?.user) {
    return null // Let other auth checks handle this
  }

  return checkSuperAdminWriteRestriction(session.user.role, resource, method)
}

/**
 * Check if Super Admin can perform teacher-specific operations
 * Requirements: 5.5 - Block Super Admin from acting as teacher
 */
export function canActAsTeacher(userRole: string | Role): boolean {
  return !isSuperAdmin(userRole)
}

/**
 * Check if Super Admin can perform parent-specific operations
 * Requirements: 5.5 - Block Super Admin from acting as parent
 */
export function canActAsParent(userRole: string | Role): boolean {
  return !isSuperAdmin(userRole)
}

/**
 * Get list of all restricted resources for Super Admin
 */
export function getRestrictedResources(): RestrictedResource[] {
  return ['marks', 'discipline', 'fees', 'attendance', 'student-payment']
}

/**
 * Check if a resource is restricted for Super Admin write operations
 */
export function isRestrictedResource(resource: string): resource is RestrictedResource {
  return getRestrictedResources().includes(resource as RestrictedResource)
}
