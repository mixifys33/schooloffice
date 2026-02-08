'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Target
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * DoS ASSESSMENT PLANS
 * 
 * View and monitor assessment schedules across all classes and subjects.
 * DoS ensures assessment plans align with curriculum requirements.
 */

interface AssessmentPlan {
  id: string
  title: string
  type: 'ca1' | 'ca2' | 'ca3' | 'exam' | 'project' | 'practical'
  classId: string
  className: string
  subjectId: string
  subjectName: string
  subjectCode: string
  teacher: {
    id: string
    name: string
    employeeNumber: string
  } | null
  scheduledDate: string
  duration: number // in minutes
  totalMarks: number
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  description?: string
  requirements?: string[]
  createdAt: string
  updatedAt: string
}

interface PlanStats {
  totalPlans: number
  plannedAssessments: number
  activeAssessments: number
  completedAssessments: number
  overdueAssessments: number
  upcomingThisWeek: number
}

export default function DoSAssessmentPlansPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  const [plans, setPlans] = useState<AssessmentPlan[]>([])
  const [stats, setStats] = useState<PlanStats>({
    totalPlans: 0,
    plannedAssessments: 0,
    activeAssessments: 0,
    completedAssessments: 0,
    overdueAssessments: 0,
    upcomingThisWeek: 0
  })

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dos/assessments/plans')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to load assessment plans')
      }

      const data = await response.json()
      setPlans(data.plans)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading assessment plans:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assessment plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter
    const matchesType = typeFilter === 'all' || plan.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[var(--chart-green)] bg-[var(--success-light)] border-[var(--success-light)]'
      case 'active': return 'text-[var(--chart-blue)] bg-[var(--info-light)] border-[var(--info-light)]'
      case 'planned': return 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border-[var(--border-default)]'
      case 'cancelled': return 'text-[var(--chart-red)] bg-[var(--danger-light)] border-[var(--danger-light)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border-[var(--border-default)]'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'text-[var(--chart-red)] bg-[var(--danger-light)]'
      case 'ca1': case 'ca2': case 'ca3': return 'text-[var(--chart-blue)] bg-[var(--info-light)]'
      case 'project': return 'text-[var(--chart-purple)] bg-[var(--info-light)]'
      case 'practical': return 'text-[var(--chart-green)] bg-[var(--success-light)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)]'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exam': return <Target className="w-4 h-4" />
      case 'ca1': case 'ca2': case 'ca3': return <FileText className="w-4 h-4" />
      case 'project': return <BookOpen className="w-4 h-4" />
      case 'practical': return <User className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const isUpcoming = (date: string) => {
    const assessmentDate = new Date(date)
    const now = new Date()
    const diffTime = assessmentDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  }

  const isOverdue = (date: string, status: string) => {
    const assessmentDate = new Date(date)
    const now = new Date()
    return assessmentDate < now && status === 'planned'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Assessment Plans</h1>
          <p className="text-[var(--text-secondary)] mt-1">Monitor assessment schedules across all classes and subjects</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Calendar className="w-4 h-4 inline mr-1" />
              <strong>DoS View:</strong> Ensure assessment plans align with curriculum requirements and academic calendar.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadPlans}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">This Week</p>
              <p className="text-2xl font-bold text-[var(--info-dark)]">{stats.upcomingThisWeek}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-[var(--text-secondary)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Planned</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.plannedAssessments}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Overdue</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{stats.overdueAssessments}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--success-dark)]">{stats.completedAssessments}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {stats.overdueAssessments > 0 && (
        <AlertBanner
          type="error"
          title="Overdue Assessments"
          message={`${stats.overdueAssessments} assessment${stats.overdueAssessments !== 1 ? 's are' : ' is'} overdue.`}
        />
      )}

      {stats.upcomingThisWeek > 0 && (
        <AlertBanner
          type="info"
          title="Upcoming Assessments"
          message={`${stats.upcomingThisWeek} assessment${stats.upcomingThisWeek !== 1 ? 's are' : ' is'} scheduled for this week.`}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
        >
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
        >
          <option value="all">All Types</option>
          <option value="ca1">CA1</option>
          <option value="ca2">CA2</option>
          <option value="ca3">CA3</option>
          <option value="exam">Exam</option>
          <option value="project">Project</option>
          <option value="practical">Practical</option>
        </select>
      </div>

      {/* Assessment Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Assessment Plans Found</h3>
            <p className="text-[var(--text-secondary)]">No assessment plans match your search criteria.</p>
          </Card>
        ) : (
          filteredPlans.map((plan) => (
            <Card key={plan.id} className={`p-6 ${isOverdue(plan.scheduledDate, plan.status) ? 'border-[var(--danger-light)] bg-[var(--danger-light)]' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  {getTypeIcon(plan.type)}
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{plan.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {plan.className}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {plan.subjectName} ({plan.subjectCode})
                      </span>
                      {plan.teacher && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {plan.teacher.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span>Scheduled: {new Date(plan.scheduledDate).toLocaleDateString()}</span>
                      <span>Duration: {plan.duration} mins</span>
                      <span>Total Marks: {plan.totalMarks}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isUpcoming(plan.scheduledDate) && plan.status === 'planned' && (
                    <Badge variant="secondary">Upcoming</Badge>
                  )}
                  {isOverdue(plan.scheduledDate, plan.status) && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                  <Badge className={getTypeColor(plan.type)}>
                    {plan.type.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(plan.status)}>
                    {plan.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {plan.description && (
                <div className="mb-4">
                  <p className="text-sm text-[var(--text-primary)]">{plan.description}</p>
                </div>
              )}

              {/* Requirements */}
              {plan.requirements && plan.requirements.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Requirements:</h4>
                  <ul className="list-disc list-inside text-sm text-[var(--text-primary)] space-y-1">
                    {plan.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                {plan.status === 'planned' && (
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Reschedule
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}