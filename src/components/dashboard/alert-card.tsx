'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  Clock, 
  Users, 
  BookOpen,
  DollarSign,
  Bell,
  CheckCircle,
  type LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertType, AlertSeverity } from '@/types/enums'

/**
 * AlertCard Component
 * Requirements: 11.1 - Display type, severity, message, and optional action
 * Supports dark mode theming
 */

export interface AlertCardProps {
  /** Alert type determines the icon */
  type: AlertType
  /** Severity determines styling (info=blue, warning=amber, critical=red) */
  severity: AlertSeverity
  /** Alert message to display */
  message: string
  /** Optional URL for action button */
  actionUrl?: string
  /** Optional label for action button */
  actionLabel?: string
  /** Callback when alert is dismissed */
  onDismiss?: () => void
  /** Additional class names */
  className?: string
}

const severityStyles = {
  [AlertSeverity.INFO]: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500 dark:text-blue-400',
    button: 'text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900',
  },
  [AlertSeverity.WARNING]: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-500 dark:text-amber-400',
    button: 'text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900',
  },
  [AlertSeverity.CRITICAL]: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500 dark:text-red-400',
    button: 'text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900',
  },
}

const alertTypeIcons: Record<AlertType, LucideIcon> = {
  [AlertType.PENDING_ATTENDANCE]: Clock,
  [AlertType.MARKS_DEADLINE]: BookOpen,
  [AlertType.UNSUBMITTED_REPORT]: AlertCircle,
  [AlertType.ABSENT_STUDENT]: Users,
  [AlertType.CHRONIC_LATENESS]: Clock,
  [AlertType.FEE_DEFAULTER]: DollarSign,
  [AlertType.DISCIPLINE_ALERT]: AlertTriangle,
  [AlertType.PENDING_APPROVAL]: CheckCircle,
  [AlertType.LATE_TEACHER]: Clock,
  [AlertType.EXAM_CONFLICT]: AlertTriangle,
  [AlertType.UNPAID_BALANCE]: DollarSign,
  [AlertType.RECONCILIATION_ISSUE]: AlertCircle,
  [AlertType.MISSING_STUDENT]: Users,
  [AlertType.LATE_RETURN]: Clock,
  [AlertType.EMERGENCY]: AlertTriangle,
  [AlertType.TASK_OVERDUE]: Clock,
}

export function AlertCard({
  type,
  severity,
  message,
  actionUrl,
  actionLabel,
  onDismiss,
  className,
}: AlertCardProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const styles = severityStyles[severity]
  const Icon = alertTypeIcons[type] || Info

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 border rounded-lg',
        styles.container,
        className
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', styles.text)}>
          {message}
        </p>
        {actionUrl && actionLabel && (
          <Link
            href={actionUrl}
            className={cn(
              'inline-flex items-center mt-2 text-sm font-medium underline-offset-4 hover:underline',
              styles.text
            )}
          >
            {actionLabel}
          </Link>
        )}
      </div>
      {onDismiss && (
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
