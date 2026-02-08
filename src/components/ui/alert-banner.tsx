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
  type: 'warning' | 'danger' | 'info' | 'error' | 'success'
  /** Alert title (optional) */
  title?: string
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

const getAlertStyles = (type: AlertBannerProps['type']) => {
  switch (type) {
    case 'warning':
      return {
        backgroundColor: 'var(--warning-light)',
        borderColor: 'var(--warning)',
        color: 'var(--warning-dark)',
        iconColor: 'var(--warning)',
      }
    case 'danger':
    case 'error':
      return {
        backgroundColor: 'var(--danger-light)',
        borderColor: 'var(--danger)',
        color: 'var(--danger-dark)',
        iconColor: 'var(--danger)',
      }
    case 'info':
      return {
        backgroundColor: 'var(--info-light)',
        borderColor: 'var(--info)',
        color: 'var(--info-dark)',
        iconColor: 'var(--info)',
      }
    case 'success':
      return {
        backgroundColor: 'var(--success-light)',
        borderColor: 'var(--success)',
        color: 'var(--success-dark)',
        iconColor: 'var(--success)',
      }
    default:
      return {
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
        iconColor: 'var(--text-muted)',
      }
  }
}

const AlertIcon = ({ type }: { type: AlertBannerProps['type'] }) => {
  const iconClass = 'h-5 w-5'
  switch (type) {
    case 'warning':
      return <AlertTriangle className={iconClass} />
    case 'danger':
    case 'error':
      return <AlertCircle className={iconClass} />
    case 'info':
      return <Info className={iconClass} />
    case 'success':
      return <AlertCircle className={iconClass} />
    default:
      return <Info className={iconClass} />
  }
}

export function AlertBanner({
  type,
  title,
  message,
  action,
  dismissible = false,
  onDismiss,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const styles = getAlertStyles(type)

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
        className
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.color,
      }}
    >
      <div 
        className="flex-shrink-0"
        style={{ color: styles.iconColor }}
      >
        <AlertIcon type={type} />
      </div>
      <div className="flex-1">
        {title && (
          <p className="text-sm font-semibold mb-1">
            {title}
          </p>
        )}
        <p className="text-sm">
          {message}
        </p>
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="flex-shrink-0"
        >
          {action.label}
        </Button>
      )}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:opacity-80 transition-colors"
          style={{ color: styles.iconColor }}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
