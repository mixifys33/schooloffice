/**
 * Role-Based Access Control (RBAC) System
 * Implements permission checking and data ownership scoping
 * Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5
 */
import { Role, StaffRole } from '@/types/enums'
import { Permission } from '@/types/services'
import type { DataScope } from '@/types/staff-dashboard'

// Define all resources in the system
export type Resource =
  | 'school'
  | 'user'
  | 'student'
  | 'guardian'
  | 'staff'
  | 'teacher'
  | 'class'
  | 'stream'
  | 'subject'
  | 'academic_year'
  | 'term'
  | 'attendance'
  | 'timetable'
  | 'exam'
  | 'mark'
  | 'result'
  | 'report_card'
  | 'fee_structure'
  | 'payment'
  | 'message'
  | 'announcement'
  | 'discipline'
  | 'document'
  | 'audit_log'
  | 'teacher_document'
  | 'teacher_performance'

export type Action = 'create' | 'read' | 'update' | 'delete'

/**
 * Permission definitions for each role
 * Requirement 3.1: Grant only permissions defined for that role
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    { resource: 'school', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'user', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'student', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'guardian', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'staff', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'teacher', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'class', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'stream', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'subject', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'academic_year', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'term', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'attendance', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'timetable', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'exam', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'mark', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'result', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'report_card', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'fee_structure', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'payment', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'message', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'announcement', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'discipline', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'document', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'teacher_document', actions: ['create', 'read', 'update', 'delete'], scope: 'all' },
    { resource: 'teacher_performance', actions: ['read'], scope: 'all' },
    { resource: 'audit_log', actions: ['read'], scope: 'all' },
  ],

  [Role.SCHOOL_ADMIN]: [
    { resource: 'school', actions: ['read', 'update'], scope: 'school' },
    { resource: 'user', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'student', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'guardian', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'staff', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'teacher', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'class', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'stream', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'subject', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'academic_year', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'term', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'attendance', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'timetable', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'exam', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'mark', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'result', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'report_card', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'fee_structure', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'payment', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'message', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'announcement', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'discipline', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'document', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'teacher_document', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'teacher_performance', actions: ['read'], scope: 'school' },
    { resource: 'audit_log', actions: ['read'], scope: 'school' },
  ],

  [Role.DEPUTY]: [
    { resource: 'school', actions: ['read'], scope: 'school' },
    { resource: 'student', actions: ['read', 'update'], scope: 'school' },
    { resource: 'guardian', actions: ['read'], scope: 'school' },
    { resource: 'staff', actions: ['read'], scope: 'school' },
    { resource: 'teacher', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'class', actions: ['read', 'update'], scope: 'school' },
    { resource: 'stream', actions: ['read', 'update'], scope: 'school' },
    { resource: 'subject', actions: ['read', 'update'], scope: 'school' },
    { resource: 'academic_year', actions: ['read'], scope: 'school' },
    { resource: 'term', actions: ['read'], scope: 'school' },
    { resource: 'attendance', actions: ['read'], scope: 'school' },
    { resource: 'timetable', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'exam', actions: ['create', 'read', 'update'], scope: 'school' },
    { resource: 'mark', actions: ['read'], scope: 'school' },
    { resource: 'result', actions: ['read', 'update'], scope: 'school' },
    { resource: 'report_card', actions: ['read', 'update'], scope: 'school' },
    { resource: 'announcement', actions: ['create', 'read', 'update'], scope: 'school' },
    { resource: 'discipline', actions: ['create', 'read', 'update'], scope: 'school' },
    { resource: 'teacher_document', actions: ['create', 'read', 'update'], scope: 'school' },
    { resource: 'teacher_performance', actions: ['read'], scope: 'school' },
  ],

  [Role.TEACHER]: [
    { resource: 'school', actions: ['read'], scope: 'school' },
    { resource: 'student', actions: ['read'], scope: 'class' },
    { resource: 'guardian', actions: ['read'], scope: 'class' },
    { resource: 'class', actions: ['read'], scope: 'class' },
    { resource: 'stream', actions: ['read'], scope: 'class' },
    { resource: 'subject', actions: ['read'], scope: 'class' },
    { resource: 'academic_year', actions: ['read'], scope: 'school' },
    { resource: 'term', actions: ['read'], scope: 'school' },
    { resource: 'attendance', actions: ['create', 'read', 'update'], scope: 'class' },
    { resource: 'timetable', actions: ['read'], scope: 'own' },
    { resource: 'exam', actions: ['read'], scope: 'class' },
    { resource: 'mark', actions: ['create', 'read', 'update'], scope: 'class' },
    { resource: 'result', actions: ['read'], scope: 'class' },
    { resource: 'report_card', actions: ['read', 'update'], scope: 'class' },
    { resource: 'announcement', actions: ['read'], scope: 'school' },
    { resource: 'discipline', actions: ['create', 'read'], scope: 'class' },
    { resource: 'message', actions: ['read'], scope: 'class' },
  ],

  [Role.ACCOUNTANT]: [
    { resource: 'school', actions: ['read'], scope: 'school' },
    { resource: 'student', actions: ['read'], scope: 'school' },
    { resource: 'guardian', actions: ['read'], scope: 'school' },
    { resource: 'class', actions: ['read'], scope: 'school' },
    { resource: 'term', actions: ['read'], scope: 'school' },
    { resource: 'fee_structure', actions: ['create', 'read', 'update', 'delete'], scope: 'school' },
    { resource: 'payment', actions: ['create', 'read', 'update'], scope: 'school' },
    { resource: 'announcement', actions: ['read'], scope: 'school' },
  ],

  [Role.STUDENT]: [
    { resource: 'school', actions: ['read'], scope: 'school' },
    { resource: 'class', actions: ['read'], scope: 'own' },
    { resource: 'subject', actions: ['read'], scope: 'own' },
    { resource: 'timetable', actions: ['read'], scope: 'own' },
    { resource: 'attendance', actions: ['read'], scope: 'own' },
    { resource: 'mark', actions: ['read'], scope: 'own' },
    { resource: 'result', actions: ['read'], scope: 'own' },
    { resource: 'report_card', actions: ['read'], scope: 'own' },
    { resource: 'payment', actions: ['read'], scope: 'own' },
    { resource: 'announcement', actions: ['read'], scope: 'school' },
  ],

  [Role.PARENT]: [
    { resource: 'school', actions: ['read'], scope: 'school' },
    { resource: 'student', actions: ['read'], scope: 'own' },
    { resource: 'class', actions: ['read'], scope: 'own' },
    { resource: 'attendance', actions: ['read'], scope: 'own' },
    { resource: 'mark', actions: ['read'], scope: 'own' },
    { resource: 'result', actions: ['read'], scope: 'own' },
    { resource: 'report_card', actions: ['read'], scope: 'own' },
    { resource: 'payment', actions: ['read'], scope: 'own' },
    { resource: 'fee_structure', actions: ['read'], scope: 'own' },
    { resource: 'discipline', actions: ['read'], scope: 'own' },
    { resource: 'announcement', actions: ['read'], scope: 'school' },
    { resource: 'message', actions: ['create', 'read'], scope: 'own' },
  ],
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}


// ============================================
// STAFF ROLE PERMISSION BOUNDARIES
// Requirements: 4.1, 4.2, 4.3, 4.4
// ============================================

/**
 * Staff permission boundary definition
 * Defines what each staff role can and cannot do
 */
export interface StaffPermissionBoundary {
  // Marks permissions
  canEnterMarks: boolean
  canApproveMarks: boolean
  canEditMarks: boolean
  
  // Finance permissions
  canViewFees: boolean
  canRecordPayments: boolean
  canIssueReceipts: boolean
  canEditFinance: boolean
  
  // Class/Student permissions
  canEditClassAssignments: boolean
  canViewStudents: boolean
  canChangeClasses: boolean
  canModifyAttendance: boolean
  
  // Hostel permissions
  canTrackPresence: boolean
  canLogDiscipline: boolean
  canSendEmergencyAlerts: boolean
  
  // Report permissions
  canGenerateReports: boolean
  canLockReports: boolean
  
  // Task permissions
  canViewTasks: boolean
  canViewNotices: boolean
  
  // Data scope
  dataScope: DataScope
}

/**
 * Permission boundaries for each staff role
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * HARD RULES - These boundaries are strictly enforced:
 * - Teacher: Can enter marks but NEVER approve marks or view fees
 * - DOS: Can approve marks but NEVER edit marks directly or edit finance
 * - Bursar: Can record payments but NEVER edit marks, change classes, or modify attendance
 * - Hostel: Can track presence but NEVER view marks or finance
 * - Support: Can view tasks but NEVER view students, marks, or finance
 */
export const STAFF_PERMISSION_BOUNDARIES: Record<StaffRole | 'TEACHER' | 'SCHOOL_ADMIN', StaffPermissionBoundary> = {
  // Teacher permissions - Requirement 4.2
  TEACHER: {
    canEnterMarks: true,
    canApproveMarks: false, // NEVER
    canEditMarks: true, // Own marks only
    canViewFees: false, // NEVER
    canRecordPayments: false,
    canIssueReceipts: false,
    canEditFinance: false,
    canEditClassAssignments: false,
    canViewStudents: true, // Assigned classes only
    canChangeClasses: false,
    canModifyAttendance: true, // Assigned classes only
    canTrackPresence: false,
    canLogDiscipline: true, // Assigned classes only
    canSendEmergencyAlerts: false,
    canGenerateReports: false,
    canLockReports: false,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'assigned_classes',
  },

  // Class Teacher permissions - extends Teacher with class-wide view
  [StaffRole.CLASS_TEACHER]: {
    canEnterMarks: true,
    canApproveMarks: false, // NEVER
    canEditMarks: true, // Own marks only
    canViewFees: true, // Read-only for class
    canRecordPayments: false, // NEVER - read-only fee view
    canIssueReceipts: false,
    canEditFinance: false,
    canEditClassAssignments: false,
    canViewStudents: true, // Full class
    canChangeClasses: false,
    canModifyAttendance: true, // Full class
    canTrackPresence: false,
    canLogDiscipline: true, // Full class
    canSendEmergencyAlerts: false,
    canGenerateReports: false,
    canLockReports: false,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'assigned_classes',
  },

  // DOS permissions - Requirement 4.3
  [StaffRole.DOS]: {
    canEnterMarks: false,
    canApproveMarks: true, // Approve/reject only
    canEditMarks: false, // NEVER - approve/reject only
    canViewFees: false,
    canRecordPayments: false,
    canIssueReceipts: false,
    canEditFinance: false, // NEVER
    canEditClassAssignments: true,
    canViewStudents: true, // School-wide
    canChangeClasses: true,
    canModifyAttendance: false, // View only
    canTrackPresence: false,
    canLogDiscipline: true,
    canSendEmergencyAlerts: true,
    canGenerateReports: true,
    canLockReports: true,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'school_academics',
  },

  // Bursar permissions - Requirement 4.4
  [StaffRole.BURSAR]: {
    canEnterMarks: false, // NEVER
    canApproveMarks: false, // NEVER
    canEditMarks: false, // NEVER
    canViewFees: true,
    canRecordPayments: true,
    canIssueReceipts: true,
    canEditFinance: true,
    canEditClassAssignments: false, // NEVER
    canViewStudents: true, // For fee lookup
    canChangeClasses: false, // NEVER
    canModifyAttendance: false, // NEVER
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canGenerateReports: true, // Financial reports only
    canLockReports: false,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'school_finance',
  },

  // Hostel Staff permissions
  [StaffRole.HOSTEL_STAFF]: {
    canEnterMarks: false, // NEVER
    canApproveMarks: false, // NEVER
    canEditMarks: false, // NEVER
    canViewFees: false, // NEVER
    canRecordPayments: false,
    canIssueReceipts: false,
    canEditFinance: false, // NEVER
    canEditClassAssignments: false,
    canViewStudents: true, // Hostel students only
    canChangeClasses: false,
    canModifyAttendance: false,
    canTrackPresence: true,
    canLogDiscipline: true,
    canSendEmergencyAlerts: true,
    canGenerateReports: false,
    canLockReports: false,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'hostel_students',
  },

  // Support Staff permissions
  [StaffRole.SUPPORT_STAFF]: {
    canEnterMarks: false, // NEVER
    canApproveMarks: false, // NEVER
    canEditMarks: false, // NEVER
    canViewFees: false, // NEVER
    canRecordPayments: false,
    canIssueReceipts: false,
    canEditFinance: false, // NEVER
    canEditClassAssignments: false,
    canViewStudents: false, // NEVER
    canChangeClasses: false,
    canModifyAttendance: false,
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canGenerateReports: false,
    canLockReports: false,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'own_tasks',
  },

  // School Admin - full access within school
  SCHOOL_ADMIN: {
    canEnterMarks: true,
    canApproveMarks: true,
    canEditMarks: true,
    canViewFees: true,
    canRecordPayments: true,
    canIssueReceipts: true,
    canEditFinance: true,
    canEditClassAssignments: true,
    canViewStudents: true,
    canChangeClasses: true,
    canModifyAttendance: true,
    canTrackPresence: true,
    canLogDiscipline: true,
    canSendEmergencyAlerts: true,
    canGenerateReports: true,
    canLockReports: true,
    canViewTasks: true,
    canViewNotices: true,
    dataScope: 'full_school',
  },
}


/**
 * Get permission boundaries for a staff role
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function getStaffPermissionBoundaries(
  role: StaffRole | Role
): StaffPermissionBoundary | null {
  // Map Role enum to staff permission key
  if (role === Role.TEACHER) {
    return STAFF_PERMISSION_BOUNDARIES.TEACHER
  }
  if (role === Role.SCHOOL_ADMIN) {
    return STAFF_PERMISSION_BOUNDARIES.SCHOOL_ADMIN
  }
  
  // Check if it's a StaffRole
  if (Object.values(StaffRole).includes(role as StaffRole)) {
    return STAFF_PERMISSION_BOUNDARIES[role as StaffRole]
  }
  
  return null
}

/**
 * Check if a staff member has a specific permission
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * @param role - The staff role to check
 * @param permission - The permission key to check (e.g. 'canEnterMarks')
 * @returns boolean indicating if the role has the permission
 */
export function checkStaffPermission(
  role: StaffRole | Role,
  permission: keyof Omit<StaffPermissionBoundary, 'dataScope'>
): boolean {
  const boundaries = getStaffPermissionBoundaries(role)
  if (!boundaries) {
    return false
  }
  return boundaries[permission] === true
}

/**
 * Get the data scope for a staff role
 * Requirements: 4.1
 */
export function getStaffDataScope(role: StaffRole | Role): DataScope | null {
  const boundaries = getStaffPermissionBoundaries(role)
  return boundaries?.dataScope ?? null
}

/**
 * Get all permitted features for a staff role
 * Returns a list of feature keys that the staff role can access
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function getPermittedFeatures(role: StaffRole | Role): string[] {
  const boundaries = getStaffPermissionBoundaries(role)
  if (!boundaries) {
    return []
  }

  const features: string[] = []
  
  // Map permission flags to feature names
  if (boundaries.canEnterMarks) features.push('marks_entry')
  if (boundaries.canApproveMarks) features.push('marks_approval')
  if (boundaries.canEditMarks) features.push('marks_edit')
  if (boundaries.canViewFees) features.push('fees_view')
  if (boundaries.canRecordPayments) features.push('payments_record')
  if (boundaries.canIssueReceipts) features.push('receipts_issue')
  if (boundaries.canEditFinance) features.push('finance_edit')
  if (boundaries.canEditClassAssignments) features.push('class_assignments_edit')
  if (boundaries.canViewStudents) features.push('students_view')
  if (boundaries.canChangeClasses) features.push('classes_change')
  if (boundaries.canModifyAttendance) features.push('attendance_modify')
  if (boundaries.canTrackPresence) features.push('presence_track')
  if (boundaries.canLogDiscipline) features.push('discipline_log')
  if (boundaries.canSendEmergencyAlerts) features.push('emergency_alerts')
  if (boundaries.canGenerateReports) features.push('reports_generate')
  if (boundaries.canLockReports) features.push('reports_lock')
  if (boundaries.canViewTasks) features.push('tasks_view')
  if (boundaries.canViewNotices) features.push('notices_view')

  return features
}

/**
 * Check if a feature is permitted for a staff role
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function isFeaturePermitted(role: StaffRole | Role, feature: string): boolean {
  const permittedFeatures = getPermittedFeatures(role)
  return permittedFeatures.includes(feature)
}

/**
 * Feature to permission mapping for validation
 */
export const FEATURE_PERMISSION_MAP: Record<string, keyof Omit<StaffPermissionBoundary, 'dataScope'>> = {
  marks_entry: 'canEnterMarks',
  marks_approval: 'canApproveMarks',
  marks_edit: 'canEditMarks',
  fees_view: 'canViewFees',
  payments_record: 'canRecordPayments',
  receipts_issue: 'canIssueReceipts',
  finance_edit: 'canEditFinance',
  class_assignments_edit: 'canEditClassAssignments',
  students_view: 'canViewStudents',
  classes_change: 'canChangeClasses',
  attendance_modify: 'canModifyAttendance',
  presence_track: 'canTrackPresence',
  discipline_log: 'canLogDiscipline',
  emergency_alerts: 'canSendEmergencyAlerts',
  reports_generate: 'canGenerateReports',
  reports_lock: 'canLockReports',
  tasks_view: 'canViewTasks',
  notices_view: 'canViewNotices',
}


/**
 * Check if a role has permission for a specific action on a resource
 * Requirement 3.2: Verify user has permission before executing action
 */
export function hasPermission(role: Role, resource: string, action: Action): boolean {
  const permissions = getPermissionsForRole(role)
  
  const permission = permissions.find(p => p.resource === resource)
  if (!permission) return false
  
  return permission.actions.includes(action)
}

/**
 * Get the scope for a role's permission on a resource
 */
export function getPermissionScope(role: Role, resource: string): Permission['scope'] | null {
  const permissions = getPermissionsForRole(role)
  const permission = permissions.find(p => p.resource === resource)
  return permission?.scope ?? null
}

/**
 * Check if a role can access data across all schools
 */
export function canAccessAllSchools(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

/**
 * Check if a role is school-scoped (can only access their own school)
 */
export function isSchoolScoped(role: Role): boolean {
  return role !== Role.SUPER_ADMIN
}

/**
 * Check if a role has class-level data ownership restrictions
 */
export function hasClassOwnership(role: Role): boolean {
  return role === Role.TEACHER
}

/**
 * Check if a role has own-data-only restrictions
 */
export function hasOwnDataOnly(role: Role): boolean {
  return role === Role.STUDENT || role === Role.PARENT
}

/**
 * RBAC Service class for more complex permission checks
 */
export class RBACService {
  /**
   * Check if user has permission for an action
   */
  hasPermission(role: Role, resource: string, action: Action): boolean {
    return hasPermission(role, resource, action)
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: Role): Permission[] {
    return getPermissionsForRole(role)
  }

  /**
   * Filter data based on school ownership
   * Requirement 3.3: Filter results based on data ownership rules
   */
  filterBySchool<T extends { schoolId?: string }>(
    data: T[],
    userSchoolId: string,
    role: Role
  ): T[] {
    if (canAccessAllSchools(role)) {
      return data
    }
    return data.filter(item => item.schoolId === userSchoolId)
  }

  /**
   * Filter data based on class ownership (for teachers)
   * Requirement 3.3: Filter results based on data ownership rules
   */
  filterByClass<T extends { classId: string }>(
    data: T[],
    assignedClassIds: string[]
  ): T[] {
    const assignedClassSet = new Set(assignedClassIds)
    return data.filter(item => assignedClassSet.has(item.classId))
  }

  /**
   * Filter timetable entries by teacher
   * Requirement 6.4: Teachers view their schedule
   */
  filterByTeacher<T extends { teacherId: string }>(
    data: T[],
    teacherId: string
  ): T[] {
    return data.filter(item => item.teacherId === teacherId)
  }

  /**
   * Filter data based on both class and subject ownership
   * Requirement 3.3: Filter results based on data ownership rules
   */
  filterByClassAndSubject<T extends { classId: string; subjectId: string }>(
    data: T[],
    assignedClassIds: string[],
    assignedSubjectIds: string[]
  ): T[] {
    const assignedClassSet = new Set(assignedClassIds)
    const assignedSubjectSet = new Set(assignedSubjectIds)
    return data.filter(
      item => assignedClassSet.has(item.classId) && assignedSubjectSet.has(item.subjectId)
    )
  }

  /**
   * Check if user can access a specific school's data
   */
  canAccessSchool(role: Role, userSchoolId: string, targetSchoolId: string): boolean {
    if (canAccessAllSchools(role)) {
      return true
    }
    return userSchoolId === targetSchoolId
  }

  /**
   * Get the data scope for a user
   */
  getDataScope(role: Role): 'all' | 'school' | 'class' | 'own' {
    if (canAccessAllSchools(role)) return 'all'
    if (hasClassOwnership(role)) return 'class'
    if (hasOwnDataOnly(role)) return 'own'
    return 'school'
  }
}

// Export singleton instance
export const rbacService = new RBACService()


// ============================================
// API ROLE-BASED ACCESS CONTROL
// Requirement 4.5: Enforce role-based access at API level
// ============================================

/**
 * Check if a role has access to a specific API resource
 * Requirement 4.5: Enforce role-based access at both UI and API levels
 */
export function hasApiAccess(role: Role, resource: string, action: Action): boolean {
  return hasPermission(role, resource, action)
}

/**
 * Validate role has permission and throw error if not
 * Requirement 4.5: Return 403 Forbidden for unauthorized access
 */
export function requirePermission(
  role: Role,
  resource: string,
  action: Action
): void {
  if (!hasPermission(role, resource, action)) {
    throw new RoleAccessError(
      `Role ${role} does not have ${action} permission for ${resource}`,
      role,
      resource,
      action
    )
  }
}

/**
 * Custom error for role-based access violations
 * Requirement 4.5: Return 403 Forbidden for unauthorized access
 */
export class RoleAccessError extends Error {
  public readonly statusCode = 403
  public readonly code = 'ROLE_ACCESS_DENIED'

  constructor(
    message: string,
    public readonly role: Role,
    public readonly resource: string,
    public readonly action: Action
  ) {
    super(message)
    this.name = 'RoleAccessError'
  }
}

/**
 * Role-based route access configuration
 * Maps API routes to allowed roles
 * Requirement 4.5: Enforce role-based access at API level
 */
export const API_ROLE_ACCESS: Record<string, Role[]> = {
  'student:read': [Role.STUDENT, Role.PARENT, Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'student:write': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'parent:read': [Role.PARENT, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'parent:write': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'teacher:read': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'teacher:write': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'teacher:delete': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'teacher_document:read': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'teacher_document:write': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'teacher_document:delete': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'teacher_performance:read': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'attendance:read': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN],
  'attendance:write': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  'marks:read': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN],
  'marks:write': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY],
  'fees:read': [Role.SCHOOL_ADMIN, Role.ACCOUNTANT, Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN],
  'fees:write': [Role.SCHOOL_ADMIN, Role.ACCOUNTANT],
  'classes:read': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'classes:write': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'subject:read': [Role.TEACHER, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN],
  'subject:write': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN], // Only SCHOOL_ADMIN can create subjects
  'subject:update': [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN], // DEPUTY can edit existing subjects
  'reports:read': [Role.SCHOOL_ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT, Role.SUPER_ADMIN],
  'reports:write': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'settings:read': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'settings:write': [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN],
  'admin:read': [Role.SUPER_ADMIN],
  'admin:write': [Role.SUPER_ADMIN],
}

/**
 * Check if a role has access to a specific API route
 * Requirement 4.5: Enforce role-based access at API level
 */
export function hasRouteAccess(role: Role, routeKey: string): boolean {
  const allowedRoles = API_ROLE_ACCESS[routeKey]
  if (!allowedRoles) {
    return false
  }
  return allowedRoles.includes(role)
}

/**
 * Validate role has route access and throw error if not
 * Requirement 4.5: Return 403 Forbidden for unauthorized access
 */
export function requireRouteAccess(role: Role, routeKey: string): void {
  if (!hasRouteAccess(role, routeKey)) {
    throw new RoleAccessError(
      `Role ${role} does not have access to ${routeKey}`,
      role,
      routeKey.split(':')[0],
      routeKey.split(':')[1] as Action
    )
  }
}

/**
 * Helper to check if user can perform write operations
 */
export function canWrite(role: Role, resource: string): boolean {
  return hasRouteAccess(role, `${resource}:write`)
}

/**
 * Helper to check if user can perform read operations
 */
export function canRead(role: Role, resource: string): boolean {
  return hasRouteAccess(role, `${resource}:read`)
}

/**
 * Helper to check if user can perform create operations
 */
export function canCreate(role: Role, resource: string): boolean {
  return hasRouteAccess(role, `${resource}:write`)
}

/**
 * Helper to check if user can perform update operations
 */
export function canUpdate(role: Role, resource: string): boolean {
  // Check for specific update permission first, fall back to write permission
  return hasRouteAccess(role, `${resource}:update`) || hasRouteAccess(role, `${resource}:write`)
}

/**
 * Helper to check if user can perform delete operations
 */
export function canDelete(role: Role, resource: string): boolean {
  return hasRouteAccess(role, `${resource}:write`)
}

/**
 * Helper to check if user can perform edit operations
 */
export function canEdit(role: Role, resource: string): boolean {
  return hasRouteAccess(role, `${resource}:write`)
}


// ============================================
// UNAUTHORIZED ACTION HANDLING
// Requirements: 4.5 - Deny actions outside permission set and log attempts
// ============================================

/**
 * Result of a permission check with audit information
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  feature?: string
  role?: StaffRole | Role
}

/**
 * Unauthorized action error with audit details
 * Requirements: 4.5 - Return 403 Forbidden for unauthorized access
 */
export class UnauthorizedActionError extends Error {
  public readonly statusCode = 403
  public readonly code = 'UNAUTHORIZED_ACTION'

  constructor(
    message: string,
    public readonly userId: string,
    public readonly role: StaffRole | Role,
    public readonly feature: string,
    public readonly attemptedAction: string
  ) {
    super(message)
    this.name = 'UnauthorizedActionError'
  }
}

/**
 * Check if a staff role has permission for a specific feature and return detailed result
 * Requirements: 4.5 - Deny actions outside permission set
 * 
 * @param role - The staff role to check
 * @param feature - The feature being accessed
 * @returns PermissionCheckResult with allowed status and reason
 */
export function checkFeatureAccess(
  role: StaffRole | Role,
  feature: string
): PermissionCheckResult {
  const permissionKey = FEATURE_PERMISSION_MAP[feature]
  
  if (!permissionKey) {
    return {
      allowed: false,
      reason: `Unknown feature: ${feature}`,
      feature,
      role,
    }
  }

  const boundaries = getStaffPermissionBoundaries(role)
  
  if (!boundaries) {
    return {
      allowed: false,
      reason: `No permission boundaries defined for role: ${role}`,
      feature,
      role,
    }
  }

  const hasPermission = boundaries[permissionKey] === true

  return {
    allowed: hasPermission,
    reason: hasPermission 
      ? undefined 
      : `Role ${role} does not have permission for ${feature}`,
    feature,
    role,
  }
}

/**
 * Require feature access and throw error if not permitted
 * Requirements: 4.5 - Deny actions outside permission set
 * 
 * @param role - The staff role to check
 * @param feature - The feature being accessed
 * @param userId - The user ID for audit logging
 * @param attemptedAction - Description of the attempted action
 * @throws UnauthorizedActionError if access is denied
 */
export function requireFeatureAccess(
  role: StaffRole | Role,
  feature: string,
  userId: string,
  attemptedAction: string
): void {
  const result = checkFeatureAccess(role, feature)
  
  if (!result.allowed) {
    throw new UnauthorizedActionError(
      result.reason || `Access denied for feature: ${feature}`,
      userId,
      role,
      feature,
      attemptedAction
    )
  }
}

/**
 * Create audit log entry for unauthorized action attempt
 * Requirements: 4.5 - Log all denied attempts to audit trail
 * 
 * @returns Audit log entry data ready to be persisted
 */
export function createUnauthorizedActionAuditEntry(params: {
  schoolId: string
  userId: string
  role: StaffRole | Role
  feature: string
  attemptedAction: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
}): {
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  newValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
} {
  return {
    schoolId: params.schoolId,
    userId: params.userId,
    action: 'unauthorized_action_attempt',
    resource: 'permission',
    resourceId: params.resourceId || 'N/A',
    newValue: {
      role: params.role,
      feature: params.feature,
      attemptedAction: params.attemptedAction,
      deniedAt: new Date().toISOString(),
      reason: `Role ${params.role} does not have permission for ${params.feature}`,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  }
}

/**
 * Validate staff permission for an action and prepare audit entry if denied
 * Requirements: 4.5 - Deny actions outside permission set and log attempts
 * 
 * @returns Object with allowed status and optional audit entry
 */
export function validateStaffAction(params: {
  role: StaffRole | Role
  feature: string
  schoolId: string
  userId: string
  attemptedAction: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
}): {
  allowed: boolean
  auditEntry?: ReturnType<typeof createUnauthorizedActionAuditEntry>
  error?: UnauthorizedActionError
} {
  const result = checkFeatureAccess(params.role, params.feature)

  if (result.allowed) {
    return { allowed: true }
  }

  const auditEntry = createUnauthorizedActionAuditEntry({
    schoolId: params.schoolId,
    userId: params.userId,
    role: params.role,
    feature: params.feature,
    attemptedAction: params.attemptedAction,
    resourceId: params.resourceId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  })

  const error = new UnauthorizedActionError(
    result.reason || `Access denied for feature: ${params.feature}`,
    params.userId,
    params.role,
    params.feature,
    params.attemptedAction
  )

  return {
    allowed: false,
    auditEntry,
    error,
  }
}

/**
 * Get all denied features for a staff role
 * Useful for UI to hide features that are not permitted
 * Requirements: 4.5 - Enforce role-based access at UI level
 */
export function getDeniedFeatures(role: StaffRole | Role): string[] {
  const allFeatures = Object.keys(FEATURE_PERMISSION_MAP)
  const permittedFeatures = getPermittedFeatures(role)
  
  return allFeatures.filter(feature => !permittedFeatures.includes(feature))
}

/**
 * Check multiple features at once and return results
 * Useful for batch permission checking
 */
export function checkMultipleFeatures(
  role: StaffRole | Role,
  features: string[]
): Record<string, PermissionCheckResult> {
  const results: Record<string, PermissionCheckResult> = {}
  
  for (const feature of features) {
    results[feature] = checkFeatureAccess(role, feature)
  }
  
  return results
}


// ============================================
// TEACHER MANAGEMENT PERMISSIONS
// Requirements 10.1-10.7: Teacher management authorization
// ============================================

/**
 * Teacher management permission set
 * Requirements 10.1-10.7: Role-based access control for teacher management
 */
export const TEACHER_MANAGEMENT_PERMISSIONS = {
  // Roles that CAN manage teachers (Requirements 10.1, 10.2, 10.3)
  authorized: [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN] as const,
  
  // Roles that CANNOT manage teachers (Requirements 10.4, 10.5, 10.6)
  unauthorized: [Role.TEACHER, Role.ACCOUNTANT, Role.PARENT, Role.STUDENT] as const,
  
  // Roles that can view performance data (Requirement 6.6)
  performanceViewers: [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN] as const,
  
  // Roles that can view/manage documents (Requirement 7.6)
  documentViewers: [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN] as const,
  documentManagers: [Role.SCHOOL_ADMIN, Role.DEPUTY, Role.SUPER_ADMIN] as const,
  documentDeleters: [Role.SCHOOL_ADMIN, Role.SUPER_ADMIN] as const,
}

/**
 * Check if a role can manage teachers
 * Requirements 10.1-10.7: Role-based authorization
 * 
 * @param role - The role to check
 * @returns boolean indicating if the role can manage teachers
 */
export function canManageTeachers(role: Role | string): boolean {
  const roleValue = typeof role === 'string' ? role : role
  return (TEACHER_MANAGEMENT_PERMISSIONS.authorized as readonly string[]).includes(roleValue)
}

/**
 * Check if a role can view teacher performance data
 * Requirement 6.6: Performance data visibility
 * 
 * @param role - The role to check
 * @returns boolean indicating if the role can view performance data
 */
export function canViewTeacherPerformance(role: Role | string): boolean {
  const roleValue = typeof role === 'string' ? role : role
  return (TEACHER_MANAGEMENT_PERMISSIONS.performanceViewers as readonly string[]).includes(roleValue)
}

/**
 * Check if a role can view teacher documents
 * Requirement 7.6: Document visibility
 * 
 * @param role - The role to check
 * @returns boolean indicating if the role can view documents
 */
export function canViewTeacherDocuments(role: Role | string): boolean {
  const roleValue = typeof role === 'string' ? role : role
  return (TEACHER_MANAGEMENT_PERMISSIONS.documentViewers as readonly string[]).includes(roleValue)
}

/**
 * Check if a role can delete teacher documents
 * Requirement 7.6: Document access control
 * 
 * @param role - The role to check
 * @returns boolean indicating if the role can delete documents
 */
export function canDeleteTeacherDocuments(role: Role | string): boolean {
  const roleValue = typeof role === 'string' ? role : role
  return (TEACHER_MANAGEMENT_PERMISSIONS.documentDeleters as readonly string[]).includes(roleValue)
}

/**
 * Validate teacher management access and throw error if not permitted
 * Requirements 10.7: Return 403 for unauthorized access
 * 
 * @param role - The role to check
 * @param action - The action being attempted
 * @throws RoleAccessError if access is denied
 */
export function requireTeacherManagementAccess(
  role: Role | string,
  action: 'create' | 'read' | 'update' | 'delete'
): void {
  if (!canManageTeachers(role)) {
    throw new RoleAccessError(
      `Role ${role} does not have permission to ${action} teachers`,
      role as Role,
      'teacher',
      action
    )
  }
}

/**
 * Create audit log entry for unauthorized teacher management attempt
 * Requirements 10.7: Log unauthorized attempts
 * 
 * @returns Audit log entry data ready to be persisted
 */
export function createTeacherManagementAuditEntry(params: {
  schoolId: string
  userId: string
  role: string
  attemptedAction: string
  teacherId?: string
  ipAddress?: string
  userAgent?: string
}): {
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  newValue: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
} {
  return {
    schoolId: params.schoolId,
    userId: params.userId,
    action: 'unauthorized_teacher_management_attempt',
    resource: 'teacher',
    resourceId: params.teacherId || 'N/A',
    newValue: {
      role: params.role,
      attemptedAction: params.attemptedAction,
      deniedAt: new Date().toISOString(),
      reason: `Role ${params.role} does not have permission for teacher management`,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  }
}

/**
 * Get teacher management permissions for a role
 * Returns an object describing what the role can do with teachers
 */
export function getTeacherManagementPermissions(role: Role | string): {
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canViewPerformance: boolean
  canViewDocuments: boolean
  canDeleteDocuments: boolean
} {
  const canManage = canManageTeachers(role)
  const roleValue = typeof role === 'string' ? role : role
  const canDeleteTeachers = roleValue === Role.SCHOOL_ADMIN || roleValue === Role.SUPER_ADMIN || roleValue === 'SCHOOL_ADMIN' || roleValue === 'SUPER_ADMIN'
  
  return {
    canCreate: canManage,
    canRead: canManage,
    canUpdate: canManage,
    canDelete: canDeleteTeachers,
    canViewPerformance: canViewTeacherPerformance(role),
    canViewDocuments: canViewTeacherDocuments(role),
    canDeleteDocuments: canDeleteTeacherDocuments(role),
  }
}
