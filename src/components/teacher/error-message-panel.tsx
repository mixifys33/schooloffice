'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { teacherColors, typography, type ErrorMessageConfig } from '@/lib/teacher-ui-standards'

/**
 * Error Message Panel Component
 * Requirement 12.4: Display clear, specific error messages with next steps
 * 
 * This component provides a consistent way to display errors with:
 * - Clear title and message
 * - Actionable next steps
 * - Optional action button
 */

interface ErrorMessagePanelProps {
  config: ErrorMessageConfig
  onRetry?: () => void
  className?: string
}

export function ErrorMessagePanel({ config, onRetry, className }: ErrorMessagePanelProps) {
  const { title, message, nextSteps, actionLabel, actionHref } = config

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        teacherColors.error.bg,
        teacherColors.error.border,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertCircle 
          className={cn('h-5 w-5 flex-shrink-0 mt-0.5', teacherColors.error.text)} 
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={cn('font-medium', teacherColors.error.text)}>
            {title}
          </h3>
          
          {/* Message */}
          <p className={cn('mt-1', typography.body)}>
            {message}
          </p>

          {/* Next Steps - Requirement 12.4 */}
          {nextSteps && nextSteps.length > 0 && (
            <div className="mt-3">
              <p className={cn('font-medium mb-2', typography.caption)}>
                What you can do:
              </p>
              <ul className="space-y-1">
                {nextSteps.map((step, index) => (
                  <li 
                    key={index}
                    className={cn('flex items-start gap-2', typography.caption)}
                  >
                    <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {(actionLabel || onRetry) && (
            <div className="mt-4 flex items-center gap-3">
              {actionLabel && actionHref && (
                <Link
                  href={actionHref}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                    'bg-rose-600 text-white hover:bg-rose-700',
                    'transition-colors duration-150'
                  )}
                >
                  {actionLabel}
                </Link>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                    'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600',
                    'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
                    'transition-colors duration-150'
                  )}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline Error Message Component
 * For smaller, inline error displays
 */
interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md',
        teacherColors.error.bg,
        teacherColors.error.border,
        'border',
        className
      )}
      role="alert"
    >
      <AlertCircle className={cn('h-4 w-4 flex-shrink-0', teacherColors.error.text)} />
      <span className={typography.error}>{message}</span>
    </div>
  )
}

/**
 * Success Message Component
 * For confirmation messages
 */
interface SuccessMessageProps {
  message: string
  className?: string
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md',
        teacherColors.success.bg,
        teacherColors.success.border,
        'border',
        className
      )}
      role="status"
    >
      <svg 
        className={cn('h-4 w-4 flex-shrink-0', teacherColors.success.text)} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className={cn('text-sm', teacherColors.success.text)}>{message}</span>
    </div>
  )
}

/**
 * Warning Message Component
 * For non-blocking warnings
 */
interface WarningMessageProps {
  title?: string
  message: string
  className?: string
}

export function WarningMessage({ title, message, className }: WarningMessageProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-md',
        teacherColors.warning.bg,
        teacherColors.warning.border,
        'border',
        className
      )}
      role="alert"
    >
      <AlertCircle className={cn('h-5 w-5 flex-shrink-0 mt-0.5', teacherColors.warning.text)} />
      <div>
        {title && (
          <p className={cn('font-medium', teacherColors.warning.text)}>{title}</p>
        )}
        <p className={cn('text-sm', title ? 'mt-1' : '', teacherColors.warning.text)}>
          {message}
        </p>
      </div>
    </div>
  )
}

/**
 * Info Message Component
 * For informational notices
 */
interface InfoMessageProps {
  message: string
  className?: string
}

export function InfoMessage({ message, className }: InfoMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md',
        teacherColors.info.bg,
        teacherColors.info.border,
        'border',
        className
      )}
      role="status"
    >
      <svg 
        className={cn('h-4 w-4 flex-shrink-0', teacherColors.info.text)} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={cn('text-sm', teacherColors.info.text)}>{message}</span>
    </div>
  )
}

export default ErrorMessagePanel
