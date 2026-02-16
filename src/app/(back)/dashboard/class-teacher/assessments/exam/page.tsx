'use client'

import React, { useState, useEffect } from 'react'
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
  Lock
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

  // Selection state
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassSubject[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '')

  // Exam data
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [editedScores, setEditedScores] = useState<Map<string, number | null>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

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

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const scoresToSave = Array.from(editedScores.entries()).map(([studentId, score]) => ({
        studentId,
        score,
      }))

      const response = await fetch('/api/class-teacher/assessments/exam/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: examData.examEntry.id,
          scores: scoresToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save scores')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  // Submit final exam scores
  const handleSubmitFinal = async () => {
    if (!examData) return

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
            examId: examData.examEntry.id,
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
          examId: examData.examEntry.id,
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {examData.examEntry.name} - {examData.subject.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {examData.class.name} • {examData.examEntry.studentScores.length} students • Max: {examData.examEntry.maxScore}
                </p>
              </div>

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
                    Score (/{examData.examEntry.maxScore})
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
                {examData.examEntry.studentScores.map((student, index) => (
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
                      {examData.canEdit ? (
                        <input
                          type="number"
                          min="0"
                          max={examData.examEntry.maxScore}
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
          {examData.examEntry.studentScores.length === 0 && (
            <div className="p-8 text-center">
              <TrendingUp className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No students found in this class</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}