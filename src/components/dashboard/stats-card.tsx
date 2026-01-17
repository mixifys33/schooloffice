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
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500 dark:text-blue-400',
    value: 'text-blue-900 dark:text-blue-100',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500 dark:text-green-400',
    value: 'text-green-900 dark:text-green-100',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-500 dark:text-red-400',
    value: 'text-red-900 dark:text-red-100',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/50',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: 'text-yellow-500 dark:text-yellow-400',
    value: 'text-yellow-900 dark:text-yellow-100',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-500 dark:text-purple-400',
    value: 'text-purple-900 dark:text-purple-100',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'text-gray-500 dark:text-gray-400',
    value: 'text-gray-900 dark:text-gray-100',
  },
}

const trendStyles = {
  up: {
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/50',
  },
  down: {
    icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/50',
  },
  neutral: {
    icon: Minus,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
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
