'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Calendar,
  ChevronLeft,
  Download,
  Filter,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  errorMessages,
  transitions 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

/**
 * Teacher Attendance History Page
 * View past attendance records with filtering and export capabilities
 */

interface AttendanceRecord {
  id: string
  date: string
  classId: string
  className: string
  streamName: string | null
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  recordedAt: string
  canEdit: boolean
}

interface AttendanceFilters {
  classId: string
  startDate: string
  endDate: string
  searchTerm: string
}

export default function AttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AttendanceFilters>({
    classId: '',
    startDate: '',
    endDate: '',
    searchTerm: '',
  })

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/teacher/attendance/history')
      if (!response.ok) {
        throw new Error('Failed to fetch attendance history')
      }
      const data = await response.json()
      setRecords(data.records || [])
      setFilteredRecords(data.records || [])
      setClasses(data.classes || [])
    } catch (err) {
      setError('Unable to load attendance history')
      console.error('Error fetching attendance history:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAttendanceHistory()
  }, [fetchAttendanceHistory])

  // Apply filters
  useEffect(() => {
    let filtered = [...records]

    if (filters.classId) {
      filtered = filtered.filter(r => r.classId === filters.classId)
    }

    if (filters.startDate) {
      filtered = filtered.filter(r => new Date(r.date) >= new Date(filters.startDate))
    }

    if (filters.endDate) {
      filtered = filtered.filter(r => new Date(r.date) <= new Date(filters.endDate))
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(r => 
        r.className.toLowerCase().includes(term) ||
        r.streamName?.toLowerCase().includes(term)
      )
    }

    setFilteredRecords(filtered)
  }, [filters, records])

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Class', 'Total Students', 'Present', 'Absent', 'Late', 'Attendance %']
    const rows = filteredRecords.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.className + (r.streamName ? ` - ${r.streamName}` : ''),
      r.totalStudents,
      r.presentCount,
      r.absentCount,
      r.lateCount,
      `${((r.presentCount / r.totalStudents) * 100).toFixed(1)}%`
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/teacher/attendance"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
        
        <h1 className={cn(typography.h1, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
          Attendance History
        </h1>
        <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2')}>
          View and export past attendance records
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4 mb-6">
          <p className="text-[var(--chart-red)] dark:text-[var(--danger)]">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className={cn(cardStyles.base, cardStyles.normal, 'p-4 mb-6')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={cn(typography.caption, 'block mb-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={cn(typography.caption, 'block mb-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className={cn(typography.caption, 'block mb-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <div>
            <label className={cn(typography.caption, 'block mb-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Search class..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Showing {filteredRecords.length} of {records.length} records
          </p>
          <Button
            onClick={handleExport}
            disabled={filteredRecords.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className={cn(cardStyles.base, cardStyles.normal, 'p-8 text-center')}>
          <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
            No Records Found
          </h3>
          <p className={cn(typography.body, 'text-[var(--text-muted)]')}>
            {filters.classId || filters.startDate || filters.endDate || filters.searchTerm
              ? 'Try adjusting your filters'
              : 'No attendance records available yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => {
            const attendanceRate = (record.presentCount / record.totalStudents) * 100

            return (
              <div
                key={record.id}
                className={cn(cardStyles.base, cardStyles.normal, 'p-4 hover:shadow-md', transitions.base)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                        {record.className}
                        {record.streamName && (
                          <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] ml-2">
                            - {record.streamName}
                          </span>
                        )}
                      </h3>
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        attendanceRate >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      )}>
                        {attendanceRate.toFixed(1)}%
                      </span>
                    </div>

                    <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-3')}>
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {record.totalStudents} Total
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {record.presentCount} Present
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {record.absentCount} Absent
                        </span>
                      </div>
                      {record.lateCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                            {record.lateCount} Late
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {record.canEdit && (
                    <Link href={`/teacher/attendance/edit/${record.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
