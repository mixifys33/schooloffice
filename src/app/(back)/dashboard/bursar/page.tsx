'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CreditCard,
  FileText,
  Calendar,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'

interface FinancialMetrics {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  totalOutstanding: number
  collectionRate: number
  studentsWithBalance: number
  totalStudents: number
  recentPayments: RecentPayment[]
  monthlyTrend: MonthlyTrend[]
  topDefaulters: TopDefaulter[]
}

interface RecentPayment {
  id: string
  studentName: string
  amount: number
  paymentMethod: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  reference: string
}

interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  collections: number
}

interface TopDefaulter {
  id: string
  studentName: string
  className: string
  outstandingAmount: number
  daysPastDue: number
  lastPayment: string | null
}

interface DashboardState {
  metrics: FinancialMetrics | null
  loading: boolean
  error: string | null
  refreshing: boolean
  lastUpdated: Date | null
}

export default function EnhancedBursarDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    loading: true,
    error: null,
    refreshing: false,
    lastUpdated: null
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('current-term')

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session?.user) {
      console.log('No session found, redirecting to login')
      router.push('/login')
      return
    }
    
    // Check if user has required data
    if (!session.user.schoolId) {
      console.warn('User has no schoolId, this may cause API issues')
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Session error: No school ID found. Please log out and log in again.'
      }))
      return
    }
  }, [session, status, router])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: !isRefresh, 
        refreshing: isRefresh, 
        error: null 
      }))

      // Get current term first
      const termResponse = await fetch('/api/terms/current')
      const termData = await termResponse.json()
      const termId = termData.term?.id

      if (!termId) {
        if (termResponse.status === 404) {
          const errorData = await termResponse.json().catch(() => ({}))
          let userFriendlyMessage = ''

          switch (errorData.suggestion) {
            case 'setup_academic_year':
              userFriendlyMessage = 'No academic years found. Please set up an academic year first.'
              break
            case 'setup_terms':
              userFriendlyMessage = 'Academic year exists but no terms found. Please create terms for your academic year.'
              break
            case 'activate_academic_year':
              userFriendlyMessage = 'Academic year and terms exist but none are currently active. Please activate your academic year.'
              break
            default:
              userFriendlyMessage = errorData.error || 'Academic setup required. Please set up an active academic year and term before accessing the bursar dashboard.'
          }

          setState(prev => ({
            ...prev,
            loading: false,
            refreshing: false,
            error: userFriendlyMessage
          }))
          return
        } else {
          throw new Error('Unable to retrieve term information')
        }
      }

      // Fetch all dashboard data
      const [metricsRes, paymentsRes, defaultersRes] = await Promise.all([
        fetch(`/api/bursar/dashboard/metrics?termId=${termId}&period=${selectedPeriod}`),
        fetch(`/api/bursar/dashboard/recent-payments?termId=${termId}&limit=10`),
        fetch(`/api/bursar/dashboard/top-defaulters?termId=${termId}&limit=5`)
      ])

      if (!metricsRes.ok || !paymentsRes.ok || !defaultersRes.ok) {
        // Log specific response statuses for debugging
        if (!metricsRes.ok) console.error('Metrics API failed with status:', metricsRes.status)
        if (!paymentsRes.ok) console.error('Payments API failed with status:', paymentsRes.status)
        if (!defaultersRes.ok) console.error('Defaulters API failed with status:', defaultersRes.status)
        
        const failedRequests = []
        if (!metricsRes.ok) failedRequests.push('financial metrics')
        if (!paymentsRes.ok) failedRequests.push('recent payments')
        if (!defaultersRes.ok) failedRequests.push('defaulter information')

        throw new Error(`Failed to load ${failedRequests.join(', ')}. Please try again.`)
      }

      const [metricsData, paymentsData, defaultersData] = await Promise.all([
        metricsRes.json(),
        paymentsRes.json(),
        defaultersRes.json()
      ])

      if (!metricsData.success || !paymentsData.success || !defaultersData.success) {
        // Log specific response data for debugging
        if (!metricsData.success) console.error('Metrics API returned success=false:', metricsData)
        if (!paymentsData.success) console.error('Payments API returned success=false:', paymentsData)
        if (!defaultersData.success) console.error('Defaulters API returned success=false:', defaultersData)
        
        const failedData = []
        if (!metricsData.success) failedData.push('financial metrics')
        if (!paymentsData.success) failedData.push('recent payments')
        if (!defaultersData.success) failedData.push('defaulter information')

        throw new Error(`Invalid data received for ${failedData.join(', ')}. Please contact support.`)
      }

      // Combine all data
      const combinedMetrics: FinancialMetrics = {
        ...metricsData.metrics,
        recentPayments: paymentsData.payments || [],
        topDefaulters: defaultersData.defaulters || []
      }

      setState(prev => ({
        ...prev,
        metrics: combinedMetrics,
        loading: false,
        refreshing: false,
        lastUpdated: new Date()
      }))

    } catch (error) {
      console.error('Error fetching bursar dashboard data:', error)
      
      let userFriendlyMessage = 'Failed to load dashboard data'
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to load')) {
          userFriendlyMessage = error.message
        } else if (error.message.includes('Invalid data received')) {
          userFriendlyMessage = error.message
        } else if (error.message.includes('fetch')) {
          userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
        } else {
          userFriendlyMessage = 'Unable to load financial data. Please check your connection and try again.'
        }
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: userFriendlyMessage
      }))
    }
  }

  useEffect(() => {
    // Only fetch data after authentication is confirmed
    if (status === 'authenticated' && session?.user?.schoolId) {
      fetchDashboardData()
    }
  }, [selectedPeriod, status, session?.user?.schoolId])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no session (will redirect)
  if (!session?.user) {
    return null
  }

  if (state.loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
              Bursar Dashboard
            </h1>
            <p className="text-[var(--text-secondary)]">
              Financial management and oversight
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={state.refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.refreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>

        <ErrorMessage
          title="Failed to load financial dashboard"
          message={state.error}
          suggestedActions={
            state.error.includes('Academic setup required') 
              ? [
                  'Go to Settings → Academic Years to set up an academic year',
                  'Create and activate a term for the current period',
                  'Ensure the term dates cover the current date',
                  'Contact your system administrator if you need help'
                ]
              : state.error.includes('Unable to retrieve term information')
              ? [
                  'Check your internet connection',
                  'Try refreshing the page',
                  'Contact support if the problem persists'
                ]
              : [
                  'Check your internet connection',
                  'Try refreshing the page',
                  'Contact support if the problem persists'
                ]
          }
        />
      </div>
    )
  }

  const { metrics } = state

  if (!metrics) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-[var(--warning)]" />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            Unable to load financial data at this time.
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
            Bursar Dashboard
          </h1>
          <p className="text-[var(--text-secondary)]">
            Financial management and oversight
            {state.lastUpdated && (
              <span className="ml-2 text-xs">
                • Last updated {state.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-[var(--bg-surface)] border-[var(--border-default)]"
          >
            <option value="current-term">Current Term</option>
            <option value="current-month">Current Month</option>
            <option value="last-30-days">Last 30 Days</option>
            <option value="current-year">Current Year</option>
          </select>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={state.refreshing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Total Revenue
              </span>
              <DollarSign className="h-5 w-5 text-[var(--success)]" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
              {formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-xs text-[var(--success)] flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Revenue collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Outstanding Amount
              </span>
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
              {formatCurrency(metrics.totalOutstanding)}
            </p>
            <p className="text-xs text-[var(--warning)] flex items-center mt-1">
              <Users className="h-3 w-3 mr-1" />
              {metrics.studentsWithBalance} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Collection Rate
              </span>
              <TrendingUp className="h-5 w-5 text-[var(--info)]" />
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
              {metrics.collectionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Payment efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Net Income
              </span>
              <TrendingUp className={`h-5 w-5 ${metrics.netIncome >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`} />
            </div>
            <p className={`text-2xl lg:text-3xl font-bold ${metrics.netIncome >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {formatCurrency(metrics.netIncome)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {metrics.recentPayments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">No recent payments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getPaymentStatusIcon(payment.status)}
                      <div>
                        <p className="font-medium text-sm">{payment.studentName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {formatDate(payment.timestamp)} • {payment.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                      <Badge variant={getStatusBadgeVariant(payment.status)} className="text-xs">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Defaulters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Top Defaulters</CardTitle>
            <Button variant="ghost" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {metrics.topDefaulters.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-[var(--success)]" />
                <p className="text-sm text-[var(--text-secondary)]">No outstanding balances</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.topDefaulters.map((defaulter) => (
                  <div key={defaulter.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{defaulter.studentName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {defaulter.className} • {defaulter.daysPastDue} days overdue
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-[var(--danger)]">
                        {formatCurrency(defaulter.outstandingAmount)}
                      </p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Contact
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={() => window.location.href = '/dashboard/bursar/payment-tracking'}
            >
              <div className="p-2 rounded-lg bg-[var(--success-light)] text-[var(--success)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Track Payments</p>
                <p className="text-xs text-[var(--text-secondary)]">Monitor payment status</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={() => window.location.href = '/dashboard/bursar/fee-structures'}
            >
              <div className="p-2 rounded-lg bg-[var(--info-light)] text-[var(--info)]">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Fee Structures</p>
                <p className="text-xs text-[var(--text-secondary)]">Manage fee schedules</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={() => window.location.href = '/dashboard/bursar/reports'}
            >
              <div className="p-2 rounded-lg bg-[var(--warning-light)] text-[var(--warning)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Financial Reports</p>
                <p className="text-xs text-[var(--text-secondary)]">Generate reports</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={() => window.location.href = '/dashboard/bursar/defaulters'}
            >
              <div className="p-2 rounded-lg bg-[var(--danger-light)] text-[var(--danger)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Defaulter Management</p>
                <p className="text-xs text-[var(--text-secondary)]">Handle overdue accounts</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}