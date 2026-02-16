/**
 * Accessibility Utilities and Helpers
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 * - Meet WCAG 2.1 AA accessibility standards
 * - Provide proper ARIA labels and semantic HTML structure
 * - Implement keyboard navigation for all elements
 * - Ensure sufficient color contrast ratios
 * - Support screen readers with proper heading structure
 * - Provide focus indicators that are clearly visible
 * - Allow users to navigate the entire interface using only keyboard input
 */

import { cn } from '@/lib/utils'

// WCAG 2.1 AA Color Contrast Ratios
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
} as const

// Focus management utilities
export const focusStyles = {
  // High-contrast focus ring that meets WCAG requirements
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-primary)]',
  // Alternative focus styles for different contexts
  ringInset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]',
  // Skip link styling
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--bg-main)] focus:text-[var(--text-primary)] focus:border focus:border-[var(--border-default)] focus:rounded-md',
} as const

// Screen reader utilities
export const screenReader = {
  // Hide content visually but keep it available to screen readers
  only: 'sr-only',
  // Show content that was previously hidden from screen readers
  show: 'not-sr-only',
  // Live region for dynamic content announcements
  livePolite: 'aria-live="polite"',
  liveAssertive: 'aria-live="assertive"',
} as const

// Semantic HTML helpers
export const semanticRoles = {
  // Navigation landmarks
  navigation: 'navigation',
  main: 'main',
  banner: 'banner',
  contentinfo: 'contentinfo',
  complementary: 'complementary',
  
  // Interactive elements
  button: 'button',
  link: 'link',
  menuitem: 'menuitem',
  tab: 'tab',
  tabpanel: 'tabpanel',
  
  // Form elements
  form: 'form',
  group: 'group',
  radiogroup: 'radiogroup',
  
  // Status and alerts
  alert: 'alert',
  status: 'status',
  log: 'log',
  
  // Tables
  table: 'table',
  row: 'row',
  cell: 'cell',
  columnheader: 'columnheader',
  rowheader: 'rowheader',
} as const

// ARIA state helpers
export const ariaStates = {
  expanded: (expanded: boolean) => ({ 'aria-expanded': expanded }),
  selected: (selected: boolean) => ({ 'aria-selected': selected }),
  checked: (checked: boolean) => ({ 'aria-checked': checked }),
  disabled: (disabled: boolean) => ({ 'aria-disabled': disabled }),
  hidden: (hidden: boolean) => ({ 'aria-hidden': hidden }),
  invalid: (invalid: boolean) => ({ 'aria-invalid': invalid }),
  required: (required: boolean) => ({ 'aria-required': required }),
  pressed: (pressed: boolean) => ({ 'aria-pressed': pressed }),
  current: (current: string) => ({ 'aria-current': current }),
} as const

// Keyboard navigation helpers
export const keyboardNavigation = {
  // Standard keyboard event handlers
  handleEnterSpace: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  },
  
  handleEscape: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      callback()
    }
  },
  
  handleArrowKeys: (callbacks: {
    up?: () => void
    down?: () => void
    left?: () => void
    right?: () => void
  }) => (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        callbacks.up?.()
        break
      case 'ArrowDown':
        event.preventDefault()
        callbacks.down?.()
        break
      case 'ArrowLeft':
        event.preventDefault()
        callbacks.left?.()
        break
      case 'ArrowRight':
        event.preventDefault()
        callbacks.right?.()
        break
    }
  },
  
  // Tab trap for modals and dialogs
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => {
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (!focusableElements || focusableElements.length === 0) return
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    return (event: React.KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }
  },
} as const

// Form accessibility helpers
export const formAccessibility = {
  // Generate unique IDs for form elements
  generateId: (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Associate labels with form controls
  labelProps: (id: string) => ({
    htmlFor: id,
  }),
  
  // Associate descriptions with form controls
  descriptionProps: (id: string, hasError?: boolean, hasHelp?: boolean) => ({
    id,
    'aria-describedby': [
      hasError ? `${id}-error` : null,
      hasHelp ? `${id}-help` : null,
    ].filter(Boolean).join(' ') || undefined,
  }),
  
  // Error message props
  errorProps: (id: string) => ({
    id: `${id}-error`,
    role: 'alert' as const,
    'aria-live': 'polite' as const,
  }),
  
  // Help text props
  helpProps: (id: string) => ({
    id: `${id}-help`,
  }),
} as const

// Table accessibility helpers
export const tableAccessibility = {
  // Table structure props
  tableProps: (caption?: string) => ({
    role: 'table',
    'aria-label': caption,
  }),
  
  // Column header props
  columnHeaderProps: (sortable?: boolean, sortDirection?: 'asc' | 'desc') => ({
    role: 'columnheader',
    scope: 'col' as const,
    ...(sortable && {
      'aria-sort': sortDirection || 'none' as const,
      tabIndex: 0,
    }),
  }),
  
  // Row header props
  rowHeaderProps: () => ({
    role: 'rowheader',
    scope: 'row' as const,
  }),
  
  // Cell props
  cellProps: () => ({
    role: 'cell',
  }),
} as const

// Loading and status accessibility
export const statusAccessibility = {
  // Loading indicator props
  loadingProps: (label?: string) => ({
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-label': label || 'Loading',
  }),
  
  // Progress indicator props
  progressProps: (value: number, max: number = 100, label?: string) => ({
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label,
  }),
  
  // Alert props
  alertProps: (level: 'info' | 'warning' | 'error' | 'success' = 'info') => ({
    role: 'alert',
    'aria-live': level === 'error' ? 'assertive' as const : 'polite' as const,
  }),
} as const

// Navigation accessibility helpers
export const navigationAccessibility = {
  // Breadcrumb navigation props
  breadcrumbProps: () => ({
    role: 'navigation',
    'aria-label': 'Breadcrumb',
  }),
  
  // Skip link props
  skipLinkProps: (targetId: string) => ({
    href: `#${targetId}`,
    className: focusStyles.skipLink,
  }),
  
  // Menu props
  menuProps: (label?: string) => ({
    role: 'menu',
    'aria-label': label,
  }),
  
  // Menu item props
  menuItemProps: (disabled?: boolean) => ({
    role: 'menuitem',
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled,
  }),
} as const

// Modal and dialog accessibility
export const dialogAccessibility = {
  // Dialog props
  dialogProps: (labelId?: string, descriptionId?: string) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelId,
    'aria-describedby': descriptionId,
  }),
  
  // Dialog overlay props
  overlayProps: () => ({
    'aria-hidden': true,
  }),
  
  // Dialog close button props
  closeButtonProps: () => ({
    'aria-label': 'Close dialog',
  }),
} as const

// Utility functions for accessibility
export const a11yUtils = {
  // Check if an element is focusable
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ]
    
    return focusableSelectors.some(selector => element.matches(selector))
  },
  
  // Get all focusable elements within a container
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')
    
    return Array.from(container.querySelectorAll(focusableSelectors))
  },
  
  // Announce content to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  },
  
  // Focus management
  focusElement: (element: HTMLElement | null) => {
    if (element && a11yUtils.isFocusable(element)) {
      element.focus()
    }
  },
  
  // Restore focus to previously focused element
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement && document.body.contains(previousElement)) {
      a11yUtils.focusElement(previousElement)
    }
  },
} as const

// Accessibility testing helpers (for development)
export const a11yTesting = {
  // Log accessibility information for debugging
  logA11yInfo: (element: HTMLElement) => {
    console.group('Accessibility Information')
    console.log('Element:', element)
    console.log('Role:', element.getAttribute('role') || 'No role specified')
    console.log('ARIA Label:', element.getAttribute('aria-label') || 'No aria-label')
    console.log('ARIA Labelledby:', element.getAttribute('aria-labelledby') || 'No aria-labelledby')
    console.log('ARIA Describedby:', element.getAttribute('aria-describedby') || 'No aria-describedby')
    console.log('Focusable:', a11yUtils.isFocusable(element))
    console.log('Tab Index:', element.tabIndex)
    console.groupEnd()
  },
  
  // Check for common accessibility issues
  checkA11yIssues: (container: HTMLElement) => {
    const issues: string[] = []
    
    // Check for images without alt text
    const images = container.querySelectorAll('img:not([alt])')
    if (images.length > 0) {
      issues.push(`${images.length} images without alt text`)
    }
    
    // Check for buttons without accessible names
    const buttons = container.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
    buttons.forEach(button => {
      if (!button.textContent?.trim()) {
        issues.push('Button without accessible name found')
      }
    })
    
    // Check for form inputs without labels
    const inputs = container.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    inputs.forEach(input => {
      const id = input.getAttribute('id')
      if (!id || !container.querySelector(`label[for="${id}"]`)) {
        issues.push('Form input without associated label found')
      }
    })
    
    return issues
  },
} as const

// Export commonly used combinations
export const commonA11yProps = {
  // Interactive element that can be activated
  interactive: (label: string, disabled?: boolean) => ({
    'aria-label': label,
    tabIndex: disabled ? -1 : 0,
    'aria-disabled': disabled,
    className: cn(focusStyles.ring, disabled && 'opacity-50 cursor-not-allowed'),
  }),
  
  // Form field with label and error support
  formField: (id: string, label: string, error?: string, help?: string, required?: boolean) => ({
    field: {
      id,
      'aria-invalid': !!error,
      'aria-required': required,
      'aria-describedby': [
        error ? `${id}-error` : null,
        help ? `${id}-help` : null,
      ].filter(Boolean).join(' ') || undefined,
      className: focusStyles.ring,
    },
    label: {
      htmlFor: id,
      children: label + (required ? ' *' : ''),
    },
    error: error ? {
      id: `${id}-error`,
      role: 'alert' as const,
      'aria-live': 'polite' as const,
      children: error,
    } : null,
    help: help ? {
      id: `${id}-help`,
      children: help,
    } : null,
  }),
  
  // Data table with sorting
  dataTable: (caption: string) => ({
    table: {
      role: 'table',
      'aria-label': caption,
    },
    caption: {
      className: 'sr-only',
      children: caption,
    },
  }),
} as const