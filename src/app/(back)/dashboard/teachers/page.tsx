'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { TeacherList } from '@/components/teachers/teacher-list'
import { TeacherListItem, TeacherFilters } from '@/types/teacher'
import { canManageTeachers } from '@/lib/rbac'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Role } from '@/types/enums'

/**
 * Teachers Management Page
 * Requirements: 9.6, 10.4-10.6
 * - Display teacher list with columns: name, email, phone, type, title, department, status, access
 * - Filtering by status, department, employment type
 * - Search functionality
 * - "New Teacher" button (only for authorized roles)
 * - Hide/disable actions for unauthorized roles
 */

export default function TeachersPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [teachers, setTeachers] = useState<TeacherListItem[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [filters, setFilters] = useState<TeacherFilters>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check if user can manage teachers (Requirements 10.4-10.6)
  const userRole = session?.user?.activeRole ?? session?.user?.role
  const canEdit = canManageTeachers(userRole ?? '')

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.status) params.set('status', filters.status)
      if (filters.department) params.set('department', filters.department)
      if (filters.employmentType) params.set('employmentType', filters.employmentType)
      if (filters.searchTerm) params.set('search', filters.searchTerm)
      
      const response = await fetch(`/api/teachers?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch teachers')
      }

      const data = await response.json()
      const teacherList = Array.isArray(data) ? data : (data.teachers || [])
      setTeachers(teacherList)
      setFilteredTeachers(teacherList)
      
      // Extract unique departments for filter
      const uniqueDepts = [...new Set(teacherList.map((t: TeacherListItem) => t.department).filter(Boolean))] as string[]
      setDepartments(uniqueDepts)
      
      setError(null)
    } catch (err) {
      console.error('Error fetching teachers:', err)
      setError('Unable to load teachers. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, router])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const handleFilterChange = useCallback((newFilters: TeacherFilters) => {
    setFilters(newFilters)
  }, [])

  const handleSelectTeacher = useCallback((teacher: TeacherListItem) => {
    router.push(`/dashboard/teachers/${teacher.id}`)
  }, [router])

  const handleEditTeacher = useCallback((teacher: TeacherListItem) => {
    if (canEdit) {
      router.push(`/dashboard/teachers/${teacher.id}/edit`)
    }
  }, [router, canEdit])

  const handleAddTeacher = () => {
    if (canEdit) {
      router.push('/dashboard/teachers/new')
    }
  }

  const handleDeleteClick = useCallback((teacher: TeacherListItem) => {
    setTeacherToDelete(teacher)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/teachers/${teacherToDelete.id}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete teacher')
      }

      setSuccessMessage(data.message || 'Teacher deleted successfully')
      setDeleteDialogOpen(false)
      setTeacherToDelete(null)
      
      // Refresh the teacher list
      await fetchTeachers()
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      console.error('Error deleting teacher:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete teacher')
      setDeleteDialogOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  // Check if user can delete (only admins)
  const canDelete = userRole === Role.SCHOOL_ADMIN || userRole === Role.SUPER_ADMIN


  if (loading && teachers.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Teachers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage teacher records and assignments
            </p>
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAddTeacher} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Teacher</span>
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchTeachers }}
        />
      )}

      {/* Success Banner */}
      {successMessage && (
        <AlertBanner
          type="success"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* Teacher List with Filters */}
      <TeacherList
        teachers={filteredTeachers}
        loading={loading}
        departments={departments}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSelect={handleSelectTeacher}
        onEdit={canEdit ? handleEditTeacher : undefined}
        onDelete={canDelete ? handleDeleteClick : undefined}
        deletingTeacherId={deleting ? teacherToDelete?.id : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Teacher"
        description={
          teacherToDelete
            ? `Are you sure you want to permanently delete ${teacherToDelete.firstName} ${teacherToDelete.lastName}? This will remove all their data including assignments, documents, and history. This action cannot be undone.`
            : ''
        }
        confirmText="Delete Permanently"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        loading={deleting}
      />
    </div>
  )
}
