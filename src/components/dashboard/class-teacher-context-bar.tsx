'use client'

import React from 'react'
import { signOut } from 'next-auth/react'
import { User, Calendar, BookOpen, LogOut, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { teacherColors, typography, transitions } from '@/lib/teacher-ui-standards'

/**
 * Class Teacher Context Bar Component
 * Requirements: 1.1-1.4, 12.1-12.4
 * - Display teacher's full name, role label "Class Teacher", current term name, and academic year
 * - Remain visible and non-collapsible on all dashboard views
 * - Logout functionality with session termination
 * - Display error state when term/year cannot be determined
 * - Dense but clean layout with muted colors (12.1)
 * - Clear error messages with next steps (12.4)
 */

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

interface ClassTeacherContextBarProps {
  className?: string
}

export function ClassTeacherContextBar({ className }: ClassTeacherContextBarProps) {
  const [context, setContext] = useState<ClassTeacherContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContext() {
      try {
        const response = await fetch('/api/class-teacher/context')
        if (!response.ok) {
          throw new Error('Failed to fetch context')
        }
        const data = await response.json()
        setContext(data.context)
      } catch (err) {
        setError('Unable to load context')
        console.error('Error fetching class teacher context:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContext()
  }, [])

  // Requirements: 1.3 - Logout functionality with session termination
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Loading state - Requirement 12.1: No decorative animations
  if (loading) {
    return (
      <div className={cn(
        'flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700',
        className
      )}>
        <div className="flex items-center gap-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  // Error state - Requirement 12.4: Clear error messages
  if (error || !context) {
    return (
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        teacherColors.error.bg,
        teacherColors.error.border,
        className
      )}>
        <div className="flex items-center gap-2">
          <AlertCircle className={cn('h-4 w-4', teacherColors.error.text)} />
          <span className="text-sm">{error || 'Unable to load context'}</span>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-[var(--bg-main)] dark:bg-slate-800 border border-slate-300 dark:border-slate-600',
            'text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-slate-50 dark:hover:bg-slate-700',
            transitions.color
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    )
  }

  // Requirements: 1.4 - Display error state when term/year cannot be determined
  const hasContextError = !!context.contextError

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Main context bar - Requirements: 1.1, 1.2, 12.1 - Non-collapsible, dense layout */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        hasContextError
          ? cn(teacherColors.warning.bg, teacherColors.warning.border)
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      )}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {/* Teacher Name and Role - Requirements: 1.1 */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--text-muted)]" />
            <span className={typography.label}>
              {context.teacherName}
            </span>
            <span className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {context.roleName}
            </span>
          </div>

          {/* Separator */}
          <span className="hidden sm:inline text-[var(--text-muted)] dark:text-[var(--text-secondary)]">|</span>

          {/* Academic Year - Requirements: 1.1 */}
          {context.academicYear ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
              <span className={typography.body}>
                {context.academicYear.name}
              </span>
            </div>
          ) : (
            <div className={cn('flex items-center gap-2', teacherColors.warning.text)}>
              <AlertCircle className="h-4 w-4" />
              <span>No Academic Year</span>
            </div>
          )}

          {/* Separator */}
          <span className="hidden sm:inline text-[var(--text-muted)] dark:text-[var(--text-secondary)]">|</span>

          {/* Current Term - Requirements: 1.1 */}
          {context.currentTerm ? (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
              <span className={typography.body}>
                {context.currentTerm.name}
              </span>
            </div>
          ) : (
            <div className={cn('flex items-center gap-2', teacherColors.warning.text)}>
              <AlertCircle className="h-4 w-4" />
              <span>No Active Term</span>
            </div>
          )}
        </div>

        {/* Logout Button - Requirements: 1.3, 12.2 */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
            'text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]',
            'hover:bg-slate-100 dark:hover:bg-slate-700',
            transitions.color
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Error Banner - Requirements: 1.4, 12.4 */}
      {hasContextError && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 border-b',
          teacherColors.warning.bg,
          teacherColors.warning.border
        )}>
          <AlertCircle className={cn('h-4 w-4 flex-shrink-0', teacherColors.warning.text)} />
          <span className={cn('text-sm', teacherColors.warning.text)}>
            {context.contextError} Data entry operations are disabled.
          </span>
        </div>
      )}
    </div>
  )
}

export default ClassTeacherContextBar