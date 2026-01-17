'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  AuditLog,
  AuditFilters,
  HubAuditActionType
} from '@/types/communication-hub'

/**
 * Audit Tab Component
 * Requirements: 9.5-9.7, 10.18
 * - Filterable audit log table
 * - Export functionality
 */

interface AuditTabProps {
  onExport: (filters: AuditFilters) => void
}

function ActionTypeBadge({ action }: { action: HubAuditActionType }) {
  const colors: Record<string, string> = {
    PAUSE_SCHOOL_MESSAGING: 'bg-amber-900/50 text-amber-400',
    RESUME_SCHOOL_MESSAGING: 'bg-emerald-900/50 text-emerald-400',
    UPDATE_QUOTA: 'bg-blue-900/50 text-blue-400',
    ADD_CREDITS: 'bg-green-900/50 text-green-400',
    CANCEL_MESSAGES: 'bg-red-900/50 text-red-400',
    RETRY_MESSAGES: 'bg-purple-900/50 text-purple-400',
    PAUSE_QUEUE: 'bg-amber-900/50 text-amber-400',
    RESUME_QUEUE: 'bg-emerald-900/50 text-emerald-400',
    CREATE_TEMPLATE: 'bg-blue-900/50 text-blue-400',
    UPDATE_TEMPLATE: 'bg-blue-900/50 text-blue-400',
    ACKNOWLEDGE_ALERT: 'bg-slate-900/50 text-slate-400',
    EMERGENCY_OVERRIDE: 'bg-red-900/50 text-red-400'
  }

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[action] || 'bg-slate-900/50 text-slate-400'}`}>
      {formatAction(action)}
    </span>
  )
}

function TargetTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    school: 'bg-blue-900/30 text-blue-300',
    queue: 'bg-purple-900/30 text-purple-300',
    template: 'bg-green-900/30 text-green-300',
    quota: 'bg-amber-900/30 text-amber-300',
    alert: 'bg-red-900/30 text-red-300'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs capitalize ${colors[type] || 'bg-slate-900/30 text-slate-300'}`}>
      {type}
    </span>
  )
}

function AuditLogDetails({ log }: { log: AuditLog }) {
  const { details } = log
  
  if (!details.before && !details.after && !details.reason) {
    return <span className="text-slate-500 text-xs">No additional details</span>
  }

  return (
    <div className="space-y-2 text-xs">
      {details.reason && (
        <div>
          <span className="text-slate-400">Reason: </span>
          <span className="text-slate-300">{details.reason}</span>
        </div>
      )}
      {details.before && (
        <div>
          <span className="text-slate-400">Before: </span>
          <code className="text-slate-300 bg-slate-800 px-1 rounded">
            {JSON.stringify(details.before, null, 2)}
          </code>
        </div>
      )}
      {details.after && (
        <div>
          <span className="text-slate-400">After: </span>
          <code className="text-slate-300 bg-slate-800 px-1 rounded">
            {JSON.stringify(details.after, null, 2)}
          </code>
        </div>
      )}
    </div>
  )
}

export default function AuditTab({ onExport }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<AuditFilters>({})
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [selectedTargetType, setSelectedTargetType] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedAction) params.append('action', selectedAction)
      if (selectedTargetType) params.append('targetType', selectedTargetType)
      if (filters.adminId) params.append('adminId', filters.adminId)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/admin/communication-hub/audit?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [selectedAction, selectedTargetType, dateRange, filters.adminId])

  const handleExport = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (selectedAction) params.append('action', selectedAction)
      if (selectedTargetType) params.append('targetType', selectedTargetType)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/admin/communication-hub/audit/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export:', error)
    } finally {
      setExporting(false)
    }
    onExport(filters)
  }

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.adminEmail.toLowerCase().includes(query) ||
      log.targetName?.toLowerCase().includes(query) ||
      log.targetId.toLowerCase().includes(query)
    )
  })

  const actionOptions = Object.values(HubAuditActionType)
  const targetTypeOptions = ['school', 'queue', 'template', 'quota', 'alert']

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-300">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-slate-900 border-slate-600 text-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-slate-900 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Action Type Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Action Type</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-2"
              >
                <option value="">All Actions</option>
                {actionOptions.map(action => (
                  <option key={action} value={action}>
                    {action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Type Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Type</label>
              <select
                value={selectedTargetType}
                onChange={(e) => setSelectedTargetType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-2"
              >
                <option value="">All Targets</option>
                {targetTypeOptions.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Search</label>
              <Input
                type="text"
                placeholder="Search by admin, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border-slate-600 text-slate-200 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {filteredLogs.length} audit log entries
        </p>
        <Button
          onClick={handleExport}
          disabled={exporting || filteredLogs.length === 0}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          {exporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Audit Log Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <SkeletonLoader variant="table" count={5} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">No audit logs found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr 
                        className="hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                          {log.adminEmail}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ActionTypeBadge action={log.action} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <TargetTypeBadge type={log.targetType} />
                            <span className="text-sm text-slate-400">
                              {log.targetName || log.targetId}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                          {log.ipAddress}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button className="text-slate-400 hover:text-slate-200">
                            <svg 
                              className={`w-4 h-4 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr className="bg-slate-900/30">
                          <td colSpan={6} className="px-4 py-3">
                            <AuditLogDetails log={log} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
