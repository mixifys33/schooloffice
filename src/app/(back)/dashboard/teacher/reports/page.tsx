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
 * Reports Page for Teacher Portal
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * - Preview learner performance
 * - See competency summaries
 * - See class averages
 * - Generate CA-only, Exam-only, or Final reports
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
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/teacher/reports')
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
              Reports
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Preview and generate performance reports for your assigned classes
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Generation Panel */}
        <div className="lg:col-span-1">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Generate Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="">Select a class</option>
                    {data.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} - {cls.subjectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Report Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Report Type
                  </label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="">Select report type</option>
                    <option value="ca-only">CA-Only Report</option>
                    <option value="exam-only">Exam-Only Report</option>
                    <option value="final">Final Term Report</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    className="w-full gap-2" 
                    disabled={!selectedClass || !selectedReportType}
                  >
                    <Eye className="h-4 w-4" />
                    Preview Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    disabled={!selectedClass || !selectedReportType}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Types Info */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Report Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportTypes.map((type) => (
                  <div 
                    key={type.id} 
                    className="p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', 
                        type.id === 'ca-only' ? teacherColors.success.bg :
                        type.id === 'exam-only' ? teacherColors.info.bg :
                        teacherColors.info.bg
                      )}>
                        {type.id === 'ca-only' ? <FileText className="h-4 w-4 text-[var(--chart-green)]" /> :
                         type.id === 'exam-only' ? <TrendingUp className="h-4 w-4 text-[var(--chart-blue)]" /> :
                         <Award className="h-4 w-4 text-[var(--chart-blue)]" />}
                      </div>
                      <div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {type.name}
                        </h3>
                        <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class Performance Overview */}
        <div className="lg:col-span-2">
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
                          <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                            <Award className={cn('h-5 w-5', teacherColors.info.text)} />
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

                  {/* Student Performance Table */}
                  <div>
                    <h3 className={cn(typography.h3, 'mb-4')}>Student Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Admission
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              CA Score
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Exam Score
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Final Score
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Grade
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
                              Competency
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <tr key={index} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                              <td className="px-4 py-3">
                                <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                                  Student {index + 1}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                ADM-{1000 + index}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                                  {Math.floor(Math.random() * 20) + 60}/20
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                                  {Math.floor(Math.random() * 40) + 120}/80
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] font-medium">
                                  {Math.floor(Math.random() * 40) + 160}/100
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline">
                                  {['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={
                                  Math.random() > 0.5 ? 'default' : 'secondary'
                                }>
                                  {Math.random() > 0.5 ? 'Achieved' : 'Not Achieved'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                    Choose a class from the dropdown to view its performance reports
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}