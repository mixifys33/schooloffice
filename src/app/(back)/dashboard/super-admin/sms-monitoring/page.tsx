'use client'

import React, { useEffect, useState } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Toast, useToast } from '@/hooks/use-toast'

/**
 * Super Admin SMS Monitoring Page
 * Requirements: 16.1, 16.2, 16.3, 16.4
 * - Display SMS sent per school, cost per school, total platform SMS balance
 * - Flag schools with usage exceeding 2x average
 * - Set daily SMS limit for flagged schools
 * - Add SMS credits to school balance
 */

interface SchoolSMSUsage {
  schoolId: string
  schoolName: string
  schoolCode: string
  licenseType: string
  isActive: boolean
  smsSent: number
  smsCost: number
  smsBalance: number
  dailyLimit: number | null
  isAbnormal: boolean
  abnormalReason?: string
}

interface SMSMonitoringData {
  summary: {
    totalPlatformSMSBalance: number
    totalSMSSent: number
    totalSMSCost: number
    averageSMSPerSchool: number
    schoolsWithAbnormalUsage: number
  }
  schools: SchoolSMSUsage[]
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function StatCard({
  title,
  value,
  subtitle,
  color = 'blue',
}: {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
}) {
  const colorClasses = {
    blue: 'bg-[var(--info-light)] border-[var(--info-light)] text-[var(--accent-hover)]',
    green: 'bg-[var(--success-light)] border-[var(--success-light)] text-[var(--chart-green)]',
    yellow: 'bg-[var(--warning-light)] border-[var(--warning-light)] text-[var(--warning)]',
    red: 'bg-[var(--danger-light)] border-[var(--danger-light)] text-[var(--chart-red)]',
    purple: 'bg-[var(--info-light)] border-[var(--info-light)] text-[var(--chart-purple)]',
    gray: 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]',
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
    </div>
  )
}

function ThrottleModal({
  school,
  onClose,
  onSubmit,
}: {
  school: SchoolSMSUsage
  onClose: () => void
  onSubmit: (schoolId: string, dailyLimit: number) => Promise<void>
}) {
  const [dailyLimit, setDailyLimit] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(school.schoolId, parseInt(dailyLimit) || 0)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-main)] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Set Daily SMS Limit</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Set a daily SMS limit for <strong>{school.schoolName}</strong> to control usage.
          Set to 0 to remove the limit.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Daily SMS Limit
            </label>
            <input
              type="number"
              min="0"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder="Enter daily limit (0 to remove)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Set Limit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddCreditsModal({
  school,
  onClose,
  onSubmit,
}: {
  school: SchoolSMSUsage
  onClose: () => void
  onSubmit: (schoolId: string, amount: number, reason: string) => Promise<void>
}) {
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseInt(amount) <= 0) return
    setLoading(true)
    try {
      await onSubmit(school.schoolId, parseInt(amount), reason)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-main)] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Add SMS Credits</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Add SMS credits to <strong>{school.schoolName}</strong>.
          Current balance: {formatCurrency(school.smsBalance)}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Amount (UGX)
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder="Enter amount in UGX"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder="e.g., Monthly top-up, Promotional credits"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--chart-green)] text-[var(--white-pure)] rounded-md hover:bg-[var(--chart-green)] disabled:opacity-50"
              disabled={loading || !amount || parseInt(amount) <= 0}
            >
              {loading ? 'Adding...' : 'Add Credits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


export default function SMSMonitoringPage() {
  const [data, setData] = useState<SMSMonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAbnormal, setFilterAbnormal] = useState(false)
  const [throttleModal, setThrottleModal] = useState<SchoolSMSUsage | null>(null)
  const [creditsModal, setCreditsModal] = useState<SchoolSMSUsage | null>(null)
  const { toast, showToast, hideToast } = useToast()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/sms-monitoring')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch SMS monitoring data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSetSmsLimit = async (schoolId: string, dailyLimit: number) => {
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}/sms-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit }),
      })

      if (!response.ok) {
        throw new Error('Failed to set SMS limit')
      }

      showToast(
        dailyLimit > 0 
          ? `Daily SMS limit set to ${dailyLimit}` 
          : 'SMS throttling removed',
        'success'
      )
      fetchData() // Refresh data
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set SMS limit', 'error')
    }
  }

  const handleAddCredits = async (schoolId: string, amount: number, reason: string) => {
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}/sms-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason }),
      })

      if (!response.ok) {
        throw new Error('Failed to add SMS credits')
      }

      showToast(`Added ${formatCurrency(amount)} SMS credits`, 'success')
      fetchData() // Refresh data
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add SMS credits', 'error')
    }
  }

  // Filter schools based on search and abnormal filter
  const filteredSchools = data?.schools.filter(school => {
    const matchesSearch = 
      school.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.schoolCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAbnormal = !filterAbnormal || school.isAbnormal
    return matchesSearch && matchesAbnormal
  }) || []

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SMS Monitoring</h1>
          <p className="text-[var(--text-secondary)]">Monitor SMS usage across all schools</p>
        </div>

        {/* Skeleton for stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>

        {/* Skeleton for table */}
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SMS Monitoring</h1>
          <p className="text-[var(--text-secondary)]">Monitor SMS usage across all schools</p>
        </div>
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4">
          <p className="text-[var(--chart-red)]">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 text-sm text-[var(--chart-red)] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">SMS Monitoring</h1>
        <p className="text-[var(--text-secondary)]">Monitor SMS usage across all schools</p>
      </div>

      {/* Summary Stats - Requirement 16.1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Platform SMS Balance"
          value={formatCurrency(data.summary.totalPlatformSMSBalance)}
          color="green"
        />
        <StatCard
          title="Total SMS Sent"
          value={data.summary.totalSMSSent.toLocaleString()}
          color="blue"
        />
        <StatCard
          title="Total SMS Cost"
          value={formatCurrency(data.summary.totalSMSCost)}
          color="purple"
        />
        <StatCard
          title="Avg SMS/School"
          value={data.summary.averageSMSPerSchool}
          color="gray"
        />
        <StatCard
          title="Abnormal Usage"
          value={data.summary.schoolsWithAbnormalUsage}
          subtitle="Schools flagged"
          color={data.summary.schoolsWithAbnormalUsage > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by school name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterAbnormal}
                onChange={(e) => setFilterAbnormal(e.target.checked)}
                className="w-4 h-4 text-[var(--chart-red)] border-[var(--border-default)] rounded focus:ring-[var(--danger)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Show only abnormal usage</span>
            </label>
          </div>
        </div>
      </div>

      {/* Schools Table - Requirements 16.1, 16.2 */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-surface)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  SMS Sent
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  SMS Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchools.map((school) => (
                <tr 
                  key={school.schoolId} 
                  className={school.isAbnormal ? 'bg-[var(--danger-light)]' : 'hover:bg-[var(--bg-surface)]'}
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{school.schoolName}</p>
                      <p className="text-sm text-[var(--text-muted)]">{school.schoolCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        school.isActive 
                          ? 'bg-[var(--success-light)] text-[var(--success-dark)]' 
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                      }`}>
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        school.licenseType === 'FREE_PILOT'
                          ? 'bg-[var(--warning-light)] text-[var(--warning-dark)]'
                          : school.licenseType === 'PREMIUM'
                          ? 'bg-[var(--info-light)] text-[var(--info-dark)]'
                          : 'bg-[var(--info-light)] text-[var(--info-dark)]'
                      }`}>
                        {school.licenseType.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium">{school.smsSent.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium">{formatCurrency(school.smsCost)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-medium ${
                      school.smsBalance < 10000 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-green)]'
                    }`}>
                      {formatCurrency(school.smsBalance)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {school.isAbnormal ? (
                      <div className="flex flex-col items-center">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-[var(--danger-light)] text-[var(--danger-dark)]">
                          Abnormal
                        </span>
                        <span className="text-xs text-[var(--chart-red)] mt-1" title={school.abnormalReason}>
                          2x+ avg
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-[var(--success-light)] text-[var(--success-dark)]">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2">
                      {/* Throttle Button - Requirement 16.3 */}
                      <button
                        onClick={() => setThrottleModal(school)}
                        className={`px-3 py-1 text-xs font-medium rounded ${
                          school.isAbnormal
                            ? 'bg-[var(--chart-red)] text-[var(--white-pure)] hover:bg-[var(--chart-red)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                        }`}
                        title="Set daily SMS limit"
                      >
                        Throttle
                      </button>
                      {/* Add Credits Button - Requirement 16.4 */}
                      <button
                        onClick={() => setCreditsModal(school)}
                        className="px-3 py-1 text-xs font-medium rounded bg-[var(--success-light)] text-[var(--chart-green)] hover:bg-[var(--success)]"
                        title="Add SMS credits"
                      >
                        + Credits
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSchools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No schools found matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {throttleModal && (
        <ThrottleModal
          school={throttleModal}
          onClose={() => setThrottleModal(null)}
          onSubmit={handleSetSmsLimit}
        />
      )}
      {creditsModal && (
        <AddCreditsModal
          school={creditsModal}
          onClose={() => setCreditsModal(null)}
          onSubmit={handleAddCredits}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
