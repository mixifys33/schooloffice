'use client'

import { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, Users, BookOpen } from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
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
 * Teacher Reports Page
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * - Display class performance summary for assigned classes only
 * - Show attendance trends and subject averages
 * - Ensure all data is read-only
 * - Exclude financial data and export functionality
 */

interface ClassPerformanceSummary {
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  }
  studentCount: number
  averageScore: number
  passRate: number
  topPerformers: number
  attendanceRate: number
}

interface AttendanceTrendPoint {
  date: string
  presentCount: number
  absentCount: number
  lateCount: number
  totalStudents: number
  attendanceRate: number
}

interface SubjectAverage {
  subjectId: string
  subjectName: string
  classId: string
  className: string
  averageScore: number
  highestScore: number
  lowestScore: number
  studentCount: number
}

interface TeacherReportsData {
  classPerformance: ClassPerformanceSummary[]
  attendanceTrends: AttendanceTrendPoint[]
  subjectAverages: SubjectAverage[]
  currentTerm: {
    id: string
    name: string
  } | null
}

export default function TeacherReportsPage() {
  const [data, setData] = useState<TeacherReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'performance' | 'attendance' | 'subjects'>('performance')

  useEffect(() => {
    async function fetchReportsData() {
      try {
        const response = await fetch('/api/teacher/reports')
        if (!response.ok) {
          throw new Error('Failed to fetch reports data')
        }
        const reportsData = await response.json()
        setData(reportsData)
      } catch (err) {
        setError('Unable to load reports')
        console.error('Error fetching teacher reports:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReportsData()
  }, [])

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={3} />
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

  const { classPerformance, attendanceTrends, subjectAverages, currentTerm } = data

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          <div>
            <h1 className={typography.pageTitle}>
              Reports
            </h1>
            <p className={typography.caption}>
              {currentTerm ? `${currentTerm.name} Performance Summary` : 'Performance Summary'}
            </p>
          </div>
        </div>
      </div>

      {/* Requirements: 9.2 - All data is read-only notice */}
      <div className={cn(cardStyles.base, cardStyles.compact, teacherColors.info.bg, teacherColors.info.border, 'border')}>
        <p className={cn(typography.body, teacherColors.info.text)}>
          Reports are read-only and show data for your assigned classes only.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={cn(cardStyles.base, 'p-0 overflow-hidden')}>
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('performance')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'performance'
                ? 'border-slate-600 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              transitions.color
            )}
          >
            Class Performance
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'attendance'
                ? 'border-slate-600 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              transitions.color
            )}
          >
            Attendance Trends
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'subjects'
                ? 'border-slate-600 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              transitions.color
            )}
          >
            Subject Averages
          </button>
        </div>

        {/* Tab Content */}
        <div className={cardStyles.normal}>
          {activeTab === 'performance' && (
            <ClassPerformanceSection classPerformance={classPerformance} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTrendsSection attendanceTrends={attendanceTrends} />
          )}
          {activeTab === 'subjects' && (
            <SubjectAveragesSection subjectAverages={subjectAverages} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Class Performance Section
 * Requirements: 9.1 - Display class performance summary for assigned classes only
 */
function ClassPerformanceSection({ classPerformance }: { classPerformance: ClassPerformanceSummary[] }) {
  if (classPerformance.length === 0) {
    return (
      <div className={cn(cardStyles.base, cardStyles.normal, 'text-center')}>
        <Users className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className={typography.body}>No class performance data available.</p>
        <p className={cn(typography.caption, 'mt-1')}>Performance data will appear once marks are entered.</p>
      </div>
    )
  }

  return (
    <div className={spacing.card}>
      {classPerformance.map((cls) => (
        <div
          key={`${cls.classId}-${cls.subject.id}`}
          className={cn(cardStyles.base, cardStyles.compact)}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className={typography.sectionTitle}>
                {cls.className} {cls.streamName && `(${cls.streamName})`}
              </h3>
              <p className={typography.caption}>
                {cls.subject.name} • {cls.studentCount} students
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={cn(teacherColors.secondary.bg, 'rounded-lg p-3')}>
              <p className={cn(typography.caption, 'mb-1')}>Average Score</p>
              <p className={cn(typography.sectionTitle, 'text-slate-900 dark:text-white')}>
                {cls.averageScore}%
              </p>
            </div>
            <div className={cn(teacherColors.secondary.bg, 'rounded-lg p-3')}>
              <p className={cn(typography.caption, 'mb-1')}>Pass Rate</p>
              <p className={cn(typography.sectionTitle, 
                cls.passRate >= 70 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : cls.passRate >= 50 
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              )}>
                {cls.passRate}%
              </p>
            </div>
            <div className={cn(teacherColors.secondary.bg, 'rounded-lg p-3')}>
              <p className={cn(typography.caption, 'mb-1')}>Top Performers</p>
              <p className={cn(typography.sectionTitle, 'text-slate-900 dark:text-white')}>
                {cls.topPerformers}
              </p>
            </div>
            <div className={cn(teacherColors.secondary.bg, 'rounded-lg p-3')}>
              <p className={cn(typography.caption, 'mb-1')}>Attendance</p>
              <p className={cn(typography.sectionTitle,
                cls.attendanceRate >= 90 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : cls.attendanceRate >= 75 
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              )}>
                {cls.attendanceRate}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Attendance Trends Section
 * Requirements: 9.1 - Show attendance trends
 */
function AttendanceTrendsSection({ attendanceTrends }: { attendanceTrends: AttendanceTrendPoint[] }) {
  if (attendanceTrends.length === 0) {
    return (
      <div className={cn(cardStyles.base, cardStyles.normal, 'text-center')}>
        <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className={typography.body}>No attendance data available.</p>
        <p className={cn(typography.caption, 'mt-1')}>Attendance trends will appear once attendance is recorded.</p>
      </div>
    )
  }

  // Calculate overall stats
  const totalPresent = attendanceTrends.reduce((sum, t) => sum + t.presentCount, 0)
  const totalAbsent = attendanceTrends.reduce((sum, t) => sum + t.absentCount, 0)
  const totalLate = attendanceTrends.reduce((sum, t) => sum + t.lateCount, 0)
  const totalRecords = totalPresent + totalAbsent + totalLate
  const overallRate = totalRecords > 0 
    ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) 
    : 0

  return (
    <div className={spacing.card}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={cn(cardStyles.base, cardStyles.compact)}>
          <p className={cn(typography.caption, 'mb-1')}>Overall Rate</p>
          <p className={cn('text-2xl font-semibold',
            overallRate >= 90 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : overallRate >= 75 
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
          )}>
            {overallRate}%
          </p>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact)}>
          <p className={cn(typography.caption, 'mb-1')}>Present</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {totalPresent}
          </p>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact)}>
          <p className={cn(typography.caption, 'mb-1')}>Late</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {totalLate}
          </p>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact)}>
          <p className={cn(typography.caption, 'mb-1')}>Absent</p>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
            {totalAbsent}
          </p>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h3 className={cn(typography.sectionTitle, 'mb-4')}>
          Last 14 Days
        </h3>
        <div className={spacing.card}>
          {attendanceTrends.map((trend) => (
            <div
              key={trend.date}
              className={cn('flex items-center gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0')}
            >
              <div className={cn('w-24', typography.caption)}>
                {formatDate(trend.date)}
              </div>
              <div className="flex-1">
                <div className="flex h-4 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {trend.presentCount + trend.lateCount + trend.absentCount > 0 && (
                    <>
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${(trend.presentCount / (trend.presentCount + trend.lateCount + trend.absentCount)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500"
                        style={{
                          width: `${(trend.lateCount / (trend.presentCount + trend.lateCount + trend.absentCount)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-rose-500"
                        style={{
                          width: `${(trend.absentCount / (trend.presentCount + trend.lateCount + trend.absentCount)) * 100}%`,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className={cn('w-16 text-right font-medium', typography.body)}>
                {trend.attendanceRate}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Subject Averages Section
 * Requirements: 9.1 - Show subject averages
 */
function SubjectAveragesSection({ subjectAverages }: { subjectAverages: SubjectAverage[] }) {
  if (subjectAverages.length === 0) {
    return (
      <div className={cn(cardStyles.base, cardStyles.normal, 'text-center')}>
        <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className={typography.body}>No subject average data available.</p>
        <p className={cn(typography.caption, 'mt-1')}>Subject averages will appear once marks are entered.</p>
      </div>
    )
  }

  return (
    <div className={cn(cardStyles.base, 'p-0 overflow-hidden')}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={cn(teacherColors.secondary.bg)}>
              <th className={cn('px-4 py-3 text-left font-medium', typography.caption, 'uppercase tracking-wider')}>
                Subject
              </th>
              <th className={cn('px-4 py-3 text-left font-medium', typography.caption, 'uppercase tracking-wider')}>
                Class
              </th>
              <th className={cn('px-4 py-3 text-center font-medium', typography.caption, 'uppercase tracking-wider')}>
                Average
              </th>
              <th className={cn('px-4 py-3 text-center font-medium', typography.caption, 'uppercase tracking-wider')}>
                Highest
              </th>
              <th className={cn('px-4 py-3 text-center font-medium', typography.caption, 'uppercase tracking-wider')}>
                Lowest
              </th>
              <th className={cn('px-4 py-3 text-center font-medium', typography.caption, 'uppercase tracking-wider')}>
                Students
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {subjectAverages.map((avg) => (
              <tr key={`${avg.subjectId}-${avg.classId}`}>
                <td className={cn('px-4 py-3 font-medium', typography.label)}>
                  {avg.subjectName}
                </td>
                <td className={cn('px-4 py-3', typography.body)}>
                  {avg.className}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('font-medium', typography.body,
                    avg.averageScore >= 70 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : avg.averageScore >= 50 
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {avg.averageScore}%
                  </span>
                </td>
                <td className={cn('px-4 py-3 text-center', typography.body, 'text-emerald-600 dark:text-emerald-400')}>
                  {avg.highestScore}%
                </td>
                <td className={cn('px-4 py-3 text-center', typography.body, 'text-rose-600 dark:text-rose-400')}>
                  {avg.lowestScore}%
                </td>
                <td className={cn('px-4 py-3 text-center', typography.body)}>
                  {avg.studentCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })
}
