'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Building,
  BarChart3,
  UserPlus,
  Users,
  Megaphone,
  ClipboardCheck,
  Edit,
  Calendar,
  MessageSquare,
  CreditCard,
  AlertCircle,
  FileText,
  Award,
  Wallet,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import type { QuickAction } from '@/services/onboarding.service'

/**
 * Quick Actions Component
 * Requirements: 35.5 - Show role-specific quick actions and recent activity
 */

// Icon mapping for quick actions
const iconMap: Record<string, React.ElementType> = {
  building: Building,
  chart: BarChart3,
  'user-plus': UserPlus,
  users: Users,
  megaphone: Megaphone,
  'clipboard-check': ClipboardCheck,
  edit: Edit,
  calendar: Calendar,
  message: MessageSquare,
  'credit-card': CreditCard,
  'alert-circle': AlertCircle,
  'file-text': FileText,
  award: Award,
  wallet: Wallet,
}

export interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
  maxItems?: number
  layout?: 'grid' | 'list'
  className?: string
}

export function QuickActions({
  actions,
  title = 'Quick Actions',
  maxItems = 6,
  layout = 'grid',
  className,
}: QuickActionsProps) {
  const displayedActions = actions.slice(0, maxItems)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
              : 'space-y-2'
          )}
        >
          {displayedActions.map((action) => (
            <QuickActionItem
              key={action.id}
              action={action}
              layout={layout}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface QuickActionItemProps {
  action: QuickAction
  layout: 'grid' | 'list'
}

function QuickActionItem({ action, layout }: QuickActionItemProps) {
  const Icon = iconMap[action.icon] || Plus

  if (layout === 'grid') {
    return (
      <Link
        href={action.href}
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-4 rounded-lg',
          'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50',
          'hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]/20',
          'border border-transparent hover:border-[var(--info-light)] dark:hover:border-[var(--info-dark)]',
          'transition-all duration-200',
          'group'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/50',
            'group-hover:bg-[var(--info)] dark:group-hover:bg-[var(--info-dark)]',
            'transition-colors'
          )}
        >
          <Icon className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] text-center">
          {action.label}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={action.href}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50',
        'transition-colors',
        'group'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/50',
          'group-hover:bg-[var(--info)] dark:group-hover:bg-[var(--info-dark)]',
          'transition-colors'
        )}
      >
        <Icon className="h-4 w-4 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {action.label}
        </p>
        <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] truncate">
          {action.description}
        </p>
      </div>
    </Link>
  )
}

/**
 * Floating Quick Action Button
 * Mobile-friendly FAB for primary action
 */
export interface FloatingActionButtonProps {
  href: string
  label: string
  icon?: string
  className?: string
}

export function FloatingActionButton({
  href,
  label,
  icon = 'plus',
  className,
}: FloatingActionButtonProps) {
  const Icon = iconMap[icon] || Plus

  return (
    <Link
      href={href}
      className={cn(
        'fixed bottom-20 right-4 z-40 lg:bottom-6',
        'flex items-center justify-center',
        'w-14 h-14 rounded-full shadow-lg',
        'bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]',
        'text-[var(--white-pure)]',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </Link>
  )
}

/**
 * Recent Activity Item
 */
export interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: Date
  icon?: string
  href?: string
}

export interface RecentActivityProps {
  activities: ActivityItem[]
  title?: string
  maxItems?: number
  className?: string
}

export function RecentActivity({
  activities,
  title = 'Recent Activity',
  maxItems = 5,
  className,
}: RecentActivityProps) {
  const displayedActivities = activities.slice(0, maxItems)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] text-center py-4">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity) => {
              const Icon = activity.icon ? iconMap[activity.icon] : null
              const Wrapper = activity.href ? Link : 'div'
              const wrapperProps = activity.href ? { href: activity.href } : {}

              return (
                <Wrapper
                  key={activity.id}
                  {...wrapperProps}
                  className={cn(
                    'flex items-start gap-3 p-2 rounded-lg',
                    activity.href && 'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 cursor-pointer'
                  )}
                >
                  {Icon && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                      <Icon className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {activity.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </Wrapper>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
