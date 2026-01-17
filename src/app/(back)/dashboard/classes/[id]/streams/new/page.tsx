'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * New Stream Form Page
 * Requirements: 4.4 - Create stream via POST to /api/streams
 */

interface ClassInfo {
  id: string
  name: string
}

interface FormErrors {
  name?: string
}

export default function NewStreamPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamName, setStreamName] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClassInfo() {
      try {
        const response = await fetch(`/api/classes/${classId}`)
        if (response.ok) {
          const data = await response.json()
          setClassInfo({ id: data.id, name: data.name })
        }
      } catch (err) {
        console.error('Error fetching class info:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classId) {
      fetchClassInfo()
    }
  }, [classId])

  const handleBack = () => {
    router.push(`/dashboard/classes/${classId}`)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!streamName.trim()) {
      newErrors.name = 'Stream name is required'
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

      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          name: streamName.trim(),
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
          setServerError('Failed to create stream. Please try again.')
        }
        return
      }

      // Success - show toast and redirect
      showToast('success', 'Stream created successfully!')
      
      setTimeout(() => {
        router.push(`/dashboard/classes/${classId}`)
      }, 1500)
    } catch (err) {
      console.error('Error creating stream:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
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
          <h1 className="text-2xl font-bold">Add New Stream</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a stream to {classInfo?.name || 'class'}
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
          <CardTitle>Stream Details</CardTitle>
          <CardDescription>
            Enter the name for the new stream. Common examples: A, B, C or East, West, North.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Stream Name"
              name="name"
              placeholder="e.g., A, B, East, West"
              value={streamName}
              onChange={(e) => {
                setStreamName(e.target.value)
                if (errors.name) {
                  setErrors({})
                }
              }}
              error={errors.name}
              required
              helpText="Enter a unique name for this stream within the class"
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
                    Create Stream
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
