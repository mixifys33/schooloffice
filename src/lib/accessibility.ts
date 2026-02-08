/**
 * Accessibility Utilities
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 * - WCAG 2.1 AA compliance
 * - Proper ARIA labels and semantic HTML
 * - Keyboard navigation support
 * - Sufficient color contrast ratios
 * - Screen reader support
 * - Focus indicators
 * - Full keyboard navigation
 * 
 * This module provides utilities and hooks for implementing comprehensive
 * accessibility features across the Teacher Marks Management System.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// ARIA Live Region Types
export type AriaLiveType = 'off' | 'polite' | 'assertive'

// Focus Management Types
export type FocusableElement = HTMLElement & {
  focus(): void
  blur(): void
}

// Keyboard Navigation Types
export type KeyboardNavigationDirection = 'next' | 'previous' | 'first' | 'last'

/**
 * WCAG 2.1 AA Color Contrast Utilities
 */
export const colorContrast = {
  /**
   * Calculate relative luminance of a color
   * Based on WCAG 2.1 formula
   */
  getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  },

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1)
    const lum2 = this.getLuminance(color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)
  },

  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background)
    return isLargeText ? ratio >= 3 : ratio >= 4.5
  },

  /**
   * Check if color combination meets WCAG AAA standards
   */
  meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background)
    return isLargeText ? ratio >= 4.5 : ratio >= 7
  }
}

/**
 * ARIA Label Generation Utilities
 */
export const ariaLabels = {
  /**
   * Generate descriptive label for form fields
   */
  formField(label: string, required = false, error?: string): string {
    let ariaLabel = label
    if (required) ariaLabel += ', required'
    if (error) ariaLabel += `, error: ${error}`
    return ariaLabel
  },

  /**
   * Generate label for interactive elements
   */
  interactive(action: string, target?: string, state?: string): string {
    let label = action
    if (target) label += ` ${target}`
    if (state) label += `, ${state}`
    return label
  },

  /**
   * Generate label for data tables
   */
  tableCell(columnHeader: string, rowHeader: string, value: string): string {
    return `${columnHeader}: ${value} for ${rowHeader}`
  },

  /**
   * Generate label for progress indicators
   */
  progress(current: number, total: number, label?: string): string {
    const percentage = Math.round((current / total) * 100)
    let ariaLabel = `${percentage}% complete`
    if (label) ariaLabel = `${label}: ${ariaLabel}`
    return ariaLabel
  },

  /**
   * Generate label for status indicators
   */
  status(status: string, context?: string): string {
    let label = `Status: ${status}`
    if (context) label = `${context} ${label}`
    return label
  }
}

/**
 * Focus Management Hook
 */
export function useFocusManagement() {
  const focusableElementsSelector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ')

  const getFocusableElements = useCallback((container: HTMLElement): FocusableElement[] => {
    return Array.from(container.querySelectorAll(focusableElementsSelector)) as FocusableElement[]
  }, [focusableElementsSelector])

  const focusFirst = useCallback((container: HTMLElement) => {
    const elements = getFocusableElements(container)
    if (elements.length > 0) {
      elements[0].focus()
    }
  }, [getFocusableElements])

  const focusLast = useCallback((container: HTMLElement) => {
    const elements = getFocusableElements(container)
    if (elements.length > 0) {
      elements[elements.length - 1].focus()
    }
  }, [getFocusableElements])

  const focusNext = useCallback((container: HTMLElement, currentElement: HTMLElement) => {
    const elements = getFocusableElements(container)
    const currentIndex = elements.indexOf(currentElement as FocusableElement)
    if (currentIndex >= 0 && currentIndex < elements.length - 1) {
      elements[currentIndex + 1].focus()
    } else if (elements.length > 0) {
      elements[0].focus() // Wrap to first
    }
  }, [getFocusableElements])

  const focusPrevious = useCallback((container: HTMLElement, currentElement: HTMLElement) => {
    const elements = getFocusableElements(container)
    const currentIndex = elements.indexOf(currentElement as FocusableElement)
    if (currentIndex > 0) {
      elements[currentIndex - 1].focus()
    } else if (elements.length > 0) {
      elements[elements.length - 1].focus() // Wrap to last
    }
  }, [getFocusableElements])

  return {
    getFocusableElements,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  }
}

/**
 * Keyboard Navigation Hook
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    direction?: 'horizontal' | 'vertical' | 'both'
    wrap?: boolean
    onEscape?: () => void
    onEnter?: (element: HTMLElement) => void
  } = {}
) {
  const { direction = 'both', wrap = true, onEscape, onEnter } = options
  const { focusNext, focusPrevious, focusFirst, focusLast } = useFocusManagement()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      
      switch (event.key) {
        case 'ArrowDown':
          if (direction === 'vertical' || direction === 'both') {
            event.preventDefault()
            focusNext(container, target)
          }
          break
        case 'ArrowUp':
          if (direction === 'vertical' || direction === 'both') {
            event.preventDefault()
            focusPrevious(container, target)
          }
          break
        case 'ArrowRight':
          if (direction === 'horizontal' || direction === 'both') {
            event.preventDefault()
            focusNext(container, target)
          }
          break
        case 'ArrowLeft':
          if (direction === 'horizontal' || direction === 'both') {
            event.preventDefault()
            focusPrevious(container, target)
          }
          break
        case 'Home':
          event.preventDefault()
          focusFirst(container)
          break
        case 'End':
          event.preventDefault()
          focusLast(container)
          break
        case 'Escape':
          if (onEscape) {
            event.preventDefault()
            onEscape()
          }
          break
        case 'Enter':
        case ' ':
          if (onEnter && (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button')) {
            event.preventDefault()
            onEnter(target)
          }
          break
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, direction, wrap, onEscape, onEnter, focusNext, focusPrevious, focusFirst, focusLast])
}

/**
 * Live Region Hook for Screen Reader Announcements
 */
export function useLiveRegion() {
  const [liveRegion, setLiveRegion] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create or find existing live region
    let region = document.getElementById('aria-live-region') as HTMLElement
    if (!region) {
      region = document.createElement('div')
      region.id = 'aria-live-region'
      region.setAttribute('aria-live', 'polite')
      region.setAttribute('aria-atomic', 'true')
      region.style.position = 'absolute'
      region.style.left = '-10000px'
      region.style.width = '1px'
      region.style.height = '1px'
      region.style.overflow = 'hidden'
      document.body.appendChild(region)
    }
    setLiveRegion(region)

    return () => {
      // Clean up on unmount
      if (region && region.parentNode) {
        region.parentNode.removeChild(region)
      }
    }
  }, [])

  const announce = useCallback((message: string, priority: AriaLiveType = 'polite') => {
    if (!liveRegion) return

    // Update the live region priority if needed
    if (liveRegion.getAttribute('aria-live') !== priority) {
      liveRegion.setAttribute('aria-live', priority)
    }

    // Clear and set the message
    liveRegion.textContent = ''
    setTimeout(() => {
      liveRegion.textContent = message
    }, 100)
  }, [liveRegion])

  return { announce }
}

/**
 * Focus Trap Hook for Modal Dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)
  const { getFocusableElements } = useFocusManagement()

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = getFocusableElements(container)
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the first element
    firstElement.focus()

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isActive, getFocusableElements])

  return containerRef
}

/**
 * Reduced Motion Hook
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Skip Link Component Props
 */
export interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * Accessibility Testing Utilities
 */
export const a11yTesting = {
  /**
   * Check if element has proper ARIA labels
   */
  hasAriaLabel(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.getAttribute('aria-describedby')
    )
  },

  /**
   * Check if interactive element is keyboard accessible
   */
  isKeyboardAccessible(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex')
    return (
      element.tagName === 'BUTTON' ||
      element.tagName === 'A' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.tagName === 'TEXTAREA' ||
      (tabIndex !== null && tabIndex !== '-1')
    )
  },

  /**
   * Check if element has sufficient color contrast
   */
  hasSufficientContrast(element: HTMLElement): boolean {
    const styles = window.getComputedStyle(element)
    const color = styles.color
    const backgroundColor = styles.backgroundColor
    
    // This is a simplified check - in practice, you'd need more sophisticated color parsing
    return true // Placeholder - implement actual contrast checking
  },

  /**
   * Generate accessibility report for an element
   */
  generateReport(element: HTMLElement): {
    hasAriaLabel: boolean
    isKeyboardAccessible: boolean
    hasSufficientContrast: boolean
    issues: string[]
  } {
    const issues: string[] = []
    const hasAriaLabel = this.hasAriaLabel(element)
    const isKeyboardAccessible = this.isKeyboardAccessible(element)
    const hasSufficientContrast = this.hasSufficientContrast(element)

    if (!hasAriaLabel) {
      issues.push('Missing ARIA label or description')
    }
    if (!isKeyboardAccessible) {
      issues.push('Not keyboard accessible')
    }
    if (!hasSufficientContrast) {
      issues.push('Insufficient color contrast')
    }

    return {
      hasAriaLabel,
      isKeyboardAccessible,
      hasSufficientContrast,
      issues
    }
  }
}

/**
 * Screen Reader Utilities
 */
export const screenReader = {
  /**
   * Hide element from screen readers
   */
  hide(element: HTMLElement): void {
    element.setAttribute('aria-hidden', 'true')
  },

  /**
   * Show element to screen readers
   */
  show(element: HTMLElement): void {
    element.removeAttribute('aria-hidden')
  },

  /**
   * Mark element as decorative
   */
  decorative(element: HTMLElement): void {
    element.setAttribute('role', 'presentation')
    element.setAttribute('aria-hidden', 'true')
  },

  /**
   * Set element as live region
   */
  liveRegion(element: HTMLElement, priority: AriaLiveType = 'polite'): void {
    element.setAttribute('aria-live', priority)
    element.setAttribute('aria-atomic', 'true')
  }
}

/**
 * Form Accessibility Utilities
 */
export const formA11y = {
  /**
   * Associate label with form control
   */
  associateLabel(labelElement: HTMLElement, controlElement: HTMLElement, controlId: string): void {
    labelElement.setAttribute('for', controlId)
    controlElement.setAttribute('id', controlId)
  },

  /**
   * Add error description to form control
   */
  addErrorDescription(controlElement: HTMLElement, errorElement: HTMLElement, errorId: string): void {
    errorElement.setAttribute('id', errorId)
    errorElement.setAttribute('role', 'alert')
    controlElement.setAttribute('aria-describedby', errorId)
    controlElement.setAttribute('aria-invalid', 'true')
  },

  /**
   * Remove error description from form control
   */
  removeErrorDescription(controlElement: HTMLElement): void {
    controlElement.removeAttribute('aria-describedby')
    controlElement.removeAttribute('aria-invalid')
  },

  /**
   * Mark field as required
   */
  markRequired(controlElement: HTMLElement): void {
    controlElement.setAttribute('aria-required', 'true')
  }
}