'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  AlertCircle,
  Save,
  Send,
  Lock,
  CheckCircle,
  Info,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Continuous Assessment Entry Page for Teacher Portal
 * Requirements: New functionality for CA entries
 * - Support multiple CA entries per subject
 * - Proper CA (20%) calculation
 * - Link to competencies
 */

interface CaEntry {
  id: string;
  type: 'assignment' | 'test' | 'project' | 'practical' | 'observation';
  title: string;
  maxScore: number;
  date: string;
  linkedCompetency: string;
  studentScores: {
    studentId: string;
    score: number | null;
  }[];
}

interface Student {
  id: string;
  name: string;
  admissionNumber: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  streamName: string | null;
}

interface CaEntryData {
  class: ClassOption;
  subject: SubjectOption;
  caEntries: CaEntry[];
  students: Student[];
  isPublished: boolean;
  isTermActive: boolean;
  canEdit: boolean;
  lockMessage: string | null;
}

interface AssignedClassSubject {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

function ContinuousAssessmentPageContent() {
  const searchParams = useSearchParams()
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
  const [caData, setCaData] = useState<CaEntryData | null>(null)
  const [currentCaEntry, setCurrentCaEntry] = useState<CaEntry | null>(null)
  const [editingScores, setEditingScores] = useState<Record<string, number | null>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch assigned classes and subjects on mount
  useEffect(() => {
    async function fetchAssignedClasses() {
      try {
        const response = await fetch('/api/teacher/marks/classes')
        if (!response.ok) {
          throw new Error('Failed to fetch assigned classes')
        }
        const data = await response.json()
        setAssignedClasses(data.classes || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load classes')
      }
    }

    fetchAssignedClasses()
  }, [])

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
          `/api/teacher/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch CA data')
        }

        const data = await response.json()
        setCaData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CA data')
      } finally {
        setLoading(false)
      }
    }

    fetchCaData()
  }, [selectedClassId, selectedSubjectId])

  // Handle score change
  const handleScoreChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)

    // Validate against max score if we have current entry
    if (numValue !== null && currentCaEntry) {
      if (numValue < 0 || numValue > currentCaEntry.maxScore) {
        return // Invalid value, don't update
      }
    }

    setEditingScores(prev => ({
      ...prev,
      [studentId]: numValue
    }))
    setHasChanges(true)
  }

  // Create a new CA entry
  const handleCreateCaEntry = () => {
    const newEntry: CaEntry = {
      id: `ca-${Date.now()}`,
      type: 'assignment',
      title: 'New Assignment',
      maxScore: 20,
      date: new Date().toISOString().split('T')[0],
      linkedCompetency: '',
      studentScores: caData?.students.map(student => ({
        studentId: student.id,
        score: null
      })) || []
    }
    setCurrentCaEntry(newEntry)
    setEditingScores({})
    setHasChanges(false)
  }

  // Edit an existing CA entry
  const handleEditCaEntry = (entry: CaEntry) => {
    setCurrentCaEntry(entry)
    // Initialize editing scores with current values
    const scores: Record<string, number | null> = {}
    entry.studentScores.forEach(score => {
      scores[score.studentId] = score.score
    })
    setEditingScores(scores)
    setHasChanges(false)
  }

  // Save CA entry
  const handleSaveCaEntry = async () => {
    if (!currentCaEntry || !caData) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Update scores with edited values
      const updatedScores = currentCaEntry.studentScores.map(score => ({
        ...score,
        score: editingScores[score.studentId] ?? score.score
      }))

      const updatedEntry = {
        ...currentCaEntry,
        studentScores: updatedScores
      }

      const response = await fetch('/api/teacher/ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          caEntry: updatedEntry,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save CA entry')
      }

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/teacher/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
      }

      setEditingScores({})
      setHasChanges(false)
      setSuccessMessage('CA entry saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CA entry')
    } finally {
      setSaving(false)
    }
  }

  // Submit final CA entry
  const handleSubmitCaEntry = async () => {
    if (!currentCaEntry || !caData) return

    // Confirm submission
    const confirmed = window.confirm(
      'Are you sure you want to submit this CA entry? This will notify the administration and scores cannot be changed without approval.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Update scores with edited values
      const updatedScores = currentCaEntry.studentScores.map(score => ({
        ...score,
        score: editingScores[score.studentId] ?? score.score
      }))

      const updatedEntry = {
        ...currentCaEntry,
        studentScores: updatedScores
      }

      // Submit final CA entry
      const response = await fetch('/api/teacher/ca/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          caEntry: updatedEntry,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit CA entry')
      }

      // Refresh CA data
      const refreshResponse = await fetch(
        `/api/teacher/ca?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setCaData(data)
      }

      setEditingScores({})
      setHasChanges(false)
      setCurrentCaEntry(null)
      setSuccessMessage('CA entry submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit CA entry')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setCurrentCaEntry(null)
    setEditingScores({})
    setHasChanges(false)
  }

  // Get unique classes from assigned class-subject combinations
  const uniqueClasses = Array.from(
    new Map(assignedClasses.map(c => [c.classId, { id: c.classId, name: c.className }])).values()
  )

  // Get subjects for selected class
  const subjectsForClass = assignedClasses
    .filter(c => c.classId === selectedClassId)
    .map(c => ({ id: c.subjectId, name: c.subjectName }))

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setSelectedSubjectId('')
    setCaData(null)
    setCurrentCaEntry(null)
  }

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setCaData(null)
    setCurrentCaEntry(null)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--White-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <BookOpen className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--White-pure)]">
              Continuous Assessment (CA)
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Manage CA entries contributing to 20% of final grade
            </p>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="">Select a class</option>
              {uniqueClasses.map((cls) => (
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
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a subject</option>
              {subjectsForClass.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Create New CA Entry Button */}
          <div className="flex items-end">
            <button
              className="w-full bg-[var(--accent-hover)] text-white p-2 rounded hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!selectedClassId || !selectedSubjectId}
              onClick={handleCreateCaEntry}
            >
              <Plus className="h-4 w-4" />
              New CA Entry
            </button>
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

      {/* CA Entry Editing View */}
      {currentCaEntry && caData && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
          {/* CA Entry Details */}
          <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)]">
                  {currentCaEntry.title}
                </h2>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {caData.class.name} - {caData.subject.name} • {currentCaEntry.type}
                </p>
              </div>

              {/* Action Buttons */}
              {caData.canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCaEntry}
                    disabled={!hasChanges || saving || submitting}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitCaEntry}
                    disabled={submitting || saving}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting...' : 'Submit Final'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="gap-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={currentCaEntry.title}
                  onChange={(e) => setCurrentCaEntry({...currentCaEntry, title: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Max Score (out of {currentCaEntry.maxScore})
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={currentCaEntry.maxScore}
                  onChange={(e) => setCurrentCaEntry({...currentCaEntry, maxScore: parseInt(e.target.value) || 20})}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={currentCaEntry.date}
                  onChange={(e) => setCurrentCaEntry({...currentCaEntry, date: e.target.value})}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Linked Competency
                </label>
                <input
                  type="text"
                  value={currentCaEntry.linkedCompetency}
                  onChange={(e) => setCurrentCaEntry({...currentCaEntry, linkedCompetency: e.target.value})}
                  placeholder="e.g., Basic Algebra Concepts"
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Student Scores Table */}
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
                    Score (/{currentCaEntry.maxScore})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {caData.students.map((student, index) => {
                  const currentScore = currentCaEntry.studentScores.find(s => s.studentId === student.id)?.score;
                  const editedScore = editingScores[student.id];
                  const displayScore = editedScore !== undefined ? editedScore : currentScore;

                  return (
                    <tr key={student.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                      <td className="px-4 py-3 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)]">
                          {student.name}
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
                            max={currentCaEntry.maxScore}
                            step="0.5"
                            value={displayScore !== null ? displayScore : ''}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-20 px-2 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--White-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                            placeholder="-"
                          />
                        ) : (
                          <span className="text-[var(--text-primary)] dark:text-[var(--White-pure)]">
                            {displayScore !== null ? displayScore : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CA Entries List View */}
      {caData && !currentCaEntry && !loading && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)]">
                  {caData.class.name} - {caData.subject.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {caData.caEntries.length} CA entries • {caData.students.length} students
                </p>
              </div>
            </div>
          </div>

          {/* CA Entries Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Max Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Linked Competency
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {caData.caEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)]">
                      {entry.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {entry.maxScore}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {new Date(entry.date).toLocaleDateString('en-UG')}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {entry.linkedCompetency || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditCaEntry(entry)}
                          className="p-1.5 rounded hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]"
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-[var(--chart-red)] dark:text-[var(--danger)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grading Logic Info */}
          <div className="p-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/30">
            <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)] mb-2">Grading Logic</h3>
            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              <p>• CA entries contribute to 20% of the final grade</p>
              <p>• Each entry is converted to a percentage of its maximum score</p>
              <p>• Percentages are averaged to calculate the CA contribution</p>
              <p>• Formula: (Sum of all CA percentages) ÷ (Number of CA entries) × 20</p>
            </div>
          </div>
        </div>
      )}

      {/* No Selection State */}
      {!selectedSubjectId && !loading && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
          <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--White-pure)] mb-2">
            Select Class and Subject
          </h3>
          <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            Choose a class and subject from the dropdowns above to start managing CA entries.
          </p>
        </div>
      )}
    </div>
  )
}

export default function ContinuousAssessmentPage() {
  return (
    <Suspense fallback={<SkeletonLoader variant="card" count={3} />}>
      <ContinuousAssessmentPageContent />
    </Suspense>
  )
}
