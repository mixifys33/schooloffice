'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Download } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { MultiFilter, FilterConfig, ActiveFilter } from '@/components/ui/multi-filter'
import { PaymentStatusBadge, PaymentStatus } from '@/components/ui/payment-status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'

/**
 * Students Management Page
 * Requirements: 3.1, 3.5 - Display paginated list with search filtering within 300ms
 */

interface StudentListItem {
  id: string
  admissionNumber: string
  name: string
  firstName: string
  lastName: string
  gender: string | null
  age: number | null
  classId: string
  className: string
  streamId: string | null
  streamName: string | null
  status: string
  parentPhone: string | null
  parentEmail: string | null
  paymentStatus: PaymentStatus
  isActive: boolean
}

interface StudentsResponse {
  students: StudentListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface ClassOption {
  id: string
  name: string
  streams: { id: string; name: string }[]
}

interface FilterState {
  classId: string
  streamId: string
  gender: string
  paymentStatus: string
  status: string
  ageRange: string
}

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [filters, setFilters] = useState<FilterState>({
    classId: '',
    streamId: '',
    gender: '',
    paymentStatus: '',
    status: '',
    ageRange: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // Fetch classes for filter options
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }, [])

  const fetchStudents = useCallback(async (page: number, search: string, currentFilters: FilterState) => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      
      if (search) {
        params.set('search', search)
      }

      // Add filter parameters
      if (currentFilters.classId) {
        params.set('classId', currentFilters.classId)
      }
      if (currentFilters.streamId) {
        params.set('streamId', currentFilters.streamId)
      }
      if (currentFilters.gender) {
        params.set('gender', currentFilters.gender)
      }
      if (currentFilters.paymentStatus) {
        params.set('paymentStatus', currentFilters.paymentStatus)
      }
      if (currentFilters.status) {
        params.set('status', currentFilters.status)
      }
      if (currentFilters.ageRange) {
        params.set('ageRange', currentFilters.ageRange)
      }

      const response = await fetch(`/api/students?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data: StudentsResponse = await response.json()
      setStudents(data.students)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Unable to load students. Please try again.')
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [pagination.pageSize])

  useEffect(() => {
    fetchClasses()
    fetchStudents(1, '', filters)
  }, [fetchClasses, fetchStudents, filters])

  // Handle search with debounce (300ms handled by SearchInput component)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    fetchStudents(1, value, filters)
  }, [fetchStudents, filters])

  // Handle filter changes
  const handleFilterChange = useCallback((key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    
    // Clear stream filter if class changes
    if (key === 'classId') {
      newFilters.streamId = ''
    }
    
    setFilters(newFilters)
    fetchStudents(1, searchQuery, newFilters)
  }, [filters, searchQuery, fetchStudents])

  const handleFilterRemove = useCallback((key: string) => {
    const newFilters = { ...filters, [key]: '' }
    
    // Clear stream filter if class is removed
    if (key === 'classId') {
      newFilters.streamId = ''
    }
    
    setFilters(newFilters)
    fetchStudents(1, searchQuery, newFilters)
  }, [filters, searchQuery, fetchStudents])

  const handleClearAllFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      classId: '',
      streamId: '',
      gender: '',
      paymentStatus: '',
      status: '',
      ageRange: '',
    }
    setFilters(clearedFilters)
    fetchStudents(1, searchQuery, clearedFilters)
  }, [searchQuery, fetchStudents])

  const handleRowClick = (student: StudentListItem) => {
    router.push(`/dashboard/students/${student.id}`)
  }

  const handleAddStudent = () => {
    router.push('/dashboard/students/new')
  }

  const handleBulkUpload = () => {
    router.push('/dashboard/students/upload')
  }

  // Prepare filter configurations
  const selectedClass = classes.find((c) => c.id === filters.classId)
  const availableStreams = selectedClass?.streams || []

  const filterConfigs: FilterConfig[] = [
    {
      key: 'classId',
      label: 'Class',
      placeholder: 'Filter by class',
      options: classes.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'streamId',
      label: 'Stream',
      placeholder: 'Filter by stream',
      options: availableStreams.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      key: 'gender',
      label: 'Gender',
      placeholder: 'Filter by gender',
      options: [
        { value: 'MALE', label: 'Male' },
        { value: 'FEMALE', label: 'Female' },
      ],
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      placeholder: 'Filter by payment',
      options: [
        { value: 'PAID', label: 'Paid' },
        { value: 'PARTIAL', label: 'Partial' },
        { value: 'NOT_PAID', label: 'Not Paid' },
      ],
    },
    {
      key: 'ageRange',
      label: 'Age Range',
      placeholder: 'Filter by age',
      options: [
        { value: '3-6', label: '3-6 years' },
        { value: '7-10', label: '7-10 years' },
        { value: '11-14', label: '11-14 years' },
        { value: '15-18', label: '15-18 years' },
        { value: '19-25', label: '19+ years' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      placeholder: 'Filter by status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'TRANSFERRED', label: 'Transferred' },
        { value: 'GRADUATED', label: 'Graduated' },
        { value: 'SUSPENDED', label: 'Suspended' },
      ],
    },
  ]

  // Prepare active filters for display
  const activeFilters: ActiveFilter[] = []
  
  if (filters.classId) {
    const classOption = classes.find((c) => c.id === filters.classId)
    if (classOption) {
      activeFilters.push({
        key: 'classId',
        value: filters.classId,
        label: 'Class',
        displayValue: classOption.name,
      })
    }
  }
  
  if (filters.streamId) {
    const streamOption = availableStreams.find((s) => s.id === filters.streamId)
    if (streamOption) {
      activeFilters.push({
        key: 'streamId',
        value: filters.streamId,
        label: 'Stream',
        displayValue: streamOption.name,
      })
    }
  }
  
  if (filters.gender) {
    activeFilters.push({
      key: 'gender',
      value: filters.gender,
      label: 'Gender',
      displayValue: filters.gender === 'MALE' ? 'Male' : 'Female',
    })
  }
  
  if (filters.paymentStatus) {
    const paymentLabels = {
      PAID: 'Paid',
      PARTIAL: 'Partial',
      NOT_PAID: 'Not Paid',
    }
    activeFilters.push({
      key: 'paymentStatus',
      value: filters.paymentStatus,
      label: 'Payment',
      displayValue: paymentLabels[filters.paymentStatus as keyof typeof paymentLabels],
    })
  }
  
  if (filters.status) {
    const statusLabels = {
      ACTIVE: 'Active',
      TRANSFERRED: 'Transferred',
      GRADUATED: 'Graduated',
      SUSPENDED: 'Suspended',
    }
    activeFilters.push({
      key: 'status',
      value: filters.status,
      label: 'Status',
      displayValue: statusLabels[filters.status as keyof typeof statusLabels],
    })
  }

  if (filters.ageRange) {
    const ageLabels = {
      '3-6': '3-6 years',
      '7-10': '7-10 years',
      '11-14': '11-14 years',
      '15-18': '15-18 years',
      '19-25': '19+ years',
    }
    activeFilters.push({
      key: 'ageRange',
      value: filters.ageRange,
      label: 'Age',
      displayValue: ageLabels[filters.ageRange as keyof typeof ageLabels],
    })
  }

  const columns: Column<StudentListItem>[] = [
    {
      key: 'name',
      header: 'Name',
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
      key: 'gender',
      header: 'Gender',
      hideOnMobile: true,
      render: (value) => value || '-',
    },
    {
      key: 'age',
      header: 'Age',
      hideOnMobile: true,
      render: (value) => value ? `${value} yrs` : '-',
    },
    {
      key: 'parentPhone',
      header: 'Parent Phone',
      hideOnMobile: true,
      render: (value) => value || '-',
    },
    {
      key: 'parentEmail',
      header: 'Parent Email',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (value) => value || '-',
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (value) => <PaymentStatusBadge status={value as PaymentStatus} />,
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (_, row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage student records and enrollment
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
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total} students enrolled
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkUpload} className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <Button onClick={handleAddStudent} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Student</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchStudents(pagination.page, searchQuery, filters) }}
        />
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <SearchInput
            placeholder="Search by name, admission number..."
            value={searchQuery}
            onChange={handleSearch}
            loading={searchLoading}
            className="sm:w-80"
          />
          
          {/* Quick filter summary */}
          {activeFilters.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {pagination.total} student{pagination.total !== 1 ? 's' : ''} with {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} applied
            </div>
          )}
        </div>
        
        <MultiFilter
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onFilterRemove={handleFilterRemove}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={students}
        columns={columns}
        keyExtractor={(row) => row.id}
        onRowClick={handleRowClick}
        emptyMessage="No students found. Add your first student to get started."
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
              onClick={() => fetchStudents(pagination.page - 1, searchQuery, filters)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchStudents(pagination.page + 1, searchQuery, filters)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
