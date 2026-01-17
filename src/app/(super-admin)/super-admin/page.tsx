'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Users, MessageSquare, DollarSign, AlertTriangle, TrendingUp, Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardData {
  schools: { total: number; active: number; pilot: number; suspended: number }
  students: { total: number }
  sms: { totalUsage: number; totalCost: number }
  revenue: { expected: number; received: number }
  errorsToday: number
}

function StatCard({ title, value, subtitle, icon, variant = 'default' }: {
  title: string; value: string | number; subtitle?: string; icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variants = {
    default: 'border-slate-700',
    success: 'border-emerald-700',
    warning: 'border-amber-700',
    danger: 'border-red-700',
  }
  const textVariants = {
    default: 'text-slate-100',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  }
  return (
    <div className={`bg-slate-800/50 rounded-xl border ${variants[variant]} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${textVariants[variant]}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 bg-slate-700/50 rounded-lg">{icon}</div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/overview')
      if (!response.ok) {
        if (response.status === 403) throw new Error('Access denied. Super Admin privileges required.')
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

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const revenuePercent = data.revenue.expected > 0 ? Math.round((data.revenue.received / data.revenue.expected) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">System-wide metrics and monitoring</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="text-slate-300">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Schools" value={data.schools.total} subtitle={`${data.schools.active} active`} 
          icon={<Building2 className="h-5 w-5 text-slate-400" />} />
        <StatCard title="Active Schools" value={data.schools.active} variant="success"
          icon={<Activity className="h-5 w-5 text-emerald-400" />} />
        <StatCard title="Total Students" value={data.students.total.toLocaleString()}
          icon={<Users className="h-5 w-5 text-slate-400" />} />
        <StatCard title="Errors Today" value={data.errorsToday} 
          variant={data.errorsToday > 0 ? 'danger' : 'default'}
          icon={<AlertTriangle className="h-5 w-5 text-slate-400" />} />
      </div>

      {/* SMS & Revenue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Metrics */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">SMS Metrics</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Total Sent</p>
              <p className="text-2xl font-bold text-white">{data.sms.totalUsage.toLocaleString()}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Total Cost</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(data.sms.totalCost)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Avg cost: {data.sms.totalUsage > 0 ? formatCurrency(Math.round(data.sms.totalCost / data.sms.totalUsage)) : 'N/A'}
          </p>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Revenue</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Expected</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(data.revenue.expected)}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Received</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(data.revenue.received)}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Collection Rate</span>
              <span className={revenuePercent >= 80 ? 'text-emerald-400' : revenuePercent >= 50 ? 'text-amber-400' : 'text-red-400'}>
                {revenuePercent}%
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className={`h-2 rounded-full ${revenuePercent >= 80 ? 'bg-emerald-500' : revenuePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(revenuePercent, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/super-admin/schools/new" className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
            <Building2 className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-slate-200">Add School</span>
          </Link>
          <Link href="/super-admin/schools" className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-slate-200">Manage Schools</span>
          </Link>
          <Link href="/super-admin/sms-monitoring" className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-slate-200">SMS Monitor</span>
          </Link>
          <Link href="/super-admin/audit" className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
            <Activity className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-slate-200">Audit Logs</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
