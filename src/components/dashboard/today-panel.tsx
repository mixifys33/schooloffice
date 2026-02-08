'use client'

import Link from 'next/link'
import { Clock, ClipboardList, BookOpen, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  statusBadgeStyles,
  transitions 
} from '@/lib/teacher-ui-standards'

/**
 * Today Panel Component
 * Requirements: 2.1-2.7, 12.1-12.4
 * - Display scheduled classes for current day from timetable
 * - Show time slot, subject name, class name for each entry
 * - Display attendance status (Not Taken/Done) with action button
 * - Display marks status (Pending/Done) with action button
 * - Show "No classes scheduled for today" when empty
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 */

export interface ScheduledClass {
  id: string
  timeSlot: string
  period: number
  subject: {
    id: string
    name: string
  }
  class: {
    id: string
    name: string
    streamName?: string
  }
  room?: string
  attendanceStatus: 'not_taken' | 'done'
  marksStatus: 'pending' | 'done'
}

export interface TodayPanelProps {
  scheduledClasses: ScheduledClass[]
  isLoading?: boolean
  hasContextError?: boolean
  className?: string
}

/**
 * Format period number to time slot string
 * This is a placeholder - actual time slots should come from school settings
 */
function formatPeriodToTimeSlot(period: number): string {
  const periodTimes: Record<number, string> = {
    1: '8:00 - 8:40',
    2: '8:45 - 9:25',
    3: '9:30 - 10:10',
    4: '10:30 - 11:10',
    5: '11:15 - 11:55',
    6: '12:00 - 12:40',
    7: '14:00 - 14:40',
    8: '14:45 - 15:25',
    9: '15:30 - 16:10',
    10: '16:15 - 16:55',
  }
  return periodTimes[period] || `Period ${period}`
}

export function TodayPanel({
  scheduledClasses,
  isLoading = false,
  hasContextError = false,
  className,
}: TodayPanelProps) {
  if (isLoading) {
    return (
      <div className={cn(cardStyles.base, cardStyles.normal, className)}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-[var(--text-muted)]" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className={spacing.card}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(cardStyles.base, cardStyles.normal, className)}>
      {/* Header - Requirement 12.1: Dense layout */}
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
          <Clock className="h-5 w-5 text-[var(--text-muted)]" />
          Today
        </h2>
        <Link 
          href="/portals/teacher/timetable" 
          className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]', transitions.color)}
        >
          Full timetable →
        </Link>
      </div>

      {/* Requirements: 2.7 - Show "No classes scheduled for today" when empty */}
      {scheduledClasses.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="h-10 w-10 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-2" />
          <p className={typography.body}>
            No classes scheduled for today
          </p>
        </div>
      ) : (
        <div className={spacing.card}>
          {scheduledClasses.map((entry) => (
            <ScheduledClassCard
              key={entry.id}
              entry={entry}
              hasContextError={hasContextError}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ScheduledClassCardProps {
  entry: ScheduledClass
  hasContextError: boolean
}

function ScheduledClassCard({ entry, hasContextError }: ScheduledClassCardProps) {
  const timeSlot = entry.timeSlot || formatPeriodToTimeSlot(entry.period)
  const className = entry.class.streamName 
    ? `${entry.class.name} (${entry.class.streamName})`
    : entry.class.name

  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg',
      teacherColors.secondary.bg
    )}>
      {/* Period indicator and time - Requirement 12.1: Dense layout */}
      <div className="flex items-center gap-3 sm:w-28 flex-shrink-0">
        <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-[var(--text-primary)] dark:text-[var(--text-muted)] font-medium text-xs">
          P{entry.period}
        </div>
        <div className={cn(typography.caption, 'sm:hidden')}>
          {timeSlot}
        </div>
      </div>

      {/* Class and subject info - Requirements: 2.2 */}
      <div className="flex-1 min-w-0">
        <div className={typography.label}>
          {className} - {entry.subject.name}
        </div>
        <div className={typography.caption}>
          {entry.room || 'No room assigned'}
        </div>
      </div>

      {/* Time slot (desktop) */}
      <div className={cn('hidden sm:block w-20 text-right', typography.caption)}>
        {timeSlot}
      </div>

      {/* Status and actions - Requirements: 12.2, 12.3 */}
      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
        {/* Attendance Status - Requirements: 2.3, 2.4 */}
        <AttendanceStatusButton
          status={entry.attendanceStatus}
          classId={entry.class.id}
          disabled={hasContextError}
        />

        {/* Marks Status - Requirements: 2.5, 2.6 */}
        <MarksStatusButton
          status={entry.marksStatus}
          classId={entry.class.id}
          subjectId={entry.subject.id}
          disabled={hasContextError}
        />
      </div>
    </div>
  )
}

interface AttendanceStatusButtonProps {
  status: 'not_taken' | 'done'
  classId: string
  disabled: boolean
}

/**
 * Attendance Status Button
 * Requirements: 2.3, 2.4, 12.2, 12.3
 * - Display "Attendance: Not Taken" with enabled action button
 * - Display "Attendance: Done" and disable the button
 * - Clear visual distinction for states (12.2)
 */
function AttendanceStatusButton({ status, classId, disabled }: AttendanceStatusButtonProps) {
  const isDone = status === 'done'

  // Requirement 12.2: Clear visual distinction for done state
  if (isDone) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        statusBadgeStyles.done
      )}>
        <CheckCircle className="h-3.5 w-3.5" />
        <span>Attendance: Done</span>
      </div>
    )
  }

  // Requirement 12.2, 12.3: Clear disabled state
  const isDisabled = disabled
  const buttonClasses = cn(
    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
    transitions.color,
    isDisabled 
      ? 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] dark:text-[var(--text-muted)] border-slate-200 dark:border-slate-700 cursor-not-allowed'
      : 'bg-[var(--bg-main)] dark:bg-slate-800 text-[var(--text-primary)] dark:text-[var(--text-muted)] border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
  )

  if (isDisabled) {
    return (
      <span className={buttonClasses}>
        <ClipboardList className="h-3.5 w-3.5" />
        Take Attendance
      </span>
    )
  }

  return (
    <Link href={`/portals/teacher/attendance?classId=${classId}`} className={buttonClasses}>
      <ClipboardList className="h-3.5 w-3.5" />
      Take Attendance
    </Link>
  )
}

interface MarksStatusButtonProps {
  status: 'pending' | 'done'
  classId: string
  subjectId: string
  disabled: boolean
}

/**
 * Marks Status Button
 * Requirements: 2.5, 2.6, 12.2, 12.3
 * - Display "Marks: Pending" with enabled action button
 * - Display "Marks: Done" and disable the button
 * - Clear visual distinction for states (12.2)
 */
function MarksStatusButton({ status, classId, subjectId, disabled }: MarksStatusButtonProps) {
  const isDone = status === 'done'

  // Requirement 12.2: Clear visual distinction for done state
  if (isDone) {
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        statusBadgeStyles.done
      )}>
        <CheckCircle className="h-3.5 w-3.5" />
        <span>Marks: Done</span>
      </div>
    )
  }

  // Requirement 12.2, 12.3: Clear disabled state
  const isDisabled = disabled
  const buttonClasses = cn(
    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
    transitions.color,
    isDisabled 
      ? 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] dark:text-[var(--text-muted)] border-slate-200 dark:border-slate-700 cursor-not-allowed'
      : 'bg-[var(--bg-main)] dark:bg-slate-800 text-[var(--text-primary)] dark:text-[var(--text-muted)] border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
  )

  if (isDisabled) {
    return (
      <span className={buttonClasses}>
        <BookOpen className="h-3.5 w-3.5" />
        Enter Marks
      </span>
    )
  }

  return (
    <Link href={`/portals/teacher/marks?classId=${classId}&subjectId=${subjectId}`} className={buttonClasses}>
      <BookOpen className="h-3.5 w-3.5" />
      Enter Marks
    </Link>
  )
}

export default TodayPanel
