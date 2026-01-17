'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { RefreshCw, History } from 'lucide-react'

/**
 * Super Admin Subscriptions Page
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 * - Display schools with term subscription amount, amount per student, total bill, payment history, outstanding balance
 * - Check payment status for each school at term start
 * - Disable SMS and report features for unpaid schools
 * - Set school status to Suspended when grace period expires
 * - Record payment and restore school features
 * - Display all transactions with date, amount, payment method
 */

interface SubscriptionData {
  id: string
  schoolId: string
  schoolName: string
  schoolCode: string
  termId: string
  termName: string
  studentCount: number
  amountPerStudent: number
  totalBill: number
  amountPaid: number
  outstandingBalance: number
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'GRACE_PERIOD' | 'SUSPENDED'
  dueDate: string
  gracePeriodEnds?: string
  isActive: boolean
  licenseType: string
}

interface PaymentCheckResult {
  totalChecked: number
  overdueSchools: number
  gracePeriodSchools: number
  suspendedSchools: number
  lastChecked: string
}

interface PaymentHistoryItem {
  id: string
  schoolId: string
  schoolName: string
  amount: number
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK'
  reference: string
  recordedBy: string
  recordedAt: string
}

interface PaymentModalProps {
  school: SubscriptionData | null
  onClose: () => void
  onSubmit: (data: PaymentFormData) => Promise<void>
  isSubmitting: boolean
}

interface PaymentFormData {
  schoolId: string
  amount: number
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK'
  reference: string
}

function PaymentModal({ school, onClose, onSubmit, isSubmitting }: PaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK'>('MOBILE_MONEY')
  const [reference, setReference] = useState('')

  if (!school) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      schoolId: school.schoolId,
      amount: parseFloat(amount),
      method,
      reference
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Record Payment</h2>
        <p className="text-gray-600 mb-4">
          Recording payment for <span className="font-semibold">{school.schoolName}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outstanding Balance
            </label>
            <p className="text-lg font-bold text-red-600">
              UGX {school.outstandingBalance.toLocaleString()}
            </p>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (UGX)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
              required
              min="1"
            />
          </div>

          <div>
            <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'CASH' | 'MOBILE_MONEY' | 'BANK')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK">Bank Transfer</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Transaction reference"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SubscriptionStatusBadge({ status }: { status: SubscriptionData['status'] }) {
  const statusConfig = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
    GRACE_PERIOD: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Grace Period' },
    SUSPENDED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Suspended' },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSchool, setSelectedSchool] = useState<SubscriptionData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'overdue' | 'grace' | 'suspended'>('all')
  const [isCheckingPayments, setIsCheckingPayments] = useState(false)
  const [paymentCheckResult, setPaymentCheckResult] = useState<PaymentCheckResult | null>(null)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isRunningEnforcement, setIsRunningEnforcement] = useState(false)
  const { toast, showToast, hideToast } = useLocalToast()

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/subscriptions')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch subscriptions data')
      }
      
      const result = await response.json()
      setSubscriptions(result.subscriptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Check payment status for all schools
   * Requirement 14.2: Check payment status for each school at term start
   */
  const handleCheckPaymentStatus = async () => {
    try {
      setIsCheckingPayments(true)
      const response = await fetch('/api/admin/subscriptions/check', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to check payment statuses')
      }

      const result = await response.json()
      setPaymentCheckResult({
        totalChecked: result.details.totalChecked,
        overdueSchools: result.details.overdueSchools,
        gracePeriodSchools: result.details.gracePeriodSchools,
        suspendedSchools: result.details.suspendedSchools,
        lastChecked: new Date().toISOString()
      })
      
      showToast('success', `Payment status checked for ${result.details.totalChecked} schools`)
      
      // Refresh subscriptions to show updated statuses
      await fetchSubscriptions()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to check payment statuses')
    } finally {
      setIsCheckingPayments(false)
    }
  }

  /**
   * Fetch payment history for all schools
   * Requirement 14.6: Display all transactions with date, amount, payment method
   */
  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await fetch('/api/admin/payments')
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history')
      }
      
      const result = await response.json()
      setPaymentHistory(result.payments || [])
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to fetch payment history')
    } finally {
      setLoadingHistory(false)
    }
  }

  /**
   * Run enforcement to suspend schools past grace period
   * Requirement 14.4: Set school status to Suspended when grace period expires
   */
  const handleRunEnforcement = async () => {
    try {
      setIsRunningEnforcement(true)
      const response = await fetch('/api/admin/enforcement', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to run enforcement')
      }

      const result = await response.json()
      showToast('success', result.message)
      
      // Refresh subscriptions to show updated statuses
      await fetchSubscriptions()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to run enforcement')
    } finally {
      setIsRunningEnforcement(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const handleRecordPayment = async (data: PaymentFormData) => {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to record payment')
      }

      showToast('success', 'Payment recorded successfully. School features restored.')
      setSelectedSchool(null)
      fetchSubscriptions()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (filter === 'all') return true
    if (filter === 'overdue') return sub.status === 'OVERDUE'
    if (filter === 'grace') return sub.status === 'GRACE_PERIOD'
    if (filter === 'suspended') return sub.status === 'SUSPENDED'
    return true
  })

  // Calculate summary stats
  const stats = {
    total: subscriptions.length,
    paid: subscriptions.filter(s => s.status === 'PAID').length,
    overdue: subscriptions.filter(s => s.status === 'OVERDUE').length,
    gracePeriod: subscriptions.filter(s => s.status === 'GRACE_PERIOD').length,
    suspended: subscriptions.filter(s => s.status === 'SUSPENDED').length,
    totalExpected: subscriptions.reduce((sum, s) => sum + s.totalBill, 0),
    totalReceived: subscriptions.reduce((sum, s) => sum + s.amountPaid, 0),
    totalOutstanding: subscriptions.reduce((sum, s) => sum + s.outstandingBalance, 0),
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions & Payments</h1>
          <p className="text-gray-600">Manage school subscriptions and payment enforcement</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions & Payments</h1>
          <p className="text-gray-600">Manage school subscriptions and payment enforcement</p>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Try Again', onClick: fetchSubscriptions }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions & Payments</h1>
          <p className="text-gray-600">Manage school subscriptions and payment enforcement</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Requirement 14.4: Run enforcement button */}
          <button
            onClick={handleRunEnforcement}
            disabled={isRunningEnforcement}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isRunningEnforcement ? 'Running...' : 'Run Enforcement'}
          </button>
          {/* Requirement 14.2: Check payment status button */}
          <button
            onClick={handleCheckPaymentStatus}
            disabled={isCheckingPayments}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isCheckingPayments ? 'animate-spin' : ''}`} />
            {isCheckingPayments ? 'Checking...' : 'Check Payment Status'}
          </button>
          {/* Requirement 14.6: Payment history button */}
          <button
            onClick={() => {
              setShowPaymentHistory(true)
              fetchPaymentHistory()
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <History className="h-4 w-4" />
            Payment History
          </button>
        </div>
      </div>

      {/* Payment Check Result Banner */}
      {paymentCheckResult && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Last Payment Check</p>
              <p className="text-sm text-blue-700">
                Checked {paymentCheckResult.totalChecked} schools • 
                {paymentCheckResult.overdueSchools} overdue • 
                {paymentCheckResult.gracePeriodSchools} in grace period • 
                {paymentCheckResult.suspendedSchools} suspended
              </p>
            </div>
            <p className="text-xs text-blue-600">
              {formatDate(paymentCheckResult.lastChecked)}
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600">Total Schools</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Paid</p>
          <p className="text-2xl font-bold text-green-700">{stats.paid}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-600">Grace Period</p>
          <p className="text-2xl font-bold text-orange-700">{stats.gracePeriod}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Suspended</p>
          <p className="text-2xl font-bold text-red-700">{stats.suspended}</p>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-3">Revenue Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Expected Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalExpected)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Received</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalReceived)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'grace', label: 'Grace Period' },
          { key: 'suspended', label: 'Suspended' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bill</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{sub.schoolName}</p>
                      <p className="text-sm text-gray-500">{sub.schoolCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{sub.studentCount}</td>
                  <td className="px-4 py-3 text-gray-900">{formatCurrency(sub.amountPerStudent)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(sub.totalBill)}</td>
                  <td className="px-4 py-3 text-green-600">{formatCurrency(sub.amountPaid)}</td>
                  <td className="px-4 py-3 font-medium text-red-600">{formatCurrency(sub.outstandingBalance)}</td>
                  <td className="px-4 py-3 text-gray-900">{formatDate(sub.dueDate)}</td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={sub.status} />
                  </td>
                  <td className="px-4 py-3">
                    {sub.licenseType !== 'FREE_PILOT' && sub.outstandingBalance > 0 && (
                      <button
                        onClick={() => setSelectedSchool(sub)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Record Payment
                      </button>
                    )}
                    {sub.licenseType === 'FREE_PILOT' && (
                      <span className="text-sm text-gray-500">Pilot</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No subscriptions found matching the selected filter.
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        school={selectedSchool}
        onClose={() => setSelectedSchool(null)}
        onSubmit={handleRecordPayment}
        isSubmitting={isSubmitting}
      />

      {/* Payment History Modal - Requirement 14.6 */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Payment History</h2>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payment history found
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{formatDate(payment.recordedAt)}</td>
                        <td className="px-4 py-3 text-gray-900">{payment.schoolName}</td>
                        <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {payment.method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{payment.reference}</td>
                        <td className="px-4 py-3 text-gray-600">{payment.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={hideToast}
          />
        </div>
      )}
    </div>
  )
}
