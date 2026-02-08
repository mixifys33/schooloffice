'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, Lock, Unlock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * DoS Context Bar - Academic Authority Status
 * 
 * Shows critical academic context that affects all DoS decisions:
 * - Current term and academic year
 * - School academic status (Open, Exam Period, Reporting, Locked)
 * - System-wide academic alerts
 * - DoS authority level indicators
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
}

export function DoSContextBar({ className }: DoSContextBarProps) {
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
        throw new Error('Failed to fetch DoS context')
      }

      const data = await response.json()
      setContextData(data.context)
    } catch (err) {
      console.error('Error fetching DoS context:', err)
      setError('Unable to load academic context')
    } finally {
      setLoading(false)
    }
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
            <div className="h-4 w-32 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
            <div className="h-6 w-16 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !contextData) {
    return (
      <div className={cn(
        'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-b border-[var(--danger-light)] dark:border-[var(--danger-dark)] px-4 py-3',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {error || 'Academic context unavailable'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContextData}
            className="text-[var(--chart-red)] border-[var(--danger)] hover:bg-[var(--danger-light)]"
          >
            Retry
          </Button>
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
      'bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border-b border-[var(--border-default)] dark:border-[var(--border-strong)] px-4 py-3',
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left: Academic Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {dosName}
            </span>
            <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">•</span>
            <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {schoolName}
            </span>
          </div>

          {currentTerm && (
            <div className="flex items-center gap-2">
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
            <div className="hidden sm:flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={getStatusColor(academicYear.status)}
              >
                {academicYear.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Right: Status & Alerts */}
        <div className="flex items-center gap-3">
          {/* Academic Operations Status */}
          <Badge 
            variant="outline" 
            className={getStatusColor(schoolStatus.academicOperations)}
          >
            <div className="flex items-center gap-1">
              {getStatusIcon(schoolStatus.academicOperations)}
              <span className="hidden sm:inline">
                {formatStatusText(schoolStatus.academicOperations)}
              </span>
              <span className="sm:hidden">
                {schoolStatus.academicOperations}
              </span>
            </div>
          </Badge>

          {/* Data Entry Status */}
          <div className="flex items-center gap-1">
            {schoolStatus.dataEntryAllowed ? (
              <Unlock className="h-4 w-4 text-[var(--chart-green)]" />
            ) : (
              <Lock className="h-4 w-4 text-[var(--chart-red)]" />
            )}
            <span className="text-xs text-[var(--text-muted)] hidden md:inline">
              {schoolStatus.dataEntryAllowed ? 'Entry Open' : 'Entry Locked'}
            </span>
          </div>

          {/* Alerts Summary */}
          {hasAlerts && (
            <div className="flex items-center gap-2">
              {alerts.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {alerts.critical} Critical
                </Badge>
              )}
              {alerts.warnings > 0 && (
                <Badge variant="secondary" className="text-xs bg-[var(--warning-light)] text-[var(--warning-dark)]">
                  {alerts.warnings} Warnings
                </Badge>
              )}
              {alerts.pendingApprovals > 0 && (
                <Badge variant="outline" className="text-xs bg-[var(--info-light)] text-[var(--accent-hover)] border-[var(--info-light)]">
                  {alerts.pendingApprovals} Pending
                </Badge>
              )}
            </div>
          )}

          {/* Authority Level Indicator */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded">
            <div className="w-2 h-2 bg-[var(--chart-blue)] rounded-full"></div>
            <span className="text-xs font-medium text-[var(--info-dark)] dark:text-[var(--info)]">
              DoS Authority
            </span>
          </div>
        </div>
      </div>

      {/* Authority Permissions (when expanded) */}
      {!permissions.canApprove && (
        <div className="mt-2 p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded border border-[var(--warning-light)] dark:border-[var(--warning-dark)]">
          <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Limited DoS permissions - Contact system administrator
            </span>
          </div>
        </div>
      )}
    </div>
  )
}