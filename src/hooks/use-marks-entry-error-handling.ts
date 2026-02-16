/**
 * Marks Entry Error Handling Hook
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - Add client-side validation with immediate feedback
 * - Implement server-side validation with proper error responses
 * - Create user-friendly error messages for all scenarios
 * - Add retry mechanisms for transient network errors
 * - Implement graceful degradation for service unavailability
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { 
  teacherMarksValidator,
  type ValidationResult,
  type FieldValidationResult
} from '@/lib/teacher-marks-validation'
import { 
  teacherMarksErrorHandler,
  fetchWithErrorHandling,
  type TeacherMarksError,
  TeacherMarksErrorType
} from '@/lib/teacher-marks-error-handler'
import { useNetworkStatus, useNetworkAwareOperation } from '@/hooks/use-network-status'

export interface MarksEntryError {
  field: string
  message: string
  type: 'validation' | 'network' | 'server' | 'permission'
  retryable: boolean
}

export interface MarksEntryState {
  isLoading: boolean
  isSaving: boolean
  errors: Map<string, MarksEntryError>
  warnings: Map<string, string>
  hasUnsavedChanges: boolean
  lastSaveTime: Date | null
  retryCount: number
}

export interface UseMarksEntryErrorHandlingOptions {
  autoSave?: boolean
  autoSaveDelay?: number
  maxRetries?: number
  onError?: (error: TeacherMarksError) => void
  onSuccess?: (message: string) => void
  onWarning?: (message: string) => void
}

/**
 * Hook for comprehensive marks entry error handling
 */
export function useMarksEntryErrorHandling(options: UseMarksEntryErrorHandlingOptions = {}) {
  const {
    autoSave = false,
    autoSaveDelay = 2000,
    maxRetries = 3,
    onError,
    onSuccess,
    onWarning
  } = options

  const [state, setState] = useState<MarksEntryState>({
    isLoading: false,
    isSaving: false,
    errors: new Map(),
    warnings: new Map(),
    hasUnsavedChanges: false,
    lastSaveTime: null,
    retryCount: 0
  })

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const pendingChangesRef = useRef<any[]>([])

  // Network status monitoring
  const networkStatus = useNetworkStatus({
    onOnline: () => {
      // Auto-retry failed operations when coming back online
      if (pendingChangesRef.current.length > 0) {
        handleBatchSave(pendingChangesRef.current)
      }
    }
  })

  // Network-aware save operation
  const saveOperation = useNetworkAwareOperation(
    (entries: any[]) => saveBatchEntries(entries),
    {
      maxRetries,
      onRetry: (attempt) => {
        setState(prev => ({ ...prev, retryCount: attempt }))
      },
      onMaxRetriesReached: (error) => {
        const marksError = teacherMarksErrorHandler.handleError(error, 'batch-save')
        handleError('batch-save', marksError)
        onError?.(marksError)
      }
    }
  )

  /**
   * Validate a single field in real-time
   */
  const validateField = useCallback((
    field: string,
    value: any,
    context?: { maxScore?: number; type?: 'CA' | 'EXAM' }
  ): FieldValidationResult => {
    try {
      let result: FieldValidationResult

      switch (field) {
        case 'caName':
          result = teacherMarksValidator.validateCAName(value)
          break
        case 'caType':
          result = teacherMarksValidator.validateCAType(value)
          break
        case 'maxScore':
          result = teacherMarksValidator.validateMaxScore(value)
          break
        case 'rawScore':
          result = teacherMarksValidator.validateRawScore(value, context?.maxScore || 100)
          break
        case 'examScore':
          result = teacherMarksValidator.validateExamScore(value)
          break
        case 'examDate':
          result = teacherMarksValidator.validateExamDate(value)
          break
        case 'competencyComment':
          result = teacherMarksValidator.validateCompetencyComment(value)
          break
        default:
          result = { isValid: true }
      }

      // Update field error state
      setState(prev => {
        const newErrors = new Map(prev.errors)
        const newWarnings = new Map(prev.warnings)

        if (!result.isValid && result.error) {
          newErrors.set(field, {
            field,
            message: result.error,
            type: 'validation',
            retryable: false
          })
          newWarnings.delete(field)
        } else {
          newErrors.delete(field)
          if (result.warning) {
            newWarnings.set(field, result.warning)
          } else {
            newWarnings.delete(field)
          }
        }

        return {
          ...prev,
          errors: newErrors,
          warnings: newWarnings
        }
      })

      return result
    } catch (error) {
      const validationError: FieldValidationResult = {
        isValid: false,
        error: 'Validation error occurred'
      }

      setState(prev => {
        const newErrors = new Map(prev.errors)
        newErrors.set(field, {
          field,
          message: 'Validation error occurred',
          type: 'validation',
          retryable: false
        })

        return {
          ...prev,
          errors: newErrors
        }
      })

      return validationError
    }
  }, [])

  /**
   * Validate complete entry (CA or Exam)
   */
  const validateEntry = useCallback((entry: any, type: 'CA' | 'EXAM'): ValidationResult => {
    try {
      if (type === 'CA') {
        return teacherMarksValidator.validateCAEntry(entry)
      } else {
        return teacherMarksValidator.validateExamEntry(entry)
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Entry validation failed',
          severity: 'error' as const
        }],
        warnings: []
      }
    }
  }, [])

  /**
   * Batch validate multiple entries
   */
  const validateBatch = useCallback((entries: any[]): ValidationResult => {
    try {
      const result = teacherMarksValidator.batchValidateEntries(entries)
      
      // Check for duplicates
      const duplicateErrors = teacherMarksValidator.checkForDuplicates(entries)
      
      return {
        isValid: result.isValid && duplicateErrors.length === 0,
        errors: [...result.errors, ...duplicateErrors],
        warnings: result.warnings
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'batch',
          message: 'Batch validation failed',
          severity: 'error' as const
        }],
        warnings: []
      }
    }
  }, [])

  /**
   * Handle API errors
   */
  const handleError = useCallback((context: string, error: TeacherMarksError) => {
    setState(prev => {
      const newErrors = new Map(prev.errors)
      
      if (error.field) {
        newErrors.set(error.field, {
          field: error.field,
          message: error.message,
          type: error.type === TeacherMarksErrorType.NETWORK_ERROR ? 'network' : 'server',
          retryable: error.retryable
        })
      } else {
        newErrors.set(context, {
          field: context,
          message: error.message,
          type: error.type === TeacherMarksErrorType.NETWORK_ERROR ? 'network' : 'server',
          retryable: error.retryable
        })
      }

      return {
        ...prev,
        errors: newErrors,
        isSaving: false
      }
    })
  }, [])

  /**
   * Clear errors for a specific field or context
   */
  const clearErrors = useCallback((field?: string) => {
    setState(prev => {
      if (field) {
        const newErrors = new Map(prev.errors)
        const newWarnings = new Map(prev.warnings)
        newErrors.delete(field)
        newWarnings.delete(field)
        return {
          ...prev,
          errors: newErrors,
          warnings: newWarnings
        }
      } else {
        return {
          ...prev,
          errors: new Map(),
          warnings: new Map()
        }
      }
    })
  }, [])

  /**
   * Mark changes as unsaved and trigger auto-save if enabled
   */
  const markUnsavedChanges = useCallback((entries: any[]) => {
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))
    pendingChangesRef.current = entries

    if (autoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleBatchSave(entries, true)
      }, autoSaveDelay)
    }
  }, [autoSave, autoSaveDelay])

  /**
   * Save batch entries with error handling
   */
  const saveBatchEntries = async (entries: any[]): Promise<Response> => {
    const response = await fetchWithErrorHandling('/api/teacher/marks/batch-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries,
        submitForApproval: false
      })
    }, 'batch-save')

    return response
  }

  /**
   * Handle batch save with comprehensive error handling
   */
  const handleBatchSave = useCallback(async (entries: any[], isAutoSave = false) => {
    if (!networkStatus.isOnline) {
      const offlineError = teacherMarksErrorHandler.handleError(
        new Error('No internet connection'), 
        'batch-save'
      )
      handleError('batch-save', offlineError)
      return { success: false, error: offlineError }
    }

    // Validate batch before saving
    const validation = validateBatch(entries)
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        setState(prev => {
          const newErrors = new Map(prev.errors)
          newErrors.set(error.field, {
            field: error.field,
            message: error.message,
            type: 'validation',
            retryable: false
          })
          return { ...prev, errors: newErrors }
        })
      })
      return { success: false, error: 'Validation failed' }
    }

    setState(prev => ({ ...prev, isSaving: true }))
    clearErrors('batch-save')

    try {
      const response = await saveOperation.execute(entries)
      if (response) {
        const data = await response.json()
        
        setState(prev => ({
          ...prev,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSaveTime: new Date(),
          retryCount: 0
        }))

        pendingChangesRef.current = []
        
        if (!isAutoSave) {
          onSuccess?.(data.message || 'Marks saved successfully')
        }

        // Handle warnings if any
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach((warning: string) => {
            onWarning?.(warning)
          })
        }

        return { success: true, data }
      }
    } catch (error) {
      // Error is already handled by the operation
      return { success: false, error }
    }

    return { success: false, error: 'Unknown error' }
  }, [networkStatus.isOnline, validateBatch, saveOperation, clearErrors, onSuccess, onWarning])

  /**
   * Retry failed operation
   */
  const retryFailedOperation = useCallback((context: string) => {
    if (context === 'batch-save' && pendingChangesRef.current.length > 0) {
      setState(prev => ({ ...prev, retryCount: 0 }))
      handleBatchSave(pendingChangesRef.current)
    }
  }, [handleBatchSave])

  /**
   * Get error message for a specific field
   */
  const getFieldError = useCallback((field: string): string | undefined => {
    return state.errors.get(field)?.message
  }, [state.errors])

  /**
   * Get warning message for a specific field
   */
  const getFieldWarning = useCallback((field: string): string | undefined => {
    return state.warnings.get(field)
  }, [state.warnings])

  /**
   * Check if a field has errors
   */
  const hasFieldError = useCallback((field: string): boolean => {
    return state.errors.has(field)
  }, [state.errors])

  /**
   * Check if form is valid (no validation errors)
   */
  const isFormValid = useCallback((): boolean => {
    return Array.from(state.errors.values()).every(error => error.type !== 'validation')
  }, [state.errors])

  /**
   * Get all current errors
   */
  const getAllErrors = useCallback((): MarksEntryError[] => {
    return Array.from(state.errors.values())
  }, [state.errors])

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [])

  return {
    // State
    ...state,
    isOnline: networkStatus.isOnline,
    
    // Validation functions
    validateField,
    validateEntry,
    validateBatch,
    
    // Error handling
    handleError,
    clearErrors,
    retryFailedOperation,
    
    // Field helpers
    getFieldError,
    getFieldWarning,
    hasFieldError,
    
    // Form state
    isFormValid,
    getAllErrors,
    
    // Save operations
    handleBatchSave,
    markUnsavedChanges,
    
    // Cleanup
    cleanup
  }
}