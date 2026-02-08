'use client'

import React from 'react'
import { DashboardRouter } from '@/components/dashboard/dashboard-router'

/**
 * Dashboard Redirect Page
 * This page uses DashboardRouter to automatically redirect users to their role-specific dashboard
 */
export default function DashboardRedirectPage() {
  return (
    <DashboardRouter
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--chart-blue)] border-t-transparent"></div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      }
    />
  )
}
