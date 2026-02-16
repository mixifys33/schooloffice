/**
 * Enhanced Error Display Components for Teacher Marks Management
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - Create user-friendly error messages for all scenarios
 * - Add retry mechanisms for transient network errors
 * - Implement graceful degradation for service unavailability
 * - Display clear, specific error messages with next steps
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, 
  Wifi, 
  RefreshCw, 
  Clock, 
  Lock, 
  Shield, 
  Server, 
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  ExternalLink,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { teacherColors } from '@/lib/teacher-ui-standards'
import { focusStyles, statusAccessibility } from '@/lib/accessibility'
import { 
  TeacherMarksError, 
  TeacherMarksErrorType,
  teacherMarksErrorHandler,
  isRetryableError,
  getErrorSeverity
} from '@/lib/teacher-marks-error-handler'

export interface ErrorDisplayProps {
  error: TeacherMarksError | Error | string | null
  onRetry?: () => void
  onDismiss?: () => void
  context?: string
  showDetails?: boolean
  className?: string
}

export interface RetryableErrorProps {
  error: TeacherMarksError
  onRetry: () => void
  onDismiss?: () => void
  retryCount?: number
  maxRetries?: number
  className?: string
}

export interface ValidationErrorsProps {
  errors: Array<{
    field: string
    message: string
    value?: any
    severity?: 'error' | 'warning'
  }>
  onFieldFocus?: (field: string) => void
  className?: string
}

/**
 * Main error display component with enhanced UX
 */
export function EnhancedErrorDisplay({
  error,
  onRetry,
  onDismiss,
  context,
  showDetails = false,
  className
}: ErrorDisplayProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(showDetails)
  const [retryCount, setRetryCount] = useState(0)

  if (!error) return null

  // Convert error to TeacherMarksError if needed
  const teacherError = error instanceof Error || typeof error === 'string'
    ? teacherMarksErrorHandler.handleError(error, context)
    : error as TeacherMarksError

  const { title, message, actions, severity } = teacherMarksErrorHandler.formatErrorForUser(teacherError)
  const isRetryable = isRetryableError(teacherError)

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    onRetry?.()
  }

  const getErrorIcon = () => {
    switch (teacherError.type) {
      case TeacherMarksErrorType.NETWORK_ERROR:
        return <Wifi className="h-5 w-5" />
      case TeacherMarksErrorType.TIMEOUT_ERROR:
        return <Clock className="h-5 w-5" />
      case TeacherMarksErrorType.UNAUTHORIZED:
        return <Shield className="h-5 w-5" />
      case TeacherMarksErrorType.APPROVED_MARKS_LOCKED:
        return <Lock className="h-5 w-5" />
      case TeacherMarksErrorType.SERVER_ERROR:
      case TeacherMarksErrorType.SERVICE_UNAVAILABLE:
        return <Server className="h-5 w-5" />
      default:
        return severity === 'warning' ? <AlertTriangle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />
    }
  }

  const getAlertVariant = () => {
    switch (severity) {
      case 'warning':
        return 'default'
      case 'info':
        return 'default'
      default:
        return 'destructive'
    }
  }

  return (
    <Alert 
      variant={getAlertVariant()} 
      className={cn('relative', className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <AlertTitle className="flex items-center justify-between">
            <span>{title}</span>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className={cn(
                  'h-6 w-6 p-0 hover:bg-transparent',
                  focusStyles.default
                )}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </AlertTitle>
          
          <AlertDescription className="space-y-3">
            <p>{message}</p>
            
            {/* Suggested Actions */}
            {actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">What you can do:</p>
                <ul className="text-sm space-y-1 ml-4">
                  {actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-xs mt-1.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {isRetryable && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                  className={focusStyles.default}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {retryCount > 0 ? `Retry (${retryCount}/3)` : 'Retry'}
                </Button>
              )}
              
              {/* Show details toggle */}
              {(teacherError.originalError || teacherError.details) && (
                <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn('text-xs', focusStyles.default)}
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      {isDetailsOpen ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="text-xs bg-muted/50 rounded p-2 font-mono">
                      {teacherError.details && (
                        <div className="mb-2">
                          <strong>Details:</strong> {teacherError.details}
                        </div>
                      )}
                      {teacherError.originalError && (
                        <div>
                          <strong>Technical:</strong> {teacherError.originalError.message}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

/**
 * Specialized component for retryable errors with progress
 */
export function RetryableErrorDisplay({
  error,
  onRetry,
  onDismiss,
  retryCount = 0,
  maxRetries = 3,
  className
}: RetryableErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const handleAutoRetry = () => {
    setCountdown(5) // 5 second countdown
    setTimeout(() => {
      if (retryCount < maxRetries) {
        handleRetry()
      }
    }, 5000)
  }

  const canRetry = retryCount < maxRetries && !isRetrying

  return (
    <Card className={cn('border-orange-200 bg-orange-50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Connection Problem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-orange-700">{error.message}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-orange-600">
            Attempt {retryCount + 1} of {maxRetries}
          </div>
          
          <div className="flex items-center gap-2">
            {countdown > 0 && (
              <span className="text-sm text-orange-600">
                Auto-retry in {countdown}s
              </span>
            )}
            
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || countdown > 0}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Now
                  </>
                )}
              </Button>
            )}
            
            {retryCount === 0 && canRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAutoRetry}
                className="text-orange-600 hover:bg-orange-100"
              >
                Auto-retry
              </Button>
            )}
          </div>
        </div>
        
        {retryCount >= maxRetries && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Maximum retries reached</AlertTitle>
            <AlertDescription>
              Please check your connection and try refreshing the page.
            </AlertDescription>
          </Alert>
        )}
        
        {onDismiss && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-orange-600 hover:bg-orange-100"
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Component for displaying validation errors with field highlighting
 */
export function ValidationErrorsDisplay({
  errors,
  onFieldFocus,
  className
}: ValidationErrorsProps) {
  if (errors.length === 0) return null

  const errorsByField = errors.reduce((acc, error) => {
    const field = error.field.replace(/^entry\[\d+\]\./, '') // Remove batch index prefix
    if (!acc[field]) acc[field] = []
    acc[field].push(error)
    return acc
  }, {} as Record<string, typeof errors>)

  return (
    <Card className={cn('border-red-200 bg-red-50', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          Validation Errors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(errorsByField).map(([field, fieldErrors]) => (
            <div key={field} className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="text-xs border-red-300 text-red-700"
                >
                  {field}
                </Badge>
                {onFieldFocus && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFieldFocus(field)}
                    className="h-6 px-2 text-xs text-red-600 hover:bg-red-100"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Go to field
                  </Button>
                )}
              </div>
              
              <ul className="space-y-1 ml-4">
                {fieldErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="text-red-700">{error.message}</span>
                    {error.severity === 'warning' && (
                      <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                        Warning
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Inline field error component for immediate feedback
 */
export interface InlineFieldErrorProps {
  error?: string
  warning?: string
  className?: string
}

export function InlineFieldError({ error, warning, className }: InlineFieldErrorProps) {
  if (!error && !warning) return null

  return (
    <div className={cn('flex items-center gap-1 mt-1', className)}>
      {error && (
        <>
          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-600">{error}</span>
        </>
      )}
      {!error && warning && (
        <>
          <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
          <span className="text-xs text-yellow-600">{warning}</span>
        </>
      )}
    </div>
  )
}

/**
 * Success message component for positive feedback
 */
export interface SuccessMessageProps {
  message: string
  details?: string
  onDismiss?: () => void
  autoHide?: boolean
  autoHideDelay?: number
  className?: string
}

export function SuccessMessage({
  message,
  details,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  className
}: SuccessMessageProps) {
  useEffect(() => {
    if (autoHide && onDismiss) {
      const timer = setTimeout(onDismiss, autoHideDelay)
      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, onDismiss])

  return (
    <Alert variant="default" className={cn('border-green-200 bg-green-50', className)}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 flex items-center justify-between">
        <span>Success</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="text-green-700">
        <p>{message}</p>
        {details && <p className="text-sm mt-1 opacity-80">{details}</p>}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Network status indicator
 */
export interface NetworkStatusProps {
  isOnline: boolean
  className?: string
}

export function NetworkStatus({ isOnline, className }: NetworkStatusProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className={cn(
        'h-2 w-2 rounded-full',
        isOnline ? 'bg-green-500' : 'bg-red-500'
      )} />
      <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
        {isOnline ? 'Connected' : 'Offline'}
      </span>
    </div>
  )
}