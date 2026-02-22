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
  ChevronLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

interface Student {
  id: string
  name: string
  classId: string
  className: string
  stream: string | null
  status: 'active' | 'transferred' | 'left'
  totalDue: number
  totalPaid: number
  balance: number
  lastPaymentDate: string | null
  paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid'
}

interface Payment {
  id: string
  studentId: string
  amount: number
  paymentDate: string
  method: 'cash' | 'bank' | 'mobile_money'
  receiptNumber: string
  recordedBy: string
}

interface FeeBreakdown {
  tuition: number
  development: number
  meals: number
  boarding: number
  optional: Array<{ name: string; amount: number; paid: number }>
}

// ============================================
// COMPONENTS
// ============================================

interface PaymentHistoryTableProps {
  payments: Payment[]
}

function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
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
        <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Date
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Amount
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Method
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Receipt
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Recorded By
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <td className="py-3 px-4">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-[var(--success)] font-medium">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">
                      {payment.method.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">
                      {payment.receiptNumber}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {payment.recordedBy}
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

interface FeeBreakdownCardProps {
  breakdown: FeeBreakdown
}

function FeeBreakdownCard({ breakdown }: FeeBreakdownCardProps) {
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
        <CardTitle className="text-lg font-semibold">Fee Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Tuition</span>
            <span className="font-medium">{formatCurrency(breakdown.tuition)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Development</span>
            <span className="font-medium">{formatCurrency(breakdown.development)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Meals</span>
            <span className="font-medium">{formatCurrency(breakdown.meals)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Boarding</span>
            <span className="font-medium">{formatCurrency(breakdown.boarding)}</span>
          </div>
          
          {breakdown.optional.length > 0 && (
            <div className="pt-3 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
              <h4 className="font-medium mb-2">Optional Items</h4>
              {breakdown.optional.map((item, index) => (
                <div key={index} className="flex justify-between items-center ml-2">
                  <span>{item.name}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-3 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] flex justify-between items-center font-bold">
            <span>Total</span>
            <span>
              {formatCurrency(
                breakdown.tuition + 
                breakdown.development + 
                breakdown.meals + 
                breakdown.boarding +
                breakdown.optional.reduce((sum, item) => sum + item.amount, 0)
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StudentFeesPage({ params }: { params: Promise<{ id: string }> }) {
  const [student, setStudent] = useState<Student | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Payment form state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('CASH')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  // Unwrap params Promise
  const unwrappedParams = React.use(params)

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/bursar/student-fees/${unwrappedParams.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch student data')
        }

        const data = await response.json()
        
        setStudent(data.student)
        setPayments(data.payments)
        setFeeBreakdown(data.feeBreakdown)
      } catch (err) {
        console.error('Error fetching student data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch student data')
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [unwrappedParams.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleRecordPayment = async () => {
    if (!paymentAmount || !receiptNumber) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch('/api/bursar/payments/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: unwrappedParams.id,
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
          reference: receiptNumber,
          receivedAt: new Date(paymentDate).toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record payment')
      }

      // Refresh student data
      const studentResponse = await fetch(`/api/bursar/student-fees/${unwrappedParams.id}`)
      if (studentResponse.ok) {
        const data = await studentResponse.json()
        setStudent(data.student)
        setPayments(data.payments)
        setFeeBreakdown(data.feeBreakdown)
      }

      // Reset form
      setPaymentAmount('')
      setReceiptNumber('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setShowPaymentModal(false)
      
      alert('Payment recorded successfully!')
    } catch (err) {
      console.error('Error recording payment:', err)
      alert(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Student Fees
          </h1>
        </div>

        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>

        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Student Fees
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load student data"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Go back to dashboard']}
        />
      </div>
    )
  }

  if (!student || !feeBreakdown) {
    return null
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
              {student.name}
            </h1>
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              {student.className} {student.stream ? `(${student.stream})` : ''} - {student.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Send Reminder
          </Button>
        </div>
      </div>

      {/* Student Financial Summary */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Due"
          value={formatCurrency(student.totalDue)}
          subtitle="Obligation"
          color="blue"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(student.totalPaid)}
          subtitle="Received"
          color="green"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Balance"
          value={formatCurrency(student.balance)}
          subtitle="Outstanding"
          color={student.balance > 0 ? "red" : "green"}
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Status"
          value={student.paymentStatus === 'fully_paid' ? 'Cleared' : 
                 student.paymentStatus === 'partially_paid' ? 'Partial' : 'Not Paid'}
          subtitle="Payment Status"
          color={student.paymentStatus === 'fully_paid' ? "green" : 
                 student.paymentStatus === 'partially_paid' ? "yellow" : "red"}
          icon={student.paymentStatus === 'fully_paid' ? 
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" /> : 
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Fee Breakdown and Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <FeeBreakdownCard breakdown={feeBreakdown} />
        <PaymentHistoryTable payments={payments} />
      </div>

      {/* Payment Recording Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Record New Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <Input 
                type="number" 
                placeholder="Enter payment amount" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Method</label>
              <select 
                className="w-full p-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY')}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Number</label>
              <Input 
                placeholder="Enter receipt number" 
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date</label>
              <Input 
                type="date" 
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleRecordPayment} disabled={submitting}>
              <Receipt className="h-4 w-4 mr-2" />
              {submitting ? 'Saving...' : 'Save Payment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}