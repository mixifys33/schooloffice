'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  ClipboardList,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Star,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AttendanceStatus } from '@/types/enums'

/**
 * Class Detail View for Teacher Portal
 * Requirements: 3.3
 * - Display student list for the assigned class
 * - Show attendance history in read-only format
 * - Integrate marks entry interface
 * - Display performance summary
 */

interface StudentListItem {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string | null
  photo: string | null
}

interface AttendanceRecord {
  id: string
  date: string
  status: AttendanceStatus
  recordedAt: string
  recordedBy: string
}

interface PerformanceSummary {
  averageScore: number | null
  passRate: number | null
  topPerformers: number
  attendanceRate: number | null
}

interface ClassDetailData {
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  } | null
  studentCount: number
  isClassTeacher: boolean
  students: StudentListItem[]
  attendanceHistory: AttendanceRecord[]
  performanceSummary: PerformanceSummary
}

type TabType = 'students' | 'attendance' | 'performance'

function ClassDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const classId = params.classId as string
  const subjectId = searchParams.get('subjectId')

  const [data, setData] = useState<ClassDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('students')

  useEffect(() => {
    async function fetchClassDetail() {
      try {
        const url = subjectId
          ? `/api/teacher/classes/${classId}?subjectId=${subjectId}`
          : `/api/teacher/classes/${classId}`
        
        const response = await fetch(url)
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You are not assigned to this class')
          }
          throw new Error('Failed to fetch class details')
        }
        const classData = await response.json()
        setData(classData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load class details')
        console.error('Error fetching class detail:', err)
      } finally {
        setLoading(false)
      }
    }

    if (classId) {
      fetchClassDetail()
    }
  }, [classId, subjectId])

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <Link
          href="/portals/teacher/classes"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Classes
        </Link>
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Unable to load class details'}</span>
          </div>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'students', label: 'Students', icon: <Users className="h-4 w-4" /> },
    { id: 'attendance', label: 'Attendance History', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/portals/teacher/classes"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Classes
      </Link>

      {/* Class Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
              <BookOpen className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {data.className}
                  {data.streamName && (
                    <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)] font-normal">
                      {' '}({data.streamName})
                    </span>
                  )}
                </h1>
                {data.isClassTeacher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] text-[var(--warning-dark)] dark:text-[var(--warning)] text-xs font-medium rounded-full">
                    <Star className="h-3 w-3 fill-current" />
                    Class Teacher
                  </span>
                )}
              </div>
              {data.subject && (
                <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  {data.subject.name}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button asChild size="sm" className="gap-2">
              <Link href={`/portals/teacher/attendance?classId=${classId}`}>
                <ClipboardList className="h-4 w-4" />
                Take Attendance
              </Link>
            </Button>
            {data.subject && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/portals/teacher/marks?classId=${classId}&subjectId=${data.subject.id}`}>
                  <BookOpen className="h-4 w-4" />
                  Enter Marks
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.studentCount}</span> students
            </span>
          </div>
          {data.performanceSummary.attendanceRate !== null && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.performanceSummary.attendanceRate}%</span> attendance
              </span>
            </div>
          )}
          {data.performanceSummary.averageScore !== null && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.performanceSummary.averageScore}%</span> avg score
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--chart-blue)] text-[var(--chart-blue)] dark:border-[var(--info)] dark:text-[var(--chart-blue)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
        {activeTab === 'students' && (
          <StudentListTab students={data.students} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceHistoryTab records={data.attendanceHistory} />
        )}
        {activeTab === 'performance' && (
          <PerformanceTab summary={data.performanceSummary} />
        )}
      </div>
    </div>
  )
}

/**
 * Student List Tab Component
 * Requirements: 3.3 - Display student list for the assigned class
 */
function StudentListTab({ students }: { students: StudentListItem[] }) {
  if (students.length === 0) {
    return (
      <div className="p-8 text-center">
        <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No students in this class</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Student
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Admission No.
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Gender
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex items-center justify-center text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                    {student.firstName} {student.lastName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                {student.admissionNumber}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                {student.gender || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Attendance History Tab Component
 * Requirements: 3.3 - Show attendance history in read-only format
 */
function AttendanceHistoryTab({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="p-8 text-center">
        <ClipboardList className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No attendance records found</p>
      </div>
    )
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <CheckCircle className="h-4 w-4 text-[var(--success)]" />
      case AttendanceStatus.ABSENT:
        return <XCircle className="h-4 w-4 text-[var(--danger)]" />
      case AttendanceStatus.LATE:
        return <Clock className="h-4 w-4 text-[var(--warning)]" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'Present'
      case AttendanceStatus.ABSENT:
        return 'Absent'
      case AttendanceStatus.LATE:
        return 'Late'
      default:
        return status
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Recorded By
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
              <td className="px-4 py-3 text-sm text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                {new Date(record.date).toLocaleDateString('en-UG', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(record.status)}
                  <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {getStatusLabel(record.status)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                {record.recordedBy}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {new Date(record.recordedAt).toLocaleTimeString('en-UG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Performance Tab Component
 * Requirements: 3.3 - Display performance summary
 */
function PerformanceTab({ summary }: { summary: PerformanceSummary }) {
  const hasData = summary.averageScore !== null || summary.passRate !== null || summary.attendanceRate !== null

  if (!hasData) {
    return (
      <div className="p-8 text-center">
        <TrendingUp className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No performance data available yet</p>
        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
          Performance metrics will appear once marks are entered
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average Score */}
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Average Score</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            {summary.averageScore !== null ? `${summary.averageScore}%` : '-'}
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Pass Rate</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            {summary.passRate !== null ? `${summary.passRate}%` : '-'}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Top Performers</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            {summary.topPerformers}
          </div>
          <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">scoring 80%+</div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Attendance Rate</div>
          <div className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            {summary.attendanceRate !== null ? `${summary.attendanceRate}%` : '-'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClassDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClassDetailPageContent />
    </Suspense>
  )
}
