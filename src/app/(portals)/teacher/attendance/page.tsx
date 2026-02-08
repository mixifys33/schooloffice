'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ClipboardList, 
  ChevronRight, 
  Clock, 
  Users,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ActionButton, ErrorMessagePanel, WarningMessage, StatusBadge } from '@/components/teacher'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  errorMessages,
  transitions 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

/**
 * Teacher Attendance Page
 * Requirements: 4.1-4.7, 12.1-12.4
 * - Display assigned classes for attendance
 * - Show attendance status for today
 * - Restrict to current day only
 * - Validate teacher assignment before allowing entry
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface AssignedClass {
  id: string
  classId: string
  className: string
  streamName: string | null
  studentCount: number
  attendanceStatus: 'not_taken' | 'done' | 'locked'
  isLocked: boolean
  lockMessage?: string
}

interface AttendanceLockState {
  isLocked: boolean
  cutoffTime: string
  canEdit: boolean
  message?: string
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<AssignedClass[]>([])
  const [lockState, setLockState] = useState<AttendanceLockState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendanceData = useCallback(async () => {
    try {
      // Fetch assigned classes with attendance status
      const response = await fetch('/api/teacher/attendance')
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data')
      }
      const data = await response.json()
      setClasses(data.classes || [])
      setLockState(data.lockState || null)
    } catch (err) {
      setError('Unable to load attendance data')
      console.error('Error fetching attendance data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <div className="flex items-center justify-between">
          <h1 className={typography.pageTitle}>Attendance</h1>
        </div>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={fetchAttendanceData}
        />
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-UG', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header - Requirement 12.1: Dense layout */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={typography.pageTitle}>Attendance</h1>
          <p className={cn(typography.caption, 'mt-1')}>
            {today}
          </p>
        </div>
      </div>

      {/* Lock State Warning - Requirements: 4.3, 4.4, 4.5, 12.4 */}
      {lockState?.isLocked && (
        <WarningMessage
          title="Attendance Locked"
          message={lockState.message || `Attendance cutoff time (${lockState.cutoffTime}) has passed. Contact administration for approval to make changes.`}
        />
      )}

      {/* Cutoff Time Info - Requirement 12.4: Clear information */}
      {lockState && !lockState.isLocked && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-lg border',
          teacherColors.info.bg,
          teacherColors.info.border
        )}>
          <Clock className={cn('h-5 w-5', teacherColors.info.text)} />
          <span className={cn('text-sm', teacherColors.info.text)}>
            Attendance can be recorded until {lockState.cutoffTime}
          </span>
        </div>
      )}

      {/* Classes Grid - Requirements: 4.6, 12.1 */}
      {classes.length > 0 ? (
        <div className={cn('grid sm:grid-cols-2 lg:grid-cols-3', spacing.grid)}>
          {classes.map((cls) => (
            <AttendanceClassCard 
              key={cls.id} 
              classData={cls} 
              isGloballyLocked={lockState?.isLocked || false}
            />
          ))}
        </div>
      ) : (
        <div className={cn(cardStyles.base, 'p-8 text-center')}>
          <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <h3 className={cn(typography.sectionTitle, 'mb-2')}>
            No Classes Assigned
          </h3>
          <p className={cn(typography.body, 'max-w-sm mx-auto')}>
            You don&apos;t have any classes assigned for attendance. Please contact your school administrator.
          </p>
        </div>
      )}

      {/* Link to History */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link 
          href="/portals/teacher/attendance/history"
          className={cn(
            'flex items-center gap-1',
            typography.caption,
            'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]',
            transitions.color
          )}
        >
          View attendance history
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

interface AttendanceClassCardProps {
  classData: AssignedClass
  isGloballyLocked: boolean
}

function AttendanceClassCard({ classData, isGloballyLocked }: AttendanceClassCardProps) {
  const isLocked = isGloballyLocked || classData.isLocked
  const isDone = classData.attendanceStatus === 'done'

  return (
    <div className={cn(cardStyles.base, cardStyles.normal)}>
      {/* Class Header - Requirement 12.1: Dense layout */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isDone 
              ? teacherColors.success.bg
              : isLocked 
                ? teacherColors.disabled.bg
                : teacherColors.info.bg
          )}>
            {isDone ? (
              <CheckCircle2 className={cn('h-5 w-5', teacherColors.success.text)} />
            ) : isLocked ? (
              <Lock className={cn('h-5 w-5', teacherColors.disabled.text)} />
            ) : (
              <ClipboardList className={cn('h-5 w-5', teacherColors.info.text)} />
            )}
          </div>
          <div>
            <h3 className={typography.label}>
              {classData.className}
              {classData.streamName && (
                <span className={cn(typography.body, 'font-normal')}>
                  {' '}({classData.streamName})
                </span>
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Class Stats */}
      <div className="flex items-center gap-4 mb-3">
        <div className={cn('flex items-center gap-1.5', typography.caption)}>
          <Users className="h-4 w-4" />
          <span>{classData.studentCount} students</span>
        </div>
      </div>

      {/* Status Badge - Requirement 12.2: Clear visual distinction */}
      <div className="mb-3">
        <StatusBadge
          status={isDone ? 'done' : isLocked ? 'locked' : 'pending'}
          label={isDone ? 'Attendance Taken' : isLocked ? 'Locked' : 'Pending'}
        />
      </div>

      {/* Action Button - Requirements: 4.3, 4.4, 4.5, 12.2, 12.3 */}
      <ActionButton
        label={isDone ? 'View Attendance' : isLocked ? 'Locked - Admin Approval Required' : 'Take Attendance'}
        icon={isLocked && !isDone ? <Lock className="h-4 w-4" /> : undefined}
        href={`/portals/teacher/attendance/${classData.classId}`}
        isPermitted={!isLocked || isDone}
        hideWhenNotPermitted={false}
        variant={isDone ? 'secondary' : 'primary'}
        size="sm"
        fullWidth
      />

      {/* Lock Message - Requirement 12.4: Clear error messages */}
      {classData.lockMessage && (
        <p className={cn(typography.caption, 'mt-2 text-center')}>
          {classData.lockMessage}
        </p>
      )}
    </div>
  )
}
