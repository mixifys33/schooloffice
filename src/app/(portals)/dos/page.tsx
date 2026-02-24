'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'

/**
 * DoS Dashboard - Academic Command Center
 * 
 * Provides situational awareness in 30 seconds:
 * - Curriculum compliance status
 * - CA completion % per class
 * - Exam marking progress
 * - Subjects blocked from reporting
 * - Report cards ready vs pending
 * - Timetable conflicts
 * - Promotion readiness
 * 
 * Every alert links to the exact fixing page.
 * If this dashboard is weak, the DoS is guessing.
 */

interface DoSDashboardData {
  // Academic Status Overview
  academicStatus: {
    curriculumCompliance: number // % of classes with approved curriculum
    assessmentCompletion: number // % of CA entries complete
    examProgress: number // % of exams marked and locked
    reportReadiness: number // % of classes ready for reports
    promotionReadiness: number // % of students with promotion decisions
  }

  // Critical Alerts (Blocking Issues)
  criticalAlerts: Array<{
    id: string
    type: 'CURRICULUM' | 'ASSESSMENT' | 'EXAM' | 'SCORING' | 'REPORTING'
    title: string
    description: string
    affectedClasses: number
    actionUrl: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }>

  // Pending Approvals (DoS Action Required)
  pendingApprovals: {
    curriculumSubjects: number
    assessmentPlans: number
    examResults: number
    finalScores: number
    reportCards: number
  }

  // Class-by-Class Status
  classStatus: Array<{
    classId: string
    className: string
    studentCount: number
    curriculumApproved: boolean
    caCompletion: number // %
    examCompletion: number // %
    scoresCalculated: boolean
    reportsReady: boolean
    blockers: string[] // What's preventing progress
  }>

  // Teacher Performance Alerts
  teacherAlerts: Array<{
    teacherId: string
    teacherName: string
    issueType: 'LATE_CA' | 'MISSING_EXAMS' | 'INCOMPLETE_MARKING' | 'SUSPICIOUS_SCORES'
    description: string
    classesAffected: number
    daysOverdue: number
  }>

  // System Health
  systemHealth: {
    dataIntegrity: 'GOOD' | 'WARNING' | 'CRITICAL'
    auditTrail: 'COMPLETE' | 'GAPS'
    backupStatus: 'CURRENT' | 'STALE'
    lastHealthCheck: string
  }

  // Quick Stats
  quickStats: {
    totalStudents: number
    totalClasses: number
    totalTeachers: number
    totalSubjects: number
    activeExams: number
    pendingReports: number
  }
}

export default function DoSDashboard() {
  const [dashboardData, setDashboardData] = useState<DoSDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/dashboard')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }

      setDashboardData(result.data)
    } catch (err) {
      console.error('Error fetching DoS dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-[var(--chart-green)]'
    if (percentage >= 70) return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-red)]'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
    if (percentage >= 70) return <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
    return <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
      case 'MEDIUM': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-light)]'
      case 'LOW': return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]'
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Academic Command Center
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              DoS situational awareness dashboard
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Academic Command Center
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              DoS situational awareness dashboard
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load academic dashboard"
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

  if (!dashboardData) {
    return null
  }

  const {
    academicStatus,
    criticalAlerts,
    pendingApprovals,
    classStatus,
    teacherAlerts,
    systemHealth,
    quickStats
  } = dashboardData

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Academic Command Center
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            DoS situational awareness • {new Date().toLocaleDateString('en-UG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
          size="sm"
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)] text-base sm:text-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Critical Issues Requiring DoS Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.map((alert) => (
                <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded border">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <Badge variant="outline" className={`${getPriorityColor(alert.priority)} text-xs w-fit`}>
                        {alert.priority}
                      </Badge>
                      <span className="font-medium text-sm sm:text-base break-words">{alert.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] break-words">
                      {alert.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Affects {alert.affectedClasses} classes
                    </p>
                  </div>
                  <Link href={alert.actionUrl} className="w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      Fix Now
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Class Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Class Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {classStatus.map((cls) => (
                <div key={cls.classId} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{cls.className}</span>
                      <span className="text-sm text-[var(--text-muted)] ml-2">
                        {cls.studentCount} students
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {cls.curriculumApproved && <CheckCircle className="h-4 w-4 text-[var(--success)]" />}
                      {cls.scoresCalculated && <Calculator className="h-4 w-4 text-[var(--accent-primary)]" />}
                      {cls.reportsReady && <FileText className="h-4 w-4 text-[var(--chart-purple)]" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>CA Progress:</span>
                      <span className={getStatusColor(cls.caCompletion)}>
                        {cls.caCompletion}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Exam Progress:</span>
                      <span className={getStatusColor(cls.examCompletion)}>
                        {cls.examCompletion}%
                      </span>
                    </div>
                  </div>
                  {cls.blockers.length > 0 && (
                    <div className="mt-2 p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                      <p className="text-xs text-[var(--warning-dark)] dark:text-[var(--warning)]">
                        Blockers: {cls.blockers.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Performance Alerts */}
      {teacherAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-[var(--chart-yellow)]" />
              Teacher Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherAlerts.map((alert, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{alert.teacherName}</span>
                    <Badge variant="outline" className="text-xs">
                      {alert.daysOverdue} days overdue
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                    {alert.description}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {alert.classesAffected} classes affected
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.totalStudents}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Students</div>
        </div>
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.totalClasses}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Classes</div>
        </div>
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.totalTeachers}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Teachers</div>
        </div>
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.totalSubjects}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Subjects</div>
        </div>
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.activeExams}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Active Exams</div>
        </div>
        <div className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            {quickStats.pendingReports}
          </div>
          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Pending Reports</div>
        </div>
      </div>
    </div>
  )
}