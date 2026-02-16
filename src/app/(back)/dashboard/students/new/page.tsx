'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, SelectField } from '@/components/ui/form-field'
import { ServerErrorBanner } from '@/components/ui/error-banner'
import { Toast, ToastType } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Student Enrollment Form
 * Requirements: 3.2, 3.3 - Create student with default payment status NOT PAID
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

interface ClassWithStreams {
  id: string
  name: string
  level: number
  streams: {
    id: string
    name: string
  }[]
}

interface OptionalSubject {
  id: string
  name: string
  code: string
}

interface FormData {
  firstName: string
  lastName: string
  admissionNumber: string
  gender: string
  dateOfBirth: string
  classId: string
  streamId: string
  parentName: string
  parentPhone: string
  parentEmail: string
  optionalSubjectIds: string[] // New field for optional subjects
}

interface FormErrors {
  firstName?: string
  lastName?: string
  admissionNumber?: string
  classId?: string
  parentPhone?: string
  parentEmail?: string
}

const STORAGE_KEY = 'student_enrollment_draft'

// Helper to get saved form data from localStorage
const getSavedFormData = (): FormData | null => {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Error reading saved form data:', e)
  }
  return null
}

// Helper to save form data to localStorage
const saveFormData = (data: FormData) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Error saving form data:', e)
  }
}

// Helper to clear saved form data
const clearSavedFormData = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Error clearing saved form data:', e)
  }
}

const defaultFormData: FormData = {
  firstName: '',
  lastName: '',
  admissionNumber: '',
  gender: '',
  dateOfBirth: '',
  classId: '',
  streamId: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  optionalSubjectIds: [],
}

export default function NewStudentPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [classes, setClasses] = useState<ClassWithStreams[]>([])
  const [optionalSubjects, setOptionalSubjects] = useState<OptionalSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  
  // Class creation state
  const [showClassForm, setShowClassForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)
  
  // Stream creation state
  const [showStreamForm, setShowStreamForm] = useState(false)
  const [newStreamName, setNewStreamName] = useState('')
  const [creatingStream, setCreatingStream] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [errors, setErrors] = useState<FormErrors>({})

  // Load saved form data on mount
  useEffect(() => {
    const saved = getSavedFormData()
    if (saved) {
      setFormData(saved)
      setHasDraft(true)
    }
  }, [])

  // Save form data whenever it changes
  useEffect(() => {
    // Only save if form has some data
    const hasData = Object.values(formData).some(v => v !== '')
    if (hasData) {
      saveFormData(formData)
    }
  }, [formData])

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message })
  }

  const hideToast = () => {
    setToast(null)
  }

  useEffect(() => {
    fetchClasses()
    fetchOptionalSubjects()
  }, [])

  async function fetchClasses() {
    try {
      setLoading(true)
      const response = await fetch('/api/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Unable to load classes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchOptionalSubjects() {
    try {
      const response = await fetch('/api/subjects?active=true')
      if (!response.ok) throw new Error('Failed to fetch subjects')
      const data = await response.json()
      // Filter only optional subjects (isCompulsory: false)
      const optional = data.filter((subject: any) => subject.isCompulsory === false)
      setOptionalSubjects(optional)
    } catch (err) {
      console.error('Error fetching optional subjects:', err)
    }
  }

  // Create a new class inline
  const handleCreateClass = async () => {
    if (!newClassName.trim() || !newClassLevel) {
      setClassError('Class name and level are required')
      return
    }

    setCreatingClass(true)
    setClassError(null)

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          level: parseInt(newClassLevel, 10),
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create class'
        try {
          const data = await response.json()
          errorMessage = data.error || errorMessage
        } catch {
          // If JSON parsing fails, use default error message
        }
        setClassError(errorMessage)
        return
      }

      const data = await response.json()

      // Refresh classes list and select the new class
      await fetchClasses()
      setFormData(prev => ({ ...prev, classId: data.id, streamId: '' }))
      setShowClassForm(false)
      setNewClassName('')
      setNewClassLevel('')
      showToast('success', 'Class created successfully!')
    } catch (err) {
      console.error('Error creating class:', err)
      setClassError('Failed to create class. Please try again.')
    } finally {
      setCreatingClass(false)
    }
  }

  // Create a new stream inline
  const handleCreateStream = async () => {
    if (!newStreamName.trim()) {
      setStreamError('Stream name is required')
      return
    }

    if (!formData.classId) {
      setStreamError('Please select a class first')
      return
    }

    setCreatingStream(true)
    setStreamError(null)

    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: formData.classId,
          name: newStreamName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStreamError(data.error || 'Failed to create stream')
        return
      }

      // Refresh classes list and select the new stream
      await fetchClasses()
      setFormData(prev => ({ ...prev, streamId: data.id }))
      setShowStreamForm(false)
      setNewStreamName('')
      showToast('success', 'Stream created successfully!')
    } catch (err) {
      console.error('Error creating stream:', err)
      setStreamError('Failed to create stream. Please try again.')
    } finally {
      setCreatingStream(false)
    }
  }

  const selectedClass = classes.find((c) => c.id === formData.classId)
  const streams = selectedClass?.streams || []

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      // Reset stream when class changes
      if (name === 'classId') {
        newData.streamId = ''
      }
      return newData
    })
    // Clear error when field is modified
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.admissionNumber.trim()) {
      newErrors.admissionNumber = 'LIN is required'
    }
    if (!formData.classId) {
      newErrors.classId = 'Class is required'
    }
    if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      newErrors.parentEmail = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          admissionNumber: formData.admissionNumber.trim(),
          gender: formData.gender || null,
          dateOfBirth: formData.dateOfBirth || null,
          classId: formData.classId,
          streamId: formData.streamId || null,
          parentName: formData.parentName.trim() || null,
          parentPhone: formData.parentPhone.trim() || null,
          parentEmail: formData.parentEmail.trim() || null,
          optionalSubjectIds: formData.optionalSubjectIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create student')
      }

      // Clear saved draft on successful enrollment
      clearSavedFormData()
      showToast('success', 'Student enrolled successfully!')
      
      // Redirect after showing toast
      setTimeout(() => {
        router.push('/dashboard/students')
      }, 1500)
    } catch (err) {
      // Requirements: 21.3 - Display error message describing failure and suggesting retry
      setError(err)
      showToast('error', err instanceof Error ? err.message : 'Failed to create student. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Retry handler for server errors
  // Requirements: 21.3 - Display error message describing failure and suggesting retry
  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          admissionNumber: formData.admissionNumber.trim(),
          gender: formData.gender || null,
          dateOfBirth: formData.dateOfBirth || null,
          classId: formData.classId,
          streamId: formData.streamId || null,
          parentName: formData.parentName.trim() || null,
          parentPhone: formData.parentPhone.trim() || null,
          parentEmail: formData.parentEmail.trim() || null,
          optionalSubjectIds: formData.optionalSubjectIds, // Include optional subjects
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create student')
      }

      // Clear saved draft on successful enrollment
      clearSavedFormData()
      showToast('success', 'Student enrolled successfully!')
      setTimeout(() => {
        router.push('/dashboard/students')
      }, 1500)
    } catch (err) {
      setError(err)
    } finally {
      setIsRetrying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Enroll New Student</h1>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Enroll New Student</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new student to your school
          </p>
        </div>
        {hasDraft && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFormData(defaultFormData)
              clearSavedFormData()
              setHasDraft(false)
              setErrors({})
              showToast('info', 'Form cleared')
            }}
            className="text-muted-foreground"
          >
            Clear Form
          </Button>
        )}
      </div>

      {/* Draft Restored Notice */}
      {hasDraft && (
        <div className="rounded-lg border border-[var(--info-light)] bg-[var(--info-light)] dark:bg-[var(--info-dark)] dark:border-[var(--info-dark)] p-3">
          <p className="text-sm text-[var(--info-dark)] dark:text-[var(--info)]">
            Your previous draft has been restored. Continue where you left off or clear the form to start fresh.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <ServerErrorBanner
          error={error}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Information */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Student Information</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              required
              placeholder="Enter first name"
            />
            <FormField
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              required
              placeholder="Enter last name"
            />
          </div>

          <FormField
            label="LIN (Learner Identification Number)"
            name="admissionNumber"
            value={formData.admissionNumber}
            onChange={handleChange}
            error={errors.admissionNumber}
            required
            placeholder="e.g., LIN/2024/001"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              placeholder="Select gender"
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
              ]}
            />
            <FormField
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
            />
          </div>

          {/* Class Selection with Inline Creation */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SelectField
                  label="Class"
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  error={errors.classId}
                  required
                  placeholder={classes.length === 0 ? 'No classes available' : 'Select class'}
                  options={classes.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowClassForm(!showClassForm)}
                title={showClassForm ? 'Cancel' : 'Add new class'}
              >
                {showClassForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Inline Class Creation Form */}
            {showClassForm && (
              <div className="rounded-lg border border-dashed border-[var(--info)] bg-[var(--info-light)] dark:bg-[var(--info-dark)] dark:border-[var(--info-dark)] p-4 space-y-3">
                <p className="text-sm font-medium text-[var(--info-dark)] dark:text-[var(--info)]">Create New Class</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Class Name"
                    name="newClassName"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g., P1, S1"
                  />
                  <SelectField
                    label="Class Level"
                    name="newClassLevel"
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    placeholder="Select level"
                    options={CLASS_LEVELS}
                  />
                </div>
                {classError && (
                  <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)]">{classError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateClass}
                    disabled={creatingClass}
                  >
                    {creatingClass ? 'Creating...' : 'Create Class'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowClassForm(false)
                      setNewClassName('')
                      setNewClassLevel('')
                      setClassError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Stream Selection with Inline Creation */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SelectField
                  label="Stream"
                  name="streamId"
                  value={formData.streamId}
                  onChange={handleChange}
                  placeholder={!formData.classId ? 'Select class first' : streams.length === 0 ? 'No streams available' : 'Select stream (optional)'}
                  disabled={!formData.classId}
                  options={streams.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowStreamForm(!showStreamForm)}
                disabled={!formData.classId}
                title={showStreamForm ? 'Cancel' : 'Add new stream'}
              >
                {showStreamForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {/* Inline Stream Creation Form */}
            {showStreamForm && formData.classId && (
              <div className="rounded-lg border border-dashed border-[var(--success)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)] p-4 space-y-3">
                <p className="text-sm font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Create New Stream for {selectedClass?.name}
                </p>
                <FormField
                  label="Stream Name"
                  name="newStreamName"
                  value={newStreamName}
                  onChange={(e) => setNewStreamName(e.target.value)}
                  placeholder="e.g., A, B, East, West"
                />
                {streamError && (
                  <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)]">{streamError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateStream}
                    disabled={creatingStream}
                  >
                    {creatingStream ? 'Creating...' : 'Create Stream'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowStreamForm(false)
                      setNewStreamName('')
                      setStreamError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optional Subjects Section */}
        {optionalSubjects.length > 0 && (
          <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Optional Subjects</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select optional subjects for this student (if applicable)
              </p>
            </div>
            
            <div className="space-y-2">
              {optionalSubjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.optionalSubjectIds.includes(subject.id)}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormData((prev) => ({
                        ...prev,
                        optionalSubjectIds: checked
                          ? [...prev.optionalSubjectIds, subject.id]
                          : prev.optionalSubjectIds.filter((id) => id !== subject.id),
                      }))
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{subject.name}</div>
                    <div className="text-sm text-muted-foreground">{subject.code}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Parent/Guardian Information */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Parent/Guardian Information</h2>
          
          <FormField
            label="Guardian Name"
            name="parentName"
            value={formData.parentName}
            onChange={handleChange}
            placeholder="Enter parent/guardian name"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Phone Number"
              name="parentPhone"
              type="tel"
              value={formData.parentPhone}
              onChange={handleChange}
              error={errors.parentPhone}
              placeholder="e.g., +256700000000"
            />
            <FormField
              label="Email Address"
              name="parentEmail"
              type="email"
              value={formData.parentEmail}
              onChange={handleChange}
              error={errors.parentEmail}
              placeholder="parent@example.com"
            />
          </div>
        </div>

        {/* Payment Status Notice */}
        <div className="rounded-lg border border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)] p-4">
          <p className="text-sm text-[var(--warning-dark)] dark:text-[var(--warning)]">
            <strong>Note:</strong> New students are enrolled with payment status set to{' '}
            <span className="font-semibold">NOT PAID</span> by default. Update payment status
            in the Fees section after receiving payment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Enrolling...' : 'Enroll Student'}
          </Button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={hideToast}
          />
        </div>
      )}
    </div>
  )
}
