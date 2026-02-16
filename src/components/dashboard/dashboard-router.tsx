'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Role, StaffRole } from '@/types/enums'
import { getStoredRole } from './role-switcher'
import { Loader2 } from 'lucide-react'

/**
 * Dashboard Router Component
 * Requirements: 1.1, 1.2 - Route users to role-specific dashboards
 * - Check user's primaryRole from session
 * - Redirect to appropriate dashboard route
 * - Handle role switcher state from sessionStorage
 */

const SESSION_STORAGE_KEY = 'dashboard_selected_role'

/**
 * Get dashboard path for a role
 * Requirements: 1.2 - Support routes for all staff types
 */
export function getDashboardPathForRole(role: StaffRole | Role): string {
  const paths: Record<string, string> = {
    // StaffRole paths
    [StaffRole.CLASS_TEACHER]: '/dashboard/class-teacher',
    [StaffRole.DOS]: '/dos',
    [StaffRole.HOSTEL_STAFF]: '/dashboard/hostel',
    [StaffRole.SUPPORT_STAFF]: '/dashboard/support',
    [StaffRole.BURSAR]: '/dashboard/bursar',
    // Role paths
    [Role.SUPER_ADMIN]: '/super-admin',
    [Role.SCHOOL_ADMIN]: '/dashboard/school-admin',
    [Role.DEPUTY]: '/dashboard/school-admin',
    [Role.TEACHER]: '/dashboard/teacher',
    [Role.ACCOUNTANT]: '/dashboard/bursar',
    [Role.STUDENT]: '/student',
    [Role.PARENT]: '/parent',
  }
  return paths[role] || '/dashboard/school-admin'
}

/**
 * Get all available roles for a user
 * Combines primary role with secondary roles
 */
export function getUserAvailableRoles(
  primaryRole: Role | StaffRole | undefined,
  secondaryRoles: (Role | StaffRole)[] = [],
  sessionRoles: Role[] = []
): (Role | StaffRole)[] {
  const roles = new Set<Role | StaffRole>()
  
  // Add primary role
  if (primaryRole) {
    roles.add(primaryRole)
  }
  
  // Add secondary roles
  secondaryRoles.forEach(role => roles.add(role))
  
  // Add session roles
  sessionRoles.forEach(role => roles.add(role))
  
  return Array.from(roles)
}

export interface DashboardRouterProps {
  /** Children to render while redirecting (optional loading state) */
  children?: React.ReactNode
  /** Fallback component while loading */
  fallback?: React.ReactNode
}

/**
 * DashboardRouter Component
 * Automatically redirects users to their role-specific dashboard
 */
export function DashboardRouter({ children, fallback }: DashboardRouterProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isRedirecting, setIsRedirecting] = React.useState(true)

  React.useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      // Not authenticated, redirect to login
      router.replace('/login')
      return
    }

    // Get the stored role from sessionStorage (if user switched roles)
    const storedRole = getStoredRole()
    
    // Determine which role to use for routing
    // Priority: stored role > active role > primary role
    const userRoles = session.user.roles || [session.user.role]
    const activeRole = session.user.activeRole || session.user.role
    
    let targetRole: Role | StaffRole = activeRole
    
    // If there's a stored role and it's valid for this user, use it
    if (storedRole && userRoles.some(role => role.toString() === storedRole.toString())) {
      targetRole = storedRole as Role | StaffRole
    }

    // Get the dashboard path for the target role
    const dashboardPath = getDashboardPathForRole(targetRole)
    
    // Redirect to the appropriate dashboard
    router.replace(dashboardPath)
    setIsRedirecting(false)
  }, [session, status, router])

  // Show loading state while determining redirect
  if (status === 'loading' || isRedirecting) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--chart-blue)]" />
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  // Render children if provided (for cases where we want to show content during redirect)
  return <>{children}</>
}

/**
 * Hook to get the current effective role for dashboard routing
 */
export function useEffectiveRole(): {
  role: Role | StaffRole | null
  isLoading: boolean
  availableRoles: (Role | StaffRole)[]
} {
  const { data: session, status } = useSession()
  const [effectiveRole, setEffectiveRole] = React.useState<Role | StaffRole | null>(null)

  React.useEffect(() => {
    if (status === 'loading' || !session?.user) return

    const storedRole = getStoredRole()
    const userRoles = session.user.roles || [session.user.role]
    const activeRole = session.user.activeRole || session.user.role

    // If stored role is valid, use it
    if (storedRole && userRoles.some(role => role.toString() === storedRole.toString())) {
      setEffectiveRole(storedRole as Role | StaffRole)
    } else {
      setEffectiveRole(activeRole)
    }
  }, [session, status])

  const availableRoles = React.useMemo(() => {
    if (!session?.user) return []
    return session.user.roles || [session.user.role]
  }, [session])

  return {
    role: effectiveRole,
    isLoading: status === 'loading',
    availableRoles,
  }
}

export default DashboardRouter
