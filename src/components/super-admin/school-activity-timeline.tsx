'use client'

import React from 'react'
import { Clock, Activity, DollarSign, LogIn, AlertCircle } from 'lucide-react'

/**
 * School Activity Timeline Component
 * Requirement 6.7: Display activity timeline showing recent significant events in reverse chronological order
 */

interface ActivityEvent {
  timestamp: Date
  eventType: string
  description: string
  actor: string | null
}

interface SchoolActivityTimelineProps {
  activityTimeline: ActivityEvent[]
}

function formatTimestamp(date: Date): string {
  const dateObj = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  
  return dateObj.toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventIcon(eventType: string) {
  const iconMap: Record<string, React.ReactNode> = {
    ADMIN_LOGIN: <LogIn className="h-4 w-4" />,
    PAYMENT_RECEIVED: <DollarSign className="h-4 w-4" />,
    SUSPEND: <AlertCircle className="h-4 w-4" />,
    REACTIVATE: <Activity className="h-4 w-4" />,
    CHANGE_PLAN: <Activity className="h-4 w-4" />,
    RESET_PASSWORD: <Activity className="h-4 w-4" />,
    FORCE_LOGOUT: <Activity className="h-4 w-4" />,
    IMPERSONATE: <Activity className="h-4 w-4" />,
  }
  
  return iconMap[eventType] || <Activity className="h-4 w-4" />
}

function getEventColor(eventType: string): string {
  const colorMap: Record<string, string> = {
    ADMIN_LOGIN: 'bg-[var(--info-light)] text-[var(--chart-blue)] dark:bg-[var(--info-dark)]/20',
    PAYMENT_RECEIVED: 'bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/20',
    SUSPEND: 'bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/20',
    REACTIVATE: 'bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/20',
    CHANGE_PLAN: 'bg-[var(--info-light)] text-[var(--chart-purple)] dark:bg-[var(--info-dark)]/20',
    RESET_PASSWORD: 'bg-[var(--warning-light)] text-[var(--chart-yellow)] dark:bg-[var(--warning-dark)]/20',
    FORCE_LOGOUT: 'bg-[var(--warning-light)] text-[var(--chart-yellow)] dark:bg-[var(--warning-dark)]/20',
    IMPERSONATE: 'bg-indigo-100 text-[var(--chart-purple)] dark:bg-indigo-900/20',
  }
  
  return colorMap[eventType] || 'bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--text-primary)]/20'
}

export function SchoolActivityTimeline({ activityTimeline }: SchoolActivityTimelineProps) {
  if (activityTimeline.length === 0) {
    return (
      <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
          Activity Timeline
        </h2>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          No recent activity
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
        Activity Timeline
      </h2>
      
      <div className="space-y-4">
        {activityTimeline.map((event, index) => (
          <div key={index} className="flex gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.eventType)}`}>
              {getEventIcon(event.eventType)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {event.description}
                </p>
                <span className="flex-shrink-0 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
              {event.actor && (
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                  by {event.actor}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
