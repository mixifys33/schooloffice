'use client'

import * as React from 'react'
import { AlertCircle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { getErrorDetails, parseServerError, type ServerError } from '@/lib/notifications'

/**
 * Error Banner Component
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * Displays a prominent error banner with:
 * - Error title and message
 * - Suggested actions for resolution
 * - Optional retry button
 * - Dismissible option
 */

export interface ErrorBannerProps {
  /** Error title */
  title?: string
  /** Error message describing the failure */
  message: string
  /** Suggested actions for the user */
  suggestedActions?: string[]
  /** Callback for retry action */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Callback when banner is dismissed */
  onDismiss?: () => void
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  /** Additional CSS classes */
  className?: string
  /** Error code for additional context */
  errorCode?: string
}

export function ErrorBanner({
  title = 'Error',
  message,
  suggestedActions = [],
  onRetry,
  isRetrying = false,
  onDismiss,
  dismissible = true,
  className,
  errorCode,
}: ErrorBannerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [isDismissed, setIsDismissed] = React.useState(false)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-sm text-red-800 dark:text-red-200">
                {title}
              </h3>
              {errorCode && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  Error code: {errorCode}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {suggestedActions.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
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
                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                  onClick={handleDismiss}
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
          
          {suggestedActions.length > 0 && isExpanded && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                Suggested actions:
              </p>
              <ul className="space-y-1">
                {suggestedActions.map((action, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                  >
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


/**
 * Server Error Banner
 * Automatically parses server errors and displays appropriate message with suggestions
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 */
export interface ServerErrorBannerProps {
  /** The error object from the server */
  error: unknown
  /** Callback for retry action */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Callback when banner is dismissed */
  onDismiss?: () => void
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ServerErrorBanner({
  error,
  onRetry,
  isRetrying,
  onDismiss,
  dismissible = true,
  className,
}: ServerErrorBannerProps) {
  const serverError = parseServerError(error)
  const errorDetails = getErrorDetails(serverError.code)

  return (
    <ErrorBanner
      title={errorDetails.title}
      message={serverError.message || errorDetails.message}
      suggestedActions={errorDetails.suggestedActions}
      onRetry={onRetry}
      isRetrying={isRetrying}
      onDismiss={onDismiss}
      dismissible={dismissible}
      className={className}
      errorCode={serverError.code}
    />
  )
}

/**
 * Hook for managing server error state with retry functionality
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * @example
 * ```tsx
 * const { error, setError, clearError, isRetrying, handleRetry } = useServerError()
 * 
 * const fetchData = async () => {
 *   try {
 *     clearError()
 *     const data = await api.getData()
 *     // handle success
 *   } catch (err) {
 *     setError(err)
 *   }
 * }
 * 
 * return (
 *   <>
 *     {error && (
 *       <ServerErrorBanner
 *         error={error}
 *         onRetry={() => handleRetry(fetchData)}
 *         isRetrying={isRetrying}
 *         onDismiss={clearError}
 *       />
 *     )}
 *     // ... rest of component
 *   </>
 * )
 * ```
 */
export function useServerError() {
  const [error, setError] = React.useState<unknown>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleRetry = React.useCallback(async (retryFn: () => Promise<void>) => {
    setIsRetrying(true)
    try {
      await retryFn()
      clearError()
    } catch (err) {
      setError(err)
    } finally {
      setIsRetrying(false)
    }
  }, [clearError])

  return {
    error,
    setError,
    clearError,
    isRetrying,
    handleRetry,
  }
}

/**
 * Inline Server Error
 * Compact version for displaying server errors inline (e.g., below a form)
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 */
export interface InlineServerErrorProps {
  /** The error object from the server */
  error: unknown
  /** Callback for retry action */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
  /** Additional CSS classes */
  className?: string
}

export function InlineServerError({
  error,
  onRetry,
  isRetrying,
  className,
}: InlineServerErrorProps) {
  const serverError = parseServerError(error)
  const errorDetails = getErrorDetails(serverError.code)

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 text-sm text-red-600 dark:text-red-400',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{serverError.message || errorDetails.message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1 text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 underline underline-offset-2 disabled:opacity-50"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              Retrying...
            </>
          ) : (
            'Try again'
          )}
        </button>
      )}
    </div>
  )
}
