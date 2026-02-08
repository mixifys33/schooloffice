/**
 * Marks Access Control Utilities
 * 
 * Requirements: 28.3, 28.5, 28.6
 * - Centralized access control logic for marks management
 * - DoS override permission checking
 * - Approved marks validation
 */

import { Role, StaffRole, MarksSubmissionStatus } from '@/types/enums'

export interface UserSession {
  user: {
    id: string;
    activeRole?: string;
    role: string;
    roles: string[];
    schoolId?: string;
  };
}

/**
 * Check if user has DoS override permissions
 */
export function hasDoSOverridePermission(session: UserSession): boolean {
  const userRole = session.user.activeRole || session.user.role
  
  return userRole === Role.DOS || 
         userRole === StaffRole.DOS || 
         session.user.roles.includes(Role.DOS) || 
         session.user.roles.includes(StaffRole.DOS) ||
         userRole === Role.SCHOOL_ADMIN || // School admin can also override
         userRole === Role.DEPUTY // Deputy can also override
}

/**
 * Check if user has teacher permissions
 */
export function hasTeacherPermission(session: UserSession): boolean {
  const userRole = session.user.activeRole || session.user.role
  
  return userRole === Role.TEACHER || 
         userRole === Role.SCHOOL_ADMIN || 
         userRole === Role.DEPUTY
}

/**
 * Check if marks entry is locked (approved)
 */
export function isMarksEntryLocked(status: string): boolean {
  return status === MarksSubmissionStatus.APPROVED
}

/**
 * Generate access control error message for locked marks
 */
export function getLockedMarksErrorMessage(entryType: 'CA' | 'EXAM'): {
  error: string;
  details: string;
} {
  return {
    error: `${entryType} entry is locked`,
    details: `Cannot edit ${entryType} entries that have been approved by DoS. Contact DoS for override if changes are needed.`
  }
}

/**
 * Generate access denied error message
 */
export function getAccessDeniedErrorMessage(requiredRole: string, currentRole: string): {
  error: string;
  details: string;
} {
  return {
    error: `Access denied. ${requiredRole} role required.`,
    details: `Current role: ${currentRole}. ${requiredRole} access required.`
  }
}

/**
 * Validate marks entry access for teachers
 * Returns null if access is allowed, error object if denied
 */
export function validateMarksEntryAccess(
  entryStatus: string,
  userSession: UserSession,
  entryType: 'CA' | 'EXAM'
): { error: string; details: string } | null {
  // Check if entry is locked
  if (isMarksEntryLocked(entryStatus)) {
    // Check if user has DoS override permission
    if (hasDoSOverridePermission(userSession)) {
      // DoS can override, but should use the override endpoint
      return {
        error: `${entryType} entry is approved`,
        details: `This ${entryType} entry has been approved. Use the DoS override functionality to unlock it for editing.`
      }
    } else {
      // Regular teacher cannot edit approved entries
      return getLockedMarksErrorMessage(entryType)
    }
  }

  return null // Access allowed
}

/**
 * Create audit log metadata for marks operations
 */
export function createAuditMetadata(
  action: string,
  entryData: any,
  userInfo: { firstName: string; lastName: string },
  additionalData?: any
): any {
  const baseMetadata = {
    action,
    performedBy: `${userInfo.firstName} ${userInfo.lastName}`,
    timestamp: new Date().toISOString(),
    ...additionalData,
  }

  // Add entry-specific data
  if (entryData.name && entryData.type) {
    // CA Entry
    return {
      ...baseMetadata,
      caEntryName: entryData.name,
      caType: entryData.type,
      rawScore: entryData.rawScore,
      maxScore: entryData.maxScore,
    }
  } else if (entryData.examScore !== undefined) {
    // Exam Entry
    return {
      ...baseMetadata,
      examScore: entryData.examScore,
      maxScore: entryData.maxScore,
      examDate: entryData.examDate?.toISOString?.() || entryData.examDate,
    }
  }

  return baseMetadata
}