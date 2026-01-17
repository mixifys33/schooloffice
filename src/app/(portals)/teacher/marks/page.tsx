'use client'

import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Marks Entry Page for Teacher Portal
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * - Display only students in assigned class
 * - Allow draft saves while term is active and results unpublished
 * - Implement final submission with administration notification
 * - Show read-only mode after results publication
 * - Display lock message when attempting edit after publication
 */

interface StudentMark {
  studentId: string
  studentName: string
  admissionNumber: string
  score: number | null
  maxScore: number
  grade: string | null
  isDraft: boolean
}

interface ExamOption {
  id: string
  name: string
  type: string
  isOpen: boolean
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

interface MarksEntryData {
  exam: ExamOption
  subject: SubjectOption
  class: ClassOption
  students: StudentMark[]
  maxScore: number
  isPublished: boolean
  isTermActive: boolean
  canEdit: boolean
  lockMessage: string | null
  hasUnsavedChanges: boolean
  submittedAt: string | null
}

interface AssignedClassSubject {
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

export default function MarksEntryPage() {
  const searchParams = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const subjectIdParam = searchParams.get('subjectId')
  const examIdParam = searchParams.get('examId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Selection state
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassSubject[]>([])
  const [exams, setExams] = useState<ExamOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '')
  const [selectedExamId, setSelectedExamId] = useState<string>(examIdParam || '')

  // Marks data
  const [marksData, setMarksData] = useState<MarksEntryData | null>(null)
  const [editedMarks, setEditedMarks] = useState<Map<string, number | null>>(new Map())
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

  // Fetch exams when class is selected
  useEffect(() => {
    async function fetchExams() {
      if (!selectedClassId) {
        setExams([])
        return
      }

      try {
        const response = await fetch(`/api/teacher/marks/exams?classId=${selectedClassId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch exams')
        }
        const data = await response.json()
        setExams(data.exams || [])
      } catch (err) {
        console.error('Error fetching exams:', err)
      }
    }

    fetchExams()
  }, [selectedClassId])


  // Fetch marks data when all selections are made
  useEffect(() => {
    async function fetchMarksData() {
      if (!selectedClassId || !selectedSubjectId || !selectedExamId) {
        setMarksData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/teacher/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}&examId=${selectedExamId}`
        )
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch marks data')
        }
        
        const data = await response.json()
        setMarksData(data)
        setEditedMarks(new Map())
        setHasChanges(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marks data')
      } finally {
        setLoading(false)
      }
    }

    fetchMarksData()
  }, [selectedClassId, selectedSubjectId, selectedExamId])

  // Handle mark change
  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    
    // Validate against max score
    if (numValue !== null && marksData) {
      if (numValue < 0 || numValue > marksData.maxScore) {
        return // Invalid value, don't update
      }
    }

    setEditedMarks(prev => {
      const newMap = new Map(prev)
      newMap.set(studentId, numValue)
      return newMap
    })
    setHasChanges(true)
  }

  // Get current mark value for a student
  const getMarkValue = (student: StudentMark): string => {
    if (editedMarks.has(student.studentId)) {
      const edited = editedMarks.get(student.studentId)
      return edited === null ? '' : edited.toString()
    }
    return student.score === null ? '' : student.score.toString()
  }

  // Save marks as draft
  const handleSaveDraft = async () => {
    if (!marksData || !hasChanges) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const marksToSave = Array.from(editedMarks.entries()).map(([studentId, score]) => ({
        studentId,
        score,
        maxScore: marksData.maxScore,
      }))

      const response = await fetch('/api/teacher/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          classId: selectedClassId,
          marks: marksToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save marks')
      }

      // Refresh marks data
      const refreshResponse = await fetch(
        `/api/teacher/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}&examId=${selectedExamId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setMarksData(data)
      }

      setEditedMarks(new Map())
      setHasChanges(false)
      setSuccessMessage('Marks saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  // Submit final marks
  const handleSubmitFinal = async () => {
    if (!marksData) return

    // Confirm submission
    const confirmed = window.confirm(
      'Are you sure you want to submit final marks? This will notify the administration and marks cannot be changed without approval.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // First save any pending changes
      if (hasChanges) {
        const marksToSave = Array.from(editedMarks.entries()).map(([studentId, score]) => ({
          studentId,
          score,
          maxScore: marksData.maxScore,
        }))

        await fetch('/api/teacher/marks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: selectedExamId,
            subjectId: selectedSubjectId,
            classId: selectedClassId,
            marks: marksToSave,
            isDraft: false,
          }),
        })
      }

      // Submit final marks
      const response = await fetch('/api/teacher/marks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          classId: selectedClassId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit marks')
      }

      // Refresh marks data
      const refreshResponse = await fetch(
        `/api/teacher/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}&examId=${selectedExamId}`
      )
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        setMarksData(data)
      }

      setEditedMarks(new Map())
      setHasChanges(false)
      setSuccessMessage('Marks submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit marks')
    } finally {
      setSubmitting(false)
    }
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
    setSelectedExamId('')
    setMarksData(null)
  }

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setSelectedExamId('')
    setMarksData(null)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/teacher"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enter Marks
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Record student marks for your assigned classes and subjects
            </p>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!selectedClassId}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a subject</option>
              {subjectsForClass.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={!selectedSubjectId}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id} disabled={!exam.isOpen}>
                  {exam.name} ({exam.type}){!exam.isOpen ? ' - Closed' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && selectedExamId && (
        <div className="space-y-4">
          <SkeletonLoader variant="card" count={3} />
        </div>
      )}


      {/* Marks Entry Table */}
      {marksData && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          {/* Lock/Status Banner */}
          {marksData.lockMessage && (
            <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Lock className="h-5 w-5" />
                <span>{marksData.lockMessage}</span>
              </div>
            </div>
          )}

          {/* Submitted Status */}
          {marksData.submittedAt && !marksData.isPublished && (
            <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <CheckCircle className="h-5 w-5" />
                <span>
                  Marks submitted on {new Date(marksData.submittedAt).toLocaleDateString('en-UG', {
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
          {marksData.canEdit && (
            <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                <Info className="h-4 w-4" />
                <span>
                  Enter marks out of {marksData.maxScore}. Save as draft to continue later, or submit final marks when complete.
                </span>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  {marksData.class.name} - {marksData.subject.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {marksData.exam.name} • {marksData.students.length} students
                </p>
              </div>
              
              {/* Action Buttons */}
              {marksData.canEdit && (
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

          {/* Marks Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admission No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score (/{marksData.maxScore})
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {marksData.students.map((student, index) => (
                  <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {student.studentName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {student.admissionNumber}
                    </td>
                    <td className="px-4 py-3">
                      {marksData.canEdit ? (
                        <input
                          type="number"
                          min="0"
                          max={marksData.maxScore}
                          step="0.5"
                          value={getMarkValue(student)}
                          onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="-"
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">
                          {student.score !== null ? student.score : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {student.grade || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {student.isDraft ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          Draft
                        </span>
                      ) : student.score !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
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
          {marksData.students.length === 0 && (
            <div className="p-8 text-center">
              <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No students found in this class</p>
            </div>
          )}
        </div>
      )}

      {/* No Selection State */}
      {!selectedExamId && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select Class, Subject, and Exam
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a class, subject, and exam from the dropdowns above to start entering marks.
          </p>
        </div>
      )}
    </div>
  )
}
