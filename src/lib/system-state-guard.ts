/**
 * System State Guard
 * Middleware utilities for checking system state before allowing modifications
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */
import { NextResponse } from 'next/server'
import { 
  systemStateService, 
  ModifiableDataType, 
  SYSTEM_STATE_ERROR_MESSAGES 
} from '@/services/system-state.service'

// ============================================
// TYPES
// ============================================

/**
 * System state check result
 */
export interface SystemStateCheckResult {
  allowed: boolean
  response?: NextResponse
  reason?: string
}

// ============================================
// GUARD FUNCTIONS
// ============================================

/**
 * Check if school is suspended and return appropriate response
 * Requirements: 20.1, 20.2
 * 
 * @param schoolId - The school ID to check
 * @returns Check result with response if blocked
 */
export async function guardSchoolSuspension(schoolId: string): Promise<SystemStateCheckResult> {
  const isSuspended = await systemStateService.isSchoolSuspended(schoolId)
  
  if (isSuspended) {
    return {
      allowed: false,
      reason: SYSTEM_STATE_ERROR_MESSAGES.SCHOOL_SUSPENDED,
      response: NextResponse.json(
        { 
          error: 'SCHOOL_SUSPENDED', 
          message: SYSTEM_STATE_ERROR_MESSAGES.SCHOOL_SUSPENDED 
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

/**
 * Check if data modification is allowed based on system state
 * Requirements: 20.3, 20.4, 20.5, 20.6
 * 
 * @param schoolId - The school ID
 * @param dataType - The type of data being modified
 * @param termId - Optional term ID for term-specific checks
 * @returns Check result with response if blocked
 */
export async function guardDataModification(
  schoolId: string,
  dataType: ModifiableDataType,
  termId?: string
): Promise<SystemStateCheckResult> {
  const result = await systemStateService.canModifyData(schoolId, dataType, termId)
  
  if (!result.allowed) {
    // Determine the appropriate error code based on the reason
    let errorCode = 'DATA_LOCKED'
    if (result.reason === SYSTEM_STATE_ERROR_MESSAGES.SCHOOL_SUSPENDED) {
      errorCode = 'SCHOOL_SUSPENDED'
    } else if (result.reason === SYSTEM_STATE_ERROR_MESSAGES.TERM_CLOSED) {
      errorCode = 'TERM_CLOSED'
    } else if (result.reason === SYSTEM_STATE_ERROR_MESSAGES.RESULTS_PUBLISHED) {
      errorCode = 'RESULTS_PUBLISHED'
    } else if (result.reason === SYSTEM_STATE_ERROR_MESSAGES.FINANCIAL_PERIOD_LOCKED) {
      errorCode = 'FINANCIAL_PERIOD_LOCKED'
    }

    return {
      allowed: false,
      reason: result.reason,
      response: NextResponse.json(
        { 
          error: errorCode, 
          message: result.reason 
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}

/**
 * Check if attendance modification is allowed
 * Requirements: 20.3
 * 
 * @param schoolId - The school ID
 * @param termId - The term ID
 * @returns Check result with response if blocked
 */
export async function guardAttendanceModification(
  schoolId: string,
  termId?: string
): Promise<SystemStateCheckResult> {
  return guardDataModification(schoolId, 'attendance', termId)
}

/**
 * Check if marks modification is allowed
 * Requirements: 20.3, 20.4
 * 
 * @param schoolId - The school ID
 * @param termId - The term ID
 * @returns Check result with response if blocked
 */
export async function guardMarksModification(
  schoolId: string,
  termId?: string
): Promise<SystemStateCheckResult> {
  return guardDataModification(schoolId, 'marks', termId)
}

/**
 * Check if results modification is allowed
 * Requirements: 20.3, 20.4
 * 
 * @param schoolId - The school ID
 * @param termId - The term ID
 * @returns Check result with response if blocked
 */
export async function guardResultsModification(
  schoolId: string,
  termId?: string
): Promise<SystemStateCheckResult> {
  return guardDataModification(schoolId, 'results', termId)
}

/**
 * Check if fee modification is allowed
 * Requirements: 20.5
 * 
 * @param schoolId - The school ID
 * @param termId - The term/period ID
 * @returns Check result with response if blocked
 */
export async function guardFeeModification(
  schoolId: string,
  termId?: string
): Promise<SystemStateCheckResult> {
  return guardDataModification(schoolId, 'fees', termId)
}

/**
 * Combined guard for checking school suspension and data modification
 * Use this for most API routes that modify data
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 * 
 * @param schoolId - The school ID
 * @param dataType - The type of data being modified
 * @param termId - Optional term ID for term-specific checks
 * @returns Check result with response if blocked
 */
export async function guardSystemState(
  schoolId: string,
  dataType: ModifiableDataType,
  termId?: string
): Promise<SystemStateCheckResult> {
  // First check school suspension
  const suspensionCheck = await guardSchoolSuspension(schoolId)
  if (!suspensionCheck.allowed) {
    return suspensionCheck
  }

  // Then check data modification permissions
  return guardDataModification(schoolId, dataType, termId)
}

/**
 * Check if login is allowed for a school
 * Requirements: 20.1, 20.2
 * 
 * @param schoolId - The school ID
 * @returns Check result with response if blocked
 */
export async function guardLogin(schoolId: string): Promise<SystemStateCheckResult> {
  const result = await systemStateService.canLoginToSchool(schoolId)
  
  if (!result.allowed) {
    return {
      allowed: false,
      reason: result.reason,
      response: NextResponse.json(
        { 
          error: 'SCHOOL_SUSPENDED', 
          message: result.reason 
        },
        { status: 403 }
      ),
    }
  }

  return { allowed: true }
}
