'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * School Profile Header Component
 * Requirement 6.2: Display header section with school name, health score, plan, status badge, and last activity timestamp
 */

interface SchoolProfileHeaderProps {
  schoolId: string
  schoolName: string
  healthScore: number
  plan: string
  status: 'active' | 'suspended'
  lastActivity: Date | null
}

function getHealthScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

function getHealthScoreIcon(score: number) {
  if (score >= 80) return <TrendingUp className="h-4 w-4" />
  if (score >= 50) return <Minus className="h-4 w-4" />
  return <TrendingDown className="h-4 w-4" />
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never'
  
  const dateObj = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return dateObj.toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function SchoolProfileHeader({
  schoolId,
  schoolName,
  healthScore,
  plan,
  status,
  lastActivity,
}: SchoolProfileHeaderProps) {
  const color = getHealthScoreColor(healthScore)
  
  const healthColorClasses = {
    green: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]',
    yellow: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]',
    red: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:text-[var(--danger)]',
  }
  
  const statusColorClasses = {
    active: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]',
    suspended: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:text-[var(--danger)]',
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-3 sm:p-4 lg:p-6">
      {/* Back button - Touch-friendly */}
      <Link
        href="/portals/super-admin/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] mb-3 sm:mb-4 min-h-[44px] py-2"
      >
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-sm sm:text-base">Back to Dashboard</span>
      </Link>

      {/* Header content - Mobile optimized */}
      <div className="flex flex-col gap-4">
        {/* Title section */}
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] break-words">
            {schoolName}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            School ID: {schoolId}
          </p>
        </div>

        {/* Badges section - Mobile: Stack vertically, Tablet+: Horizontal */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          {/* Health Score Badge */}
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base min-h-[44px] justify-center sm:justify-start',
            healthColorClasses[color]
          )}>
            {getHealthScoreIcon(healthScore)}
            <span>Health: {healthScore}</span>
          </div>

          {/* Status Badge */}
          <div className={cn(
            'inline-flex items-center px-3 py-2 sm:px-4 rounded-lg font-semibold capitalize text-sm sm:text-base min-h-[44px] justify-center sm:justify-start',
            statusColorClasses[status]
          )}>
            {status}
          </div>

          {/* Plan Badge */}
          <div className="inline-flex items-center px-3 py-2 sm:px-4 rounded-lg font-semibold bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)] dark:text-[var(--info)] text-sm sm:text-base min-h-[44px] justify-center sm:justify-start">
            {plan}
          </div>
        </div>

        {/* Last Activity - Mobile optimized */}
        <div className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] p-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg">
          <span className="font-medium">Last Activity:</span> {formatDate(lastActivity)}
        </div>
      </div>
    </div>
  )
}
