'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertTriangle, XCircle, Beaker } from 'lucide-react'

/**
 * SchoolStatusBadge Component
 * Requirements: 13.1 - Display ACTIVE/WARNING/SUSPENDED/PILOT status
 */

export type SchoolStatus = 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'PILOT'
export type SchoolPlan = 'FREE_PILOT' | 'BASIC' | 'PREMIUM'

export interface SchoolStatusBadgeProps {
  /** School status to display */
  status: SchoolStatus
  /** Optional plan type */
  plan?: SchoolPlan
  /** Additional class names */
  className?: string
}

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle,
    containerClass: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]',
    iconClass: 'text-[var(--chart-green)] dark:text-[var(--success)]',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    containerClass: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]',
    iconClass: 'text-[var(--chart-yellow)] dark:text-[var(--warning)]',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: XCircle,
    containerClass: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:text-[var(--danger)]',
    iconClass: 'text-[var(--chart-red)] dark:text-[var(--danger)]',
  },
  PILOT: {
    label: 'Pilot',
    icon: Beaker,
    containerClass: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)] dark:text-[var(--info)]',
    iconClass: 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
  },
}

const planLabels: Record<SchoolPlan, string> = {
  FREE_PILOT: 'Free Pilot',
  BASIC: 'Basic',
  PREMIUM: 'Premium',
}

export function SchoolStatusBadge({
  status,
  plan,
  className,
}: SchoolStatusBadgeProps) {
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
      <span>{config.label}</span>
      {plan && (
        <span className="opacity-75">• {planLabels[plan]}</span>
      )}
    </span>
  )
}
