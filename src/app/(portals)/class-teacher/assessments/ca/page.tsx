'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Plus,
  Edit3,
  Trash2,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Info,
  Lock,
  Cloud,
  CloudOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
 * Continuous Assessment (CA) Entry Page for Class Teacher Portal
 * Requirements: 5.3, 5.4, 5.5, 5.6
 * - Support multiple CA entries per subject
 * - Proper CA calculation (20% of final grade)
 * - CA-only workflow support
 * - Submission and locking mechanisms
 * - Enhanced with class management features
 */

interface StudentCA {
  studentId: string
  studentName: string
  admissionNumber: string
  score: number | null
  maxScore: number
  grade: string | null
  isDraft: boolean
}

interface CAEntry {
  id: string
  name: string
  maxScore: number
  date: string
  type: string
  description: string
  studentScores: StudentCA[]
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

interface CAData {
  class: ClassOption
  subject: SubjectOption
  caEntries: CAEntry[]
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

function ClassTeacherCAEntryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classIdParam = searchParams.get('classId')
  const subjectIdParam = searchParams.get('subjectId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Selection state
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassSubject[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '')

  // CA data
  const [caData, setCaData] = useState<CAData | null>(null)
  const [activeCaId, setActiveCaId] = useState<string | null>(null)
  const [editedScores, setEditedScores] = useState<Map<string, number | null>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)

  // CA creation form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCaName, setNewCaName] = useState('')
  const [newCaMaxScore, setNewCaMaxScore] = useState('10')
  const [newCaType, setNewCaType] = useState('assignment')
  const [newCaDescription, setNewCaDescription] = useState('')
  
  // Search, Sort, and Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'score-asc' | 'score-desc' | 'none'>('none')
  const [filterBy, setFilterBy] = useState<'all' | 'no-scores' | 'with-scores'>('all')

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

  // Load scores from localStorage on mount (backup in case of page reload)
  useEffect(() => {
    if (!activeCaId) return
    
    const storageKey = `ca-scores-${activeCaId}`
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
  }, [activeCaId])

  // Save scores to localStorage whenever they change (backup)
  useEffect(() => {
    if (!activeCaId || editedScores.size === 0) return
    
    const storageKey = `ca-scores-${activeCaId}`
    const scoresObj = Object.fromEntries(editedScores)
    localStorage.setItem(storageKey, JSON.stringify(scoresObj))
  }, [editedScores, activeCaId])

  // Auto-save function with debouncing
  const autoSaveScores = useCallback(async () => {
    if (!caData || !activeCaId || editedScores.size === 0 || !caData.canEdit) return
    
    // Skip auto-save if CA entry hasn't been created yet
    if (activeCaId === 'new' || activeCaId.length !== 24 || !/^[a-f0-9]{24}$/i.test(activeCaId)) {
      console.log('⚠️ Skipping auto-save: CA entry not created yet. Please save manually first.')
      return
    }
    
    setAutoSaving(true)
    
    try {
      const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
        studentId,
        score,
      }))

      const response = await fetch('/api/class-teacher/assessments/ca/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caId: activeCaId,
          scores: scoresToSave,
          isDraft: true, // Always save as draft during auto-save
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.details || errorData.error || 'Auto-save failed'
        console.error('❌ Auto-save failed:', response.status, errorMsg)
        throw new Error(errorMsg)
      }

      setLastSaved(new Date())
      
      // Clear localStorage backup after successful save
      const storageKey = `ca-scores-${activeCaId}`
      localStorage.removeItem(storageKey)
      
      console.log('✅ Auto-saved scores to database')
    } catch (err) {
      console.error('❌ Auto-save error:', err)
      // Don't show error to user for auto-save failures
    } finally {
      setAutoSaving(false)
    }
  }, [caData, activeCaId, editedScores])

  // Trigger auto-save when scores change (with 2-second debounce)
  useEffect(() => {
    if (!hasChanges || !caData?.canEdit) return
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveScores()
    }, 2000) // 2 seconds debounce
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasChanges, autoSaveScores, caData?.canEdit])

  // Save on page unload/close (using beforeunload event)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && !isUnmountingRef.current) {
        // Try to save using sendBeacon (works even when page is closing)
        if (activeCaId && editedScores.size > 0) {
          const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
            studentId,
            score,
          }))
          
          const blob = new Blob([JSON.stringify({
            caId: activeCaId,
            scores: scoresToSave,
            isDraft: true,
          })], { type: 'application/json' })
          
          navigator.sendBeacon('/api/class-teacher/assessments/ca/scores', blob)
        }
        
        // Show warning
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      isUnmountingRef.current = true
    }
  }, [hasChanges, activeCaId, editedScores])

  // Fetch CA data when selections are made
  useEffect(() => {
    async function fetchCaData() {
      if (!selectedClassId || !selectedSubjectId) {
        setCaData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/class-teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch CA data')
        }

        const data = await response.json()
        setCaData(data)
        
        // Set first CA as active if none selected
        if (data.caEntries.length > 0 && !activeCaId) {
          setActiveCaId(data.caEntries[0].id)
        }
        
        // Clear edited scores and changes flag after loading fresh data
        setEditedScores(new Map())
        setHasChanges(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CA data')
      } finally {
        setLoading(false)
      }
    }

    fetchCaData()
  }, [selectedClassId, selectedSubjectId, activeCaId])

  // Handle score change
  const handleScoreChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)

    // Validate against max score
    if (numValue !== null && caData && activeCaId) {
      const activeCa = caData.caEntries.find(ca => ca.id === activeCaId)
      if (activeCa && numValue < 0 || numValue > activeCa.maxScore) {
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
  const getScoreValue = (student: StudentCA): string => {
    if (editedScores.has(student.studentId)) {
      const edited = editedScores.get(student.studentId)
      return edited === null || edited === undefined ? '' : edited.toString()
    }
    return student.score === null ? '' : student.score.toString()
  }

  // Save CA scores as draft (manual save)
  const handleSaveDraft = async () => {
    if (!caData || !activeCaId) return

    // If no changes, just show success message
    if (!hasChanges) {
      setSuccessMessage('All scores are already saved')
      setTimeout(() => setSuccessMessage(null), 2000)
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

      const response = await fetch('/api/class-teacher/assessments/ca/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caId: activeCaId,
          scores: scoresToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save scores')
      }

      // Clear localStorage backup after successful save
      const storageKey = `ca-scores-${activeCaId}`
      localStorage.removeItem(storageKey)

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
      }

      setEditedScores(new Map())
      setHasChanges(false)
      setLastSaved(new Date())
      setSuccessMessage('Scores saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  // Submit final CA scores (changes status to SUBMITTED, but scores must be saved first)
  const handleSubmitFinal = async () => {
    if (!caData || !activeCaId) return

    // Validate caId FIRST before showing confirmation
    if (activeCaId === 'new' || activeCaId.length !== 24 || !/^[a-f0-9]{24}$/i.test(activeCaId)) {
      setError('Please create the CA entry first before submitting. Click "Create CA Entry" button.')
      return
    }

    // Show confirmation dialog FIRST (before any API calls)
    const confirmed = window.confirm(
      'Are you sure you want to submit final scores? This will lock the scores and notify the administration. Scores cannot be changed without approval after submission.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // IMPORTANT: First save any pending changes as DRAFT
      if (hasChanges && editedScores.size > 0) {
        const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
          studentId,
          score,
        }))

        const saveResponse = await fetch('/api/class-teacher/assessments/ca/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caId: activeCaId,
            scores: scoresToSave,
            isDraft: true, // Save as draft first
          }),
        })

        if (!saveResponse.ok) {
          throw new Error('Failed to save scores before submission')
        }
        
        console.log('✅ Saved pending scores before submission')
      }

      // Now submit (changes status to SUBMITTED)
      const response = await fetch('/api/class-teacher/assessments/ca/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caId: activeCaId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit scores')
      }

      // Clear localStorage backup after successful submission
      const storageKey = `ca-scores-${activeCaId}`
      localStorage.removeItem(storageKey)

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
      }

      setEditedScores(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit scores')
    } finally {
      setSubmitting(false)
    }
  }

  // Create new CA entry
  const handleCreateCA = async () => {
    if (!selectedClassId || !selectedSubjectId || !newCaName.trim()) return

    setCreating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/class-teacher/assessments/ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          name: newCaName.trim(),
          maxScore: parseFloat(newCaMaxScore),
          type: newCaType,
          description: newCaDescription.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create CA entry')
      }

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
        
        // Set the new CA as active
        if (data.caEntries.length > 0) {
          setActiveCaId(data.caEntries[data.caEntries.length - 1].id)
        }
      }

      // Reset form
      setNewCaName('')
      setNewCaMaxScore('10')
      setNewCaType('assignment')
      setNewCaDescription('')
      setShowCreateForm(false)
      
      setSuccessMessage('CA entry created successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create CA entry')
    } finally {
      setCreating(false)
    }
  }

  // Delete CA entry
  const handleDeleteCA = async (caId: string) => {
    if (!window.confirm('Are you sure you want to delete this CA entry? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/class-teacher/assessments/ca/${caId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete CA entry')
      }

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/class-teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
        
        // If deleted CA was active, set first CA as active
        if (caData?.caEntries.length === 1) {
          setActiveCaId(null)
        } else if (activeCaId === caId && data.caEntries.length > 0) {
          setActiveCaId(data.caEntries[0].id)
        }
      }

      setSuccessMessage('CA entry deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete CA entry')
    }
  }

  // Get active CA data
  const activeCa = caData?.caEntries.find(ca => ca.id === activeCaId)

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setSelectedSubjectId('')
    setCaData(null)
    setActiveCaId(null)
  }

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setCaData(null)
    setActiveCaId(null)
  }

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
            <FileText className="h-6 w-6 text-[var(--chart-green)] dark:text-[var(--chart-green)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Continuous Assessment (CA)
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Record student CA scores for your assigned classes and subjects (contributes 20% to final grade)
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

      {!loading && selectedClassId && selectedSubjectId && caData && (
        <div className="space-y-6">
          {/* CA Entries List */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>CA Entries</CardTitle>
              <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New CA Entry
              </Button>
            </CardHeader>
            <CardContent>
              {/* Create CA Form */}
              {showCreateForm && (
                <div className="mb-6 p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg" data-create-form>
                  <h3 className={cn(typography.h3, 'mb-4')}>Create New CA Entry</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="caName">CA Name</Label>
                      <Input
                        id="caName"
                        value={newCaName}
                        onChange={(e) => setNewCaName(e.target.value)}
                        placeholder="e.g., Assignment 1, Quiz 2, Project"
                      />
                    </div>
                    <div>
                      <Label htmlFor="caMaxScore">Max Score</Label>
                      <Input
                        id="caMaxScore"
                        type="number"
                        value={newCaMaxScore}
                        onChange={(e) => setNewCaMaxScore(e.target.value)}
                        min="1"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="caType">CA Type</Label>
                      <select
                        id="caType"
                        value={newCaType}
                        onChange={(e) => setNewCaType(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      >
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="project">Project</option>
                        <option value="test">Test</option>
                        <option value="practical">Practical</option>
                        <option value="observation">Observation</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="caDescription">Description (Optional)</Label>
                      <Input
                        id="caDescription"
                        value={newCaDescription}
                        onChange={(e) => setNewCaDescription(e.target.value)}
                        placeholder="Brief description of the CA"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={handleCreateCA} 
                      disabled={!newCaName.trim() || creating}
                      className="gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      {creating ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create CA Entry
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewCaName('')
                        setNewCaMaxScore('10')
                        setNewCaType('assignment')
                        setNewCaDescription('')
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* CA Entries */}
              <div className="space-y-3">
                {caData.caEntries.filter(ca => ca.id !== 'new' && ca.id.length === 24).length > 0 ? (
                  caData.caEntries
                    .filter(ca => ca.id !== 'new' && ca.id.length === 24)
                    .map((ca) => (
                    <div
                      key={ca.id}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        activeCaId === ca.id
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]'
                          : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
                          <FileText className="h-4 w-4 text-[var(--chart-green)] dark:text-[var(--chart-green)]" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            {ca.name}
                          </div>
                          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                            Max: {ca.maxScore} • Type: {ca.type} • {ca.studentScores.length} students
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ca.isSubmitted ? 'default' : 'outline'}>
                          {ca.isSubmitted ? 'Submitted' : 'Draft'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={activeCaId === ca.id ? 'default' : 'outline'}
                          onClick={() => {
                            setActiveCaId(ca.id)
                            setEditedScores(new Map())
                            setHasChanges(false)
                          }}
                        >
                          {activeCaId === ca.id ? 'Active' : 'Select'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCA(ca.id)}
                          disabled={ca.isSubmitted}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="max-w-md mx-auto">
                      <div className="p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-[var(--accent-hover)] dark:text-[var(--info)]" />
                      </div>
                      <h3 className={cn(typography.h3, 'mb-2')}>No CA Entries Yet</h3>
                      <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-6">
                        You haven't created any Continuous Assessment entries for this subject yet. 
                        Create your first CA entry to start recording student scores.
                      </p>
                      <Button 
                        onClick={() => {
                          setShowCreateForm(true)
                          // Scroll to form after a brief delay
                          setTimeout(() => {
                            const formElement = document.querySelector('[data-create-form]')
                            if (formElement) {
                              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                          }, 100)
                        }}
                        size="lg" 
                        className="gap-2 transition-all hover:scale-105 active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                        Create Your First CA Entry
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active CA Scores Entry */}
          {activeCa && (
            <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
              {/* Lock/Status Banner */}
              {caData.lockMessage && (
                <div className="bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-b border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
                    <Lock className="h-5 w-5" />
                    <span>{caData.lockMessage}</span>
                  </div>
                </div>
              )}

              {/* Submitted Status */}
              {activeCa.submittedAt && !caData.isPublished && (
                <div className="bg-[var(--info-light)] dark:bg-[var(--info-dark)] border-b border-[var(--info-light)] dark:border-[var(--info-dark)] p-4">
                  <div className="flex items-center gap-2 text-[var(--accent-hover)] dark:text-[var(--info)]">
                    <CheckCircle className="h-5 w-5" />
                    <span>
                      Scores submitted on {new Date(activeCa.submittedAt).toLocaleDateString('en-UG', {
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
              {caData.canEdit && (
                <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] text-sm">
                    <Info className="h-4 w-4" />
                    <span>
                      Enter scores out of {activeCa.maxScore}. Scores are auto-saved as you type (as drafts). Click "Submit Final" when ready to lock and notify administration.
                    </span>
                  </div>
                </div>
              )}

              {/* Table Header */}
              <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {activeCa.name} - {caData.subject.name}
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                      {caData.class.name} • {activeCa.studentScores.length} students • Max: {activeCa.maxScore}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {caData.canEdit && (
                    <div className="flex items-center gap-3">
                      {/* Auto-save indicator */}
                      <div className="flex items-center gap-2 text-sm">
                        {autoSaving ? (
                          <>
                            <Cloud className="h-4 w-4 text-blue-500 animate-pulse" />
                            <span className="text-[var(--text-muted)]">Saving...</span>
                          </>
                        ) : lastSaved ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-[var(--text-muted)]">
                              Saved {lastSaved.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        ) : hasChanges ? (
                          <>
                            <CloudOff className="h-4 w-4 text-amber-500" />
                            <span className="text-[var(--text-muted)]">Unsaved changes</span>
                          </>
                        ) : null}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveDraft}
                          disabled={saving || submitting || !activeCaId || activeCaId === 'new' || activeCaId.length !== 24}
                          className="gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? 'Saving...' : 'Save Now'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSubmitFinal}
                          disabled={submitting || saving || !activeCaId || activeCaId === 'new' || activeCaId.length !== 24}
                          className="gap-2"
                          title={(!activeCaId || activeCaId === 'new' || activeCaId.length !== 24) ? 'Please create a CA entry first' : ''}
                        >
                          <Send className="h-4 w-4" />
                          {submitting ? 'Submitting...' : 'Submit Final'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search, Filter, and Sort Controls */}
              <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                      Search Students
                    </label>
                    <Input
                      type="text"
                      placeholder="Search by name, admission no., or score..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full h-9 px-3 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    >
                      <option value="none">Default Order</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="score-desc">Score (High to Low)</option>
                      <option value="score-asc">Score (Low to High)</option>
                    </select>
                  </div>

                  {/* Filter */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                      Filter
                    </label>
                    <select
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value as any)}
                      className="w-full h-9 px-3 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    >
                      <option value="all">All Students</option>
                      <option value="no-scores">No Scores Only</option>
                      <option value="with-scores">With Scores Only</option>
                    </select>
                  </div>
                </div>
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
                    {(() => {
                      // Get current score for a student (from editedScores or original score)
                      const getCurrentScore = (student: StudentCA): number | null => {
                        if (editedScores.has(student.studentId)) {
                          return editedScores.get(student.studentId) ?? null
                        }
                        return student.score
                      }

                      // Filter students
                      let filteredStudents = activeCa.studentScores.filter(student => {
                        // Apply filter
                        const currentScore = getCurrentScore(student)
                        if (filterBy === 'no-scores' && currentScore !== null && currentScore > 0) {
                          return false
                        }
                        if (filterBy === 'with-scores' && (currentScore === null || currentScore === 0)) {
                          return false
                        }

                        // Apply search
                        if (searchQuery.trim()) {
                          const query = searchQuery.toLowerCase()
                          const nameMatch = student.studentName.toLowerCase().includes(query)
                          const admissionMatch = student.admissionNumber.toLowerCase().includes(query)
                          const scoreMatch = currentScore !== null && currentScore.toString().includes(query)
                          
                          return nameMatch || admissionMatch || scoreMatch
                        }

                        return true
                      })

                      // Sort students
                      if (sortBy !== 'none') {
                        filteredStudents = [...filteredStudents].sort((a, b) => {
                          if (sortBy === 'name-asc') {
                            return a.studentName.localeCompare(b.studentName)
                          }
                          if (sortBy === 'name-desc') {
                            return b.studentName.localeCompare(a.studentName)
                          }
                          if (sortBy === 'score-asc' || sortBy === 'score-desc') {
                            const scoreA = getCurrentScore(a) ?? -1
                            const scoreB = getCurrentScore(b) ?? -1
                            return sortBy === 'score-asc' ? scoreA - scoreB : scoreB - scoreA
                          }
                          return 0
                        })
                      }

                      // Render filtered and sorted students
                      if (filteredStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                              {searchQuery.trim() || filterBy !== 'all' 
                                ? 'No students match your search or filter criteria'
                                : 'No students found in this class'}
                            </td>
                          </tr>
                        )
                      }

                      return filteredStudents.map((student, index) => (
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
                          {caData.canEdit ? (
                            <div className="flex flex-col gap-1">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max={activeCa.maxScore}
                                  step="0.5"
                                  value={getScoreValue(student)}
                                  onChange={(e) => handleScoreChange(student.studentId, e.target.value)}
                                  disabled={!activeCaId || activeCaId === 'new' || activeCaId.length !== 24}
                                  onClick={(e) => {
                                    if (!activeCaId || activeCaId === 'new' || activeCaId.length !== 24) {
                                      e.preventDefault()
                                      setError('⚠️ Please create a CA entry first before entering scores. Click "New CA Entry" button above.')
                                      setTimeout(() => setError(null), 5000)
                                    }
                                  }}
                                  className={`w-16 md:w-24 px-2 md:px-3 py-1.5 border rounded-lg text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm md:text-base focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent ${
                                    !activeCaId || activeCaId === 'new' || activeCaId.length !== 24
                                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 cursor-not-allowed opacity-60'
                                      : 'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] border-[var(--border-default)] dark:border-[var(--border-strong)]'
                                  }`}
                                  placeholder="0"
                                />
                              </div>
                              <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                                /{activeCa.maxScore}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] font-medium">
                                {student.score !== null ? student.score : '-'}
                              </span>
                              <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                                /{activeCa.maxScore}
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
                              ) : student.score !== null ? (
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
                          ) : student.score !== null ? (
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
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {activeCa.studentScores.length === 0 && (
                <div className="p-8 text-center">
                  <FileText className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No students found in this class</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
export default function ClassTeacherCAEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClassTeacherCAEntryPageContent />
    </Suspense>
  )
}
