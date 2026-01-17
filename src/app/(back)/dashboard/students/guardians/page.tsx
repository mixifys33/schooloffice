'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Phone, Mail, Users, AlertTriangle, Shield, 
  Download, Filter, ChevronDown, Eye
} from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { GuardianStatus, GuardianFlag } from '@/types/enums'

/**
 * Guardians Management Page
 * Enhanced with status, flags, data quality indicators, and filter controls
 * Requirements: 9.1, 9.3, 9.4, 8.5
 */

interface GuardianListItem {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  secondaryPhone: string | null
  email: string | null
  status: GuardianStatus
  flags: GuardianFlag[]
  studentCount: number
  preferredChannel: string
  lastContactDate: Date | null
  dataQualityScore?: number
  dataQualityIssues?: string[]
}

interface GuardiansResponse {
  guardians: GuardianListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Status badge color mapping
const statusColors: Record<GuardianStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [GuardianStatus.ACTIVE]: 'default',
  [GuardianStatus.INACTIVE]: 'secondary',
  [GuardianStatus.BLOCKED]: 'destructive',
  [GuardianStatus.RESTRICTED]: 'outline',
}

// Flag badge color mapping
const flagColors: Record<GuardianFlag, 'destructive' | 'secondary' | 'outline'> = {
  [GuardianFlag.FEE_DEFAULTER]: 'destructive',
  [GuardianFlag.HIGH_CONFLICT]: 'secondary',
  [GuardianFlag.LEGAL_RESTRICTION]: 'outline',
}

// Data quality score color
function getQualityColor(score: number): string {
  if (score >= 75) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

export default function GuardiansPage() {
  const router = useRouter()
  const [guardians, setGuardians] = useState<GuardianListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // Filter state - Requirement 9.3
  const [statusFilter, setStatusFilter] = useState<GuardianStatus | ''>('')
  const [flagFilter, setFlagFilter] = useState<GuardianFlag | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchGuardians = useCallback(async (
    page: number, 
    search: string,
    status: GuardianStatus | '',
    flag: GuardianFlag | ''
  ) => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (flag) params.append('flags', flag)

      const response = await fetch(`/api/guardians?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch guardians')
      }

      const data: GuardiansResponse = await response.json()
      setGuardians(data.guardians)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      console.error('Error fetching guardians:', err)
      setError('Unable to load guardians. Please try again.')
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [pagination.pageSize])

  useEffect(() => {
    fetchGuardians(1, '', '', '')
  }, [fetchGuardians])

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    fetchGuardians(1, value, statusFilter, flagFilter)
  }, [fetchGuardians, statusFilter, flagFilter])

  // Handle filter changes - Requirement 9.3
  const handleStatusFilter = (status: GuardianStatus | '') => {
    setStatusFilter(status)
    fetchGuardians(1, searchQuery, status, flagFilter)
  }

  const handleFlagFilter = (flag: GuardianFlag | '') => {
    setFlagFilter(flag)
    fetchGuardians(1, searchQuery, statusFilter, flag)
  }

  const clearFilters = () => {
    setStatusFilter('')
    setFlagFilter('')
    fetchGuardians(1, searchQuery, '', '')
  }

  // Handle CSV export - Requirement 9.5
  const handleExport = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams({ format: 'csv' })
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter) params.set('status', statusFilter)
      if (flagFilter) params.append('flags', flagFilter)

      const response = await fetch(`/api/guardians?${params}`)
      
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guardians-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export guardians. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleRowClick = (guardian: GuardianListItem) => {
    router.push(`/dashboard/students/guardians/${guardian.id}`)
  }

  const hasActiveFilters = statusFilter !== '' || flagFilter !== ''

  const columns: Column<GuardianListItem>[] = [
    {
      key: 'name',
      header: 'Guardian Name',
      primary: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium">{row.name}</div>
            {row.flags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {row.flags.map((flag) => (
                  <Badge key={flag} variant={flagColors[flag]} className="text-[10px] px-1 py-0">
                    {flag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => (
        <Badge variant={statusColors[row.status]} className="text-xs">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (value) => value ? (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[200px]">{value}</span>
        </div>
      ) : <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'studentCount',
      header: 'Children',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.studentCount}</span>
        </div>
      ),
    },
    {
      key: 'dataQualityScore',
      header: 'Data Quality',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (_, row) => {
        const score = row.dataQualityScore ?? 0
        const hasIssues = row.dataQualityIssues && row.dataQualityIssues.length > 0
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${getQualityColor(score)}`}>
              {score}%
            </span>
            {hasIssues && (
              <AlertTriangle className="h-4 w-4 text-yellow-500" title={row.dataQualityIssues?.join(', ')} />
            )}
          </div>
        )
      },
    },
    {
      key: 'preferredChannel',
      header: 'Channel',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/dashboard/students/guardians/${row.id}`)
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Guardians</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage parent and guardian information
            </p>
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Guardians</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total} guardian{pagination.total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchGuardians(pagination.page, searchQuery, statusFilter, flagFilter) }}
        />
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={handleSearch}
            loading={searchLoading}
            className="sm:w-80"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-primary' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 justify-center">
                {(statusFilter ? 1 : 0) + (flagFilter ? 1 : 0)}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Filter Controls - Requirement 9.3 */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value as GuardianStatus | '')}
                className="block w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                {Object.values(GuardianStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Flag</label>
              <select
                value={flagFilter}
                onChange={(e) => handleFlagFilter(e.target.value as GuardianFlag | '')}
                className="block w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Flags</option>
                {Object.values(GuardianFlag).map((flag) => (
                  <option key={flag} value={flag}>{flag.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && !showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {statusFilter && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <button onClick={() => handleStatusFilter('')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {flagFilter && (
              <Badge variant="secondary" className="gap-1">
                Flag: {flagFilter.replace('_', ' ')}
                <button onClick={() => handleFlagFilter('')} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={guardians}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={handleRowClick}
        emptyMessage="No guardians found."
        loading={searchLoading}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} guardians
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchGuardians(pagination.page - 1, searchQuery, statusFilter, flagFilter)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchGuardians(pagination.page + 1, searchQuery, statusFilter, flagFilter)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
