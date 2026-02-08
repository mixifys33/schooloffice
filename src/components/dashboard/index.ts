/**
 * Dashboard Components Index
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 1.1, 1.2
 * Exports all reusable dashboard components
 */

export { AlertCard, type AlertCardProps } from './alert-card'
export { QuickActionButton, type QuickActionButtonProps } from './quick-action-button'
export { ClassCard, type ClassCardProps } from './class-card'
export { TaskList, type TaskListProps } from './task-list'
export { StatsCard, StatsGrid, type StatsCardProps, type StatsGridProps } from './stats-card'
export { 
  DashboardRoleSwitcher, 
  getStoredRole,
  type DashboardRoleSwitcherProps 
} from './role-switcher'
export {
  DashboardRouter,
  getDashboardPathForRole,
  getUserAvailableRoles,
  useEffectiveRole,
  type DashboardRouterProps,
} from './dashboard-router'
export { TeacherContextBar } from './teacher-context-bar'
export { DoSContextBar } from './dos-context-bar'
export { TodayPanel, type TodayPanelProps, type ScheduledClass } from './today-panel'
