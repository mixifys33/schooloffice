/**
 * Finance Access Control
 * Implements role-based access control for finance module operations
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * Property 20: Finance Access Control
 * For any finance module access attempt, the system SHALL verify the user has one of:
 * ACCOUNTANT, SCHOOL_ADMIN, or DEPUTY role. Users with TEACHER role SHALL be denied access.
 * 
 * Property 21: Parent Data Isolation
 * For any parent viewing fee information, the system SHALL only return data for students
 * linked to that parent's guardian record.
 * 
 * Property 22: Reversal Authorization
 * For any payment reversal attempt, the system SHALL verify the user has SCHOOL_ADMIN or higher role.
 */
import { Role } from '@/types/enums'
import { prisma } from '@/lib/db'

// ============================================
// ERROR CODES AND TYPES
// ============================================

export const FINANCE_ACCESS_ERRORS = {
  FINANCE_ACCESS_DENIED: 'FINANCE_ACCESS_DENIED',
  REVERSAL_NOT_AUTHORIZED: 'REVERSAL_NOT_AUTHORIZED',
  RECEIPT_CANCEL_NOT_AUTHORIZED: 'RECEIPT_CANCEL_NOT_AUTHORIZED',
  PARENT_DATA_ACCESS_DENIED: 'PARENT_DATA_ACCESS_DENIED',
  STUDENT_NOT_LINKED: 'STUDENT_NOT_LINKED',
} as const

export class FinanceAccessError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(code: string, message: string, statusCode: number = 403) {
    super(message)
    this.name = 'FinanceAccessError'
    this.code = code
    this.statusCode = statusCode
  }
}

// ============================================
// ROLE DEFINITIONS FOR FINANCE ACCESS
// Requirement 11.1: Verify ACCOUNTANT, SCHOOL_ADMIN, or DEPUTY role for finance access
// ============================================

/**
 * Roles that have full finance module access
 * Requirement 11.1: ACCOUNTANT, SCHOOL_ADMIN, or DEPUTY role for finance access
 */
export const FINANCE_ACCESS_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.DEPUTY,
  Role.ACCOUNTANT,
]

/**
 * Roles that can read finance data (includes parents and students for their own data)
 */
export const FINANCE_READ_ROLES: Role[] = [
  ...FINANCE_ACCESS_ROLES,
  Role.PARENT,
  Role.STUDENT,
]

/**
 * Roles that can write/modify finance data
 */
export const FINANCE_WRITE_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.ACCOUNTANT,
]

/**
 * Roles that can reverse payments
 * Requirement 11.4: Require SCHOOL_ADMIN for payment reversals
 */
export const PAYMENT_REVERSAL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
]

/**
 * Roles that can cancel receipts
 * Requirement 11.5: Require SCHOOL_ADMIN approval for receipt cancellation
 */
export const RECEIPT_CANCEL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
]

// ============================================
// ACCESS CHECK FUNCTIONS
// ============================================

/**
 * Check if a role has access to the finance module
 * Property 20: Finance Access Control
 * Requirement 11.1: Verify ACCOUNTANT, SCHOOL_ADMIN, or DEPUTY role for finance access
 * Requirement 11.2: Teachers SHALL be denied access
 */
export function hasFinanceAccess(role: Role): boolean {
  return FINANCE_ACCESS_ROLES.includes(role)
}

/**
 * Check if a role can read finance data
 * Parents and students can read their own data
 */
export function canReadFinanceData(role: Role): boolean {
  return FINANCE_READ_ROLES.includes(role)
}

/**
 * Check if a role can write/modify finance data
 */
export function canWriteFinanceData(role: Role): boolean {
  return FINANCE_WRITE_ROLES.includes(role)
}

/**
 * Check if a role can reverse payments
 * Property 22: Reversal Authorization
 * Requirement 11.4: Require SCHOOL_ADMIN for payment reversals
 */
export function canReversePayment(role: Role): boolean {
  return PAYMENT_REVERSAL_ROLES.includes(role)
}

/**
 * Check if a role can cancel receipts
 * Requirement 11.5: Require SCHOOL_ADMIN approval for receipt cancellation
 */
export function canCancelReceipt(role: Role): boolean {
  return RECEIPT_CANCEL_ROLES.includes(role)
}

/**
 * Check if a role is a parent role
 */
export function isParentRole(role: Role): boolean {
  return role === Role.PARENT
}

/**
 * Check if a role is a student role
 */
export function isStudentRole(role: Role): boolean {
  return role === Role.STUDENT
}

// ============================================
// REQUIRE FUNCTIONS (throw on failure)
// ============================================

/**
 * Require finance module access, throw error if denied
 * Property 20: Finance Access Control
 * Requirement 11.1, 11.2
 */
export function requireFinanceAccess(role: Role): void {
  if (!hasFinanceAccess(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED,
      `Role ${role} does not have access to the finance module`
    )
  }
}

/**
 * Require finance read access, throw error if denied
 */
export function requireFinanceReadAccess(role: Role): void {
  if (!canReadFinanceData(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED,
      `Role ${role} does not have read access to finance data`
    )
  }
}

/**
 * Require finance write access, throw error if denied
 */
export function requireFinanceWriteAccess(role: Role): void {
  if (!canWriteFinanceData(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED,
      `Role ${role} does not have write access to finance data`
    )
  }
}

/**
 * Require payment reversal authorization, throw error if denied
 * Property 22: Reversal Authorization
 * Requirement 11.4
 */
export function requireReversalAuthorization(role: Role): void {
  if (!canReversePayment(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.REVERSAL_NOT_AUTHORIZED,
      `Role ${role} is not authorized to reverse payments. SCHOOL_ADMIN or higher required.`
    )
  }
}

/**
 * Require receipt cancellation authorization, throw error if denied
 * Requirement 11.5
 */
export function requireReceiptCancelAuthorization(role: Role): void {
  if (!canCancelReceipt(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.RECEIPT_CANCEL_NOT_AUTHORIZED,
      `Role ${role} is not authorized to cancel receipts. SCHOOL_ADMIN approval required.`
    )
  }
}

// ============================================
// PARENT DATA ISOLATION
// Property 21: Parent Data Isolation
// Requirement 11.3: Parent can only see their linked students' data
// ============================================

/**
 * Get student IDs linked to a parent's guardian record
 * Property 21: Parent Data Isolation
 * Requirement 11.3
 */
export async function getLinkedStudentIds(userId: string): Promise<string[]> {
  // Find the guardian record linked to this user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      guardian: {
        include: {
          studentGuardians: {
            select: { studentId: true },
          },
        },
      },
    },
  })

  if (!user?.guardian) {
    return []
  }

  return user.guardian.studentGuardians.map(sg => sg.studentId)
}

/**
 * Check if a parent has access to a specific student's data
 * Property 21: Parent Data Isolation
 * Requirement 11.3
 */
export async function parentHasAccessToStudent(
  userId: string,
  studentId: string
): Promise<boolean> {
  const linkedStudentIds = await getLinkedStudentIds(userId)
  return linkedStudentIds.includes(studentId)
}

/**
 * Require parent has access to student, throw error if denied
 * Property 21: Parent Data Isolation
 * Requirement 11.3
 */
export async function requireParentStudentAccess(
  userId: string,
  studentId: string
): Promise<void> {
  const hasAccess = await parentHasAccessToStudent(userId, studentId)
  if (!hasAccess) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.PARENT_DATA_ACCESS_DENIED,
      'You do not have access to this student\'s financial data'
    )
  }
}

/**
 * Filter student IDs to only those the parent has access to
 * Property 21: Parent Data Isolation
 * Requirement 11.3
 */
export async function filterStudentsByParentAccess(
  userId: string,
  studentIds: string[]
): Promise<string[]> {
  const linkedStudentIds = await getLinkedStudentIds(userId)
  const linkedSet = new Set(linkedStudentIds)
  return studentIds.filter(id => linkedSet.has(id))
}

// ============================================
// STUDENT DATA ISOLATION
// Students can only see their own data
// ============================================

/**
 * Get the student ID for a student user
 */
export async function getStudentIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        select: { id: true },
      },
    },
  })

  return user?.student?.id ?? null
}

/**
 * Check if a student user has access to a specific student's data
 * Students can only access their own data
 */
export async function studentHasAccessToStudent(
  userId: string,
  studentId: string
): Promise<boolean> {
  const userStudentId = await getStudentIdForUser(userId)
  return userStudentId === studentId
}

/**
 * Require student has access to student data, throw error if denied
 */
export async function requireStudentDataAccess(
  userId: string,
  studentId: string
): Promise<void> {
  const hasAccess = await studentHasAccessToStudent(userId, studentId)
  if (!hasAccess) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.PARENT_DATA_ACCESS_DENIED,
      'You do not have access to this student\'s financial data'
    )
  }
}

// ============================================
// COMBINED ACCESS VALIDATION
// ============================================

export interface FinanceAccessContext {
  userId: string
  role: Role
  schoolId?: string
}

/**
 * Validate finance access for a specific student
 * Combines role-based access with data isolation
 * 
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 * Requirements: 11.1, 11.2, 11.3
 */
export async function validateFinanceAccessForStudent(
  context: FinanceAccessContext,
  studentId: string
): Promise<void> {
  const { userId, role } = context

  // Check if user has any finance read access
  if (!canReadFinanceData(role)) {
    throw new FinanceAccessError(
      FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED,
      `Role ${role} does not have access to finance data`
    )
  }

  // For parents, verify they have access to this specific student
  // Property 21: Parent Data Isolation
  if (isParentRole(role)) {
    await requireParentStudentAccess(userId, studentId)
    return
  }

  // For students, verify they are accessing their own data
  if (isStudentRole(role)) {
    await requireStudentDataAccess(userId, studentId)
    return
  }

  // For other roles with finance access, no additional checks needed
  // They have school-wide access
}

/**
 * Get accessible student IDs for a user based on their role
 * Returns null if user has access to all students in their school
 * Returns array of student IDs if access is restricted
 * 
 * Property 21: Parent Data Isolation
 * Requirement 11.3
 */
export async function getAccessibleStudentIds(
  context: FinanceAccessContext
): Promise<string[] | null> {
  const { userId, role } = context

  // Parents can only see linked students
  if (isParentRole(role)) {
    return getLinkedStudentIds(userId)
  }

  // Students can only see their own data
  if (isStudentRole(role)) {
    const studentId = await getStudentIdForUser(userId)
    return studentId ? [studentId] : []
  }

  // Other roles with finance access can see all students in their school
  if (hasFinanceAccess(role)) {
    return null // null means no restriction
  }

  // No access
  return []
}

// ============================================
// FINANCE ACCESS SERVICE CLASS
// ============================================

export class FinanceAccessService {
  /**
   * Check if role has finance module access
   * Property 20: Finance Access Control
   */
  static hasFinanceAccess(role: Role): boolean {
    return hasFinanceAccess(role)
  }

  /**
   * Check if role can read finance data
   */
  static canReadFinanceData(role: Role): boolean {
    return canReadFinanceData(role)
  }

  /**
   * Check if role can write finance data
   */
  static canWriteFinanceData(role: Role): boolean {
    return canWriteFinanceData(role)
  }

  /**
   * Check if role can reverse payments
   * Property 22: Reversal Authorization
   */
  static canReversePayment(role: Role): boolean {
    return canReversePayment(role)
  }

  /**
   * Check if role can cancel receipts
   */
  static canCancelReceipt(role: Role): boolean {
    return canCancelReceipt(role)
  }

  /**
   * Require finance access, throw if denied
   */
  static requireFinanceAccess(role: Role): void {
    requireFinanceAccess(role)
  }

  /**
   * Require reversal authorization, throw if denied
   * Property 22: Reversal Authorization
   */
  static requireReversalAuthorization(role: Role): void {
    requireReversalAuthorization(role)
  }

  /**
   * Require receipt cancel authorization, throw if denied
   */
  static requireReceiptCancelAuthorization(role: Role): void {
    requireReceiptCancelAuthorization(role)
  }

  /**
   * Get linked student IDs for a parent
   * Property 21: Parent Data Isolation
   */
  static async getLinkedStudentIds(userId: string): Promise<string[]> {
    return getLinkedStudentIds(userId)
  }

  /**
   * Check if parent has access to student
   * Property 21: Parent Data Isolation
   */
  static async parentHasAccessToStudent(
    userId: string,
    studentId: string
  ): Promise<boolean> {
    return parentHasAccessToStudent(userId, studentId)
  }

  /**
   * Validate finance access for a student
   * Property 20, 21
   */
  static async validateFinanceAccessForStudent(
    context: FinanceAccessContext,
    studentId: string
  ): Promise<void> {
    return validateFinanceAccessForStudent(context, studentId)
  }

  /**
   * Get accessible student IDs based on role
   * Property 21: Parent Data Isolation
   */
  static async getAccessibleStudentIds(
    context: FinanceAccessContext
  ): Promise<string[] | null> {
    return getAccessibleStudentIds(context)
  }
}

// Export default instance
export const financeAccessService = FinanceAccessService
