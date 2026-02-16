/**
 * Theme-Safe Text Components
 * These components ensure text is visible across all themes by using inline styles with fallback colors
 */

import React from 'react'

interface ThemeSafeTextProps {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'label'
  variant?: 'primary' | 'secondary' | 'muted' | 'success' | 'danger' | 'warning'
}

const colorMap = {
  primary: { light: '#1a1a1a', dark: '#ffffff' },
  secondary: { light: '#4a5568', dark: '#cbd5e0' },
  muted: { light: '#718096', dark: '#a0aec0' },
  success: { light: '#22c55e', dark: '#4ade80' },
  danger: { light: '#ef4444', dark: '#f87171' },
  warning: { light: '#f59e0b', dark: '#fbbf24' },
}

export function ThemeSafeText({ 
  children, 
  className = '', 
  as: Component = 'span',
  variant = 'primary' 
}: ThemeSafeTextProps) {
  const colors = colorMap[variant]
  
  return (
    <Component 
      className={className}
      style={{ 
        color: `var(--text-${variant}, ${colors.light})`,
      }}
    >
      {children}
    </Component>
  )
}

// Specific variants for common use cases
export function PrimaryText(props: Omit<ThemeSafeTextProps, 'variant'>) {
  return <ThemeSafeText {...props} variant="primary" />
}

export function SecondaryText(props: Omit<ThemeSafeTextProps, 'variant'>) {
  return <ThemeSafeText {...props} variant="secondary" />
}

export function MutedText(props: Omit<ThemeSafeTextProps, 'variant'>) {
  return <ThemeSafeText {...props} variant="muted" />
}
