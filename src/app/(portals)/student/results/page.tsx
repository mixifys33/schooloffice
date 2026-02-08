'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'

/**
 * Student Portal - Results and Report Cards View
 * Requirement 23.3: Display exam results and report cards for students
 * Requirement 23.4: Display "Report card unavailable - fees pending" for unpaid students
 */

interface SubjectResult {
  name: string
  score: number
  maxScore: number
  percentage: number
  grade: string | null
  remarks: string | null
}

interface ReportCardData {
  id: string
  termId: string
  termName: string
  academicYear: string
  publishedAt: string | null
  isAccessible: boolean
  paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL'
  canViewReportCard: boolean
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    position: number
    totalStudents: number
    overallGrade: string | null
  }
  subjects: SubjectResult[]
  remarks: {
    teacherRemarks: string | null
    headTeacherRemarks: string | null
  }
}

interface PerformanceTrend {
  term: string
  average: number
  position: number
}

interface StudentResultsResponse {
  student: {
    id: string
    name: string
    admissionNumber: string
    className: string
    streamName: string | null
  }
  reportCards: ReportCardData[]
  performanceTrend: PerformanceTrend[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getGradeColor(grade: string | null): string {
  if (!grade) return 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
  const colors: Record<string, string> = {
    A: 'bg-[var(--success-light)] text-[var(--success-dark)]',
    B: 'bg-[var(--info-light)] text-[var(--info-dark)]',
    C: 'bg-[var(--warning-light)] text-[var(--warning-dark)]',
    D: 'bg-[var(--warning-light)] text-[var(--warning-dark)]',
    E: 'bg-[var(--danger-light)] text-[var(--danger-dark)]',
    F: 'bg-[var(--danger)] text-[var(--danger-dark)]',
  }
  return colors[grade] || 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
}

function getScoreBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-[var(--success)]'
  if (percentage >= 60) return 'bg-[var(--accent-primary)]'
  if (percentage >= 50) return 'bg-[var(--warning)]'
  return 'bg-[var(--danger)]'
}

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StudentResultsResponse | null>(null)
  const [selectedReportCard, setSelectedReportCard] = useState<string>('')

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/student/results')
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view your results')
            return
          }
          if (response.status === 403) {
            setError('You do not have permission to view this page')
            return
          }
          throw new Error('Failed to fetch results')
        }
        
        const resultsData: StudentResultsResponse = await response.json()
        setData(resultsData)
        
        // Set default selected report card to the first one
        if (resultsData.reportCards.length > 0) {
          setSelectedReportCard(resultsData.reportCards[0].id)
        }
      } catch (err) {
        console.error('Error fetching results:', err)
        setError('Failed to load results. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AlertBanner type="danger" message={error} />
      </div>
    )
  }

  if (!data || data.reportCards.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Results</h1>
          {data?.student && (
            <p className="text-[var(--text-secondary)] mt-1">
              {data.student.className} {data.student.streamName && `(${data.student.streamName})`} • {data.student.admissionNumber}
            </p>
          )}
        </div>
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-8 text-center">
          <p className="text-[var(--text-muted)]">No results available yet.</p>
        </div>
      </div>
    )
  }

  const { student, reportCards, performanceTrend } = data
  const reportCard = reportCards.find((rc) => rc.id === selectedReportCard) || reportCards[0]


  // Check if student can view report cards (Requirement 23.4)
  const canViewReportCard = reportCard?.canViewReportCard ?? false
  const paymentStatus = reportCard?.paymentStatus ?? 'NOT_PAID'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Results</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {student.className} {student.streamName && `(${student.streamName})`} • {student.admissionNumber}
        </p>
      </div>

      {/* Requirement 23.4: Payment Status Alert for Unpaid Students */}
      {!canViewReportCard && (
        <AlertBanner
          type="warning"
          message="Report card unavailable - fees pending. Please contact your school administration to clear your fees balance."
        />
      )}

      {/* Performance Trend */}
      {performanceTrend.length > 0 && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Performance Trend</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {performanceTrend.map((term, index) => {
              const prevTerm = performanceTrend[index - 1]
              const avgChange = prevTerm ? term.average - prevTerm.average : 0
              const posChange = prevTerm ? prevTerm.position - term.position : 0

              return (
                <div key={term.term} className="p-4 bg-[var(--bg-surface)] rounded-lg">
                  <p className="text-sm text-[var(--text-muted)]">{term.term}</p>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{term.average.toFixed(1)}%</p>
                      {avgChange !== 0 && (
                        <p className={`text-sm ${avgChange > 0 ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'}`}>
                          {avgChange > 0 ? '↑' : '↓'} {Math.abs(avgChange).toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[var(--text-primary)]">#{term.position}</p>
                      {posChange !== 0 && (
                        <p className={`text-sm ${posChange > 0 ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'}`}>
                          {posChange > 0 ? '↑' : '↓'} {Math.abs(posChange)} pos
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Report Card Selector */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Report Card</label>
        <div className="flex gap-2 flex-wrap">
          {reportCards.map((rc) => (
            <button
              key={rc.id}
              onClick={() => setSelectedReportCard(rc.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedReportCard === rc.id
                  ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              {rc.termName} {rc.academicYear}
            </button>
          ))}
        </div>
      </div>

      {/* Report Card Summary */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{reportCard.termName} {reportCard.academicYear} Report Card</h2>
            {reportCard.publishedAt && (
              <p className="text-sm text-[var(--text-muted)] mt-1">Published: {formatDate(reportCard.publishedAt)}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--text-primary)]">{reportCard.summary.average.toFixed(1)}%</p>
              <p className="text-sm text-[var(--text-muted)]">Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--text-primary)]">
                {reportCard.summary.position}
                <span className="text-lg">/{reportCard.summary.totalStudents}</span>
              </p>
              <p className="text-sm text-[var(--text-muted)]">Position</p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg text-2xl font-bold ${getGradeColor(
                reportCard.summary.overallGrade
              )}`}
            >
              {reportCard.summary.overallGrade || 'N/A'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-1">
            <span>
              Total: {reportCard.summary.totalMarks}/{reportCard.summary.totalMaxMarks}
            </span>
            <span>
              {reportCard.summary.totalMaxMarks > 0 
                ? ((reportCard.summary.totalMarks / reportCard.summary.totalMaxMarks) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
          <div className="w-full bg-[var(--bg-surface)] rounded-full h-3">
            <div
              className="bg-[var(--chart-blue)] h-3 rounded-full transition-all"
              style={{
                width: `${reportCard.summary.totalMaxMarks > 0 
                  ? (reportCard.summary.totalMarks / reportCard.summary.totalMaxMarks) * 100 
                  : 0}%`,
              }}
            />
          </div>
        </div>
      </div>


      {/* Detailed Results - Only show if payment is complete (Requirement 23.4) */}
      {canViewReportCard ? (
        <Tabs defaultValue="subjects" className="bg-[var(--bg-main)] rounded-lg shadow-sm">
          <TabsList className="w-full justify-start border-b rounded-none px-4">
            <TabsTrigger value="subjects">Subject Results</TabsTrigger>
            <TabsTrigger value="remarks">Remarks</TabsTrigger>
          </TabsList>

          {/* Subject Results Tab */}
          <TabsContent value="subjects" className="p-6">
            {reportCard.subjects.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">
                Detailed subject results not available for this term.
              </p>
            ) : (
              <div className="space-y-4">
                {reportCard.subjects.map((subject, index) => {
                  const percentage = subject.maxScore > 0 
                    ? (subject.score / subject.maxScore) * 100 
                    : 0
                  return (
                    <div key={index} className="border border-[var(--border-default)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[var(--text-primary)]">{subject.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getGradeColor(
                              subject.grade
                            )}`}
                          >
                            {subject.grade || 'N/A'}
                          </span>
                        </div>
                        <span className="font-bold text-[var(--text-primary)]">
                          {subject.score}/{subject.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-surface)] rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getScoreBarColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {subject.remarks && (
                        <p className="text-sm text-[var(--text-secondary)]">{subject.remarks}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Remarks Tab */}
          <TabsContent value="remarks" className="p-6 space-y-4">
            <div className="p-4 bg-[var(--info-light)] rounded-lg border border-[var(--info-light)]">
              <h4 className="font-medium text-[var(--text-primary)] mb-2">Class Teacher&apos;s Remarks</h4>
              <p className="text-[var(--text-primary)]">
                {reportCard.remarks.teacherRemarks || 'No remarks provided.'}
              </p>
            </div>
            <div className="p-4 bg-[var(--success-light)] rounded-lg border border-[var(--success-light)]">
              <h4 className="font-medium text-[var(--text-primary)] mb-2">Head Teacher&apos;s Remarks</h4>
              <p className="text-[var(--text-primary)]">
                {reportCard.remarks.headTeacherRemarks || 'No remarks provided.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Requirement 23.4: Show restricted message for unpaid students */
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-[var(--warning-light)] rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Report Card Unavailable</h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Your detailed report card and subject results are currently unavailable due to pending fees. 
              Please contact your school administration to clear your balance and unlock full access.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg">
              <span className="text-[var(--chart-yellow)] font-medium">Payment Status:</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                paymentStatus === 'PARTIAL' 
                  ? 'bg-[var(--warning-light)] text-[var(--warning-dark)]' 
                  : 'bg-[var(--danger-light)] text-[var(--danger-dark)]'
              }`}>
                {paymentStatus === 'PARTIAL' ? 'Partial Payment' : 'Not Paid'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Download Button - Only show if payment is complete */}
      {canViewReportCard && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4 flex justify-end">
          <button className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2">
            <span>📄</span>
            Download Report Card (PDF)
          </button>
        </div>
      )}
    </div>
  )
}
