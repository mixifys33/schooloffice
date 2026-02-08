'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Users,
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
 * Class Details Page for Class Teacher Portal
 * Requirements: Class management features for class teachers
 * - Detailed class information
 * - Student roster management
 * - Class performance tracking
 * - Curriculum coverage tracking
 * - Class-specific tasks and responsibilities
 */

interface ClassDetailsData {
  class: {
    id: string
    name: string
    streamName: string | null
    teacherName: string
    studentCount: number
    averageAttendance: number
    averagePerformance: number
    caContribution: number
    examContribution: number
    isClassTeacher: boolean
  }
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
  curriculumTopics: Array<{
    id: string
    name: string
    subject: string
    status: 'not-started' | 'in-progress' | 'completed'
    completionDate: string | null
  }>
  classTasks: Array<{
    id: string
    title: string
    description: string
    dueDate: string
    status: 'pending' | 'completed' | 'overdue'
    assignedBy: string
  }>
  classAnnouncements: Array<{
    id: string
    title: string
    content: string
    date: string
    author: string
  }>
}

export default function ClassTeacherClassDetailsPage() {
  const [data, setData] = useState<ClassDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClassDetails() {
      try {
        const response = await fetch('/api/class-teacher/class-details')
        if (!response.ok) {
          throw new Error('Failed to fetch class details')
        }
        const classData = await response.json()
        setData(classData)
      } catch (err) {
        setError('Unable to load class details')
        console.error('Error fetching class details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClassDetails()
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

  const { class: classData, students, curriculumTopics, classTasks, classAnnouncements } = data

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Shield className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              {classData.name} {classData.streamName && `(${classData.streamName})`} - Class Details
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Manage your class as a class teacher
            </p>
          </div>
        </div>
      </div>

      {/* Class Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Students</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classData.studentCount}
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
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Attendance</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classData.averageAttendance}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <ClipboardList className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Performance</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classData.averagePerformance}%
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.chart.blue.bg)}>
                <TrendingUp className={cn('h-5 w-5', teacherColors.chart.blue.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Class Teacher</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {classData.isClassTeacher ? 'Yes' : 'No'}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.warning.bg)}>
                <Shield className={cn('h-5 w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Roster */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Student Roster</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {students.map((student) => (
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
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class Management Sidebar */}
        <div className="space-y-6">
          {/* Curriculum Coverage */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Curriculum</CardTitle>
              <Badge variant="outline">{curriculumTopics.length} topics</Badge>
            </CardHeader>
            <CardContent>
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
              <Button variant="outline" className="w-full mt-4">
                View All Topics
              </Button>
            </CardContent>
          </Card>

          {/* Class Tasks */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Class Tasks</CardTitle>
              <Badge variant="outline">{classTasks.length} tasks</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {task.title}
                        </h3>
                        <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                          {task.description.substring(0, 50)}...
                        </p>
                      </div>
                      <Badge 
                        variant={
                          task.status === 'completed' ? 'default' : 
                          task.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        Due: {new Date(task.dueDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        By: {task.assignedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Announcements</CardTitle>
              <Badge variant="outline">{classAnnouncements.length} announcements</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classAnnouncements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {announcement.title}
                        </h3>
                        <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                          {announcement.content.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        {new Date(announcement.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        By: {announcement.author}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Announcements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}