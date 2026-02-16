/**
 * Accessible Form Components
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6
 * - Provide proper form labels and error messages
 * - Implement keyboard navigation
 * - Support screen readers with ARIA attributes
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export interface AccessibleFormFieldProps {
  id: string
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactNode
}

export function AccessibleFormField({
  id,
  label,
  error,
  required,
  description,
  children
}: AccessibleFormFieldProps) {
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-destructive')}>
        {label}
      </Label>
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div>
        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-invalid': error ? 'true' : 'false',
          'aria-describedby': cn(
            description && descriptionId,
            error && errorId
          ),
          'aria-required': required
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}