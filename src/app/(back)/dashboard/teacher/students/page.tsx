/**
 * Teacher Students Marks Management Page
 * 
 * Requirements: 11.1, 11.2, 19.1, 19.2, 19.4
 * - Create /dashboard/teacher/students page
 * - Implement proper route authorization
 * - Add consistent dashboard navigation integration
 * - Include page titles and breadcrumbs
 * 
 * This page provides the main interface for regular teachers to manage student marks
 * using progressive filtering: Class → Stream → Subject → Students
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, GraduationCap, AlertCircle, RefreshCw, FileText, CheckCircle, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { useToast } from '@/components/ui/toast'
import ProgressiveFilter, { type FilterSelection } from '@/components/teacher/ProgressiveFilter'
import MarksEntryTable, { 
  type CreateCAEntryRequest, 
  type CreateExamEntryRequest 
} from '@/components/teacher/MarksEntryTable'
import { 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

interface StudentsMarksData {
  students: {
    id: string;
    name: string;
    admissionNumber: string;
    caEntries: any[];
    examEntry?: any;
    gradeCalculation: any;
  }[];
  subject: {
    id: string;
    name: string;
    code: string;
  };
  term: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

interface StudentFilterOptions {
  all: boolean;
  missingCA: boolean;
  missingExam: boolean;
  complete: boolean;
}

export default function TeacherStudentsPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [selection, setSelection] = useState<FilterSelection>({})
  const [studentsData, setStudentsData] = useState<StudentsMarksData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studentFilters, setStudentFilters] = useState<StudentFilterOptions>({
    all: true,
    missingCA: false,
    missingExam: false,
    complete: false,
  })
  
  // Enhanced feedback states
  const [savingStates, setSavingStates] = useState<Map<string, boolean>>(new Map())
  const [successStates, setSuccessStates] = useState<Map<string, boolean>>(new Map())
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set())
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Load students data when class and subject are selected
  useEffect(() => {
    if (selection.classId && selection.subjectId) {
      loadStudentsData(selection.classId, selection.subjectId)
    } else {
      setStudentsData(null)
    }
  }, [selection.classId, selection.subjectId])

  const loadStudentsData = async (classId: string, subjectId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/teacher/marks/${classId}/${subjectId}/students`)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to load students data')
      }
      
      const data = await response.json()
      setStudentsData(data)
    } catch (err: any) {
      console.error('Error loading students data:', err)
      setError('Unable to load students data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (newSelection: FilterSelection) => {
    setSelection(newSelection)
  }

  const handleStudentFilterChange = (filterType: keyof StudentFilterOptions) => {
    setStudentFilters(prev => {
      // If selecting a specific filter, turn off "all"
      if (filterType !== 'all') {
        return {
          ...prev,
          all: false,
          [filterType]: !prev[filterType],
        }
      } else {
        // If selecting "all", turn off other filters
        return {
          all: true,
          missingCA: false,
          missingExam: false,
          complete: false,
        }
      }
    })
  }

  // Filter students based on selected filters
  const getFilteredStudents = () => {
    if (!studentsData) return []
    
    if (studentFilters.all) {
      return studentsData.students
    }
    
    return studentsData.students.filter(student => {
      const hasCA = student.caEntries.length > 0
      const hasExam = !!student.examEntry
      const isComplete = hasCA && hasExam
      
      if (studentFilters.missingCA && !hasCA) return true
      if (studentFilters.missingExam && !hasExam) return true
      if (studentFilters.complete && isComplete) return true
      
      return false
    })
  }

  const filteredStudents = getFilteredStudents()

  // Calculate filter counts
  const getFilterCounts = () => {
    if (!studentsData) return { all: 0, missingCA: 0, missingExam: 0, complete: 0 }
    
    const counts = {
      all: studentsData.students.length,
      missingCA: 0,
      missingExam: 0,
      complete: 0,
    }
    
    studentsData.students.forEach(student => {
      const hasCA = student.caEntries.length > 0
      const hasExam = !!student.examEntry
      
      if (!hasCA) counts.missingCA++
      if (!hasExam) counts.missingExam++
      if (hasCA && hasExam) counts.complete++
    })
    
    return counts
  }

  const filterCounts = getFilterCounts()

  // Handler functions for MarksEntryTable
  const handleCAEntryCreate = async (entry: CreateCAEntryRequest) => {
    try {
      const response = await fetch('/api/teacher/marks/ca-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to create CA entry')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error creating CA entry:', error)
      throw error
    }
  }

  const handleCAEntryUpdate = async (id: string, entry: Partial<CreateCAEntryRequest>) => {
    try {
      const response = await fetch(`/api/teacher/marks/ca-entry/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to update CA entry')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error updating CA entry:', error)
      throw error
    }
  }

  const handleCAEntryDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/teacher/marks/ca-entry/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete CA entry')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error deleting CA entry:', error)
      throw error
    }
  }

  const handleExamEntryCreate = async (entry: CreateExamEntryRequest) => {
    try {
      const response = await fetch('/api/teacher/marks/exam-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to create exam entry')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error creating exam entry:', error)
      throw error
    }
  }

  const handleExamEntryUpdate = async (id: string, entry: Partial<CreateExamEntryRequest>) => {
    try {
      const response = await fetch(`/api/teacher/marks/exam-entry/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })

      if (!response.ok) {
        throw new Error('Failed to update exam entry')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error updating exam entry:', error)
      throw error
    }
  }

  const handleBatchSave = async (entries: any[]) => {
    try {
      const response = await fetch('/api/teacher/marks/batch-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries }),
      })

      if (!response.ok) {
        throw new Error('Failed to save batch entries')
      }

      // Reload students data to reflect changes
      if (selection.classId && selection.subjectId) {
        await loadStudentsData(selection.classId, selection.subjectId)
      }
    } catch (error) {
      console.error('Error saving batch entries:', error)
      throw error
    }
  }

  return (
    <div className={spacing.page}>
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm text-[var(--text-muted)] mb-4">
        <a href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
          Dashboard
        </a>
        <span>/</span>
        <a href="/dashboard/teacher" className="hover:text-[var(--text-primary)] transition-colors">
          Teacher
        </a>
        <span>/</span>
        <span className="text-[var(--text-primary)] font-medium">Students</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn(typography.pageTitle, 'text-[var(--text-primary)]')}>
            Student Marks Management
          </h1>
          <p className={cn(typography.subtitle, 'text-[var(--text-secondary)] mt-1')}>
            Manage CA and exam marks for students in your assigned subjects
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard/teacher/students/reports">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              View Reports
            </Button>
          </Link>
          
          {studentsData && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selection.classId && selection.subjectId && loadStudentsData(selection.classId, selection.subjectId)}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Progressive Filter */}
      <Card className={cn(cardStyles.base, cardStyles.normal, 'mb-6')}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
            <GraduationCap className="h-5 w-5" />
            Select Class and Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressiveFilter
            teacherId="current-teacher" // This will be handled by the API based on session
            onSelectionChange={handleSelectionChange}
            initialSelection={selection}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ 
            label: 'Retry', 
            onClick: () => selection.classId && selection.subjectId && loadStudentsData(selection.classId, selection.subjectId)
          }}
          className="mb-6"
        />
      )}

      {/* Students Data Section */}
      {selection.classId && selection.subjectId && (
        <div className="space-y-6">
          {/* Subject and Term Info */}
          {studentsData && (
            <Card className={cn(cardStyles.base, cardStyles.compact)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                    <BookOpen className={cn('h-5 w-5', teacherColors.info.text)} />
                  </div>
                  <div>
                    <h3 className={cn(typography.h3, 'text-[var(--text-primary)]')}>
                      {studentsData.subject.name} ({studentsData.subject.code})
                    </h3>
                    <p className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                      {studentsData.term.name} • {studentsData.students.length} students
                    </p>
                  </div>
                </div>
                
                {!studentsData.term.isActive && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Inactive Term</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Student Filters */}
          {studentsData && (
            <Card className={cn(cardStyles.base, cardStyles.compact)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className={cn(typography.body, 'font-medium text-[var(--text-primary)]')}>
                    Filter Students
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={studentFilters.all ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStudentFilterChange('all')}
                  >
                    All Students ({filterCounts.all})
                  </Button>
                  <Button
                    variant={studentFilters.missingCA ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStudentFilterChange('missingCA')}
                    className={studentFilters.missingCA ? '' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
                  >
                    Missing CA ({filterCounts.missingCA})
                  </Button>
                  <Button
                    variant={studentFilters.missingExam ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStudentFilterChange('missingExam')}
                    className={studentFilters.missingExam ? '' : 'border-red-300 text-red-700 hover:bg-red-50'}
                  >
                    Missing Exam ({filterCounts.missingExam})
                  </Button>
                  <Button
                    variant={studentFilters.complete ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStudentFilterChange('complete')}
                    className={studentFilters.complete ? '' : 'border-green-300 text-green-700 hover:bg-green-50'}
                  >
                    Complete ({filterCounts.complete})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card className={cn(cardStyles.base, cardStyles.normal)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
                  <span className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                    Loading students data...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students List */}
          {studentsData && !loading && (
            <Card className={cn(cardStyles.base, cardStyles.normal)}>
              <CardHeader>
                <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                  <Users className="h-5 w-5" />
                  Students ({filteredStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                      No students match the selected filters
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStudentFilterChange('all')}
                      className="mt-3"
                    >
                      Show All Students
                    </Button>
                  </div>
                ) : (
                  <MarksEntryTable
                    students={filteredStudents}
                    subject={studentsData.subject}
                    onCAEntryCreate={handleCAEntryCreate}
                    onCAEntryUpdate={handleCAEntryUpdate}
                    onCAEntryDelete={handleCAEntryDelete}
                    onExamEntryCreate={handleExamEntryCreate}
                    onExamEntryUpdate={handleExamEntryUpdate}
                    onBatchSave={handleBatchSave}
                    loading={loading}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Instructions when no selection */}
      {!selection.classId && (
        <Card className={cn(cardStyles.base, cardStyles.normal)}>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] mb-2')}>
              Get Started
            </h3>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] mb-4')}>
              Select a class and subject from the filter above to begin managing student marks
            </p>
            <div className="text-left max-w-md mx-auto">
              <p className={cn(typography.caption, 'text-[var(--text-muted)] mb-2')}>
                This system supports:
              </p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Progressive filtering: Class → Stream → Subject → Students</li>
                <li>• Multiple CA entries per subject with custom max scores</li>
                <li>• Exam entry management with validation</li>
                <li>• Automatic grade calculations (CA 20% + Exam 80%)</li>
                <li>• Student filtering by mark status</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}