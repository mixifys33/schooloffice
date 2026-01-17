'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  AlertCircle, 
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Clock3,
  Filter,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Teacher Attendance History Page
 * Requirements: 5.1, 5.2, 5.3
 * - Display past attendance records in read-only format
 * - Show date, student name, status, and recording timestamp
 * - Prevent modification without admin approval workflow
 */

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'

interface AttendanceHistoryRecord {
  id: string
  date: string
  studentId: string
  studentName: string
  admissionNumber: string
  status: AttendanceStatus
  recordedAt: string
  recordedBy: string
  remarks?: string
}

interface ClassAttendanceHistory {
  classId: string
  className: string
  streamName: string | null
  records: AttendanceHistoryRecord[]
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    lateCount: number
  }
}

interface AssignedClass {
  classId: string
  className: string
  streamName: string | null
}

interface HistoryData {
  classes: ClassAttendanceHistory[]
  dateRange: {
    startDate: string
    endDate: string
  }
  assignedClasses: AssignedClass[]
}

export default function TeacherAttendanceHistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedClassId) params.append('classId', selectedClassId)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/teacher/attendance/history?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch attendance history')
      }
      const historyData: HistoryData = await response.json()
      setData(historyData)
      
      // Set default date range from response if not already set
      if (!startDate && historyData.dateRange.startDate) {
        setStartDate(historyData.dateRange.startDate)
      }
      if (!endDate && historyData.dateRange.endDate) {
        setEndDate(historyData.dateRange.endDate)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load attendance history')
      console.error('Error fetching attendance history:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, startDate, endDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleApplyFilters = () => {
    fetchHistory()
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setSelectedClassId('')
    setStartDate('')
    setEndDate('')
  }

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Link 
            href="/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance History</h1>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <Link 
            href="/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Link 
          href="/teacher/attendance"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Attendance History
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {data?.dateRange && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing records from {formatDate(data.dateRange.startDate)} to {formatDate(data.dateRange.endDate)}
          </p>
        )}
      </div>

      {/* Read-only Notice - Requirement 5.3 */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Read-Only View
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Historical attendance records cannot be modified. Contact administration if corrections are needed.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Classes</option>
                {data?.assignedClasses.map((cls) => (
                  <option key={cls.classId} value={cls.classId}>
                    {cls.className}{cls.streamName ? ` (${cls.streamName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
            <Button size="sm" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* History Content */}
      {data?.classes && data.classes.length > 0 ? (
        <div className="space-y-6">
          {data.classes.map((classHistory) => (
            <ClassHistorySection key={classHistory.classId} classHistory={classHistory} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Attendance Records
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            No attendance records found for the selected date range and filters.
          </p>
        </div>
      )}

      {/* Loading overlay for filter changes */}
      {loading && data && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}


/**
 * Format date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-UG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get status icon component
 */
function StatusIcon({ status }: { status: AttendanceStatus }) {
  switch (status) {
    case 'PRESENT':
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
    case 'ABSENT':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    case 'LATE':
      return <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    default:
      return null
  }
}

/**
 * Get status badge styling
 */
function getStatusBadgeClass(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'ABSENT':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    case 'LATE':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  }
}

interface ClassHistorySectionProps {
  classHistory: ClassAttendanceHistory
}

/**
 * Class History Section Component
 * Displays attendance history for a single class
 * Requirements: 5.1, 5.2 - Show date, student name, status, and recording timestamp
 */
function ClassHistorySection({ classHistory }: ClassHistorySectionProps) {
  const [expanded, setExpanded] = useState(true)

  // Group records by date for better organization
  const recordsByDate = classHistory.records.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = []
    }
    acc[record.date].push(record)
    return acc
  }, {} as Record<string, AttendanceHistoryRecord[]>)

  const sortedDates = Object.keys(recordsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Class Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {classHistory.className}
              {classHistory.streamName && (
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  {' '}({classHistory.streamName})
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {classHistory.summary.totalRecords} records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {classHistory.summary.presentCount}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {classHistory.summary.absentCount}
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Clock3 className="h-4 w-4" />
              {classHistory.summary.lateCount}
            </span>
          </div>
          <ChevronDown 
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Records List */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {sortedDates.map((date) => (
            <div key={date} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
              {/* Date Header */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatDate(date)}
                </span>
              </div>

              {/* Records for this date */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recordsByDate[date].map((record) => (
                  <AttendanceRecordRow key={record.id} record={record} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface AttendanceRecordRowProps {
  record: AttendanceHistoryRecord
}

/**
 * Individual Attendance Record Row
 * Requirements: 5.2 - Show date, student name, status, and recording timestamp
 */
function AttendanceRecordRow({ record }: AttendanceRecordRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-white text-sm">
            {record.studentName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {record.admissionNumber}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(record.status)}`}>
          <StatusIcon status={record.status} />
          {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
        </span>

        {/* Recording Timestamp */}
        <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 text-right">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(record.recordedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}
