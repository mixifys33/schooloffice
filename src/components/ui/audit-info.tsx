'use client'

import * as React from 'react'
import { Clock, User, History } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Audit Information Display Component
 * Shows "Last updated by [user] on [date]" for modified data
 * Requirements: 9.6 - Display audit information showing last updated by and timestamp
 */

export interface AuditInfoProps {
  /** User who last modified the data */
  updatedBy?: string | null
  /** Timestamp of last modification */
  updatedAt?: Date | string | null
  /** User who created the data */
  createdBy?: string | null
  /** Timestamp of creation */
  createdAt?: Date | string | null
  /** Whether to show creation info */
  showCreated?: boolean
  /** Display variant */
  variant?: 'default' | 'compact' | 'detailed'
  /** Additional class names */
  className?: string
}

/**
 * Format a date for display
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  // Relative time for recent updates
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  // Absolute date for older updates
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a date for detailed display
 */
function formatDateDetailed(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(d.getTime())) return ''
  
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function AuditInfo({
  updatedBy,
  updatedAt,
  createdBy,
  createdAt,
  showCreated = false,
  variant = 'default',
  className,
}: AuditInfoProps) {
  // Don't render if no audit info available
  if (!updatedBy && !updatedAt && !createdBy && !createdAt) {
    return null
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400', className)}>
        {updatedAt && (
          <>
            <Clock className="h-3 w-3" />
            <span>{formatDate(updatedAt)}</span>
          </>
        )}
        {updatedBy && (
          <>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>{updatedBy}</span>
          </>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4',
        className
      )}>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Audit Information
          </span>
        </div>
        
        <div className="space-y-3">
          {/* Last Updated */}
          {(updatedBy || updatedAt) && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Updated
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {updatedBy && <span className="font-medium">{updatedBy}</span>}
                  {updatedBy && updatedAt && ' on '}
                  {updatedAt && formatDateDetailed(updatedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Created */}
          {showCreated && (createdBy || createdAt) && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <User className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {createdBy && <span className="font-medium">{createdBy}</span>}
                  {createdBy && createdAt && ' on '}
                  {createdAt && formatDateDetailed(createdAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400',
      className
    )}>
      {/* Last Updated */}
      {(updatedBy || updatedAt) && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>
            Last updated
            {updatedBy && <> by <span className="font-medium text-gray-700 dark:text-gray-300">{updatedBy}</span></>}
            {updatedAt && <> on {formatDate(updatedAt)}</>}
          </span>
        </div>
      )}

      {/* Created */}
      {showCreated && (createdBy || createdAt) && (
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4" />
          <span>
            Created
            {createdBy && <> by <span className="font-medium text-gray-700 dark:text-gray-300">{createdBy}</span></>}
            {createdAt && <> on {formatDate(createdAt)}</>}
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Inline Audit Badge
 * A minimal badge showing last update time
 */
export interface AuditBadgeProps {
  /** Timestamp of last modification */
  updatedAt?: Date | string | null
  /** Additional class names */
  className?: string
}

export function AuditBadge({ updatedAt, className }: AuditBadgeProps) {
  if (!updatedAt) return null

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400',
      className
    )}>
      <Clock className="h-3 w-3" />
      {formatDate(updatedAt)}
    </span>
  )
}

/**
 * Audit Footer
 * A footer component for cards/forms showing audit info
 */
export interface AuditFooterProps extends AuditInfoProps {
  /** Whether to show a separator line */
  showSeparator?: boolean
}

export function AuditFooter({
  showSeparator = true,
  className,
  ...props
}: AuditFooterProps) {
  // Don't render if no audit info
  if (!props.updatedBy && !props.updatedAt && !props.createdBy && !props.createdAt) {
    return null
  }

  return (
    <div className={cn(
      showSeparator && 'border-t border-gray-200 dark:border-gray-700 pt-4 mt-4',
      className
    )}>
      <AuditInfo {...props} />
    </div>
  )
}

export default AuditInfo
