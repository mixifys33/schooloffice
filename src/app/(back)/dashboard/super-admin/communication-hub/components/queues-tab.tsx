'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  QueueStatus,
  QueuedMessage,
  QueueFilters,
  MessageChannel,
  QueueHealthStatus,
  MessagePriority,
  QueuedMessageStatus
} from '@/types/communication-hub'

/**
 * Queue Monitor Tab Component
 * Requirements: 7.1-7.7, 10.10, 10.11
 * - Queue status cards per channel
 * - Queue health indicators (red/yellow/green)
 * - Pause/resume queue controls
 * - Message selection and cancel/retry actions
 */

interface QueueHealthIndicatorProps {
  health: QueueHealthStatus
  isPaused: boolean
}

function QueueHealthIndicator({ health, isPaused }: QueueHealthIndicatorProps) {
  const getHealthColor = () => {
    if (isPaused) return 'bg-[var(--warning)]'
    switch (health) {
      case QueueHealthStatus.HEALTHY:
        return 'bg-[var(--success)]'
      case QueueHealthStatus.SLOW:
        return 'bg-[var(--warning)]'
      case QueueHealthStatus.STUCK:
        return 'bg-[var(--danger)]'
      default:
        return 'bg-slate-500'
    }
  }

  const getHealthText = () => {
    if (isPaused) return 'Paused'
    switch (health) {
      case QueueHealthStatus.HEALTHY:
        return 'Healthy'
      case QueueHealthStatus.SLOW:
        return 'Slow'
      case QueueHealthStatus.STUCK:
        return 'Stuck'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${getHealthColor()}`} />
      <span className="text-sm text-[var(--text-muted)]">{getHealthText()}</span>
    </div>
  )
}


function QueueStatusCard({ 
  queue, 
  onPause, 
  onResume 
}: { 
  queue: QueueStatus
  onPause: (channel: MessageChannel) => void
  onResume: (channel: MessageChannel) => void
}) {
  const getChannelIcon = (channel: MessageChannel) => {
    switch (channel) {
      case MessageChannel.SMS:
        return (
          <svg className="w-6 h-6 text-[var(--chart-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case MessageChannel.WHATSAPP:
        return (
          <svg className="w-6 h-6 text-[var(--success)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700"/>
          </svg>
        )
      case MessageChannel.EMAIL:
        return (
          <svg className="w-6 h-6 text-[var(--chart-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const formatAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getChannelIcon(queue.channel)}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{queue.channel}</h3>
              <QueueHealthIndicator health={queue.health} isPaused={queue.isPaused} />
            </div>
          </div>
          <div className="flex space-x-2">
            {queue.isPaused ? (
              <Button
                size="sm"
                onClick={() => onResume(queue.channel)}
                className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)]"
              >
                Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPause(queue.channel)}
                className="bg-[var(--chart-yellow)] hover:bg-[var(--warning)] text-[var(--white-pure)] border-amber-600"
              >
                Pause
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {queue.messageCount.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {queue.oldestMessageAge > 0 ? formatAge(queue.oldestMessageAge) : '-'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Oldest</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {queue.processingRate.toFixed(1)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Rate/min</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


function PriorityBadge({ priority }: { priority: MessagePriority }) {
  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case MessagePriority.CRITICAL:
        return 'bg-[var(--danger-dark)]/50 text-[var(--danger)]'
      case MessagePriority.HIGH:
        return 'bg-[var(--warning-dark)]/50 text-[var(--warning)]'
      case MessagePriority.NORMAL:
        return 'bg-slate-900/50 text-[var(--text-muted)]'
      default:
        return 'bg-slate-900/50 text-[var(--text-muted)]'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(priority)}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: QueuedMessageStatus }) {
  const getStatusColor = (status: QueuedMessageStatus) => {
    switch (status) {
      case QueuedMessageStatus.PENDING:
        return 'bg-[var(--info-dark)]/50 text-[var(--chart-blue)]'
      case QueuedMessageStatus.PROCESSING:
        return 'bg-[var(--warning-dark)]/50 text-[var(--warning)]'
      case QueuedMessageStatus.FAILED:
        return 'bg-[var(--danger-dark)]/50 text-[var(--danger)]'
      default:
        return 'bg-slate-900/50 text-[var(--text-muted)]'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  )
}

interface QueuesTabProps {
  queues: QueueStatus[]
  onPauseQueue: (channel: MessageChannel) => void
  onResumeQueue: (channel: MessageChannel) => void
  onCancelMessages: (messageIds: string[]) => void
  onRetryMessages: (messageIds: string[]) => void
}

export default function QueuesTab({
  queues,
  onPauseQueue,
  onResumeQueue,
  onCancelMessages,
  onRetryMessages
}: QueuesTabProps) {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<QueueFilters>({})
  const [showBulkActions, setShowBulkActions] = useState(false)

  const fetchQueuedMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.channel) params.append('channel', filters.channel)
      if (filters.schoolId) params.append('schoolId', filters.schoolId)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/admin/communication-hub/queues/messages?${params}`)
      if (response.ok) {
        const data = await response.json()
        setQueuedMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch queued messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueuedMessages()
  }, [filters])

  const handleSelectMessage = (messageId: string, selected: boolean) => {
    const newSelected = new Set(selectedMessages)
    if (selected) {
      newSelected.add(messageId)
    } else {
      newSelected.delete(messageId)
    }
    setSelectedMessages(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMessages(new Set(queuedMessages.map(m => m.id)))
    } else {
      setSelectedMessages(new Set())
    }
    setShowBulkActions(selected && queuedMessages.length > 0)
  }

  const handleBulkCancel = async () => {
    const messageIds = Array.from(selectedMessages)
    onCancelMessages(messageIds)
    setSelectedMessages(new Set())
    setShowBulkActions(false)
    fetchQueuedMessages()
  }

  const handleBulkRetry = async () => {
    const messageIds = Array.from(selectedMessages)
    onRetryMessages(messageIds)
    setSelectedMessages(new Set())
    setShowBulkActions(false)
    fetchQueuedMessages()
  }

  const formatAge = (date: Date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Queue Monitor</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Monitor and control message queues across all channels
        </p>
      </div>

      {/* Queue Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <QueueStatusCard
            key={queue.channel}
            queue={queue}
            onPause={onPauseQueue}
            onResume={onResumeQueue}
          />
        ))}
      </div>

      {/* Queued Messages */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--text-secondary)]">Queued Messages</CardTitle>
            {showBulkActions && (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkCancel}
                  className="bg-[var(--chart-red)] hover:bg-[var(--chart-red)] text-[var(--white-pure)] border-[var(--chart-red)]"
                >
                  Cancel Selected ({selectedMessages.size})
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkRetry}
                  className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]"
                >
                  Retry Selected ({selectedMessages.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.channel || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value as MessageChannel || undefined }))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Channels</option>
                <option value={MessageChannel.SMS}>SMS</option>
                <option value={MessageChannel.WHATSAPP}>WhatsApp</option>
                <option value={MessageChannel.EMAIL}>Email</option>
              </select>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as MessagePriority || undefined }))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Priorities</option>
                <option value={MessagePriority.CRITICAL}>Critical</option>
                <option value={MessagePriority.HIGH}>High</option>
                <option value={MessagePriority.NORMAL}>Normal</option>
              </select>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as QueuedMessageStatus || undefined }))}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)] text-sm"
              >
                <option value="">All Status</option>
                <option value={QueuedMessageStatus.PENDING}>Pending</option>
                <option value={QueuedMessageStatus.PROCESSING}>Processing</option>
                <option value={QueuedMessageStatus.FAILED}>Failed</option>
              </select>
              <Input
                placeholder="Search by school..."
                value={filters.schoolId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, schoolId: e.target.value || undefined }))}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>


          {loading ? (
            <div className="p-6">
              <SkeletonLoader variant="table" count={5} />
            </div>
          ) : queuedMessages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedMessages.size === queuedMessages.length && queuedMessages.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-700 text-[var(--chart-blue)]"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">School</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Channel</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Recipient</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Priority</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Attempts</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Age</th>
                    <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--text-muted)]">
                  {queuedMessages.map((message) => (
                    <tr key={message.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(message.id)}
                          onChange={(e) => handleSelectMessage(message.id, e.target.checked)}
                          className="rounded border-slate-600 bg-slate-700 text-[var(--chart-blue)]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium">{message.schoolName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs">{message.channel}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {message.recipient}
                      </td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={message.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={message.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${message.attempts > 3 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                          {message.attempts}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                        {formatAge(message.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {message.lastError ? (
                          <div className="max-w-xs truncate text-xs text-[var(--danger)]" title={message.lastError}>
                            {message.lastError}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-[var(--text-muted)] text-lg mb-2">No messages in queue</p>
              <p className="text-[var(--text-muted)] text-sm">
                All messages are being processed normally
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
