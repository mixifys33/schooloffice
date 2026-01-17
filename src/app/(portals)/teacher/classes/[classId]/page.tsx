'use client'

import React, { useState, useEffect } from 'react'
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

export default function ClassDetailPage() {
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
          href="/teacher/classes"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Classes
        </Link>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
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
        href="/teacher/classes"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Classes
      </Link>

      {/* Class Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {data.className}
                  {data.streamName && (
                    <span className="text-gray-500 dark:text-gray-400 font-normal">
                      {' '}({data.streamName})
                    </span>
                  )}
                </h1>
                {data.isClassTeacher && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                    <Star className="h-3 w-3 fill-current" />
                    Class Teacher
                  </span>
                )}
              </div>
              {data.subject && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {data.subject.name}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button asChild size="sm" className="gap-2">
              <Link href={`/teacher/attendance?classId=${classId}`}>
                <ClipboardList className="h-4 w-4" />
                Take Attendance
              </Link>
            </Button>
            {data.subject && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/teacher/marks?classId=${classId}&subjectId=${data.subject.id}`}>
                  <BookOpen className="h-4 w-4" />
                  Enter Marks
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{data.studentCount}</span> students
            </span>
          </div>
          {data.performanceSummary.attendanceRate !== null && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">{data.performanceSummary.attendanceRate}%</span> attendance
              </span>
            </div>
          )}
          {data.performanceSummary.averageScore !== null && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">{data.performanceSummary.averageScore}%</span> avg score
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
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
        <Users className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No students in this class</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Student
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admission No.
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Gender
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {student.firstName} {student.lastName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {student.admissionNumber}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
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
        <ClipboardList className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No attendance records found</p>
      </div>
    )
  }

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case AttendanceStatus.ABSENT:
        return <XCircle className="h-4 w-4 text-red-500" />
      case AttendanceStatus.LATE:
        return <Clock className="h-4 w-4 text-amber-500" />
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
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recorded By
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {getStatusLabel(record.status)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {record.recordedBy}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-500">
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
        <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No performance data available yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Performance metrics will appear once marks are entered
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Average Score */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average Score</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {summary.averageScore !== null ? `${summary.averageScore}%` : '-'}
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pass Rate</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {summary.passRate !== null ? `${summary.passRate}%` : '-'}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Top Performers</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {summary.topPerformers}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">scoring 80%+</div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Attendance Rate</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {summary.attendanceRate !== null ? `${summary.attendanceRate}%` : '-'}
          </div>
        </div>
      </div>
    </div>
  )
}
