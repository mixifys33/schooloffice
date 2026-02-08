'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Activity, 
  PauseCircle, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  GraduationCap,
  CheckSquare,
  Square,
  MinusSquare,
  Ban,
  PlayCircle,
  Mail,
  X
} from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { DataTable, Column } from '@/components/ui/data-table'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { SearchInput } from '@/components/ui/search-input'
import { MultiFilter, FilterConfig, ActiveFilter } from '@/components/ui/multi-filter'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  getHealthScoreAriaLabel,
  getAlertAriaLabel,
  getBulkActionAriaLabel,
  getPaginationAriaLabel,
  handleKeyboardNavigation,
  FocusManager,
  LiveRegionAnnouncer,
  getAccessibleButtonClasses,
  getAccessibleInteractiveClasses,
  getHealthScoreColors,
  getStatusColors,
  getAlertColors,
  accessibilityClasses,
} from '@/lib/accessibility'
import {
  touchFriendlyClasses,
  responsiveGridClasses,
  responsiveSpacingClasses,
  responsiveTypographyClasses,
  responsiveLayoutClasses,
  responsiveTableClasses,
  responsiveAlertClasses,
  getTouchFriendlyClasses,
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getResponsiveVisibilityClasses,
} from '@/lib/responsive'

/**
 * Super Admin Schools Control Center Dashboard
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5
 * - Display global statistics including total schools, active schools, suspended schools, total revenue, and schools flagged for attention (1.1)
 * - Display diagnostic table with all schools showing name, health score, plan, MRR, last activity, student count, teacher count, and alert flags (1.2)
 * - Use visual health signals with color coding (green for healthy 80-100, yellow for at-risk 50-79, red for critical 0-49) (1.3)
 * - Display critical alerts prominently at the top of the interface (1.4)
 * - Search across school name, admin email, and school ID fields (2.1)
 * - Support stackable filters including plan type, health score range, payment status, activity status, and alert flags (2.3)
 * - Persist the last applied search and filter state (2.5)
 * - Display the count of schools matching current filters (2.6)
 * - Provide multi-select functionality for school entries in the table (3.1)
 * - Display available bulk actions including suspend, reactivate, and send notice (3.2)
 * - Require confirmation before execution of bulk actions (3.3)
 * - Process all selected schools and report success or failure for each (3.4)
 * - Do not provide bulk delete action for schools (3.5)
 */

// ============================================
// TYPES
// ============================================

interface GlobalStatistics {
  totalSchools: number
  activeSchools: number
  suspendedSchools: number
  totalRevenue: number
  schoolsFlagged: number
}

interface SchoolListItem {
  id: string
  name: string
  healthScore: number
  plan: string
  mrr: number
  lastActivity: Date | null
  studentCount: number
  teacherCount: number
  alertFlags: {
    type: string
    severity: string
    title: string
  }[]
}

interface DashboardData {
  globalStats: GlobalStatistics
  schools: SchoolListItem[]
  pagination: {
    page: number
    pageSize: number
    totalSchools: number
    totalPages: number
  }
}

interface CriticalAlert {
  id: string
  schoolId: string
  schoolName: string
  type: string
  severity: string
  title: string
  message: string
}

interface FilterState {
  plan: string
  healthRange: string
  paymentStatus: string
  activityStatus: string
  alertType: string
}

interface BulkActionResult {
  schoolId: string
  schoolName: string
  success: boolean
  error?: string
}

type BulkActionType = 'suspend' | 'reactivate' | 'notice'

interface BulkActionDialogState {
  open: boolean
  action: BulkActionType | null
  reason: string
  noticeMessage: string
}

// Storage key for persisting filter state (Requirement 2.5)
const FILTER_STORAGE_KEY = 'super-admin-dashboard-filters'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Load filter state from localStorage (Requirement 2.5)
 */
function loadFilterState(): { search: string; filters: FilterState } | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading filter state:', error)
  }
  return null
}

/**
 * Save filter state to localStorage (Requirement 2.5)
 */
function saveFilterState(search: string, filters: FilterState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ search, filters }))
  } catch (error) {
    console.error('Error saving filter state:', error)
  }
}

/**
 * Get health score color based on score value
 * Requirement 1.3: Color coding (green 80-100, yellow 50-79, red 0-49)
 */
function getHealthScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

/**
 * Get health score badge classes with accessibility support
 */
function getHealthScoreBadge(score: number): string {
  const colors = getHealthScoreColors(score)
  
  return cn(
    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
    colors.bg,
    colors.text,
    colors.border,
    'border',
    accessibilityClasses.reducedMotion
  )
}

/**
 * Get health score icon
 */
function getHealthScoreIcon(score: number) {
  if (score >= 80) return <TrendingUp className="h-3 w-3" />
  if (score >= 50) return <Minus className="h-3 w-3" />
  return <TrendingDown className="h-3 w-3" />
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date
 */
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
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return dateObj.toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Get alert severity badge with accessibility support
 */
function getAlertBadge(severity: string): React.ReactNode {
  const colors = getAlertColors(severity)
  
  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        accessibilityClasses.reducedMotion
      )}
      aria-label={getAlertAriaLabel('', severity)}
    >
      {severity}
    </span>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  
  // Search and filter state (Requirements 2.1, 2.3, 2.5)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    plan: '',
    healthRange: '',
    paymentStatus: '',
    activityStatus: '',
    alertType: '',
  })

  // Multi-select state (Requirement 3.1)
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())
  
  // Bulk action state (Requirements 3.2, 3.3, 3.4)
  const [bulkActionDialog, setBulkActionDialog] = useState<BulkActionDialogState>({
    open: false,
    action: null,
    reason: '',
    noticeMessage: '',
  })
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkActionResults, setBulkActionResults] = useState<BulkActionResult[] | null>(null)

  // Accessibility state
  const [focusedSchoolIndex, setFocusedSchoolIndex] = useState(-1)
  const announcer = useRef(LiveRegionAnnouncer.getInstance())
  const mainContentRef = useRef<HTMLDivElement>(null)
  const bulkActionsRef = useRef<HTMLDivElement>(null)

  // Load persisted filter state on mount (Requirement 2.5)
  useEffect(() => {
    const savedState = loadFilterState()
    if (savedState) {
      setSearchQuery(savedState.search)
      setFilters(savedState.filters)
    }
  }, [])

  // Save filter state whenever it changes (Requirement 2.5)
  useEffect(() => {
    saveFilterState(searchQuery, filters)
  }, [searchQuery, filters])

  // Handle search changes (Requirement 2.1)
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset to first page on search
    
    // Announce search results to screen readers
    if (value.trim()) {
      announcer.current.announce(`Searching for "${value}"`)
    } else {
      announcer.current.announce('Search cleared, showing all schools')
    }
  }, [])

  // Handle filter changes (Requirement 2.3)
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page on filter change
    
    // Announce filter changes to screen readers
    const filterConfig = filterConfigs.find(f => f.key === key)
    const option = filterConfig?.options.find(o => o.value === value)
    if (filterConfig && option) {
      announcer.current.announce(`Filter applied: ${filterConfig.label} set to ${option.label}`)
    }
  }, [])

  // Handle filter removal (Requirement 2.3)
  const handleFilterRemove = useCallback((key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
    setPage(1) // Reset to first page on filter removal
    
    // Announce filter removal to screen readers
    const filterConfig = filterConfigs.find(f => f.key === key)
    if (filterConfig) {
      announcer.current.announce(`Filter removed: ${filterConfig.label}`)
    }
  }, [])

  // Handle clear all filters (Requirement 2.3)
  const handleClearAllFilters = useCallback(() => {
    setFilters({
      plan: '',
      healthRange: '',
      paymentStatus: '',
      activityStatus: '',
      alertType: '',
    })
    setPage(1) // Reset to first page
    
    // Announce to screen readers
    announcer.current.announce('All filters cleared')
  }, [])

  // Multi-select handlers (Requirement 3.1)
  const handleSelectAll = useCallback(() => {
    if (!data) return
    
    if (selectedSchools.size === data.schools.length) {
      // Deselect all
      setSelectedSchools(new Set())
      announcer.current.announce('All schools deselected')
    } else {
      // Select all on current page
      setSelectedSchools(new Set(data.schools.map(s => s.id)))
      announcer.current.announce(`${data.schools.length} schools selected on current page`)
    }
  }, [data, selectedSchools])

  const handleSelectSchool = useCallback((schoolId: string) => {
    setSelectedSchools(prev => {
      const newSet = new Set(prev)
      const schoolName = data?.schools.find(s => s.id === schoolId)?.name || 'School'
      
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId)
        announcer.current.announce(`${schoolName} deselected`)
      } else {
        newSet.add(schoolId)
        announcer.current.announce(`${schoolName} selected`)
      }
      return newSet
    })
  }, [data])

  // Keyboard navigation for school list
  const handleSchoolListKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!data?.schools.length) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedSchoolIndex(prev => 
          prev < data.schools.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedSchoolIndex(prev => 
          prev > 0 ? prev - 1 : data.schools.length - 1
        )
        break
      case 'Home':
        event.preventDefault()
        setFocusedSchoolIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedSchoolIndex(data.schools.length - 1)
        break
      case 'Enter':
      case ' ':
        if (focusedSchoolIndex >= 0 && focusedSchoolIndex < data.schools.length) {
          event.preventDefault()
          const school = data.schools[focusedSchoolIndex]
          handleSelectSchool(school.id)
        }
        break
    }
  }, [data, focusedSchoolIndex, handleSelectSchool])

  // Clear selection when page changes
  useEffect(() => {
    setSelectedSchools(new Set())
  }, [page, searchQuery, filters])

  // Bulk action handlers (Requirements 3.2, 3.3, 3.4)
  const openBulkActionDialog = useCallback((action: BulkActionType) => {
    setBulkActionDialog({
      open: true,
      action,
      reason: '',
      noticeMessage: '',
    })
    setBulkActionResults(null)
    
    // Announce dialog opening to screen readers
    announcer.current.announce(`${action} dialog opened for ${selectedSchools.size} selected schools`)
  }, [selectedSchools.size])

  const closeBulkActionDialog = useCallback(() => {
    setBulkActionDialog({
      open: false,
      action: null,
      reason: '',
      noticeMessage: '',
    })
    setBulkActionResults(null)
    
    // Return focus to bulk actions area
    if (bulkActionsRef.current) {
      FocusManager.focusFirst(bulkActionsRef.current)
    }
  }, [])

  const executeBulkAction = useCallback(async () => {
    if (!bulkActionDialog.action || selectedSchools.size === 0) return

    // Validate inputs (Requirement 3.3)
    if (bulkActionDialog.action !== 'notice' && !bulkActionDialog.reason.trim()) {
      alert('Please provide a reason for this action')
      return
    }

    if (bulkActionDialog.action === 'notice' && !bulkActionDialog.noticeMessage.trim()) {
      alert('Please provide a message for the notice')
      return
    }

    setBulkActionLoading(true)

    try {
      // Prepare request based on action type
      const endpoint = `/api/super-admin/schools/bulk-${bulkActionDialog.action}`
      const schoolIds = Array.from(selectedSchools)
      
      const requestBody: Record<string, unknown> = {
        schoolIds,
      }

      if (bulkActionDialog.action === 'notice') {
        requestBody.message = bulkActionDialog.noticeMessage
      } else {
        requestBody.reason = bulkActionDialog.reason
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Failed to execute bulk ${bulkActionDialog.action}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Bulk action failed')
      }

      // Display results (Requirement 3.4)
      setBulkActionResults(result.data.results)

      // Clear selection
      setSelectedSchools(new Set())

      // Refresh data
      window.location.reload()
    } catch (err) {
      console.error('Bulk action error:', err)
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setBulkActionLoading(false)
    }
  }, [bulkActionDialog, selectedSchools])

  // Prepare filter configurations (Requirement 2.3)
  const filterConfigs: FilterConfig[] = [
    {
      key: 'plan',
      label: 'Plan',
      placeholder: 'Filter by plan',
      options: [
        { value: 'FREE_PILOT', label: 'Free Pilot' },
        { value: 'BASIC', label: 'Basic' },
        { value: 'PREMIUM', label: 'Premium' },
        { value: 'FULL', label: 'Full Payment' },
        { value: 'HALF', label: 'Half Payment' },
        { value: 'QUARTER', label: 'Quarter Payment' },
        { value: 'NONE', label: 'No Payment' },
      ],
    },
    {
      key: 'healthRange',
      label: 'Health Score',
      placeholder: 'Filter by health',
      options: [
        { value: '80-100', label: 'Healthy (80-100)' },
        { value: '50-79', label: 'At Risk (50-79)' },
        { value: '0-49', label: 'Critical (0-49)' },
      ],
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      placeholder: 'Filter by payment',
      options: [
        { value: 'current', label: 'Current' },
        { value: 'overdue', label: 'Overdue' },
      ],
    },
    {
      key: 'activityStatus',
      label: 'Activity',
      placeholder: 'Filter by activity',
      options: [
        { value: 'ACTIVE_7_DAYS', label: 'Active (7 days)' },
        { value: 'ACTIVE_30_DAYS', label: 'Active (30 days)' },
        { value: 'INACTIVE', label: 'Inactive (30+ days)' },
      ],
    },
    {
      key: 'alertType',
      label: 'Alert',
      placeholder: 'Filter by alert',
      options: [
        { value: 'LOW_SMS', label: 'Low SMS' },
        { value: 'INACTIVE_ADMIN', label: 'Inactive Admin' },
        { value: 'PAYMENT_OVERDUE', label: 'Payment Overdue' },
        { value: 'CRITICAL_HEALTH', label: 'Critical Health' },
        { value: 'DECLINING_ENROLLMENT', label: 'Declining Enrollment' },
      ],
    },
  ]

  // Prepare active filters for display (Requirement 2.3)
  const activeFilters: ActiveFilter[] = []
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      const config = filterConfigs.find(f => f.key === key)
      const option = config?.options.find(o => o.value === value)
      if (config && option) {
        activeFilters.push({
          key,
          value,
          label: config.label,
          displayValue: option.label,
        })
      }
    }
  })

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setSearchLoading(true)
        
        // Build query parameters for schools endpoint (Requirements 2.1, 2.3)
        const schoolsParams = new URLSearchParams({
          page: page.toString(),
          pageSize: '50',
        })
        
        // Add search query (Requirement 2.1)
        if (searchQuery) {
          schoolsParams.set('search', searchQuery)
        }
        
        // Add filters (Requirement 2.3)
        if (filters.plan) {
          schoolsParams.set('plan', filters.plan)
        }
        
        // Convert health range to min/max
        if (filters.healthRange) {
          const [min, max] = filters.healthRange.split('-').map(Number)
          schoolsParams.set('healthMin', min.toString())
          schoolsParams.set('healthMax', max.toString())
        }
        
        if (filters.paymentStatus) {
          schoolsParams.set('paymentStatus', filters.paymentStatus)
        }
        
        // Convert activity status to API format
        if (filters.activityStatus) {
          const activityMap: Record<string, string> = {
            'ACTIVE_7_DAYS': 'active_7d',
            'ACTIVE_30_DAYS': 'active_30d',
            'INACTIVE': 'inactive',
          }
          schoolsParams.set('activityStatus', activityMap[filters.activityStatus] || filters.activityStatus)
        }
        
        if (filters.alertType) {
          schoolsParams.set('alertTypes', filters.alertType)
        }
        
        // Fetch global stats (always from dashboard endpoint)
        const statsResponse = await fetch('/api/super-admin/dashboard?page=1&pageSize=1')
        
        console.log('📊 Stats API Response:', {
          status: statsResponse.status,
          statusText: statsResponse.statusText,
          headers: Object.fromEntries(statsResponse.headers.entries())
        })
        
        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            throw new Error('Unauthorized. Please log in.')
          }
          if (statsResponse.status === 403) {
            throw new Error('Access denied. Super Admin privileges required.')
          }
          const errorText = await statsResponse.text()
          console.error('Dashboard API error response:', errorText)
          throw new Error(`Failed to fetch dashboard data: ${statsResponse.status} ${statsResponse.statusText}`)
        }
        
        const statsResult = await statsResponse.json()
        console.log('📊 Stats API Result:', statsResult)
        
        if (!statsResult.success) {
          throw new Error(statsResult.message || 'Failed to load dashboard')
        }
        
        // Fetch filtered schools list
        const schoolsResponse = await fetch(`/api/super-admin/schools?${schoolsParams}`)
        
        console.log('🏫 Schools API Response:', {
          status: schoolsResponse.status,
          statusText: schoolsResponse.statusText,
          url: `/api/super-admin/schools?${schoolsParams}`
        })
        
        if (!schoolsResponse.ok) {
          const errorText = await schoolsResponse.text()
          console.error('Schools API error response:', errorText)
          throw new Error(`Failed to fetch schools list: ${schoolsResponse.status} ${schoolsResponse.statusText}`)
        }
        
        const schoolsResult = await schoolsResponse.json()
        console.log('🏫 Schools API Result:', schoolsResult)
        
        if (!schoolsResult.success) {
          throw new Error(schoolsResult.message || 'Failed to load schools')
        }
        
        // Combine data
        setData({
          globalStats: statsResult.data.globalStats,
          schools: schoolsResult.data.schools,
          pagination: schoolsResult.data.pagination,
        })
        
        // Extract critical alerts from schools with critical severity
        const alerts: CriticalAlert[] = []
        schoolsResult.data.schools.forEach((school: SchoolListItem) => {
          school.alertFlags
            .filter(alert => alert.severity === 'critical')
            .forEach(alert => {
              alerts.push({
                id: `${school.id}-${alert.type}`,
                schoolId: school.id,
                schoolName: school.name,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: `${school.name}: ${alert.title}`,
              })
            })
        })
        setCriticalAlerts(alerts)
        
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
        setSearchLoading(false)
      }
    }

    fetchDashboardData()
  }, [page, searchQuery, filters])

  // ============================================
  // TABLE COLUMNS DEFINITION
  // Requirement 1.2: All required columns
  // Requirement 3.1: Multi-select checkbox column
  // ============================================

  const columns: Column<SchoolListItem>[] = [
    // Checkbox column for multi-select (Requirement 3.1)
    {
      key: 'select',
      header: 'Select',
      align: 'center',
      render: (_, row) => (
        <div 
          className="flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            handleSelectSchool(row.id)
          }}
        >
          <button
            type="button"
            className={cn(
              getTouchFriendlyClasses('checkbox'),
              'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] rounded transition-colors',
              accessibilityClasses.buttonFocus,
              accessibilityClasses.reducedMotion
            )}
            aria-label={selectedSchools.has(row.id) ? `Deselect ${row.name}` : `Select ${row.name}`}
            aria-pressed={selectedSchools.has(row.id)}
            onKeyDown={(e) => handleKeyboardNavigation(e, () => handleSelectSchool(row.id))}
          >
            {selectedSchools.has(row.id) ? (
              <CheckSquare className="h-5 w-5 text-[var(--chart-blue)]" aria-hidden="true" />
            ) : (
              <Square className="h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'School Name',
      primary: true,
      render: (value, row) => (
        <Link 
          href={`/super-admin/schools/${row.id}`}
          className={cn(
            'font-medium text-[var(--chart-blue)] hover:text-[var(--info-dark)] dark:text-[var(--chart-blue)] dark:hover:text-[var(--info)] underline-offset-2 hover:underline',
            accessibilityClasses.interactiveFocus,
            accessibilityClasses.reducedMotion
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label={`View details for ${String(value)}`}
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'healthScore',
      header: 'Health Score',
      align: 'center',
      render: (value) => {
        const score = Number(value)
        return (
          <span 
            className={getHealthScoreBadge(score)}
            aria-label={getHealthScoreAriaLabel(score)}
          >
            {getHealthScoreIcon(score)}
            <span aria-hidden="true">{score}</span>
          </span>
        )
      },
    },
    {
      key: 'plan',
      header: 'Plan',
      hideOnMobile: true,
      render: (value) => (
        <span 
          className="text-sm text-[var(--text-primary)] dark:text-[var(--text-muted)]"
          aria-label={`Subscription plan: ${String(value)}`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      key: 'mrr',
      header: 'Monthly Revenue',
      align: 'right',
      hideOnMobile: true,
      render: (value) => (
        <span 
          className="text-sm font-medium"
          aria-label={`Monthly recurring revenue: ${formatCurrency(Number(value))}`}
        >
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      hideOnMobile: true,
      render: (value) => (
        <span 
          className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]"
          aria-label={`Last activity: ${formatDate(value as Date | null)}`}
        >
          {formatDate(value as Date | null)}
        </span>
      ),
    },
    {
      key: 'studentCount',
      header: 'Students',
      align: 'center',
      hideOnMobile: true,
      render: (value) => (
        <div 
          className="flex items-center justify-center gap-1"
          aria-label={`${Number(value)} students`}
        >
          <Users className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="text-sm">{Number(value)}</span>
        </div>
      ),
    },
    {
      key: 'teacherCount',
      header: 'Teachers',
      align: 'center',
      hideOnMobile: true,
      render: (value) => (
        <div 
          className="flex items-center justify-center gap-1"
          aria-label={`${Number(value)} teachers`}
        >
          <GraduationCap className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
          <span className="text-sm">{Number(value)}</span>
        </div>
      ),
    },
    {
      key: 'alertFlags',
      header: 'Alerts',
      align: 'center',
      render: (value) => {
        const alerts = value as SchoolListItem['alertFlags']
        if (alerts.length === 0) {
          return (
            <span 
              className="text-sm text-[var(--text-muted)]"
              aria-label="No alerts"
            >
              None
            </span>
          )
        }
        return (
          <div 
            className="flex flex-wrap gap-1 justify-center"
            aria-label={`${alerts.length} alert${alerts.length !== 1 ? 's' : ''}: ${alerts.map(a => a.title).join(', ')}`}
          >
            {alerts.slice(0, 2).map((alert, idx) => (
              <span key={idx} title={alert.title}>
                {getAlertBadge(alert.severity)}
              </span>
            ))}
            {alerts.length > 2 && (
              <span 
                className="text-xs text-[var(--text-muted)]"
                aria-label={`Plus ${alerts.length - 2} more alerts`}
              >
                +{alerts.length - 2}
              </span>
            )}
          </div>
        )
      },
    },
  ]

  // ============================================
  // RENDER
  // ============================================

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <SkeletonLoader variant="text" count={1} />
        <SkeletonLoader variant="card" count={5} />
        <SkeletonLoader variant="card" count={1} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <AlertBanner
          type="danger"
          message={error}
          action={{
            label: 'Retry',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6">
        <AlertBanner
          type="danger"
          message="No data available"
        />
      </div>
    )
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Page Header - Fully Responsive */}
      <div className="space-y-2">
        <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
          Schools Control Center
        </h1>
        <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
          Monitor and manage all schools across the platform
        </p>
      </div>

      {/* Requirement 1.4: Critical Alerts Display at Top - Fully Responsive */}
      {criticalAlerts.length > 0 && (
        <div className={getResponsiveSpacingClasses('sectionSpacing')}>
          <h2 className={cn(
            getResponsiveTypographyClasses('h2', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]'),
            'flex items-center gap-2'
          )}>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--danger)]" />
            <span>Critical Alerts ({criticalAlerts.length})</span>
          </h2>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 5).map((alert) => (
              <AlertBanner
                key={alert.id}
                type="danger"
                message={alert.message}
                action={{
                  label: 'View School',
                  onClick: () => window.location.href = `/super-admin/schools/${alert.schoolId}`,
                }}
              />
            ))}
          </div>
          {criticalAlerts.length > 5 && (
            <p className={getResponsiveTypographyClasses('small', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              + {criticalAlerts.length - 5} more critical alerts
            </p>
          )}
        </div>
      )}

      {/* Requirement 1.1: Global Statistics Cards - Fully Responsive */}
      <div className="space-y-3">
        <h2 className={getResponsiveTypographyClasses('h2', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
          Platform Overview
        </h2>
        {/* Mobile: 1 column, Small: 2 columns, Medium: 3 columns, Large: 5 columns */}
        <div className={getResponsiveGridClasses('statsGrid')}>
          <StatCard
            title="Total Schools"
            value={data.globalStats.totalSchools}
            subtitle="All registered schools"
            color="blue"
            icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Active Schools"
            value={data.globalStats.activeSchools}
            subtitle="Currently operational"
            color="green"
            icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Suspended Schools"
            value={data.globalStats.suspendedSchools}
            subtitle="Temporarily disabled"
            color="red"
            icon={<PauseCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.globalStats.totalRevenue)}
            subtitle="Cumulative earnings"
            color="purple"
            icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Schools Flagged"
            value={data.globalStats.schoolsFlagged}
            subtitle="Requiring attention"
            color={data.globalStats.schoolsFlagged > 0 ? 'yellow' : 'gray'}
            icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
        </div>
      </div>

      {/* Requirement 1.2: School Table with All Columns - Fully Responsive */}
      <div className={getResponsiveSpacingClasses('sectionSpacing')}>
        <div className={cn(responsiveLayoutClasses.flexRow, 'items-center justify-between gap-2')}>
          <h2 className={getResponsiveTypographyClasses('h2', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            {/* Requirement 2.6: Display filter count */}
            All Schools ({data.pagination.totalSchools})
          </h2>
        </div>

        {/* Requirements 2.1, 2.3: Search and Filter UI - Fully Responsive */}
        <div className={getResponsiveSpacingClasses('sectionSpacing')}>
          {/* Search bar (Requirement 2.1) */}
          <SearchInput
            placeholder="Search by school name, admin email, or school ID..."
            value={searchQuery}
            onChange={handleSearch}
            loading={searchLoading}
            debounceMs={300}
          />

          {/* Filter chips (Requirement 2.3) - Fully Responsive */}
          <div className="space-y-3">
            <MultiFilter
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onFilterRemove={handleFilterRemove}
              onClearAll={handleClearAllFilters}
            />
          </div>
        </div>

        {/* Requirement 3.2: Bulk Action Toolbar - Fully Responsive with Touch-Friendly Controls */}
        {selectedSchools.size > 0 && (
          <div className={cn(
            responsiveAlertClasses.container,
            'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 border-[var(--info-light)] dark:border-[var(--info-dark)]'
          )}>
            <div className={responsiveAlertClasses.content}>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--chart-blue)]" />
                <span className={getResponsiveTypographyClasses('body', 'font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
                  {selectedSchools.size} school{selectedSchools.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              {/* Mobile: Stack buttons vertically, Tablet+: Horizontal with proper spacing */}
              <div className={responsiveAlertClasses.actions}>
                <button
                  onClick={() => openBulkActionDialog('suspend')}
                  className={cn(
                    getTouchFriendlyClasses('button'),
                    'bg-[var(--chart-red)] text-[var(--white-pure)] rounded-md hover:bg-[var(--chart-red)] transition-colors',
                    getResponsiveTypographyClasses('button'),
                    'inline-flex items-center justify-center gap-2',
                    accessibilityClasses.buttonFocus,
                    accessibilityClasses.reducedMotion
                  )}
                >
                  <Ban className="h-4 w-4" />
                  Suspend
                </button>
                <button
                  onClick={() => openBulkActionDialog('reactivate')}
                  className={cn(
                    getTouchFriendlyClasses('button'),
                    'bg-[var(--chart-green)] text-[var(--white-pure)] rounded-md hover:bg-[var(--chart-green)] transition-colors',
                    getResponsiveTypographyClasses('button'),
                    'inline-flex items-center justify-center gap-2',
                    accessibilityClasses.buttonFocus,
                    accessibilityClasses.reducedMotion
                  )}
                >
                  <PlayCircle className="h-4 w-4" />
                  Reactivate
                </button>
                <button
                  onClick={() => openBulkActionDialog('notice')}
                  className={cn(
                    getTouchFriendlyClasses('button'),
                    'bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-md hover:bg-[var(--accent-hover)] transition-colors',
                    getResponsiveTypographyClasses('button'),
                    'inline-flex items-center justify-center gap-2',
                    accessibilityClasses.buttonFocus,
                    accessibilityClasses.reducedMotion
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Send Notice
                </button>
                <button
                  onClick={() => setSelectedSchools(new Set())}
                  className={cn(
                    getTouchFriendlyClasses('button'),
                    'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)]',
                    'rounded-md hover:bg-[var(--border-default)] dark:hover:bg-[var(--text-secondary)] transition-colors',
                    getResponsiveTypographyClasses('button'),
                    'inline-flex items-center justify-center gap-2',
                    accessibilityClasses.buttonFocus,
                    accessibilityClasses.reducedMotion
                  )}
                >
                  <X className="h-4 w-4" />
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Fully Responsive Table Container with Optimized Mobile Display */}
        <div className={responsiveTableClasses.container}>
          {/* Select all checkbox in table header - Hidden on mobile, visible on tablet+ */}
          <div className={getResponsiveVisibilityClasses('tabletUp', 'border-b bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]')}>
            <div className="flex items-center px-4 py-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  getTouchFriendlyClasses('checkbox'),
                  'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] rounded',
                  accessibilityClasses.buttonFocus,
                  accessibilityClasses.reducedMotion
                )}
                aria-label={selectedSchools.size === data.schools.length ? 'Deselect all' : 'Select all'}
              >
                {selectedSchools.size === data.schools.length && data.schools.length > 0 ? (
                  <CheckSquare className="h-5 w-5 text-[var(--chart-blue)]" />
                ) : selectedSchools.size > 0 ? (
                  <MinusSquare className="h-5 w-5 text-[var(--chart-blue)]" />
                ) : (
                  <Square className="h-5 w-5 text-[var(--text-muted)]" />
                )}
              </button>
              <span className={getResponsiveTypographyClasses('small', 'ml-3 text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Select all on this page
              </span>
            </div>
          </div>
          
          <DataTable
            data={data.schools}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage="No schools found"
            onRowClick={(row) => {
              // Don't navigate if clicking on checkbox
              if (!(event?.target as HTMLElement)?.closest('button')) {
                window.location.href = `/super-admin/schools/${row.id}`
              }
            }}
          />
        </div>

        {/* Fully Responsive Pagination with Touch-Friendly Controls */}
        {data.pagination.totalPages > 1 && (
          <div className={cn(responsiveLayoutClasses.flexRow, 'items-center justify-between gap-3')}>
            <p className={getResponsiveTypographyClasses('small', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className={getResponsiveSpacingClasses('elementSpacing', 'flex')}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn(
                  getTouchFriendlyClasses('button'),
                  getResponsiveTypographyClasses('button'),
                  'rounded-md',
                  accessibilityClasses.buttonFocus,
                  accessibilityClasses.reducedMotion,
                  page === 1
                    ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed dark:bg-[var(--border-strong)]'
                    : 'bg-[var(--chart-blue)] text-[var(--white-pure)] hover:bg-[var(--accent-hover)]'
                )}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className={cn(
                  getTouchFriendlyClasses('button'),
                  getResponsiveTypographyClasses('button'),
                  'rounded-md',
                  accessibilityClasses.buttonFocus,
                  accessibilityClasses.reducedMotion,
                  page === data.pagination.totalPages
                    ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed dark:bg-[var(--border-strong)]'
                    : 'bg-[var(--chart-blue)] text-[var(--white-pure)] hover:bg-[var(--accent-hover)]'
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement 3.3: Bulk Action Confirmation Dialogs */}
      <Dialog open={bulkActionDialog.open} onOpenChange={(open) => !open && closeBulkActionDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {bulkActionDialog.action === 'suspend' && 'Suspend Schools'}
              {bulkActionDialog.action === 'reactivate' && 'Reactivate Schools'}
              {bulkActionDialog.action === 'notice' && 'Send Notice to Schools'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionDialog.action === 'suspend' && 
                `You are about to suspend ${selectedSchools.size} school${selectedSchools.size !== 1 ? 's' : ''}. This will disable access for all users in these schools.`
              }
              {bulkActionDialog.action === 'reactivate' && 
                `You are about to reactivate ${selectedSchools.size} school${selectedSchools.size !== 1 ? 's' : ''}. This will restore access for all users in these schools.`
              }
              {bulkActionDialog.action === 'notice' && 
                `You are about to send a notice to ${selectedSchools.size} school${selectedSchools.size !== 1 ? 's' : ''}.`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Requirement 3.4: Show bulk action results */}
          {bulkActionResults ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                Action Results:
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {bulkActionResults.map((result) => (
                  <div
                    key={result.schoolId}
                    className={cn(
                      'p-3 rounded-md text-sm',
                      result.success
                        ? 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20 text-[var(--success-dark)] dark:text-[var(--success)]'
                        : 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 text-[var(--danger-dark)] dark:text-[var(--danger)]'
                    )}
                  >
                    <div className="font-medium">{result.schoolName}</div>
                    {result.success ? (
                      <div className="text-xs mt-1">Success</div>
                    ) : (
                      <div className="text-xs mt-1">Failed: {result.error}</div>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <button
                  onClick={closeBulkActionDialog}
                  className="px-4 py-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] rounded-md hover:bg-[var(--border-default)] dark:hover:bg-[var(--text-secondary)] transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {bulkActionDialog.action === 'notice' ? (
                <div>
                  <label htmlFor="notice-message" className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Message *
                  </label>
                  <textarea
                    id="notice-message"
                    rows={4}
                    value={bulkActionDialog.noticeMessage}
                    onChange={(e) => setBulkActionDialog(prev => ({ ...prev, noticeMessage: e.target.value }))}
                    placeholder="Enter the message to send to all selected schools..."
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-primary)]"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="action-reason" className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Reason *
                  </label>
                  <textarea
                    id="action-reason"
                    rows={3}
                    value={bulkActionDialog.reason}
                    onChange={(e) => setBulkActionDialog(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter the reason for this action..."
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-primary)]"
                    required
                  />
                </div>
              )}

              <DialogFooter>
                <button
                  onClick={closeBulkActionDialog}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] rounded-md hover:bg-[var(--border-default)] dark:hover:bg-[var(--text-secondary)] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkAction}
                  disabled={bulkActionLoading}
                  className={cn(
                    'px-4 py-2 text-[var(--white-pure)] rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                    bulkActionDialog.action === 'suspend' && 'bg-[var(--chart-red)] hover:bg-[var(--chart-red)]',
                    bulkActionDialog.action === 'reactivate' && 'bg-[var(--chart-green)] hover:bg-[var(--chart-green)]',
                    bulkActionDialog.action === 'notice' && 'bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]'
                  )}
                >
                  {bulkActionLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Processing...
                    </span>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
