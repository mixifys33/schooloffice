'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  DollarSign, 
  Receipt, 
  Search,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Banknote,
  FileText,
  Download
} from 'lucide-react'
import { 
  AlertCard, 
  QuickActionButton, 
  StatsCard
} from '@/components/dashboard'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertType, AlertSeverity } from '@/types/enums'
import type { 
  BursarDashboardData, 
  BalanceAlert,
  ReconciliationAlert,
  ReportAccess
} from '@/types/staff-dashboard'

/**
 * Bursar Dashboard Page
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * Displays financial alerts, quick actions, financial overview, reports access
 * Excludes: marks editing, class changes, attendance modification
 */

// Quick actions for bursar dashboard - Requirements: 5.3
const bursarQuickActions = [
  {
    id: 'record-payment',
    icon: DollarSign,
    label: 'Record Payment',
    href: '/dashboard/fees/payments/new',
    variant: 'primary' as const,
  },
  {
    id: 'issue-receipt',
    icon: Receipt,
    label: 'Issue Receipt',
    href: '/dashboard/fees/receipts/new',
    variant: 'secondary' as const,
  },
  {
    id: 'view-balance',
    icon: Search,
    label: 'View Student Balance',
    href: '/dashboard/fees/balances',
    variant: 'outline' as const,
  },
  {
    id: 'fee-reports',
    icon: FileText,
    label: 'Fee Reports',
    href: '/dashboard/fees/reports',
    variant: 'outline' as const,
  },
]

// Payment method icons mapping
const paymentMethodIcons: Record<string, typeof DollarSign> = {
  cash: Banknote,
  mpesa: CreditCard,
  bank: CreditCard,
  cheque: FileText,
}


// Unpaid Balances Table Component - Requirements: 5.2
function UnpaidBalancesTable({ balances }: { balances: BalanceAlert[] }) {
  if (balances.length === 0) {
    return (
      <div className="text-center py-8">
        <DollarSign className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          No unpaid balances to display
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {balances.slice(0, 5).map((balance) => (
          <div
            key={balance.id}
            className="bg-white dark:bg-gray-800 rounded-lg border p-4"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {balance.studentName}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Adm. No.</span>
                <span className="text-gray-900 dark:text-gray-100">{balance.admissionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Class</span>
                <span className="text-gray-900 dark:text-gray-100">{balance.className}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Outstanding</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  KES {balance.outstandingBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Days Overdue</span>
                <span className={balance.daysOverdue > 30 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
                  {balance.daysOverdue} days
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Student Name
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Adm. No.
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Class
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-right">
                Outstanding
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-right">
                Days Overdue
              </th>
            </tr>
          </thead>
          <tbody>
            {balances.slice(0, 10).map((balance) => (
              <tr
                key={balance.id}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="py-3 px-4">{balance.studentName}</td>
                <td className="py-3 px-4">{balance.admissionNumber}</td>
                <td className="py-3 px-4">{balance.className}</td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium text-red-600 dark:text-red-400">
                    KES {balance.outstandingBalance.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={balance.daysOverdue > 30 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                    {balance.daysOverdue} days
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {balances.length > 10 && (
        <div className="mt-3 text-center">
          <Link 
            href="/dashboard/fees/balances" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all {balances.length} unpaid balances →
          </Link>
        </div>
      )}
    </div>
  )
}


// Payment Methods Breakdown Component - Requirements: 5.4
function PaymentMethodsBreakdown({ methods }: { methods: { method: string; amount: number }[] }) {
  const total = methods.reduce((sum, m) => sum + m.amount, 0)
  
  if (methods.length === 0 || total === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No payments recorded today
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const percentage = total > 0 ? Math.round((method.amount / total) * 100) : 0
        const Icon = paymentMethodIcons[method.method.toLowerCase()] || DollarSign
        
        return (
          <div key={method.method} className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {method.method}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  KES {method.amount.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
              {percentage}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Reports Access Component - Requirements: 5.5
function ReportsAccessList({ reports }: { reports: ReportAccess[] }) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No reports available
        </p>
      </div>
    )
  }

  const reportTypeIcons: Record<string, typeof FileText> = {
    fee_report: FileText,
    payment_summary: Receipt,
    audit_export: Download,
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const Icon = reportTypeIcons[report.type] || FileText
        return (
          <Link
            key={report.id}
            href={report.url}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex-shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {report.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {report.type.replace(/_/g, ' ')}
              </p>
            </div>
            <Download className="h-4 w-4 text-gray-400" />
          </Link>
        )
      })}
    </div>
  )
}


// Loading skeleton for bursar dashboard
function BursarDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLoader key={i} variant="stat" count={1} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonLoader variant="table" count={1} />
        <SkeletonLoader variant="card" count={2} />
      </div>
    </div>
  )
}

export default function BursarDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<BursarDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard/bursar')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Error fetching bursar dashboard:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <BursarDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bursar Dashboard
          </h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchDashboardData }}
        />
      </div>
    )
  }

  if (!data) return null

  const { alerts, financialOverview, reports } = data


  // Combine all alerts into a single array for display - Requirements: 5.2
  const allAlerts = [
    ...alerts.unpaidBalances.slice(0, 3).map((alert) => ({
      id: alert.id,
      type: AlertType.UNPAID_BALANCE,
      severity: alert.daysOverdue > 60 ? AlertSeverity.CRITICAL : 
               alert.daysOverdue > 30 ? AlertSeverity.WARNING : AlertSeverity.INFO,
      message: alert.message,
      actionUrl: `/dashboard/fees/students/${alert.studentId}`,
      actionLabel: 'View Balance',
    })),
    ...alerts.reconciliationIssues.map((alert) => ({
      id: alert.id,
      type: AlertType.RECONCILIATION_ISSUE,
      severity: AlertSeverity.WARNING,
      message: alert.details,
      actionUrl: '/dashboard/fees/reconciliation',
      actionLabel: 'Review',
    })),
    ...alerts.pendingApprovals.map((alert) => ({
      id: alert.id,
      type: AlertType.PENDING_APPROVAL,
      severity: AlertSeverity.INFO,
      message: alert.message,
      actionUrl: '/dashboard/fees/approvals',
      actionLabel: 'Review',
    })),
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Bursar Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Financial overview and management
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Financial Overview Stats - Requirements: 5.4 */}
      <section aria-label="Financial Overview">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Financial Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatsCard
            title="Collections Today"
            value={`KES ${financialOverview.collectionsToday.toLocaleString()}`}
            icon={TrendingUp}
            color="green"
          />
          <StatsCard
            title="Outstanding Fees"
            value={`KES ${financialOverview.outstandingFees.toLocaleString()}`}
            icon={AlertTriangle}
            color={financialOverview.outstandingFees > 0 ? 'red' : 'gray'}
          />
          <StatsCard
            title="Unpaid Accounts"
            value={alerts.unpaidBalances.length}
            subtitle="Students with balances"
            icon={DollarSign}
            color={alerts.unpaidBalances.length > 0 ? 'yellow' : 'gray'}
          />
        </div>
      </section>

      {/* Quick Actions Row - Requirements: 5.3 */}
      <section aria-label="Quick Actions">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bursarQuickActions.map((action) => (
            <QuickActionButton
              key={action.id}
              icon={action.icon}
              label={action.label}
              href={action.href}
              variant={action.variant}
            />
          ))}
        </div>
      </section>


      {/* Financial Alerts Section - Requirements: 5.2 */}
      {allAlerts.length > 0 && (
        <section aria-label="Financial Alerts">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Alerts
          </h2>
          <div className="space-y-3">
            {allAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                type={alert.type}
                severity={alert.severity}
                message={alert.message}
                actionUrl={alert.actionUrl}
                actionLabel={alert.actionLabel}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unpaid Balances Section - Requirements: 5.2 */}
        <section aria-label="Unpaid Balances">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-500" />
                  Unpaid Balances
                </CardTitle>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {alerts.unpaidBalances.length} student{alerts.unpaidBalances.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <UnpaidBalancesTable balances={alerts.unpaidBalances} />
            </CardContent>
          </Card>
        </section>

        {/* Right Column - Payment Methods & Reports */}
        <div className="space-y-6">
          {/* Payment Methods Breakdown - Requirements: 5.4 */}
          <section aria-label="Payment Methods">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  Today&apos;s Collections by Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodsBreakdown methods={financialOverview.paymentMethods} />
              </CardContent>
            </Card>
          </section>

          {/* Reports Access - Requirements: 5.5 */}
          <section aria-label="Reports">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportsAccessList reports={reports} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* 
        Requirements: 5.6 - Bursar Dashboard exclusions
        This dashboard does NOT display:
        - Marks editing features
        - Class changes
        - Attendance modification features
        These are intentionally excluded to maintain role separation
      */}
    </div>
  )
}
