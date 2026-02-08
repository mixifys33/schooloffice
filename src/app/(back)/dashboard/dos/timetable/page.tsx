'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar,
  Settings,
  Play,
  CheckCircle,
  Eye,
  AlertTriangle,
  Users,
  Clock,
  BarChart3,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * DoS Timetable Management Page
 * 
 * The command center for timetable generation and management.
 * This is NOT a table editor - it's a constraint-solving control panel.
 * 
 * Core principle: DoS has absolute authority over timetables.
 */

interface TimetableOverview {
  currentTimetable?: {
    id: string
    version: number
    status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
    score: number
    conflictsCount: number
    generatedAt: string
    approvedAt?: string
    publishedAt?: string
  }
  stats: {
    totalSlots: number
    teachersAssigned: number
    classesScheduled: number
    subjectsCovered: number
    utilizationRate: number
  }
  conflicts: {
    critical: number
    warnings: number
    info: number
  }
  workloadSummary: {
    overloadedTeachers: number
    underloadedTeachers: number
    balancedTeachers: number
    averagePeriods: number
  }
}

export default function DoSTimetablePage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [overview, setOverview] = useState<TimetableOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<string>('')

  useEffect(() => {
    loadTimetableOverview()
  }, [selectedTerm])

  const loadTimetableOverview = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock data for demonstration
      const mockOverview: TimetableOverview = {
        currentTimetable: {
          id: 'tt_001',
          version: 3,
          status: 'APPROVED',
          score: 87.5,
          conflictsCount: 2,
          generatedAt: '2024-01-15T10:30:00Z',
          approvedAt: '2024-01-15T14:20:00Z'
        },
        stats: {
          totalSlots: 240,
          teachersAssigned: 18,
          classesScheduled: 12,
          subjectsCovered: 15,
          utilizationRate: 92.3
        },
        conflicts: {
          critical: 0,
          warnings: 2,
          info: 3
        },
        workloadSummary: {
          overloadedTeachers: 1,
          underloadedTeachers: 2,
          balancedTeachers: 15,
          averagePeriods: 22.4
        }
      }

      setOverview(mockOverview)
    } catch (err) {
      console.error('Error loading timetable overview:', err)
      setError(err instanceof Error ? err.message : 'Failed to load timetable data')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateTimetable = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch('/api/dos/timetable/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          termId: selectedTerm || 'current_term',
          regenerateFromScratch: false,
          preserveApprovedSlots: true,
          generationOptions: {
            maxIterations: 1000,
            timeoutMinutes: 10,
            prioritizeSoftConstraints: true,
            allowMinorConflicts: false,
            optimizeFor: 'BALANCED'
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate timetable')
      }

      // Reload overview to show new timetable
      await loadTimetableOverview()

    } catch (err) {
      console.error('Error generating timetable:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate timetable')
    } finally {
      setGenerating(false)
    }
  }

  const handleApproveTimetable = async () => {
    if (!overview?.currentTimetable) return

    try {
      const response = await fetch(`/api/dos/timetable/${overview.currentTimetable.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalNotes: 'Approved via DoS dashboard'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to approve timetable')
      }

      // Reload overview
      await loadTimetableOverview()

    } catch (err) {
      console.error('Error approving timetable:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve timetable')
    }
  }

  const handlePublishTimetable = async () => {
    if (!overview?.currentTimetable) return

    try {
      const response = await fetch(`/api/dos/timetable/${overview.currentTimetable.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifyTeachers: true,
          generatePDFs: true,
          publishToPortals: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to publish timetable')
      }

      // Reload overview
      await loadTimetableOverview()

    } catch (err) {
      console.error('Error publishing timetable:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish timetable')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
      case 'REVIEWED': return 'bg-[var(--info-light)] text-[var(--info-dark)]'
      case 'APPROVED': return 'bg-[var(--success-light)] text-[var(--success-dark)]'
      case 'PUBLISHED': return 'bg-[var(--info-light)] text-[var(--info-dark)]'
      case 'ARCHIVED': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]'
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[var(--chart-green)]'
    if (score >= 75) return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-red)]'
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonLoader rows={2} />
          <SkeletonLoader rows={1} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} rows={3} />
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timetable Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Constraint-based timetable generation and approval</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerateTimetable}
            disabled={generating}
            className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Timetable
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadTimetableOverview}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
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

      {/* Current Timetable Status */}
      {overview?.currentTimetable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Current Timetable (Version {overview.currentTimetable.version})
                </CardTitle>
                <CardDescription>
                  Generated on {new Date(overview.currentTimetable.generatedAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(overview.currentTimetable.status)}>
                {overview.currentTimetable.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(overview.currentTimetable.score)}`}>
                  {overview.currentTimetable.score.toFixed(1)}%
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Quality Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {overview.currentTimetable.conflictsCount}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Conflicts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {overview.stats.utilizationRate.toFixed(1)}%
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Utilization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">
                  {overview.stats.totalSlots}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Total Slots</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {overview.currentTimetable.status === 'DRAFT' && (
                <Button
                  onClick={handleApproveTimetable}
                  disabled={overview.conflicts.critical > 0}
                  className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Timetable
                </Button>
              )}
              
              {overview.currentTimetable.status === 'APPROVED' && (
                <Button
                  onClick={handlePublishTimetable}
                  className="bg-[var(--chart-purple)] hover:bg-[var(--chart-purple)]"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Publish Timetable
                </Button>
              )}

              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>

              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Edit Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.stats.teachersAssigned || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in timetable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.stats.classesScheduled || 0}</div>
            <p className="text-xs text-muted-foreground">
              All classes covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects Covered</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.stats.subjectsCovered || 0}</div>
            <p className="text-xs text-muted-foreground">
              Curriculum compliant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.stats.utilizationRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Resource efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts & Workload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conflicts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Conflicts Analysis
            </CardTitle>
            <CardDescription>
              Constraint violations that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--danger)] rounded-full"></div>
                  <span className="text-sm">Critical</span>
                </div>
                <Badge variant="destructive">{overview?.conflicts.critical || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--warning)] rounded-full"></div>
                  <span className="text-sm">Warnings</span>
                </div>
                <Badge variant="secondary">{overview?.conflicts.warnings || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--accent-primary)] rounded-full"></div>
                  <span className="text-sm">Info</span>
                </div>
                <Badge variant="outline">{overview?.conflicts.info || 0}</Badge>
              </div>
            </div>

            {overview?.conflicts.critical === 0 && overview?.conflicts.warnings === 0 ? (
              <div className="mt-4 p-3 bg-[var(--success-light)] border border-[var(--success-light)] rounded-lg">
                <p className="text-sm text-[var(--success-dark)]">
                  ✓ No critical conflicts detected. Timetable is ready for approval.
                </p>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg">
                <p className="text-sm text-[var(--warning-dark)]">
                  ⚠ Conflicts detected. Review before approval.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teacher Workload
            </CardTitle>
            <CardDescription>
              Distribution of teaching periods across staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overloaded</span>
                <Badge variant="destructive">{overview?.workloadSummary.overloadedTeachers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Balanced</span>
                <Badge variant="success">{overview?.workloadSummary.balancedTeachers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Underloaded</span>
                <Badge variant="secondary">{overview?.workloadSummary.underloadedTeachers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Periods</span>
                <span className="font-medium">{overview?.workloadSummary.averagePeriods.toFixed(1) || 0}</span>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Detailed Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common timetable management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Configure Constraints
            </Button>
            <Button variant="outline" className="justify-start">
              <Clock className="w-4 h-4 mr-2" />
              Set Time Structure
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}