'use client'

import React, { useState, useEffect, Suspense } from 'react'
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
  Lock
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
 * Continuous Assessment (CA) Entry Page for Teacher Portal
 * Requirements: 5.3, 5.4, 5.5, 5.6
 * - Support multiple CA entries per subject
 * - Proper CA calculation (20% of final grade)
 * - CA-only workflow support
 * - Submission and locking mechanisms
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

function CAEntryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classIdParam = searchParams.get('classId')
  const subjectIdParam = searchParams.get('subjectId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Selection state
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassSubject[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '')

  // CA data
  const [caData, setCaData] = useState<CAData | null>(null)
  const [activeCaId, setActiveCaId] = useState<string | null>(null)
  const [editedScores, setEditedScores] = useState<Map<string, number | null>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

  // CA creation form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCaName, setNewCaName] = useState('')
  const [newCaMaxScore, setNewCaMaxScore] = useState('10')
  const [newCaType, setNewCaType] = useState('assignment')
  const [newCaDescription, setNewCaDescription] = useState('')

  // Fetch assigned classes and subjects on mount
  useEffect(() => {
    async function fetchAssignedClasses() {
      try {
        const response = await fetch('/api/teacher/assessments/classes')
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
          `/api/teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
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

  // Save CA scores as draft
  const handleSaveDraft = async () => {
    if (!caData || !activeCaId || !hasChanges) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
        studentId,
        score,
      }))

      const response = await fetch('/api/teacher/assessments/ca/scores', {
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

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
      }

      setEditedScores(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  // Submit final CA scores
  const handleSubmitFinal = async () => {
    if (!caData || !activeCaId) return

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

        await fetch('/api/teacher/assessments/ca/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caId: activeCaId,
            scores: scoresToSave,
            isDraft: false,
          }),
        })
      }

      // Submit final scores
      const response = await fetch('/api/teacher/assessments/ca/submit', {
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

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
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

    try {
      const response = await fetch('/api/teacher/assessments/ca', {
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
        `/api/teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
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
    }
  }

  // Delete CA entry
  const handleDeleteCA = async (caId: string) => {
    if (!window.confirm('Are you sure you want to delete this CA entry? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/teacher/assessments/ca/${caId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete CA entry')
      }

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/teacher/assessments/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
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
        href="/teacher/assessments"
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
                <div className="mb-6 p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
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
                    <Button onClick={handleCreateCA} disabled={!newCaName.trim()}>
                      Create CA Entry
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
                {caData.caEntries.length > 0 ? (
                  caData.caEntries.map((ca) => (
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
                  <div className="text-center py-6">
                    <FileText className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                      No CA entries created yet. Click "New CA Entry" to create one.
                    </p>
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
                      Enter scores out of {activeCa.maxScore}. Save as draft to continue later, or submit final scores when complete.
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

              {/* Scores Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        Admission No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        Score (/{activeCa.maxScore})
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {activeCa.studentScores.map((student, index) => (
                      <tr key={student.studentId} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                        <td className="px-4 py-3 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            {student.studentName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {student.admissionNumber}
                        </td>
                        <td className="px-4 py-3">
                          {caData.canEdit ? (
                            <input
                              type="number"
                              min="0"
                              max={activeCa.maxScore}
                              step="0.5"
                              value={getScoreValue(student)}
                              onChange={(e) => handleScoreChange(student.studentId, e.target.value)}
                              className="w-20 px-2 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                              placeholder="-"
                            />
                          ) : (
                            <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {student.score !== null ? student.score : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {student.grade || '-'}
                        </td>
                        <td className="px-4 py-3">
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
                    ))}
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
export default function CAEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CAEntryPageContent />
    </Suspense>
  )
}
