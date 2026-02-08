'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserCheck,
  GraduationCap,
  Eye
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * DoS ASSIGNMENTS VIEW
 * 
 * Read-only view for Director of Studies to monitor teaching assignments.
 * DoS owns academics but Admin owns staffing - this separation prevents power struggles.
 * 
 * DoS can see:
 * - Who is assigned to teach what
 * - Subject coverage gaps
 * - Assignment conflicts
 * 
 * DoS cannot:
 * - Create or modify assignments
 * - Assign teachers to subjects/classes
 */

interface TeacherAssignment {
  teacherId: string
  teacherName: string
  employeeNumber: string
  assignments: {
    classId: string
    className: string
    subjects: {
      subjectId: string
      subjectName: string
      subjectCode: string
      isPrimary: boolean
      isActive: boolean
    }[]
  }[]
}

interface ClassAssignment {
  classId: string
  className: string
  level: number
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    primaryTeacher: {
      id: string
      name: string
      employeeNumber: string
    } | null
    coTeacher?: {
      id: string
      name: string
      employeeNumber: string
    }
    isActive: boolean
    hasConflict: boolean
  }[]
}

interface AssignmentStats {
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  assignedSubjects: number
  unassignedSubjects: number
  conflictCount: number
}

export default function DoSAssignmentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'teacher' | 'class'>('class') // DoS thinks in classes first
  
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([])
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([])
  const [stats, setStats] = useState<AssignmentStats>({
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    assignedSubjects: 0,
    unassignedSubjects: 0,
    conflictCount: 0
  })

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff/assignments/truth-table')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load assignments')
      }

      const data = await response.json()
      setTeacherAssignments(data.teacherAssignments)
      setClassAssignments(data.classAssignments)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading assignments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const filteredTeacherAssignments = teacherAssignments.filter(teacher =>
    teacher.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClassAssignments = classAssignments.filter(classData =>
    classData.className.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <SkeletonLoader rows={8} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Teaching Assignments</h1>
          <p className="text-[var(--text-secondary)] mt-1">Academic oversight - who teaches what subjects</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Eye className="w-4 h-4 inline mr-1" />
              <strong>DoS View:</strong> You can monitor assignments but cannot modify them. 
              Contact Admin to make staffing changes.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadAssignments}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Stats Cards - Focus on academic concerns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total Subjects</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Covered</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.assignedSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Uncovered</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{stats.unassignedSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Conflicts</p>
              <p className="text-2xl font-bold text-[var(--warning-dark)]">{stats.conflictCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert for uncovered subjects */}
      {stats.unassignedSubjects > 0 && (
        <AlertBanner
          type="warning"
          title="Uncovered Subjects"
          message={`${stats.unassignedSubjects} subject${stats.unassignedSubjects !== 1 ? 's' : ''} have no assigned teacher. Students cannot receive marks for these subjects.`}
        />
      )}

      {/* Alert for conflicts */}
      {stats.conflictCount > 0 && (
        <AlertBanner
          type="error"
          title="Assignment Conflicts"
          message={`${stats.conflictCount} subject${stats.conflictCount !== 1 ? 's have' : ' has'} multiple primary teachers. This will cause mark entry conflicts.`}
        />
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search teachers or classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'class' ? 'default' : 'outline'}
            onClick={() => setViewMode('class')}
            size="sm"
          >
            <Building2 className="w-4 h-4 mr-2" />
            By Class
          </Button>
          <Button
            variant={viewMode === 'teacher' ? 'default' : 'outline'}
            onClick={() => setViewMode('teacher')}
            size="sm"
          >
            <User className="w-4 h-4 mr-2" />
            By Teacher
          </Button>
        </div>
      </div>

      {/* Class-Centric View (Primary for DoS) */}
      {viewMode === 'class' && (
        <div className="space-y-4">
          {filteredClassAssignments.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Classes Found</h3>
              <p className="text-[var(--text-secondary)]">No classes match your search criteria.</p>
            </Card>
          ) : (
            filteredClassAssignments.map((classData) => (
              <Card key={classData.classId} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Building2 className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{classData.className}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Level {classData.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {classData.subjects.length} Subject{classData.subjects.length !== 1 ? 's' : ''}
                    </Badge>
                    {classData.subjects.some(s => s.hasConflict) && (
                      <Badge variant="destructive">Conflicts</Badge>
                    )}
                    {classData.subjects.some(s => !s.primaryTeacher) && (
                      <Badge variant="destructive">Gaps</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {classData.subjects.map((subject) => (
                    <div
                      key={subject.subjectId}
                      className={`flex items-center justify-between p-3 rounded border ${
                        subject.hasConflict ? 'border-[var(--danger-light)] bg-[var(--danger-light)]' : 
                        subject.primaryTeacher ? 'border-[var(--success-light)] bg-[var(--success-light)]' : 'border-[var(--warning-light)] bg-[var(--warning-light)]'
                      }`}
                    >
                      <div className="flex items-center">
                        <GraduationCap className="w-4 h-4 text-[var(--chart-purple)] mr-3" />
                        <div>
                          <span className="font-medium">{subject.subjectName}</span>
                          <span className="text-sm text-[var(--text-secondary)] ml-2">({subject.subjectCode})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {subject.primaryTeacher ? (
                          <div className="text-right">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {subject.primaryTeacher.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {subject.primaryTeacher.employeeNumber}
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <Badge variant="destructive">No Teacher</Badge>
                            <p className="text-xs text-[var(--chart-red)] mt-1">Marks blocked</p>
                          </div>
                        )}

                        {subject.hasConflict && (
                          <AlertCircle className="w-4 h-4 text-[var(--chart-red)]" title="Multiple primary teachers" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Teacher-Centric View */}
      {viewMode === 'teacher' && (
        <div className="space-y-4">
          {filteredTeacherAssignments.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Teachers Found</h3>
              <p className="text-[var(--text-secondary)]">No teachers match your search criteria.</p>
            </Card>
          ) : (
            filteredTeacherAssignments.map((teacher) => (
              <Card key={teacher.teacherId} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <UserCheck className="w-6 h-6 text-[var(--chart-blue)] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{teacher.teacherName}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Employee: {teacher.employeeNumber}</p>
                    </div>
                  </div>
                  <Badge variant={teacher.assignments.length > 0 ? 'success' : 'secondary'}>
                    {teacher.assignments.length} Assignment{teacher.assignments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {teacher.assignments.length === 0 ? (
                  <div className="text-center py-4 text-[var(--text-muted)]">
                    No teaching assignments
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teacher.assignments.map((assignment) => (
                      <div key={assignment.classId} className="border rounded-lg p-4 bg-[var(--bg-surface)]">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-[var(--text-primary)]">{assignment.className}</h4>
                          <Badge variant="outline">
                            {assignment.subjects.length} Subject{assignment.subjects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {assignment.subjects.map((subject) => (
                            <div
                              key={subject.subjectId}
                              className="flex items-center justify-between p-2 bg-[var(--bg-main)] rounded border"
                            >
                              <div className="flex items-center">
                                <GraduationCap className="w-4 h-4 text-[var(--chart-purple)] mr-2" />
                                <span className="text-sm font-medium">{subject.subjectName}</span>
                              </div>
                              {subject.isPrimary && (
                                <Badge variant="success" size="sm">Primary</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}