'use client'

/**
 * Message History Component
 * Displays message logs with filters, detail view, and retry functionality
 * Requirements: 12.3, 15.3
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronDown,
  X,
  MessageSquare,
  Mail,
  Smartphone,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageChannel, DeliveryStatus } from '@/types/enums'

interface MessageLog {
  id: string
  messageId: string
  channel: MessageChannel
  recipientContact: string
  recipientType: string
  content: string
  status: DeliveryStatus
  statusReason?: string
  cost?: number
  createdAt: string
  updatedAt: string
  statusHistory: { status: string; reason?: string; timestamp: string }[]
}

interface MessageHistoryProps {
  onRetrySuccess?: (messageId: string) => void
}

const STATUS_CONFIG: Record<DeliveryStatus, { icon: React.ElementType; color: string; label: string }> = {
  [DeliveryStatus.QUEUED]: { icon: Clock, color: 'text-gray-500', label: 'Queued' },
  [DeliveryStatus.SENDING]: { icon: Clock, color: 'text-blue-500', label: 'Sending' },
  [DeliveryStatus.SENT]: { icon: CheckCircle, color: 'text-blue-500', label: 'Sent' },
  [DeliveryStatus.DELIVERED]: { icon: CheckCircle, color: 'text-green-500', label: 'Delivered' },
  [DeliveryStatus.READ]: { icon: CheckCircle, color: 'text-green-600', label: 'Read' },
  [DeliveryStatus.FAILED]: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  [DeliveryStatus.BOUNCED]: { icon: XCircle, color: 'text-orange-500', label: 'Bounced' },
}

const CHANNEL_ICONS: Record<MessageChannel, React.ElementType> = {
  [MessageChannel.SMS]: Smartphone,
  [MessageChannel.WHATSAPP]: MessageSquare,
  [MessageChannel.EMAIL]: Mail,
}

export function MessageHistory({ onRetrySuccess }: MessageHistoryProps) {
  const [logs, setLogs] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [channelFilter, setChannelFilter] = useState<MessageChannel | ''>('')
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Detail view
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', pageSize.toString())
      params.set('offset', ((page - 1) * pageSize).toString())
      
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (channelFilter) params.set('channel', channelFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/communication/logs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch message logs')

      const data = await response.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError('Failed to load message history')
    } finally {
      setLoading(false)
    }
  }, [page, dateFrom, dateTo, channelFilter, statusFilter, searchQuery])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleRetry = async (messageId: string) => {
    try {
      setRetrying(messageId)
      const response = await fetch(`/api/communication/logs/${messageId}/retry`, { method: 'POST' })
      
      if (!response.ok) throw new Error('Failed to retry message')
      
      onRetrySuccess?.(messageId)
      fetchLogs()
    } catch (err) {
      console.error('Error retrying message:', err)
    } finally {
      setRetrying(null)
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setChannelFilter('')
    setStatusFilter('')
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters = dateFrom || dateTo || channelFilter || statusFilter || searchQuery

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Message History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-primary rounded-full" />}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="Search by recipient or content..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 rounded-md border bg-muted/30 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Channel</label>
                <div className="relative">
                  <select
                    value={channelFilter}
                    onChange={(e) => { setChannelFilter(e.target.value as MessageChannel | ''); setPage(1) }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
                  >
                    <option value="">All Channels</option>
                    {Object.values(MessageChannel).map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as DeliveryStatus | ''); setPage(1) }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
                  >
                    <option value="">All Statuses</option>
                    {Object.values(DeliveryStatus).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Message List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No messages found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG[DeliveryStatus.QUEUED]
              const StatusIcon = statusConfig.icon
              const ChannelIcon = CHANNEL_ICONS[log.channel] || MessageSquare

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className={`p-2 rounded-full bg-muted ${statusConfig.color}`}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm truncate">{log.recipientContact}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.status === DeliveryStatus.DELIVERED || log.status === DeliveryStatus.READ
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : log.status === DeliveryStatus.FAILED || log.status === DeliveryStatus.BOUNCED
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{log.content}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Message Details</h3>
                <button onClick={() => setSelectedLog(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground">Channel</label>
                    <p className="font-medium">{selectedLog.channel}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Status</label>
                    <p className={`font-medium ${STATUS_CONFIG[selectedLog.status]?.color}`}>
                      {STATUS_CONFIG[selectedLog.status]?.label}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Recipient</label>
                    <p className="font-medium">{selectedLog.recipientContact}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <p className="font-medium">{selectedLog.recipientType}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sent At</label>
                    <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedLog.cost !== undefined && (
                    <div>
                      <label className="text-xs text-muted-foreground">Cost</label>
                      <p className="font-medium">UGX {selectedLog.cost}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Content</label>
                  <p className="mt-1 p-3 rounded-md bg-muted text-sm">{selectedLog.content}</p>
                </div>

                {selectedLog.statusReason && (
                  <div>
                    <label className="text-xs text-muted-foreground">Status Reason</label>
                    <p className="mt-1 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm">
                      {selectedLog.statusReason}
                    </p>
                  </div>
                )}

                {selectedLog.statusHistory && selectedLog.statusHistory.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">Delivery History</label>
                    <div className="mt-2 space-y-2">
                      {selectedLog.statusHistory.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-medium">{entry.status}</span>
                          <span className="text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          {entry.reason && <span className="text-red-500">- {entry.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedLog.status === DeliveryStatus.FAILED || selectedLog.status === DeliveryStatus.BOUNCED) && (
                  <Button
                    onClick={() => handleRetry(selectedLog.messageId)}
                    disabled={retrying === selectedLog.messageId}
                    className="w-full"
                  >
                    {retrying === selectedLog.messageId ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Retrying...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Retry Message</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
