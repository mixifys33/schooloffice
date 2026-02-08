'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Receipt,
  Send,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getTouchFriendlyClasses,
} from '@/lib/responsive'

// ============================================
// TYPES & INTERFACES
// ============================================

interface ReportData {
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  studentsWithOutstandingFees: number
  totalStudents: number
  fullyPaid: number
  partiallyPaid: number
  notPaid: number
  monthlyTrend: Array<{ month: string; collected: number; outstanding: number }>
  paymentMethods: Array<{ method: string; amount: number; percentage: number; count: number }>
  classBreakdown: Array<{ className: string; stream: string | null; totalExpected: number; totalCollected: number; outstanding: number; collectionRate: number }>
}

interface ReportFilters {
  dateRange: string
  classFilter: string
  term: string
  reportType: string
}

// ============================================
// COMPONENTS
// ============================================

interface MonthlyTrendChartProps {
  data: Array<{ month: string; collected: number; outstanding: number }>
}

function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const maxValue = Math.max(
    ...data.flatMap(d => [d.collected, d.outstanding]),
    1
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Monthly Collection Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const collectedWidth = (item.collected / maxValue) * 100
            const outstandingWidth = (item.outstanding / maxValue) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
                    {item.month}
                  </span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-[var(--success)]">
                      Collected: {formatCurrency(item.collected)}
                    </span>
                    <span className="text-[var(--danger)]">
                      Outstanding: {formatCurrency(item.outstanding)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[var(--success)] transition-all duration-300"
                      style={{ width: `${collectedWidth}%` }}
                    />
                  </div>
                  <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[var(--danger)] transition-all duration-300"
                      style={{ width: `${outstandingWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentMethodChartProps {
  data: Array<{ method: string; amount: number; percentage: number; count: number }>
}

function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <DollarSign className="h-4 w-4" />
      case 'mobile_money': return <CreditCard className="h-4 w-4" />
      case 'bank': return <CreditCard className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'bg-[var(--success)]'
      case 'mobile_money': return 'bg-[var(--accent-primary)]'
      case 'bank': return 'bg-[var(--info)]'
      default: return 'bg-[var(--text-muted)]'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Payment Methods Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getMethodColor(item.method)}`}>
                  {getMethodIcon(item.method)}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {item.method.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {item.count} transactions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {formatCurrency(item.amount)}
                </p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ClassBreakdownTableProps {
  data: Array<{ className: string; stream: string | null; totalExpected: number; totalCollected: number; outstanding: number; collectionRate: number }>
}

function ClassBreakdownTable({ data }: ClassBreakdownTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Class Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Class
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Expected
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Collected
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Outstanding
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Collection Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <td className="py-3 px-4 font-medium">
                    {item.className} {item.stream ? `(${item.stream})` : ''}
                  </td>
                  <td className="py-3 px-4">
                    {formatCurrency(item.totalExpected)}
                  </td>
                  <td className="py-3 px-4 text-[var(--success)]">
                    {formatCurrency(item.totalCollected)}
                  </td>
                  <td className="py-3 px-4 text-[var(--danger)]">
                    {formatCurrency(item.outstanding)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={item.collectionRate >= 80 ? "success" : item.collectionRate >= 60 ? "default" : "destructive"}>
                      {formatPercentage(item.collectionRate)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BursarReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'this-month',
    classFilter: 'all',
    term: 'current',
    reportType: 'comprehensive'
  })

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bursar/reports')
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data')
        }

        const data = await response.json()
        
        setReportData(data.reportData)
      } catch (err) {
        console.error('Error fetching report data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch report data')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [filters])

  const handleFilterChange = (filterName: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Financial Reports
          </h1>
        </div>

        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>

        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Financial Reports
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load report data"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />
      </div>
    )
  }

  if (!reportData) {
    return null
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Financial Reports
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Comprehensive financial analysis and reporting
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Report Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-term">This Term</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.classFilter} onValueChange={(value) => handleFilterChange('classFilter', value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="s1">S1</SelectItem>
            <SelectItem value="s2">S2</SelectItem>
            <SelectItem value="s3">S3</SelectItem>
            <SelectItem value="s4">S4</SelectItem>
            <SelectItem value="s5">S5</SelectItem>
            <SelectItem value="s6">S6</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.term} onValueChange={(value) => handleFilterChange('term', value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Term</SelectItem>
            <SelectItem value="t1">Term 1</SelectItem>
            <SelectItem value="t2">Term 2</SelectItem>
            <SelectItem value="t3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Expected"
          value={formatCurrency(reportData.totalExpected)}
          subtitle="This period"
          color="blue"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(reportData.totalCollected)}
          subtitle="Received payments"
          color="green"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(reportData.totalOutstanding)}
          subtitle="Amount owed"
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Collection Rate"
          value={formatPercentage(reportData.collectionRate)}
          subtitle="Fee collection efficiency"
          color={reportData.collectionRate >= 80 ? "green" : reportData.collectionRate >= 60 ? "yellow" : "red"}
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Not Paid"
          value={String(reportData.notPaid)}
          subtitle="Students"
          color="red"
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Fully Paid"
          value={String(reportData.fullyPaid)}
          subtitle="Students"
          color="green"
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MonthlyTrendChart data={reportData.monthlyTrend} />
        <PaymentMethodChart data={reportData.paymentMethods} />
      </div>

      {/* Class Breakdown */}
      <ClassBreakdownTable data={reportData.classBreakdown} />

      {/* Report Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className={cn(
            getTouchFriendlyClasses('button'),
            'h-auto p-4 flex flex-col items-start gap-2 text-left'
          )}
        >
          <div className="p-2 rounded-lg bg-[var(--info-light)] text-[var(--chart-blue)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-blue)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Class Report</p>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Detailed class-wise breakdown</p>
          </div>
        </Button>
        
        <Button
          variant="outline"
          className={cn(
            getTouchFriendlyClasses('button'),
            'h-auto p-4 flex flex-col items-start gap-2 text-left'
          )}
        >
          <div className="p-2 rounded-lg bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)] dark:text-[var(--chart-green)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Collection Trends</p>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Historical collection patterns</p>
          </div>
        </Button>
        
        <Button
          variant="outline"
          className={cn(
            getTouchFriendlyClasses('button'),
            'h-auto p-4 flex flex-col items-start gap-2 text-left'
          )}
        >
          <div className="p-2 rounded-lg bg-[var(--warning-light)] text-[var(--chart-yellow)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Defaulter Report</p>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">List of defaulters by class</p>
          </div>
        </Button>
        
        <Button
          variant="outline"
          className={cn(
            getTouchFriendlyClasses('button'),
            'h-auto p-4 flex flex-col items-start gap-2 text-left'
          )}
        >
          <div className="p-2 rounded-lg bg-[var(--info-light)] text-[var(--chart-purple)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-purple)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Payment Analysis</p>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Payment methods and trends</p>
          </div>
        </Button>
      </div>
    </div>
  )
}