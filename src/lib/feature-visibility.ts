/**
 * Feature Visibility Service
 * Implements feature visibility filtering based on role permissions
 * Requirements: 1.5 - Hide features not in role's permission set
 */
import { Role, StaffRole } from '@/types/enums'
import {
  getPermittedFeatures,
  getDeniedFeatures,
  isFeaturePermitted,
  getStaffPermissionBoundaries,
  StaffPermissionBoundary,
} from './rbac'

// ============================================
// FEATURE DEFINITIONS
// ============================================

/**
 * Feature definition for UI components
 */
export interface Feature {
  id: string
  name: string
  description: string
  icon?: string
  path?: string
  category: FeatureCategory
  requiredPermission: string
}

/**
 * Feature categories for grouping
 */
export type FeatureCategory =
  | 'academics'
  | 'attendance'
  | 'finance'
  | 'communication'
  | 'reports'
  | 'administration'
  | 'hostel'
  | 'tasks'

/**
 * All available features in the system
 * Each feature maps to a permission key
 */
export const ALL_FEATURES: Feature[] = [
  // Academic features
  {
    id: 'marks_entry',
    name: 'Enter Marks',
    description: 'Enter and edit student marks',
    icon: 'edit',
    path: '/dashboard/marks/entry',
    category: 'academics',
    requiredPermission: 'marks_entry',
  },
  {
    id: 'marks_approval',
    name: 'Approve Marks',
    description: 'Review and approve submitted marks',
    icon: 'check-circle',
    path: '/dashboard/marks/approval',
    category: 'academics',
    requiredPermission: 'marks_approval',
  },
  {
    id: 'marks_edit',
    name: 'Edit Marks',
    description: 'Edit existing marks',
    icon: 'pencil',
    path: '/dashboard/marks/edit',
    category: 'academics',
    requiredPermission: 'marks_edit',
  },
  {
    id: 'class_assignments_edit',
    name: 'Class Assignments',
    description: 'Manage class and subject assignments',
    icon: 'users',
    path: '/dashboard/classes/assignments',
    category: 'academics',
    requiredPermission: 'class_assignments_edit',
  },
  {
    id: 'classes_change',
    name: 'Change Classes',
    description: 'Move students between classes',
    icon: 'shuffle',
    path: '/dashboard/students/transfer',
    category: 'academics',
    requiredPermission: 'classes_change',
  },

  // Attendance features
  {
    id: 'attendance_modify',
    name: 'Attendance',
    description: 'Take and modify attendance',
    icon: 'calendar-check',
    path: '/dashboard/attendance',
    category: 'attendance',
    requiredPermission: 'attendance_modify',
  },

  // Finance features
  {
    id: 'fees_view',
    name: 'View Fees',
    description: 'View fee structures and balances',
    icon: 'dollar-sign',
    path: '/dashboard/fees',
    category: 'finance',
    requiredPermission: 'fees_view',
  },
  {
    id: 'payments_record',
    name: 'Record Payments',
    description: 'Record student payments',
    icon: 'credit-card',
    path: '/dashboard/fees/payments',
    category: 'finance',
    requiredPermission: 'payments_record',
  },
  {
    id: 'receipts_issue',
    name: 'Issue Receipts',
    description: 'Generate and issue payment receipts',
    icon: 'receipt',
    path: '/dashboard/fees/receipts',
    category: 'finance',
    requiredPermission: 'receipts_issue',
  },
  {
    id: 'finance_edit',
    name: 'Edit Finance',
    description: 'Edit financial records and structures',
    icon: 'settings',
    path: '/dashboard/fees/settings',
    category: 'finance',
    requiredPermission: 'finance_edit',
  },

  // Student features
  {
    id: 'students_view',
    name: 'View Students',
    description: 'View student profiles and records',
    icon: 'users',
    path: '/dashboard/students',
    category: 'administration',
    requiredPermission: 'students_view',
  },

  // Hostel features
  {
    id: 'presence_track',
    name: 'Track Presence',
    description: 'Track student presence in hostel',
    icon: 'map-pin',
    path: '/dashboard/hostel/presence',
    category: 'hostel',
    requiredPermission: 'presence_track',
  },
  {
    id: 'discipline_log',
    name: 'Discipline Log',
    description: 'Log and manage discipline incidents',
    icon: 'alert-triangle',
    path: '/dashboard/discipline',
    category: 'hostel',
    requiredPermission: 'discipline_log',
  },
  {
    id: 'emergency_alerts',
    name: 'Emergency Alerts',
    description: 'Send emergency alerts',
    icon: 'alert-circle',
    path: '/dashboard/emergency',
    category: 'hostel',
    requiredPermission: 'emergency_alerts',
  },

  // Report features
  {
    id: 'reports_generate',
    name: 'Generate Reports',
    description: 'Generate academic and financial reports',
    icon: 'file-text',
    path: '/dashboard/reports',
    category: 'reports',
    requiredPermission: 'reports_generate',
  },
  {
    id: 'reports_lock',
    name: 'Lock Reports',
    description: 'Lock reports to prevent modifications',
    icon: 'lock',
    path: '/dashboard/reports/lock',
    category: 'reports',
    requiredPermission: 'reports_lock',
  },

  // Task features
  {
    id: 'tasks_view',
    name: 'View Tasks',
    description: 'View assigned tasks',
    icon: 'check-square',
    path: '/dashboard/tasks',
    category: 'tasks',
    requiredPermission: 'tasks_view',
  },
  {
    id: 'notices_view',
    name: 'View Notices',
    description: 'View school notices and announcements',
    icon: 'bell',
    path: '/dashboard/notices',
    category: 'communication',
    requiredPermission: 'notices_view',
  },
]

// ============================================
// FEATURE VISIBILITY SERVICE
// ============================================

/**
 * Feature visibility result
 */
export interface FeatureVisibilityResult {
  visibleFeatures: Feature[]
  hiddenFeatures: Feature[]
  permittedFeatureIds: string[]
  deniedFeatureIds: string[]
}

/**
 * Get visible features for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Array of features that should be visible
 */
export function getVisibleFeatures(role: StaffRole | Role): Feature[] {
  const permittedFeatureIds = getPermittedFeatures(role)
  return ALL_FEATURES.filter(feature => 
    permittedFeatureIds.includes(feature.requiredPermission)
  )
}

/**
 * Get hidden features for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Array of features that should be hidden
 */
export function getHiddenFeatures(role: StaffRole | Role): Feature[] {
  const deniedFeatureIds = getDeniedFeatures(role)
  return ALL_FEATURES.filter(feature => 
    deniedFeatureIds.includes(feature.requiredPermission)
  )
}

/**
 * Get complete feature visibility result for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Complete visibility result with visible and hidden features
 */
export function getFeatureVisibility(role: StaffRole | Role): FeatureVisibilityResult {
  const permittedFeatureIds = getPermittedFeatures(role)
  const deniedFeatureIds = getDeniedFeatures(role)

  return {
    visibleFeatures: ALL_FEATURES.filter(feature => 
      permittedFeatureIds.includes(feature.requiredPermission)
    ),
    hiddenFeatures: ALL_FEATURES.filter(feature => 
      deniedFeatureIds.includes(feature.requiredPermission)
    ),
    permittedFeatureIds,
    deniedFeatureIds,
  }
}

/**
 * Check if a specific feature is visible for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @param featureId - The feature ID to check
 * @returns True if the feature should be visible
 */
export function isFeatureVisible(role: StaffRole | Role, featureId: string): boolean {
  return isFeaturePermitted(role, featureId)
}

/**
 * Get visible features by category for a role
 * Useful for building navigation menus
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Features grouped by category
 */
export function getVisibleFeaturesByCategory(
  role: StaffRole | Role
): Record<FeatureCategory, Feature[]> {
  const visibleFeatures = getVisibleFeatures(role)
  
  const result: Record<FeatureCategory, Feature[]> = {
    academics: [],
    attendance: [],
    finance: [],
    communication: [],
    reports: [],
    administration: [],
    hostel: [],
    tasks: [],
  }

  for (const feature of visibleFeatures) {
    result[feature.category].push(feature)
  }

  return result
}

/**
 * Filter navigation items based on role permissions
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @param navItems - Array of navigation items with requiredPermission field
 * @returns Filtered navigation items
 */
export function filterNavigationItems<T extends { requiredPermission?: string }>(
  role: StaffRole | Role,
  navItems: T[]
): T[] {
  const permittedFeatureIds = getPermittedFeatures(role)
  
  return navItems.filter(item => {
    // If no permission required, always show
    if (!item.requiredPermission) {
      return true
    }
    return permittedFeatureIds.includes(item.requiredPermission)
  })
}

/**
 * Get permission summary for UI display
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Permission boundary object or null
 */
export function getPermissionSummaryForRole(
  role: StaffRole | Role
): StaffPermissionBoundary | null {
  return getStaffPermissionBoundaries(role)
}

// ============================================
// DASHBOARD WIDGET VISIBILITY
// ============================================

/**
 * Dashboard widget definition
 */
export interface DashboardWidget {
  id: string
  name: string
  component: string
  requiredPermissions: string[]
  category: FeatureCategory
}

/**
 * All available dashboard widgets
 */
export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'attendance_summary',
    name: 'Attendance Summary',
    component: 'AttendanceSummaryWidget',
    requiredPermissions: ['attendance_modify'],
    category: 'attendance',
  },
  {
    id: 'marks_deadlines',
    name: 'Marks Deadlines',
    component: 'MarksDeadlinesWidget',
    requiredPermissions: ['marks_entry'],
    category: 'academics',
  },
  {
    id: 'pending_approvals',
    name: 'Pending Approvals',
    component: 'PendingApprovalsWidget',
    requiredPermissions: ['marks_approval'],
    category: 'academics',
  },
  {
    id: 'fee_overview',
    name: 'Fee Overview',
    component: 'FeeOverviewWidget',
    requiredPermissions: ['fees_view'],
    category: 'finance',
  },
  {
    id: 'payment_collections',
    name: 'Payment Collections',
    component: 'PaymentCollectionsWidget',
    requiredPermissions: ['payments_record'],
    category: 'finance',
  },
  {
    id: 'hostel_presence',
    name: 'Hostel Presence',
    component: 'HostelPresenceWidget',
    requiredPermissions: ['presence_track'],
    category: 'hostel',
  },
  {
    id: 'discipline_alerts',
    name: 'Discipline Alerts',
    component: 'DisciplineAlertsWidget',
    requiredPermissions: ['discipline_log'],
    category: 'hostel',
  },
  {
    id: 'task_list',
    name: 'Task List',
    component: 'TaskListWidget',
    requiredPermissions: ['tasks_view'],
    category: 'tasks',
  },
  {
    id: 'notices',
    name: 'Notices',
    component: 'NoticesWidget',
    requiredPermissions: ['notices_view'],
    category: 'communication',
  },
]

/**
 * Get visible dashboard widgets for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Array of widgets that should be visible
 */
export function getVisibleWidgets(role: StaffRole | Role): DashboardWidget[] {
  const permittedFeatureIds = getPermittedFeatures(role)
  
  return DASHBOARD_WIDGETS.filter(widget => 
    widget.requiredPermissions.every(permission => 
      permittedFeatureIds.includes(permission)
    )
  )
}

/**
 * Check if a specific widget is visible for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @param widgetId - The widget ID to check
 * @returns True if the widget should be visible
 */
export function isWidgetVisible(role: StaffRole | Role, widgetId: string): boolean {
  const widget = DASHBOARD_WIDGETS.find(w => w.id === widgetId)
  if (!widget) {
    return false
  }
  
  const permittedFeatureIds = getPermittedFeatures(role)
  return widget.requiredPermissions.every(permission => 
    permittedFeatureIds.includes(permission)
  )
}

// ============================================
// QUICK ACTION VISIBILITY
// ============================================

/**
 * Quick action definition
 */
export interface QuickAction {
  id: string
  label: string
  icon: string
  action: string
  path?: string
  requiredPermissions: string[]
}

/**
 * All available quick actions
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'take_attendance',
    label: 'Take Attendance',
    icon: 'calendar-check',
    action: 'takeAttendance',
    path: '/dashboard/attendance/mark',
    requiredPermissions: ['attendance_modify'],
  },
  {
    id: 'enter_marks',
    label: 'Enter Marks',
    icon: 'edit',
    action: 'enterMarks',
    path: '/dashboard/marks/entry',
    requiredPermissions: ['marks_entry'],
  },
  {
    id: 'view_class_list',
    label: 'View Class List',
    icon: 'users',
    action: 'viewClassList',
    path: '/dashboard/classes',
    requiredPermissions: ['students_view'],
  },
  {
    id: 'message_class',
    label: 'Message Class',
    icon: 'message-square',
    action: 'messageClass',
    path: '/dashboard/communications',
    requiredPermissions: ['notices_view'],
  },
  {
    id: 'record_payment',
    label: 'Record Payment',
    icon: 'credit-card',
    action: 'recordPayment',
    path: '/dashboard/fees/payments/new',
    requiredPermissions: ['payments_record'],
  },
  {
    id: 'issue_receipt',
    label: 'Issue Receipt',
    icon: 'receipt',
    action: 'issueReceipt',
    path: '/dashboard/fees/receipts/new',
    requiredPermissions: ['receipts_issue'],
  },
  {
    id: 'view_student_balance',
    label: 'View Student Balance',
    icon: 'dollar-sign',
    action: 'viewStudentBalance',
    path: '/dashboard/fees/balances',
    requiredPermissions: ['fees_view'],
  },
  {
    id: 'approve_marks',
    label: 'Approve Marks',
    icon: 'check-circle',
    action: 'approveMarks',
    path: '/dashboard/marks/approval',
    requiredPermissions: ['marks_approval'],
  },
  {
    id: 'generate_reports',
    label: 'Generate Reports',
    icon: 'file-text',
    action: 'generateReports',
    path: '/dashboard/reports/generate',
    requiredPermissions: ['reports_generate'],
  },
  {
    id: 'track_presence',
    label: 'Track Presence',
    icon: 'map-pin',
    action: 'trackPresence',
    path: '/dashboard/hostel/presence',
    requiredPermissions: ['presence_track'],
  },
  {
    id: 'log_discipline',
    label: 'Log Discipline',
    icon: 'alert-triangle',
    action: 'logDiscipline',
    path: '/dashboard/discipline/new',
    requiredPermissions: ['discipline_log'],
  },
  {
    id: 'send_emergency_alert',
    label: 'Emergency Alert',
    icon: 'alert-circle',
    action: 'sendEmergencyAlert',
    path: '/dashboard/emergency',
    requiredPermissions: ['emergency_alerts'],
  },
]

/**
 * Get visible quick actions for a role
 * Requirements: 1.5 - Hide features not in role's permission set
 * 
 * @param role - The staff role to check
 * @returns Array of quick actions that should be visible
 */
export function getVisibleQuickActions(role: StaffRole | Role): QuickAction[] {
  const permittedFeatureIds = getPermittedFeatures(role)
  
  return QUICK_ACTIONS.filter(action => 
    action.requiredPermissions.every(permission => 
      permittedFeatureIds.includes(permission)
    )
  )
}

/**
 * Get quick actions for a specific dashboard type
 * Requirements: 1.5 - Hide features not in role's permission set
 */
export function getQuickActionsForDashboard(
  role: StaffRole | Role,
  dashboardType: 'teacher' | 'class_teacher' | 'dos' | 'bursar' | 'hostel' | 'support'
): QuickAction[] {
  const visibleActions = getVisibleQuickActions(role)
  
  // Define which actions are relevant for each dashboard type
  const dashboardActionIds: Record<string, string[]> = {
    teacher: ['take_attendance', 'enter_marks', 'view_class_list', 'message_class'],
    class_teacher: ['take_attendance', 'enter_marks', 'view_class_list', 'message_class', 'log_discipline'],
    dos: ['approve_marks', 'generate_reports', 'view_class_list'],
    bursar: ['record_payment', 'issue_receipt', 'view_student_balance'],
    hostel: ['track_presence', 'log_discipline', 'send_emergency_alert'],
    support: [],
  }
  
  const relevantActionIds = dashboardActionIds[dashboardType] || []
  
  return visibleActions.filter(action => 
    relevantActionIds.includes(action.id)
  )
}
