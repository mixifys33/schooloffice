'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  BookOpen,
  Building2,
  GraduationCap,
  Eye,
  Calendar,
  Users,
  CheckCircle
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * TEACHER ASSIGNMENTS VIEW
 * 
 * Read-only view for teachers to see their teaching assignments.
 * Teachers cannot negotiate assignments in software.
 * 
 * Teachers can see:
 * - Their assigned classes and subjects
 * - What they are expected to teach
 * - Clear ownership boundaries
 * 
 * Teachers cannot:
 * - Modify assignments
 * - See other teachers' assignments
 * - Request assignment changes through the system
 */

interface TeacherAssignment {
  classId: string
  className: string
  level: number
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    isPrimary: boolean
    isActive: boolean
    studentCount: number
  }[]
}

interface AssignmentStats {
  totalClasses: number
  totalSubjects: number
  primarySubjects: number
  coTeachingSubjects: number
  totalStudents: number
}

export default function TeacherAssignmentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [stats, setStats] = useState<AssignmentStats>({
    totalClasses: 0,
    totalSubjects: 0,
    primarySubjects: 0,
    coTeachingSubjects: 0,
    totalStudents: 0
  })

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/teacher/assignments')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to load assignments')
      }

      const data = await response.json()
      setAssignments(data.assignments)
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <SkeletonLoader rows={6} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Teaching Assignments</h1>
          <p className="text-[var(--text-secondary)] mt-1">Your assigned classes and subjects</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Eye className="w-4 h-4 inline mr-1" />
              <strong>Teacher View:</strong> These are your official teaching responsibilities. 
              Contact Admin for any assignment changes.
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Classes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalClasses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Subjects</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Primary</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.primarySubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <GraduationCap className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Co-Teaching</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.coTeachingSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Students</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalStudents}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* No Assignments Message */}
      {assignments.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Teaching Assignments</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            You currently have no teaching assignments for this term.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Contact your Admin if you believe this is incorrect.
          </p>
        </Card>
      ) : (
        /* Assignments List */
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.classId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Building2 className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{assignment.className}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Level {assignment.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {assignment.subjects.length} Subject{assignment.subjects.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="secondary">
                    {assignment.subjects.reduce((sum, s) => sum + s.studentCount, 0)} Students
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignment.subjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="p-4 border rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <GraduationCap className="w-4 h-4 text-[var(--chart-purple)] mr-2" />
                        <span className="font-medium text-[var(--text-primary)]">{subject.subjectName}</span>
                      </div>
                      {subject.isPrimary ? (
                        <Badge variant="success" size="sm">Primary</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">Co-Teacher</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Code: {subject.subjectCode}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Students: {subject.studentCount}
                      </p>
                      {!subject.isActive && (
                        <Badge variant="destructive" size="sm">Inactive</Badge>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                      <p className="text-xs text-[var(--text-muted)]">
                        {subject.isPrimary ? (
                          <>
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            You can enter marks and take attendance
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 inline mr-1" />
                            You can assist but cannot enter marks
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {assignments.length > 0 && (
        <Card className="p-6 bg-[var(--info-light)] border-[var(--info-light)]">
          <h3 className="text-lg font-semibold text-[var(--info-dark)] mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.location.href = '/dashboard/teacher/attendance'}
            >
              <Users className="w-4 h-4 mr-2" />
              Take Attendance
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.location.href = '/dashboard/teacher/marks'}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Enter Marks
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => window.location.href = '/dashboard/teacher/classes'}
            >
              <Building2 className="w-4 h-4 mr-2" />
              View Classes
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}