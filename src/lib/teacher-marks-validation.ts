/**
 * Teacher Marks Management - Client-Side Validation
 * 
 * Requirements: 14.1 - Add client-side validation with immediate feedback
 * - Real-time validation as user types
 * - Immediate visual feedback for validation errors
 * - Comprehensive validation rules for all mark types
 * - Batch validation for multiple entries
 */

import { z } from 'zod'

// Validation schemas
export const CAEntryValidationSchema = z.object({
  name: z.string()
    .min(1, 'CA entry name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .refine(name => name.trim().length > 0, 'Name cannot be empty or just spaces'),
  
  type: z.enum(['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION'], {
    errorMap: () => ({ message: 'Please select a valid CA type' })
  }),
  
  maxScore: z.number()
    .min(1, 'Maximum score must be at least 1')
    .max(1000, 'Maximum score cannot exceed 1000')
    .refine(score => Number.isFinite(score), 'Maximum score must be a valid number'),
  
  rawScore: z.number()
    .min(0, 'Score cannot be negative')
    .refine(score => Number.isFinite(score), 'Score must be a valid number'),
  
  competencyComment: z.string()
    .max(500, 'Comment cannot exceed 500 characters')
    .optional(),
}).refine(
  data => data.rawScore <= data.maxScore,
  {
    message: 'Score cannot exceed the maximum score',
    path: ['rawScore']
  }
)

export const ExamEntryValidationSchema = z.object({
  examScore: z.number()
    .min(0, 'Exam score cannot be negative')
    .max(100, 'Exam score cannot exceed 100')
    .refine(score => Number.isFinite(score), 'Exam score must be a valid number'),
  
  examDate: z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Please enter a valid date')
    .refine(date => new Date(date) <= new Date(), 'Exam date cannot be in the future')
})

export const BatchSaveValidationSchema = z.object({
  entries: z.array(z.union([
    CAEntryValidationSchema.extend({ type: z.literal('CA') }),
    ExamEntryValidationSchema.extend({ type: z.literal('EXAM') })
  ])).min(1, 'At least one entry is required'),
  
  submitForApproval: z.boolean().default(false)
})

// Validation result types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  value?: any
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: string
  message: string
  value?: any
}

export interface FieldValidationResult {
  isValid: boolean
  error?: string
  warning?: string
}

/**
 * Real-time field validation for immediate feedback
 */
export class TeacherMarksValidator {
  
  /**
   * Validate CA entry name in real-time
   */
  validateCAName(name: string): FieldValidationResult {
    if (!name || name.trim().length === 0) {
      return {
        isValid: false,
        error: 'CA entry name is required'
      }
    }

    if (name.length > 100) {
      return {
        isValid: false,
        error: 'Name cannot exceed 100 characters'
      }
    }

    // Warning for very short names
    if (name.trim().length < 3) {
      return {
        isValid: true,
        warning: 'Consider using a more descriptive name'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate CA type selection
   */
  validateCAType(type: string): FieldValidationResult {
    const validTypes = ['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION']
    
    if (!type) {
      return {
        isValid: false,
        error: 'Please select a CA type'
      }
    }

    if (!validTypes.includes(type)) {
      return {
        isValid: false,
        error: 'Please select a valid CA type'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate maximum score for CA entries
   */
  validateMaxScore(maxScore: number | string): FieldValidationResult {
    const score = typeof maxScore === 'string' ? parseFloat(maxScore) : maxScore

    if (isNaN(score) || !Number.isFinite(score)) {
      return {
        isValid: false,
        error: 'Maximum score must be a valid number'
      }
    }

    if (score < 1) {
      return {
        isValid: false,
        error: 'Maximum score must be at least 1'
      }
    }

    if (score > 1000) {
      return {
        isValid: false,
        error: 'Maximum score cannot exceed 1000'
      }
    }

    // Warning for unusual max scores
    if (score > 200) {
      return {
        isValid: true,
        warning: 'This is a very high maximum score. Please verify it is correct.'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate raw score for CA entries
   */
  validateRawScore(rawScore: number | string, maxScore: number): FieldValidationResult {
    const score = typeof rawScore === 'string' ? parseFloat(rawScore) : rawScore

    if (isNaN(score) || !Number.isFinite(score)) {
      return {
        isValid: false,
        error: 'Score must be a valid number'
      }
    }

    if (score < 0) {
      return {
        isValid: false,
        error: 'Score cannot be negative'
      }
    }

    if (score > maxScore) {
      return {
        isValid: false,
        error: `Score cannot exceed maximum of ${maxScore}`
      }
    }

    // Warning for perfect scores
    if (score === maxScore && maxScore > 10) {
      return {
        isValid: true,
        warning: 'Perfect score - please verify this is correct'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate exam score
   */
  validateExamScore(examScore: number | string): FieldValidationResult {
    const score = typeof examScore === 'string' ? parseFloat(examScore) : examScore

    if (isNaN(score) || !Number.isFinite(score)) {
      return {
        isValid: false,
        error: 'Exam score must be a valid number'
      }
    }

    if (score < 0) {
      return {
        isValid: false,
        error: 'Exam score cannot be negative'
      }
    }

    if (score > 100) {
      return {
        isValid: false,
        error: 'Exam score cannot exceed 100'
      }
    }

    // Warning for perfect scores
    if (score === 100) {
      return {
        isValid: true,
        warning: 'Perfect score - please verify this is correct'
      }
    }

    // Warning for very low scores
    if (score < 10 && score > 0) {
      return {
        isValid: true,
        warning: 'This is a very low score. Please verify it is correct.'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate exam date
   */
  validateExamDate(examDate: string): FieldValidationResult {
    if (!examDate) {
      return {
        isValid: false,
        error: 'Exam date is required'
      }
    }

    const date = new Date(examDate)
    
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Please enter a valid date'
      }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const examDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (examDateOnly > today) {
      return {
        isValid: false,
        error: 'Exam date cannot be in the future'
      }
    }

    // Warning for very old dates
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    if (date < oneYearAgo) {
      return {
        isValid: true,
        warning: 'This exam date is more than a year old. Please verify it is correct.'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate competency comment
   */
  validateCompetencyComment(comment: string): FieldValidationResult {
    if (comment && comment.length > 500) {
      return {
        isValid: false,
        error: 'Comment cannot exceed 500 characters'
      }
    }

    return { isValid: true }
  }

  /**
   * Validate complete CA entry
   */
  validateCAEntry(entry: {
    name: string
    type: string
    maxScore: number | string
    rawScore: number | string
    competencyComment?: string
  }): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate name
    const nameResult = this.validateCAName(entry.name)
    if (!nameResult.isValid && nameResult.error) {
      errors.push({
        field: 'name',
        message: nameResult.error,
        value: entry.name,
        severity: 'error'
      })
    }
    if (nameResult.warning) {
      warnings.push({
        field: 'name',
        message: nameResult.warning,
        value: entry.name
      })
    }

    // Validate type
    const typeResult = this.validateCAType(entry.type)
    if (!typeResult.isValid && typeResult.error) {
      errors.push({
        field: 'type',
        message: typeResult.error,
        value: entry.type,
        severity: 'error'
      })
    }

    // Validate max score
    const maxScoreResult = this.validateMaxScore(entry.maxScore)
    if (!maxScoreResult.isValid && maxScoreResult.error) {
      errors.push({
        field: 'maxScore',
        message: maxScoreResult.error,
        value: entry.maxScore,
        severity: 'error'
      })
    }
    if (maxScoreResult.warning) {
      warnings.push({
        field: 'maxScore',
        message: maxScoreResult.warning,
        value: entry.maxScore
      })
    }

    // Validate raw score (only if max score is valid)
    if (maxScoreResult.isValid) {
      const maxScore = typeof entry.maxScore === 'string' ? parseFloat(entry.maxScore) : entry.maxScore
      const rawScoreResult = this.validateRawScore(entry.rawScore, maxScore)
      if (!rawScoreResult.isValid && rawScoreResult.error) {
        errors.push({
          field: 'rawScore',
          message: rawScoreResult.error,
          value: entry.rawScore,
          severity: 'error'
        })
      }
      if (rawScoreResult.warning) {
        warnings.push({
          field: 'rawScore',
          message: rawScoreResult.warning,
          value: entry.rawScore
        })
      }
    }

    // Validate competency comment
    if (entry.competencyComment) {
      const commentResult = this.validateCompetencyComment(entry.competencyComment)
      if (!commentResult.isValid && commentResult.error) {
        errors.push({
          field: 'competencyComment',
          message: commentResult.error,
          value: entry.competencyComment,
          severity: 'error'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate complete exam entry
   */
  validateExamEntry(entry: {
    examScore: number | string
    examDate: string
  }): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate exam score
    const scoreResult = this.validateExamScore(entry.examScore)
    if (!scoreResult.isValid && scoreResult.error) {
      errors.push({
        field: 'examScore',
        message: scoreResult.error,
        value: entry.examScore,
        severity: 'error'
      })
    }
    if (scoreResult.warning) {
      warnings.push({
        field: 'examScore',
        message: scoreResult.warning,
        value: entry.examScore
      })
    }

    // Validate exam date
    const dateResult = this.validateExamDate(entry.examDate)
    if (!dateResult.isValid && dateResult.error) {
      errors.push({
        field: 'examDate',
        message: dateResult.error,
        value: entry.examDate,
        severity: 'error'
      })
    }
    if (dateResult.warning) {
      warnings.push({
        field: 'examDate',
        message: dateResult.warning,
        value: entry.examDate
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Batch validate multiple entries
   */
  batchValidateEntries(entries: any[]): ValidationResult {
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationWarning[] = []

    entries.forEach((entry, index) => {
      let result: ValidationResult

      if (entry.type === 'CA') {
        result = this.validateCAEntry(entry)
      } else if (entry.type === 'EXAM') {
        result = this.validateExamEntry(entry)
      } else {
        result = {
          isValid: false,
          errors: [{
            field: 'type',
            message: 'Invalid entry type',
            value: entry.type,
            severity: 'error'
          }],
          warnings: []
        }
      }

      // Add entry index to field names for batch context
      result.errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `entry[${index}].${error.field}`
        })
      })

      result.warnings.forEach(warning => {
        allWarnings.push({
          ...warning,
          field: `entry[${index}].${warning.field}`
        })
      })
    })

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }

  /**
   * Check for duplicate entries in batch
   */
  checkForDuplicates(entries: any[]): ValidationError[] {
    const errors: ValidationError[] = []
    const seen = new Set<string>()

    entries.forEach((entry, index) => {
      if (entry.type === 'EXAM') {
        const key = `${entry.studentId}-${entry.subjectId}-EXAM`
        if (seen.has(key)) {
          errors.push({
            field: `entry[${index}]`,
            message: 'Duplicate exam entry detected for this student and subject',
            severity: 'error'
          })
        }
        seen.add(key)
      } else if (entry.type === 'CA') {
        const key = `${entry.studentId}-${entry.subjectId}-${entry.name}`
        if (seen.has(key)) {
          errors.push({
            field: `entry[${index}]`,
            message: 'Duplicate CA entry name detected for this student and subject',
            severity: 'error'
          })
        }
        seen.add(key)
      }
    })

    return errors
  }
}

// Export singleton instance
export const teacherMarksValidator = new TeacherMarksValidator()

// Utility functions for common validation patterns
export function validateNumericInput(
  value: string,
  min: number,
  max: number,
  fieldName: string
): FieldValidationResult {
  if (!value.trim()) {
    return {
      isValid: false,
      error: `${fieldName} is required`
    }
  }

  const numValue = parseFloat(value)
  
  if (isNaN(numValue) || !Number.isFinite(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`
    }
  }

  if (numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} cannot be less than ${min}`
    }
  }

  if (numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${max}`
    }
  }

  return { isValid: true }
}

export function validateRequiredField(value: string, fieldName: string): FieldValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required`
    }
  }

  return { isValid: true }
}

export function debounceValidation<T extends any[]>(
  validationFn: (...args: T) => FieldValidationResult,
  delay: number = 300
): (...args: T) => Promise<FieldValidationResult> {
  let timeoutId: NodeJS.Timeout

  return (...args: T): Promise<FieldValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        resolve(validationFn(...args))
      }, delay)
    })
  }
}