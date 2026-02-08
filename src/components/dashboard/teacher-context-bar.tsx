'use client'

import React, { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { User, Calendar, BookOpen, LogOut, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { teacherColors, typography, transitions } from '@/lib/teacher-ui-standards'

/**
 * Teacher Context Bar Component
 * Requirements: 1.1-1.4, 12.1-12.4
 * - Display teacher's full name, role label "Teacher", current term name, and academic year
 * - Remain visible and non-collapsible on all dashboard views
 * - Logout functionality with session termination
 * - Display error state when term/year cannot be determined
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

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

interface TeacherContextBarProps {
  className?: string
}

export function TeacherContextBar({ className }: TeacherContextBarProps) {
  const [context, setContext] = useState<TeacherContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchContext() {
      try {
        const response = await fetch('/api/teacher/context')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.details || errorData.error || 'Failed to fetch context'
          
          // Show user-friendly toast notification instead of throwing error
          toast({
            title: "Unable to Load Teacher Context",
            description: errorMessage,
            variant: "destructive",
          })
          
          setError(errorMessage)
          return
        }
        const data = await response.json()
        setContext(data.context)
        setError(null) // Clear any previous errors
      } catch (err) {
        const errorMessage = 'Unable to load context. Please check your connection and try again.'
        console.error('Error fetching teacher context:', err)
        
        // Show user-friendly toast notification
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchContext()
  }, [])

  // Add retry functionality
  const handleRetry = () => {
    setLoading(true)
    setError(null)
    
    async function retryFetchContext() {
      try {
        const response = await fetch('/api/teacher/context')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.details || errorData.error || 'Failed to fetch context'
          
          toast({
            title: "Still Unable to Load Context",
            description: errorMessage,
            variant: "destructive",
          })
          
          setError(errorMessage)
          return
        }
        const data = await response.json()
        setContext(data.context)
        setError(null)
        
        // Show success message on retry
        toast({
          title: "Context Loaded Successfully",
          description: "Teacher context has been loaded.",
          variant: "default",
        })
      } catch (err) {
        const errorMessage = 'Unable to load context. Please check your connection and try again.'
        console.error('Error retrying teacher context:', err)
        
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    
    retryFetchContext()
  }

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
          <AlertCircle className={cn('h-5 w-5', teacherColors.error.text)} />
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

export default TeacherContextBar