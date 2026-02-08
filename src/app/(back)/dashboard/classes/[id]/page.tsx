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
  UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
  streams: StreamDetail[]
  classTeacher: TeacherInfo | null
  subjectTeachers: SubjectTeacher[]
  studentCount: number
}

export default function ClassDetailPage() {
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string
  
  const [classData, setClassData] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    </div>
  )
}
