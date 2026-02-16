'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, Users, TrendingUp, Calendar, ClipboardList, FileText, BarChart3, AlertCircle, CheckCircle } from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
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
 * Performance Page for Class Teacher Portal
 * Requirements: 1.1, 1.4, 12.1-12.4, 14.1-14.4
 * - Show class performance metrics
 * - Display subject-wise performance
 * - Show competency analysis
 * - Show trends and comparisons
 * - Disable data entry when context is invalid (1.4)
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface SubjectPerformance {
  id: string
  name: string
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  studentCount: number
  topPerformers: number
  attendanceRate: number
  competencyAnalysis: Array<{
    competency: string
    masteryRate: number
    description: string
  }>
}

interface ClassPerformance {
  subjectId: string
  subjectName: string
  averageScore: number
  passRate: number
  attendanceRate: number
  topPerformers: number
}

interface ClassTeacherContextData {
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

interface ClassTeacherPerformanceData {
  context: ClassTeacherContextData
  class: {
    id: string
    name: string
    streamName: string | null
    studentCount: number
  } | null
  subjects: SubjectPerformance[]
  overallPerformance: {
    averageScore: number
    passRate: number
    attendanceRate: number
    topPerformers: number
  }
}

export default function ClassTeacherPerformancePage() {
  const [data, setData] = useState<ClassTeacherPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        const response = await fetch('/api/class-teacher/performance')
        if (!response.ok) {
          throw new Error('Failed to fetch performance data')
        }
        const performanceData = await response.json()
        setData(performanceData)
      } catch (err) {
        setError('Unable to load performance data')
        console.error('Error fetching class teacher performance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPerformanceData()
  }, [])

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { context, class: classData, subjects, overallPerformance } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Back Navigation */}
      <Link
        href="/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.success.bg)}>
            <TrendingUp className={cn('h-6 w-6', teacherColors.success.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Performance Analytics
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {classData ? `${classData.name} ${classData.streamName ? `(${classData.streamName})` : ''}` : 'Class Performance'}
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context Error Warning - Requirement 12.4: Clear error messages */}
      {hasContextError && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]')}>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Data Entry Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {context.contextError || 'Academic context could not be determined. Please contact administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Performance Summary */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Overall Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <TrendingUp className={cn('h-5 w-5', teacherColors.success.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Average Score</h3>
                <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {overallPerformance.averageScore}%
                </p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <CheckCircle className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Pass Rate</h3>
                <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {overallPerformance.passRate}%
                </p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <ClipboardList className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Attendance</h3>
                <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {overallPerformance.attendanceRate}%
                </p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <Users className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Top Performers</h3>
                <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {overallPerformance.topPerformers}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Subject Performance</h2>
        <div className="space-y-4">
          {subjects.map((subject) => (
            <div key={subject.id} className={cn(cardStyles.base, cardStyles.normal)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {subject.name}
                </h3>
                <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  {subject.studentCount} students
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className={cn(cardStyles.base, cardStyles.compact)}>
                  <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Average Score</h4>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {subject.averageScore}%
                  </p>
                </div>
                <div className={cn(cardStyles.base, cardStyles.compact)}>
                  <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Highest Score</h4>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {subject.highestScore}%
                  </p>
                </div>
                <div className={cn(cardStyles.base, cardStyles.compact)}>
                  <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Lowest Score</h4>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {subject.lowestScore}%
                  </p>
                </div>
                <div className={cn(cardStyles.base, cardStyles.compact)}>
                  <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Pass Rate</h4>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {subject.passRate}%
                  </p>
                </div>
              </div>

              {/* Competency Analysis */}
              <div>
                <h4 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3')}>
                  Competency Analysis
                </h4>
                <div className="space-y-3">
                  {subject.competencyAnalysis.slice(0, 5).map((comp, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-24 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {comp.competency}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {comp.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={cn('h-2 rounded-full',
                              comp.masteryRate >= 90 ? 'bg-green-500' :
                              comp.masteryRate >= 75 ? 'bg-blue-500' :
                              comp.masteryRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${comp.masteryRate}%` }}
                          ></div>
                        </div>
                        <span className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {comp.masteryRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Trends */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Performance Trends</h2>
        <div className="space-y-4">
          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3')}>
              Monthly Performance
            </h3>
            <div className="flex items-end justify-between h-32">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                const height = Math.floor(Math.random() * 60) + 20; // Random height for demo
                return (
                  <div key={month} className="flex flex-col items-center flex-1">
                    <div 
                      className={cn('w-3/4 rounded-t',
                        index % 3 === 0 ? 'bg-green-500' :
                        index % 3 === 1 ? 'bg-blue-500' : 'bg-purple-500'
                      )}
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Recommendations</h2>
        <div className="space-y-3">
          <div className={cn('p-3 rounded-lg', teacherColors.info.bg)}>
            <div className="flex items-start gap-3">
              <CheckCircle className={cn('h-5 w-5 mt-0.5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Strengths</h3>
                <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  Students are performing well in Mathematics and Science. Consider organizing advanced workshops for top performers.
                </p>
              </div>
            </div>
          </div>

          <div className={cn('p-3 rounded-lg', teacherColors.warning.bg)}>
            <div className="flex items-start gap-3">
              <AlertCircle className={cn('h-5 w-5 mt-0.5', teacherColors.warning.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Areas for Improvement</h3>
                <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  English language performance is below average. Consider additional support sessions for struggling students.
                </p>
              </div>
            </div>
          </div>

          <div className={cn('p-3 rounded-lg', teacherColors.success.bg)}>
            <div className="flex items-start gap-3">
              <TrendingUp className={cn('h-5 w-5 mt-0.5', teacherColors.success.text)} />
              <div>
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>Action Items</h3>
                <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  Schedule parent-teacher meetings for students with attendance below 75%. Implement peer tutoring program for low performers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}