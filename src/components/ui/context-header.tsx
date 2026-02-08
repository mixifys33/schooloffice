'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { Building2, User, Calendar, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Context Header Component
 * Displays current school, role, term, and academic year
 * Requirements: 9.4, 18.5 - Always display context while user is logged in
 */

export interface ContextHeaderProps {
  /** Additional class names */
  className?: string
  /** Whether to show in compact mode (for mobile) */
  compact?: boolean
  /** Current term name (optional, fetched from session if not provided) */
  termName?: string
  /** Current academic year (optional, fetched from session if not provided) */
  academicYear?: string
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ContextHeader({
  className,
  compact = false,
  termName,
  academicYear,
}: ContextHeaderProps) {
  const { data: session, status } = useSession()

  // Don't render if not authenticated
  if (status !== 'authenticated' || !session?.user) {
    return null
  }

  const { schoolName, activeRole, schoolCode } = session.user

  // Super Admin doesn't have school context
  const isSuperAdmin = activeRole === 'SUPER_ADMIN'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        {!isSuperAdmin && schoolName && (
          <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            {schoolName}
          </span>
        )}
        <span className="text-[var(--text-muted)]">•</span>
        <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          {formatRole(activeRole)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-[var(--bg-surface)] px-4 py-2 text-sm dark:bg-[var(--border-strong)]',
        className
      )}
    >
      {/* School Info */}
      {!isSuperAdmin && schoolName && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            {schoolName}
          </span>
          {schoolCode && (
            <span className="rounded bg-[var(--info-light)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent-hover)] dark:bg-[var(--info-dark)] dark:text-[var(--info)]">
              {schoolCode}
            </span>
          )}
        </div>
      )}

      {/* Super Admin Label */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--chart-purple)]" />
          <span className="font-medium text-[var(--chart-purple)] dark:text-[var(--chart-purple)]">
            Platform Administration
          </span>
        </div>
      )}

      {/* Separator */}
      {!isSuperAdmin && <span className="hidden text-[var(--text-muted)] sm:inline">|</span>}

      {/* Active Role */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-[var(--success)]" />
        <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          {formatRole(activeRole)}
        </span>
      </div>

      {/* Academic Year */}
      {academicYear && (
        <>
          <span className="hidden text-[var(--text-muted)] sm:inline">|</span>
          <div className="flex items-center gap-2">
            <Calendar 
              className="h-4 w-4" 
              style={{ color: 'var(--accent-primary)' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {academicYear}
            </span>
          </div>
        </>
      )}

      {/* Current Term */}
      {termName && (
        <>
          <span className="hidden text-[var(--text-muted)] sm:inline">|</span>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--info)]" />
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {termName}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Inline Context Display
 * A more compact version for use in headers
 * Requirements: 18.5 - Display active school name and role
 */
export function InlineContextDisplay({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render on server to avoid hydration mismatch and SessionProvider issues
  if (!mounted) {
    return null
  }

  return <InlineContextDisplayClient className={className} />
}

/**
 * Client-only component that uses useSession
 * This ensures useSession is only called after mounting when SessionProvider is available
 */
function InlineContextDisplayClient({ className }: { className?: string }) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <span className="text-[var(--text-muted)]">Loading...</span>
      </div>
    )
  }

  if (status !== 'authenticated' || !session?.user) {
    return null
  }

  const { schoolName, activeRole } = session.user
  const isSuperAdmin = activeRole === 'SUPER_ADMIN'

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {!isSuperAdmin && schoolName ? (
        <>
          <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            {schoolName}
          </span>
          <span className="text-[var(--text-muted)]">•</span>
        </>
      ) : isSuperAdmin ? (
        <>
          <span className="font-medium text-[var(--chart-purple)] dark:text-[var(--chart-purple)]">
            Admin
          </span>
          <span className="text-[var(--text-muted)]">•</span>
        </>
      ) : null}
      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
        {formatRole(activeRole)}
      </span>
    </div>
  )
}

export default ContextHeader
