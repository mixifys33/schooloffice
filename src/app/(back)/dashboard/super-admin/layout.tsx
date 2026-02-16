'use client'

import React, { ReactNode, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Role } from '@/types/enums'
import { Skeleton } from '@/components/ui/skeleton-loader'

/**
 * Super Admin Portal Layout
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * - Provide navigation for super admin features
 * - Ensure consistent layout across super admin pages
 * - Enforce authentication and authorization
 * - Redirect unauthorized users
 */

interface SuperAdminLayoutProps {
  children: ReactNode
}

const navItems: NavItem[] = [
  { href: '/super-admin/dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/super-admin/schools', label: 'Schools', icon: <Building2 className="h-5 w-5" /> },
  { href: '/super-admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
]

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Requirements: 12.1, 12.2 - Check authentication and authorization
    if (status === 'loading') return // Still loading

    if (!session?.user) {
      // No session - redirect to login
      const currentPath = window.location.pathname
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
      return
    }

    // Requirements: 12.2, 12.4 - Check if user has SUPER_ADMIN role
    if (session.user.role !== Role.SUPER_ADMIN && session.user.activeRole !== Role.SUPER_ADMIN) {
      // Log the unauthorized access attempt
      console.warn(`Unauthorized super admin access attempt by user ${session.user.id} (${session.user.email})`)
      
      // Redirect to access denied page
      router.push('/dashboard/access-denied')
      return
    }
  }, [session, status, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Skeleton className="w-8 h-8 mx-auto mb-4 rounded-full" />
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated or authorized
  if (!session?.user || 
      (session.user.role !== Role.SUPER_ADMIN && session.user.activeRole !== Role.SUPER_ADMIN)) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Redirecting...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Super Admin"
        useBottomNav={true}
        headerContent={
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        }
        sidebarFooter={
          <div className="text-sm text-[var(--text-muted)]">
            <p>Super Admin Portal</p>
            <p className="text-xs mt-1">
              Logged in as: {session.user.email}
            </p>
          </div>
        }
      >
        {children}
      </DashboardLayout>
    </div>
  )
}
