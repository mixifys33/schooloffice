'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * SkeletonLoader Component
 * Requirements: 2.7, 12.5 - Display skeleton loading indicators while data is fetching
 */

export interface SkeletonLoaderProps {
  /** Skeleton variant type */
  variant: 'card' | 'table' | 'text' | 'stat'
  /** Number of skeleton items to render */
  count?: number
  /** Additional class names */
  className?: string
}

const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
      className
    )}
  />
)

const CardSkeleton = () => (
  <div className="rounded-lg border bg-card p-4 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-1/3" />
  </div>
)

const TableSkeleton = () => (
  <div className="rounded-lg border bg-card overflow-hidden">
    {/* Table header */}
    <div className="border-b bg-muted/50 p-3 flex gap-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-28" />
    </div>
    {/* Table rows */}
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="border-b last:border-0 p-3 flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    ))}
  </div>
)

const TextSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-4/6" />
  </div>
)

const StatSkeleton = () => (
  <div className="rounded-lg border bg-card p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2 w-24" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
)

const skeletonComponents = {
  card: CardSkeleton,
  table: TableSkeleton,
  text: TextSkeleton,
  stat: StatSkeleton,
}

export function SkeletonLoader({
  variant,
  count = 1,
  className,
}: SkeletonLoaderProps) {
  const SkeletonComponent = skeletonComponents[variant]

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  )
}

// Export individual skeleton for custom use
export { Skeleton }
