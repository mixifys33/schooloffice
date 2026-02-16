'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  Edit3,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  Lock,
  Cloud,
  CloudOff,
  Search,
  X,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  teacherColors,
  transitions,
  errorMessages
} from '@/lib/teacher-ui-standards'

/**
 * Exam Entry Page for Class Teacher Portal
 * Requirements: 5.3, 5.4, 5.5, 5.6
 * - Support exam entries (80% of final grade)
 * - Exam-only workflow support
 * - Submission and locking mechanisms
 * - Enhanced with class management features
 */

interface StudentExam {
  studentId: string
  studentName: string
  admissionNumber: string
  score: number | null
  maxScore: number
  grade: string | null
  isDraft: boolean
}

interface ExamEntry {
  id: string
  name: string
  maxScore: number
  date: string
  type: string
  description: string
  studentScores: StudentExam[]
  isSubmitted: boolean
  submittedAt: string | null
}

interface SubjectOption {
  id: string
  name: string
}

interface ClassOption {
  id: string
  name: string
  streamName: string | null
}

interface ExamData {
  class: ClassOption
  subject: SubjectOption
  examEntry: ExamEntry
  isPublished: boolean
  isTermActive: boolean
  canEdit: boolean
  lockMessage: string | null
}

interface AssignedClassSubject {
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

export default function ClassTeacherExamEntryPage() {
  const searchParams = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const subjectIdParam = searchParams.get('subjectId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Selection state
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassSubject[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '')

  // Exam data
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [editedScores, setEditedScores] = useState<Map<string, number | null>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)
  
  // Search, Sort, and Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'score-asc' | 'score-desc' | 'none'>('none')
  const [filterBy, setFilterBy] = useState<'all' | 'no-scores' | 'with-scores'>('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Fetch assigned classes and subjects on mount
  useEffect(() => {
    async function fetchAssignedClasses() {
      try {
        const response = await fetch('/api/class-teacher/assessments/classes')
        if (!response.ok) {
          throw new Error('Failed to fetch assigned classes')
        }
        const data = await response.json()
        setAssignedClasses(data.classes || [])
        
        // Set defaults if params not provided
        if (!classIdParam && data.classes?.length > 0) {
          setSelectedClassId(data.classes[0].classId)
        }
        if (!subjectIdParam && data.classes?.length > 0) {
          setSelectedSubjectId(data.classes[0].subjectId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load classes')
      }
    }

    fetchAssignedClasses()
  }, [classIdParam, subjectIdParam])

  // Fetch exam data when selections are made
  useEffect(() => {
    async function fetchExamData() {
      if (!selectedClassId || !selectedSubjectId) {
        setExamData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/class-teacher/assessments/exam?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch exam data')
        }

        const data = await response.json()
        setExamData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam data')
      } finally {
        setLoading(false)
      }
    }

    fetchExamData()
  }, [selectedClassId, selectedSubjectId])

  // Load scores from localStorage on mount (backup in case of page reload)
  useEffect(() => {
    if (!examData?.examEntry?.id) return
    
    const examId = examData.examEntry.id
    if (examId === 'pending' || examId.length !== 24) return
    
    const storageKey = `exam-scores-${examId}`
    const savedScores = localStorage.getItem(storageKey)
    
    if (savedScores) {
      try {
        const parsed = JSON.parse(savedScores) as Record<string, number | null>
        const scoresMap = new Map<string, number | null>(Object.entries(parsed))
        setEditedScores(scoresMap)
        setHasChanges(scoresMap.size > 0)
        console.log('✅ Restored unsaved scores from localStorage')
      } catch (err) {
        console.error('Failed to restore scores from localStorage:', err)
      }
    }
  }, [examData?.examEntry?.id])

  // Save scores to localStorage whenever they change (backup)
  useEffect(() => {
    if (!examData?.examEntry?.id || editedScores.size === 0) return
    
    const examId = examData.examEntry.id
    if (examId === 'pending' || examId.length !== 24) return
    
    const storageKey = `exam-scores-${examId}`
    const scoresObj = Object.fromEntries(editedScores)
    localStorage.setItem(storageKey, JSON.stringify(scoresObj))
  }, [editedScores, examData?.examEntry?.id])

  // Auto-save function with debouncing
  const autoSaveScores = useCallback(async () => {
    if (!examData || !examData.examEntry || editedScores.size === 0 || !examData.canEdit) return
    
    const examId = examData.examEntry.id
    
    // Skip auto-save if exam entry hasn't been created yet
    if (examId === 'pending' || examId.length !== 24 || !/^[a-f0-9]{24}$/i.test(examId)) {
      console.log('⚠️ Skipping auto-save: Exam entries not created yet. Please save manually first.')
      return
    }
    
    setAutoSaving(true)
    
    try {
      const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
        studentId,
        score,
      }))

      const response = await fetch('/api/class-teacher/assessments/exam/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: examId,
          scores: scoresToSave,
          isDraft: true, // Always save as draft during auto-save
        }),
      })

      if (!response.ok) {
        // Silently skip 404 errors (exam entries not created yet)
        if (response.status === 404) {
          console.log('⚠️ Exam entries not created yet. Skipping auto-save.')
          return
        }
        
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.details || errorData.error || 'Auto-save failed'
        console.error('❌ Auto-save failed:', response.status, errorMsg)
        throw new Error(errorMsg)
      }

      setLastSaved(new Date())
      
      // Clear localStorage backup after successful save
      const storageKey = `exam-scores-${examId}`
      localStorage.removeItem(storageKey)
      
      console.log('✅ Auto-saved scores to database')
    } catch (err) {
      console.error('❌ Auto-save error:', err)
      // Don't show error to user for auto-save failures
    } finally {
      setAutoSaving(false)
    }
  }, [examData, editedScores])

  // Trigger auto-save when scores change (with 2-second debounce)
  useEffect(() => {
    if (!hasChanges || !examData?.canEdit) return
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveScores()
    }, 2000) // 2 seconds debounce

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasChanges, autoSaveScores, examData?.canEdit])

  // Auto-save on page unload (using sendBeacon for reliability)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && examData?.examEntry?.id && examData.canEdit) {
        const examId = examData.examEntry.id
        
        // Skip if exam entry not created yet
        if (examId === 'pending' || examId.length !== 24) return
        
        const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
          studentId,
          score,
        }))

        // Use sendBeacon for reliable save on page close
        const blob = new Blob([JSON.stringify({
          examId: examId,
          scores: scoresToSave,
          isDraft: true,
        })], { type: 'application/json' })
        
        navigator.sendBeacon('/api/class-teacher/assessments/exam/scores', blob)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      isUnmountingRef.current = true
    }
  }, [hasChanges, examData, editedScores])

  // Handle score change
  const handleScoreChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)

    // Validate against max score
    if (numValue !== null && examData) {
      if (numValue < 0 || numValue > examData.examEntry.maxScore) {
        return // Invalid value, don't update
      }
    }

    setEditedScores(prev => {
      const newMap = new Map(prev)
      newMap.set(studentId, numValue)
      return newMap
    })
    setHasChanges(true)
  }

  // Get current score value for a student
  const getScoreValue = (student: StudentExam): string => {
    if (editedScores.has(student.studentId)) {
      const edited = editedScores.get(student.studentId)
      return edited === null || edited === undefined ? '' : edited.toString()
    }
    return student.score === null ? '' : student.score.toString()
  }

  // Save exam scores as draft
  const handleSaveDraft = async () => {
    if (!examData || !hasChanges) return

    const examId = examData.examEntry.id
    
    // Validate examId
    if (!examId || examId === 'new') {
      setError('Invalid exam entry ID. Please refresh the page.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
        studentId,
        score,
      }))

      // If examId is "pending", create exam entries first
      if (examId === 'pending') {
        const createResponse = await fetch('/api/class-teacher/assessments/exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            scores: scoresToSave,
          }),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.error || 'Failed to create exam entries')
        }
      } else {
        // Update existing exam entries
        const response = await fetch('/api/class-teacher/assessments/exam/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: examId,
            scores: scoresToSave,
            isDraft: true,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save scores')
        }
      }

      // Refresh exam data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/exam?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setExamData(data)
      }

      setEditedScores(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Clear localStorage backup
      if (examId !== 'pending') {
        const storageKey = `exam-scores-${examId}`
        localStorage.removeItem(storageKey)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  // Submit final exam scores
  const handleSubmitFinal = async () => {
    if (!examData) return

    const examId = examData.examEntry.id
    
    // Validate examId
    if (!examId || examId === 'new' || examId === 'pending') {
      setError('Please save your scores first before submitting.')
      return
    }

    // Confirm submission
    const confirmed = window.confirm(
      'Are you sure you want to submit final scores? This will notify the administration and scores cannot be changed without approval.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // First save any pending changes
      if (hasChanges) {
        const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
          studentId,
          score,
        }))

        await fetch('/api/class-teacher/assessments/exam/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: examId,
            scores: scoresToSave,
            isDraft: false,
          }),
        })
      }

      // Submit final scores
      const response = await fetch('/api/class-teacher/assessments/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: examId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit scores')
      }

      // Refresh exam data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/exam?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setExamData(data)
      }

      setEditedScores(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Clear localStorage backup
      const storageKey = `exam-scores-${examId}`
      localStorage.removeItem(storageKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit scores')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setSelectedSubjectId('')
    setExamData(null)
  }

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setExamData(null)
  }

  // Get current score for display (edited or saved)
  const getCurrentScore = (student: StudentExam): number | null => {
    if (editedScores.has(student.studentId)) {
      return editedScores.get(student.studentId) ?? null
    }
    return student.score
  }

  // Apply search, filter, and sort to student list
  const getFilteredAndSortedStudents = () => {
    if (!examData) return []
    
    let students = [...examData.examEntry.studentScores]
    
    // Apply filter
    if (filterBy === 'no-scores') {
      students = students.filter(s => {
        const score = getCurrentScore(s)
        return score === null || score === 0
      })
    } else if (filterBy === 'with-scores') {
      students = students.filter(s => {
        const score = getCurrentScore(s)
        return score !== null && score > 0
      })
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      students = students.filter(s => 
        s.studentName.toLowerCase().includes(query) ||
        s.admissionNumber.toLowerCase().includes(query) ||
        (getCurrentScore(s)?.toString() || '').includes(query)
      )
    }
    
    // Apply sort
    if (sortBy !== 'none') {
      students.sort((a, b) => {
        if (sortBy === 'name-asc') {
          return a.studentName.localeCompare(b.studentName)
        } else if (sortBy === 'name-desc') {
          return b.studentName.localeCompare(a.studentName)
        } else if (sortBy === 'score-asc' || sortBy === 'score-desc') {
          const scoreA = getCurrentScore(a) ?? -1
          const scoreB = getCurrentScore(b) ?? -1
          return sortBy === 'score-asc' ? scoreA - scoreB : scoreB - scoreA
        }
        return 0
      })
    }
    
    return students
  }

  const filteredStudents = getFilteredAndSortedStudents()
  const hasActiveFilters = searchQuery.trim() !== '' || filterBy !== 'all' || sortBy !== 'none'

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/class-teacher/assessments"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessments
      </Link>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <TrendingUp className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Exam Entry
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Record student exam scores for your assigned classes and subjects (contributes 80% to final grade)
            </p>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="">Select a class</option>
              {Array.from(
                new Map(assignedClasses.map(c => [c.classId, { id: c.classId, name: c.className }])).values()
              ).map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!selectedClassId}
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a subject</option>
              {assignedClasses
                .filter(c => c.classId === selectedClassId)
                .map((c) => (
                  <option key={c.subjectId} value={c.subjectId}>
                    {c.subjectName}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && selectedSubjectId && (
        <div className="space-y-4">
          <SkeletonLoader variant="card" count={3} />
        </div>
      )}

      {/* Exam Entry Table */}
      {examData && !loading && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
          {/* Lock/Status Banner */}
          {examData.lockMessage && (
            <div className="bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-b border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
                <Lock className="h-5 w-5" />
                <span>{examData.lockMessage}</span>
              </div>
            </div>
          )}

          {/* Submitted Status */}
          {examData.examEntry.submittedAt && !examData.isPublished && (
            <div className="bg-[var(--info-light)] dark:bg-[var(--info-dark)] border-b border-[var(--info-light)] dark:border-[var(--info-dark)] p-4">
              <div className="flex items-center gap-2 text-[var(--accent-hover)] dark:text-[var(--info)]">
                <CheckCircle className="h-5 w-5" />
                <span>
                  Scores submitted on {new Date(examData.examEntry.submittedAt).toLocaleDateString('en-UG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {examData.canEdit && (
            <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] text-sm">
                <Info className="h-4 w-4" />
                <span>
                  Enter exam scores out of {examData.examEntry.maxScore}. Save as draft to continue later, or submit final scores when complete.
                </span>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {examData.examEntry.name} - {examData.subject.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {examData.class.name} • {filteredStudents.length} of {examData.examEntry.studentScores.length} students • Max: {examData.examEntry.maxScore}
                </p>
              </div>

              {/* Auto-save Status & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Auto-save Status */}
                {examData.canEdit && (
                  <div className="flex items-center gap-2 text-sm">
                    {autoSaving ? (
                      <>
                        <Cloud className="h-4 w-4 text-[var(--accent-primary)] animate-pulse" />
                        <span className="text-[var(--text-muted)]">Saving...</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <Cloud className="h-4 w-4 text-[var(--chart-green)]" />
                        <span className="text-[var(--text-muted)]">
                          Saved {lastSaved.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : hasChanges ? (
                      <>
                        <CloudOff className="h-4 w-4 text-[var(--warning-dark)]" />
                        <span className="text-[var(--warning-dark)]">Unsaved changes</span>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Action Buttons */}
                {examData.canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={!hasChanges || saving || submitting}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Now'}
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

            {/* Search, Filter, Sort Controls */}
            {examData.canEdit && (
              <div className="mt-4">
                {/* Mobile: Collapsible Controls */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      Search & Filters {hasActiveFilters && <span className="ml-2 px-2 py-0.5 bg-[var(--accent-primary)] text-white text-xs rounded">Active</span>}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showMobileFilters && (
                    <div className="mt-3 space-y-3 p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Search students..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-9 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <X className="h-4 w-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                          </button>
                        )}
                      </div>

                      {/* Filter */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Filter</label>
                        <select
                          value={filterBy}
                          onChange={(e) => setFilterBy(e.target.value as 'all' | 'no-scores' | 'with-scores')}
                          className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                        >
                          <option value="all">All Students</option>
                          <option value="no-scores">No Scores</option>
                          <option value="with-scores">With Scores</option>
                        </select>
                      </div>

                      {/* Sort */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Sort</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'none' | 'name-asc' | 'name-desc' | 'score-desc' | 'score-asc')}
                          className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                        >
                          <option value="none">Default Order</option>
                          <option value="name-asc">Name A-Z</option>
                          <option value="name-desc">Name Z-A</option>
                          <option value="score-desc">Score ↓ (High to Low)</option>
                          <option value="score-asc">Score ↑ (Low to High)</option>
                        </select>
                      </div>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setFilterBy('all')
                            setSortBy('none')
                          }}
                          className="w-full px-3 py-2 text-sm text-[var(--accent-primary)] hover:bg-[var(--bg-main)] dark:hover:bg-[var(--text-primary)] rounded-lg transition-colors"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop: Inline Controls */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                      </button>
                    )}
                  </div>

                  {/* Filter */}
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as 'all' | 'no-scores' | 'with-scores')}
                    className="px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="all">All Students</option>
                    <option value="no-scores">No Scores</option>
                    <option value="with-scores">With Scores</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'none' | 'name-asc' | 'name-desc' | 'score-desc' | 'score-asc')}
                    className="px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="none">Default Order</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="score-desc">Score ↓ (High to Low)</option>
                    <option value="score-asc">Score ↑ (Low to High)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Scores Table - Responsive */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <tr>
                  {/* # - Hidden on mobile */}
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider w-12">
                    #
                  </th>
                  {/* Student Name - Always visible */}
                  <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Student
                  </th>
                  {/* Admission No - Hidden on mobile */}
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Admission No.
                  </th>
                  {/* Score - Always visible */}
                  <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Score
                  </th>
                  {/* Grade - Always visible */}
                  <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Grade
                  </th>
                  {/* Status - Hidden on mobile */}
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredStudents.map((student, index) => {
                  const currentScore = getCurrentScore(student)
                  const scoreValue = getScoreValue(student)
                  
                  return (
                    <tr key={student.studentId} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                      {/* # - Hidden on mobile */}
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                        {index + 1}
                      </td>
                      
                      {/* Student Name - Always visible */}
                      <td className="px-3 md:px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm md:text-base">
                            {student.studentName}
                          </span>
                          {/* Show admission number on mobile as subtitle */}
                          <span className="lg:hidden text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-0.5">
                            {student.admissionNumber}
                          </span>
                        </div>
                      </td>
                      
                      {/* Admission No - Hidden on mobile (shown in name cell) */}
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        {student.admissionNumber}
                      </td>
                      
                      {/* Score - Always visible */}
                      <td className="px-3 md:px-4 py-3">
                        {examData.canEdit ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              min="0"
                              max={examData.examEntry.maxScore}
                              step="0.5"
                              value={scoreValue}
                              onChange={(e) => handleScoreChange(student.studentId, e.target.value)}
                              className="w-16 md:w-24 px-2 md:px-3 py-1.5 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm md:text-base focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                              /{examData.examEntry.maxScore}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] font-medium">
                              {currentScore !== null ? currentScore : '-'}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                              /{examData.examEntry.maxScore}
                            </span>
                          </div>
                        )}
                      </td>
                      
                      {/* Grade - Always visible */}
                      <td className="px-3 md:px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-base md:text-lg font-bold text-[var(--accent-primary)]">
                            {student.grade || '-'}
                          </span>
                          {/* Show status badge on mobile */}
                          <div className="md:hidden">
                            {student.isDraft ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] text-[var(--warning-dark)] dark:text-[var(--warning)]">
                                Draft
                              </span>
                            ) : currentScore !== null && currentScore > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--success-light)] dark:bg-[var(--success-dark)] text-[var(--chart-green)] dark:text-[var(--success)]">
                                Saved
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Status - Hidden on mobile (shown in grade cell) */}
                      <td className="hidden md:table-cell px-4 py-3">
                        {student.isDraft ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] text-[var(--warning-dark)] dark:text-[var(--warning)]">
                            Draft
                          </span>
                        ) : currentScore !== null && currentScore > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--success-light)] dark:bg-[var(--success-dark)] text-[var(--chart-green)] dark:text-[var(--success)]">
                            Saved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center">
              <TrendingUp className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {hasActiveFilters ? 'No students match your search or filters' : 'No students found in this class'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterBy('all')
                    setSortBy('none')
                  }}
                  className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}