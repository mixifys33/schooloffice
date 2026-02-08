'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { SearchInput } from '@/components/ui/search-input'
import { Toast, useLocalToast } from '@/components/ui/toast'
import {
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Building2,
  Activity,
  X,
  RefreshCw
} from 'lucide-react'

/**
 * Audit and Logs Page
 * Requirements: 18.1, 18.2
 * - Display all system events with timestamp, user, action, affected entity
 * - Filter by school, user, action type, date range
 */

interface AuditLog {
  id: string
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: string
  userName: string
  schoolName: string
  schoolCode: string
}

interface Pagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface School {
  id: string
  name: string
  code: string
}

// Action type labels for display
const ACTION_LABELS: Record<string, string> = {
  payment_recorded: 'Payment Recorded',
  payment_updated: 'Payment Updated',
  payment_deleted: 'Payment Deleted',
  payment_status_changed: 'Payment Status Changed',
  fee_structure_created: 'Fee Structure Created',
  fee_structure_updated: 'Fee Structure Updated',
  discount_applied: 'Discount Applied',
  marks_entered: 'Marks Entered',
  marks_updated: 'Marks Updated',
  marks_deleted: 'Marks Deleted',
  results_processed: 'Results Processed',
  report_card_generated: 'Report Card Generated',
  report_card_published: 'Report Card Published',
  grade_updated: 'Grade Updated',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deleted: 'User Deleted',
  role_changed: 'Role Changed',
  student_enrolled: 'Student Enrolled',
  student_transferred: 'Student Transferred',
  student_graduated: 'Student Graduated',
  student_suspended: 'Student Suspended',
  staff_created: 'Staff Created',
  staff_deactivated: 'Staff Deactivated',
  school_settings_updated: 'School Settings Updated',
  license_changed: 'License Changed',
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  read: 'Read',
  sms_sent: 'SMS Sent',
  school_activated: 'School Activated',
  school_suspended: 'School Suspended',
  school_updated: 'School Updated',
}

// Resource type labels
const RESOURCE_LABELS: Record<string, string> = {
  payment: 'Payment',
  fee_structure: 'Fee Structure',
  mark: 'Mark',
  result: 'Result',
  report_card: 'Report Card',
  user: 'User',
  student: 'Student',
  staff: 'Staff',
  school: 'School',
  class: 'Class',
  subject: 'Subject',
  exam: 'Exam',
  attendance: 'Attendance',
  guardian: 'Guardian',
  discipline: 'Discipline',
  announcement: 'Announcement',
  message: 'Message',
  sms: 'SMS',
}

// Action type colors
const ACTION_COLORS: Record<string, string> = {
  payment_recorded: 'bg-[var(--success-light)] text-[var(--chart-green)]',
  payment_updated: 'bg-[var(--info-light)] text-[var(--accent-hover)]',
  payment_deleted: 'bg-[var(--danger-light)] text-[var(--chart-red)]',
  payment_status_changed: 'bg-[var(--warning-light)] text-[var(--warning)]',
  marks_entered: 'bg-[var(--info-light)] text-[var(--chart-purple)]',
  marks_updated: 'bg-[var(--info-light)] text-[var(--chart-purple)]',
  user_created: 'bg-[var(--success-light)] text-[var(--chart-green)]',
  user_deleted: 'bg-[var(--danger-light)] text-[var(--chart-red)]',
  role_changed: 'bg-[var(--warning-light)] text-[var(--warning)]',
  student_enrolled: 'bg-[var(--success-light)] text-[var(--chart-green)]',
  student_suspended: 'bg-[var(--danger-light)] text-[var(--chart-red)]',
  school_activated: 'bg-[var(--success-light)] text-[var(--chart-green)]',
  school_suspended: 'bg-[var(--danger-light)] text-[var(--chart-red)]',
  school_updated: 'bg-[var(--info-light)] text-[var(--accent-hover)]',
  sms_sent: 'bg-[var(--info-light)] text-[var(--accent-hover)]',
  create: 'bg-[var(--success-light)] text-[var(--chart-green)]',
  update: 'bg-[var(--info-light)] text-[var(--accent-hover)]',
  delete: 'bg-[var(--danger-light)] text-[var(--chart-red)]',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] || resource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
}

export default function AuditLogsPage() {
  const { toast, showToast, hideToast } = useLocalToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<School[]>([])

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedResource, setSelectedResource] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Fetch schools for filter dropdown
  const fetchSchools = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data.schools || [])
      }
    } catch (err) {
      console.error('Failed to fetch schools:', err)
    }
  }, [])

  // Fetch audit logs
  const fetchLogs = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', '50')
      
      if (selectedSchool) params.set('schoolId', selectedSchool)
      if (selectedAction) params.set('action', selectedAction)
      if (selectedResource) params.set('resource', selectedResource)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const response = await fetch(`/api/admin/audit?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [selectedSchool, selectedAction, selectedResource, dateFrom, dateTo])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage)
  }

  const handleClearFilters = () => {
    setSelectedSchool('')
    setSelectedAction('')
    setSelectedResource('')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedSchool || selectedAction || selectedResource || dateFrom || dateTo

  // Filter logs by search query (client-side)
  const filteredLogs = searchQuery
    ? logs.filter(log =>
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resourceId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs

  if (loading && logs.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-[var(--text-secondary)]">View all system events and changes</p>
        </div>
        <SkeletonLoader variant="table" count={10} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-[var(--text-secondary)]">View all system events and changes</p>
        </div>
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4">
          <p className="text-[var(--chart-red)]">{error}</p>
          <button
            onClick={() => fetchLogs(1)}
            className="mt-2 text-sm text-[var(--chart-red)] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={hideToast}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Logs</h1>
          <p className="text-[var(--text-secondary)]">View all system events and changes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(pagination.page)}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              hasActiveFilters
                ? 'bg-[var(--info-light)] border-[var(--info-light)] text-[var(--accent-hover)]'
                : 'bg-[var(--bg-main)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-full">
                {[selectedSchool, selectedAction, selectedResource, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel - Requirement 18.2 */}
      {showFilters && (
        <div className="mb-6 bg-[var(--bg-main)] rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[var(--text-primary)]">Filter Logs</h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-[var(--chart-blue)] hover:text-[var(--accent-hover)]"
              >
                Clear all filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* School Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                <Building2 className="inline h-4 w-4 mr-1" />
                School
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              >
                <option value="">All Schools</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} ({school.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                <Activity className="inline h-4 w-4 mr-1" />
                Action Type
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                <FileText className="inline h-4 w-4 mr-1" />
                Resource
              </label>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              >
                <option value="">All Resources</option>
                {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          placeholder="Search by user, school, action, or resource..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-md"
        />
      </div>

      {/* Stats Summary */}
      <div className="mb-4 text-sm text-[var(--text-muted)]">
        Showing {filteredLogs.length} of {pagination.totalCount} audit log entries
      </div>

      {/* Audit Logs Table - Requirement 18.1 */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-surface)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-[var(--text-primary)]">
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-primary)] truncate max-w-[150px]" title={log.userName}>
                        {log.userName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-[var(--text-primary)]">
                      {getResourceLabel(log.resource)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate max-w-[150px]" title={log.resourceId}>
                      ID: {log.resourceId.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                      <div>
                        <div className="text-sm text-[var(--text-primary)] truncate max-w-[120px]" title={log.schoolName}>
                          {log.schoolName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{log.schoolCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-[var(--chart-blue)] hover:text-[var(--accent-hover)] text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    {hasActiveFilters || searchQuery
                      ? 'No audit logs match your filters'
                      : 'No audit logs found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-[var(--bg-surface)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-muted)]">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-lg border bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-[var(--text-primary)]">
                {pagination.page}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-1.5 rounded-lg border bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-main)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">Timestamp</label>
                    <p className="text-sm text-[var(--text-primary)]">{formatDate(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">User</label>
                    <p className="text-sm text-[var(--text-primary)]">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">Action</label>
                    <p className="text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(selectedLog.action)}`}>
                        {getActionLabel(selectedLog.action)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">Resource</label>
                    <p className="text-sm text-[var(--text-primary)]">{getResourceLabel(selectedLog.resource)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">School</label>
                    <p className="text-sm text-[var(--text-primary)]">{selectedLog.schoolName} ({selectedLog.schoolCode})</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase">Resource ID</label>
                    <p className="text-sm text-[var(--text-primary)] font-mono break-all">{selectedLog.resourceId}</p>
                  </div>
                </div>

                {/* IP Address and User Agent */}
                {(selectedLog.ipAddress || selectedLog.userAgent) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Request Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.ipAddress && (
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] uppercase">IP Address</label>
                          <p className="text-sm text-[var(--text-primary)] font-mono">{selectedLog.ipAddress}</p>
                        </div>
                      )}
                      {selectedLog.userAgent && (
                        <div className="col-span-2">
                          <label className="text-xs font-medium text-[var(--text-muted)] uppercase">User Agent</label>
                          <p className="text-sm text-[var(--text-primary)] font-mono text-xs break-all">{selectedLog.userAgent}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Previous Value */}
                {selectedLog.previousValue && Object.keys(selectedLog.previousValue).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Previous Value</h4>
                    <pre className="bg-[var(--danger-light)] p-3 rounded-lg text-xs overflow-x-auto text-[var(--danger-dark)]">
                      {JSON.stringify(selectedLog.previousValue, null, 2)}
                    </pre>
                  </div>
                )}

                {/* New Value */}
                {selectedLog.newValue && Object.keys(selectedLog.newValue).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">New Value</h4>
                    <pre className="bg-[var(--success-light)] p-3 rounded-lg text-xs overflow-x-auto text-[var(--success-dark)]">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-[var(--bg-surface)]">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-default)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
