'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { FileText, Download, Send, Filter, ChevronDown } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { PaymentStatusBadge, PaymentStatus } from '@/components/ui/payment-status-badge'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Reports and Report Cards Page
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * - Display exam results by class and term
 * - Generate report card PDF
 * - Send report cards with payment check
 */

interface ExamResult {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  classId: string
  className: string
  streamName: string | null
  termId: string
  termName: string
  totalMarks: number
  average: number
  position: number
  totalStudents: number
  grade: string | null
  paymentStatus: PaymentStatus
  isPublished: boolean
  canSendReport: boolean
}

interface ClassOption {
  id: string
  name: string
}

interface TermOption {
  id: string
  name: string
  academicYear: string
}

interface ReportsResponse {
  results: ExamResult[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    totalStudents: number
    publishedReports: number
    unpublishedReports: number
    paidStudents: number
    unpaidStudents: number
  }
}

export default function ReportsPage() {
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTermId, setSelectedTermId] = useState<string>('')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState<string | null>(null)
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [showTermDropdown, setShowTermDropdown] = useState(false)
  const { toast, showToast, hideToast } = useLocalToast()
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [summary, setSummary] = useState({
    totalStudents: 0,
    publishedReports: 0,
    unpublishedReports: 0,
    paidStudents: 0,
    unpaidStudents: 0,
  })


  // Fetch classes and terms on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [classesRes, termsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/terms'),
        ])

        if (classesRes.ok) {
          const classesData = await classesRes.json()
          setClasses(classesData.classes || [])
        }

        if (termsRes.ok) {
          const termsData = await termsRes.json()
          setTerms(termsData.terms || [])
          // Set default term to the first (most recent) term
          if (termsData.terms?.length > 0) {
            setSelectedTermId(termsData.terms[0].id)
          }
        }
      } catch (err) {
        console.error('Error fetching filters:', err)
      }
    }

    fetchFilters()
  }, [])

  const fetchResults = useCallback(async (
    page: number,
    search: string,
    classId: string,
    termId: string
  ) => {
    try {
      setSearchLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
      })

      if (search) params.set('search', search)
      if (classId) params.set('classId', classId)
      if (termId) params.set('termId', termId)

      const response = await fetch(`/api/reports?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch results data')
      }

      const data: ReportsResponse = await response.json()
      setResults(data.results)
      setPagination(data.pagination)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      console.error('Error fetching results:', err)
      setError('Unable to load results data. Please try again.')
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [pagination.pageSize])

  // Fetch results when term changes
  useEffect(() => {
    if (selectedTermId) {
      fetchResults(1, searchQuery, selectedClassId, selectedTermId)
    }
  }, [selectedTermId, selectedClassId, fetchResults, searchQuery])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    fetchResults(1, value, selectedClassId, selectedTermId)
  }, [fetchResults, selectedClassId, selectedTermId])

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setShowClassDropdown(false)
    fetchResults(1, searchQuery, classId, selectedTermId)
  }

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId)
    setShowTermDropdown(false)
    fetchResults(1, searchQuery, selectedClassId, termId)
  }

  // Generate PDF report card - Requirement 7.2
  const handleGeneratePdf = async (studentId: string, studentName: string) => {
    try {
      setGeneratingPdf(studentId)

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          termId: selectedTermId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report card')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Report_Card_${studentName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast('success', 'Report card generated successfully')
    } catch (err) {
      console.error('Error generating PDF:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to generate report card')
    } finally {
      setGeneratingPdf(null)
    }
  }


  // Send report card - Requirements 7.3, 7.4, 7.5
  const handleSendReport = async (studentId: string, paymentStatus: PaymentStatus) => {
    // Check payment status before sending - Requirement 7.3, 7.4
    if (paymentStatus === 'NOT_PAID') {
      showToast('error', 'Cannot send report - student fees unpaid')
      return
    }

    try {
      setSendingReport(studentId)

      const response = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          termId: selectedTermId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send report card')
      }

      // Refresh the list
      await fetchResults(pagination.page, searchQuery, selectedClassId, selectedTermId)
      showToast('success', 'Report card sent successfully')
    } catch (err) {
      console.error('Error sending report:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to send report card')
    } finally {
      setSendingReport(null)
    }
  }

  const columns: Column<ExamResult>[] = [
    {
      key: 'studentName',
      header: 'Student',
      primary: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.studentName}</div>
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
      key: 'totalMarks',
      header: 'Total Marks',
      hideOnMobile: true,
      render: (value) => value as number,
    },
    {
      key: 'average',
      header: 'Average',
      render: (value) => `${(value as number).toFixed(1)}%`,
    },
    {
      key: 'position',
      header: 'Position',
      render: (_, row) => `${row.position}/${row.totalStudents}`,
    },
    {
      key: 'grade',
      header: 'Grade',
      hideOnMobile: true,
      render: (value) => (
        <span className={`font-medium ${
          value === 'A' ? 'text-green-600' :
          value === 'B' ? 'text-blue-600' :
          value === 'C' ? 'text-yellow-600' :
          value === 'D' ? 'text-orange-600' :
          'text-red-600'
        }`}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (value) => <PaymentStatusBadge status={value as PaymentStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleGeneratePdf(row.studentId, row.studentName)
            }}
            disabled={generatingPdf === row.studentId}
            title="Download PDF"
          >
            {generatingPdf === row.studentId ? (
              <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant={row.paymentStatus === 'NOT_PAID' ? 'ghost' : 'outline'}
            onClick={(e) => {
              e.stopPropagation()
              handleSendReport(row.studentId, row.paymentStatus)
            }}
            disabled={sendingReport === row.studentId || row.paymentStatus === 'NOT_PAID'}
            title={row.paymentStatus === 'NOT_PAID' ? 'Cannot send - fees unpaid' : 'Send to parent'}
            className={row.paymentStatus === 'NOT_PAID' ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {sendingReport === row.studentId ? (
              <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      ),
    },
  ]


  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports & Report Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View exam results and send report cards
            </p>
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const selectedTerm = terms.find(t => t.id === selectedTermId)

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
          <h1 className="text-2xl font-bold">Reports & Report Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary.totalStudents} students • {summary.publishedReports} reports published
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Students</div>
          <div className="text-2xl font-bold">{summary.totalStudents}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Published Reports</div>
          <div className="text-2xl font-bold text-green-600">{summary.publishedReports}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Paid Students</div>
          <div className="text-2xl font-bold text-green-600">{summary.paidStudents}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Unpaid (Cannot Send)</div>
          <div className="text-2xl font-bold text-red-600">{summary.unpaidStudents}</div>
        </div>
      </div>

      {/* Warning for unpaid students */}
      {summary.unpaidStudents > 0 && (
        <AlertBanner
          type="warning"
          message={`${summary.unpaidStudents} students have unpaid fees and cannot receive report cards.`}
        />
      )}

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => fetchResults(pagination.page, searchQuery, selectedClassId, selectedTermId) }}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          placeholder="Search by name or admission number..."
          value={searchQuery}
          onChange={handleSearch}
          loading={searchLoading}
          className="sm:w-80"
        />

        {/* Class Filter */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => {
              setShowClassDropdown(!showClassDropdown)
              setShowTermDropdown(false)
            }}
            className="gap-2 min-w-[150px] justify-between"
          >
            <span>{selectedClass?.name || 'All Classes'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {showClassDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-auto">
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleClassChange('')}
              >
                All Classes
              </button>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleClassChange(cls.id)}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Term Filter */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => {
              setShowTermDropdown(!showTermDropdown)
              setShowClassDropdown(false)
            }}
            className="gap-2 min-w-[200px] justify-between"
          >
            <span>{selectedTerm ? `${selectedTerm.name} - ${selectedTerm.academicYear}` : 'Select Term'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {showTermDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-auto">
              {terms.map((term) => (
                <button
                  key={term.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleTermChange(term.id)}
                >
                  {term.name} - {term.academicYear}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={results}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="No exam results found for the selected filters."
        loading={searchLoading}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchResults(pagination.page - 1, searchQuery, selectedClassId, selectedTermId)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchResults(pagination.page + 1, searchQuery, selectedClassId, selectedTermId)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
