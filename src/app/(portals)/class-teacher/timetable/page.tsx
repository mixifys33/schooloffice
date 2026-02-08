'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit3
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
 * Timetable Page for Class Teacher Portal
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * - Weekly timetable view
 * - Daily focus view
 * - Highlights: Today, Current period, Locked timetable
 * - Subject and class clickable → jumps to teaching context
 * - Connects time → class → subject → assessment
 */

interface TimetableEntry {
  period: number
  startTime: string
  endTime: string
  className: string
  streamName: string | null
  subjectName: string
  room: string
  isCurrent: boolean
  isToday: boolean
  isBreak: boolean
  breakName?: string
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

interface ClassTeacherTimetableData {
  context: ClassTeacherContextData
  class: {
    id: string
    name: string
    streamName: string | null
  } | null
  timetable: {
    monday: TimetableEntry[]
    tuesday: TimetableEntry[]
    wednesday: TimetableEntry[]
    thursday: TimetableEntry[]
    friday: TimetableEntry[]
  }
  todaySchedule: TimetableEntry[]
}

export default function ClassTeacherTimetablePage() {
  const [data, setData] = useState<ClassTeacherTimetableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly')

  useEffect(() => {
    async function fetchTimetableData() {
      try {
        const response = await fetch('/api/class-teacher/timetable')
        if (!response.ok) {
          throw new Error('Failed to fetch timetable data')
        }
        const timetableData = await response.json()
        setData(timetableData)
      } catch (err) {
        setError('Unable to load timetable')
        console.error('Error fetching class teacher timetable:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTimetableData()
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

  const { context, class: classData, timetable, todaySchedule } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  // Days of the week
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Calendar className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              {classData ? `${classData.name} ${classData.streamName ? `(${classData.streamName})` : ''} Timetable` : 'My Timetable'}
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Your weekly teaching schedule and class assignments
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context Error Warning */}
      {hasContextError && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]')}>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Timetable Access Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {context.contextError || 'Academic context could not be determined. Please contact administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={cn(typography.sectionTitle)}>Timetable View</h2>
            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Switch between weekly and daily views
            </p>
          </div>
          <div className="flex rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'weekly'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-transparent text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'daily'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-transparent text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
              }`}
            >
              Daily
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Total Classes</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {todaySchedule.filter(lesson => !lesson.isBreak).length}
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
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Subjects</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {[...new Set(todaySchedule.filter(lesson => !lesson.isBreak).map(lesson => lesson.subjectName))].length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <BookOpen className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Today's Lessons</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {todaySchedule.filter(lesson => !lesson.isBreak && lesson.isToday).length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.chart.blue.bg)}>
                <Clock className={cn('h-5 w-5', teacherColors.chart.blue.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Current Period</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {todaySchedule.find(lesson => lesson.isCurrent && lesson.isToday)?.period || 'None'}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.warning.bg)}>
                <Clock className={cn('h-5 w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily View */}
      {viewMode === 'daily' && (
        <Card className={cn(cardStyles.base, cardStyles.normal)}>
          <CardHeader>
            <CardTitle className={cn(typography.sectionTitle)}>Today's Schedule</CardTitle>
            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((lesson, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      lesson.isCurrent
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]'
                        : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                          <Clock className={cn('h-4 w-4', teacherColors.info.text)} />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            P{lesson.period}: {lesson.startTime} - {lesson.endTime}
                          </div>
                          {lesson.isBreak ? (
                            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                              {lesson.breakName}
                            </div>
                          ) : (
                            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                              {lesson.subjectName} • {lesson.className} {lesson.streamName && `(${lesson.streamName})`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!lesson.isBreak && (
                        <>
                          <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                            <MapPin className="h-3 w-3" />
                            {lesson.room}
                          </div>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </>
                      )}
                      {lesson.isCurrent && (
                        <Badge variant="default">Now</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Classes Today
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Check back tomorrow for your scheduled classes.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <Card className={cn(cardStyles.base, cardStyles.normal)}>
          <CardHeader>
            <CardTitle className={cn(typography.sectionTitle)}>Weekly Schedule</CardTitle>
            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Your complete teaching timetable for the week
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-left font-medium">Time</th>
                    {dayNames.map(day => (
                      <th key={day} className="border p-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-left font-medium min-w-32">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Generate time slots dynamically based on the timetable */}
                  {Array.from({ length: 10 }, (_, periodIndex) => {
                    const period = periodIndex + 1;
                    const timeSlot = `${8 + Math.floor(periodIndex / 2)}:${periodIndex % 2 === 0 ? '00' : '40'} - ${8 + Math.floor((periodIndex + 1) / 2)}:${(periodIndex + 1) % 2 === 0 ? '00' : '40'}`;
                    
                    return (
                      <tr key={period}>
                        <td className="border p-2 font-medium text-sm bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50">
                          {timeSlot}
                        </td>
                        {days.map(day => {
                          const lessons = timetable[day];
                          const lesson = lessons.find(l => l.period === period);
                          
                          if (!lesson) {
                            return (
                              <td key={day} className="border p-2">
                                <div className="text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                  Free
                                </div>
                              </td>
                            );
                          }
                          
                          if (lesson.isBreak) {
                            return (
                              <td key={day} className="border p-2">
                                <div className="text-center text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                  {lesson.breakName}
                                </div>
                              </td>
                            );
                          }
                          
                          return (
                            <td key={day} className="border p-2">
                              <div className="space-y-1">
                                <Badge variant="default" className="text-xs">
                                  {lesson.subjectName}
                                </Badge>
                                <p className="text-sm font-medium">{lesson.className} {lesson.streamName && `(${lesson.streamName})`}</p>
                                <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                  <MapPin className="h-3 w-3" />
                                  {lesson.room}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Information */}
      <Card className={cn(cardStyles.base, cardStyles.normal)}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>Class Information</CardTitle>
          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Quick access to your class details
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classData ? (
              <div className="flex items-center justify-between p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                <div>
                  <p className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {classData.name} {classData.streamName && `(${classData.streamName})`}
                  </p>
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Your assigned class
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Class Teacher
                  </p>
                  <Link href="/class-teacher/class-details">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  No class assigned
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}