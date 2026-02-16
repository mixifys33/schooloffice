'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  User, 
  BookOpen, 
  Edit2,
  Layers,
  UserCheck,
  X,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

/**
 * Class Detail Page
 * Requirements: 4.2 - Display assigned class teacher and subject teachers
 */

interface StreamDetail {
  id: string
  name: string
  studentCount: number
}

interface TeacherInfo {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

interface SubjectTeacher {
  staffId: string
  firstName: string
  lastName: string
  subjects: {
    id: string
    name: string
    code: string
  }[]
}

interface ClassDetail {
  id: string
  name: string
  level: number
  levelType?: 'O_LEVEL' | 'A_LEVEL' | null
  streams: StreamDetail[]
  classTeacher: TeacherInfo | null
  subjectTeachers: SubjectTeacher[]
  studentCount: number
  assignedSubjects?: {
    id: string
    subjectId: string
    subjectName: string
    subjectCode: string
    isCompulsory: boolean
  }[]
}

export default function ClassDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  
  const [classData, setClassData] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSubjectDialog, setShowSubjectDialog] = useState(false)
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [savingSubjects, setSavingSubjects] = useState(false)

  const fetchClassDetails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/classes/${classId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Class not found')
        }
        throw new Error('Failed to fetch class details')
      }

      const data: ClassDetail = await response.json()
      setClassData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching class details:', err)
      setError(err instanceof Error ? err.message : 'Unable to load class details.')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    if (classId) {
      fetchClassDetails()
    }
  }, [classId, fetchClassDetails])

  const handleBack = () => {
    router.push('/dashboard/classes')
  }

  const handleEditClass = () => {
    router.push(`/dashboard/classes/${classId}/edit`)
  }

  const handleAddStream = () => {
    router.push(`/dashboard/classes/${classId}/streams/new`)
  }

  const handleAssignTeacher = () => {
    router.push(`/dashboard/classes/${classId}/assign-teacher`)
  }

  const fetchAvailableSubjects = async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const subjects = await response.json()
        // Filter only O-Level subjects
        const oLevelSubjects = subjects.filter((s: any) => s.levelType === 'O_LEVEL')
        setAvailableSubjects(oLevelSubjects)
      }
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const handleManageSubjects = () => {
    fetchAvailableSubjects()
    // Pre-select already assigned subjects
    const assigned = classData?.assignedSubjects?.map(s => s.subjectId) || []
    setSelectedSubjects(assigned)
    setShowSubjectDialog(true)
  }

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const handleSaveSubjects = async () => {
    try {
      setSavingSubjects(true)
      const response = await fetch(`/api/classes/${classId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectIds: selectedSubjects })
      })

      if (response.ok) {
        setShowSubjectDialog(false)
        fetchClassDetails() // Refresh to show updated subjects
      }
    } catch (err) {
      console.error('Error saving subjects:', err)
    } finally {
      setSavingSubjects(false)
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
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error || !classData) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <AlertBanner
          type="danger"
          message={error || 'Class not found'}
          action={{ label: 'Go Back', onClick: handleBack }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{classData.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {classData.studentCount} student{classData.studentCount !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClass} className="gap-2">
            <Edit2 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Class</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Class Teacher Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[var(--accent-primary)]" />
                <CardTitle className="text-lg">Class Teacher</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleAssignTeacher}>
                {classData.classTeacher ? 'Change' : 'Assign'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {classData.classTeacher ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--info-light)] dark:bg-[var(--info-dark)] flex items-center justify-center">
                  <User className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
                </div>
                <div>
                  <p className="font-medium">
                    {classData.classTeacher.firstName} {classData.classTeacher.lastName}
                  </p>
                  {classData.classTeacher.email && (
                    <p className="text-sm text-muted-foreground">
                      {classData.classTeacher.email}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No class teacher assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Streams Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[var(--chart-purple)]" />
                <CardTitle className="text-lg">Streams</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddStream} className="gap-1">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <CardDescription>
              {classData.streams.length} stream{classData.streams.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classData.streams.length > 0 ? (
              <div className="space-y-2">
                {classData.streams.map((stream) => (
                  <div 
                    key={stream.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{stream.name}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{stream.studentCount} students</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No streams configured. Add streams to organize students.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Configuration Section - Only for O-Level classes */}
      {classData.levelType === 'O_LEVEL' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[var(--accent-primary)]" />
                <CardTitle className="text-lg">Subject Configuration</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageSubjects} className="gap-1">
                <Edit2 className="h-4 w-4" />
                Manage Subjects
              </Button>
            </div>
            <CardDescription>
              Subjects assigned to this O-Level class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classData.assignedSubjects && classData.assignedSubjects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classData.assignedSubjects.map((subject) => (
                  <div 
                    key={subject.id}
                    className="p-3 rounded-lg border bg-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{subject.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{subject.subjectCode}</p>
                      </div>
                    </div>
                    <Badge variant={subject.isCompulsory ? 'default' : 'secondary'} className="text-xs">
                      {subject.isCompulsory ? 'Compulsory' : 'Optional'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No subjects assigned yet. Click "Manage Subjects" to add subjects to this class.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Teachers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--success)]" />
            <CardTitle className="text-lg">Subject Teachers</CardTitle>
          </div>
          <CardDescription>
            Teachers assigned to subjects in this class
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classData.subjectTeachers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classData.subjectTeachers.map((teacher) => (
                <div 
                  key={teacher.staffId}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--success-light)] dark:bg-[var(--success-dark)] flex items-center justify-center">
                      <User className="h-4 w-4 text-[var(--chart-green)] dark:text-[var(--success)]" />
                    </div>
                    <p className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((subject) => (
                      <Badge key={subject.id} variant="outline" className="text-xs">
                        {subject.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No subject teachers assigned to this class yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subject Management Dialog */}
      <DialogPrimitive.Root open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/20 dark:bg-black/40',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[80vh]',
              'translate-x-[-50%] translate-y-[-50%]',
              'bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-lg p-6',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'duration-200 overflow-y-auto'
            )}
          >
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
              onClick={() => setShowSubjectDialog(false)}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            <DialogPrimitive.Title className="text-lg font-semibold mb-4">
              Manage Class Subjects
            </DialogPrimitive.Title>

            <p className="text-sm text-muted-foreground mb-4">
              Select O-Level subjects to assign to this class. Students will be able to choose from these subjects.
            </p>

            <div className="space-y-2 mb-6">
              {availableSubjects.length > 0 ? (
                availableSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedSubjects.includes(subject.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => handleToggleSubject(subject.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-5 w-5 rounded border-2 flex items-center justify-center',
                        selectedSubjects.includes(subject.id)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      )}>
                        {selectedSubjects.includes(subject.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code}</p>
                      </div>
                    </div>
                    <Badge variant={subject.isCompulsory ? 'default' : 'secondary'} className="text-xs">
                      {subject.isCompulsory ? 'Compulsory' : 'Optional'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No O-Level subjects available. Create O-Level subjects first.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowSubjectDialog(false)}
                disabled={savingSubjects}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSubjects}
                disabled={savingSubjects || availableSubjects.length === 0}
              >
                {savingSubjects ? 'Saving...' : `Save (${selectedSubjects.length} selected)`}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
