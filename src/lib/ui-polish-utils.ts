/**
 * UI Polish Utilities for Teacher Marks Management System
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 * - Fine-tune animations and transitions
 * - Optimize color schemes and visual hierarchy
 * - Ensure consistent spacing and typography
 * - Add final touches to micro-interactions
 */

import { cn } from './utils'

/**
 * Animation class names for consistent micro-interactions
 */
export const animations = {
  // Transitions
  smooth: 'marks-transition',
  smoothSlow: 'transition-all duration-300 ease-in-out',
  bounce: 'transition-all duration-300 cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Hover effects
  hoverLift: 'marks-card-hover',
  hoverScale: 'transition-transform duration-200 hover:scale-102',
  hoverBrightness: 'transition-all duration-200 hover:brightness-110',
  
  // Active/Press effects
  activePress: 'transition-transform duration-100 active:scale-98',
  activePulse: 'transition-all duration-150 active:scale-95 active:opacity-80',
  
  // Feedback animations
  successFlash: 'marks-success-flash',
  errorShake: 'marks-error-shake',
  fadeIn: 'marks-fade-in',
  
  // Loading states
  skeleton: 'marks-skeleton',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  
  // Focus states
  focusVisible: 'marks-focus-visible',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2',
} as const

/**
 * Enhanced color utilities with semantic meaning
 */
export const semanticColors = {
  // Status colors
  success: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  
  // Grade-specific colors
  excellent: {
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  good: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  average: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  poor: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  failing: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
} as const

/**
 * Responsive spacing utilities
 */
export const responsiveSpacing = {
  // Padding
  cardPadding: 'p-4 sm:p-6',
  sectionPadding: 'p-3 sm:p-4 md:p-6',
  compactPadding: 'p-2 sm:p-3',
  
  // Margins
  sectionMargin: 'mb-4 sm:mb-6',
  elementMargin: 'mb-2 sm:mb-3',
  
  // Gaps
  gridGap: 'gap-3 sm:gap-4 md:gap-6',
  flexGap: 'gap-2 sm:gap-3',
} as const

/**
 * Typography scale with responsive sizing
 */
export const responsiveTypography = {
  pageTitle: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  sectionTitle: 'text-lg sm:text-xl md:text-2xl font-semibold',
  cardTitle: 'text-base sm:text-lg font-medium',
  body: 'text-sm sm:text-base',
  caption: 'text-xs sm:text-sm',
  label: 'text-xs sm:text-sm font-medium',
} as const

/**
 * Interactive element styles
 */
export const interactiveStyles = {
  button: cn(
    animations.smooth,
    animations.activePress,
    animations.focusRing,
    'cursor-pointer select-none'
  ),
  card: cn(
    animations.smooth,
    animations.hoverLift,
    animations.focusVisible,
    'cursor-pointer'
  ),
  input: cn(
    animations.smooth,
    animations.focusRing,
    'transition-colors'
  ),
  link: cn(
    animations.smooth,
    animations.focusRing,
    'hover:underline'
  ),
} as const

/**
 * Get grade color based on score percentage
 */
export function getGradeColor(percentage: number): typeof semanticColors.excellent {
  if (percentage >= 90) return semanticColors.excellent
  if (percentage >= 75) return semanticColors.good
  if (percentage >= 60) return semanticColors.average
  if (percentage >= 50) return semanticColors.poor
  return semanticColors.failing
}

/**
 * Get status color based on completion state
 */
export function getStatusColor(hasCA: boolean, hasExam: boolean): typeof semanticColors.success {
  if (hasCA && hasExam) return semanticColors.success
  if (hasCA || hasExam) return semanticColors.warning
  return semanticColors.error
}

/**
 * Format number with consistent decimal places
 */
export function formatScore(score: number, decimals: number = 1): string {
  return score.toFixed(decimals)
}

/**
 * Get responsive class based on screen size
 */
export function getResponsiveClass(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  const classes = [mobile]
  if (tablet) classes.push(`sm:${tablet}`)
  if (desktop) classes.push(`md:${desktop}`)
  return cn(...classes)
}

/**
 * Stagger animation delay for list items
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): string {
  return `animation-delay: ${index * baseDelay}ms`
}

/**
 * Visual hierarchy utilities
 */
export const visualHierarchy = {
  // Elevation levels (z-index)
  base: 'z-0',
  raised: 'z-10',
  dropdown: 'z-20',
  sticky: 'z-30',
  modal: 'z-40',
  toast: 'z-50',
  
  // Shadow levels
  shadowNone: 'shadow-none',
  shadowSm: 'shadow-sm',
  shadowMd: 'shadow-md',
  shadowLg: 'shadow-lg',
  shadowXl: 'shadow-xl',
  
  // Border emphasis
  borderSubtle: 'border border-[var(--border-subtle)]',
  borderDefault: 'border border-[var(--border-default)]',
  borderEmphasis: 'border-2 border-[var(--accent-primary)]',
} as const

/**
 * Loading state utilities
 */
export const loadingStates = {
  skeleton: (className?: string) => cn(
    animations.skeleton,
    'rounded-md bg-[var(--bg-muted)]',
    className
  ),
  spinner: (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    }
    return cn(animations.spin, sizes[size])
  },
  pulse: (className?: string) => cn(
    animations.pulse,
    className
  ),
} as const

/**
 * Accessibility utilities
 */
export const a11yUtils = {
  srOnly: 'sr-only',
  notSrOnly: 'not-sr-only',
  focusVisible: animations.focusVisible,
  ariaLabel: (label: string) => ({ 'aria-label': label }),
  ariaDescribedBy: (id: string) => ({ 'aria-describedby': id }),
} as const
