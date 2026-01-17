'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, SelectField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * New Class Form Page
 * Requirements: 4.3 - Validate class name uniqueness and create via POST to /api/classes
 */

// Predefined class levels for Uganda education system
const CLASS_LEVELS = [
  { value: '1', label: 'P1 (Primary 1)' },
  { value: '2', label: 'P2 (Primary 2)' },
  { value: '3', label: 'P3 (Primary 3)' },
  { value: '4', label: 'P4 (Primary 4)' },
  { value: '5', label: 'P5 (Primary 5)' },
  { value: '6', label: 'P6 (Primary 6)' },
  { value: '7', label: 'P7 (Primary 7)' },
  { value: '8', label: 'S1 (Senior 1)' },
  { value: '9', label: 'S2 (Senior 2)' },
  { value: '10', label: 'S3 (Senior 3)' },
  { value: '11', label: 'S4 (Senior 4)' },
  { value: '12', label: 'S5 (Senior 5)' },
  { value: '13', label: 'S6 (Senior 6)' },
]

interface FormData {
  name: string
  level: string
}

interface FormErrors {
  name?: string
  level?: string
}

export default function NewClassPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    level: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleBack = () => {
    router.push('/dashboard/classes')
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required'
    }

    if (!formData.level) {
      newErrors.level = 'Class level is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          level: parseInt(formData.level, 10),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors (e.g., duplicate name)
        if (data.error) {
          if (data.error.includes('already exists')) {
            setErrors({ name: data.error })
          } else {
            setServerError(data.error)
          }
        } else {
          setServerError('Failed to create class. Please try again.')
        }
        return
      }

      // Success - show toast and redirect
      showToast('success', 'Class created successfully!')
      
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        router.push('/dashboard/classes')
      }, 1500)
    } catch (err) {
      console.error('Error creating class:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={hideToast}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Class</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new class for your school
          </p>
        </div>
      </div>

      {/* Server Error */}
      {serverError && (
        <AlertBanner
          type="danger"
          message={serverError}
          dismissible
        />
      )}

      {/* Form */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>
            Enter the details for the new class. Class names must be unique within your school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Class Name"
              name="name"
              placeholder="e.g., P1, S1, Grade 1"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={errors.name}
              required
              helpText="Enter a unique name for this class"
            />

            <SelectField
              label="Class Level"
              name="level"
              options={CLASS_LEVELS}
              placeholder="Select a level"
              value={formData.level}
              onChange={handleInputChange('level')}
              error={errors.level}
              required
              helpText="Select the academic level for this class"
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Class
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
