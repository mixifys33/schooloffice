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
  Calendar
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
  }
}

export default function AdminFinancialOverviewPage() {
  const router = useRouter()
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchFinancialData()
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

  const handleRefresh = () => {
    setRefreshing(true)
    fetchFinancialData()
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
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)]')}>
            {data.currentTerm.name} - {data.currentTerm.academicYear}
          </p>
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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
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
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
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
    </div>
  )
}
