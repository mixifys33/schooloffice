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
    container: 'bg-[var(--info-light)] border-[var(--info-light)] dark:bg-[var(--info-dark)]/50 dark:border-[var(--info-dark)]',
    text: 'text-[var(--info-dark)] dark:text-[var(--info)]',
    icon: 'text-[var(--accent-primary)] dark:text-[var(--chart-blue)]',
    button: 'text-[var(--accent-hover)] border-[var(--info)] hover:bg-[var(--info-light)] dark:text-[var(--info)] dark:border-[var(--accent-hover)] dark:hover:bg-[var(--info-dark)]',
  },
  [AlertSeverity.WARNING]: {
    container: 'bg-[var(--warning-light)] border-amber-200 dark:bg-[var(--warning-dark)]/50 dark:border-amber-800',
    text: 'text-[var(--warning-dark)] dark:text-[var(--warning)]',
    icon: 'text-[var(--warning)] dark:text-[var(--warning)]',
    button: 'text-[var(--warning-dark)] border-amber-300 hover:bg-[var(--warning-light)] dark:text-[var(--warning)] dark:border-amber-700 dark:hover:bg-[var(--warning-dark)]',
  },
  [AlertSeverity.CRITICAL]: {
    container: 'bg-[var(--danger-light)] border-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50 dark:border-[var(--danger-dark)]',
    text: 'text-[var(--danger-dark)] dark:text-[var(--danger)]',
    icon: 'text-[var(--danger)] dark:text-[var(--danger)]',
    button: 'text-[var(--chart-red)] border-[var(--danger)] hover:bg-[var(--danger-light)] dark:text-[var(--danger)] dark:border-[var(--chart-red)] dark:hover:bg-[var(--danger-dark)]',
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
            'flex-shrink-0 p-1 rounded-md hover:bg-[var(--text-primary)]/5 dark:hover:bg-[var(--bg-main)]/5 transition-colors',
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
