'use client'

import React, { useState, useEffect } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'

/**
 * Student Portal - Timetable View
 * Requirement 23.5: Fetch and display class timetable entries from API
 */

interface TimetableLesson {
  period: number
  subject: string
  teacher: string
  room: string | null
}

interface PeriodDefinition {
  number: number
  startTime: string
  endTime: string
}

interface BreakDefinition {
  name: string
  startTime: string
  endTime: string
}

interface StudentTimetableResponse {
  student: {
    name: string
    className: string
    streamName: string | null
  }
  currentTerm: string
  periods: PeriodDefinition[]
  breaks: BreakDefinition[]
  schedule: {
    Monday: TimetableLesson[]
    Tuesday: TimetableLesson[]
    Wednesday: TimetableLesson[]
    Thursday: TimetableLesson[]
    Friday: TimetableLesson[]
  }
}

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    Mathematics: 'bg-[var(--info-light)] border-[var(--info)] text-[var(--info-dark)]',
    English: 'bg-[var(--success-light)] border-[var(--success)] text-[var(--success-dark)]',
    Science: 'bg-[var(--info-light)] border-[var(--info)] text-[var(--info-dark)]',
    'Social Studies': 'bg-[var(--warning-light)] border-[var(--warning)] text-[var(--warning-dark)]',
    Kiswahili: 'bg-[var(--warning-light)] border-[var(--warning)] text-[var(--warning-dark)]',
    'Religious Education': 'bg-pink-100 border-pink-300 text-[var(--info-dark)]',
    'Creative Arts': 'bg-indigo-100 border-indigo-300 text-[var(--info-dark)]',
    'Physical Education': 'bg-[var(--danger-light)] border-[var(--danger)] text-[var(--danger-dark)]',
    Agriculture: 'bg-[var(--success-light)] border-emerald-300 text-[var(--success-dark)]',
    Library: 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]',
    Assembly: 'bg-cyan-100 border-cyan-300 text-[var(--info-dark)]',
    Games: 'bg-rose-100 border-rose-300 text-[var(--danger-dark)]',
  }
  return colors[subject] || 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]'
}

function getCurrentDay(): DayOfWeek {
  const dayIndex = new Date().getDay()
  if (dayIndex === 0 || dayIndex === 6) return 'Monday'
  return days[dayIndex - 1]
}


export default function StudentTimetablePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StudentTimetableResponse | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDay())

  useEffect(() => {
    async function fetchTimetable() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/student/timetable')
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to view your timetable')
            return
          }
          if (response.status === 403) {
            setError('You do not have permission to view this page')
            return
          }
          throw new Error('Failed to fetch timetable')
        }
        
        const timetableData: StudentTimetableResponse = await response.json()
        setData(timetableData)
      } catch (err) {
        console.error('Error fetching timetable:', err)
        setError('Failed to load timetable. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchTimetable()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="card" count={1} />
        <SkeletonLoader variant="table" count={8} />
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

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Timetable</h1>
        </div>
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-8 text-center">
          <p className="text-[var(--text-muted)]">No timetable data available.</p>
        </div>
      </div>
    )
  }

  const { student, currentTerm, periods, breaks, schedule } = data

  // Get unique subjects for legend
  const uniqueSubjects = Array.from(
    new Set(
      Object.values(schedule)
        .flat()
        .map((l) => l.subject)
    )
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Timetable</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {student.className} {student.streamName && `(${student.streamName})`} • {currentTerm}
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              Week View
            </button>
          </div>
          {viewMode === 'day' && (
            <div className="flex gap-1">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Day View */}
      {viewMode === 'day' && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{selectedDay}&apos;s Schedule</h2>
          {schedule[selectedDay].length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No classes scheduled for {selectedDay}.</p>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => {
                const lesson = schedule[selectedDay].find((l) => l.period === period.number)
                const breakAfter = breaks.find((b) => b.startTime === period.endTime)

                return (
                  <React.Fragment key={period.number}>
                    <div
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        lesson ? getSubjectColor(lesson.subject) : 'bg-[var(--bg-surface)] border-[var(--border-default)]'
                      }`}
                    >
                      <div className="w-16 text-center">
                        <div className="text-lg font-bold">P{period.number}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {period.startTime}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {period.endTime}
                        </div>
                      </div>
                      {lesson ? (
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{lesson.subject}</p>
                          <p className="text-sm opacity-80">
                            {lesson.teacher} • {lesson.room || 'TBA'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 text-[var(--text-muted)]">No class scheduled</div>
                      )}
                    </div>
                    {breakAfter && (
                      <div className="flex items-center gap-4 p-3 bg-[var(--warning-light)] border border-amber-200 rounded-lg">
                        <div className="w-16 text-center">
                          <div className="text-sm font-medium text-[var(--warning-dark)]">☕</div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--warning-dark)]">{breakAfter.name}</p>
                          <p className="text-sm text-[var(--chart-yellow)]">
                            {breakAfter.startTime} - {breakAfter.endTime}
                          </p>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
                  <th className="py-3 px-4 text-left text-sm font-medium text-[var(--text-muted)] w-20">
                    Period
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className={`py-3 px-4 text-left text-sm font-medium ${
                        day === getCurrentDay() ? 'text-[var(--chart-blue)] bg-[var(--info-light)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const breakAfter = breaks.find((b) => b.startTime === period.endTime)
                  return (
                    <React.Fragment key={period.number}>
                      <tr className="border-b border-[var(--border-default)]">
                        <td className="py-2 px-4">
                          <div className="text-sm font-medium text-[var(--text-primary)]">P{period.number}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {period.startTime}-{period.endTime}
                          </div>
                        </td>
                        {days.map((day) => {
                          const lesson = schedule[day].find((l) => l.period === period.number)
                          return (
                            <td
                              key={day}
                              className={`py-2 px-2 ${day === getCurrentDay() ? 'bg-[var(--info-light)]/50' : ''}`}
                            >
                              {lesson && (
                                <div
                                  className={`p-2 rounded border text-xs ${getSubjectColor(
                                    lesson.subject
                                  )}`}
                                >
                                  <div className="font-semibold truncate">{lesson.subject}</div>
                                  <div className="opacity-75 truncate">{lesson.room || 'TBA'}</div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                      {breakAfter && (
                        <tr className="bg-[var(--warning-light)] border-b border-amber-200">
                          <td colSpan={6} className="py-2 px-4 text-center">
                            <span className="text-sm font-medium text-[var(--warning-dark)]">
                              ☕ {breakAfter.name} ({breakAfter.startTime} - {breakAfter.endTime})
                            </span>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      {uniqueSubjects.length > 0 && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Subject Colors</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueSubjects.map((subject) => (
              <span
                key={subject}
                className={`px-2 py-1 rounded text-xs font-medium border ${getSubjectColor(subject)}`}
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
