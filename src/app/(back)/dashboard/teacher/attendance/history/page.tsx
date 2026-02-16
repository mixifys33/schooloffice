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
            href="/portals/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Attendance History</h1>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <Link 
            href="/portals/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
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
          href="/portals/teacher/attendance"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
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
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            Showing records from {formatDate(data.dateRange.startDate)} to {formatDate(data.dateRange.endDate)}
          </p>
        )}
      </div>

      {/* Read-only Notice - Requirement 5.3 */}
      <div className="bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 border border-[var(--info-light)] dark:border-[var(--info-dark)] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)] mt-0.5" />
          <div>
            <p className="font-medium text-[var(--info-dark)] dark:text-[var(--info)]">
              Read-Only View
            </p>
            <p className="text-sm text-[var(--accent-hover)] dark:text-[var(--info)] mt-1">
              Historical attendance records cannot be modified. Contact administration if corrections are needed.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm"
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
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm"
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
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
            No Attendance Records
          </h3>
          <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] max-w-sm mx-auto">
            No attendance records found for the selected date range and filters.
          </p>
        </div>
      )}

      {/* Loading overlay for filter changes */}
      {loading && data && (
        <div className="fixed inset-0 bg-[var(--text-primary)]/20 dark:bg-[var(--text-primary)]/40 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg p-4 shadow-lg">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--chart-blue)] border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">Loading...</p>
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
      return <CheckCircle2 className="h-4 w-4 text-[var(--chart-green)] dark:text-[var(--success)]" />
    case 'ABSENT':
      return <XCircle className="h-4 w-4 text-[var(--chart-red)] dark:text-[var(--danger)]" />
    case 'LATE':
      return <Clock3 className="h-4 w-4 text-[var(--chart-yellow)] dark:text-[var(--warning)]" />
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
      return 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 text-[var(--chart-green)] dark:text-[var(--success)]'
    case 'ABSENT':
      return 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 text-[var(--chart-red)] dark:text-[var(--danger)]'
    case 'LATE':
      return 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 text-[var(--warning-dark)] dark:text-[var(--warning)]'
    default:
      return 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)]'
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
    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
      {/* Class Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--info-light)] dark:bg-[var(--info-dark)]">
            <Calendar className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              {classHistory.className}
              {classHistory.streamName && (
                <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)] font-normal">
                  {' '}({classHistory.streamName})
                </span>
              )}
            </h3>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              {classHistory.summary.totalRecords} records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-[var(--chart-green)] dark:text-[var(--success)]">
              <CheckCircle2 className="h-4 w-4" />
              {classHistory.summary.presentCount}
            </span>
            <span className="flex items-center gap-1 text-[var(--chart-red)] dark:text-[var(--danger)]">
              <XCircle className="h-4 w-4" />
              {classHistory.summary.absentCount}
            </span>
            <span className="flex items-center gap-1 text-[var(--chart-yellow)] dark:text-[var(--warning)]">
              <Clock3 className="h-4 w-4" />
              {classHistory.summary.lateCount}
            </span>
          </div>
          <ChevronDown 
            className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Records List */}
      {expanded && (
        <div className="border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
          {sortedDates.map((date) => (
            <div key={date} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)] last:border-b-0">
              {/* Date Header */}
              <div className="px-4 py-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50">
                <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
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
    <div className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex items-center justify-center">
          <User className="h-4 w-4 text-[var(--text-muted)] dark:text-[var(--text-muted)]" />
        </div>
        <div>
          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm">
            {record.studentName}
          </div>
          <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
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
        <div className="hidden sm:block text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] text-right">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimestamp(record.recordedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}
