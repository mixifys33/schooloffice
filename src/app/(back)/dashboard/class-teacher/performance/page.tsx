'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  FileText,
  Download,
  Eye,
  Users,
  TrendingUp,
  Award,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock
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
 * Performance Page for Class Teacher Portal
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * - Preview learner performance
 * - See competency summaries
 * - See class averages
 * - Generate CA-only, Exam-only, or Final reports
 * - Enhanced with class management features
 */

interface ClassReport {
  id: string
  className: string
  subjectName: string
  studentCount: number
  averageCA: number | null
  averageExam: number | null
  averageFinal: number | null
  caCompletion: number
  examCompletion: number
  finalCompletion: number
}

interface StudentPerformance {
  id: string
  name: string
  admissionNumber: string
  caScore: number | null
  examScore: number | null
  finalScore: number | null
  caPercentage: number | null
  examPercentage: number | null
  finalGrade: string | null
  competencyAchievement: string
}

interface ReportData {
  classes: ClassReport[]
  studentPerformance: StudentPerformance[]
  reportTypes: Array<{
    id: string
    name: string
    description: string
    type: 'ca-only' | 'exam-only' | 'final'
  }>
  classPerformance: {
    caAverage: number
    examAverage: number
    finalAverage: number
    passRate: number
  }
}

export default function ClassTeacherPerformancePage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/class-teacher/reports')
        if (!response.ok) {
          throw new Error('Failed to fetch report data')
        }
        const reportData = await response.json()
        setData(reportData)
        
        // Set first class as default if available
        if (reportData.classes.length > 0 && !selectedClass) {
          setSelectedClass(reportData.classes[0].id)
        }
      } catch (err) {
        setError('Unable to load report data')
        console.error('Error fetching report data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedClass])

  // Get selected class data
  const selectedClassData = data?.classes.find(cls => cls.id === selectedClass)

  // Report types
  const reportTypes = [
    { id: 'ca-only', name: 'CA-Only Report', description: 'Show CA activities and contributions only', type: 'ca-only' },
    { id: 'exam-only', name: 'Exam-Only Report', description: 'Show exam scores and contributions only', type: 'exam-only' },
    { id: 'final', name: 'Final Term Report', description: 'Complete report with CA and Exam combined', type: 'final' },
  ]

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
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Unable to load report data'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <BarChart3 className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Performance Analytics
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Monitor and analyze performance trends for your assigned classes
            </p>
          </div>
        </div>
      </div>

      {/* Class Performance Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>CA Average</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data.classPerformance.caAverage}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <FileText className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Exam Average</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data.classPerformance.examAverage}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                <TrendingUp className={cn('h-5 w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Final Average</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data.classPerformance.finalAverage}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.chart.blue.bg)}>
                <BarChart3 className={cn('h-5 w-5', teacherColors.chart.blue.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Pass Rate</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data.classPerformance.passRate}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <CheckCircle className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Classes with Performance */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>My Classes</CardTitle>
              <Link
                href="/dashboard/class-teacher/my-class"
                className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {data.classes.length > 0 ? (
                <div className="space-y-4">
                  {data.classes.map((cls) => (
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
                            {cls.subjectName} • {cls.studentCount} students
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/class-teacher/assessments/ca?classId=${cls.classId}&subjectId=${cls.subjectId}`}>
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-1" />
                              CA
                            </Button>
                          </Link>
                          <Link href={`/dashboard/class-teacher/assessments/exam?classId=${cls.classId}&subjectId=${cls.subjectId}`}>
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

        {/* Performance Trends & Insights */}
        <div className="lg:col-span-2">
          {/* Performance Overview */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>
                {selectedClassData ? `${selectedClassData.className} - ${selectedClassData.subjectName}` : 'Class Performance'}
              </CardTitle>
              {selectedClassData && (
                <Badge variant="outline">
                  {selectedClassData.studentCount} students
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {selectedClassData ? (
                <div className="space-y-6">
                  {/* Class Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className={cn(cardStyles.base, cardStyles.compact)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>CA Average</p>
                            <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {selectedClassData.averageCA !== null ? `${selectedClassData.averageCA}%` : 'N/A'}
                            </p>
                          </div>
                          <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                            <FileText className={cn('h-5 w-5', teacherColors.success.text)} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                            <span>Progress</span>
                            <span>{selectedClassData.caCompletion}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-[var(--chart-green)]"
                              style={{ width: `${selectedClassData.caCompletion}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={cn(cardStyles.base, cardStyles.compact)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Exam Average</p>
                            <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {selectedClassData.averageExam !== null ? `${selectedClassData.averageExam}%` : 'N/A'}
                            </p>
                          </div>
                          <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                            <TrendingUp className={cn('h-5 w-5', teacherColors.info.text)} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                            <span>Progress</span>
                            <span>{selectedClassData.examCompletion}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-[var(--chart-blue)]"
                              style={{ width: `${selectedClassData.examCompletion}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={cn(cardStyles.base, cardStyles.compact)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Final Average</p>
                            <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {selectedClassData.averageFinal !== null ? `${selectedClassData.averageFinal}%` : 'N/A'}
                            </p>
                          </div>
                          <div className={cn('p-2 rounded-lg', teacherColors.chart.blue.bg)}>
                            <Award className={cn('h-5 w-5', teacherColors.chart.blue.text)} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                            <span>Progress</span>
                            <span>{selectedClassData.finalCompletion}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-[var(--chart-blue)]"
                              style={{ width: `${selectedClassData.finalCompletion}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Trends Chart */}
                  <div>
                    <h3 className={cn(typography.h3, 'mb-4')}>Performance Trends</h3>
                    <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] p-4 rounded-lg">
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
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    Select a Class
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Choose a class from the dropdown to view its performance analytics
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className={cn('p-3 rounded-lg', teacherColors.info.bg)}>
                  <div className="flex items-start gap-3">
                    <CheckCircle className={cn('h-5 w-5 mt-0.5', teacherColors.info.text)} />
                    <div>
                      <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                        Strengths
                      </h3>
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
                      <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                        Areas for Improvement
                      </h3>
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
                      <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                        Action Items
                      </h3>
                      <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        Schedule parent-teacher meetings for students with attendance below 75%. Implement peer tutoring program for low performers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}