'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'

/**
 * Responsive Stat Card Component
 * Requirements: 34.1, 34.2, 34.3 - Responsive layouts for all screen sizes
 */

export interface StatCardProps {
  /** Card title */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional subtitle/description */
  subtitle?: string
  /** Color variant */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  /** Optional icon */
  icon?: React.ReactNode
  /** Optional trend indicator */
  trend?: {
    value: number
    label?: string
    direction: 'up' | 'down' | 'neutral'
  }
  /** Additional class names */
  className?: string
  /** Click handler */
  onClick?: () => void
}

const colorClasses = {
  blue: {
    bg: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]',
    border: 'border-[var(--info-light)] dark:border-[var(--info-dark)]',
    text: 'text-[var(--accent-hover)] dark:text-[var(--info)]',
    icon: 'text-[var(--accent-primary)] dark:text-[var(--chart-blue)]',
  },
  green: {
    bg: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]',
    border: 'border-[var(--success-light)] dark:border-[var(--success-dark)]',
    text: 'text-[var(--chart-green)] dark:text-[var(--success)]',
    icon: 'text-[var(--success)] dark:text-[var(--success)]',
  },
  yellow: {
    bg: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]',
    border: 'border-[var(--warning-light)] dark:border-[var(--warning-dark)]',
    text: 'text-[var(--warning)] dark:text-[var(--warning)]',
    icon: 'text-[var(--warning)] dark:text-[var(--warning)]',
  },
  red: {
    bg: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]',
    border: 'border-[var(--danger-light)] dark:border-[var(--danger-dark)]',
    text: 'text-[var(--chart-red)] dark:text-[var(--danger)]',
    icon: 'text-[var(--danger)] dark:text-[var(--danger)]',
  },
  purple: {
    bg: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]',
    border: 'border-[var(--info-light)] dark:border-[var(--info-dark)]',
    text: 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
    icon: 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
  },
  gray: {
    bg: 'bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]',
    border: 'border-[var(--border-default)] dark:border-[var(--border-strong)]',
    text: 'text-[var(--text-primary)] dark:text-[var(--text-muted)]',
    icon: 'text-[var(--text-muted)] dark:text-[var(--text-muted)]',
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  color = 'blue',
  icon,
  trend,
  className,
  onClick,
}: StatCardProps) {
  // Defensive: ensure color is valid, fallback to 'blue' if undefined or invalid
  const validColor = (color && colorClasses[color]) ? color : 'blue'
  const colors = colorClasses[validColor]
  const isClickable = !!onClick

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
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium opacity-80', colors.text)}>
              {title}
            </p>
            <p className={cn('text-xl sm:text-2xl font-bold mt-1', colors.text)}>
              {value}
            </p>
            {subtitle && (
              <p className={cn('text-xs mt-1 opacity-70', colors.text)}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.direction === 'up' && 'text-[var(--chart-green)]',
                    trend.direction === 'down' && 'text-[var(--chart-red)]',
                    trend.direction === 'neutral' && 'text-[var(--text-secondary)]'
                  )}
                >
                  {trend.direction === 'up' && '↑'}
                  {trend.direction === 'down' && '↓'}
                  {trend.direction === 'neutral' && '→'}
                  {' '}{Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-xs text-[var(--text-muted)]">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('flex-shrink-0 ml-3', colors.icon)}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Responsive Stats Grid Component
 * Automatically adjusts columns based on screen size
 */
export interface StatsGridProps {
  children: React.ReactNode
  className?: string
}

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        className
      )}
    >
      {children}
    </div>
  )
}
