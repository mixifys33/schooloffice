'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList, BookOpen } from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { TodayPanel, type ScheduledClass } from '@/components/dashboard'
import { ActionButton, ButtonGroup, ErrorMessagePanel, WarningMessage } from '@/components/teacher'
import { errorMessages, spacing, typography, cardStyles, teacherColors } from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

/**
 * Teacher Portal Dashboard
 * Requirements: 1.1, 1.4, 2.1-2.7, 12.1-12.4, 14.1-14.4
 * - Context-aware dashboard that respects term/year state
 * - "My Classes" section at top
 * - "Today" section showing current timetable with attendance/marks status
 * - Quick action buttons: Take attendance, Enter marks
 * - Limited to classes, timetable, and pending tasks only
 * - Disable data entry when context is invalid (1.4)
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface ClassData {
  id: string
  name: string
  streamName: string | null
  studentCount: number
  subject?: string
}

interface PendingTask {
  id: string
  type: 'attendance' | 'marks'
  className: string
  subject?: string
  dueDate: string
}

interface TeacherContextData {
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

interface TeacherDashboardData {
  context: TeacherContextData
  dashboard: {
    classes: ClassData[]
    todaySchedule?: ScheduledClass[]
    alerts: {
      pendingAttendance: Array<{ id: string; classId: string; className: string; date: string; message: string }>
      marksDeadlines: Array<{ id: string; examId: string; examName: string; subjectId: string; subjectName: string; deadline: string; message: string }>
    }
  } | null
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard/teacher')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError('Unable to load dashboard')
        console.error('Error fetching teacher dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={2} />
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

  const { context, dashboard } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  // Convert dashboard classes to display format
  const classes: ClassData[] = dashboard?.classes?.map(cls => ({
    id: cls.classId,
    name: cls.className,
    streamName: null,
    studentCount: cls.studentCount,
    subject: cls.subject,
  })) || []

  // Get today's schedule from API response
  const todaySchedule: ScheduledClass[] = dashboard?.todaySchedule || []

  // Convert pending tasks from alerts
  const pendingTasks: PendingTask[] = [
    ...(dashboard?.alerts?.pendingAttendance?.map(alert => ({
      id: alert.id,
      type: 'attendance' as const,
      className: alert.className,
      dueDate: 'Today',
    })) || []),
    ...(dashboard?.alerts?.marksDeadlines?.map(alert => ({
      id: alert.id,
      type: 'marks' as const,
      className: alert.subjectName,
      subject: alert.examName,
      dueDate: new Date(alert.deadline).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' }),
    })) || []),
  ]

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Welcome Header - Requirement 12.1: Dense but clean layout */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <h1 className={typography.pageTitle}>
          Welcome, {teacherName}
        </h1>
        <p className={cn(typography.caption, 'mt-1')}>
          {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Context Error Warning - Requirement 12.4: Clear error messages */}
      {hasContextError && (
        <WarningMessage
          title="Data Entry Disabled"
          message={context.contextError || 'Academic context could not be determined. Please contact administration.'}
        />
      )}

      {/* Quick Actions - Requirements: 12.2, 12.3 - Clear states, hide/disable non-permitted */}
      <ButtonGroup>
        <ActionButton
          label="Take Attendance"
          icon={<ClipboardList className="h-5 w-5" />}
          href="/teacher/attendance"
          isPermitted={!hasContextError}
          hideWhenNotPermitted={false}
          variant="primary"
          size="lg"
        />
        <ActionButton
          label="Enter Marks"
          icon={<BookOpen className="h-5 w-5" />}
          href="/teacher/marks"
          isPermitted={!hasContextError}
          hideWhenNotPermitted={false}
          variant="secondary"
          size="lg"
        />
      </ButtonGroup>

      {/* My Classes - Requirements: 14.1, 12.1 */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={typography.sectionTitle}>My Classes</h2>
          <Link 
            href="/teacher/classes" 
            className={cn(typography.caption, 'hover:text-slate-900 dark:hover:text-white transition-colors')}
          >
            View all →
          </Link>
        </div>
        {classes.length > 0 ? (
          <div className={cn('grid sm:grid-cols-2 lg:grid-cols-3', spacing.grid)}>
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={hasContextError ? '#' : `/teacher/classes/${cls.id}`}
                className={cn(
                  'p-3 rounded-lg transition-colors',
                  teacherColors.secondary.bg,
                  hasContextError 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
                onClick={hasContextError ? (e) => e.preventDefault() : undefined}
                aria-disabled={hasContextError}
              >
                <div className={cn('font-medium', typography.label)}>
                  {cls.name} {cls.streamName && `(${cls.streamName})`}
                </div>
                <div className={cn(typography.caption, 'mt-1')}>
                  {cls.subject} • {cls.studentCount} students
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className={typography.body}>No classes assigned yet.</p>
        )}
      </div>

      {/* Today's Schedule - Requirements: 2.1-2.7 */}
      <TodayPanel
        scheduledClasses={todaySchedule}
        hasContextError={hasContextError}
      />

      {/* Pending Tasks - Requirements: 14.4, 12.1 - Dense layout */}
      {pendingTasks.length > 0 && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={cn(typography.sectionTitle, 'mb-3')}>Pending Tasks</h2>
          <div className={spacing.card}>
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  teacherColors.warning.bg,
                  teacherColors.warning.border
                )}
              >
                <div className="flex items-center gap-3">
                  {task.type === 'attendance' ? (
                    <ClipboardList className={cn('h-5 w-5', teacherColors.warning.text)} />
                  ) : (
                    <BookOpen className={cn('h-5 w-5', teacherColors.warning.text)} />
                  )}
                  <div>
                    <div className={typography.label}>
                      {task.type === 'attendance' ? 'Take Attendance' : 'Enter Marks'}
                    </div>
                    <div className={typography.caption}>
                      {task.className} {task.subject && `• ${task.subject}`}
                    </div>
                  </div>
                </div>
                <div className={cn('text-sm font-medium', teacherColors.warning.text)}>
                  {task.dueDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
