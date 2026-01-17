'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { Button } from './button'

/**
 * AlertBanner Component
 * Requirements: 2.4, 2.5, 2.6 - Display alert banners for payment overdue, SMS balance low, term ending
 */

export interface AlertBannerProps {
  /** Alert type determines styling */
  type: 'warning' | 'danger' | 'info'
  /** Alert message to display */
  message: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Whether the alert can be dismissed */
  dismissible?: boolean
  /** Callback when alert is dismissed */
  onDismiss?: () => void
  /** Additional class names */
  className?: string
}

const alertStyles = {
  warning: {
    container: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
    text: 'text-orange-800 dark:text-orange-200',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  danger: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500 dark:text-red-400',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500 dark:text-blue-400',
  },
}

const AlertIcon = ({ type }: { type: AlertBannerProps['type'] }) => {
  const iconClass = 'h-5 w-5'
  switch (type) {
    case 'warning':
      return <AlertTriangle className={iconClass} />
    case 'danger':
      return <AlertCircle className={iconClass} />
    case 'info':
      return <Info className={iconClass} />
  }
}

export function AlertBanner({
  type,
  message,
  action,
  dismissible = false,
  onDismiss,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const styles = alertStyles[type]

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-4 py-3 border rounded-lg',
        styles.container,
        className
      )}
    >
      <div className={cn('flex-shrink-0', styles.icon)}>
        <AlertIcon type={type} />
      </div>
      <p className={cn('flex-1 text-sm font-medium', styles.text)}>
        {message}
      </p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className={cn('flex-shrink-0', styles.text)}
        >
          {action.label}
        </Button>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
            styles.icon
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
