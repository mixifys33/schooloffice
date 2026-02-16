/**
 * Enhanced Loading States Component
 * 
 * Requirements: 20.1, 20.6 - Implement loading spinners, skeleton loading states
 * Requirements: 21.1, 21.2, 21.5 - WCAG 2.1 AA compliance, screen reader support
 * 
 * Features:
 * - Skeleton loading with staggered animations
 * - Pulse effects for better visual feedback
 * - Context-aware loading states
 * - Smooth transitions between loading and content
 * - Full accessibility support with ARIA labels and live regions
 */

'use client'

import React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusAccessibility, focusStyles } from '@/lib/accessibility'

// Base skeleton component with enhanced animations
export interface SkeletonProps {
  className?: string
  animate?: boolean
  delay?: number
}

export function Skeleton({ className, animate = true, delay = 0 }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-[var(--bg-muted)]',
        animate && 'animate-pulse',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '1.5s'
      }}
      aria-hidden="true"
      role="presentation"
    />
  )
}

// Enhanced table skeleton with staggered row animations
export interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true, 
  className 
}: TableSkeletonProps) {
  return (
    <div 
      className={cn('space-y-3', className)}
      {...statusAccessibility.loadingProps('Loading table data')}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-surface)]">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={`header-${i}`}
              className="h-4 flex-1" 
              delay={i * 50}
            />
          ))}
        </div>
      )}
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`}
          className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-surface)]"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                'h-4',
                colIndex === 0 ? 'w-32' : 'flex-1'
              )}
              delay={(rowIndex * columns + colIndex) * 30}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Card skeleton with content areas
export interface CardSkeletonProps {
  showHeader?: boolean
  showFooter?: boolean
  contentLines?: number
  className?: string
}

export function CardSkeleton({ 
  showHeader = true, 
  showFooter = false, 
  contentLines = 3,
  className 
}: CardSkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      {/* Header */}
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" delay={100} />
        </div>
      )}
      
      {/* Content */}
      <div className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton 
            key={`content-${i}`}
            className={cn(
              'h-4',
              i === contentLines - 1 ? 'w-2/3' : 'w-full'
            )}
            delay={200 + i * 100}
          />
        ))}
      </div>
      
      {/* Footer */}
      {showFooter && (
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-8 w-20" delay={500} />
          <Skeleton className="h-8 w-16" delay={600} />
        </div>
      )}
    </div>
  )
}

// Loading spinner with enhanced animations
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'dots' | 'pulse' | 'bounce'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default', 
  className,
  label 
}: LoadingSpinnerProps) {
  const ariaLabel = label || 'Loading'
  
  if (variant === 'dots') {
    return (
      <div 
        className={cn('flex items-center gap-1', className)}
        {...statusAccessibility.loadingProps(ariaLabel)}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-[var(--accent-primary)]',
              size === 'sm' && 'h-1 w-1',
              size === 'md' && 'h-1.5 w-1.5',
              size === 'lg' && 'h-2 w-2',
              size === 'xl' && 'h-3 w-3',
              'animate-bounce'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
            aria-hidden="true"
          />
        ))}
        {label && (
          <span className="ml-2 text-sm text-[var(--text-secondary)]">
            {label}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div 
        className={cn('flex items-center gap-2', className)}
        {...statusAccessibility.loadingProps(ariaLabel)}
      >
        <div
          className={cn(
            'rounded-full bg-[var(--accent-primary)] animate-pulse',
            sizeClasses[size]
          )}
          aria-hidden="true"
        />
        {label && (
          <span className="text-sm text-[var(--text-secondary)]">
            {label}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'bounce') {
    return (
      <div 
        className={cn('flex items-center gap-2', className)}
        {...statusAccessibility.loadingProps(ariaLabel)}
      >
        <div
          className={cn(
            'rounded-full bg-[var(--accent-primary)] animate-bounce',
            sizeClasses[size]
          )}
          aria-hidden="true"
        />
        {label && (
          <span className="text-sm text-[var(--text-secondary)]">
            {label}
          </span>
        )}
      </div>
    )
  }

  // Default spinner
  return (
    <div 
      className={cn('flex items-center gap-2', className)}
      {...statusAccessibility.loadingProps(ariaLabel)}
    >
      <Loader2 
        className={cn(
          'animate-spin text-[var(--accent-primary)]',
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-[var(--text-secondary)]">
          {label}
        </span>
      )}
    </div>
  )
}

// Progress indicator with smooth animations
export interface ProgressIndicatorProps {
  progress: number
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'linear' | 'circular'
  className?: string
  label?: string
}

export function ProgressIndicator({
  progress,
  showPercentage = true,
  size = 'md',
  variant = 'linear',
  className,
  label
}: ProgressIndicatorProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  if (variant === 'circular') {
    const radius = size === 'sm' ? 16 : size === 'md' ? 20 : 24
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="relative">
          <svg
            className={cn(
              'transform -rotate-90',
              size === 'sm' && 'h-10 w-10',
              size === 'md' && 'h-12 w-12',
              size === 'lg' && 'h-16 w-16'
            )}
            viewBox="0 0 50 50"
          >
            {/* Background circle */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="var(--bg-muted)"
              strokeWidth="2"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="var(--accent-primary)"
              strokeWidth="2"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          {showPercentage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {Math.round(clampedProgress)}%
              </span>
            </div>
          )}
        </div>
        {label && (
          <span className="text-sm text-[var(--text-secondary)]">
            {label}
          </span>
        )}
      </div>
    )
  }

  // Linear progress bar
  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-[var(--text-secondary)]">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-[var(--bg-muted)] rounded-full overflow-hidden',
          size === 'sm' && 'h-1',
          size === 'md' && 'h-2',
          size === 'lg' && 'h-3'
        )}
      >
        <div
          className="h-full bg-[var(--accent-primary)] transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// Loading overlay for full-screen loading states
export interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  progress?: number
  showProgress?: boolean
  onCancel?: () => void
  className?: string
}

export function LoadingOverlay({
  isVisible,
  message = 'Loading...',
  progress,
  showProgress = false,
  onCancel,
  className
}: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'animate-in fade-in duration-200',
        className
      )}
    >
      <div className="bg-[var(--bg-main)] rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="text-center space-y-4">
          {/* Spinner */}
          <LoadingSpinner size="lg" />
          
          {/* Message */}
          <div>
            <p className="text-[var(--text-primary)] font-medium">
              {message}
            </p>
          </div>
          
          {/* Progress */}
          {showProgress && progress !== undefined && (
            <ProgressIndicator
              progress={progress}
              showPercentage
              size="md"
            />
          )}
          
          {/* Cancel button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Staggered list loading animation
export interface StaggeredListSkeletonProps {
  items?: number
  itemHeight?: string
  gap?: string
  className?: string
}

export function StaggeredListSkeleton({
  items = 5,
  itemHeight = 'h-16',
  gap = 'gap-3',
  className
}: StaggeredListSkeletonProps) {
  return (
    <div className={cn('space-y-3', gap, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-lg bg-[var(--bg-surface)] p-4 animate-pulse',
            itemHeight
          )}
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: '1.5s'
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}