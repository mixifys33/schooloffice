/**
 * Form Validation Utilities
 * Requirements: 21.1, 21.4
 * - Display error messages adjacent to input fields
 * - Highlight empty required fields with red border
 */

import { useState, useCallback, useMemo } from 'react'

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  isValid: boolean
  error?: string
  touched: boolean
}

/**
 * Validation rule type
 */
export type ValidationRule<T = string> = {
  validate: (value: T) => boolean
  message: string
}

/**
 * Field validation configuration
 */
export interface FieldValidation<T = string> {
  required?: boolean | string // true or custom message
  rules?: ValidationRule<T>[]
}

/**
 * Form validation schema
 */
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: FieldValidation<T[K]>
}

/**
 * Validation errors object
 */
export type ValidationErrors<T extends Record<string, unknown>> = {
  [K in keyof T]?: string
}

/**
 * Touched fields tracking
 */
export type TouchedFields<T extends Record<string, unknown>> = {
  [K in keyof T]?: boolean
}

/**
 * Form field props returned by getFieldProps
 * Requirements: 21.1, 21.4 - Display error messages and highlight empty required fields
 */
export interface FormFieldProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  error?: string
  className?: string
}

/**
 * Form validation hook return type
 */
export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T
  /** Current validation errors */
  errors: ValidationErrors<T>
  /** Fields that have been touched (blurred) */
  touched: TouchedFields<T>
  /** Whether the form is valid */
  isValid: boolean
  /** Whether the form has been submitted */
  isSubmitted: boolean
  /** Set a single field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  /** Set multiple field values */
  setValues: (values: Partial<T>) => void
  /** Set a single field error */
  setError: <K extends keyof T>(field: K, error: string | undefined) => void
  /** Set multiple field errors */
  setErrors: (errors: ValidationErrors<T>) => void
  /** Mark a field as touched */
  setTouched: <K extends keyof T>(field: K, isTouched?: boolean) => void
  /** Mark all fields as touched */
  setAllTouched: () => void
  /** Validate a single field */
  validateField: <K extends keyof T>(field: K) => string | undefined
  /** Validate all fields */
  validateAll: () => ValidationErrors<T>
  /** Handle form submission */
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: React.FormEvent) => void
  /** Get props for a form field (value, onChange, onBlur, error, className) */
  getFieldProps: <K extends keyof T>(field: K) => FormFieldProps
  /** Get error for a field (only if touched or submitted) */
  getFieldError: <K extends keyof T>(field: K) => string | undefined
  /** Get CSS classes for field validation state */
  getFieldClasses: <K extends keyof T>(field: K) => string
  /** Reset form to initial values */
  reset: () => void
  /** Clear all errors */
  clearErrors: () => void
}

/**
 * Common validation rules
 */
export const validationRules = {
  /**
   * Email validation rule
   */
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true // Let required handle empty
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    message,
  }),

  /**
   * Minimum length validation rule
   */
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true // Let required handle empty
      return value.length >= min
    },
    message: message || `Must be at least ${min} characters`,
  }),

  /**
   * Maximum length validation rule
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      return value.length <= max
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  /**
   * Phone number validation rule
   */
  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      // Accepts formats: +256700000000, 0700000000, 256700000000
      return /^(\+?\d{1,3})?[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/.test(value)
    },
    message,
  }),

  /**
   * Pattern validation rule
   */
  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      return regex.test(value)
    },
    message,
  }),

  /**
   * Custom validation rule
   */
  custom: <T = string>(
    validateFn: (value: T) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),

  /**
   * Date validation - must be in the past
   */
  pastDate: (message = 'Date must be in the past'): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      const date = new Date(value)
      return date < new Date()
    },
    message,
  }),

  /**
   * Date validation - must be in the future
   */
  futureDate: (message = 'Date must be in the future'): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      const date = new Date(value)
      return date > new Date()
    },
    message,
  }),

  /**
   * Date validation - end date must be after start date
   * Requirements: 10.2 - Validate end date is after start date
   */
  dateAfter: (
    startDateValue: string,
    message = 'End date must be after start date'
  ): ValidationRule => ({
    validate: (value: string) => {
      if (!value || !startDateValue) return true
      const endDate = new Date(value)
      const startDate = new Date(startDateValue)
      return endDate > startDate
    },
    message,
  }),

  /**
   * Number range validation
   */
  numberRange: (
    min: number,
    max: number,
    message?: string
  ): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      const num = parseFloat(value)
      return !isNaN(num) && num >= min && num <= max
    },
    message: message || `Must be between ${min} and ${max}`,
  }),

  /**
   * Positive number validation
   */
  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value: string) => {
      if (!value) return true
      const num = parseFloat(value)
      return !isNaN(num) && num > 0
    },
    message,
  }),
}

/**
 * Validate a single field value
 */
export function validateField<T>(
  value: T,
  validation?: FieldValidation<T>
): string | undefined {
  if (!validation) return undefined

  // Check required
  if (validation.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && !value.trim())

    if (isEmpty) {
      return typeof validation.required === 'string'
        ? validation.required
        : 'This field is required'
    }
  }

  // Check additional rules
  if (validation.rules) {
    for (const rule of validation.rules) {
      if (!rule.validate(value)) {
        return rule.message
      }
    }
  }

  return undefined
}

/**
 * Validate entire form data against schema
 */
export function validateForm<T extends Record<string, unknown>>(
  data: T,
  schema: ValidationSchema<T>
): ValidationErrors<T> {
  const errors: ValidationErrors<T> = {}

  for (const key in schema) {
    const fieldValidation = schema[key]
    const value = data[key]
    const error = validateField(value, fieldValidation as FieldValidation<typeof value>)

    if (error) {
      errors[key] = error
    }
  }

  return errors
}

/**
 * Check if form has any errors
 */
export function hasErrors<T extends Record<string, unknown>>(
  errors: ValidationErrors<T>
): boolean {
  return Object.keys(errors).length > 0
}

/**
 * Get error count
 */
export function getErrorCount<T extends Record<string, unknown>>(
  errors: ValidationErrors<T>
): number {
  return Object.keys(errors).length
}

/**
 * Create a validation schema builder for type safety
 */
export function createValidationSchema<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>
): ValidationSchema<T> {
  return schema
}


/**
 * Get CSS classes for field with validation state
 * Requirements: 21.4 - Highlight empty required fields with red border
 */
export function getFieldClasses(
  error: string | undefined,
  touched: boolean
): string {
  if (error && touched) {
    return 'border-[var(--danger)] focus-visible:ring-[var(--danger)]'
  }
  return ''
}

/**
 * Check if a value is empty (for required field validation)
 */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Format validation errors for display
 * Returns a summary message for multiple errors
 */
export function formatValidationSummary<T extends Record<string, unknown>>(
  errors: ValidationErrors<T>
): string {
  const errorCount = getErrorCount(errors)
  if (errorCount === 0) return ''
  if (errorCount === 1) return 'Please correct the highlighted field'
  return `Please correct the ${errorCount} highlighted fields`
}

/**
 * Validate on submit - validates all fields and returns whether form is valid
 * Requirements: 21.4 - Prevent submission and highlight empty required fields
 */
export function validateOnSubmit<T extends Record<string, unknown>>(
  data: T,
  schema: ValidationSchema<T>
): { isValid: boolean; errors: ValidationErrors<T> } {
  const errors = validateForm(data, schema)
  return {
    isValid: !hasErrors(errors),
    errors,
  }
}

/**
 * Custom hook for form validation
 * Requirements: 21.1, 21.4
 * - Display error messages adjacent to input fields
 * - Highlight empty required fields with red border
 * - Prevent submission when validation fails
 * 
 * @param initialValues - Initial form values
 * @param schema - Validation schema for the form
 * @returns Form validation state and handlers
 * 
 * @example
 * ```tsx
 * const { values, errors, getFieldProps, handleSubmit } = useFormValidation(
 *   { email: '', password: '' },
 *   {
 *     email: { required: true, rules: [validationRules.email()] },
 *     password: { required: true, rules: [validationRules.minLength(6)] }
 *   }
 * )
 * 
 * return (
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <FormField label="Email" name="email" {...getFieldProps('email')} />
 *     <FormField label="Password" name="password" type="password" {...getFieldProps('password')} />
 *     <button type="submit">Submit</button>
 *   </form>
 * )
 * ```
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  schema: ValidationSchema<T>
): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrorsState] = useState<ValidationErrors<T>>({})
  const [touched, setTouchedState] = useState<TouchedFields<T>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  /**
   * Set a single field value
   */
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    setErrorsState(prev => {
      if (prev[field]) {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      }
      return prev
    })
  }, [])

  /**
   * Set multiple field values
   */
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }))
  }, [])

  /**
   * Set a single field error
   */
  const setError = useCallback(<K extends keyof T>(field: K, error: string | undefined) => {
    setErrorsState(prev => {
      if (error) {
        return { ...prev, [field]: error }
      }
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  /**
   * Set multiple field errors
   */
  const setErrors = useCallback((newErrors: ValidationErrors<T>) => {
    setErrorsState(newErrors)
  }, [])

  /**
   * Mark a field as touched
   */
  const setTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }))
  }, [])

  /**
   * Mark all fields as touched
   */
  const setAllTouched = useCallback(() => {
    const allTouched: TouchedFields<T> = {}
    for (const key in schema) {
      allTouched[key] = true
    }
    setTouchedState(allTouched)
  }, [schema])

  /**
   * Validate a single field
   */
  const validateFieldValue = useCallback(<K extends keyof T>(field: K): string | undefined => {
    const fieldValidation = schema[field]
    const value = values[field]
    return validateField(value, fieldValidation as FieldValidation<typeof value>)
  }, [schema, values])

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): ValidationErrors<T> => {
    return validateForm(values, schema)
  }, [values, schema])

  /**
   * Handle field blur - validate and mark as touched
   * Requirements: 21.1 - Display error messages adjacent to input fields
   */
  const handleBlur = useCallback(<K extends keyof T>(field: K) => {
    setTouched(field, true)
    const error = validateFieldValue(field)
    setError(field, error)
  }, [setTouched, validateFieldValue, setError])

  /**
   * Handle field change
   */
  const handleChange = useCallback(<K extends keyof T>(
    field: K,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value as T[K]
    setValue(field, value)
  }, [setValue])

  /**
   * Handle form submission
   * Requirements: 21.4 - Prevent submission and highlight empty required fields
   */
  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => {
    return async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitted(true)
      setAllTouched()
      
      const validationErrors = validateAll()
      setErrors(validationErrors)
      
      if (!hasErrors(validationErrors)) {
        await onSubmit(values)
      }
    }
  }, [setAllTouched, validateAll, setErrors, values])

  /**
   * Get error for a field (only if touched or submitted)
   * Requirements: 21.1 - Display error messages adjacent to input fields
   */
  const getFieldError = useCallback(<K extends keyof T>(field: K): string | undefined => {
    if (touched[field] || isSubmitted) {
      return errors[field]
    }
    return undefined
  }, [touched, isSubmitted, errors])

  /**
   * Get CSS classes for field validation state
   * Requirements: 21.4 - Highlight empty required fields with red border
   */
  const getFieldClassesForField = useCallback(<K extends keyof T>(field: K): string => {
    const error = getFieldError(field)
    if (error) {
      return 'border-[var(--danger)] focus-visible:ring-[var(--danger)]'
    }
    return ''
  }, [getFieldError])

  /**
   * Get props for a form field
   * Requirements: 21.1, 21.4 - Display error messages and highlight empty required fields
   */
  const getFieldProps = useCallback(<K extends keyof T>(field: K): FormFieldProps => {
    return {
      value: String(values[field] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => handleChange(field, e),
      onBlur: () => handleBlur(field),
      error: getFieldError(field),
      className: getFieldClassesForField(field),
    }
  }, [values, handleChange, handleBlur, getFieldError, getFieldClassesForField])

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrorsState({})
    setTouchedState({})
    setIsSubmitted(false)
  }, [initialValues])

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrorsState({})
  }, [])

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    const validationErrors = validateForm(values, schema)
    return !hasErrors(validationErrors)
  }, [values, schema])

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitted,
    setValue,
    setValues,
    setError,
    setErrors,
    setTouched,
    setAllTouched,
    validateField: validateFieldValue,
    validateAll,
    handleSubmit,
    getFieldProps,
    getFieldError,
    getFieldClasses: getFieldClassesForField,
    reset,
    clearErrors,
  }
}

/**
 * Utility to create field error display component props
 * Requirements: 21.1 - Display error messages adjacent to input fields
 */
export interface FieldErrorProps {
  error?: string
  touched: boolean
  submitted: boolean
}

/**
 * Get the error message to display for a field
 * Only shows error if field is touched or form is submitted
 */
export function getDisplayError({ error, touched, submitted }: FieldErrorProps): string | undefined {
  if ((touched || submitted) && error) {
    return error
  }
  return undefined
}

/**
 * Utility to check if a field should show error styling
 * Requirements: 21.4 - Highlight empty required fields with red border
 */
export function shouldShowError({ error, touched, submitted }: FieldErrorProps): boolean {
  return (touched || submitted) && !!error
}
