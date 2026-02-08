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

const getStatusStyles = (status: PaymentStatus) => {
  switch (status) {
    case 'PAID':
      return {
        backgroundColor: 'var(--success-light)',
        color: 'var(--success-dark)',
        iconColor: 'var(--success)',
      }
    case 'NOT_PAID':
      return {
        backgroundColor: 'var(--danger-light)',
        color: 'var(--danger-dark)',
        iconColor: 'var(--danger)',
      }
    case 'PARTIAL':
      return {
        backgroundColor: 'var(--warning-light)',
        color: 'var(--warning-dark)',
        iconColor: 'var(--warning)',
      }
  }
}

const statusConfig = {
  PAID: {
    label: 'Paid',
    icon: CheckCircle,
  },
  NOT_PAID: {
    label: 'Not Paid',
    icon: XCircle,
  },
  PARTIAL: {
    label: 'Partial',
    icon: AlertCircle,
  },
}

export function PaymentStatusBadge({
  status,
  showLabel = true,
  className,
}: PaymentStatusBadgeProps) {
  const config = statusConfig[status]
  const styles = getStatusStyles(status)
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      }}
    >
      <Icon 
        className="h-3.5 w-3.5" 
        style={{ color: styles.iconColor }}
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
