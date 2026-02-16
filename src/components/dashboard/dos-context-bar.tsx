'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Lock, Unlock, Menu, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

/**
 * DoS Context Bar - Academic Authority Status
 * 
 * Shows critical academic context that affects all DoS decisions:
 * - Current term and academic year
 * - School academic status (Open, Exam Period, Reporting, Locked)
 * - System-wide academic alerts
 * - DoS authority level indicators
 * - Sidebar toggle and theme toggle controls
 * 
 * This context prevents academic mistakes and ensures decisions
 * are made with full situational awareness.
 */

interface DoSContextData {
  dosName: string
  schoolName: string
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: 'ACTIVE' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED'
  } | null
  academicYear: {
    id: string
    name: string
    status: 'ACTIVE' | 'CLOSED'
  } | null
  schoolStatus: {
    academicOperations: 'OPEN' | 'EXAM_MODE' | 'REPORTING_MODE' | 'LOCKED'
    dataEntryAllowed: boolean
    reportingAllowed: boolean
    lastStatusChange: string
  }
  alerts: {
    critical: number
    warnings: number
    pendingApprovals: number
  }
  permissions: {
    canApprove: boolean
    canLock: boolean
    canOverride: boolean
    canGenerateReports: boolean
  }
}

interface DoSContextBarProps {
  className?: string
  onToggleSidebar?: () => void
}

export function DoSContextBar({ className, onToggleSidebar }: DoSContextBarProps) {
  const [contextData, setContextData] = useState<DoSContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContextData()
  }, [])

  const fetchContextData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dos/dashboard/context')
      
      if (!response.ok) {
        // Handle session expiration (401 Unauthorized)
        if (response.status === 401) {
          setError('Your session has expired. Redirecting to login...')
          // Redirect to login after 2 seconds
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        }
        
        // Handle other errors
        throw new Error('Failed to fetch DoS context')
      }

      const data = await response.json()
      setContextData(data.context)
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error('Error fetching DoS context:', err)
      setError('Unable to load academic context. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'ACTIVE':
        return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]'
      case 'EXAM_MODE':
      case 'EXAM_PERIOD':
        return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]'
      case 'REPORTING_MODE':
      case 'REPORTING':
        return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]'
      case 'LOCKED':
      case 'CLOSED':
        return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />
      case 'EXAM_MODE':
      case 'EXAM_PERIOD':
        return <Clock className="h-4 w-4" />
      case 'REPORTING_MODE':
      case 'REPORTING':
        return <Clock className="h-4 w-4" />
      case 'LOCKED':
      case 'CLOSED':
        return <Lock className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const formatStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Academic Operations Open'
      case 'EXAM_MODE':
        return 'Examination Period'
      case 'REPORTING_MODE':
        return 'Report Generation Mode'
      case 'LOCKED':
        return 'Academic Operations Locked'
      case 'ACTIVE':
        return 'Active Term'
      case 'CLOSED':
        return 'Term Closed'
      default:
        return status.replace('_', ' ')
    }
  }

  if (loading) {
    return (
      <div className={cn(
        'bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)] px-4 py-3',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className="h-4 w-32 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    )
  }

  if (error || !contextData) {
    const isSessionExpired = error?.includes('session has expired')
    
    return (
      <div className={cn(
        isSessionExpired 
          ? 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-b border-[var(--warning-light)] dark:border-[var(--warning-dark)]'
          : 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-b border-[var(--danger-light)] dark:border-[var(--danger-dark)]',
        'px-4 py-3',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <div className={cn(
              'flex items-center gap-2',
              isSessionExpired 
                ? 'text-[var(--warning-dark)] dark:text-[var(--warning)]'
                : 'text-[var(--danger-dark)] dark:text-[var(--danger)]'
            )}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {error || 'Academic context unavailable'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!isSessionExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchContextData}
                className="text-[var(--chart-red)] border-[var(--danger)] hover:bg-[var(--danger-light)]"
              >
                Retry
              </Button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { 
    dosName, 
    schoolName, 
    currentTerm, 
    academicYear, 
    schoolStatus, 
    alerts, 
    permissions 
  } = contextData

  const hasAlerts = alerts.critical > 0 || alerts.warnings > 0 || alerts.pendingApprovals > 0

  return (
    <div className={cn(
      'bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)]',
      className
    )}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Sidebar Toggle + Academic Context */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Sidebar Toggle Button - Mobile only */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md lg:hidden flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                {dosName}
              </span>
              <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] hidden sm:inline">•</span>
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] truncate hidden sm:inline">
                {schoolName}
              </span>
            </div>

            {currentTerm && (
              <div className="flex items-center gap-2 hidden md:flex">
                <Badge 
                  variant="outline" 
                  className={getStatusColor(currentTerm.status)}
                >
                  <div className="flex items-center gap-1">
                    {getStatusIcon(currentTerm.status)}
                    <span>{currentTerm.name}</span>
                  </div>
                </Badge>
              </div>
            )}

            {academicYear && (
              <div className="hidden lg:flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={getStatusColor(academicYear.status)}
                >
                  {academicYear.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Status, Alerts, Theme Toggle & Logout */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Academic Operations Status */}
            <Badge 
              variant="outline" 
              className={cn(getStatusColor(schoolStatus.academicOperations), "hidden sm:flex")}
            >
              <div className="flex items-center gap-1">
                {getStatusIcon(schoolStatus.academicOperations)}
                <span className="hidden md:inline">
                  {formatStatusText(schoolStatus.academicOperations)}
                </span>
              </div>
            </Badge>

            {/* Data Entry Status */}
            <div className="hidden md:flex items-center gap-1">
              {schoolStatus.dataEntryAllowed ? (
                <Unlock className="h-4 w-4 text-[var(--chart-green)]" />
              ) : (
                <Lock className="h-4 w-4 text-[var(--chart-red)]" />
              )}
              <span className="text-xs text-[var(--text-muted)] hidden lg:inline">
                {schoolStatus.dataEntryAllowed ? 'Entry Open' : 'Entry Locked'}
              </span>
            </div>

            {/* Alerts Summary */}
            {hasAlerts && (
              <div className="hidden lg:flex items-center gap-2">
                {alerts.critical > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {alerts.critical}
                  </Badge>
                )}
                {alerts.warnings > 0 && (
                  <Badge variant="secondary" className="text-xs bg-[var(--warning-light)] text-[var(--warning-dark)]">
                    {alerts.warnings}
                  </Badge>
                )}
                {alerts.pendingApprovals > 0 && (
                  <Badge variant="outline" className="text-xs bg-[var(--info-light)] text-[var(--accent-hover)] border-[var(--info-light)]">
                    {alerts.pendingApprovals}
                  </Badge>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Authority Permissions Warning */}
      {!permissions.canApprove && (
        <div className="px-4 pb-3">
          <div className="p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded border border-[var(--warning-light)] dark:border-[var(--warning-dark)]">
            <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Limited DoS permissions - Contact system administrator
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}