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
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {schoolName}
          </span>
        )}
        <span className="text-gray-400">•</span>
        <span className="text-gray-600 dark:text-gray-400">
          {formatRole(activeRole)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-4 py-2 text-sm dark:bg-gray-800',
        className
      )}
    >
      {/* School Info */}
      {!isSuperAdmin && schoolName && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {schoolName}
          </span>
          {schoolCode && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {schoolCode}
            </span>
          )}
        </div>
      )}

      {/* Super Admin Label */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-500" />
          <span className="font-medium text-purple-700 dark:text-purple-300">
            Platform Administration
          </span>
        </div>
      )}

      {/* Separator */}
      {!isSuperAdmin && <span className="hidden text-gray-300 sm:inline">|</span>}

      {/* Active Role */}
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-green-500" />
        <span className="text-gray-600 dark:text-gray-400">
          {formatRole(activeRole)}
        </span>
      </div>

      {/* Academic Year */}
      {academicYear && (
        <>
          <span className="hidden text-gray-300 sm:inline">|</span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {academicYear}
            </span>
          </div>
        </>
      )}

      {/* Current Term */}
      {termName && (
        <>
          <span className="hidden text-gray-300 sm:inline">|</span>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            <span className="text-gray-600 dark:text-gray-400">
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
        <span className="text-gray-400">Loading...</span>
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
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {schoolName}
          </span>
          <span className="text-gray-400">•</span>
        </>
      ) : isSuperAdmin ? (
        <>
          <span className="font-medium text-purple-600 dark:text-purple-400">
            Admin
          </span>
          <span className="text-gray-400">•</span>
        </>
      ) : null}
      <span className="text-gray-600 dark:text-gray-400">
        {formatRole(activeRole)}
      </span>
    </div>
  )
}

export default ContextHeader
