'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, BookOpen, Filter, Search, ChevronDown, TrendingUp, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import ProgressiveFilter from '@/components/teacher/ProgressiveFilter'
import MarksEntryTable from '@/components/teacher/MarksEntryTable'
import { Toast, useToast } from '@/components/ui/toast'
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
 * Teacher Marks Management System - Main Entry Point
 * Requirements: 11.1, 11.2, 19.1, 19.2, 19.4
 * - Accessible from /teacher/students route
 * - Progressive filter interface (Class → Stream → Subject → Students)
 * - Integrated marks entry and management
 * - Proper authorization for regular teachers
 * - Consistent dashboard navigation integration
 */

interface FilterSelection {
  classId?: string
  streamId?: string
  subjectId?: string
}

interface StudentWithMarks {
  id: string
  name: string
  admissionNumber: string
  caEntries: any[]
  examEntry?: any
  gradeCalculation: any
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

export default function TeacherStudentsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextData, setContextData] = useState<TeacherContextData | null>(null)
  const [filterSelection, setFilterSelection] = useState<FilterSelection>({})
  const [studentsData, setStudentsData] = useState<{
    students: StudentWithMarks[]
    subject: any
    term: any
  } | null>(null)
  
  // Interactive feedback states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null)
  
  // Toast notifications
  const { showToast } = useToast()

  // Auto-save functionality
  const autoSaveTimer = React.useRef<NodeJS.Timeout | null>(null)
  
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }
    
    autoSaveTimer.current = setTimeout(() => {
      if (unsavedChanges) {
        setAutoSaveStatus('saving')
        // Simulate auto-save
        setTimeout(() => {
          setAutoSaveStatus('saved')
          setUnsavedChanges(false)
          setTimeout(() => setAutoSaveStatus('idle'), 2000)
        }, 1000)
      }
    }, 3000) // Auto-save after 3 seconds of inactivity
  }, [unsavedChanges])

  // Cleanup auto-save timer
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [])

  // Trigger auto-save when unsaved changes occur
  useEffect(() => {
    if (unsavedChanges) {
      triggerAutoSave()
    }
  }, [unsavedChanges, triggerAutoSave])

  // Fetch teacher context on mount
  useEffect(() => {
    async function fetchContext() {
      try {
        setOperationInProgress('Loading teacher context...')
        const response = await fetch('/api/teacher/context')
        if (!response.ok) {
          throw new Error('Failed to fetch teacher context')
        }
        const data = await response.json()
        setContextData(data)
        showToast({
          type: 'success',
          message: 'Teacher context loaded successfully'
        })
      } catch (err) {
        setError('Unable to load teacher context')
        showToast({
          type: 'error',
          message: 'Failed to load teacher context. Please try again.'
        })
        console.error('Error fetching teacher context:', err)
      } finally {
        setOperationInProgress(null)
      }
    }

    fetchContext()
  }, [showToast])

  // Fetch students data when filter selection is complete
  useEffect(() => {
    async function fetchStudentsData() {
      if (!filterSelection.classId || !filterSelection.subjectId) {
        setStudentsData(null)
        return
      }

      setLoading(true)
      setError(null)
      setOperationInProgress('Loading student marks data...')

      try {
        const response = await fetch(
          `/api/teacher/marks/${filterSelection.classId}/${filterSelection.subjectId}/students`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch students data')
        }
        const data = await response.json()
        setStudentsData(data)
        showToast({
          type: 'success',
          message: `Loaded marks for ${data.students.length} students`
        })
      } catch (err) {
        setError('Unable to load students data')
        showToast({
          type: 'error',
          message: 'Failed to load student marks. Please try again.'
        })
        console.error('Error fetching students:', err)
      } finally {
        setLoading(false)
        setOperationInProgress(null)
      }
    }

    fetchStudentsData()
  }, [filterSelection.classId, filterSelection.subjectId, showToast])

  const handleFilterChange = (selection: FilterSelection) => {
    setFilterSelection(selection)
    // Show visual feedback for filter changes
    if (selection.classId || selection.subjectId) {
      showToast({
        type: 'info',
        message: 'Filter updated - loading new data...'
      })
    }
  }

  const handleCAEntryCreate = async (entry: any) => {
    setOperationInProgress('Creating CA entry...')
    setUnsavedChanges(true)
    
    try {
      const response = await fetch('/api/teacher/marks/ca-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to create CA entry')
      }

      showToast({
        type: 'success',
        message: 'CA entry created successfully'
      })

      // Refresh students data with loading feedback
      if (filterSelection.classId && filterSelection.subjectId) {
        setIsRefreshing(true)
        const refreshResponse = await fetch(
          `/api/teacher/marks/${filterSelection.classId}/${filterSelection.subjectId}/students`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setStudentsData(data)
        }
        setIsRefreshing(false)
      }
      setUnsavedChanges(false)
    } catch (err) {
      setError('Failed to create CA entry')
      showToast({
        type: 'error',
        message: 'Failed to create CA entry. Please try again.'
      })
      console.error('Error creating CA entry:', err)
    } finally {
      setOperationInProgress(null)
    }
  }

  const handleExamEntryCreate = async (entry: any) => {
    setOperationInProgress('Creating exam entry...')
    setUnsavedChanges(true)
    
    try {
      const response = await fetch('/api/teacher/marks/exam-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to create exam entry')
      }

      showToast({
        type: 'success',
        message: 'Exam entry created successfully'
      })

      // Refresh students data with loading feedback
      if (filterSelection.classId && filterSelection.subjectId) {
        setIsRefreshing(true)
        const refreshResponse = await fetch(
          `/api/teacher/marks/${filterSelection.classId}/${filterSelection.subjectId}/students`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setStudentsData(data)
        }
        setIsRefreshing(false)
      }
      setUnsavedChanges(false)
    } catch (err) {
      setError('Failed to create exam entry')
      showToast({
        type: 'error',
        message: 'Failed to create exam entry. Please try again.'
      })
      console.error('Error creating exam entry:', err)
    } finally {
      setOperationInProgress(null)
    }
  }

  const handleBatchSave = async (entries: any[]) => {
    setOperationInProgress('Saving all changes...')
    
    try {
      const response = await fetch('/api/teacher/marks/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })

      if (!response.ok) {
        throw new Error('Failed to save marks')
      }

      showToast({
        type: 'success',
        message: `Successfully saved ${entries.length} mark entries`
      })

      // Refresh students data with loading feedback
      if (filterSelection.classId && filterSelection.subjectId) {
        setIsRefreshing(true)
        const refreshResponse = await fetch(
          `/api/teacher/marks/${filterSelection.classId}/${filterSelection.subjectId}/students`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setStudentsData(data)
        }
        setIsRefreshing(false)
      }
      setUnsavedChanges(false)
    } catch (err) {
      setError('Failed to save marks')
      showToast({
        type: 'error',
        message: 'Failed to save marks. Please try again.'
      })
      console.error('Error saving marks:', err)
    } finally {
      setOperationInProgress(null)
    }
  }

  // Handle page unload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unsavedChanges])

  if (error && !contextData) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const hasContextError = contextData?.contextError
  const isDataEntryDisabled = hasContextError || !contextData?.currentTerm

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Back Navigation */}
      <Link
        href="/teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', teacherColors.info.bg)}>
            <BookOpen className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Student Marks Management
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Enter and manage CA and exam marks for your assigned subjects
              {contextData?.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {contextData.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context Error Warning */}
      {isDataEntryDisabled && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4', teacherColors.warning.bg, teacherColors.warning.border)}>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Data Entry Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {hasContextError || 'No active academic term. Please contact administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Filter */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={typography.sectionTitle}>Select Class and Subject</h2>
        <div className="mt-4">
          <ProgressiveFilter
            teacherId={contextData?.teacherId || ''}
            onSelectionChange={handleFilterChange}
            initialSelection={filterSelection}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={cn(cardStyles.base, cardStyles.compact, teacherColors.error.bg, teacherColors.error.border)}>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn('h-5 w-5', teacherColors.error.text)} />
            <span className={teacherColors.error.text}>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <SkeletonLoader variant="text" count={2} />
          <SkeletonLoader variant="card" count={3} />
        </div>
      )}

      {/* Marks Entry Table */}
      {studentsData && !loading && !isDataEntryDisabled && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={typography.sectionTitle}>
                {studentsData.subject?.name} - Student Marks
              </h2>
              <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                {studentsData.students.length} students • {studentsData.term?.name}
              </p>
            </div>
          </div>

          <MarksEntryTable
            students={studentsData.students}
            subject={studentsData.subject}
            onCAEntryCreate={handleCAEntryCreate}
            onExamEntryCreate={handleExamEntryCreate}
            onBatchSave={handleBatchSave}
            readOnly={isDataEntryDisabled}
          />
        </div>
      )}

      {/* No Selection State */}
      {!filterSelection.subjectId && !loading && (
        <div className={cn(cardStyles.base, cardStyles.normal, 'text-center py-12')}>
          <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
            Select Class and Subject
          </h3>
          <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Use the filters above to select a class and subject to start managing student marks.
          </p>
        </div>
      )}

      {/* Empty Students State */}
      {studentsData && studentsData.students.length === 0 && !loading && (
        <div className={cn(cardStyles.base, cardStyles.normal, 'text-center py-12')}>
          <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
            No Students Found
          </h3>
          <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            No students are enrolled in this class for the selected subject.
          </p>
        </div>
      )}
    </div>
  )
}