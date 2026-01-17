'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { Role, StaffRole } from '@/types/enums'
import { 
  checkStaffPermission, 
  isFeaturePermitted,
  canManageTeachers,
  canViewTeacherPerformance,
  canViewTeacherDocuments,
  type StaffPermissionBoundary 
} from '@/lib/rbac'

/**
 * PermissionGuard Component
 * Requirements: 12.1, 12.2 - Conditionally render children based on permissions
 * - Accept permission (string or array) and children
 * - Check user permissions from session/context
 * - Render children only if permission granted
 * - Support fallback prop for access denied message
 */

export interface PermissionGuardProps {
  /** Permission key or array of permission keys to check */
  permission: string | string[]
  /** Content to render if permission is granted */
  children: React.ReactNode
  /** Optional fallback content when permission is denied */
  fallback?: React.ReactNode
  /** Whether all permissions are required (AND) or any (OR). Default: 'any' */
  mode?: 'all' | 'any'
}

/**
 * Map feature names to permission boundary keys
 */
const FEATURE_TO_PERMISSION_KEY: Record<string, keyof Omit<StaffPermissionBoundary, 'dataScope'>> = {
  // Marks permissions
  'marks_entry': 'canEnterMarks',
  'marks_approval': 'canApproveMarks',
  'marks_edit': 'canEditMarks',
  'enter_marks': 'canEnterMarks',
  'approve_marks': 'canApproveMarks',
  'edit_marks': 'canEditMarks',
  
  // Finance permissions
  'fees_view': 'canViewFees',
  'payments_record': 'canRecordPayments',
  'receipts_issue': 'canIssueReceipts',
  'finance_edit': 'canEditFinance',
  'view_fees': 'canViewFees',
  'record_payments': 'canRecordPayments',
  'issue_receipts': 'canIssueReceipts',
  'edit_finance': 'canEditFinance',
  
  // Class/Student permissions
  'class_assignments_edit': 'canEditClassAssignments',
  'students_view': 'canViewStudents',
  'classes_change': 'canChangeClasses',
  'attendance_modify': 'canModifyAttendance',
  'edit_class_assignments': 'canEditClassAssignments',
  'view_students': 'canViewStudents',
  'change_classes': 'canChangeClasses',
  'modify_attendance': 'canModifyAttendance',
  
  // Hostel permissions
  'presence_track': 'canTrackPresence',
  'discipline_log': 'canLogDiscipline',
  'emergency_alerts': 'canSendEmergencyAlerts',
  'track_presence': 'canTrackPresence',
  'log_discipline': 'canLogDiscipline',
  'send_emergency_alerts': 'canSendEmergencyAlerts',
  
  // Report permissions
  'reports_generate': 'canGenerateReports',
  'reports_lock': 'canLockReports',
  'generate_reports': 'canGenerateReports',
  'lock_reports': 'canLockReports',
  
  // Task permissions
  'tasks_view': 'canViewTasks',
  'notices_view': 'canViewNotices',
  'view_tasks': 'canViewTasks',
  'view_notices': 'canViewNotices',
}

/**
 * Check if a user has a specific permission
 */
function hasPermission(
  role: Role | StaffRole | undefined,
  permission: string
): boolean {
  if (!role) return false

  // Check teacher management permissions
  if (permission === 'manage_teachers' || permission === 'teacher_management') {
    return canManageTeachers(role)
  }
  
  if (permission === 'view_teacher_performance') {
    return canViewTeacherPerformance(role)
  }
  
  if (permission === 'view_teacher_documents') {
    return canViewTeacherDocuments(role)
  }

  // Check if it's a feature permission
  const permissionKey = FEATURE_TO_PERMISSION_KEY[permission]
  if (permissionKey) {
    return checkStaffPermission(role as StaffRole | Role, permissionKey)
  }

  // Check using isFeaturePermitted for other feature names
  return isFeaturePermitted(role as StaffRole | Role, permission)
}

/**
 * Check multiple permissions based on mode
 */
function checkPermissions(
  role: Role | StaffRole | undefined,
  permissions: string[],
  mode: 'all' | 'any'
): boolean {
  if (permissions.length === 0) return true
  
  if (mode === 'all') {
    return permissions.every(p => hasPermission(role, p))
  }
  
  return permissions.some(p => hasPermission(role, p))
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  mode = 'any',
}: PermissionGuardProps) {
  const { data: session, status } = useSession()

  // While loading, don't render anything
  if (status === 'loading') {
    return null
  }

  // If not authenticated, don't render
  if (!session?.user) {
    return <>{fallback}</>
  }

  // Get the user's active role
  const userRole = session.user.activeRole || session.user.role

  // Normalize permission to array
  const permissions = Array.isArray(permission) ? permission : [permission]

  // Check permissions
  const hasAccess = checkPermissions(userRole, permissions, mode)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook to check permissions programmatically
 */
export function usePermission(permission: string | string[], mode: 'all' | 'any' = 'any'): {
  hasPermission: boolean
  isLoading: boolean
} {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return { hasPermission: false, isLoading: true }
  }

  if (!session?.user) {
    return { hasPermission: false, isLoading: false }
  }

  const userRole = session.user.activeRole || session.user.role
  const permissions = Array.isArray(permission) ? permission : [permission]
  const hasAccess = checkPermissions(userRole, permissions, mode)

  return { hasPermission: hasAccess, isLoading: false }
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string | string[],
  fallback?: React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} fallback={fallback}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    )
  }
}

export default PermissionGuard
