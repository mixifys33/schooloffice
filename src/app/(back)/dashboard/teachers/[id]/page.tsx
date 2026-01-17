'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, ToastType } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { TeacherDetailView } from '@/components/teachers/teacher-detail-view'
import { Teacher, TeacherDocument, TeacherPerformanceMetrics } from '@/types/teacher'
import { 
  canManageTeachers, 
  canViewTeacherPerformance, 
  canViewTeacherDocuments 
} from '@/lib/rbac'

/**
 * Teacher Detail Page
 * Requirements: 1.3, 2.5-2.9, 6.6, 7.6, 10.4-10.6
 * - Display full teacher profile using TeacherDetailView component
 * - Add edit and status management actions (for authorized roles)
 * - Display performance metrics (for authorized roles)
 * - Display documents (for authorized roles)
 * - Hide/disable actions for unauthorized roles
 */

interface ClassItem {
  id: string
  name: string
}

interface SubjectItem {
  id: string
  name: string
}

interface StreamItem {
  id: string
  name: string
}

export default function TeacherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const teacherId = params.id as string

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [documents, setDocuments] = useState<TeacherDocument[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<TeacherPerformanceMetrics | null>(null)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [streams, setStreams] = useState<StreamItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  
  // Authorization flags based on user role (Requirements 10.4-10.6)
  const userRole = session?.user?.activeRole || session?.user?.role || ''
  const canViewPerformance = canViewTeacherPerformance(userRole)
  const canViewDocuments = canViewTeacherDocuments(userRole)
  const canEdit = canManageTeachers(userRole)

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
      const data = await response.json()
      setTeacher(data)
    } catch (err) {
      console.error('Error fetching teacher:', err)
      setError(err instanceof Error ? err.message : 'Unable to load teacher')
    }
  }, [teacherId, router])


  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    }
  }, [teacherId])

  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/teachers/${teacherId}/performance`)
      if (response.ok) {
        const data = await response.json()
        setPerformanceMetrics(data)
      }
    } catch (err) {
      console.error('Error fetching performance metrics:', err)
    }
  }, [teacherId])

  const fetchReferenceData = useCallback(async () => {
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
        const subjectsData = await subjectsRes.json()
        setSubjects(subjectsData.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        })))
      }
      
      if (streamsRes.ok) {
        const streamsData = await streamsRes.json()
        setStreams(streamsData.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        })))
      }
    } catch (err) {
      console.error('Error fetching reference data:', err)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([
        fetchTeacher(),
        fetchDocuments(),
        fetchPerformanceMetrics(),
        fetchReferenceData(),
      ])
      setLoading(false)
    }
    loadData()
  }, [fetchTeacher, fetchDocuments, fetchPerformanceMetrics, fetchReferenceData])

  const handleEdit = () => {
    router.push(`/dashboard/teachers/${teacherId}/edit`)
  }

  const handleStatusChange = async () => {
    // Navigate to status change modal/page or show inline
    // For now, we'll show a simple prompt
    const newStatus = window.prompt(
      'Enter new status (ACTIVE, ON_LEAVE, SUSPENDED, LEFT):',
      teacher?.employmentStatus
    )
    
    if (newStatus && newStatus !== teacher?.employmentStatus) {
      try {
        const response = await fetch(`/api/teachers/${teacherId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update status')
        }
        
        showToast('success', 'Status updated successfully')
        fetchTeacher()
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to update status')
      }
    }
  }

  const handleGrantAccess = async () => {
    router.push(`/dashboard/teachers/${teacherId}/edit?tab=access`)
  }

  const handleRevokeAccess = async () => {
    if (!window.confirm('Are you sure you want to revoke system access for this teacher?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/teachers/${teacherId}/access`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to revoke access')
      }
      
      showToast('success', 'System access revoked')
      fetchTeacher()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to revoke access')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Teacher Details</h1>
        </div>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Teacher Details</h1>
        </div>
        <AlertBanner
          type="danger"
          message={error || 'Teacher not found'}
          action={{ label: 'Go Back', onClick: () => router.back() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to Teachers</span>
      </div>

      {/* Teacher Detail View */}
      <TeacherDetailView
        teacher={teacher}
        documents={documents}
        performanceMetrics={performanceMetrics || undefined}
        subjects={subjects}
        classes={classes}
        streams={streams}
        canViewPerformance={canViewPerformance}
        canViewDocuments={canViewDocuments}
        canEdit={canEdit}
        onEdit={handleEdit}
        onStatusChange={handleStatusChange}
        onGrantAccess={handleGrantAccess}
        onRevokeAccess={handleRevokeAccess}
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
