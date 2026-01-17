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
    containerClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  WARNING: {
    label: 'Warning',
    icon: AlertTriangle,
    containerClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: XCircle,
    containerClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    iconClass: 'text-red-600 dark:text-red-400',
  },
  PILOT: {
    label: 'Pilot',
    icon: Beaker,
    containerClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    iconClass: 'text-purple-600 dark:text-purple-400',
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
