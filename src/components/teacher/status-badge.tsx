'use client'

import React from 'react'
import { CheckCircle, Clock, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusBadgeStyles } from '@/lib/teacher-ui-standards'

/**
 * Status Badge Component for Teacher Dashboard
 * Requirement 12.2: Clearly indicate enabled vs disabled states with visual distinction
 * 
 * Provides consistent status indicators across the teacher dashboard
 */

type StatusType = 'done' | 'pending' | 'locked' | 'active' | 'error' | 'loading'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  showIcon?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const statusConfig: Record<StatusType, { 
  icon: React.ComponentType<{ className?: string }>
  defaultLabel: string
  styles: string
}> = {
  done: {
    icon: CheckCircle,
    defaultLabel: 'Done',
    styles: statusBadgeStyles.done,
  },
  pending: {
    icon: Clock,
    defaultLabel: 'Pending',
    styles: statusBadgeStyles.pending,
  },
  locked: {
    icon: Lock,
    defaultLabel: 'Locked',
    styles: statusBadgeStyles.locked,
  },
  active: {
    icon: Clock,
    defaultLabel: 'Active',
    styles: statusBadgeStyles.active,
  },
  error: {
    icon: AlertCircle,
    defaultLabel: 'Error',
    styles: statusBadgeStyles.error,
  },
  loading: {
    icon: Loader2,
    defaultLabel: 'Loading',
    styles: statusBadgeStyles.pending,
  },
}

export function StatusBadge({ 
  status, 
  label, 
  showIcon = true, 
  size = 'sm',
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const displayLabel = label || config.defaultLabel

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        sizeClasses[size],
        config.styles,
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            iconSizeClasses[size],
            status === 'loading' && 'animate-spin'
          )} 
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  )
}

/**
 * Attendance Status Badge
 * Specialized badge for attendance status
 */
interface AttendanceStatusBadgeProps {
  status: 'not_taken' | 'done' | 'locked'
  className?: string
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    not_taken: { type: 'pending', label: 'Not Taken' },
    done: { type: 'done', label: 'Done' },
    locked: { type: 'locked', label: 'Locked' },
  }

  const config = statusMap[status] || statusMap.not_taken

  return (
    <StatusBadge
      status={config.type}
      label={`Attendance: ${config.label}`}
      className={className}
    />
  )
}

/**
 * Marks Status Badge
 * Specialized badge for marks entry status
 */
interface MarksStatusBadgeProps {
  status: 'pending' | 'done' | 'draft' | 'submitted' | 'published'
  className?: string
}

export function MarksStatusBadge({ status, className }: MarksStatusBadgeProps) {
  const statusMap: Record<string, { type: StatusType; label: string }> = {
    pending: { type: 'pending', label: 'Pending' },
    draft: { type: 'pending', label: 'Draft' },
    done: { type: 'done', label: 'Done' },
    submitted: { type: 'done', label: 'Submitted' },
    published: { type: 'locked', label: 'Published' },
  }

  const config = statusMap[status] || statusMap.pending

  return (
    <StatusBadge
      status={config.type}
      label={`Marks: ${config.label}`}
      className={className}
    />
  )
}

/**
 * Assignment Status Badge
 */
interface AssignmentStatusBadgeProps {
  isDeadlinePassed: boolean
  className?: string
}

export function AssignmentStatusBadge({ isDeadlinePassed, className }: AssignmentStatusBadgeProps) {
  return (
    <StatusBadge
      status={isDeadlinePassed ? 'locked' : 'active'}
      label={isDeadlinePassed ? 'Closed' : 'Active'}
      className={className}
    />
  )
}

export default StatusBadge
