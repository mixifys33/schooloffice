'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  Eye,
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  Printer,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
} from '@/lib/responsive'
import {
  exportFinancialOverviewToPDF,
  exportFinancialOverviewToExcel,
  printFinancialOverview,
  type SchoolInfo
} from '@/lib/print-export-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Student {
  id: string
  name: string
  class: string
  balance: number
  phone?: string
  email?: string
  totalDue: number
  totalPaid: number
  lastPaymentDate: string | null
}

interface FinancialData {
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  unpaidStudents: Student[]
  currentTerm: {
    id: string
    name: string
    academicYear: string
  } | null
}

export default function AdminFinancialOverviewPage() {
  const router = useRouter()
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)

  useEffect(() => {
    fetchFinancialData()
    fetchSchoolInfo()
  }, [])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/finance/summary')

      if (!response.ok) {
        throw new Error('Failed to fetch financial data')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching financial data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load financial data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchSchoolInfo = async () => {
    try {
      const response = await fetch('/api/settings/school')
      if (response.ok) {
        const result = await response.json()
        console.log('School API Response:', result)
        const school = result.school || result
        console.log('School Data:', school)
        setSchoolInfo({
          name: school.name || 'School Name',
          code: school.code,
          address: school.address,
          phone: school.phone,
          email: school.email,
          logo: school.logo,
        })
      } else {
        console.error('Failed to fetch school info:', response.status)
        // Set default school info if fetch fails
        setSchoolInfo({
          name: 'School Name',
        })
      }
    } catch (err) {
      console.error('Error fetching school info:', err)
      // Set default school info if fetch fails
      setSchoolInfo({
        name: 'School Name',
      })
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchFinancialData()
  }

  const handlePrint = () => {
    if (!data || !schoolInfo) return
    
    const subtitle = data.currentTerm 
      ? `${data.currentTerm.name} - ${data.currentTerm.academicYear}` 
      : 'No Active Term'
    
    printFinancialOverview(
      'financial-overview-content',
      schoolInfo,
      'Financial Overview',
      subtitle
    )
  }

  const handleExportPDF = () => {
    if (!data || !schoolInfo) return
    
    const subtitle = data.currentTerm 
      ? `${data.currentTerm.name} - ${data.currentTerm.academicYear}` 
      : 'No Active Term'
    
    exportFinancialOverviewToPDF(data, {
      schoolInfo,
      title: 'Financial Overview',
      subtitle,
      orientation: 'landscape',
      pageSize: 'a4',
    })
  }

  const handleExportExcel = () => {
    if (!data || !schoolInfo) return
    
    const subtitle = data.currentTerm 
      ? `${data.currentTerm.name} - ${data.currentTerm.academicYear}` 
      : 'No Active Term'
    
    exportFinancialOverviewToExcel(data, {
      schoolInfo,
      title: 'Financial Overview',
      subtitle,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB')
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)]')}>
            Financial Overview
          </h1>
        </div>

        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>

        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)]')}>
            Financial Overview
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load financial data"
          message={error || 'Unknown error occurred'}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />

        <div className="flex gap-2">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)]')}>
            Financial Overview
          </h1>
          {schoolInfo && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {schoolInfo.name}
            </p>
          )}
          {data.currentTerm && (
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)]')}>
              {data.currentTerm.name} - {data.currentTerm.academicYear}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!data || !schoolInfo}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!data || !schoolInfo}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Printable Content */}
      <div id="financial-overview-content">
        {/* Key Metrics */}
        {!data.currentTerm && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  No Active Term
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  No current academic term is configured. Please set up an academic year and term to view financial data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Expected"
          value={formatCurrency(data.totalExpected)}
          subtitle="For current term"
          color="blue"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(data.totalCollected)}
          subtitle="Payments received"
          color="green"
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(data.totalOutstanding)}
          subtitle="Amount owed"
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Collection Rate"
          value={`${data.collectionRate.toFixed(1)}%`}
          subtitle="Payment efficiency"
          color={data.collectionRate >= 90 ? 'green' : data.collectionRate >= 70 ? 'yellow' : 'red'}
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Students with Outstanding Fees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Students with Outstanding Fees ({data.unpaidStudents.length})
            </CardTitle>
            {data.unpaidStudents.length > 0 && (
              <Badge variant="destructive">
                Action Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.unpaidStudents.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-medium text-[var(--text-primary)]">All fees collected!</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">No outstanding balances for this term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Student
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Class
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Total Due
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Paid
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Outstanding
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Last Payment
                    </th>
                    <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Contact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.unpaidStudents.map((student) => (
                    <tr key={student.id} className="border-b border-[var(--border-default)]">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {student.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {student.class}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatCurrency(student.totalDue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600">
                        {formatCurrency(student.totalPaid)}
                      </td>
                      <td className="py-3 px-4 font-medium text-red-600">
                        {formatCurrency(student.balance)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(student.lastPaymentDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-[var(--text-secondary)]">
                          {student.phone && <div>{student.phone}</div>}
                          {student.email && <div>{student.email}</div>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Information Notice */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 no-print">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Read-Only View
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This is a read-only view of financial data for administrative oversight. 
                  To record payments or manage student fees, please contact the Bursar&apos;s Office. 
                  This ensures proper financial controls and audit trails are maintained.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SchoolOffice Branding */}
        <div className="text-center py-4 no-print">
          <p className="text-xs text-[var(--text-muted)]">
            Powered by <span className="font-medium text-[var(--text-secondary)]">SchoolOffice</span>
          </p>
        </div>
      </div>
    </div>
  )
}
