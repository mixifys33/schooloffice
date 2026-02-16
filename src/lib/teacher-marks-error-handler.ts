/**
 * Teacher Marks Management - Enhanced Error Handling
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - Add client-side validation with immediate feedback
 * - Implement server-side validation with proper error responses
 * - Create user-friendly error messages for all scenarios
 * - Add retry mechanisms for transient network errors
 * - Implement graceful degradation for service unavailability
 */

import { getUserFriendlyError, type UserError } from '@/lib/error-messages'
import { ApiError, Errors } from '@/lib/api-errors'

// Teacher Marks specific error types
export enum TeacherMarksErrorType {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  TEACHER_NOT_FOUND = 'TEACHER_NOT_FOUND',
  
  // Data Validation
  INVALID_MARK_VALUE = 'INVALID_MARK_VALUE',
  MARK_EXCEEDS_MAXIMUM = 'MARK_EXCEEDS_MAXIMUM',
  NEGATIVE_MARK_VALUE = 'NEGATIVE_MARK_VALUE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_CA_TYPE = 'INVALID_CA_TYPE',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  
  // Business Logic
  DUPLICATE_EXAM_ENTRY = 'DUPLICATE_EXAM_ENTRY',
  APPROVED_MARKS_LOCKED = 'APPROVED_MARKS_LOCKED',
  NO_ACTIVE_TERM = 'NO_ACTIVE_TERM',
  STUDENT_NOT_ACCESSIBLE = 'STUDENT_NOT_ACCESSIBLE',
  SUBJECT_NOT_ACCESSIBLE = 'SUBJECT_NOT_ACCESSIBLE',
  
  // Network & System
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Batch Operations
  BATCH_VALIDATION_FAILED = 'BATCH_VALIDATION_FAILED',
  PARTIAL_BATCH_FAILURE = 'PARTIAL_BATCH_FAILURE',
  
  // Data Loading
  STUDENTS_LOAD_FAILED = 'STUDENTS_LOAD_FAILED',
  CLASSES_LOAD_FAILED = 'CLASSES_LOAD_FAILED',
  SUBJECTS_LOAD_FAILED = 'SUBJECTS_LOAD_FAILED',
}

export interface TeacherMarksError {
  type: TeacherMarksErrorType
  message: string
  field?: string
  details?: string
  retryable: boolean
  suggestedActions: string[]
  originalError?: Error
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  backoffMultiplier: number
  maxDelayMs: number
  retryableErrors: TeacherMarksErrorType[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableErrors: [
    TeacherMarksErrorType.NETWORK_ERROR,
    TeacherMarksErrorType.TIMEOUT_ERROR,
    TeacherMarksErrorType.SERVER_ERROR,
    TeacherMarksErrorType.SERVICE_UNAVAILABLE,
  ],
}

/**
 * Enhanced Error Handler for Teacher Marks Management
 */
export class TeacherMarksErrorHandler {
  private retryConfig: RetryConfig

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig
  }

  /**
   * Convert various error types to TeacherMarksError
   */
  handleError(error: unknown, context?: string): TeacherMarksError {
    // Handle API errors
    if (error instanceof ApiError) {
      return this.handleApiError(error, context)
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: TeacherMarksErrorType.NETWORK_ERROR,
        message: 'Unable to connect to the server. Please check your internet connection.',
        retryable: true,
        suggestedActions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists',
        ],
        originalError: error as Error,
      }
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        type: TeacherMarksErrorType.TIMEOUT_ERROR,
        message: 'The request took too long to complete.',
        retryable: true,
        suggestedActions: [
          'Try again in a moment',
          'Check your internet connection',
          'Contact support if timeouts persist',
        ],
        originalError: error,
      }
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return {
        type: TeacherMarksErrorType.MISSING_REQUIRED_FIELD,
        message: 'Please check all required fields are filled correctly.',
        retryable: false,
        suggestedActions: [
          'Review the form for missing or invalid fields',
          'Ensure all marks are within valid ranges',
          'Check that dates are in the correct format',
        ],
        originalError: error,
      }
    }

    // Generic error handling
    const userError = getUserFriendlyError(error)
    return {
      type: TeacherMarksErrorType.SERVER_ERROR,
      message: userError.message,
      field: userError.field,
      retryable: false,
      suggestedActions: [
        'Try refreshing the page',
        'Contact support if the problem persists',
      ],
      originalError: error instanceof Error ? error : new Error(String(error)),
    }
  }

  /**
   * Handle API-specific errors
   */
  private handleApiError(error: ApiError, context?: string): TeacherMarksError {
    switch (error.status) {
      case 401:
        return {
          type: TeacherMarksErrorType.UNAUTHORIZED,
          message: 'Your session has expired. Please log in again.',
          retryable: false,
          suggestedActions: [
            'Log out and log back in',
            'Clear your browser cache',
            'Contact support if login issues persist',
          ],
          originalError: error,
        }

      case 403:
        if (error.message.includes('approved') || error.message.includes('locked')) {
          return {
            type: TeacherMarksErrorType.APPROVED_MARKS_LOCKED,
            message: 'These marks have been approved and cannot be modified.',
            retryable: false,
            suggestedActions: [
              'Contact the Department of Studies for override permission',
              'View the marks in read-only mode',
            ],
            originalError: error,
          }
        }
        return {
          type: TeacherMarksErrorType.INSUFFICIENT_PERMISSIONS,
          message: 'You do not have permission to perform this action.',
          retryable: false,
          suggestedActions: [
            'Contact your school administrator',
            'Verify you are assigned to this class and subject',
          ],
          originalError: error,
        }

      case 404:
        if (context?.includes('student')) {
          return {
            type: TeacherMarksErrorType.STUDENT_NOT_ACCESSIBLE,
            message: 'The student could not be found or is not accessible.',
            retryable: false,
            suggestedActions: [
              'Refresh the student list',
              'Verify the student is enrolled in your class',
              'Contact your school administrator',
            ],
            originalError: error,
          }
        }
        return {
          type: TeacherMarksErrorType.TEACHER_NOT_FOUND,
          message: 'Required information could not be found.',
          retryable: false,
          suggestedActions: [
            'Refresh the page',
            'Contact support if the problem persists',
          ],
          originalError: error,
        }

      case 409:
        if (error.message.includes('exam entry')) {
          return {
            type: TeacherMarksErrorType.DUPLICATE_EXAM_ENTRY,
            message: 'An exam entry already exists for this student and subject.',
            retryable: false,
            suggestedActions: [
              'Use the update function instead of creating a new entry',
              'Check if the exam entry was already saved',
            ],
            originalError: error,
          }
        }
        return {
          type: TeacherMarksErrorType.BATCH_VALIDATION_FAILED,
          message: 'Some entries conflict with existing data.',
          retryable: false,
          suggestedActions: [
            'Review the entries for duplicates',
            'Check for conflicting data',
            'Try saving entries individually',
          ],
          originalError: error,
        }

      case 500:
        return {
          type: TeacherMarksErrorType.SERVER_ERROR,
          message: 'A server error occurred. Please try again.',
          retryable: true,
          suggestedActions: [
            'Try again in a few moments',
            'Contact support if the error persists',
          ],
          originalError: error,
        }

      case 503:
        return {
          type: TeacherMarksErrorType.SERVICE_UNAVAILABLE,
          message: 'The service is temporarily unavailable.',
          retryable: true,
          suggestedActions: [
            'Try again in a few minutes',
            'Check the system status page',
            'Contact support if the service remains unavailable',
          ],
          originalError: error,
        }

      default:
        return {
          type: TeacherMarksErrorType.SERVER_ERROR,
          message: error.message || 'An unexpected error occurred.',
          retryable: false,
          suggestedActions: [
            'Try refreshing the page',
            'Contact support with error details',
          ],
          originalError: error,
        }
    }
  }

  /**
   * Validate marks entry data
   */
  validateMarksEntry(data: {
    rawScore?: number
    maxScore?: number
    examScore?: number
    caType?: string
    name?: string
  }): ValidationError[] {
    const errors: ValidationError[] = []

    // Validate CA entry
    if (data.rawScore !== undefined && data.maxScore !== undefined) {
      if (data.rawScore < 0) {
        errors.push({
          field: 'rawScore',
          message: 'Score cannot be negative',
          value: data.rawScore,
        })
      }

      if (data.rawScore > data.maxScore) {
        errors.push({
          field: 'rawScore',
          message: `Score cannot exceed maximum of ${data.maxScore}`,
          value: data.rawScore,
        })
      }

      if (data.maxScore <= 0) {
        errors.push({
          field: 'maxScore',
          message: 'Maximum score must be greater than 0',
          value: data.maxScore,
        })
      }

      if (data.maxScore > 1000) {
        errors.push({
          field: 'maxScore',
          message: 'Maximum score cannot exceed 1000',
          value: data.maxScore,
        })
      }
    }

    // Validate exam entry
    if (data.examScore !== undefined) {
      if (data.examScore < 0) {
        errors.push({
          field: 'examScore',
          message: 'Exam score cannot be negative',
          value: data.examScore,
        })
      }

      if (data.examScore > 100) {
        errors.push({
          field: 'examScore',
          message: 'Exam score cannot exceed 100',
          value: data.examScore,
        })
      }
    }

    // Validate CA type
    if (data.caType && !['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION'].includes(data.caType)) {
      errors.push({
        field: 'caType',
        message: 'Invalid CA type selected',
        value: data.caType,
      })
    }

    // Validate CA name
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        errors.push({
          field: 'name',
          message: 'CA entry name is required',
          value: data.name,
        })
      }

      if (data.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'CA entry name is too long (maximum 100 characters)',
          value: data.name,
        })
      }
    }

    return errors
  }

  /**
   * Batch validate multiple entries
   */
  batchValidateEntries(entries: any[]): { isValid: boolean; errors: ValidationError[] } {
    const allErrors: ValidationError[] = []

    entries.forEach((entry, index) => {
      const entryErrors = this.validateMarksEntry(entry)
      entryErrors.forEach(error => {
        allErrors.push({
          ...error,
          field: `entry[${index}].${error.field}`,
        })
      })
    })

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    }
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: TeacherMarksError | null = null
    let delay = this.retryConfig.initialDelayMs

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = this.handleError(error, context)

        // Don't retry if error is not retryable
        if (!lastError.retryable || !this.retryConfig.retryableErrors.includes(lastError.type)) {
          throw lastError
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          throw lastError
        }

        // Wait before retrying
        await this.delay(delay)
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs)
      }
    }

    throw lastError
  }

  /**
   * Create user-friendly error message for display
   */
  formatErrorForUser(error: TeacherMarksError): {
    title: string
    message: string
    actions: string[]
    severity: 'error' | 'warning' | 'info'
  } {
    let severity: 'error' | 'warning' | 'info' = 'error'
    let title = 'Error'

    switch (error.type) {
      case TeacherMarksErrorType.NETWORK_ERROR:
        title = 'Connection Problem'
        severity = 'warning'
        break
      case TeacherMarksErrorType.TIMEOUT_ERROR:
        title = 'Request Timeout'
        severity = 'warning'
        break
      case TeacherMarksErrorType.SERVICE_UNAVAILABLE:
        title = 'Service Unavailable'
        severity = 'warning'
        break
      case TeacherMarksErrorType.APPROVED_MARKS_LOCKED:
        title = 'Marks Locked'
        severity = 'info'
        break
      case TeacherMarksErrorType.UNAUTHORIZED:
        title = 'Session Expired'
        break
      case TeacherMarksErrorType.INSUFFICIENT_PERMISSIONS:
        title = 'Access Denied'
        break
      default:
        title = 'Error'
        break
    }

    return {
      title,
      message: error.message,
      actions: error.suggestedActions,
      severity,
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const teacherMarksErrorHandler = new TeacherMarksErrorHandler()

// Export utility functions
export function isRetryableError(error: TeacherMarksError): boolean {
  return error.retryable && DEFAULT_RETRY_CONFIG.retryableErrors.includes(error.type)
}

export function getErrorSeverity(error: TeacherMarksError): 'error' | 'warning' | 'info' {
  switch (error.type) {
    case TeacherMarksErrorType.NETWORK_ERROR:
    case TeacherMarksErrorType.TIMEOUT_ERROR:
    case TeacherMarksErrorType.SERVICE_UNAVAILABLE:
      return 'warning'
    case TeacherMarksErrorType.APPROVED_MARKS_LOCKED:
      return 'info'
    default:
      return 'error'
  }
}

/**
 * Enhanced fetch wrapper with error handling and retry logic
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {},
  context?: string
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await teacherMarksErrorHandler.withRetry(async () => {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new ApiError(
          res.status,
          errorData.code || 'API_ERROR',
          errorData.error || errorData.message || `HTTP ${res.status}`,
          errorData.details
        )
      }

      return res
    }, context)

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}