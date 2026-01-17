'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

/**
 * PaymentStatusBadge Component
 * Requirements: 3.4, 6.2 - Display PAID/NOT_PAID/PARTIAL status with visual indicators
 */

export type PaymentStatus = 'PAID' | 'NOT_PAID' | 'PARTIAL'

export interface PaymentStatusBadgeProps {
  /** Payment status to display */
  status: PaymentStatus
  /** Whether to show the status label */
  showLabel?: boolean
  /** Additional class names */
  className?: string
}

const statusConfig = {
  PAID: {
    label: 'Paid',
    icon: CheckCircle,
    containerClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  NOT_PAID: {
    label: 'Not Paid',
    icon: XCircle,
    containerClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  PARTIAL: {
    label: 'Partial',
    icon: AlertCircle,
    containerClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
  },
}

export function PaymentStatusBadge({
  status,
  showLabel = true,
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.containerClass,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
