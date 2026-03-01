'use client'

/**
 * Notification Center Component
 * Displays in-app notifications with unread indicator, mark as read, and priority sorting
 * Requirements: 4.1-4.5
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Clock,
  MessageSquare,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationType, NotificationPriority } from '@/types/enums'

interface Notification {
  id: string
  type: NotificationType
  title: string
  content: string
  priority: NotificationPriority
  isRead: boolean
  readAt?: string
  actionUrl?: string
  createdAt: string
}

interface NotificationCenterProps {
  userId?: string
  onNotificationClick?: (notification: Notification) => void
  compact?: boolean
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  [NotificationType.ALERT]: { icon: AlertTriangle, color: 'text-[var(--danger)]' },
  [NotificationType.REMINDER]: { icon: Clock, color: 'text-[var(--warning)]' },
  [NotificationType.TASK]: { icon: Check, color: 'text-[var(--accent-primary)]' },
  [NotificationType.MESSAGE]: { icon: MessageSquare, color: 'text-[var(--success)]' },
  [NotificationType.SYSTEM]: { icon: Settings, color: 'text-[var(--text-muted)]' },
}

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  [NotificationPriority.HIGH]: 0,
  [NotificationPriority.NORMAL]: 1,
  [NotificationPriority.LOW]: 2,
}

export function NotificationCenter({ onNotificationClick, compact = false }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [filterType, setFilterType] = useState<NotificationType | ''>('')

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!showAll) params.set('unreadOnly', 'true')
      if (filterType) params.set('type', filterType)
      params.set('limit', '50')

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')

      const data = await response.json()
      
      // Sort by priority (high first) then by date (newest first)
      const sorted = (data.notifications || []).sort((a: Notification, b: Notification) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setNotifications(sorted)
      setUnreadCount(data.unreadCount || 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [showAll, filterType])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Poll for new notifications every 5 minutes (optimized for performance)
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 300000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setMarkingRead(notificationId)
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to mark as read')

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    } finally {
      setMarkingRead(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true)
      const response = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to mark all as read')

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    onNotificationClick?.(notification)
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (compact) {
    return (
      <div className="relative">
        <button className="relative p-2 rounded-md hover:bg-accent">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-[var(--white-pure)] bg-[var(--danger)] rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-bold text-[var(--white-pure)] bg-[var(--danger)] rounded-full">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <><CheckCheck className="h-4 w-4 mr-1" /> Mark all read</>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showAll ? 'outline' : 'default'}
            size="sm"
            onClick={() => setShowAll(false)}
          >
            Unread
          </Button>
          <Button
            variant={showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAll(true)}
          >
            All
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NotificationType | '')}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All Types</option>
            {Object.values(NotificationType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/20 dark:text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{showAll ? 'No notifications' : 'No unread notifications'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG[NotificationType.SYSTEM]
              const TypeIcon = typeConfig.icon

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    notification.isRead
                      ? 'bg-background hover:bg-accent/50'
                      : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  } ${notification.priority === NotificationPriority.HIGH ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <div className={`p-2 rounded-full bg-muted ${typeConfig.color}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </span>
                      {notification.priority === NotificationPriority.HIGH && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/30 dark:text-[var(--danger)] rounded">
                          High
                        </span>
                      )}
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                        disabled={markingRead === notification.id}
                        className="p-1 rounded hover:bg-accent"
                        title="Mark as read"
                      >
                        {markingRead === notification.id ? (
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {notification.actionUrl && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Notification Bell - Compact notification indicator for headers
 */
export function NotificationBell({ onClick }: { onClick?: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.count || 0)
        }
      } catch (err) {
        console.error('Error fetching unread count:', err)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 300000) // Poll every 5 minutes
    return () => clearInterval(interval)
  }, [])

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-md hover:bg-accent transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {unreadCount > 0 ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-[var(--white-pure)] bg-[var(--danger)] rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
