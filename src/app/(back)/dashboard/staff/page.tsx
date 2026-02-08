'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  RefreshCw,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Role, StaffRole, StaffStatus, AlertSeverity } from '@/types/enums'
import type { StaffListItem, StaffAlert } from '@/types/staff-dashboard'

/**
 * Staff List Page
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * - Located at /dashboard/staff
 * - Displays table with: name, roles, department, status, phone, last activity, alerts
 * - Provides filters for: role, department, status, and search by name/employee number
 * - Click row navigates to Staff Profile Page
 * - Pagination support
 */

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface StaffFilters {
  role: string
  department: string
  status: string
  search: string
}

// Role options for filter dropdown
const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: Role.TEACHER, label: 'Teacher' },
  { value: Role.SCHOOL_ADMIN, label: 'School Admin' },
  { value: Role.DEPUTY, label: 'Deputy' },
  { value: Role.ACCOUNTANT, label: 'Accountant' },
  { value: StaffRole.CLASS_TEACHER, label: 'Class Teacher' },
  { value: StaffRole.DOS, label: 'Director of Studies' },
  { value: StaffRole.BURSAR, label: 'Bursar' },
  { value: StaffRole.HOSTEL_STAFF, label: 'Hostel Staff' },
  { value: StaffRole.SUPPORT_STAFF, label: 'Support Staff' },
]

// Status options for filter dropdown
const statusOptions = [
  { value: '', label: 'All Status' },
  { value: StaffStatus.ACTIVE, label: 'Active' },
  { value: StaffStatus.INACTIVE, label: 'Inactive' },
]


// Format role for display
function formatRole(role: StaffRole | Role): string {
  const roleLabels: Record<string, string> = {
    [Role.TEACHER]: 'Teacher',
    [Role.SCHOOL_ADMIN]: 'School Admin',
    [Role.DEPUTY]: 'Deputy',
    [Role.ACCOUNTANT]: 'Accountant',
    [StaffRole.CLASS_TEACHER]: 'Class Teacher',
    [StaffRole.DOS]: 'Director of Studies',
    [StaffRole.BURSAR]: 'Bursar',
    [StaffRole.HOSTEL_STAFF]: 'Hostel Staff',
    [StaffRole.SUPPORT_STAFF]: 'Support Staff',
  }
  return roleLabels[role] || role
}

// Status badge component
function StatusBadge({ status }: { status: StaffStatus }) {
  const styles = {
    [StaffStatus.ACTIVE]: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]',
    [StaffStatus.INACTIVE]: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === StaffStatus.ACTIVE ? 'Active' : 'Inactive'}
    </span>
  )
}

// Alert indicator component
function AlertIndicator({ alerts }: { alerts: StaffAlert[] }) {
  if (alerts.length === 0) return <span className="text-[var(--text-muted)]">—</span>
  
  const criticalCount = alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length
  const warningCount = alerts.filter(a => a.severity === AlertSeverity.WARNING).length
  
  return (
    <div className="flex items-center gap-1">
      {criticalCount > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)]/30 dark:text-[var(--danger)]">
          {criticalCount}
        </span>
      )}
      {warningCount > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/30 dark:text-[var(--warning)]">
          {warningCount}
        </span>
      )}
    </div>
  )
}

// Format date for last activity
function formatLastActivity(date?: Date): string {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}


export default function StaffListPage() {
  const router = useRouter()
  const [data, setData] = useState<StaffListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [filters, setFilters] = useState<StaffFilters>({
    role: '',
    department: '',
    status: '',
    search: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [departments, setDepartments] = useState<string[]>([])

  const fetchStaffList = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', pagination.limit.toString())
      
      if (filters.role) params.set('role', filters.role)
      if (filters.department) params.set('department', filters.department)
      if (filters.status) params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      
      const response = await fetch(`/api/staff?${params.toString()}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch staff list')
      }
      
      const result = await response.json()
      setData(result.data)
      setPagination(result.pagination)
      
      // Extract unique departments for filter
      const uniqueDepts = [...new Set(result.data.map((s: StaffListItem) => s.department).filter(Boolean))] as string[]
      setDepartments(uniqueDepts)
    } catch (err) {
      console.error('Error fetching staff list:', err)
      setError('Unable to load staff list. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit, router])

  useEffect(() => {
    fetchStaffList(1)
  }, [filters])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchInput }))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  const handleRowClick = (staff: StaffListItem) => {
    router.push(`/dashboard/staff/${staff.id}`)
  }

  const handlePageChange = (newPage: number) => {
    fetchStaffList(newPage)
  }


  // Table columns definition - Requirements: 8.2
  const columns: Column<StaffListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (_, row) => (
        <div>
          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{row.name}</div>
          <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{row.employeeNumber}</div>
        </div>
      ),
    },
    {
      key: 'primaryRole',
      header: 'Role',
      render: (_, row) => (
        <div>
          <div className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatRole(row.primaryRole)}</div>
          {row.secondaryRoles.length > 0 && (
            <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              +{row.secondaryRoles.length} more
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      hideOnMobile: true,
      render: (value) => value || <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (value) => value || <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: 'lastActivity',
      header: 'Last Active',
      hideOnMobile: true,
      render: (_, row) => (
        <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          {formatLastActivity(row.lastActivity)}
        </span>
      ),
    },
    {
      key: 'alerts',
      header: 'Alerts',
      align: 'center',
      render: (_, row) => <AlertIndicator alerts={row.alerts} />,
    },
  ]

  if (loading && data.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <div className="h-7 w-48 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse" />
          <div className="h-4 w-64 mt-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse" />
        </div>
        <SkeletonLoader variant="card" count={5} />
      </div>
    )
  }


  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Staff Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            Manage staff profiles, roles, and responsibilities
          </p>
        </div>
        <button
          onClick={() => fetchStaffList(pagination.page)}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          aria-label="Refresh list"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchStaffList(1) }}
        />
      )}

      {/* Filters Section - Requirements: 8.3 */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by name or employee number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="pl-10 pr-8 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent appearance-none cursor-pointer"
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="px-4 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent appearance-none cursor-pointer"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>


      {/* Staff Table - Requirements: 8.2, 8.4 */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
        {data.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
            <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] font-medium">No staff members found</p>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              {filters.search || filters.role || filters.department || filters.status
                ? 'Try adjusting your filters'
                : 'Staff members will appear here once added'}
            </p>
          </div>
        ) : (
          <DataTable
            data={data}
            columns={columns}
            keyExtractor={(row) => row.id}
            onRowClick={handleRowClick}
            loading={loading}
            emptyMessage="No staff members found"
          />
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] px-4 py-3">
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} staff members
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
              className="p-2 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-[var(--text-primary)] dark:text-[var(--text-muted)] px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
