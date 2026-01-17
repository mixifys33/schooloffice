'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

/**
 * QuickActionButton Component
 * Requirements: 11.2 - Quick action button with icon, label, and navigation
 * Touch-friendly sizing (min 44px tap target)
 * Supports primary, secondary, outline variants
 */

export interface QuickActionButtonProps {
  /** Lucide icon component */
  icon: LucideIcon
  /** Button label */
  label: string
  /** Navigation URL */
  href: string
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline'
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

const variantStyles = {
  primary: cn(
    'bg-primary text-primary-foreground',
    'hover:bg-primary/90',
    'dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90'
  ),
  secondary: cn(
    'bg-secondary text-secondary-foreground',
    'hover:bg-secondary/80',
    'dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80'
  ),
  outline: cn(
    'border border-input bg-background text-foreground',
    'hover:bg-accent hover:text-accent-foreground',
    'dark:border-input dark:bg-background dark:text-foreground dark:hover:bg-accent'
  ),
}

export function QuickActionButton({
  icon: Icon,
  label,
  href,
  variant = 'primary',
  disabled = false,
  className,
}: QuickActionButtonProps) {
  const baseStyles = cn(
    // Base layout
    'inline-flex flex-col items-center justify-center gap-2',
    // Touch-friendly sizing (min 44px tap target)
    'min-h-[44px] min-w-[44px] p-4',
    // Typography
    'text-sm font-medium',
    // Shape and transitions
    'rounded-lg transition-colors',
    // Focus states
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    // Disabled state
    disabled && 'pointer-events-none opacity-50'
  )

  const content = (
    <>
      <Icon className="h-6 w-6" aria-hidden="true" />
      <span className="text-center">{label}</span>
    </>
  )

  if (disabled) {
    return (
      <div
        className={cn(baseStyles, variantStyles[variant], className)}
        aria-disabled="true"
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {content}
    </Link>
  )
}
