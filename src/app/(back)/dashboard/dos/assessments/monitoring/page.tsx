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
 * DoS CONTINUOUS ASSESSMENT MONITORING
 * 
 * Monitor CA progress across all classes and subjects.
 * DoS needs to ensure academic standards are maintained.
 */

interface CAProgress {
  classId: string
  className: string
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    teacher: {
      id: string
      name: string
      employeeNumber: string
    } | null
    caProgress: {
      totalStudents: number
      assessmentsCompleted: number
      assessmentsRequired: number
      completionRate: number
      lastUpdated: string
    }
    status: 'on_track' | 'behind' | 'critical' | 'no_teacher'
  }[]
}

interface CAStats {
  totalClasses: number
  totalSubjects: number
  onTrackSubjects: number
  behindSubjects: number
  criticalSubjects: number
  noTeacherSubjects: number
  overallCompletionRate: number
}

export default function DoSAssessmentsMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [caProgress, setCaProgress] = useState<CAProgress[]>([])
  const [stats, setStats] = useState<CAStats>({
    totalClasses: 0,
    totalSubjects: 0,
    onTrackSubjects: 0,
    behindSubjects: 0,
    criticalSubjects: 0,
    noTeacherSubjects: 0,
    overallCompletionRate: 0
  })

  const loadCAProgress = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dos/assessments/monitoring')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to load CA progress')
      }

      const data = await response.json()
      setCaProgress(data.caProgress)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading CA progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CA progress')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCAProgress()
  }, [loadCAProgress])

  const filteredProgress = caProgress.filter(classData =>
    classData.className.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-[var(--chart-green)] bg-[var(--success-light)] border-[var(--success-light)]'
      case 'behind': return 'text-[var(--chart-yellow)] bg-[var(--warning-light)] border-[var(--warning-light)]'
      case 'critical': return 'text-[var(--chart-red)] bg-[var(--danger-light)] border-[var(--danger-light)]'
      case 'no_teacher': return 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border-[var(--border-default)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border-[var(--border-default)]'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="w-4 h-4" />
      case 'behind': return <AlertCircle className="w-4 h-4" />
      case 'critical': return <XCircle className="w-4 h-4" />
      case 'no_teacher': return <User className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">CA Monitoring</h1>
          <p className="text-[var(--text-secondary)] mt-1">Track continuous assessment progress across all classes</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Eye className="w-4 h-4 inline mr-1" />
              <strong>DoS View:</strong> Monitor academic progress and identify classes falling behind.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadCAProgress}
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
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">On Track</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.onTrackSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Behind</p>
              <p className="text-2xl font-bold text-[var(--warning-dark)]">{stats.behindSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Critical</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{stats.criticalSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Overall Rate</p>
              <p className="text-2xl font-bold text-[var(--info-dark)]">{stats.overallCompletionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {stats.criticalSubjects > 0 && (
        <AlertBanner
          type="error"
          title="Critical Subjects"
          message={`${stats.criticalSubjects} subject${stats.criticalSubjects !== 1 ? 's are' : ' is'} critically behind on assessments.`}
        />
      )}

      {stats.noTeacherSubjects > 0 && (
        <AlertBanner
          type="warning"
          title="No Teacher Assigned"
          message={`${stats.noTeacherSubjects} subject${stats.noTeacherSubjects !== 1 ? 's have' : ' has'} no assigned teacher.`}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-64"
        />
      </div>

      {/* CA Progress by Class */}
      <div className="space-y-4">
        {filteredProgress.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Classes Found</h3>
            <p className="text-[var(--text-secondary)]">No classes match your search criteria.</p>
          </Card>
        ) : (
          filteredProgress.map((classData) => (
            <Card key={classData.classId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Building2 className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{classData.className}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{classData.subjects.length} subjects</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {classData.subjects.some(s => s.status === 'critical') && (
                    <Badge variant="destructive">Critical</Badge>
                  )}
                  {classData.subjects.some(s => s.status === 'behind') && (
                    <Badge variant="secondary">Behind</Badge>
                  )}
                  {classData.subjects.every(s => s.status === 'on_track') && (
                    <Badge variant="success">On Track</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {classData.subjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className={`flex items-center justify-between p-3 rounded border ${getStatusColor(subject.status)}`}
                  >
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 text-[var(--chart-purple)] mr-3" />
                      <div>
                        <span className="font-medium">{subject.subjectName}</span>
                        <span className="text-sm text-[var(--text-secondary)] ml-2">({subject.subjectCode})</span>
                        {subject.teacher && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1">{subject.teacher.name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(subject.status)}
                          <span className="text-sm font-medium">
                            {subject.caProgress.completionRate}%
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {subject.caProgress.assessmentsCompleted}/{subject.caProgress.assessmentsRequired} assessments
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Last updated: {new Date(subject.caProgress.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}