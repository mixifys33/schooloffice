'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField, SelectField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Edit Class Page
 * Requirements: 4.3 - Validate class name uniqueness
 */

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

export default function EditClassPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    level: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const fetchClassData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/classes/${classId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch class details')
      }

      const data = await response.json()
      setFormData({
        name: data.name,
        level: data.level.toString(),
      })
    } catch (err) {
      console.error('Error fetching class:', err)
      setServerError('Failed to load class details')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    if (classId) {
      fetchClassData()
    }
  }, [classId, fetchClassData])

  const handleBack = () => {
    router.push(`/dashboard/classes/${classId}`)
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

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
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
        if (data.error) {
          if (data.error.includes('already exists')) {
            setErrors({ name: data.error })
          } else {
            setServerError(data.error)
          }
        } else {
          setServerError('Failed to update class. Please try again.')
        }
        return
      }

      showToast('success', 'Class updated successfully!')
      
      setTimeout(() => {
        router.push(`/dashboard/classes/${classId}`)
      }, 1500)
    } catch (err) {
      console.error('Error updating class:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SkeletonLoader variant="card" count={1} />
      </div>
    )
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
          <h1 className="text-2xl font-bold">Edit Class</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update class details
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
            Update the class information. Class names must be unique within your school.
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
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
