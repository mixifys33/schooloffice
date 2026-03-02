'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, GraduationCap, Calendar, ClipboardList, BookOpen, AlertCircle, CheckCircle, BarChart3, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import { 
  errorMessages, 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors,
  transitions 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

/**
 * Students Page for Class Teacher Portal
 * Requirements: 1.1, 1.4, 2.1-2.7, 12.1-12.4, 14.1-14.4
 * - Display only students in assigned class
 * - Show student details, attendance, and performance
 * - Allow quick actions: Take attendance, Enter marks
 * - Disable data entry when context is invalid (1.4)
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface Student {
  id: string
  name: string
  admissionNumber: string
  gender: string | null
  age: number | null
  parentPhone: string | null
  parentEmail: string | null
  status: string
  attendanceRate: number
  performance: number
  lastAttendanceDate: string | null
  lastMarkEntryDate: string | null
}

interface ClassTeacherContextData {
  teacherId: string
  teacherName: string
  roleName: string
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  academicYear: {
    id: string
    name: string
  } | null
  contextError: string | null
}

interface ClassTeacherStudentsData {
  context: ClassTeacherContextData
  class: {
    id: string
    name: string
    streamName: string | null
    studentCount: number
  } | null
  availableClasses?: Array<{
    id: string
    streamId: string | null
    name: string
    streamName: string | null
    displayName: string
  }>
  students: Student[]
}

export default function ClassTeacherStudentsPage() {
  const [data, setData] = useState<ClassTeacherStudentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentsData() {
      try {
        let url = '/api/class-teacher/students'
        const params = new URLSearchParams()
        if (selectedClassId) params.append('classId', selectedClassId)
        if (selectedStreamId) params.append('streamId', selectedStreamId)
        if (params.toString()) url += `?${params.toString()}`
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch students data')
        }
        const studentsData = await response.json()
        setData(studentsData)
      } catch (err) {
        setError('Unable to load students')
        console.error('Error fetching class teacher students:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentsData()
  }, [selectedClassId, selectedStreamId])

  // Handle class/stream selection change
  const handleSelectionChange = (value: string) => {
    const selected = data?.availableClasses?.find(
      cls => (cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id) === value
    )
    if (selected) {
      setSelectedClassId(selected.id)
      setSelectedStreamId(selected.streamId)
      setLoading(true)
    }
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={6} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { context, class: classData, students } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Back Navigation */}
      <Link
        href="/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Users className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div className="flex-1">
            <h1 className={typography.pageTitle}>
              {classData ? `${classData.name} ${classData.streamName ? `(${classData.streamName})` : ''}` : 'My Students'}
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {students.length} students • Class Teacher Portal
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
          
          {/* Class/Stream Selector */}
          {data.availableClasses && data.availableClasses.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="class-stream-selector" className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap">
                Switch Class:
              </label>
              <select
                id="class-stream-selector"
                value={selectedStreamId ? `${selectedClassId}-${selectedStreamId}` : selectedClassId || classData?.id}
                onChange={(e) => handleSelectionChange(e.target.value)}
                className="px-3 py-2 border border-[var(--border-primary)] dark:border-[var(--border-dark)] rounded-lg bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {data.availableClasses.map((cls) => (
                  <option key={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id} value={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Context Error Warning - Requirement 12.4: Clear error messages */}
      {hasContextError && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]')}>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Data Entry Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {context.contextError || 'Academic context could not be determined. Please contact administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={cn('flex flex-wrap gap-3', spacing.card)}>
        <Link
          href={hasContextError ? '#' : '/class-teacher/attendance'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError 
              ? 'opacity-60 cursor-not-allowed' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
              <ClipboardList className={cn('h-6 w-6', teacherColors.info.text)} />
            </div>
            <div>
              <h3 className={typography.label}>Take Attendance</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Record daily attendance
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={hasContextError ? '#' : '/class-teacher/assessments'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError 
              ? 'opacity-60 cursor-not-allowed' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
              <BookOpen className={cn('h-6 w-6', teacherColors.success.text)} />
            </div>
            <div>
              <h3 className={typography.label}>Enter Assessments</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Record CA and Exam scores
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={hasContextError ? '#' : '/class-teacher/reports'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError 
              ? 'opacity-60 cursor-not-allowed' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
              <BarChart3 className={cn('h-6 w-6', teacherColors.info.text)} />
            </div>
            <div>
              <h3 className={typography.label}>View Reports</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Monitor class performance
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Students Table */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={typography.sectionTitle}>Students</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <GraduationCap className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(teacherColors.secondary.bg)}>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Admission #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Gender</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Age</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Attendance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Performance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Last Attendance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.name}</div>
                        <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {student.parentPhone && `📞 ${student.parentPhone}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{student.admissionNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{student.gender || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{student.age || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            student.attendanceRate >= 90 ? 'bg-green-500' :
                            student.attendanceRate >= 75 ? 'bg-blue-500' :
                            student.attendanceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${student.attendanceRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                        {student.attendanceRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            student.performance >= 90 ? 'bg-green-500' :
                            student.performance >= 75 ? 'bg-blue-500' :
                            student.performance >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${student.performance}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                        {student.performance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {student.lastAttendanceDate ? new Date(student.lastAttendanceDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' }) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      student.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                    )}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-1">
                      <Link
                        href={`/class-teacher/students/${student.id}`}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Users className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                      </Link>
                      <Link
                        href={`/class-teacher/attendance?studentId=${student.id}`}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <ClipboardList className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                      </Link>
                      <Link
                        href={`/class-teacher/assessments?studentId=${student.id}`}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <BookOpen className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {students.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>No Students Found</h3>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              {classData ? `No students enrolled in ${classData.name} yet.` : 'No students assigned to your class.'}
            </p>
          </div>
        )}
      </div>

      {/* Class Summary */}
      {classData && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={typography.sectionTitle}>Class Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Total Students</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {students.length}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <ClipboardList className={cn('h-5 w-5', teacherColors.info.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Avg Attendance</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length) || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <TrendingUp className={cn('h-5 w-5', teacherColors.success.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Avg Performance</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {Math.round(students.reduce((sum, s) => sum + s.performance, 0) / students.length) || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}