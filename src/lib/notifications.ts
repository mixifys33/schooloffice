/**
 * Form Notifications Utilities
 * Requirements: 21.2 - Display success notification toast for 3 seconds on form submission
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 */

import { useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

/**
 * Server error response structure
 */
export interface ServerError {
  status?: number
  code?: string
  message: string
  details?: Record<string, string[]>
}

/**
 * Common error messages for server errors
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 */
export const serverErrorMessages: Record<string, { title: string; message: string; suggestedActions: string[] }> = {
  NETWORK_ERROR: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    suggestedActions: [
      'Check your internet connection',
      'Try refreshing the page',
      'If the problem persists, contact support'
    ]
  },
  UNAUTHORIZED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    suggestedActions: [
      'Click here to log in again',
      'If you continue to have issues, clear your browser cookies'
    ]
  },
  FORBIDDEN: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    suggestedActions: [
      'Contact your administrator if you believe this is an error',
      'Check that you are logged in with the correct account'
    ]
  },
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'Please correct the highlighted fields and try again.',
    suggestedActions: [
      'Review the form for any highlighted errors',
      'Ensure all required fields are filled in correctly'
    ]
  },
  SUBSCRIPTION_EXPIRED: {
    title: 'Subscription Expired',
    message: 'Your school subscription has expired.',
    suggestedActions: [
      'Contact your administrator to renew the subscription',
      'Contact support for assistance'
    ]
  },
  STUDENT_UNPAID: {
    title: 'Student Fees Unpaid',
    message: 'This action cannot be completed because the student fees are unpaid.',
    suggestedActions: [
      'Mark the student as paid in the Fees section',
      'Contact the parent regarding outstanding fees'
    ]
  },
  PILOT_LIMIT_REACHED: {
    title: 'Pilot Limit Reached',
    message: 'Your pilot account has reached its limit.',
    suggestedActions: [
      'Upgrade to a paid plan to continue',
      'Contact support for assistance'
    ]
  },
  INTERNAL_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again.',
    suggestedActions: [
      'Wait a moment and try again',
      'If the problem persists, contact support'
    ]
  },
  DEFAULT: {
    title: 'Error',
    message: 'An unexpected error occurred. Please try again.',
    suggestedActions: [
      'Try the action again',
      'Refresh the page and try again',
      'If the problem persists, contact support'
    ]
  }
}

/**
 * Get error details from error code
 */
export function getErrorDetails(code?: string): { title: string; message: string; suggestedActions: string[] } {
  if (code && serverErrorMessages[code]) {
    return serverErrorMessages[code]
  }
  return serverErrorMessages.DEFAULT
}

/**
 * Parse server error response
 */
export function parseServerError(error: unknown): ServerError {
  if (error instanceof Error) {
    // Check if it's a fetch error (network issue)
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      return {
        code: 'NETWORK_ERROR',
        message: serverErrorMessages.NETWORK_ERROR.message
      }
    }
    return {
      message: error.message
    }
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    return {
      status: typeof err.status === 'number' ? err.status : undefined,
      code: typeof err.code === 'string' ? err.code : undefined,
      message: typeof err.message === 'string' ? err.message : 'An unexpected error occurred',
      details: err.details as Record<string, string[]> | undefined
    }
  }
  
  return {
    message: 'An unexpected error occurred'
  }
}

/**
 * Success messages for common form actions
 * Requirements: 21.2 - Display success notification toast for 3 seconds
 */
export const successMessages = {
  // Student operations
  studentCreated: 'Student enrolled successfully',
  studentUpdated: 'Student details updated successfully',
  studentDeleted: 'Student removed successfully',
  studentsUploaded: (count: number) => `${count} students uploaded successfully`,
  
  // Payment operations
  paymentRecorded: 'Payment recorded successfully',
  paymentStatusUpdated: 'Payment status updated successfully',
  
  // Attendance operations
  attendanceMarked: 'Attendance marked successfully',
  attendanceSaved: 'Attendance saved successfully',
  
  // Class operations
  classCreated: 'Class created successfully',
  classUpdated: 'Class updated successfully',
  streamCreated: 'Stream created successfully',
  teacherAssigned: 'Teacher assigned successfully',
  
  // Teacher operations
  teacherCreated: 'Teacher account created successfully',
  teacherUpdated: 'Teacher details updated successfully',
  subjectsAssigned: 'Subjects assigned successfully',
  
  // Settings operations
  settingsSaved: 'Settings saved successfully',
  
  // SMS operations
  smsSent: (count: number) => `SMS sent to ${count} recipient${count !== 1 ? 's' : ''} successfully`,
  smsCreditsAdded: 'SMS credits added successfully',
  
  // Report operations
  reportGenerated: 'Report generated successfully',
  reportSent: 'Report sent successfully',
  
  // School operations (Super Admin)
  schoolActivated: 'School activated successfully',
  schoolSuspended: 'School suspended successfully',
  pilotExtended: 'Pilot period extended successfully',
  pilotConverted: 'School converted to paid plan successfully',
  
  // Generic
  saved: 'Changes saved successfully',
  created: 'Created successfully',
  updated: 'Updated successfully',
  deleted: 'Deleted successfully',
}

/**
 * Hook for form notifications
 * Requirements: 21.2 - Display success notification toast for 3 seconds on form submission
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError, showServerError } = useFormNotifications()
 * 
 * const handleSubmit = async (data) => {
 *   try {
 *     await saveData(data)
 *     showSuccess('Data saved successfully')
 *   } catch (error) {
 *     showServerError(error)
 *   }
 * }
 * ```
 */
export function useFormNotifications() {
  const { showToast } = useToast()

  /**
   * Show success notification
   * Requirements: 21.2 - Display success notification toast for 3 seconds
   */
  const showSuccess = useCallback((message: string) => {
    showToast({
      type: 'success',
      message,
      duration: 3000, // 3 seconds per Requirement 21.2
    })
  }, [showToast])

  /**
   * Show error notification
   * Requirements: 21.3 - Display error message describing failure
   */
  const showError = useCallback((message: string) => {
    showToast({
      type: 'error',
      message,
      duration: 5000, // Longer duration for errors
    })
  }, [showToast])

  /**
   * Show warning notification
   */
  const showWarning = useCallback((message: string) => {
    showToast({
      type: 'warning',
      message,
      duration: 4000,
    })
  }, [showToast])

  /**
   * Show info notification
   */
  const showInfo = useCallback((message: string) => {
    showToast({
      type: 'info',
      message,
      duration: 3000,
    })
  }, [showToast])

  /**
   * Show server error notification
   * Requirements: 21.3 - Display error message describing failure and suggesting retry
   */
  const showServerError = useCallback((error: unknown) => {
    const serverError = parseServerError(error)
    const errorDetails = getErrorDetails(serverError.code)
    
    showToast({
      type: 'error',
      message: serverError.message || errorDetails.message,
      duration: 5000,
    })
  }, [showToast])

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showServerError,
  }
}

/**
 * Wrapper for async form submission with automatic notifications
 * Requirements: 21.2, 21.3 - Display success/error notifications
 * 
 * @example
 * ```tsx
 * const { showSuccess, showServerError } = useFormNotifications()
 * 
 * const handleSubmit = withFormNotifications(
 *   async (data) => {
 *     await api.saveStudent(data)
 *   },
 *   {
 *     successMessage: successMessages.studentCreated,
 *     onSuccess: showSuccess,
 *     onError: showServerError,
 *   }
 * )
 * ```
 */
export function withFormNotifications<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    successMessage: string
    onSuccess: (message: string) => void
    onError: (error: unknown) => void
    onFinally?: () => void
  }
): (...args: T) => Promise<R | undefined> {
  return async (...args: T) => {
    try {
      const result = await fn(...args)
      options.onSuccess(options.successMessage)
      return result
    } catch (error) {
      options.onError(error)
      return undefined
    } finally {
      options.onFinally?.()
    }
  }
}

/**
 * Hook for form submission with automatic notifications
 * Requirements: 21.2, 21.3 - Display success/error notifications
 * 
 * @example
 * ```tsx
 * const { execute, isLoading } = useFormSubmit({
 *   onSubmit: async (data) => await api.saveStudent(data),
 *   successMessage: successMessages.studentCreated,
 *   onSuccess: () => router.push('/students'),
 * })
 * 
 * <form onSubmit={handleSubmit(execute)}>
 *   ...
 *   <button disabled={isLoading}>Save</button>
 * </form>
 * ```
 */
export function useFormSubmit<T, R = void>(options: {
  onSubmit: (data: T) => Promise<R>
  successMessage: string
  onSuccess?: (result: R) => void
  onError?: (error: ServerError) => void
}) {
  const { showSuccess, showServerError } = useFormNotifications()
  const [isLoading, setIsLoading] = React.useState(false)

  const execute = useCallback(async (data: T): Promise<R | undefined> => {
    setIsLoading(true)
    try {
      const result = await options.onSubmit(data)
      showSuccess(options.successMessage)
      options.onSuccess?.(result)
      return result
    } catch (error) {
      const serverError = parseServerError(error)
      showServerError(error)
      options.onError?.(serverError)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [options, showSuccess, showServerError])

  return { execute, isLoading }
}

// Need to import React for useState
import * as React from 'react'

/**
 * Hook for handling server errors with retry functionality
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * @example
 * ```tsx
 * const { 
 *   error, 
 *   isRetrying, 
 *   handleError, 
 *   handleRetry, 
 *   clearError,
 *   errorDetails 
 * } = useServerErrorHandler()
 * 
 * const fetchData = async () => {
 *   try {
 *     clearError()
 *     const data = await api.getData()
 *     // handle success
 *   } catch (err) {
 *     handleError(err)
 *   }
 * }
 * 
 * return (
 *   <>
 *     {error && (
 *       <ErrorBanner
 *         title={errorDetails.title}
 *         message={errorDetails.message}
 *         suggestedActions={errorDetails.suggestedActions}
 *         onRetry={() => handleRetry(fetchData)}
 *         isRetrying={isRetrying}
 *         onDismiss={clearError}
 *       />
 *     )}
 *   </>
 * )
 * ```
 */
export function useServerErrorHandler() {
  const [error, setError] = React.useState<ServerError | null>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const { showServerError } = useFormNotifications()

  const handleError = React.useCallback((err: unknown, showToast = true) => {
    const serverError = parseServerError(err)
    setError(serverError)
    if (showToast) {
      showServerError(err)
    }
  }, [showServerError])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleRetry = React.useCallback(async (retryFn: () => Promise<void>) => {
    setIsRetrying(true)
    try {
      await retryFn()
      clearError()
    } catch (err) {
      handleError(err, false) // Don't show toast on retry failure, banner is visible
    } finally {
      setIsRetrying(false)
    }
  }, [clearError, handleError])

  const errorDetails = React.useMemo(() => {
    if (!error) return null
    return getErrorDetails(error.code)
  }, [error])

  return {
    error,
    isRetrying,
    handleError,
    handleRetry,
    clearError,
    errorDetails,
  }
}

/**
 * Higher-order function to wrap async operations with error handling
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * @example
 * ```tsx
 * const { handleError, clearError } = useServerErrorHandler()
 * 
 * const saveData = withErrorHandling(
 *   async (data: FormData) => {
 *     const result = await api.post('/api/data', data)
 *     return result
 *   },
 *   { onError: handleError, onStart: clearError }
 * )
 * ```
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    onError: (error: unknown) => void
    onStart?: () => void
    onFinally?: () => void
  }
): (...args: T) => Promise<R | undefined> {
  return async (...args: T) => {
    options.onStart?.()
    try {
      return await fn(...args)
    } catch (error) {
      options.onError(error)
      return undefined
    } finally {
      options.onFinally?.()
    }
  }
}

/**
 * Format error for display in forms
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 */
export function formatServerErrorForForm(error: unknown): {
  title: string
  message: string
  suggestedActions: string[]
  code?: string
} {
  const serverError = parseServerError(error)
  const details = getErrorDetails(serverError.code)
  
  return {
    title: details.title,
    message: serverError.message || details.message,
    suggestedActions: details.suggestedActions,
    code: serverError.code,
  }
}
