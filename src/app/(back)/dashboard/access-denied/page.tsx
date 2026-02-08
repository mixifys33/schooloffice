'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ShieldX, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDashboardPathForRole } from '@/components/dashboard/dashboard-router'
import { Role, StaffRole } from '@/types/enums'

/**
 * Access Denied Page
 * Requirements: 12.5 - Display friendly message and link back to appropriate dashboard
 * - Display friendly message explaining access is denied
 * - Provide navigation back to the user's appropriate dashboard
 * - Support dark mode theming
 */

export default function AccessDeniedPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Get the appropriate dashboard path for the user's role
  const dashboardPath = React.useMemo(() => {
    if (!session?.user) return '/login'
    const role = (session.user.activeRole || session.user.role) as Role | StaffRole
    return getDashboardPathForRole(role)
  }, [session])

  const handleGoBack = () => {
    router.back()
  }

  const handleGoToDashboard = () => {
    router.push(dashboardPath)
  }

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20">
          <ShieldX className="h-10 w-10 text-[var(--chart-red)] dark:text-[var(--danger)]" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Access Denied
        </h1>

        {/* Message */}
        <p className="mb-6 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          You don&apos;t have permission to access this page. This might be because
          your role doesn&apos;t include the required permissions, or the resource
          is restricted.
        </p>

        {/* Help text */}
        <p className="mb-8 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
          If you believe this is an error, please contact your administrator.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={handleGoToDashboard}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
