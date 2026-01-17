'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  DashboardOverview, 
  MessageChannel, 
  HubAlert, 
  HubAlertSeverity,
  ChannelStats,
  SchoolMessagingStats,
  QuotaUpdate,
  MessageLogFilters
} from '@/types/communication-hub'
import SchoolsTab from './components/schools-tab'
import LogsTab from './components/logs-tab'
import AuditTab from './components/audit-tab'

/**
 * Super Admin Communication Hub Page
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 * - Tabbed interface for Dashboard, Schools, Logs, Queues, Alerts, Templates, Reports, and Audit sections
 * - Dashboard overview as default view with real-time statistics cards
 * - Active alerts with severity-based color coding
 * - Loading indicators and error handling
 */

interface StatsCardProps {
  title: string
  channel: MessageChannel
  stats: ChannelStats
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatsCard({ title, channel, stats, variant = 'default' }: StatsCardProps) {
  const variantClasses = {
    default: 'bg-slate-800 border-slate-700 text-slate-100',
    success: 'bg-slate-800 border-emerald-700 text-emerald-400',
    warning: 'bg-slate-800 border-amber-700 text-amber-400',
    danger: 'bg-slate-800 border-red-700 text-red-400',
  }

  const getChannelIcon = (channel: MessageChannel) => {
    switch (channel) {
      case MessageChannel.SMS:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case MessageChannel.WHATSAPP:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700"/>
          </svg>
        )
      case MessageChannel.EMAIL:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {getChannelIcon(channel)}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Today</span>
          <span className="text-lg font-semibold">{stats.sentToday.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">This Month</span>
          <span className="text-lg font-semibold">{stats.sentThisMonth.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Failed Today</span>
          <span className={`text-sm font-medium ${stats.failedToday > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {stats.failedToday.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Delivery Rate</span>
          <span className={`text-sm font-medium ${
            stats.deliveryRate >= 95 ? 'text-emerald-400' : 
            stats.deliveryRate >= 85 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {stats.deliveryRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

interface AlertCardProps {
  alert: HubAlert
  onAcknowledge: (id: string) => void
  onDismiss: (id: string) => void
}

function AlertCard({ alert, onAcknowledge, onDismiss }: AlertCardProps) {
  const getSeverityColor = (severity: HubAlertSeverity) => {
    switch (severity) {
      case HubAlertSeverity.CRITICAL:
        return 'border-red-700 bg-red-950/50 text-red-400'
      case HubAlertSeverity.WARNING:
        return 'border-amber-700 bg-amber-950/50 text-amber-400'
      case HubAlertSeverity.INFO:
        return 'border-blue-700 bg-blue-950/50 text-blue-400'
      default:
        return 'border-slate-700 bg-slate-800 text-slate-400'
    }
  }

  const getSeverityIcon = (severity: HubAlertSeverity) => {
    switch (severity) {
      case HubAlertSeverity.CRITICAL:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case HubAlertSeverity.WARNING:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case HubAlertSeverity.INFO:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          {getSeverityIcon(alert.severity)}
          <div className="flex-1">
            <h4 className="text-sm font-medium">{alert.title}</h4>
            <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
            {alert.schoolName && (
              <p className="text-xs text-slate-500 mt-1">School: {alert.schoolName}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {new Date(alert.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            Ack
          </button>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardTab({ 
  overview, 
  onRefresh, 
  refreshInterval 
}: { 
  overview: DashboardOverview
  onRefresh: () => void
  refreshInterval: number
}) {
  useEffect(() => {
    const interval = setInterval(onRefresh, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [onRefresh, refreshInterval])

  return (
    <div className="space-y-6">
      {/* Overview Statistics Cards - Requirements 10.4 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="SMS Messages"
          channel={MessageChannel.SMS}
          stats={overview.sms}
          variant={overview.sms.failedToday > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="WhatsApp Messages"
          channel={MessageChannel.WHATSAPP}
          stats={overview.whatsapp}
          variant={overview.whatsapp.failedToday > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Email Messages"
          channel={MessageChannel.EMAIL}
          stats={overview.email}
          variant={overview.email.failedToday > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-100">
              {overview.pendingInQueue.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Messages pending</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${
              overview.deliveryFailureRate < 5 ? 'text-emerald-400' : 
              overview.deliveryFailureRate < 15 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {(100 - overview.deliveryFailureRate).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overview.deliveryFailureRate.toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-400">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${
              overview.bounceRate < 2 ? 'text-emerald-400' : 
              overview.bounceRate < 5 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {overview.bounceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Email bounces</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts Section - Requirements 10.5 */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-200">
              Active Alerts ({overview.alerts.length})
            </CardTitle>
            <button
              onClick={onRefresh}
              className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
            >
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {overview.alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-emerald-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">No active alerts</p>
              <p className="text-slate-500 text-xs mt-1">All systems operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => {
                    // TODO: Implement acknowledge functionality
                    console.log('Acknowledge alert:', id)
                  }}
                  onDismiss={(id) => {
                    // TODO: Implement dismiss functionality
                    console.log('Dismiss alert:', id)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-xs text-slate-500">
          Last updated: {new Date(overview.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default function CommunicationHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [schools, setSchools] = useState<SchoolMessagingStats[]>([])
  const [logFilters, setLogFilters] = useState<MessageLogFilters>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval] = useState(30) // 30 seconds

  const fetchOverview = async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/communication-hub/overview')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch communication hub data')
      }
      
      const data = await response.json()
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/admin/communication-hub/schools')
      if (response.ok) {
        const data = await response.json()
        setSchools(data)
      }
    } catch (err) {
      console.error('Failed to fetch schools:', err)
    }
  }

  const handlePauseSchool = async (schoolId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/communication-hub/schools/${schoolId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      if (response.ok) {
        fetchSchools() // Refresh schools data
      }
    } catch (err) {
      console.error('Failed to pause school:', err)
    }
  }

  const handleResumeSchool = async (schoolId: string) => {
    try {
      const response = await fetch(`/api/admin/communication-hub/schools/${schoolId}/resume`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchSchools() // Refresh schools data
      }
    } catch (err) {
      console.error('Failed to resume school:', err)
    }
  }

  const handleUpdateQuota = async (schoolId: string, quotas: QuotaUpdate) => {
    try {
      const response = await fetch(`/api/admin/communication-hub/schools/${schoolId}/quotas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotas)
      })
      if (response.ok) {
        fetchSchools() // Refresh schools data
      }
    } catch (err) {
      console.error('Failed to update quotas:', err)
    }
  }

  const handleAddCredits = async (schoolId: string, channel: MessageChannel, amount: number) => {
    try {
      const response = await fetch(`/api/admin/communication-hub/schools/${schoolId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, amount })
      })
      if (response.ok) {
        fetchSchools() // Refresh schools data
      }
    } catch (err) {
      console.error('Failed to add credits:', err)
    }
  }

  const handleSetEmergencyOverride = async (schoolId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/communication-hub/schools/${schoolId}/emergency-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      if (response.ok) {
        fetchSchools() // Refresh schools data
      }
    } catch (err) {
      console.error('Failed to set emergency override:', err)
    }
  }

  const handleLogFilterChange = (filters: MessageLogFilters) => {
    setLogFilters(filters)
  }

  const handleLogSearch = (query: string) => {
    setLogFilters(prev => ({ ...prev, searchQuery: query }))
  }

  const handleLogExport = () => {
    // Export functionality is handled within the LogsTab component
    console.log('Exporting logs with filters:', logFilters)
  }

  useEffect(() => {
    fetchOverview()
    fetchSchools()
  }, [])

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-100">Communication Hub</h1>
          <p className="text-slate-400 text-sm">Monitor and manage all messaging operations</p>
        </div>

        {/* Skeleton for stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>

        {/* Skeleton for system health cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>

        {/* Skeleton for alerts section */}
        <SkeletonLoader variant="card" count={1} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-100">Communication Hub</h1>
          <p className="text-slate-400 text-sm">Monitor and manage all messaging operations</p>
        </div>
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchOverview}
            className="mt-2 text-sm text-red-400 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!overview) {
    return null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Communication Hub</h1>
        <p className="text-slate-400 text-sm">Monitor and manage all messaging operations</p>
      </div>

      {/* Tabbed Interface - Requirements 10.2 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-slate-800 border-slate-700">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="schools" className="text-xs">Schools</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          <TabsTrigger value="queues" className="text-xs">Queues</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - Requirements 10.3 */}
        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab
            overview={overview}
            onRefresh={fetchOverview}
            refreshInterval={refreshInterval}
          />
        </TabsContent>

        {/* Placeholder tabs for other sections */}
        <TabsContent value="schools" className="mt-6">
          <SchoolsTab
            schools={schools}
            onPause={handlePauseSchool}
            onResume={handleResumeSchool}
            onUpdateQuota={handleUpdateQuota}
            onAddCredits={handleAddCredits}
            onSetEmergencyOverride={handleSetEmergencyOverride}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogsTab
            filters={logFilters}
            onFilterChange={handleLogFilterChange}
            onExport={handleLogExport}
            onSearch={handleLogSearch}
          />
        </TabsContent>

        <TabsContent value="queues" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Queue Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Queue monitoring interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Alert Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Alert management interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Template Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Template management interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Reports and analytics interface will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditTab
            onExport={(filters) => {
              console.log('Exporting audit logs with filters:', filters)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}