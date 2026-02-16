'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Home,
  GraduationCap,
  Calendar,
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Award,
  FolderOpen,
  Eye,
  Edit3,
  Plus,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
 * Enhanced Class Teacher Dashboard
 * Requirements: 1.1, 1.4, 2.1-2.7, 12.1-12.4, 14.1-14.4
 * - Context-aware dashboard that respects term/year state
 * - "My Classes" section showing assigned classes
 * - "Students" section showing enrolled students
 * - "Performance" section showing class performance
 * - Quick action buttons: Take attendance, Enter marks, View reports
 * - Limited to assigned class only
 * - Disable data entry when context is invalid (1.4)
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 * - Enhanced with class management features
 */

interface ClassTeacherDashboardData {
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
    averageAttendance: number
    averagePerformance: number
    caContribution: number
    examContribution: number
    isClassTeacher: boolean
  } | null
  students: Array<{
    id: string
    name: string
    admissionNumber: string
    gender: string | null
    age: number | null
    parentPhone: string | null
    parentEmail: string | null
    status: string
    attendanceRate: number
    performance: number
    caScore: number | null
    examScore: number | null
    finalScore: number | null
    lastAttendanceDate: string | null
    lastMarkEntryDate: string | null
  }>
  performance: Array<{
    subject: string
    averageScore: number
    highestScore: number
    lowestScore: number
    passRate: number
    topPerformers: number
    attendanceRate: number
    caAverage: number
    examAverage: number
  }>
  curriculumTopics: Array<{
    id: string
    name: string
    subject: string
    status: 'not-started' | 'in-progress' | 'completed'
    completionDate: string | null
  }>
  alerts: {
    pendingAttendance: Array<{ id: string; classId: string; className: string; date: string; message: string }>
    marksDeadlines: Array<{ id: string; examId: string; examName: string; subjectId: string; subjectName: string; deadline: string; message: string }>
    caPending: Array<{ id: string; subjectId: string; subjectName: string; caName: string; deadline: string; message: string }>
    evidencePending: Array<{ id: string; subjectId: string; subjectName: string; taskName: string; deadline: string; message: string }>
  }
}

export default function ClassTeacherDashboardPage() {
  const [data, setData] = useState<ClassTeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/class-teacher/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError('Unable to load dashboard')
        console.error('Error fetching class teacher dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
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

  const { context, class: classData, students, performance, curriculumTopics, alerts } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Welcome Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Shield className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Welcome, {teacherName}
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

      {/* Quick Actions */}
      <div className={cn('flex flex-wrap gap-3', spacing.card)}>
        <Link
          href={hasContextError ? '#' : '/class-teacher/attendance'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
              <ClipboardList className={cn('h-6 w-6', teacherColors.info.text)} />
            </div>
            <div>
              <h3 className={typography.label}>Take Attendance</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Record daily attendance
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={hasContextError ? '#' : '/class-teacher/assessments'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
              <BookOpen className={cn('h-6 w-6', teacherColors.success.text)} />
            </div>
            <div>
              <h3 className={typography.label}>Assessments</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Manage CA & Exam scores
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={hasContextError ? '#' : '/class-teacher/evidence'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
              <FolderOpen className={cn('h-6 w-6', teacherColors.success.text)} />
            </div>
            <div>
              <h3 className={typography.label}>Learning Evidence</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Upload assignments & projects
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={hasContextError ? '#' : '/class-teacher/reports'}
          className={cn(
            'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
            hasContextError
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800',
            teacherColors.secondary.bg,
            teacherColors.secondary.border
          )}
          onClick={hasContextError ? (e) => e.preventDefault() : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
              <BarChart3 className={cn('h-6 w-6', teacherColors.info.text)} />
            </div>
            <div>
              <h3 className={typography.label}>View Reports</h3>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Monitor class performance
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* My Class Section */}
      {classData && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={typography.sectionTitle}>My Class</h2>
            <Link
              href="/class-teacher/class-details"
              className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
            >
              View details →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-[var(--text-muted)]" />
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{classData.name} {classData.streamName && `(${classData.streamName})`}</h3>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    {classData.studentCount} students
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Attendance</h4>
              <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                {classData.averageAttendance}%
              </p>
            </div>
            
            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Performance</h4>
              <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                {classData.averagePerformance}%
              </p>
            </div>
            
            <div className={cn(cardStyles.base, cardStyles.compact)}>
              <h4 className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Class Teacher</h4>
              <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                {classData.isClassTeacher ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Coverage */}
      {curriculumTopics && curriculumTopics.length > 0 && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={typography.sectionTitle}>Curriculum Coverage</h2>
            <Link
              href="/class-teacher/curriculum"
              className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
            >
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            {curriculumTopics.slice(0, 4).map((topic) => (
              <div key={topic.id} className="flex items-center justify-between p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                <div>
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {topic.name}
                  </h3>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    {topic.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      topic.status === 'completed' ? 'default' : 
                      topic.status === 'in-progress' ? 'secondary' : 'outline'
                    }
                  >
                    {topic.status.replace('-', ' ')}
                  </Badge>
                  {topic.completionDate && (
                    <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      {new Date(topic.completionDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Section */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={typography.sectionTitle}>Students</h2>
          <Link
            href="/class-teacher/students"
            className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
          >
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(teacherColors.secondary.bg)}>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Admission #</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Attendance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">CA (20%)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Exam (80%)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Final</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {students.slice(0, 5).map((student) => (
                <tr key={student.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{student.admissionNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mr-2">
                        <div
                          className={cn(
                            'h-2 rounded-full',
                            student.attendanceRate >= 90 ? 'bg-green-500' :
                            student.attendanceRate >= 75 ? 'bg-blue-500' :
                            student.attendanceRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${student.attendanceRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                        {student.attendanceRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {student.caScore !== null ? `${student.caScore}/20` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {student.examScore !== null ? `${student.examScore}/80` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {student.finalScore !== null ? `${student.finalScore}/100` : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Section */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={typography.sectionTitle}>Class Performance</h2>
          <Link
            href="/class-teacher/performance"
            className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {performance.slice(0, 4).map((subject, index) => (
            <div key={index} className={cn(cardStyles.base, cardStyles.compact)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{subject.subject}</h3>
                <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Avg Score</p>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{subject.averageScore}%</p>
                </div>
                <div>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Pass Rate</p>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{subject.passRate}%</p>
                </div>
                <div>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>CA Avg</p>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{subject.caAverage}%</p>
                </div>
                <div>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Exam Avg</p>
                  <p className={cn(typography.label, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{subject.examAverage}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts Section */}
      {(alerts.pendingAttendance.length > 0 || 
        alerts.marksDeadlines.length > 0 || 
        alerts.caPending.length > 0 || 
        alerts.evidencePending.length > 0) && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={typography.sectionTitle}>Alerts & Obligations</h2>

          <div className="space-y-3">
            {alerts.pendingAttendance.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  teacherColors.warning.bg,
                  teacherColors.warning.border
                )}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className={cn('h-5 w-5', teacherColors.warning.text)} />
                  <div>
                    <div className={typography.label}>
                      Take Attendance
                    </div>
                    <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      {alert.className} • {alert.date}
                    </div>
                  </div>
                </div>
                <div className={cn('text-sm font-medium', teacherColors.warning.text)}>
                  Due Today
                </div>
              </div>
            ))}

            {alerts.marksDeadlines.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  teacherColors.info.bg,
                  teacherColors.info.border
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={cn('h-5 w-5', teacherColors.info.text)} />
                  <div>
                    <div className={typography.label}>
                      Enter Marks
                    </div>
                    <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      {alert.subjectName} • {alert.examName}
                    </div>
                  </div>
                </div>
                <div className={cn('text-sm font-medium', teacherColors.info.text)}>
                  {new Date(alert.deadline).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}

            {alerts.caPending.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  teacherColors.success.bg,
                  teacherColors.success.border
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className={cn('h-5 w-5', teacherColors.success.text)} />
                  <div>
                    <div className={typography.label}>
                      CA Entry Due
                    </div>
                    <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      {alert.subjectName} • {alert.caName}
                    </div>
                  </div>
                </div>
                <div className={cn('text-sm font-medium', teacherColors.success.text)}>
                  Due {new Date(alert.deadline).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}

            {alerts.evidencePending.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  teacherColors.success.bg,
                  teacherColors.success.border
                )}
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className={cn('h-5 w-5', teacherColors.success.text)} />
                  <div>
                    <div className={typography.label}>
                      Evidence Upload
                    </div>
                    <div className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      {alert.subjectName} • {alert.taskName}
                    </div>
                  </div>
                </div>
                <div className={cn('text-sm font-medium', teacherColors.success.text)}>
                  Due {new Date(alert.deadline).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}