'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  Edit3,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Staff Assignments Page - The Truth Table
 * 
 * This page is the definitive source of who teaches what to whom.
 * It shows explicit teaching responsibility assignments that cannot be disputed.
 * 
 * Requirements:
 * - Teacher → Class → Subject mapping (primary view)
 * - Class → Subject → Teacher mapping (secondary view)
 * - Clear ownership (one primary teacher per subject per class)
 * - Admin/DoS control only
 * - No ambiguity or "unassigned" states
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

export default function StaffAssignmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'teacher' | 'class'>('teacher')
  
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

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff/assignments/truth-table')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch assignments')
      }

      const result = await response.json()
      setTeacherAssignments(result.data?.teacherAssignments || [])
      setClassAssignments(result.data?.classAssignments || [])
      setStats(result.data?.stats || stats)
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Unable to load staff assignments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router, stats])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Filter assignments by search term
  const filteredTeacherAssignments = teacherAssignments.filter(ta =>
    ta.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ta.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ta.assignments.some(a => 
      a.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subjects.some(s => s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  const filteredClassAssignments = classAssignments.filter(ca =>
    ca.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.subjects.some(s => 
      s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.primaryTeacher?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchAssignments }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Teaching Assignments
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            The definitive truth table of who teaches what to whom
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchAssignments}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/dashboard/staff/assignments/manage')}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Manage Assignments
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Teachers</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
            {stats.totalTeachers}
          </p>
        </div>
        
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--success)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Classes</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
            {stats.totalClasses}
          </p>
        </div>
        
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--chart-purple)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Subjects</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
            {stats.totalSubjects}
          </p>
        </div>
        
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Assigned</span>
          </div>
          <p className="text-2xl font-bold text-[var(--chart-green)] dark:text-[var(--success)] mt-1">
            {stats.assignedSubjects}
          </p>
        </div>
        
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-[var(--danger)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Unassigned</span>
          </div>
          <p className="text-2xl font-bold text-[var(--chart-red)] dark:text-[var(--danger)] mt-1">
            {stats.unassignedSubjects}
          </p>
        </div>
        
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
            <span className="text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Conflicts</span>
          </div>
          <p className="text-2xl font-bold text-[var(--chart-yellow)] dark:text-[var(--warning)] mt-1">
            {stats.conflictCount}
          </p>
        </div>
      </div>

      {/* Alerts for Issues */}
      {stats.unassignedSubjects > 0 && (
        <AlertBanner
          type="warning"
          message={`${stats.unassignedSubjects} subjects have no assigned teacher. Mark entry will be blocked for these subjects.`}
        />
      )}
      
      {stats.conflictCount > 0 && (
        <AlertBanner
          type="danger"
          message={`${stats.conflictCount} assignment conflicts detected. These must be resolved immediately.`}
        />
      )}

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search teachers, classes, or subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-gray-400"
          />
        </div>
        <div className="flex rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'teacher'
                ? 'bg-[var(--accent-primary)] text-[var(--white-pure)]'
                : 'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            By Teacher
          </button>
          <button
            onClick={() => setViewMode('class')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'class'
                ? 'bg-[var(--accent-primary)] text-[var(--white-pure)]'
                : 'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            By Class
          </button>
        </div>
      </div>

      {/* Teacher-Centric View */}
      {viewMode === 'teacher' && (
        <div className="space-y-4">
          {filteredTeacherAssignments.length === 0 ? (
            <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
              <User className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
                No Teachers Found
              </h3>
              <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {searchTerm ? 'No teachers match your search criteria' : 'No teacher assignments found'}
              </p>
            </div>
          ) : (
            filteredTeacherAssignments.map((teacher) => (
              <div
                key={teacher.teacherId}
                className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]"
              >
                <div className="px-6 py-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {teacher.teacherName}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                          {teacher.employeeNumber}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {teacher.assignments.reduce((total, assignment) => total + assignment.subjects.length, 0)} assignments
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6">
                  {teacher.assignments.length === 0 ? (
                    <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] text-center py-4">
                      No teaching assignments
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {teacher.assignments.map((assignment) => (
                        <div key={assignment.classId} className="border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="h-4 w-4 text-[var(--success)]" />
                            <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                              {assignment.className}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {assignment.subjects.map((subject) => (
                              <div
                                key={subject.subjectId}
                                className={`flex items-center justify-between p-2 rounded border ${
                                  subject.isActive
                                    ? 'border-[var(--success-light)] bg-[var(--success-light)] dark:border-[var(--success-dark)] dark:bg-[var(--success-dark)]/20'
                                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] dark:border-[var(--border-strong)] dark:bg-[var(--border-strong)]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-[var(--chart-purple)]" />
                                  <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                    {subject.subjectName}
                                  </span>
                                </div>
                                {subject.isPrimary && (
                                  <Badge variant="default" className="text-xs">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Class-Centric View */}
      {viewMode === 'class' && (
        <div className="space-y-4">
          {filteredClassAssignments.length === 0 ? (
            <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
                No Classes Found
              </h3>
              <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {searchTerm ? 'No classes match your search criteria' : 'No class assignments found'}
              </p>
            </div>
          ) : (
            filteredClassAssignments.map((classItem) => (
              <div
                key={classItem.classId}
                className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]"
              >
                <div className="px-6 py-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[var(--chart-green)] dark:text-[var(--success)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {classItem.className}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                          Level {classItem.level}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {classItem.subjects.filter(s => s.primaryTeacher).length}/{classItem.subjects.length} assigned
                      </Badge>
                      {classItem.subjects.some(s => s.hasConflict) && (
                        <Badge variant="destructive">
                          Conflicts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {classItem.subjects.length === 0 ? (
                    <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] text-center py-4">
                      No subjects configured for this class
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {classItem.subjects.map((subject) => (
                        <div
                          key={subject.subjectId}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            subject.hasConflict
                              ? 'border-[var(--danger-light)] bg-[var(--danger-light)] dark:border-[var(--danger-dark)] dark:bg-[var(--danger-dark)]/20'
                              : subject.primaryTeacher
                              ? 'border-[var(--success-light)] bg-[var(--success-light)] dark:border-[var(--success-dark)] dark:bg-[var(--success-dark)]/20'
                              : 'border-[var(--warning-light)] bg-[var(--warning-light)] dark:border-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="h-4 w-4 text-[var(--chart-purple)]" />
                            <div>
                              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                                {subject.subjectName} ({subject.subjectCode})
                              </p>
                              {subject.primaryTeacher ? (
                                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                  {subject.primaryTeacher.name} ({subject.primaryTeacher.employeeNumber})
                                </p>
                              ) : (
                                <p className="text-sm text-[var(--chart-yellow)] dark:text-[var(--warning)]">
                                  No teacher assigned
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {subject.hasConflict && (
                              <Badge variant="destructive" className="text-xs">
                                Conflict
                              </Badge>
                            )}
                            {subject.coTeacher && (
                              <Badge variant="secondary" className="text-xs">
                                Co-teacher
                              </Badge>
                            )}
                            {subject.primaryTeacher ? (
                              <CheckCircle className="h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <XCircle className="h-4 w-4 text-[var(--danger)]" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
