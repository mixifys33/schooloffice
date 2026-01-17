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
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-500 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-500 dark:text-purple-400',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'text-gray-500 dark:text-gray-400',
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
  const colors = colorClasses[color]
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
                    trend.direction === 'up' && 'text-green-600',
                    trend.direction === 'down' && 'text-red-600',
                    trend.direction === 'neutral' && 'text-gray-600'
                  )}
                >
                  {trend.direction === 'up' && '↑'}
                  {trend.direction === 'down' && '↓'}
                  {trend.direction === 'neutral' && '→'}
                  {' '}{Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-xs text-gray-500">{trend.label}</span>
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
