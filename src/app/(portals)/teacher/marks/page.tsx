'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  Printer,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Assessment & Marks Entry Page for Teacher Portal
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * ENHANCED: Support for CA entries, multiple assessment types, and proper grading logic
 * - Display only students in assigned class
 * - Allow draft saves while term is active and results unpublished
 * - Implement final submission with administration notification
 * - Show read-only mode after results publication
 * - Display lock message when attempting edit after publication
 * - Support multiple CA entries per subject
 * - Proper CA (20%) and Exam (80%) calculation
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

function MarksEntryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classIdParam = searchParams.get('classId')
  const subjectIdParam = searchParams.get('subjectId')
  const examIdParam = searchParams.get('examId')
  const examTypeParam = searchParams.get('examType') // 'CA' or 'EXAM'

  // Redirect logic for proper flow
  React.useEffect(() => {
    // If classId and subjectId are provided but no examId and no examType, redirect to selection page
    if (classIdParam && subjectIdParam && !examIdParam && !examTypeParam) {
      router.push(`/teacher/marks/select?classId=${classIdParam}&subjectId=${subjectIdParam}`)
    }
    
    // If no parameters at all, this is the base marks entry page - show selection interface
    // No redirect needed, just let the user select class and subject
  }, [classIdParam, subjectIdParam, examIdParam, examTypeParam, router])

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

  // CA Creation state
  const [showCAForm, setShowCAForm] = useState(false)
  const [caFormData, setCAFormData] = useState({
    name: '',
    maxScore: '10',
    type: 'ASSIGNMENT',
    description: '',
  })
  const [creatingCA, setCreatingCA] = useState(false)

  // Marks data
  const [marksData, setMarksData] = useState<MarksEntryData | null>(null)
  const [editedMarks, setEditedMarks] = useState<Map<string, number | null>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

  // Sort and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'none' | 'name-asc' | 'name-desc' | 'score-asc' | 'score-desc'>('none')
  const [filterBy, setFilterBy] = useState<'all' | 'no-scores' | 'with-scores'>('all')

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
        let url = `/api/teacher/marks/exams?classId=${selectedClassId}`
        
        // Add examType filter if provided
        if (examTypeParam) {
          url += `&examType=${examTypeParam}`
        }
        
        const response = await fetch(url)
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
  }, [selectedClassId, examTypeParam])


  // Fetch marks data when all selections are made
  useEffect(() => {
    async function fetchMarksData() {
      // For EXAM type, use exam-entry API (one entry per term)
      if (examTypeParam === 'EXAM' && selectedClassId && selectedSubjectId) {
        setLoading(true)
        setError(null)

        try {
          const response = await fetch(
            `/api/teacher/marks/exam-entry?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
          )
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch exam data')
          }
          
          const data = await response.json()
          // Transform exam-entry response to match marks data structure
          setMarksData({
            exam: {
              id: data.examEntry.id,
              name: data.examEntry.name,
              type: data.examEntry.type,
              isOpen: data.canEdit,
            },
            subject: data.subject,
            class: data.class,
            students: data.examEntry.studentScores,
            maxScore: data.examEntry.maxScore,
            isPublished: data.isPublished,
            isTermActive: data.isTermActive,
            canEdit: data.canEdit,
            lockMessage: data.lockMessage,
            hasUnsavedChanges: false,
            submittedAt: data.examEntry.submittedAt,
          })
          setEditedMarks(new Map())
          setHasChanges(false)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load exam data')
        } finally {
          setLoading(false)
        }
        return
      }

      // For CA type or old flow, use regular marks API
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
  }, [selectedClassId, selectedSubjectId, selectedExamId, examTypeParam])

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

    const examId = marksData.exam.id
    
    // Validate examId
    if (!examId || examId === 'new') {
      setError('Invalid exam entry ID. Please refresh the page.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const marksToSave = Array.from(editedMarks.entries()).map(([studentId, score]) => ({
        studentId,
        score,
        maxScore: marksData.maxScore,
      }))

      // For EXAM type, use exam-entry API
      if (examTypeParam === 'EXAM') {
        // If examId is "pending", create exam entries first
        if (examId === 'pending') {
          const createResponse = await fetch('/api/teacher/marks/exam-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classId: selectedClassId,
              subjectId: selectedSubjectId,
              scores: marksToSave,
            }),
          })

          if (!createResponse.ok) {
            const errorData = await createResponse.json()
            throw new Error(errorData.error || 'Failed to create exam entries')
          }
        } else {
          // Update existing exam entries
          const response = await fetch('/api/teacher/marks/exam-entry/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: examId,
              scores: marksToSave,
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
          `/api/teacher/marks/exam-entry?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setMarksData({
            exam: {
              id: data.examEntry.id,
              name: data.examEntry.name,
              type: data.examEntry.type,
              isOpen: data.canEdit,
            },
            subject: data.subject,
            class: data.class,
            students: data.examEntry.studentScores,
            maxScore: data.examEntry.maxScore,
            isPublished: data.isPublished,
            isTermActive: data.isTermActive,
            canEdit: data.canEdit,
            lockMessage: data.lockMessage,
            hasUnsavedChanges: false,
            submittedAt: data.examEntry.submittedAt,
          })
        }
      } else {
        // For CA type, use regular marks API
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
      }

      setEditedMarks(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores saved as draft successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Clear localStorage backup
      if (examId !== 'pending') {
        const storageKey = `exam-scores-${examId}`
        localStorage.removeItem(storageKey)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  // Submit final marks
  const handleSubmitFinal = async () => {
    if (!marksData) return

    const examId = marksData.exam.id
    
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
        const marksToSave = Array.from(editedMarks.entries()).map(([studentId, score]) => ({
          studentId,
          score,
          maxScore: marksData.maxScore,
        }))

        if (examTypeParam === 'EXAM') {
          await fetch('/api/teacher/marks/exam-entry/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examId: examId,
              scores: marksToSave,
              isDraft: false,
            }),
          })
        } else {
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
      }

      // Submit final scores
      if (examTypeParam === 'EXAM') {
        const response = await fetch('/api/teacher/marks/exam-entry/submit', {
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
          `/api/teacher/marks/exam-entry?classId=${selectedClassId}&subjectId=${selectedSubjectId}`
        )
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setMarksData({
            exam: {
              id: data.examEntry.id,
              name: data.examEntry.name,
              type: data.examEntry.type,
              isOpen: data.canEdit,
            },
            subject: data.subject,
            class: data.class,
            students: data.examEntry.studentScores,
            maxScore: data.examEntry.maxScore,
            isPublished: data.isPublished,
            isTermActive: data.isTermActive,
            canEdit: data.canEdit,
            lockMessage: data.lockMessage,
            hasUnsavedChanges: false,
            submittedAt: data.examEntry.submittedAt,
          })
        }
      } else {
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
      }

      setEditedMarks(new Map())
      setHasChanges(false)
      setSuccessMessage('Scores submitted successfully. Administration has been notified.')
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Clear localStorage backup
      const storageKey = `exam-scores-${examId}`
      localStorage.removeItem(storageKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit marks')
    } finally {
      setSubmitting(false)
    }
  }

  // Print exam scores
  const handlePrint = () => {
    if (!marksData) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const examTypeName = examTypeParam === 'EXAM' ? 'Exam' : 'Assessment'

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examTypeName} Scores - ${marksData.subject.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header-left h1 { font-size: 24px; margin: 0 0 5px 0; }
            .header-left .info { color: #666; font-size: 14px; }
            .header-right { text-align: right; }
            .branding { font-size: 11px; color: #999; font-style: italic; }
            .branding strong { color: #666; font-weight: 600; }
            .details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px; }
            .details div { font-size: 14px; }
            .details strong { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; font-size: 13px; }
            th { background-color: #f4f4f4; font-weight: bold; color: #333; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666; }
            .footer-branding { color: #999; }
            @media print {
              button { display: none; }
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>${marksData.exam.name} - ${marksData.subject.name}</h1>
              <div class="info">${marksData.class.name}</div>
            </div>
            <div class="header-right">
              <div class="branding">Powered by <strong>SchoolOffice</strong></div>
            </div>
          </div>
          
          <div class="details">
            <div><strong>Max Score:</strong> ${marksData.maxScore}</div>
            <div><strong>Type:</strong> ${marksData.exam.type}</div>
            <div><strong>Total Students:</strong> ${marksData.students.length}</div>
            <div><strong>Status:</strong> ${marksData.submittedAt ? 'Submitted' : 'Draft'}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 120px;">Admission No.</th>
                <th>Student Name</th>
                <th style="width: 100px;">Score</th>
                <th style="width: 80px;">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${marksData.students.map((student, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${student.admissionNumber}</td>
                  <td>${student.studentName}</td>
                  <td>${student.score !== null ? student.score : '-'} / ${student.maxScore}</td>
                  <td>${student.grade || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <div>Printed on: ${new Date().toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            <div class="footer-branding">SchoolOffice.academy</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  // Download exam scores as CSV
  const handleDownloadCSV = () => {
    if (!marksData) return

    const examTypeName = examTypeParam === 'EXAM' ? 'Exam' : 'Assessment'

    // Create CSV content with SchoolOffice branding
    const headers = ['#', 'Admission Number', 'Student Name', 'Score', 'Max Score', 'Grade']
    const rows = marksData.students.map((student, index) => [
      index + 1,
      student.admissionNumber,
      student.studentName,
      student.score !== null ? student.score : '',
      student.maxScore,
      student.grade || ''
    ])

    const csvContent = [
      '# Powered by SchoolOffice - SchoolOffice.academy',
      '',
      `${examTypeName}: ${marksData.exam.name}`,
      `Subject: ${marksData.subject.name}`,
      `Class: ${marksData.class.name}`,
      `Max Score: ${marksData.maxScore}`,
      `Type: ${marksData.exam.type}`,
      `Status: ${marksData.submittedAt ? 'Submitted' : 'Draft'}`,
      `Total Students: ${marksData.students.length}`,
      `Exported: ${new Date().toLocaleString('en-UG')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${examTypeName}_${marksData.exam.name}_${marksData.class.name}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Apply sort, filter, and search to students
  const getFilteredAndSortedStudents = () => {
    if (!marksData) return []

    let filtered = [...marksData.students]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(query) ||
        student.admissionNumber.toLowerCase().includes(query)
      )
    }

    // Apply score filter
    if (filterBy === 'no-scores') {
      filtered = filtered.filter(student => student.score === null || student.score === 0)
    } else if (filterBy === 'with-scores') {
      filtered = filtered.filter(student => student.score !== null && student.score > 0)
    }

    // Apply sorting
    if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.studentName.localeCompare(b.studentName))
    } else if (sortBy === 'name-desc') {
      filtered.sort((a, b) => b.studentName.localeCompare(a.studentName))
    } else if (sortBy === 'score-asc') {
      filtered.sort((a, b) => (a.score || 0) - (b.score || 0))
    } else if (sortBy === 'score-desc') {
      filtered.sort((a, b) => (b.score || 0) - (a.score || 0))
    }

    return filtered
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

  // Handle CA creation
  const handleCreateCA = async () => {
    if (!caFormData.name.trim()) {
      setError('CA name is required')
      return
    }

    const maxScore = parseFloat(caFormData.maxScore)
    if (isNaN(maxScore) || maxScore <= 0) {
      setError('Max score must be a positive number')
      return
    }

    setCreatingCA(true)
    setError(null)

    try {
      // Create a new exam entry for CA
      const response = await fetch('/api/teacher/marks/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          name: caFormData.name,
          type: caFormData.type,
          maxScore: maxScore,
          description: caFormData.description,
          examType: 'CA',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create CA assessment')
      }

      const data = await response.json()

      // Refresh exams list
      const refreshResponse = await fetch(
        `/api/teacher/marks/exams?classId=${selectedClassId}&examType=CA`
      )
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setExams(refreshData.exams || [])
        
        // Auto-select the newly created CA
        if (data.exam?.id) {
          setSelectedExamId(data.exam.id)
        }
      }

      setSuccessMessage(`CA assessment "${caFormData.name}" created successfully!`)
      setTimeout(() => setSuccessMessage(null), 3000)

      // Reset form and hide it
      setCAFormData({
        name: '',
        maxScore: '10',
        type: 'ASSIGNMENT',
        description: '',
      })
      setShowCAForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create CA assessment')
    } finally {
      setCreatingCA(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        
        {/* Show back to selection if examType is specified */}
        {examTypeParam && classIdParam && subjectIdParam && (
          <>
            <span className="text-[var(--text-muted)]">|</span>
            <Link
              href={`/teacher/marks/select?classId=${classIdParam}&subjectId=${subjectIdParam}`}
              className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Selection
            </Link>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <BookOpen className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              {examTypeParam === 'CA' ? 'Enter CA Marks' : examTypeParam === 'EXAM' ? 'Enter Exam Marks' : 'Marks Entry'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              {examTypeParam === 'CA' 
                ? 'Record Continuous Assessment marks for tests, assignments, and projects'
                : examTypeParam === 'EXAM'
                ? 'Record examination marks for the current term (one entry per subject per term)'
                : 'Select a class and subject to begin entering marks'}
            </p>
          </div>
        </div>
      </div>

      {/* Entry Type Selection - Show when no examType is specified */}
      {!examTypeParam && selectedClassId && selectedSubjectId && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">
            Select Entry Type
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* CA Marks Option */}
            <button
              onClick={() => router.push(`/teacher/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}&examType=CA`)}
              className="p-6 border-2 border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6 text-[var(--warning-dark)] dark:text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-1">
                    Enter CA Marks
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                    Record Continuous Assessment marks for tests, assignments, and projects. Multiple entries allowed per term.
                  </p>
                </div>
              </div>
            </button>

            {/* Exam Marks Option */}
            <button
              onClick={() => router.push(`/teacher/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}&examType=EXAM`)}
              className="p-6 border-2 border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-1">
                    Enter Exam Marks
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                    Record examination marks for the current term. One entry per subject per term.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className={`grid gap-4 ${examTypeParam === 'EXAM' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
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
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a subject</option>
              {subjectsForClass.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Selection - Only show for CA type */}
          {examTypeParam !== 'EXAM' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                {examTypeParam === 'CA' ? 'CA Assessment' : 'Exam'}
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                disabled={!selectedSubjectId}
                className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{examTypeParam === 'CA' ? 'Select a CA assessment' : 'Select an exam'}</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id} disabled={!exam.isOpen}>
                    {exam.name} ({exam.type}){!exam.isOpen ? ' - Closed' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Create New CA Assessment - Show for CA type when class and subject are selected */}
      {examTypeParam === 'CA' && selectedClassId && selectedSubjectId && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              CA Assessments
            </h3>
            <Button
              size="sm"
              onClick={() => setShowCAForm(!showCAForm)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {showCAForm ? 'Cancel' : 'Create New CA'}
            </Button>
          </div>

          {/* CA Creation Form */}
          {showCAForm && (
            <div className="border-t border-[var(--border-default)] dark:border-[var(--border-strong)] pt-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    CA Name *
                  </label>
                  <input
                    type="text"
                    value={caFormData.name}
                    onChange={(e) => setCAFormData({ ...caFormData, name: e.target.value })}
                    placeholder="e.g., Assignment 1"
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Max Score *
                  </label>
                  <input
                    type="number"
                    value={caFormData.maxScore}
                    onChange={(e) => setCAFormData({ ...caFormData, maxScore: e.target.value })}
                    min="1"
                    step="0.5"
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Type
                  </label>
                  <select
                    value={caFormData.type}
                    onChange={(e) => setCAFormData({ ...caFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="TEST">Test</option>
                    <option value="PROJECT">Project</option>
                    <option value="PRACTICAL">Practical</option>
                    <option value="OBSERVATION">Observation</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleCreateCA}
                    disabled={creatingCA || !caFormData.name.trim()}
                    className="w-full"
                  >
                    {creatingCA ? 'Creating...' : 'Create CA'}
                  </Button>
                </div>
              </div>

              {caFormData.description !== undefined && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={caFormData.description}
                    onChange={(e) => setCAFormData({ ...caFormData, description: e.target.value })}
                    rows={2}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Info about selecting existing CA */}
          {!showCAForm && exams.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-2">
              No CA assessments found. Create one to start entering marks.
            </p>
          )}
        </div>
      )}

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
      {loading && (examTypeParam === 'EXAM' ? (selectedClassId && selectedSubjectId) : selectedExamId) && (
        <div className="space-y-4">
          <SkeletonLoader variant="card" count={3} />
        </div>
      )}


      {/* Marks Entry Table */}
      {marksData && !loading && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
          {/* Lock/Status Banner */}
          {marksData.lockMessage && (
            <div className="bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-b border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
                <Lock className="h-5 w-5" />
                <span>{marksData.lockMessage}</span>
              </div>
            </div>
          )}

          {/* Submitted Status */}
          {marksData.submittedAt && !marksData.isPublished && (
            <div className="bg-[var(--info-light)] dark:bg-[var(--info-dark)] border-b border-[var(--info-light)] dark:border-[var(--info-dark)] p-4">
              <div className="flex items-center gap-2 text-[var(--accent-hover)] dark:text-[var(--info)]">
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
            <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] text-sm">
                <Info className="h-4 w-4" />
                <span>
                  Enter marks out of {marksData.maxScore}. Save as draft to continue later, or submit final marks when complete.
                </span>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {marksData.class.name} - {marksData.subject.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {marksData.exam.name} • {marksData.students.length} students
                </p>
              </div>
              
              {/* Action Buttons */}
              {marksData.canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2"
                    title="Print scores"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCSV}
                    className="gap-2"
                    title="Download as CSV"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
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

          {/* Search, Filter, and Sort Controls */}
          <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="w-full h-9 px-3 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'none' | 'name-asc' | 'name-desc' | 'score-asc' | 'score-desc')}
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
                  onChange={(e) => setFilterBy(e.target.value as 'all' | 'no-scores' | 'with-scores')}
                  className="w-full h-9 px-3 py-1 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                >
                  <option value="all">All Students</option>
                  <option value="no-scores">No Scores Only</option>
                  <option value="with-scores">With Scores Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Marks Table */}
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
                    Score (/{marksData.maxScore})
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
                {getFilteredAndSortedStudents().map((student, index) => (
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
                      {marksData.canEdit ? (
                        <input
                          type="number"
                          min="0"
                          max={marksData.maxScore}
                          step="0.5"
                          value={getMarkValue(student)}
                          onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
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
          {marksData.students.length === 0 && (
            <div className="p-8 text-center">
              <BookOpen className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No students found in this class</p>
            </div>
          )}
        </div>
      )}

      {/* No Selection State */}
      {!marksData && !loading && (
        // Show this when no class/subject selected OR when exam type requires exam selection but none selected
        ((!selectedClassId || !selectedSubjectId) || 
         (examTypeParam && examTypeParam !== 'EXAM' && !selectedExamId))
      ) && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
          <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
            {!selectedClassId || !selectedSubjectId 
              ? 'Select Class and Subject'
              : examTypeParam === 'CA'
              ? 'Select a CA Assessment'
              : 'Select an Exam'}
          </h3>
          <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {!selectedClassId || !selectedSubjectId
              ? 'Choose a class and subject from the dropdowns above, then select the type of marks you want to enter.'
              : examTypeParam === 'CA'
              ? 'Choose a CA assessment from the dropdown above to start entering marks.'
              : 'Choose an exam from the dropdown above to start entering marks.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function MarksEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <MarksEntryPageContent />
    </Suspense>
  )
}
