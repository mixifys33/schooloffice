'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  ChevronLeft,
  X
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

interface Payment {
  id: string
  studentId: string
  studentName: string
  className: string
  stream: string | null
  amount: number
  paymentDate: string
  method: 'cash' | 'bank' | 'mobile_money'
  receiptNumber: string
  recordedBy: string
}

interface PaymentSummary {
  totalPayments: number
  totalAmount: number
  cashPayments: number
  bankPayments: number
  mobileMoneyPayments: number
}

// ============================================
// COMPONENTS
// ============================================

interface PaymentTableProps {
  payments: Payment[]
  onPaymentClick: (payment: Payment) => void
}

function PaymentTable({ payments, onPaymentClick }: PaymentTableProps) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Payment Records</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search payments..."
              className="max-w-xs"
            />
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Student
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Class
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Amount
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Method
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Date
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Receipt
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Recorded By
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr 
                  key={payment.id} 
                  className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] cursor-pointer"
                  onClick={() => onPaymentClick(payment)}
                >
                  <td className="py-3 px-4 font-medium">
                    {payment.studentName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {payment.className} {payment.stream ? `(${payment.stream})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--success)] font-medium">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">
                      {payment.method.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">
                      {payment.receiptNumber}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {payment.recordedBy}
                  </td>
                  <td className="py-3 px-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
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

export default function PaymentTrackingPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('this-month')

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bursar/payments')
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment data')
        }

        const data = await response.json()
        
        setPayments(data.payments)
        setSummary(data.summary)
      } catch (err) {
        console.error('Error fetching payment data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch payment data')
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentData()
  }, [])

  const handlePaymentClick = (payment: Payment) => {
    // Navigate to payment details page
    console.log('Payment clicked:', payment)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Payment Tracking
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

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Payment Tracking
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load payment data"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Payment Tracking
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Track all student payments and financial transactions
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/bursar/students')}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Top Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedMethod} onValueChange={setSelectedMethod}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-term">This Term</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Summary Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Payments"
          value={String(summary.totalPayments)}
          subtitle="Transactions"
          color="blue"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(summary.totalAmount)}
          subtitle="Collected"
          color="green"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Cash Payments"
          value={String(summary.cashPayments)}
          subtitle="Cash transactions"
          color="yellow"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Digital Payments"
          value={String(summary.bankPayments + summary.mobileMoneyPayments)}
          subtitle="Bank/Mobile"
          color="purple"
          icon={<CreditCard className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Payment Table */}
      <PaymentTable 
        payments={payments} 
        onPaymentClick={handlePaymentClick}
      />
    </div>
  )
}