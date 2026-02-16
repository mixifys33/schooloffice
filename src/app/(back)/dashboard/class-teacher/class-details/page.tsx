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
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn('p-2 sm:p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Shield className={cn('h-5 w-5 sm:h-6 sm:w-6', teacherColors.info.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] truncate">
              {classData.name} {classData.streamName && `(${classData.streamName})`} - Class Details
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-0.5 sm:mt-1">
              Manage your class as a class teacher
            </p>
          </div>
        </div>
      </div>

      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Students</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.studentCount}
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.info.bg)}>
                <Users className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Performance</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.averagePerformance}%
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.info.bg)}>
                <TrendingUp className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact, 'col-span-2 lg:col-span-1')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Attendance</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.averageAttendance}%
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.success.bg)}>
                <ClipboardList className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact, 'col-span-2 lg:col-span-1')}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Class Teacher</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.isClassTeacher ? 'Yes' : 'No'}
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.warning.bg)}>
                <Shield className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Student Roster */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Student Roster</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Add Student</span>
                  <span className="xs:hidden">Add</span>
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {students.map((student) => (
                  <div 
                    key={student.id} 
                    className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm">
                          {student.name}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">CA</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.caScore !== null ? `${student.caScore}/20` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Exam</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.examScore !== null ? `${student.examScore}/80` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Final</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.finalScore !== null ? `${student.finalScore}/100` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn(teacherColors.secondary.bg)}>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">CA (20)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Exam (80)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Final</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm">
                            {student.name}
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
                          <div className="flex justify-center gap-2">
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
        <div className="space-y-4 sm:space-y-6">
          {/* Curriculum Coverage */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Curriculum</CardTitle>
              <Badge variant="outline" className="text-sm">{curriculumTopics.length} topics</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {curriculumTopics.slice(0, 4).map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] truncate">
                        {topic.name}
                      </h3>
                      <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                        {topic.subject}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant={
                          topic.status === 'completed' ? 'default' : 
                          topic.status === 'in-progress' ? 'secondary' : 'outline'
                        }
                        className="text-xs sm:text-sm whitespace-nowrap"
                      >
                        {topic.status.replace('-', ' ')}
                      </Badge>
                      {topic.completionDate && (
                        <span className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(topic.completionDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Topics
              </Button>
            </CardContent>
          </Card>

          {/* Class Tasks */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Class Tasks</CardTitle>
              <Badge variant="outline" className="text-sm">{classTasks.length} tasks</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {classTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {task.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
                          {task.description.substring(0, 50)}...
                        </p>
                      </div>
                      <Badge 
                        variant={
                          task.status === 'completed' ? 'default' : 
                          task.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                        className="text-xs sm:text-sm whitespace-nowrap"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        Due: {new Date(task.dueDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        By: {task.assignedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Announcements</CardTitle>
              <Badge variant="outline" className="text-sm">{classAnnouncements.length} announcements</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {classAnnouncements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {announcement.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
                          {announcement.content.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm sm:text-base">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        {new Date(announcement.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        By: {announcement.author}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Announcements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}