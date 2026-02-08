'use client'

import * as React from 'react'
import { AlertCircle, AlertTriangle, Info, XCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Error Message Component
 * Requirements: 35.3 - Display clear error messages with suggested actions
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ErrorMessageProps {
  title: string
  message: string
  suggestedActions?: string[]
  severity?: ErrorSeverity
  code?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  showActions?: boolean
}

const severityConfig: Record<ErrorSeverity, {
  icon: React.ElementType
  bgColor: string
  borderColor: string
  iconColor: string
  titleColor: string
}> = {
  info: {
    icon: Info,
    bgColor: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]',
    borderColor: 'border-[var(--info-light)] dark:border-[var(--info-dark)]',
    iconColor: 'text-[var(--accent-primary)]',
    titleColor: 'text-[var(--info-dark)] dark:text-[var(--info)]',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]',
    borderColor: 'border-[var(--warning-light)] dark:border-[var(--warning-dark)]',
    iconColor: 'text-[var(--warning)]',
    titleColor: 'text-[var(--warning-dark)] dark:text-[var(--warning)]',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]',
    borderColor: 'border-[var(--danger-light)] dark:border-[var(--danger-dark)]',
    iconColor: 'text-[var(--danger)]',
    titleColor: 'text-[var(--danger-dark)] dark:text-[var(--danger)]',
  },
  critical: {
    icon: XCircle,
    bgColor: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]',
    borderColor: 'border-[var(--danger)] dark:border-[var(--chart-red)]',
    iconColor: 'text-[var(--chart-red)]',
    titleColor: 'text-[var(--danger-dark)] dark:text-[var(--danger-light)]',
  },
}

export function ErrorMessage({
  title,
  message,
  suggestedActions = [],
  severity = 'error',
  code,
  dismissible = true,
  onDismiss,
  className,
  showActions = true,
}: ErrorMessageProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [isDismissed, setIsDismissed] = React.useState(false)

  const config = severityConfig[severity]
  const Icon = config.icon

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) return null

  return (
    <div
      role="alert"
      aria-live={severity === 'critical' ? 'assertive' : 'polite'}
      className={cn(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn('font-medium text-sm', config.titleColor)}>
                {title}
              </h3>
              {code && (
                <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  Error code: {code}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {suggestedActions.length > 0 && showActions && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-label={isExpanded ? 'Hide suggestions' : 'Show suggestions'}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
              {dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleDismiss}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <p className="mt-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            {message}
          </p>
          
          {suggestedActions.length > 0 && showActions && isExpanded && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                Suggested actions:
              </p>
              <ul className="space-y-1">
                {suggestedActions.map((action, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]"
                  >
                    <span className="text-[var(--text-muted)] mt-1">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline Error Message
 * Compact version for form field errors
 * Requirements: 21.1 - Display error messages adjacent to input fields
 */
export interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-center gap-1.5 text-sm text-[var(--chart-red)] dark:text-[var(--danger)] mt-1',
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  )
}

/**
 * Form Validation Summary
 * Displays a summary of all validation errors at the top of a form
 * Requirements: 21.1, 21.4 - Display error messages and highlight validation issues
 */
export interface FormValidationSummaryProps {
  errors: Record<string, string | undefined>
  fieldLabels?: Record<string, string>
  className?: string
  title?: string
}

export function FormValidationSummary({
  errors,
  fieldLabels = {},
  className,
  title = 'Please correct the following errors:',
}: FormValidationSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([, error]) => error)
  
  if (errorEntries.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'rounded-lg border border-[var(--danger-light)] dark:border-[var(--danger-dark)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-[var(--danger)] mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-sm text-[var(--danger-dark)] dark:text-[var(--danger)]">
            {title}
          </h3>
          <ul className="mt-2 space-y-1">
            {errorEntries.map(([field, error]) => (
              <li
                key={field}
                className="flex items-start gap-2 text-sm text-[var(--chart-red)] dark:text-[var(--danger)]"
              >
                <span className="text-[var(--danger)] mt-0.5">•</span>
                <span>
                  <strong>{fieldLabels[field] || field}:</strong> {error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * Field Error Wrapper
 * Wraps a form field and displays error message below it
 * Requirements: 21.1, 21.4 - Display error messages adjacent to input fields with red border
 */
export interface FieldErrorWrapperProps {
  children: React.ReactNode
  error?: string
  touched?: boolean
  submitted?: boolean
  className?: string
}

export function FieldErrorWrapper({
  children,
  error,
  touched = false,
  submitted = false,
  className,
}: FieldErrorWrapperProps) {
  const showError = (touched || submitted) && !!error

  return (
    <div className={cn('space-y-1', className)}>
      {children}
      {showError && <InlineError message={error} />}
    </div>
  )
}
