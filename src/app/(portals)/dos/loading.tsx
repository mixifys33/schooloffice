import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * DoS Portal Loading State
 * 
 * Provides consistent loading experience across all DoS pages
 * while maintaining the academic command center aesthetic.
 */

export default function DoSLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
          <div className="h-4 w-96 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-24 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
      </div>

      {/* Academic Status Overview Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} variant="stat" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} variant="card" />
        ))}
      </div>

      {/* Additional Content Skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="card" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse">
              <div className="h-8 w-12 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded mb-2 mx-auto"></div>
              <div className="h-4 w-16 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}