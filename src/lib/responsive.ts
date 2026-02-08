/**
 * Responsive Design Utilities
 * Requirements: 10.1, 10.2, 10.3, 10.5
 * - Mobile breakpoints (320-767px)
 * - Tablet breakpoints (768-1023px)  
 * - Desktop breakpoints (1024px+)
 * - Touch-friendly controls (44x44px minimum)
 */

import { cn } from '@/lib/utils'

// ============================================
// BREAKPOINT CONSTANTS
// Requirements: 10.1, 10.2, 10.3
// ============================================

export const BREAKPOINTS = {
  mobile: {
    min: 320,
    max: 767,
  },
  tablet: {
    min: 768,
    max: 1023,
  },
  desktop: {
    min: 1024,
    max: Infinity,
  },
} as const

// Tailwind CSS breakpoint classes for consistency
export const TAILWIND_BREAKPOINTS = {
  xs: '480px',  // Extra small devices
  sm: '640px',  // Small devices
  md: '768px',  // Medium devices (tablets)
  lg: '1024px', // Large devices (desktops)
  xl: '1280px', // Extra large devices
  '2xl': '1536px', // 2X large devices
} as const

// ============================================
// RESPONSIVE CLASSES
// ============================================

/**
 * Touch-friendly control classes
 * Ensures minimum 44x44px touch targets (Requirement 10.5)
 */
export const touchFriendlyClasses = {
  // Minimum touch target size
  touchTarget: 'min-h-[44px] min-w-[44px]',
  
  // Button variants with enhanced mobile sizing
  button: 'min-h-[44px] px-4 py-3 sm:px-4 sm:py-2 text-sm sm:text-base',
  iconButton: 'min-h-[44px] min-w-[44px] p-3 sm:p-2',
  smallButton: 'min-h-[44px] px-3 py-2 text-xs sm:text-sm',
  
  // Interactive elements
  checkbox: 'min-h-[44px] min-w-[44px] p-2',
  radio: 'min-h-[44px] min-w-[44px] p-2',
  link: 'min-h-[44px] py-2 px-1 inline-flex items-center',
  
  // Form controls
  input: 'min-h-[44px] px-3 py-2 text-sm sm:text-base',
  select: 'min-h-[44px] px-3 py-2 text-sm sm:text-base',
  textarea: 'min-h-[44px] px-3 py-2 text-sm sm:text-base',
  
  // Navigation elements
  navItem: 'min-h-[44px] px-3 py-2 flex items-center',
  tabItem: 'min-h-[44px] px-4 py-2 flex items-center justify-center',
}

/**
 * Responsive grid classes
 * Adapts columns based on screen size
 */
export const responsiveGridClasses = {
  // Statistics cards: 1 col mobile, 2 col small, 3 col medium, 5 col large
  statsGrid: 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4',
  
  // Content grid: 1 col mobile, 2 col tablet, 3 col desktop
  contentGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
  
  // Form grid: 1 col mobile, 2 col tablet+
  formGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  
  // Action grid: Stack on mobile, inline on tablet+
  actionGrid: 'flex flex-col sm:flex-row gap-2 sm:gap-3',
  
  // Dashboard specific grids
  dashboardCards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6',
  metricsGrid: 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4',
  
  // Business Intelligence grids
  biChartsGrid: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6',
  biMetricsGrid: 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
}

/**
 * Responsive spacing classes
 * Consistent spacing across breakpoints
 */
export const responsiveSpacingClasses = {
  // Container padding
  containerPadding: 'px-2 sm:px-3 md:px-4 lg:px-6',
  
  // Section spacing
  sectionSpacing: 'space-y-3 sm:space-y-4 md:space-y-6',
  
  // Element spacing
  elementSpacing: 'gap-2 sm:gap-3 md:gap-4',
  
  // Margin classes
  marginY: 'my-2 sm:my-3 md:my-4',
  marginBottom: 'mb-3 sm:mb-4 md:mb-6',
}

/**
 * Responsive typography classes
 * Scales text appropriately across devices
 */
export const responsiveTypographyClasses = {
  // Headings
  h1: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold',
  h2: 'text-sm sm:text-base md:text-lg font-semibold',
  h3: 'text-sm sm:text-base font-medium',
  
  // Body text
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
  
  // Interactive text
  link: 'text-sm sm:text-base underline-offset-2 hover:underline',
  button: 'text-sm font-medium',
}

/**
 * Mobile-first responsive layout classes
 */
export const responsiveLayoutClasses = {
  // Flex layouts
  flexColumn: 'flex flex-col',
  flexRow: 'flex flex-col sm:flex-row',
  flexRowReverse: 'flex flex-col-reverse sm:flex-row',
  
  // Alignment
  itemsCenter: 'items-start sm:items-center',
  justifyBetween: 'justify-start sm:justify-between',
  
  // Widths
  fullWidth: 'w-full',
  autoWidth: 'w-full sm:w-auto',
  
  // Heights
  minHeight: 'min-h-[44px]',
  
  // Overflow
  overflowHidden: 'overflow-hidden',
  overflowScroll: 'overflow-x-auto',
}

/**
 * Table responsive classes
 * Optimizes table display for different screen sizes (Requirement 10.2)
 */
export const responsiveTableClasses = {
  // Container with enhanced mobile optimization
  container: 'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden',
  
  // Mobile card view - Single column layout for mobile
  mobileCard: 'md:hidden space-y-3 p-4',
  mobileCardItem: 'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4 space-y-2 shadow-sm',
  mobileCardHeader: 'flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 pb-2 border-b',
  mobileCardContent: 'space-y-2 pt-2',
  mobileCardField: 'flex justify-between items-center py-1',
  mobileCardLabel: 'text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]',
  mobileCardValue: 'text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]',
  
  // Desktop table view
  desktopTable: 'hidden md:block overflow-x-auto',
  
  // Table elements with responsive sizing
  table: 'w-full text-sm',
  tableHeader: 'border-b bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]',
  tableRow: 'border-b hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors',
  tableCell: 'py-3 px-4 text-sm',
  tableCellCompact: 'py-2 px-3 text-xs sm:text-sm',
  
  // Responsive column visibility
  hideOnMobile: 'hidden md:table-cell',
  hideOnTablet: 'hidden lg:table-cell',
  showOnMobile: 'table-cell md:hidden',
}

/**
 * Alert and notification responsive classes
 */
export const responsiveAlertClasses = {
  // Alert container
  container: 'p-3 sm:p-4 rounded-lg border',
  
  // Alert content
  content: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4',
  
  // Alert actions
  actions: 'flex flex-col sm:flex-row gap-2 sm:gap-3',
}

/**
 * Navigation responsive classes
 */
export const responsiveNavClasses = {
  // Mobile navigation
  mobileNav: 'lg:hidden',
  mobileNavButton: 'fixed left-4 top-4 z-40 lg:hidden min-h-[44px] min-w-[44px]',
  
  // Desktop navigation
  desktopNav: 'hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-30 w-64',
  
  // Bottom navigation
  bottomNav: 'fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--bg-main)] dark:bg-[var(--text-primary)] lg:hidden',
  bottomNavItem: 'flex flex-1 flex-col items-center justify-center py-2 min-h-[56px]',
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get responsive classes based on component type
 */
export function getResponsiveClasses(type: keyof typeof responsiveLayoutClasses, additionalClasses?: string) {
  return cn(responsiveLayoutClasses[type], additionalClasses)
}

/**
 * Get touch-friendly classes for interactive elements
 */
export function getTouchFriendlyClasses(type: keyof typeof touchFriendlyClasses, additionalClasses?: string) {
  return cn(touchFriendlyClasses[type], additionalClasses)
}

/**
 * Get responsive grid classes
 */
export function getResponsiveGridClasses(type: keyof typeof responsiveGridClasses, additionalClasses?: string) {
  return cn(responsiveGridClasses[type], additionalClasses)
}

/**
 * Get responsive spacing classes
 */
export function getResponsiveSpacingClasses(type: keyof typeof responsiveSpacingClasses, additionalClasses?: string) {
  return cn(responsiveSpacingClasses[type], additionalClasses)
}

/**
 * Get responsive typography classes
 */
export function getResponsiveTypographyClasses(type: keyof typeof responsiveTypographyClasses, additionalClasses?: string) {
  return cn(responsiveTypographyClasses[type], additionalClasses)
}

/**
 * Check if current screen size matches breakpoint
 * Note: This is for client-side usage only
 */
export function useBreakpoint() {
  if (typeof window === 'undefined') {
    return 'desktop' // Default for SSR
  }
  
  const width = window.innerWidth
  
  if (width >= BREAKPOINTS.desktop.min) return 'desktop'
  if (width >= BREAKPOINTS.tablet.min) return 'tablet'
  return 'mobile'
}

/**
 * Get responsive column count based on screen size
 */
export function getResponsiveColumns(mobile: number = 1, tablet: number = 2, desktop: number = 3) {
  const breakpoint = useBreakpoint()
  
  switch (breakpoint) {
    case 'mobile':
      return mobile
    case 'tablet':
      return tablet
    case 'desktop':
      return desktop
    default:
      return desktop
  }
}

/**
 * Responsive visibility classes
 */
export const responsiveVisibilityClasses = {
  // Show only on mobile
  mobileOnly: 'block md:hidden',
  
  // Show only on tablet and up
  tabletUp: 'hidden md:block',
  
  // Show only on desktop
  desktopOnly: 'hidden lg:block',
  
  // Hide on mobile
  hideMobile: 'hidden md:block',
  
  // Hide on tablet
  hideTablet: 'block md:hidden lg:block',
  
  // Hide on desktop
  hideDesktop: 'block lg:hidden',
}

/**
 * Get responsive visibility classes
 */
export function getResponsiveVisibilityClasses(type: keyof typeof responsiveVisibilityClasses, additionalClasses?: string) {
  return cn(responsiveVisibilityClasses[type], additionalClasses)
}

/**
 * Get responsive table classes
 */
export function getResponsiveTableClasses(type: keyof typeof responsiveTableClasses, additionalClasses?: string) {
  return cn(responsiveTableClasses[type], additionalClasses)
}

/**
 * Get responsive alert classes
 */
export function getResponsiveAlertClasses(type: keyof typeof responsiveAlertClasses, additionalClasses?: string) {
  return cn(responsiveAlertClasses[type], additionalClasses)
}

/**
 * Get responsive navigation classes
 */
export function getResponsiveNavClasses(type: keyof typeof responsiveNavClasses, additionalClasses?: string) {
  return cn(responsiveNavClasses[type], additionalClasses)
}

/**
 * Mobile-first responsive utility for conditional rendering
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < BREAKPOINTS.tablet.min
}

/**
 * Check if current viewport is tablet
 */
export function isTabletViewport(): boolean {
  if (typeof window === 'undefined') return false
  const width = window.innerWidth
  return width >= BREAKPOINTS.tablet.min && width <= BREAKPOINTS.tablet.max
}

/**
 * Check if current viewport is desktop
 */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return true // Default to desktop for SSR
  return window.innerWidth >= BREAKPOINTS.desktop.min
}

/**
 * Get responsive container classes based on content type
 */
export function getResponsiveContainerClasses(type: 'page' | 'section' | 'card' | 'modal' = 'page'): string {
  const baseClasses = 'w-full mx-auto'
  
  switch (type) {
    case 'page':
      return cn(baseClasses, 'px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6')
    case 'section':
      return cn(baseClasses, 'px-3 sm:px-4 md:px-6 py-3 sm:py-4')
    case 'card':
      return cn(baseClasses, 'p-3 sm:p-4 md:p-6')
    case 'modal':
      return cn(baseClasses, 'p-4 sm:p-6 max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl')
    default:
      return baseClasses
  }
}