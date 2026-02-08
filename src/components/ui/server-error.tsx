'use client'

import * as React from 'react'
import { AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ServerErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ServerError({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ServerErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

interface ServerErrorBannerProps {
  error: unknown
  onRetry?: () => void
  isRetrying?: boolean
  onDismiss?: () => void
}

export function ServerErrorBanner({
  error,
  onRetry,
  isRetrying = false,
  onDismiss,
}: ServerErrorBannerProps) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  return (
    <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50 border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-md p-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-[var(--chart-red)] dark:text-[var(--danger)] mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--danger-dark)] dark:text-[var(--danger)]">
            Connection Error
          </h3>
          <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] mt-1">
            {errorMessage}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-3">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={isRetrying}
              className="border-[var(--danger)] dark:border-[var(--chart-red)] text-[var(--chart-red)] dark:text-[var(--danger)] hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/50"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </>
              )}
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-[var(--chart-red)] dark:text-[var(--danger)] hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/50 p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
