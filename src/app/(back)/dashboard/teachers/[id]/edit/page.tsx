'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, ToastType } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { TeacherFormSteps } from '@/components/teachers/teacher-form-steps'
import { 
  TeacherFormState, 
  TeacherFormStep,
  Teacher,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'

/**
 * Edit Teacher Page
 * Requirements: 1.3, 9.1, 9.5
 * - Integrate teacher form steps in edit mode
 * - Pre-populate with existing data
 * - Handle form submission and navigation
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

export default function EditTeacherPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const teacherId = params.id as string
  const initialTab = searchParams.get('tab')

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [streams, setStreams] = useState<StreamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialFormState, setInitialFormState] = useState<Partial<TeacherFormState> | null>(null)

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message })
  }

  const hideToast = () => {
    setToast(null)
  }

  const fetchTeacher = useCallback(async () => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        if (response.status === 404) {
          throw new Error('Teacher not found')
        }
        throw new Error('Failed to fetch teacher')
      }
      const data: Teacher = await response.json()
      setTeacher(data)
      
      // Convert teacher data to form state
      const formState: Partial<TeacherFormState> = {
        currentStep: initialTab === 'access' 
          ? TeacherFormStep.ACCESS_PERMISSIONS 
          : TeacherFormStep.IDENTITY,
        isDraft: false,
        data: {
          identity: {
            firstName: data.firstName,
            lastName: data.lastName,
            gender: data.gender,
            nationalId: data.nationalId,
            phone: data.phone,
            email: data.email,
            dateOfBirth: data.dateOfBirth,
            photo: data.photo,
            address: data.address,
          },
          employment: {
            employmentType: data.employmentType,
            jobTitle: data.jobTitle,
            department: data.department,
            dateOfAppointment: data.dateOfAppointment,
          },
          academicRoles: {
            assignedSubjects: data.assignedSubjects || [],
            assignedClasses: data.assignedClasses || [],
            assignedStreams: data.assignedStreams || [],
            classTeacherFor: data.classTeacherFor || [],
            examinationRoles: data.examinationRoles || [],
          },
          accessPermissions: {
            grantSystemAccess: data.hasSystemAccess,
            accessLevel: data.accessLevel,
            permissions: data.permissions || DEFAULT_TEACHER_PERMISSIONS,
            channelConfig: data.channelConfig || DEFAULT_CHANNEL_CONFIG,
          },
        },
      }
      setInitialFormState(formState)
    } catch (err) {
      console.error('Error fetching teacher:', err)
      setError(err instanceof Error ? err.message : 'Unable to load teacher')
    }
  }, [teacherId, router, initialTab])


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
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([fetchTeacher(), fetchFormData()])
      setLoading(false)
    }
    loadData()
  }, [fetchTeacher, fetchFormData])

  const handleSubmit = async (
    formState: TeacherFormState,
    action: 'create' | 'create_invite' | 'save_draft'
  ) => {
    setSubmitting(true)
    setError(null)

    try {
      const { identity, employment, academicRoles, accessPermissions } = formState.data

      if (action === 'save_draft') {
        showToast('info', 'Draft saving is not available in edit mode')
        setSubmitting(false)
        return
      }

      // Update teacher
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
      }

      const response = await fetch(`/api/teachers/${teacherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update teacher')
      }

      // Handle access grant if needed
      if (action === 'create_invite' && accessPermissions.grantSystemAccess && !teacher?.hasSystemAccess) {
        const accessResponse = await fetch(`/api/teachers/${teacherId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessLevel: accessPermissions.accessLevel,
            permissions: accessPermissions.permissions,
            channelConfig: accessPermissions.channelConfig,
            sendInvite: true,
          }),
        })

        if (!accessResponse.ok) {
          showToast('warning', 'Teacher updated but failed to send login invite')
        }
      }

      const successMessage = action === 'create_invite'
        ? 'Teacher updated and login invite sent!'
        : 'Teacher updated successfully!'
      
      showToast('success', successMessage)
      
      // Redirect after showing toast
      setTimeout(() => {
        router.push(`/dashboard/teachers/${teacherId}`)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update teacher'
      setError(message)
      showToast('error', message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/dashboard/teachers/${teacherId}`)
  }

  if (loading || !initialFormState) {
    return (
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Teacher</h1>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error && !teacher) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Teacher</h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Go Back', onClick: () => router.back() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 max-w-4xl mx-auto">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Teacher</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {teacher?.firstName} {teacher?.lastName}
          </p>
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

      {/* Step-based Form */}
      <TeacherFormSteps
        mode="edit"
        teacherId={teacherId}
        initialState={initialFormState}
        subjects={subjects}
        classes={classes}
        streams={streams}
        departments={DEFAULT_DEPARTMENTS}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={submitting}
      />

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
