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
        throw new Error(`Failed to fetch assessment data: ${response.statusText}`)
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Assessment Control</h1>
            <p className="text-[var(--text-secondary)]">CA monitoring & quality control (20%)</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Assessment Control</h1>
            <p className="text-[var(--text-secondary)]">CA monitoring & quality control (20%)</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
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

  const filteredPlans = data.planStatus.filter(plan => {
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Assessment Control
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            CA monitoring & quality control (20%) • No CA without oversight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={data.systemStatus.caEntryOpen ? 
              'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]' : 
              'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
            }
          >
            {data.systemStatus.caEntryOpen ? (
              <>
                <Unlock className="h-3 w-3 mr-1" />
                CA Entry Open
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                CA Entry Locked
              </>
            )}
          </Badge>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assessment Plans"
          value={data.overview.totalPlans.toString()}
          subtitle={`${data.overview.pendingPlans} pending approval`}
          color={data.overview.pendingPlans === 0 ? "green" : "yellow"}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${data.overview.completionRate.toFixed(1)}%`}
          subtitle="CA entries complete"
          color={data.overview.completionRate >= 90 ? "green" : data.overview.completionRate >= 70 ? "yellow" : "red"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Average Score"
          value={`${data.overview.averageScore.toFixed(1)}`}
          subtitle="Across all assessments"
          color="blue"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Quality Score"
          value={`${data.overview.qualityScore.toFixed(1)}%`}
          subtitle="Assessment quality rating"
          color={data.overview.qualityScore >= 80 ? "green" : data.overview.qualityScore >= 60 ? "yellow" : "red"}
          icon={<Eye className="h-5 w-5" />}
        />
      </div>

      {/* Critical Issues */}
      {data.criticalIssues.length > 0 && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
              Critical Assessment Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.criticalIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3 bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <span className="font-medium">{issue.title}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {issue.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {issue.affectedClasses} classes affected
                    </p>
                  </div>
                  <Link href={issue.actionUrl}>
                    <Button size="sm" variant="outline">
                      Fix Now
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
      </div>

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
      {data.overview.pendingPlans > 0 && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Bulk Assessment Actions
                </h3>
                <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                  {data.overview.pendingPlans} assessment plans pending DoS approval
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