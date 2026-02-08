'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Download, Filter, CheckCircle } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { PaymentStatusBadge, PaymentStatus } from '@/components/ui/payment-status-badge'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Fees and Payments Page
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 * - Display students with fee information
 * - Mark as paid functionality
 * - Filter unpaid students
 * - Export payment report
 */

interface FeeListItem {
  id: string
  admissionNumber: string
  name: string
  firstName: string
  lastName: string
  classId: string
  className: string
  streamName: string | null
  amountRequired: number
  amountPaid: number
  balance: number
  paymentStatus: PaymentStatus
  lastPaymentDate: string | null
  lastPaymentMethod: string | null
  isActive: boolean
}

interface FeesResponse {
  students: FeeListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    totalStudents: number
    paidStudents: number
    unpaidStudents: number
    partialStudents: number
    totalExpected: number
    totalCollected: number
    totalOutstanding: number
  }
}

export default function FeesPage() {
  const [students, setStudents] = useState<FeeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [filterUnpaid, setFilterUnpaid] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const { toast, showToast, hideToast } = useLocalToast()
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [summary, setSummary] = useState({
    totalStudents: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    partialStudents: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  })


  const fetchFees = useCallback(async (page: number, search: string, unpaidOnly: boolean) => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      
      if (search) {
        params.set('search', search)
      }
      
      if (unpaidOnly) {
        params.set('status', 'NOT_PAID')
      }

      const response = await fetch(`/api/fees?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch fees data')
      }

      const data: FeesResponse = await response.json()
      setStudents(data.students)
      setPagination(data.pagination)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      console.error('Error fetching fees:', err)
      setError('Unable to load fees data. Please try again.')
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [pagination.pageSize])

  useEffect(() => {
    fetchFees(1, '', false)
  }, [fetchFees])

  // Handle search with debounce (300ms handled by SearchInput component)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    fetchFees(1, value, filterUnpaid)
  }, [fetchFees, filterUnpaid])

  // Toggle unpaid filter - Requirement 6.4
  const handleFilterToggle = useCallback(() => {
    const newFilterState = !filterUnpaid
    setFilterUnpaid(newFilterState)
    fetchFees(1, searchQuery, newFilterState)
  }, [fetchFees, searchQuery, filterUnpaid])

  // Mark student as paid - Requirements 6.2, 6.3
  const handleMarkAsPaid = async (studentId: string) => {
    try {
      setMarkingPaid(studentId)
      
      const response = await fetch(`/api/students/${studentId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PAID',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update payment status')
      }

      // Refresh the list
      await fetchFees(pagination.page, searchQuery, filterUnpaid)
      showToast('success', 'Payment status updated successfully')
    } catch (err) {
      console.error('Error marking as paid:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to update payment status')
    } finally {
      setMarkingPaid(null)
    }
  }

  // Export payment report - Requirement 6.5
  const handleExportReport = async () => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/fees/export')
      
      if (!response.ok) {
        throw new Error('Failed to export payment report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      showToast('success', 'Payment report exported successfully')
    } catch (err) {
      console.error('Error exporting report:', err)
      showToast('error', 'Failed to export payment report')
    } finally {
      setExporting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const columns: Column<FeeListItem>[] = [
    {
      key: 'name',
      header: 'Student',
      primary: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.admissionNumber}</div>
        </div>
      ),
    },
    {
      key: 'className',
      header: 'Class',
      render: (_, row) => (
        <span>
          {row.className}
          {row.streamName && <span className="text-muted-foreground"> - {row.streamName}</span>}
        </span>
      ),
    },
    {
      key: 'amountRequired',
      header: 'Amount Required',
      hideOnMobile: true,
      render: (value) => formatCurrency(value as number),
    },
    {
      key: 'amountPaid',
      header: 'Amount Paid',
      hideOnMobile: true,
      render: (value) => formatCurrency(value as number),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (value) => (
        <span className={(value as number) > 0 ? 'text-[var(--chart-red)] font-medium' : 'text-[var(--chart-green)]'}>
          {formatCurrency(value as number)}
        </span>
      ),
    },
    {
      key: 'lastPaymentDate',
      header: 'Payment Date',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (value) => formatDate(value as string | null),
    },
    {
      key: 'lastPaymentMethod',
      header: 'Payment Mode',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (value) => (value as string)?.replace('_', ' ') || '-',
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (value) => <PaymentStatusBadge status={value as PaymentStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        row.paymentStatus !== 'PAID' && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleMarkAsPaid(row.id)
            }}
            disabled={markingPaid === row.id}
            className="gap-1"
          >
            {markingPaid === row.id ? (
              <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Mark Paid</span>
          </Button>
        )
      ),
    },
  ]


  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Fees & Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage student fee payments
            </p>
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fees & Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.totalStudents} students • {formatCurrency(summary.totalCollected)} collected
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterUnpaid ? 'default' : 'outline'}
            onClick={handleFilterToggle}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">
              {filterUnpaid ? 'Show All' : 'Unpaid Only'}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportReport}
            disabled={exporting}
            className="gap-2"
          >
            {exporting ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Export Report</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Paid Students</div>
          <div className="text-2xl font-bold text-[var(--chart-green)]">{summary.paidStudents}</div>
        </div>
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Unpaid Students</div>
          <div className="text-2xl font-bold text-[var(--chart-red)]">{summary.unpaidStudents}</div>
        </div>
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="text-xl font-bold">{formatCurrency(summary.totalCollected)}</div>
        </div>
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="text-xl font-bold text-[var(--chart-red)]">{formatCurrency(summary.totalOutstanding)}</div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchFees(pagination.page, searchQuery, filterUnpaid) }}
        />
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          placeholder="Search by name or admission number..."
          value={searchQuery}
          onChange={handleSearch}
          loading={searchLoading}
          className="sm:w-80"
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={students}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage={filterUnpaid ? 'No unpaid students found.' : 'No students found.'}
        loading={searchLoading}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} students
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchFees(pagination.page - 1, searchQuery, filterUnpaid)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchFees(pagination.page + 1, searchQuery, filterUnpaid)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
