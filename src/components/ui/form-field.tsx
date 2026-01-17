'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'
import { Input } from './input'

/**
 * Touch-Friendly Form Field Component
 * Requirements: 34.5 - Touch-friendly input controls with appropriate sizing for mobile
 */

export interface FormFieldProps {
  /** Field label */
  label: string
  /** Field name/id */
  name: string
  /** Field type */
  type?: React.HTMLInputTypeAttribute
  /** Placeholder text */
  placeholder?: string
  /** Help text */
  helpText?: string
  /** Error message */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether to use touch-friendly sizing */
  touchFriendly?: boolean
  /** Additional class names */
  className?: string
  /** Input value */
  value?: string
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Blur handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  /** Whether the field is disabled */
  disabled?: boolean
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  helpText,
  error,
  required = false,
  touchFriendly = true,
  className,
  value,
  onChange,
  onBlur,
  disabled,
}: FormFieldProps) {
  const id = React.useId()
  const fieldId = `${id}-${name}`
  const helpId = `${fieldId}-help`
  const errorId = `${fieldId}-error`

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={fieldId}
        className={cn(
          'block',
          touchFriendly && 'text-base', // Larger text for touch
          error && 'text-red-600 dark:text-red-400'
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      
      <Input
        id={fieldId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        touchFriendly={touchFriendly}
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      />
      
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Touch-Friendly Select Field Component
 */
export interface SelectFieldProps {
  label: string
  name: string
  options: { value: string; label: string }[]
  placeholder?: string
  helpText?: string
  error?: string
  required?: boolean
  touchFriendly?: boolean
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
}

export function SelectField({
  label,
  name,
  options,
  placeholder,
  helpText,
  error,
  required = false,
  touchFriendly = true,
  className,
  value,
  onChange,
  disabled,
}: SelectFieldProps) {
  const id = React.useId()
  const fieldId = `${id}-${name}`
  const helpId = `${fieldId}-help`
  const errorId = `${fieldId}-error`

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={fieldId}
        className={cn(
          'block',
          touchFriendly && 'text-base',
          error && 'text-red-600 dark:text-red-400'
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      
      <select
        id={fieldId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          touchFriendly && 'h-12 text-base px-4',
          !touchFriendly && 'h-10',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Touch-Friendly Password Field Component with visibility toggle
 */
export interface PasswordFieldProps {
  label: string
  name: string
  placeholder?: string
  helpText?: string
  error?: string
  required?: boolean
  touchFriendly?: boolean
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function PasswordField({
  label,
  name,
  placeholder,
  helpText,
  error,
  required = false,
  touchFriendly = true,
  className,
  value,
  onChange,
  onBlur,
  disabled,
}: PasswordFieldProps) {
  const id = React.useId()
  const fieldId = `${id}-${name}`
  const helpId = `${fieldId}-help`
  const errorId = `${fieldId}-error`
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={fieldId}
        className={cn(
          'block',
          touchFriendly && 'text-base',
          error && 'text-red-600 dark:text-red-400'
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id={fieldId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          touchFriendly={touchFriendly}
          aria-describedby={error ? errorId : helpText ? helpId : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            'pr-12',
            error && 'border-red-500 focus-visible:ring-red-500'
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none',
            touchFriendly && 'p-1'
          )}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Touch-Friendly Checkbox Field Component
 */
export interface CheckboxFieldProps {
  label: string
  name: string
  helpText?: string
  error?: string
  touchFriendly?: boolean
  className?: string
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export function CheckboxField({
  label,
  name,
  helpText,
  error,
  touchFriendly = true,
  className,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) {
  const id = React.useId()
  const fieldId = `${id}-${name}`

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'flex items-center gap-3 cursor-pointer',
          touchFriendly && 'min-h-[44px]', // Touch-friendly height
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'rounded border-gray-300 text-blue-600 focus:ring-blue-500',
            touchFriendly && 'h-5 w-5', // Larger checkbox for touch
            !touchFriendly && 'h-4 w-4'
          )}
        />
        <span className={cn(touchFriendly && 'text-base', 'text-sm')}>
          {label}
        </span>
      </label>
      
      {helpText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
          {helpText}
        </p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 ml-8">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Touch-Friendly Textarea Field Component
 */
export interface TextareaFieldProps {
  label: string
  name: string
  placeholder?: string
  helpText?: string
  error?: string
  required?: boolean
  touchFriendly?: boolean
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
  rows?: number
}

export function TextareaField({
  label,
  name,
  placeholder,
  helpText,
  error,
  required = false,
  touchFriendly = true,
  className,
  value,
  onChange,
  onBlur,
  disabled,
  rows = 4,
}: TextareaFieldProps) {
  const id = React.useId()
  const fieldId = `${id}-${name}`
  const helpId = `${fieldId}-help`
  const errorId = `${fieldId}-error`

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={fieldId}
        className={cn(
          'block',
          touchFriendly && 'text-base',
          error && 'text-red-600 dark:text-red-400'
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      
      <textarea
        id={fieldId}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        rows={rows}
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          touchFriendly && 'text-base px-4 py-3',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      />
      
      {helpText && !error && (
        <p id={helpId} className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
