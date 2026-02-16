'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  FileText,
  TrendingUp,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  FolderOpen,
  Eye,
  Edit3,
  BarChart3
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
 * Assessments & Results Overview Page for Teacher Portal
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 * - Overview of all assessment activities (CA and Exams)
 * - Ability to create multiple CA entries per subject
 * - Proper CA (20%) and Exam (80%) calculation
 * - Support CA-only, Exam-only, or Combined workflows
 * - Clear status indicators for each assessment type
 * - Links to detailed assessment entry pages
 */

interface AssessmentType {
  id: string
  name: string
  type: 'ca' | 'exam' | 'combined'
  status: 'draft' | 'submitted' | 'approved' | 'pending'
  date: string
  subject: string
  class: string
  caCount?: number
  examCount?: number
  caPercentage?: number
  examPercentage?: number
  totalStudents: number
  completedStudents: number
}

interface ClassSubject {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  caEntries: number
  examEntries: number
  caPercentage: number
  examPercentage: number
  totalStudents: number
  completedStudents: number
}

interface AssessmentOverviewData {
  classes: ClassSubject[]
  pendingAssessments: AssessmentType[]
  upcomingDeadlines: Array<{
    id: string
    title: string
    subject: string
    class: string
    deadline: string
    type: 'ca' | 'exam'
  }>
}

export default function AssessmentsPage() {
  const [data, setData] = useState<AssessmentOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/teacher/assessments/overview')
        if (!response.ok) {
          throw new Error('Failed to fetch assessment data')
        }
        const assessmentData = await response.json()
        setData(assessmentData)
      } catch (err) {
        setError('Unable to load assessment data')
        console.error('Error fetching assessment data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || 'Unable to load assessment data'}</span>
          </div>
        </div>
      </div>
    )
  }

  const { classes, pendingAssessments, upcomingDeadlines } = data

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <BookOpen className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Assessments & Results
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Manage Continuous Assessment (CA) and Exam results for your assigned classes
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Total Classes</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classes.length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                <Users className={cn('h-5 w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Pending Submissions</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {pendingAssessments.length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.warning.bg)}>
                <Clock className={cn('h-5 w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Upcoming Deadlines</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {upcomingDeadlines.length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.danger.bg)}>
                <AlertTriangle className={cn('h-5 w-5', teacherColors.danger.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>CA Entries</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classes.reduce((sum, cls) => sum + cls.caEntries, 0)}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <FileText className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Classes with Assessment Status */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>My Classes</CardTitle>
              <Link
                href="/teacher/classes"
                className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <div className="space-y-4">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                            {cls.className}
                          </h3>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                            {cls.subjectName} • {cls.totalStudents} students
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/teacher/assessments/ca?classId=${cls.classId}&subjectId=${cls.subjectId}`}>
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              CA
                            </Button>
                          </Link>
                          <Link href={`/teacher/assessments/exam?classId=${cls.classId}&subjectId=${cls.subjectId}`}>
                            <Button size="sm" variant="outline">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Exam
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>
                            CA Progress
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  cls.caPercentage >= 90 ? 'bg-green-500' :
                                  cls.caPercentage >= 75 ? 'bg-blue-500' :
                                  cls.caPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${cls.caPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {cls.caEntries} entries
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>
                            Exam Progress
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  cls.examPercentage >= 90 ? 'bg-green-500' :
                                  cls.examPercentage >= 75 ? 'bg-blue-500' :
                                  cls.examPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${cls.examPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {cls.examEntries} entries
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Classes Assigned
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    You are not currently assigned to any classes. Contact administration for class assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Assessments & Upcoming Deadlines */}
        <div>
          {/* Pending Assessments */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mb-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Pending Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAssessments.length > 0 ? (
                <div className="space-y-3">
                  {pendingAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        teacherColors.warning.bg,
                        teacherColors.warning.border
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', teacherColors.warning.bg)}>
                          <Clock className={cn('h-4 w-4', teacherColors.warning.text)} />
                        </div>
                        <div>
                          <div className={cn(typography.label, 'capitalize')}>
                            {assessment.type} - {assessment.name}
                          </div>
                          <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                            {assessment.class} • {assessment.subject}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{assessment.status}</Badge>
                        <Link href={`/teacher/assessments/${assessment.type}?classId=${assessment.classId}&subjectId=${assessment.subjectId}&assessmentId=${assessment.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    No pending submissions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-3">
                  {upcomingDeadlines.map((deadline) => (
                    <div
                      key={deadline.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border',
                        teacherColors.danger.bg,
                        teacherColors.danger.border
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', teacherColors.danger.bg)}>
                          <AlertTriangle className={cn('h-4 w-4', teacherColors.danger.text)} />
                        </div>
                        <div>
                          <div className={cn(typography.label, 'capitalize')}>
                            {deadline.title}
                          </div>
                          <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                            {deadline.class} • {deadline.subject}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                          Due
                        </div>
                        <div className={cn('text-sm font-medium', teacherColors.danger.text)}>
                          {new Date(deadline.deadline).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    No upcoming deadlines
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assessment Creation Quick Links */}
      <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>Create New Assessment</CardTitle>
          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Select the type of assessment you want to create
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/teacher/assessments/ca/new">
              <Card className={cn(
                cardStyles.base,
                'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer',
                transitions.color
              )}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn('p-3 rounded-lg mb-3', teacherColors.success.bg)}>
                    <FileText className={cn('h-6 w-6', teacherColors.success.text)} />
                  </div>
                  <h3 className={cn(typography.h3, 'mb-1')}>Continuous Assessment</h3>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-3')}>
                    Create CA entries (contributes 20% to final grade)
                  </p>
                  <Badge variant="outline">CA (20%)</Badge>
                </CardContent>
              </Card>
            </Link>

            <Link href="/teacher/assessments/exam/new">
              <Card className={cn(
                cardStyles.base,
                'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer',
                transitions.color
              )}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn('p-3 rounded-lg mb-3', teacherColors.info.bg)}>
                    <TrendingUp className={cn('h-6 w-6', teacherColors.info.text)} />
                  </div>
                  <h3 className={cn(typography.h3, 'mb-1')}>Exam</h3>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-3')}>
                    Create exam entries (contributes 80% to final grade)
                  </p>
                  <Badge variant="outline">Exam (80%)</Badge>
                </CardContent>
              </Card>
            </Link>

            <Link href="/teacher/assessments/report">
              <Card className={cn(
                cardStyles.base,
                'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all cursor-pointer',
                transitions.color
              )}>
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={cn('p-3 rounded-lg mb-3', teacherColors.info.bg)}>
                    <BarChart3 className={cn('h-6 w-6', teacherColors.info.text)} />
                  </div>
                  <h3 className={cn(typography.h3, 'mb-1')}>Assessment Report</h3>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-3')}>
                    View and print assessment reports
                  </p>
                  <Badge variant="outline">Reports</Badge>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}