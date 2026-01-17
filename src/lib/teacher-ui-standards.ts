/**
 * Teacher Dashboard UI Design Standards
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 
 * This module provides consistent styling utilities for the teacher dashboard
 * to ensure a calm, predictable interface that helps teachers focus on work.
 */

/**
 * Muted color palette for teacher dashboard
 * Requirement 12.1: Dense but clean layout with muted colors
 */
export const teacherColors = {
  // Primary action colors (muted)
  primary: {
    bg: 'bg-slate-700 dark:bg-slate-600',
    bgHover: 'hover:bg-slate-800 dark:hover:bg-slate-500',
    text: 'text-white',
    border: 'border-slate-700 dark:border-slate-600',
  },
  // Secondary/outline colors
  secondary: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    bgHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  // Status colors (muted versions)
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
  },
  // Neutral/disabled colors
  disabled: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-400 dark:text-slate-500',
    border: 'border-slate-200 dark:border-slate-700',
  },
} as const

/**
 * Button state styles
 * Requirement 12.2: Clearly indicate enabled vs disabled states
 */
export const buttonStates = {
  enabled: {
    primary: 'bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-500 cursor-pointer',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer',
    outline: 'bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer',
  },
  disabled: {
    // Requirement 12.2: Clear visual distinction for disabled state
    primary: 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60',
    outline: 'bg-transparent text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60',
  },
  // Requirement 12.3: Hidden state for non-permitted actions
  hidden: 'hidden',
} as const

/**
 * Card styles for dense but clean layout
 * Requirement 12.1: Dense but clean layout
 */
export const cardStyles = {
  base: 'bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800',
  compact: 'p-4', // Dense padding
  normal: 'p-5',
  header: 'pb-3 border-b border-slate-100 dark:border-slate-800',
  content: 'pt-4',
} as const

/**
 * Status badge styles
 * Requirement 12.2: Clear visual distinction for states
 */
export const statusBadgeStyles = {
  done: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  locked: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  active: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  error: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
} as const

/**
 * Error message component styles
 * Requirement 12.4: Clear, specific error messages with next steps
 */
export interface ErrorMessageConfig {
  title: string
  message: string
  nextSteps?: string[]
  actionLabel?: string
  actionHref?: string
}

/**
 * Common error messages with next steps
 * Requirement 12.4: Display clear, specific error messages
 */
export const errorMessages: Record<string, ErrorMessageConfig> = {
  attendanceLocked: {
    title: 'Attendance Locked',
    message: 'The attendance cutoff time has passed for today.',
    nextSteps: [
      'Contact your school administrator to request an edit',
      'Provide the date and class details when requesting',
    ],
  },
  marksLocked: {
    title: 'Marks Entry Locked',
    message: 'Results have been published and marks cannot be modified.',
    nextSteps: [
      'Contact the academic office if corrections are needed',
      'Provide the exam, subject, and student details',
    ],
  },
  notAssigned: {
    title: 'Access Denied',
    message: 'You are not assigned to this class or subject.',
    nextSteps: [
      'Verify you are viewing the correct class',
      'Contact administration if you believe this is an error',
    ],
  },
  noActiveTerm: {
    title: 'No Active Term',
    message: 'There is no active academic term configured.',
    nextSteps: [
      'Data entry operations are disabled',
      'Contact your school administrator',
    ],
  },
  networkError: {
    title: 'Connection Error',
    message: 'Unable to connect to the server.',
    nextSteps: [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the problem persists',
    ],
  },
  sessionExpired: {
    title: 'Session Expired',
    message: 'Your session has expired for security reasons.',
    nextSteps: [
      'Please log in again to continue',
    ],
    actionLabel: 'Log In',
    actionHref: '/login',
  },
} as const

/**
 * Animation-free transition classes
 * Requirement 12.1: No decorative animations
 * Only functional transitions for state changes
 */
export const transitions = {
  // Minimal, functional transitions only
  color: 'transition-colors duration-150',
  opacity: 'transition-opacity duration-150',
  // No decorative animations
  none: '',
} as const

/**
 * Layout spacing for dense but clean design
 * Requirement 12.1: Dense but clean layout
 */
export const spacing = {
  section: 'space-y-4', // Reduced from space-y-6
  card: 'space-y-3',
  form: 'space-y-3',
  inline: 'gap-2',
  grid: 'gap-3',
} as const

/**
 * Typography for clean, readable text
 */
export const typography = {
  pageTitle: 'text-lg font-semibold text-slate-900 dark:text-white',
  sectionTitle: 'text-base font-medium text-slate-900 dark:text-white',
  label: 'text-sm font-medium text-slate-700 dark:text-slate-300',
  body: 'text-sm text-slate-600 dark:text-slate-400',
  caption: 'text-xs text-slate-500 dark:text-slate-400',
  error: 'text-sm text-rose-600 dark:text-rose-400',
} as const

/**
 * Helper to determine if an action should be shown or hidden
 * Requirement 12.3: Hide or disable non-permitted actions
 */
export function getActionVisibility(
  isPermitted: boolean,
  hideWhenNotPermitted: boolean = true
): 'visible' | 'disabled' | 'hidden' {
  if (isPermitted) return 'visible'
  return hideWhenNotPermitted ? 'hidden' : 'disabled'
}

/**
 * Helper to get button classes based on state
 * Requirement 12.2: Clear visual distinction for button states
 */
export function getButtonClasses(
  variant: 'primary' | 'secondary' | 'outline',
  isEnabled: boolean
): string {
  return isEnabled ? buttonStates.enabled[variant] : buttonStates.disabled[variant]
}
