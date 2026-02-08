'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Eye,
  Target
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * DoS ASSESSMENT MANAGEMENT
 * 
 * Main assessment overview page for Director of Studies.
 * Provides high-level monitoring of all assessment activities.
 */

interface AssessmentOverview {
  totalPlans: number
  approvedPlans: number
  pendingPlans: number
  overduePlans: number
  completionRate: number
  upcomingAssessments: number
}

interface RecentActivity {
  id: string
  type: 'plan_created' | 'plan_approved' | 'assessment_completed' | 'overdue_alert'
  title: string
  description: string
  timestamp: string
  priority: 'low' | 'medium' | 'high'
}

export default function DoSAssessmentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [overview, setOverview] = useState<AssessmentOverview>({
    totalPlans: 0,
    approvedPlans: 0,
    pendingPlans: 0,
    overduePlans: 0,
    completionRate: 0,
    upcomingAssessments: 0
  })
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  const loadAssessmentData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock data for now - in real implementation, fetch from API
      const mockOverview: AssessmentOverview = {
        totalPlans: 45,
        approvedPlans: 38,
        pendingPlans: 4,
        overduePlans: 3,
        completionRate: 84.4,
        upcomingAssessments: 12
      }

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'plan_approved',
          title: 'Mathematics CA2 Plan Approved',
          description: 'Form 3A Mathematics continuous assessment plan approved',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          priority: 'medium'
        },
        {
          id: '2',
          type: 'overdue_alert',
          title: 'English Assignment Overdue',
          description: 'Form 2B English assignment is 3 days overdue',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        },
        {
          id: '3',
          type: 'assessment_completed',
          title: 'Science Practical Completed',
          description: 'Form 4A Science practical assessment completed by all students',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          priority: 'low'
        }
      ]

      setOverview(mockOverview)
      setRecentActivity(mockActivity)

    } catch (err) {
      console.error('Error loading assessment data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assessment data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssessmentData()
  }, [loadAssessmentData])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'plan_created': return <FileText className="w-4 h-4" />
      case 'plan_approved': return <CheckCircle className="w-4 h-4" />
      case 'assessment_completed': return <Target className="w-4 h-4" />
      case 'overdue_alert': return <AlertCircle className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-[var(--chart-red)]'
    if (type === 'plan_approved' || type === 'assessment_completed') return 'text-[var(--chart-green)]'
    if (type === 'overdue_alert') return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-blue)]'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <SkeletonLoader rows={8} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Assessment Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Monitor and oversee all assessment activities</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Eye className="w-4 h-4 inline mr-1" />
              <strong>DoS Overview:</strong> Monitor assessment plans, approvals, and completion rates across all classes.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadAssessmentData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total Plans</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{overview.totalPlans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Approved</p>
              <p className="text-2xl font-bold text-[var(--success-dark)]">{overview.approvedPlans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--warning-dark)]">{overview.pendingPlans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Overdue</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{overview.overduePlans}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Completion Rate</p>
              <p className="text-2xl font-bold text-[var(--info-dark)]">{overview.completionRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Upcoming</p>
              <p className="text-2xl font-bold text-[var(--info-dark)]">{overview.upcomingAssessments}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {overview.overduePlans > 0 && (
        <AlertBanner
          type="error"
          title="Overdue Assessments"
          message={`${overview.overduePlans} assessment${overview.overduePlans !== 1 ? 's are' : ' is'} overdue and require immediate attention.`}
        />
      )}

      {overview.pendingPlans > 0 && (
        <AlertBanner
          type="warning"
          title="Pending Approvals"
          message={`${overview.pendingPlans} assessment plan${overview.pendingPlans !== 1 ? 's require' : ' requires'} your approval.`}
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button className="h-20 flex flex-col items-center justify-center space-y-2">
          <Eye className="w-6 h-6" />
          <span>Monitor Progress</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
          <CheckCircle className="w-6 h-6" />
          <span>Review Plans</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
          <TrendingUp className="w-6 h-6" />
          <span>View Performance</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
          <FileText className="w-6 h-6" />
          <span>Generate Reports</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-[var(--bg-surface)]">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type, activity.priority)} bg-opacity-10`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{activity.title}</p>
                <p className="text-sm text-[var(--text-secondary)]">{activity.description}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
              {activity.priority === 'high' && (
                <Badge variant="destructive" className="text-xs">
                  High Priority
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8 text-[var(--chart-blue)]" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)]">CA Monitoring</h4>
              <p className="text-sm text-[var(--text-secondary)]">Track continuous assessment progress</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-[var(--chart-green)]" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)]">Assessment Plans</h4>
              <p className="text-sm text-[var(--text-secondary)]">View and manage assessment schedules</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-[var(--chart-purple)]" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)]">Performance Analytics</h4>
              <p className="text-sm text-[var(--text-secondary)]">Analyze assessment performance trends</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}