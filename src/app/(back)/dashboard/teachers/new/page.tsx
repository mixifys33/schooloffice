'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, ToastType } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { TeacherFormSteps } from '@/components/teachers/teacher-form-steps'
import { TeacherBulkUpload } from '@/components/teachers/teacher-bulk-upload'
import { TeacherFormState } from '@/types/teacher'

/**
 * Create New Teacher Page
 * Requirements: 9.1-9.5
 * - Step-based form with 5 sections: Identity, Employment, Academic Roles, Access & Permissions, Review & Create
 * - Handle form submission and navigation
 * - NO popups - uses full-page forms
 */

interface ClassItem {
  id: string
  name: string
}

interface SubjectItem {
  id: string
  name: string
  code: string
}

interface StreamItem {
  id: string
  name: string
  classId: string
}

const DEFAULT_DEPARTMENTS = [
  'Sciences',
  'Languages',
  'Mathematics',
  'Humanities',
  'Arts',
  'Physical Education',
  'Primary',
  'Administration',
]

export default function NewTeacherPage() {
  const router = useRouter()
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [streams, setStreams] = useState<StreamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message })
  }

  const hideToast = () => {
    setToast(null)
  }

  const fetchFormData = useCallback(async () => {
    try {
      const [classesRes, subjectsRes, streamsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/subjects'),
        fetch('/api/streams'),
      ])
      
      if (classesRes.ok) {
        const classesResponse = await classesRes.json()
        const classesData = Array.isArray(classesResponse) 
          ? classesResponse 
          : (classesResponse.classes || [])
        setClasses(classesData.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })))
      }
      
      if (subjectsRes.ok) {
        const subjectsResponse = await subjectsRes.json()
        const subjectsData = Array.isArray(subjectsResponse) 
          ? subjectsResponse 
          : (subjectsResponse.subjects || [])
        setSubjects(subjectsData.map((s: { id: string; name: string; code: string }) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        })))
      }
      
      if (streamsRes.ok) {
        const streamsResponse = await streamsRes.json()
        const streamsData = Array.isArray(streamsResponse) 
          ? streamsResponse 
          : (streamsResponse.streams || [])
        setStreams(streamsData.map((s: { id: string; name: string; classId: string }) => ({
          id: s.id,
          name: s.name,
          classId: s.classId,
        })))
      }
    } catch (err) {
      console.error('Error fetching form data:', err)
      setError('Unable to load form data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFormData()
  }, [fetchFormData])


  const handleSubmit = async (
    formState: TeacherFormState,
    action: 'create' | 'create_invite' | 'save_draft'
  ) => {
    setSubmitting(true)
    setError(null)

    try {
      const { identity, employment, academicRoles, accessPermissions } = formState.data

      if (action === 'save_draft') {
        // Save as draft
        const response = await fetch('/api/teachers/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: formState.data,
            currentStep: formState.currentStep,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save draft')
        }

        showToast('success', 'Draft saved successfully!')
        return
      }

      // Create teacher
      const teacherData = {
        // Identity
        firstName: identity.firstName,
        lastName: identity.lastName,
        gender: identity.gender,
        nationalId: identity.nationalId,
        phone: identity.phone,
        email: identity.email,
        dateOfBirth: identity.dateOfBirth,
        photo: identity.photo,
        address: identity.address,
        // Employment
        employmentType: employment.employmentType,
        jobTitle: employment.jobTitle,
        department: employment.department,
        dateOfAppointment: employment.dateOfAppointment,
        // Academic Roles
        assignedSubjects: academicRoles.assignedSubjects,
        assignedClasses: academicRoles.assignedClasses,
        assignedStreams: academicRoles.assignedStreams,
        classTeacherFor: academicRoles.classTeacherFor,
        examinationRoles: academicRoles.examinationRoles,
        // Access & Permissions
        grantSystemAccess: accessPermissions.grantSystemAccess,
        accessLevel: accessPermissions.accessLevel,
        permissions: accessPermissions.permissions,
        channelConfig: accessPermissions.channelConfig,
        // Send invite flag
        sendLoginInvite: action === 'create_invite',
      }

      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create teacher')
      }

      const result = await response.json()

      let successMessage = 'Teacher created successfully!'
      if (action === 'create_invite') {
        if (result.inviteSent) {
          successMessage = `Teacher created and login invite sent to ${identity.email}!`
        } else if (result.warning) {
          showToast('warning', result.warning)
          setTimeout(() => {
            router.push('/dashboard/teachers')
          }, 2000)
          return
        } else {
          successMessage = 'Teacher created and login invite sent!'
        }
      }
      
      showToast('success', successMessage)
      
      // Redirect after showing toast
      setTimeout(() => {
        router.push('/dashboard/teachers')
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create teacher'
      setError(message)
      showToast('error', message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/teachers')
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Add New Teacher</h1>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add New Teacher</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'single' ? 'Create a new teacher record' : 'Upload multiple teachers at once'}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('single')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Single
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('bulk')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto">
          <AlertBanner
            type="danger"
            message={error}
            dismissible
          />
        </div>
      )}

      {/* Single Teacher Form */}
      {mode === 'single' && (
        <TeacherFormSteps
          mode="create"
          subjects={subjects}
          classes={classes}
          streams={streams}
          departments={DEFAULT_DEPARTMENTS}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitting}
        />
      )}

      {/* Bulk Upload */}
      {mode === 'bulk' && (
        <div className="max-w-4xl mx-auto">
          <TeacherBulkUpload
            onUploadComplete={(result) => {
              if (result.success > 0) {
                showToast('success', `Successfully created ${result.success} teachers`)
              }
              if (result.failed > 0) {
                showToast('warning', `${result.failed} teachers failed to upload`)
              }
            }}
            onCancel={handleCancel}
          />
        </div>
      )}

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
