'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  RefreshCw,
  Search,
  BookOpen,
  User,
  FileText
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface AssessmentPlan {
  id: string
  title: string
  type: string
  className: string
  subjectName: string
  subjectCode: string
  teacher: { name: string; employeeNumber: string } | null
  scheduledDate: string
  duration: number
  totalMarks: number
  status: 'planned' | 'active' | 'completed'
  description: string
  requirements: string[]
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'active' | 'completed' | 'overdue'>('all')
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
      if (!response.ok) throw new Error('Failed to load assessment plans')
      const data = await response.json()
      setPlans(data.plans)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlans() }, [loadPlans])

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = searchTerm === '' || 
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
    const now = new Date()
    const isOverdue = plan.status === 'planned' && new Date(plan.scheduledDate) < now
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'overdue') return matchesSearch && isOverdue
    return matchesSearch && plan.status === filterStatus
  })

  const getStatusBadge = (plan: AssessmentPlan) => {
    const isOverdue = plan.status === 'planned' && new Date(plan.scheduledDate) < new Date()
    if (isOverdue) return <Badge variant="destructive">Overdue</Badge>
    if (plan.status === 'planned') return <Badge variant="secondary">Planned</Badge>
    if (plan.status === 'active') return <Badge variant="default">Active</Badge>
    return <Badge variant="success">Completed</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    })
  }

  const getDaysUntil = (dateString: string) => {
    const diffDays = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `In ${diffDays} days`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold">Assessment Plans</h1>
        </div>
        <p className="text-gray-600">Monitor and manage upcoming assessments</p>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} className="mb-6" />}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Planned</div>
            <div className="text-2xl font-bold text-blue-600">{stats.plannedAssessments}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.activeAssessments}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold">{stats.completedAssessments}</div>
          </Card>
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="text-sm text-red-700">Overdue</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdueAssessments}</div>
          </Card>
          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="text-sm text-orange-700">This Week</div>
            <div className="text-2xl font-bold text-orange-600">{stats.upcomingThisWeek}</div>
          </Card>
        </div>
      )}

      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'planned' | 'active' | 'completed' | 'overdue')}
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <Button onClick={loadPlans} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <SkeletonLoader count={5} height={120} />
      ) : filteredPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No assessment plans found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{plan.title}</h3>
                    {getStatusBadge(plan)}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {plan.className} - {plan.subjectName}
                    </div>
                    {plan.teacher && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {plan.teacher.name}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(plan.scheduledDate)} ({getDaysUntil(plan.scheduledDate)})
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="font-semibold">{plan.duration} min</div>
                  <div className="text-sm text-gray-600 mt-2">Total Marks</div>
                  <div className="font-semibold">{plan.totalMarks}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
