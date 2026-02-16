'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Users, CheckCircle, AlertCircle, Calendar, BarChart3 } from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import { 
  errorMessages, 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

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

interface TermComparison {
  termId: string
  termName: string
  averageScore: number
  passRate: number
}

interface PerformanceData {
  context: {
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
  termComparison: TermComparison[]
  recommendations: {
    strengths: string[]
    improvements: string[]
    actions: string[]
  }
}

export default function ClassTeacherPerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null)
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

  const { context, class: classData, subjects, overallPerformance, termComparison, recommendations } = data
  const hasContextError = !!context.contextError

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Back Navigation */}
      <Link
        href="/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', teacherColors.success.bg)}>
            <TrendingUp className={cn('h-6 w-6', teacherColors.success.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>Performance Analytics</h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] mt-1')}>
              {classData ? `${classData.name} ${classData.streamName ? `(${classData.streamName})` : ''}` : 'Class Performance'}
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context Error Warning */}
      {hasContextError && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4 bg-[var(--warning-light)] border-[var(--warning-light)]')}>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Data Entry Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {context.contextError || 'Academic context could not be determined.'}
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
                <h3 className={cn(typography.h3)}>Average Score</h3>
                <p className={cn(typography.label)}>{overallPerformance.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <CheckCircle className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3)}>Pass Rate</h3>
                <p className={cn(typography.label)}>{overallPerformance.passRate}%</p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <Calendar className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3)}>Attendance</h3>
                <p className={cn(typography.label)}>{overallPerformance.attendanceRate}%</p>
              </div>
            </div>
          </div>

          <div className={cn(cardStyles.base, cardStyles.compact)}>
            <div className="flex items-center gap-3">
              <Users className={cn('h-5 w-5', teacherColors.info.text)} />
              <div>
                <h3 className={cn(typography.h3)}>Top Performers</h3>
                <p className={cn(typography.label)}>{overallPerformance.topPerformers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Term Comparison */}
      {termComparison.length > 0 && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={cn(typography.sectionTitle, 'mb-4')}>Term-by-Term Performance</h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {termComparison.map((term, index) => {
              const maxScore = Math.max(...termComparison.map((t) => t.averageScore), overallPerformance.averageScore);
              const height = (term.averageScore / maxScore) * 100;
              
              return (
                <div key={term.termId} className="flex flex-col items-center flex-1">
                  <span className="text-xs font-medium mb-1">{Math.round(term.averageScore)}%</span>
                  <div 
                    className="w-full rounded-t bg-blue-500"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-[var(--text-secondary)] mt-2">{term.termName}</span>
                </div>
              );
            })}
            {/* Current Term */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-xs font-medium mb-1">{Math.round(overallPerformance.averageScore)}%</span>
              <div 
                className="w-full rounded-t bg-green-500"
                style={{ 
                  height: `${(overallPerformance.averageScore / Math.max(...termComparison.map((t) => t.averageScore), overallPerformance.averageScore)) * 100}%` 
                }}
              ></div>
              <span className="text-xs text-[var(--text-secondary)] mt-2 font-semibold">
                {context.currentTerm?.name || 'Current'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Subject Performance */}
      {subjects.length > 0 ? (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={cn(typography.sectionTitle, 'mb-4')}>Subject Performance</h2>
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.id} className={cn(cardStyles.base, cardStyles.normal)}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn(typography.h3)}>{subject.name}</h3>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {subject.studentCount} students
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className={cn(cardStyles.base, cardStyles.compact)}>
                    <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] mb-1')}>Average Score</h4>
                    <p className={cn(typography.label)}>{subject.averageScore}%</p>
                  </div>
                  <div className={cn(cardStyles.base, cardStyles.compact)}>
                    <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] mb-1')}>Highest Score</h4>
                    <p className={cn(typography.label)}>{subject.highestScore}%</p>
                  </div>
                  <div className={cn(cardStyles.base, cardStyles.compact)}>
                    <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] mb-1')}>Lowest Score</h4>
                    <p className={cn(typography.label)}>{subject.lowestScore}%</p>
                  </div>
                  <div className={cn(cardStyles.base, cardStyles.compact)}>
                    <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] mb-1')}>Pass Rate</h4>
                    <p className={cn(typography.label)}>{subject.passRate}%</p>
                  </div>
                </div>

                {/* Competency Analysis */}
                {subject.competencyAnalysis.length > 0 && (
                  <div>
                    <h4 className={cn(typography.h3, 'mb-3')}>Competency Analysis</h4>
                    <div className="space-y-3">
                      {subject.competencyAnalysis.map((comp, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-24 text-sm text-[var(--text-secondary)]">
                              {comp.competency}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
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
                            <span className={cn(typography.label)}>{comp.masteryRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <p className="text-center text-[var(--text-secondary)]">
            No assessment data available for the current term.
          </p>
        </div>
      )}

      {/* Recommendations */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Recommendations</h2>
        <div className="space-y-3">
          {recommendations.strengths.length > 0 && (
            <div className={cn('p-3 rounded-lg', teacherColors.success.bg)}>
              <div className="flex items-start gap-3">
                <CheckCircle className={cn('h-5 w-5 mt-0.5', teacherColors.success.text)} />
                <div>
                  <h3 className={cn(typography.h3)}>Strengths</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {recommendations.strengths.map((strength, index) => (
                      <li key={index} className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {recommendations.improvements.length > 0 && (
            <div className={cn('p-3 rounded-lg', teacherColors.warning.bg)}>
              <div className="flex items-start gap-3">
                <AlertCircle className={cn('h-5 w-5 mt-0.5', teacherColors.warning.text)} />
                <div>
                  <h3 className={cn(typography.h3)}>Areas for Improvement</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {recommendations.improvements.map((improvement, index) => (
                      <li key={index} className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {recommendations.actions.length > 0 && (
            <div className={cn('p-3 rounded-lg', teacherColors.info.bg)}>
              <div className="flex items-start gap-3">
                <BarChart3 className={cn('h-5 w-5 mt-0.5', teacherColors.info.text)} />
                <div>
                  <h3 className={cn(typography.h3)}>Action Items</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {recommendations.actions.map((action, index) => (
                      <li key={index} className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
