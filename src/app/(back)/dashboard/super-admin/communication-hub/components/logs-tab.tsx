'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  MessageLogEntry,
  MessageLogFilters,
  PaginatedMessageLogs,
  MessageChannel
} from '@/types/communication-hub'

/**
 * Message Logs Tab Component
 * Requirements: 3.1-3.7, 10.8, 10.9
 * - Filterable message log table
 * - Search functionality
 * - Export button
 * - Pagination
 */

interface LogsTabProps {
  filters: MessageLogFilters
  onFilterChange: (filters: MessageLogFilters) => void
  onExport: () => void
  onSearch: (query: string) => void
}

function MessageStatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-[var(--success-dark)]/50 text-[var(--success)]'
      case 'sent':
        return 'bg-[var(--info-dark)]/50 text-[var(--chart-blue)]'
      case 'failed':
        return 'bg-[var(--danger-dark)]/50 text-[var(--danger)]'
      case 'pending':
        return 'bg-[var(--warning-dark)]/50 text-[var(--warning)]'
      case 'bounced':
        return 'bg-[var(--warning-dark)]/50 text-[var(--warning)]'
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

function ChannelIcon({ channel }: { channel: MessageChannel }) {
  switch (channel) {
    case MessageChannel.SMS:
      return (
        <svg className="w-4 h-4 text-[var(--chart-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case MessageChannel.WHATSAPP:
      return (
        <svg className="w-4 h-4 text-[var(--success)]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700"/>
        </svg>
      )
    case MessageChannel.EMAIL:
      return (
        <svg className="w-4 h-4 text-[var(--chart-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
  }
}

export default function LogsTab({
  filters,
  onFilterChange,
  onExport,
  onSearch
}: LogsTabProps) {
  const [logs, setLogs] = useState<PaginatedMessageLogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0] // today
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50'
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedSchool) params.append('schoolId', selectedSchool)
      if (selectedChannel) params.append('channel', selectedChannel)
      if (selectedStatus) params.append('status', selectedStatus)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/admin/communication-hub/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(currentPage)
  }, [searchQuery, selectedSchool, selectedChannel, selectedStatus, dateRange, currentPage])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    onSearch(query)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters }
    
    switch (key) {
      case 'school':
        setSelectedSchool(value)
        newFilters.schoolId = value || undefined
        break
      case 'channel':
        setSelectedChannel(value)
        newFilters.channel = value as MessageChannel || undefined
        break
      case 'status':
        setSelectedStatus(value)
        newFilters.status = value || undefined
        break
      case 'dateStart':
        setDateRange(prev => ({ ...prev, start: value }))
        newFilters.dateRange = { 
          start: new Date(value), 
          end: newFilters.dateRange?.end || new Date() 
        }
        break
      case 'dateEnd':
        setDateRange(prev => ({ ...prev, end: value }))
        newFilters.dateRange = { 
          start: newFilters.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
          end: new Date(value) 
        }
        break
    }
    
    setCurrentPage(1)
    onFilterChange(newFilters)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedSchool) params.append('schoolId', selectedSchool)
      if (selectedChannel) params.append('channel', selectedChannel)
      if (selectedStatus) params.append('status', selectedStatus)
      if (dateRange.start) params.append('startDate', dateRange.start)
      if (dateRange.end) params.append('endDate', dateRange.end)

      const response = await fetch(`/api/admin/communication-hub/logs/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `message-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export logs:', error)
    }
    onExport()
  }

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Message Logs</h2>
          <p className="text-sm text-[var(--text-muted)]">
            View and search all messaging activity across the platform
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by recipient or content..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
              />
            </div>
            <div>
              <select
                value={selectedSchool}
                onChange={(e) => handleFilterChange('school', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Schools</option>
                {/* TODO: Populate with actual schools */}
                <option value="school1">Sample School 1</option>
                <option value="school2">Sample School 2</option>
              </select>
            </div>
            <div>
              <select
                value={selectedChannel}
                onChange={(e) => handleFilterChange('channel', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Channels</option>
                <option value={MessageChannel.SMS}>SMS</option>
                <option value={MessageChannel.WHATSAPP}>WhatsApp</option>
                <option value={MessageChannel.EMAIL}>Email</option>
              </select>
            </div>
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Status</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-xs"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Logs Table */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <SkeletonLoader variant="table" count={10} />
            </div>
          ) : logs && logs.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-strong)]">
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Timestamp</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">School</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Channel</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Recipient</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Content</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Template</th>
                      <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text-muted)]">
                    {logs.data.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className="border-b border-[var(--border-strong)]/50 hover:bg-[var(--bg-surface)]/30">
                          <td className="py-3 px-4 text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium">{log.schoolName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <ChannelIcon channel={log.channel} />
                              <span className="text-xs">{log.channel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {log.recipient}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-xs text-[var(--text-muted)]">
                              {truncateContent(log.content)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <MessageStatusBadge status={log.status} />
                          </td>
                          <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                            {log.templateType || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {expandedRow === log.id && (
                          <tr className="bg-[var(--bg-surface)]/20">
                            <td colSpan={8} className="py-4 px-4">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Full Content</h4>
                                  <div className="bg-[var(--bg-surface)]/50 rounded p-3 text-xs text-[var(--text-muted)] whitespace-pre-wrap">
                                    {log.content}
                                  </div>
                                </div>
                                {log.deliveredAt && (
                                  <div>
                                    <span className="text-xs text-[var(--text-muted)]">Delivered at: </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {new Date(log.deliveredAt).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {log.errorMessage && (
                                  <div>
                                    <h4 className="text-sm font-medium text-[var(--danger)] mb-1">Error Message</h4>
                                    <div className="bg-[var(--danger-dark)]/30 border border-[var(--danger-dark)]/50 rounded p-2 text-xs text-[var(--danger)]">
                                      {log.errorMessage}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logs.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-[var(--border-strong)]">
                  <div className="text-sm text-[var(--text-muted)]">
                    Showing {((logs.page - 1) * logs.pageSize) + 1} to {Math.min(logs.page * logs.pageSize, logs.total)} of {logs.total} messages
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)]"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--text-muted)]">
                      Page {logs.page} of {logs.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(logs.totalPages, currentPage + 1))}
                      disabled={currentPage === logs.totalPages}
                      className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[var(--text-muted)] text-lg mb-2">No messages found</p>
              <p className="text-[var(--text-muted)] text-sm">
                Try adjusting your search criteria or date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}