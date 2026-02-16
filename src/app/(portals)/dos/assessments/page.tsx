'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Eye,
  Users,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  User,
  FileText,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'

/**
 * DoS Assessment Control Zone (CA - 20%)
 * 
 * Purpose: Control continuous assessment quality, not just quantity.
 * Key Rule: CA without oversight is fake data. This fixes that.
 * 
 * COMPLETE MOBILE-FIRST RESPONSIVE REDESIGN
 * - Mobile: Card-based layout with collapsible sections
 * - Tablet: 2-column grid with enhanced cards
 * - Desktop: Full table/grid view with all details
 */

interface AssessmentControlData {
  overview: {
    totalPlans: number
    approvedPlans: number
    pendingPlans: number
    overduePlans: number
    completionRate: number
    averageScore: number
    qualityScore: number
  }

  planStatus: Array<{
    id: string
    subjectName: string
    className: string
    teacherName: string
    assessmentType: string
    assessmentName: string
    maxScore: number
    weightPercentage: number
    dueDate: string
    isOverdue: boolean
    dosApproved: boolean
    entriesCount: number
    expectedEntries: number
    completionRate: number
    averageScore: number
    hasAnomalies: boolean
    canApprove: boolean
  }>

  criticalIssues: Array<{
    id: string
    type: string
    title: string
    description: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    affectedClasses: number
    actionUrl: string
  }>

  systemStatus: {
    caEntryOpen: boolean
    deadlinesEnforced: boolean
  }
}

export default function AssessmentControlPage() {
  const [data, setData] = useState<AssessmentControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAssessmentData()
  }, [])

  const fetchAssessmentData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/assessments')
      
      if (!response.ok) {
        // Handle session expiration (401 Unauthorized)
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          // Redirect to login after 3 seconds
          setTimeout(() => {
            window.location.href = '/login'
          }, 3000)
          return
        }
        
        // Handle other errors with user-friendly messages
        const errorMessage = response.status === 403 
          ? 'You do not have permission to access this page.'
          : response.status === 404
          ? 'Assessment data not found. Please contact support.'
          : response.status >= 500
          ? 'Server error. Please try again later.'
          : 'Unable to load assessment data. Please refresh the page.'
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch assessment data')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching assessment data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assessment data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAssessmentData(true)
  }

  const handleApprovePlan = async (planId: string) => {
    try {
      const response = await fetch(`/api/dos/assessments/plans/${planId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to approve assessment plan')
      }

      fetchAssessmentData(true)
    } catch (err) {
      console.error('Error approving plan:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
      case 'MEDIUM': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-light)]'
      case 'LOW': return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]'
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]'
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Assessment Control</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              CA monitoring & quality control (20%)
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>
        
        <SkeletonLoader variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Assessment Control</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              CA monitoring & quality control (20%)
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load assessment data"
          message={error}
          suggestedActions={[
            'Check your internet connection',
            'Verify DoS permissions',
            'Contact system administrator if the problem persists'
          ]}
        />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const filteredPlans = (data.planStatus || []).filter(plan => {
    const matchesSearch = plan.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'approved' && plan.dosApproved) ||
      (statusFilter === 'pending' && !plan.dosApproved) ||
      (statusFilter === 'overdue' && plan.isOverdue)
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Assessment Control
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              CA monitoring & quality control (20%)
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-0.5">
              No CA without oversight
            </p>
          </div>
          
          {/* System Status Badge - Mobile Friendly */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5",
                data.systemStatus?.caEntryOpen 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200'
              )}
            >
              {data.systemStatus?.caEntryOpen ? (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">CA Entry Open</span>
                  <span className="sm:hidden">Open</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">CA Entry Locked</span>
                  <span className="sm:hidden">Locked</span>
                </>
              )}
            </Badge>
          </div>
        </div>
        
        {/* Refresh Button - Full Width on Mobile */}
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          className="w-full sm:w-auto sm:self-start"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Overview Stats - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Assessment Plans"
          value={(data.overview?.totalPlans ?? 0).toString()}
          subtitle={`${data.overview?.pendingPlans ?? 0} pending`}
          color={(data.overview?.pendingPlans ?? 0) === 0 ? "green" : "yellow"}
          icon={<ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Completion"
          value={`${(data.overview?.completionRate ?? 0).toFixed(1)}%`}
          subtitle="entries done"
          color={(data.overview?.completionRate ?? 0) >= 90 ? "green" : (data.overview?.completionRate ?? 0) >= 70 ? "yellow" : "red"}
          icon={<CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Avg Score"
          value={`${(data.overview?.averageScore ?? 0).toFixed(1)}`}
          subtitle="all assessments"
          color="blue"
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Quality"
          value={`${(data.overview?.qualityScore ?? 0).toFixed(1)}%`}
          subtitle="rating"
          color={(data.overview?.qualityScore ?? 0) >= 80 ? "green" : (data.overview?.qualityScore ?? 0) >= 60 ? "yellow" : "red"}
          icon={<Award className="h-4 w-4 sm:h-5 sm:w-5" />}
        />
      </div>

      {/* Critical Issues - Mobile Optimized */}
      {(data.criticalIssues?.length ?? 0) > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Critical Issues ({data.criticalIssues.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.criticalIssues ?? []).map((issue) => (
              <div key={issue.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          issue.severity === 'HIGH' && 'bg-red-100 text-red-700 border-red-300',
                          issue.severity === 'MEDIUM' && 'bg-yellow-100 text-yellow-700 border-yellow-300',
                          issue.severity === 'LOW' && 'bg-blue-100 text-blue-700 border-blue-300'
                        )}
                      >
                        {issue.severity}
                      </Badge>
                      <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                        {issue.title}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {issue.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {issue.affectedClasses} {issue.affectedClasses === 1 ? 'class' : 'classes'} affected
                    </p>
                  </div>
                  <Link href={issue.actionUrl} className="w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-700 border-red-300 hover:bg-red-50">
                      <AlertTriangle className="h-3 w-3 mr-2" />
                      Fix Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Controls - Mobile First */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Search Bar - Full Width on Mobile */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by subject, class, or teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Filter Controls - Responsive Layout */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved Only</option>
                  <option value="pending">Pending Only</option>
                  <option value="overdue">Overdue Only</option>
                </select>
              </div>
              
              {/* Filter Summary */}
              <div className="flex items-end gap-2">
                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                    }}
                    className="whitespace-nowrap"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                  </Button>
                )}
                <div className="hidden sm:flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                  <BarChart3 className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{filteredPlans.length}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">results</span>
                </div>
              </div>
            </div>
            
            {/* Mobile Results Count */}
            <div className="sm:hidden flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
              <span className="text-gray-600 dark:text-gray-400">Showing results:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{filteredPlans.length} of {data.planStatus.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Plans */}
      <div className="space-y-4">
        {filteredPlans.map((plan) => (
          <Card key={plan.id} className={cn(
            "relative",
            plan.isOverdue && "border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]",
            plan.hasAnomalies && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{plan.assessmentName}</h3>
                    <Badge variant="outline">{plan.assessmentType}</Badge>
                    {plan.dosApproved ? (
                      <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                    ) : plan.isOverdue ? (
                      <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
                    ) : (
                      <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Subject:</span>
                      <div className="font-medium">{plan.subjectName}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Class:</span>
                      <div className="font-medium">{plan.className}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Teacher:</span>
                      <div className="font-medium">{plan.teacherName}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Due Date:</span>
                      <div className={cn(
                        "font-medium",
                        plan.isOverdue ? "text-[var(--chart-red)]" : "text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                      )}>
                        {new Date(plan.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-[var(--text-muted)]">Weight:</span>
                      <div className="font-medium">{plan.weightPercentage}%</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Max Score:</span>
                      <div className="font-medium">{plan.maxScore}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Completion:</span>
                      <div className={cn(
                        "font-medium",
                        plan.completionRate >= 90 ? "text-[var(--chart-green)]" :
                        plan.completionRate >= 70 ? "text-[var(--chart-yellow)]" : "text-[var(--chart-red)]"
                      )}>
                        {plan.completionRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Avg Score:</span>
                      <div className="font-medium">{plan.averageScore.toFixed(1)}</div>
                    </div>
                  </div>

                  {plan.hasAnomalies && (
                    <div className="mt-3 p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                      <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Quality anomalies detected</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/dos/assessments/${plan.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  {plan.canApprove && !plan.dosApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprovePlan(plan.id)}
                      className="text-[var(--chart-green)] border-[var(--success-light)] hover:bg-[var(--success-light)]"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Actions */}
      {(data.overview?.pendingPlans ?? 0) > 0 && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Bulk Assessment Actions
                </h3>
                <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                  {data.overview?.pendingPlans ?? 0} assessment plans pending DoS approval
                </p>
              </div>
              <Button
                onClick={() => {/* handleBulkApprove() */}}
                className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)]"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}