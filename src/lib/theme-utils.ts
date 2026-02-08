/**
 * Theme Utility Functions
 * Provides consistent theme-compliant styling across components
 */

export interface ThemeColors {
  // Background colors
  bgMain: string
  bgSurface: string
  bgElevated: string
  
  // Text colors
  textPrimary: string
  textSecondary: string
  textMuted: string
  
  // Border colors
  borderDefault: string
  borderStrong: string
  
  // Accent colors
  accentPrimary: string
  accentHover: string
  accentContrast: string
  
  // Status colors
  danger: string
  success: string
  warning: string
  info: string
  
  // Status light/dark variants
  dangerLight: string
  dangerDark: string
  successLight: string
  successDark: string
  warningLight: string
  warningDark: string
  infoLight: string
  infoDark: string
}

/**
 * Get theme-compliant CSS variables as style object
 */
export const getThemeStyles = () => ({
  // Background styles
  bgMain: { backgroundColor: 'var(--bg-main)' },
  bgSurface: { backgroundColor: 'var(--bg-surface)' },
  bgElevated: { backgroundColor: 'var(--bg-elevated)' },
  
  // Text styles
  textPrimary: { color: 'var(--text-primary)' },
  textSecondary: { color: 'var(--text-secondary)' },
  textMuted: { color: 'var(--text-muted)' },
  
  // Border styles
  borderDefault: { borderColor: 'var(--border-default)' },
  borderStrong: { borderColor: 'var(--border-strong)' },
  
  // Accent styles
  accentPrimary: { backgroundColor: 'var(--accent-primary)', color: 'var(--accent-contrast)' },
  accentText: { color: 'var(--accent-primary)' },
  
  // Status styles
  danger: { backgroundColor: 'var(--danger)', color: 'var(--bg-main)' },
  dangerLight: { backgroundColor: 'var(--danger-light)', color: 'var(--danger-dark)', borderColor: 'var(--danger)' },
  dangerText: { color: 'var(--danger)' },
  
  success: { backgroundColor: 'var(--success)', color: 'var(--bg-main)' },
  successLight: { backgroundColor: 'var(--success-light)', color: 'var(--success-dark)', borderColor: 'var(--success)' },
  successText: { color: 'var(--success)' },
  
  warning: { backgroundColor: 'var(--warning)', color: 'var(--bg-main)' },
  warningLight: { backgroundColor: 'var(--warning-light)', color: 'var(--warning-dark)', borderColor: 'var(--warning)' },
  warningText: { color: 'var(--warning)' },
  
  info: { backgroundColor: 'var(--info)', color: 'var(--bg-main)' },
  infoLight: { backgroundColor: 'var(--info-light)', color: 'var(--info-dark)', borderColor: 'var(--info)' },
  infoText: { color: 'var(--info)' },
})

/**
 * Get theme-compliant Tailwind classes
 * Note: These should be used sparingly, prefer CSS variables when possible
 */
export const getThemeClasses = () => ({
  // Card/container classes
  card: 'border rounded-lg',
  surface: 'rounded-lg',
  
  // Interactive classes
  button: 'transition-all duration-200 hover:opacity-90',
  link: 'hover:opacity-80 transition-opacity',
  
  // Layout classes
  container: 'space-y-6 p-4 sm:p-6',
  section: 'space-y-4',
  
  // Status classes (use with style prop for colors)
  alert: 'p-4 border rounded-lg',
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-sm',
})

/**
 * Create theme-compliant inline styles for common patterns
 */
export const createThemeStyle = {
  card: () => ({
    backgroundColor: 'var(--bg-elevated)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)'
  }),
  
  surface: () => ({
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)'
  }),
  
  alert: (type: 'danger' | 'success' | 'warning' | 'info') => ({
    backgroundColor: `var(--${type}-light)`,
    borderColor: `var(--${type})`,
    color: `var(--${type}-dark)`
  }),
  
  button: (variant: 'primary' | 'danger' | 'success' | 'warning') => {
    const variantMap = {
      primary: { backgroundColor: 'var(--accent-primary)', color: 'var(--accent-contrast)' },
      danger: { backgroundColor: 'var(--danger)', color: 'var(--bg-main)' },
      success: { backgroundColor: 'var(--success)', color: 'var(--bg-main)' },
      warning: { backgroundColor: 'var(--warning)', color: 'var(--bg-main)' }
    }
    return variantMap[variant]
  },
  
  text: (variant: 'primary' | 'secondary' | 'muted') => ({
    color: `var(--text-${variant})`
  }),
  
  border: (variant: 'default' | 'strong' = 'default') => ({
    borderColor: `var(--border-${variant})`
  }),
  
  spinner: () => ({
    borderColor: 'currentColor',
    borderTopColor: 'transparent'
  })
}

/**
 * Common theme-compliant component styles
 */
export const themeComponents = {
  modal: {
    overlay: {
      backgroundColor: 'var(--overlay-medium)'
    },
    content: {
      backgroundColor: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
      color: 'var(--text-primary)'
    }
  },
  
  input: {
    backgroundColor: 'var(--bg-main)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)',
    '::placeholder': {
      color: 'var(--text-muted)'
    }
  },
  
  dropdown: {
    backgroundColor: 'var(--bg-elevated)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)'
  }
}