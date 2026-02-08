'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Users, Calendar, AlertCircle, CheckCircle, Clock, Save, Send, Lock } from 'lucide-react'
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
 * Attendance Page for Class Teacher Portal
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * - Display only students in assigned class
 * - Allow taking attendance for assigned class only
 * - Show attendance history
 * - Validate teacher assignment before allowing entry
 * - Disable data entry when context is invalid
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface StudentAttendance {
  studentId: string
  studentName: string
  admissionNumber: string
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null
  lastAttendanceDate: string | null
  attendanceRate: number
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

interface ClassTeacherAttendanceData {
  context: ClassTeacherContextData
  class: {
    id: string
    name: string
    streamName: string | null
    studentCount: number
  } | null
  date: string
  students: StudentAttendance[]
  isPublished: boolean
  isTermActive: boolean
  canEdit: boolean
  lockMessage: string | null
  hasUnsavedChanges: boolean
  submittedAt: string | null
}

export default function ClassTeacherAttendancePage() {
  const [data, setData] = useState<ClassTeacherAttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Attendance state
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function fetchAttendanceData() {
      try {
        const response = await fetch(`/api/class-teacher/attendance?date=${selectedDate}`)
        if (!response.ok) {
          throw new Error('Failed to fetch attendance data')
        }
        const attendanceData = await response.json()
        setData(attendanceData)

        // Initialize attendance status from fetched data
        const initialStatus: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null> = {}
        attendanceData.students.forEach((student: StudentAttendance) => {
          initialStatus[student.studentId] = student.attendanceStatus
        })
        setAttendanceStatus(initialStatus)
        setHasChanges(false)
      } catch (err) {
        setError('Unable to load attendance data')
        console.error('Error fetching class teacher attendance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendanceData()
  }, [selectedDate])

  // Handle attendance status change
  const handleAttendanceChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: status
    }))
    setHasChanges(true)
  }

  // Save attendance as draft
  const handleSaveDraft = async () => {
    if (!data || !hasChanges) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const attendanceToSave = Object.entries(attendanceStatus).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate,
      }))

      const response = await fetch('/api/class-teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: data.class?.id,
          date: selectedDate,
          attendance: attendanceToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      // Refresh attendance data
      const refreshResponse = await fetch(`/api/class-teacher/attendance?date=${selectedDate}`)
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        setData(refreshedData)
      }

      setHasChanges(false)
      setSuccessMessage('Attendance saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // Submit final attendance
  const handleSubmitFinal = async () => {
    if (!data) return

    // Confirm submission
    const confirmed = window.confirm(
      'Are you sure you want to submit final attendance? This will notify the administration and attendance cannot be changed without approval.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // First save any pending changes
      if (hasChanges) {
        const attendanceToSave = Object.entries(attendanceStatus).map(([studentId, status]) => ({
          studentId,
          status,
          date: selectedDate,
        }))

        await fetch('/api/class-teacher/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: data.class?.id,
            date: selectedDate,
            attendance: attendanceToSave,
            isDraft: false,
          }),
        })
      }

      // Submit final attendance
      const response = await fetch('/api/class-teacher/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: data.class?.id,
          date: selectedDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit attendance')
      }

      // Refresh attendance data
      const refreshResponse = await fetch(`/api/class-teacher/attendance?date=${selectedDate}`)
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        setData(refreshedData)
      }

      setHasChanges(false)
      setSuccessMessage('Attendance submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attendance')
    } finally {
      setSubmitting(false)
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

  const { context, class: classData, students, date, lockMessage } = data
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
            <ClipboardList className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Take Attendance
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {classData ? `${classData.name} ${classData.streamName ? `(${classData.streamName})` : ''}` : 'Class Attendance'}
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
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

      {/* Date Selection */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
            <label className={cn(typography.caption, 'text-[var(--text-primary)] dark:text-[var(--text-muted)]')}>Date:</label>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'bg-[var(--success-light)] dark:bg-[var(--success-dark)] border-[var(--success-light)] dark:border-[var(--success-dark)]')}>
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-[var(--danger-light)] dark:border-[var(--danger-dark)]')}>
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Lock/Status Banner */}
      {lockMessage && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]')}>
          <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
            <Lock className="h-5 w-5" />
            <span>{lockMessage}</span>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        {/* Table Header */}
        <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={cn(typography.sectionTitle, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                Attendance for {new Date(date).toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                {students.length} students • {classData?.name}
              </p>
            </div>

            {/* Action Buttons */}
            {data.canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={!hasChanges || saving || submitting}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitFinal}
                  disabled={submitting || saving}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Final'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={cn(teacherColors.secondary.bg)}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Admission #</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Attendance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Last Attendance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {students.map((student, index) => (
                <tr key={student.studentId} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {student.studentName}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {student.admissionNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {data.canEdit ? (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleAttendanceChange(student.studentId, 'PRESENT')}
                          className={cn(
                            'px-3 py-1 rounded text-sm font-medium',
                            attendanceStatus[student.studentId] === 'PRESENT'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                          )}
                        >
                          P
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(student.studentId, 'ABSENT')}
                          className={cn(
                            'px-3 py-1 rounded text-sm font-medium',
                            attendanceStatus[student.studentId] === 'ABSENT'
                              ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                          )}
                        >
                          A
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(student.studentId, 'LATE')}
                          className={cn(
                            'px-3 py-1 rounded text-sm font-medium',
                            attendanceStatus[student.studentId] === 'LATE'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                          )}
                        >
                          L
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(student.studentId, 'EXCUSED')}
                          className={cn(
                            'px-3 py-1 rounded text-sm font-medium',
                            attendanceStatus[student.studentId] === 'EXCUSED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                          )}
                        >
                          E
                        </button>
                      </div>
                    ) : (
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        student.attendanceStatus === 'PRESENT' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                        student.attendanceStatus === 'ABSENT' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                        student.attendanceStatus === 'LATE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                        student.attendanceStatus === 'EXCUSED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                      )}>
                        {student.attendanceStatus ? student.attendanceStatus.charAt(0) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {student.lastAttendanceDate ? new Date(student.lastAttendanceDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' }) : '-'}
                  </td>
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
                    <Link
                      href={`/class-teacher/students/${student.studentId}`}
                      className="text-[var(--accent-hover)] dark:text-[var(--accent)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {students.length === 0 && (
          <div className="p-8 text-center">
            <ClipboardList className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
              No Students Found
            </h3>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              {classData ? `No students enrolled in ${classData.name} yet.` : 'No students assigned to your class.'}
            </p>
          </div>
        )}
      </div>

      {/* Attendance Summary */}
      {students.length > 0 && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={cn(typography.sectionTitle, 'mb-4')}>Attendance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <CheckCircle className={cn('h-5 w-5', teacherColors.success.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Present</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {students.filter(s => attendanceStatus[s.studentId] === 'PRESENT').length}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <AlertCircle className={cn('h-5 w-5', teacherColors.danger.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Absent</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {students.filter(s => attendanceStatus[s.studentId] === 'ABSENT').length}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <Clock className={cn('h-5 w-5', teacherColors.warning.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Late</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {students.filter(s => attendanceStatus[s.studentId] === 'LATE').length}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <Users className={cn('h-5 w-5', teacherColors.info.text)} />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Total</h3>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {students.length}
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