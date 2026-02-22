'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, User, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'

/** 
 * Assign Teacher to Class Page
 * Requirements: 4.5 - Update class-teacher assignment via PUT to /api/classes/{id}
 */

interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string | null
  assignedClasses: {
    id: string
    name: string
  }[]
}

interface ClassInfo {
  id: string
  name: string
  classTeacher: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export default function AssignTeacherPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch class info and teachers in parallel
      const [classResponse, teachersResponse] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch('/api/teachers'),
      ])

      if (!classResponse.ok) {
        throw new Error('Failed to fetch class details')
      }

      if (!teachersResponse.ok) {
        throw new Error('Failed to fetch teachers')
      }

      const classData = await classResponse.json()
      const teachersData = await teachersResponse.json()

      setClassInfo({
        id: classData.id,
        name: classData.name,
        classTeacher: classData.classTeacher,
      })
      setTeachers(teachersData)
      
      // Pre-select current class teacher if exists
      if (classData.classTeacher) {
        setSelectedTeacherId(classData.classTeacher.id)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    if (classId) {
      fetchData()
    }
  }, [classId, fetchData])

  const handleBack = () => {
    router.push(`/dashboard/classes/${classId}`)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classTeacherId: selectedTeacherId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to assign teacher')
      }

      showToast('success', 'Class teacher assigned successfully!')
      
      setTimeout(() => {
        router.push(`/dashboard/classes/${classId}`)
      }, 1500)
    } catch (err) {
      console.error('Error assigning teacher:', err)
      setError(err instanceof Error ? err.message : 'Failed to assign teacher')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTeacher = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classTeacherId: null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove teacher')
      }

      showToast('success', 'Class teacher removed successfully!')
      setSelectedTeacherId(null)
      
      setTimeout(() => {
        router.push(`/dashboard/classes/${classId}`)
      }, 1500)
    } catch (err) {
      console.error('Error removing teacher:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove teacher')
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
        <SkeletonLoader variant="card" count={2} />
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
          <h1 className="text-2xl font-bold">Assign Class Teacher</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a teacher for {classInfo?.name || 'class'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          dismissible
        />
      )}

      {/* Current Assignment */}
      {classInfo?.classTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Class Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--info-light)] dark:bg-[var(--info-dark)] flex items-center justify-center">
                  <User className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
                </div>
                <div>
                  <p className="font-medium">
                    {classInfo.classTeacher.firstName} {classInfo.classTeacher.lastName}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveTeacher}
                disabled={submitting}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Teacher</CardTitle>
          <CardDescription>
            Choose a teacher to assign as the class teacher for {classInfo?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              No teachers available. Add teachers to your school first.
            </p>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => {
                const isSelected = selectedTeacherId === teacher.id
                const isCurrentTeacher = classInfo?.classTeacher?.id === teacher.id
                
                return (
                  <div
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors',
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20'
                        : 'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-10 w-10 rounded-full flex items-center justify-center',
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-[var(--white-pure)]'
                          : 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]'
                      )}>
                        {isSelected ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        {teacher.email && (
                          <p className="text-sm text-muted-foreground">
                            {teacher.email}
                          </p>
                        )}
                        {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Currently assigned to: {teacher.assignedClasses.map(c => c.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCurrentTeacher && (
                      <span className="text-xs bg-[var(--info-light)] text-[var(--accent-hover)] dark:bg-[var(--info-dark)] dark:text-[var(--info)] px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedTeacherId || selectedTeacherId === classInfo?.classTeacher?.id}
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
                  Assign Teacher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
