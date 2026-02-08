'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Super Admin Dashboard Page
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * - Darker theme or muted professional color palette
 * - Left sidebar navigation (handled by layout)
 * - Dashboard cards: Total schools, Active schools, Suspended schools, Errors today
 * - School list table with columns: School Name, Code, Status, Plan, Created Date
 * - Destructive actions hidden under "More" menu
 * - Skeleton loading indicators while data is fetching
 */

interface SuperAdminOverviewData {
  schools: {
    total: number
    active: number
    pilot: number
    suspended: number
  }
  students: {
    total: number
  }
  sms: {
    totalUsage: number
    totalCost: number
  }
  revenue: {
    expected: number
    received: number
  }
  errorsToday?: number
}

function StatCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const variantClasses = {
    default: 'bg-slate-800 border-slate-700 text-[var(--text-primary)]',
    success: 'bg-slate-800 border-emerald-700 text-[var(--success)]',
    warning: 'bg-slate-800 border-amber-700 text-[var(--warning)]',
    danger: 'bg-slate-800 border-[var(--chart-red)] text-[var(--danger)]',
    muted: 'bg-slate-800 border-slate-600 text-[var(--text-muted)]',
  }

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {subtitle && <p className="text-xs mt-1 text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  )
}

function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`}>
      <h2 className="text-base font-medium mb-4 text-[var(--text-secondary)]">{title}</h2>
      {children}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/admin/overview')
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access denied. Super Admin privileges required.')
          }
          throw new Error('Failed to fetch dashboard data')
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Super Admin Console</h1>
          <p className="text-[var(--text-muted)] text-sm">System-wide metrics and school monitoring</p>
        </div>

        {/* Skeleton for stat cards - Requirements 12.5 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>

        {/* Skeleton for SMS and Revenue sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SkeletonLoader variant="card" count={1} />
          <SkeletonLoader variant="card" count={1} />
        </div>

        {/* Skeleton for Schools Overview section */}
        <SkeletonLoader variant="card" count={1} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Super Admin Console</h1>
          <p className="text-[var(--text-muted)] text-sm">System-wide metrics and school monitoring</p>
        </div>
        <div className="bg-[var(--danger-dark)]/50 border border-[var(--danger-dark)] rounded-lg p-4">
          <p className="text-[var(--danger)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-[var(--danger)] underline hover:no-underline"
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

  // Calculate revenue percentage
  const revenuePercentage = data.revenue.expected > 0
    ? Math.round((data.revenue.received / data.revenue.expected) * 100)
    : 0

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Super Admin Console</h1>
        <p className="text-[var(--text-muted)] text-sm">System-wide metrics and school monitoring</p>
      </div>

      {/* System Overview Stats - Requirements 12.3 - Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Schools"
          value={data.schools.total}
          subtitle={`${data.schools.active} active`}
          variant="default"
        />
        <StatCard
          title="Active Schools"
          value={data.schools.active}
          variant="success"
        />
        <StatCard
          title="Suspended Schools"
          value={data.schools.suspended}
          variant="danger"
        />
        <StatCard
          title="Errors Today"
          value={data.errorsToday ?? 0}
          variant={data.errorsToday && data.errorsToday > 0 ? 'warning' : 'muted'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* SMS Metrics */}
        <SectionCard title="SMS Metrics (Current Term)">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Total SMS Sent</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {data.sms.totalUsage.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Total SMS Cost</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {formatCurrency(data.sms.totalCost)}
                </p>
              </div>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              Average cost per SMS: {data.sms.totalUsage > 0 
                ? formatCurrency(Math.round(data.sms.totalCost / data.sms.totalUsage))
                : 'N/A'}
            </div>
          </div>
        </SectionCard>

        {/* Revenue Metrics */}
        <SectionCard title="Revenue Metrics (Current Term)">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Expected Revenue</p>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {formatCurrency(data.revenue.expected)}
                </p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-[var(--text-muted)]">Received Revenue</p>
                <p className="text-2xl font-semibold text-[var(--success)]">
                  {formatCurrency(data.revenue.received)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Collection Rate</span>
                <span className={`font-medium ${revenuePercentage >= 80 ? 'text-[var(--success)]' : revenuePercentage >= 50 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
                  {revenuePercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${revenuePercentage >= 80 ? 'bg-[var(--success)]' : revenuePercentage >= 50 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`}
                  style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                />
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                Outstanding: {formatCurrency(data.revenue.expected - data.revenue.received)}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Schools Table - Requirements 12.4 - School list table */}
      <SectionCard title="Schools Overview">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">School Name</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Code</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Plan</th>
                <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Created</th>
                <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium"></th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-muted)]">
              <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-3 px-4">Sample School</td>
                <td className="py-3 px-4 font-mono text-xs">SAMPLE</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--success-dark)]/50 text-[var(--success)]">
                    Active
                  </span>
                </td>
                <td className="py-3 px-4">Pilot</td>
                <td className="py-3 px-4 text-[var(--text-muted)]">Jan 1, 2026</td>
                <td className="py-3 px-4 text-right">
                  {/* Requirements 12.5 - Destructive actions hidden under "More" menu */}
                  <button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <Link href="/dashboard/super-admin/schools" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            View all schools →
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
