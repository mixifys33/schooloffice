'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'

/**
 * StatsCard Component for Dashboard
 * Requirements: 11.5 - Display metrics with trends
 * Supports title, value, subtitle, optional icon, trend indicator, and color variants
 */

export interface StatsCardProps {
  /** Card title */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional Lucide icon component */
  icon?: LucideIcon
  /** Optional trend indicator */
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  /** Color variant for different metric types */
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  /** Additional class names */
  className?: string
  /** Click handler */
  onClick?: () => void
}

const colorStyles = {
  blue: {
    bg: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/50',
    border: 'border-[var(--info-light)] dark:border-[var(--info-dark)]',
    text: 'text-[var(--accent-hover)] dark:text-[var(--info)]',
    icon: 'text-[var(--accent-primary)] dark:text-[var(--chart-blue)]',
    value: 'text-[var(--info-dark)] dark:text-[var(--info-light)]',
  },
  green: {
    bg: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/50',
    border: 'border-[var(--success-light)] dark:border-[var(--success-dark)]',
    text: 'text-[var(--chart-green)] dark:text-[var(--success)]',
    icon: 'text-[var(--success)] dark:text-[var(--success)]',
    value: 'text-[var(--success-dark)] dark:text-[var(--success-light)]',
  },
  red: {
    bg: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50',
    border: 'border-[var(--danger-light)] dark:border-[var(--danger-dark)]',
    text: 'text-[var(--chart-red)] dark:text-[var(--danger)]',
    icon: 'text-[var(--danger)] dark:text-[var(--danger)]',
    value: 'text-[var(--danger-dark)] dark:text-[var(--danger-light)]',
  },
  yellow: {
    bg: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/50',
    border: 'border-[var(--warning-light)] dark:border-[var(--warning-dark)]',
    text: 'text-[var(--warning)] dark:text-[var(--warning)]',
    icon: 'text-[var(--warning)] dark:text-[var(--warning)]',
    value: 'text-[var(--warning-dark)] dark:text-[var(--warning-light)]',
  },
  purple: {
    bg: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/50',
    border: 'border-[var(--info-light)] dark:border-[var(--info-dark)]',
    text: 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
    icon: 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
    value: 'text-[var(--info-dark)] dark:text-[var(--info-light)]',
  },
  gray: {
    bg: 'bg-[var(--bg-surface)] dark:bg-[var(--bg-main)]/50',
    border: 'border-[var(--border-default)] dark:border-[var(--border-default)]',
    text: 'text-[var(--text-primary)] dark:text-[var(--text-muted)]',
    icon: 'text-[var(--text-muted)] dark:text-[var(--text-muted)]',
    value: 'text-[var(--text-primary)] dark:text-[var(--text-primary)]',
  },
}

const trendStyles = {
  up: {
    icon: TrendingUp,
    color: 'text-[var(--chart-green)] dark:text-[var(--success)]',
    bg: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/50',
  },
  down: {
    icon: TrendingDown,
    color: 'text-[var(--chart-red)] dark:text-[var(--danger)]',
    bg: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50',
  },
  neutral: {
    icon: Minus,
    color: 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]',
    bg: 'bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]/50',
  },
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  className,
  onClick,
}: StatsCardProps) {
  const colors = colorStyles[color]
  const isClickable = !!onClick

  const TrendIcon = trend ? trendStyles[trend.direction].icon : null

  return (
    <Card
      className={cn(
        colors.bg,
        colors.border,
        'border',
        isClickable && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title */}
            <p className={cn('text-sm font-medium', colors.text)}>
              {title}
            </p>

            {/* Value */}
            <p className={cn('text-2xl sm:text-3xl font-bold', colors.value)}>
              {value}
            </p>

            {/* Subtitle */}
            {subtitle && (
              <p className={cn('text-xs', colors.text, 'opacity-80')}>
                {subtitle}
              </p>
            )}

            {/* Trend indicator */}
            {trend && TrendIcon && (
              <div className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2',
                trendStyles[trend.direction].bg,
                trendStyles[trend.direction].color
              )}>
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                <span>
                  {trend.direction === 'up' && '+'}
                  {trend.direction === 'down' && '-'}
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>

          {/* Icon */}
          {Icon && (
            <div className={cn('flex-shrink-0 ml-3 p-2 rounded-lg', colors.bg)}>
              <Icon className={cn('h-6 w-6', colors.icon)} aria-hidden="true" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * StatsGrid Component for laying out multiple StatsCards
 */
export interface StatsGridProps {
  children: React.ReactNode
  className?: string
  /** Number of columns on different breakpoints */
  columns?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
  }
}

export function StatsGrid({ 
  children, 
  className,
  columns = { default: 2, sm: 2, md: 3, lg: 4 }
}: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        `grid-cols-${columns.default || 2}`,
        `sm:grid-cols-${columns.sm || 2}`,
        `md:grid-cols-${columns.md || 3}`,
        `lg:grid-cols-${columns.lg || 4}`,
        className
      )}
    >
      {children}
    </div>
  )
}
