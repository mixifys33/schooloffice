'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

interface BursarMetrics {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  collectionRate: number
  outstandingFees: number
  cashFlow: number
  budgetVariance: number
  studentsWithOutstandingFees: number
  totalStudents: number
  monthlyTrend: Array<{ month: string; collected: number; outstanding: number }>
  paymentMethods: Array<{ method: string; amount: number; percentage: number; count: number }>
  alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: string }>
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

// ============================================
// CHART COMPONENTS
// ============================================

interface SimpleLineChartProps {
  data: Array<{ month: string; collected: number; outstanding: number }>
  title: string
}

function SimpleLineChart({ data, title }: SimpleLineChartProps) {
  const maxValue = Math.max(
    ...data.flatMap(d => [d.collected, d.outstanding]),
    1
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
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
                    <span className="text-[var(--chart-green)]">
                      Collected: UGX {item.collected.toLocaleString()}
                    </span>
                    <span className="text-[var(--chart-red)]">
                      Outstanding: UGX {item.outstanding.toLocaleString()}
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
  title: string
}

function PaymentMethodChart({ data, title }: PaymentMethodChartProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {title}
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
                  UGX {item.amount.toLocaleString()}
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

// ============================================
// MAIN COMPONENT
// ============================================

export function BursarDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<BursarMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/bursar/dashboard')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch metrics')
      }

      setMetrics(result.data)
    } catch (err) {
      console.error('Error fetching bursar metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const handleRefresh = () => {
    fetchMetrics(true)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Quick actions for bursar
  const quickActions: QuickAction[] = [
    {
      id: 'record-payment',
      title: 'Record Payment',
      description: 'Add new payment from student/parent',
      icon: <DollarSign className="h-5 w-5" />,
      action: () => router.push('/dashboard/bursar/students'),
      color: 'green'
    },
    {
      id: 'generate-invoice',
      title: 'Generate Invoice',
      description: 'Create fee invoice for student',
      icon: <Calendar className="h-5 w-5" />,
      action: () => console.log('Generate invoice'),
      color: 'blue'
    },
    {
      id: 'send-reminders',
      title: 'Send Reminders',
      description: 'SMS/USSD fee reminders to parents',
      icon: <AlertTriangle className="h-5 w-5" />,
      action: () => console.log('Send reminders'),
      color: 'yellow'
    },
    {
      id: 'financial-report',
      title: 'Financial Report',
      description: 'Generate comprehensive report',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => console.log('Financial report'),
      color: 'purple'
    }
  ]

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
              Bursar Dashboard
            </h1>
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Financial management and fee tracking
            </p>
          </div>
        </div>
        
        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
              Bursar Dashboard
            </h1>
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Financial management and fee tracking
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            className={getTouchFriendlyClasses('button', 'w-full sm:w-auto')}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load financial metrics"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Bursar Dashboard
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Financial management and fee tracking
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className={cn(
              getTouchFriendlyClasses('button'),
              'w-full sm:w-auto'
            )}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className={getTouchFriendlyClasses('button', 'w-full sm:w-auto')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle="This term"
          color="green"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
          trend={metrics.netIncome > 0 ? { value: 12.5, direction: 'up' } : undefined}
        />
        <StatCard
          title="Outstanding Fees"
          value={formatCurrency(metrics.outstandingFees)}
          subtitle={`${metrics.studentsWithOutstandingFees} students`}
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Collection Rate"
          value={formatPercentage(metrics.collectionRate)}
          subtitle="Fee collection efficiency"
          color={metrics.collectionRate >= 80 ? "green" : metrics.collectionRate >= 60 ? "yellow" : "red"}
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Net Income"
          value={formatCurrency(metrics.netIncome)}
          subtitle="Revenue - Expenses"
          color={metrics.netIncome >= 0 ? "green" : "red"}
          icon={metrics.netIncome >= 0 ? 
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" /> : 
            <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          }
        />
        <StatCard
          title="Cash Flow"
          value={formatCurrency(metrics.cashFlow)}
          subtitle="Available funds"
          color={metrics.cashFlow >= 0 ? "blue" : "red"}
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Budget Variance"
          value={formatPercentage(metrics.budgetVariance)}
          subtitle="Budget vs Actual"
          color={Math.abs(metrics.budgetVariance) <= 10 ? "green" : Math.abs(metrics.budgetVariance) <= 20 ? "yellow" : "red"}
          icon={<BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className={cn(
                  getTouchFriendlyClasses('button'),
                  'h-auto p-4 flex flex-col items-start gap-2 text-left'
                )}
                onClick={action.action}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  action.color === 'green' && 'bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]',
                  action.color === 'blue' && 'bg-[var(--info-light)] text-[var(--chart-blue)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-blue)]',
                  action.color === 'yellow' && 'bg-[var(--warning-light)] text-[var(--chart-yellow)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]',
                  action.color === 'purple' && 'bg-[var(--info-light)] text-[var(--chart-purple)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-purple)]'
                )}>
                  {action.icon}
                </div>
                <div>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SimpleLineChart
          data={metrics.monthlyTrend}
          title="Monthly Collection Trend"
        />
        <PaymentMethodChart
          data={metrics.paymentMethods}
          title="Payment Methods Distribution"
        />
      </div>

      {/* Alerts and Notifications */}
      {metrics.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Financial Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-4 rounded-lg border-l-4 flex items-start gap-3',
                    alert.type === 'error' && 'bg-[var(--danger-light)] border-[var(--danger)] dark:bg-[var(--danger-dark)]',
                    alert.type === 'warning' && 'bg-[var(--warning-light)] border-[var(--warning)] dark:bg-[var(--warning-dark)]',
                    alert.type === 'info' && 'bg-[var(--info-light)] border-[var(--accent-primary)] dark:bg-[var(--info-dark)]'
                  )}
                >
                  <AlertTriangle className={cn(
                    'h-5 w-5 mt-0.5',
                    alert.type === 'error' && 'text-[var(--chart-red)]',
                    alert.type === 'warning' && 'text-[var(--chart-yellow)]',
                    alert.type === 'info' && 'text-[var(--chart-blue)]'
                  )} />
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {alert.message}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}