'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Eye,
  Ban,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Download,
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
 * DoS Score Control Zone (The Danger Zone)
 * 
 * This is where most systems lie.
 * 
 * Purpose: Make the 20% + 80% merge transparent and defensible.
 * 
 * What the DoS sees per class, per subject:
 * - CA score (scaled to 20)
 * - Exam score (scaled to 80)  
 * - Final score (100)
 * - Grade
 * - Outliers and anomalies
 * 
 * What the DoS can do:
 * - Review subject results
 * - Block suspicious results
 * - Approve final scores
 * - Lock results for reporting
 * 
 * Once locked, numbers become history.
 */

interface ScoreControlData {
  overview: {
    totalStudents: number
    calculatedScores: number
    approvedScores: number
    lockedScores: number
    anomaliesDetected: number
    averageFinalScore: number
    passRate: number
    gradeDistribution: {
      A: number
      B: number
      C: number
      D: number
      E: number
    }
  }

  classScores: Array<{
    classId: string
    className: string
    studentCount: number
    subjectsCount: number
    calculatedSubjects: number
    approvedSubjects: number
    lockedSubjects: number
    averageScore: number
    passRate: number
    anomaliesCount: number
    readyForReports: boolean
    blockers: string[]
  }>

  subjectScores: Array<{
    id: string
    subjectName: string
    className: string
    teacherName: string
    studentCount: number
    caAverage: number
    examAverage: number
    finalAverage: number
    passRate: number
    gradeDistribution: {
      A: number
      B: number
      C: number
      D: number
      E: number
    }
    hasAnomalies: boolean
    anomalySeverity: 'LOW' | 'MEDIUM' | 'HIGH'
    anomalyTypes: string[]
    dosApproved: boolean
    isLocked: boolean
    canApprove: boolean
    canBlock: boolean
    canLock: boolean
  }>

  anomalies: Array<{
    id: string
    type: 'SCORE_OUTLIER' | 'CA_EXAM_MISMATCH' | 'GRADE_INFLATION' | 'SUSPICIOUS_PATTERN'
    subjectName: string
    className: string
    studentName: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    caScore: number
    examScore: number
    finalScore: number
    expectedRange: string
    recommendation: string
    requiresAction: boolean
  }>

  criticalIssues: Array<{
    id: string
    type: string
    title: string
    description: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    affectedClasses: number
    affectedStudents: number
    actionRequired: string
    actionUrl: string
  }>

  systemStatus: {
    calculationEngine: 'ACTIVE' | 'MAINTENANCE' | 'ERROR'
    anomalyDetection: boolean
    scoreLocking: boolean
    lastCalculation: string
  }
}

export default function ScoreControlPage() {
  const [data, setData] = useState<ScoreControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters and view state
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [anomalyFilter, setAnomalyFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'classes' | 'subjects' | 'anomalies'>('classes')

  useEffect(() => {
    fetchScoreData()
  }, [])

  const fetchScoreData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/scores')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch score data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch score data')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching score data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch score data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchScoreData(true)
  }

  const handleApproveSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/dos/scores/${subjectId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to approve subject scores')
      }

      fetchScoreData(true)
    } catch (err) {
      console.error('Error approving subject:', err)
    }
  }

  const handleBlockSubject = async (subjectId: string, reason: string) => {
    try {
      const response = await fetch(`/api/dos/scores/${subjectId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        throw new Error('Failed to block subject scores')
      }

      fetchScoreData(true)
    } catch (err) {
      console.error('Error blocking subject:', err)
    }
  }

  const handleLockSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/dos/scores/${subjectId}/lock`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to lock subject scores')
      }

      fetchScoreData(true)
    } catch (err) {
      console.error('Error locking subject:', err)
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

  const getAnomalyIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4 text-[var(--chart-yellow)]" />
      case 'LOW': return <AlertTriangle className="h-4 w-4 text-[var(--chart-blue)]" />
      default: return <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Score Control</h1>
            <p className="text-[var(--text-secondary)]">20/80 merge & approval (The Danger Zone)</p>
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
            <h1 className="text-2xl font-bold">Score Control</h1>
            <p className="text-[var(--text-secondary)]">20/80 merge & approval (The Danger Zone)</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load score data"
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Score Control
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            20/80 merge & approval (The Danger Zone) • Once locked, numbers become history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={data.systemStatus.calculationEngine === 'ACTIVE' ? 
              'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]' : 
              'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
            }
          >
            <Calculator className="h-3 w-3 mr-1" />
            {data.systemStatus.calculationEngine}
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
          title="Total Students"
          value={data.overview.totalStudents.toString()}
          subtitle={`${data.overview.calculatedScores} scores calculated`}
          color="blue"
          icon={<Calculator className="h-5 w-5" />}
        />
        <StatCard
          title="Average Score"
          value={`${data.overview.averageFinalScore.toFixed(1)}%`}
          subtitle={`${data.overview.passRate.toFixed(1)}% pass rate`}
          color={data.overview.passRate >= 70 ? "green" : data.overview.passRate >= 50 ? "yellow" : "red"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Approved Scores"
          value={data.overview.approvedScores.toString()}
          subtitle={`${data.overview.lockedScores} locked`}
          color={data.overview.approvedScores === data.overview.calculatedScores ? "green" : "yellow"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Anomalies"
          value={data.overview.anomaliesDetected.toString()}
          subtitle="Require DoS review"
          color={data.overview.anomaliesDetected === 0 ? "green" : data.overview.anomaliesDetected > 10 ? "red" : "yellow"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Critical Issues */}
      {data.criticalIssues.length > 0 && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
              Critical Score Issues
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
                      {issue.affectedClasses} classes • {issue.affectedStudents} students affected
                    </p>
                  </div>
                  <Link href={issue.actionUrl}>
                    <Button size="sm" variant="outline">
                      {issue.actionRequired}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Grade Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(data.overview.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="text-center p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded">
                <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {count}
                </div>
                <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Grade {grade}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {((count / data.overview.totalStudents) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Mode Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'classes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('classes')}
          >
            <Calculator className="h-4 w-4 mr-1" />
            By Classes
          </Button>
          <Button
            variant={viewMode === 'subjects' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('subjects')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            By Subjects
          </Button>
          <Button
            variant={viewMode === 'anomalies' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('anomalies')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Anomalies ({data.anomalies.length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          {viewMode === 'anomalies' && (
            <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
              <option value="all">All Anomalies</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </Select>
          )}
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="locked">Locked</option>
          </Select>
        </div>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.classScores.map((cls) => (
            <Card key={cls.classId} className={cn(
              "relative",
              cls.anomaliesCount > 0 && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]"
            )}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{cls.className}</span>
                  {cls.readyForReports ? (
                    <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
                  ) : (
                    <Clock className="h-5 w-5 text-[var(--chart-yellow)]" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Students:</span>
                      <div className="font-medium">{cls.studentCount}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Subjects:</span>
                      <div className="font-medium">{cls.subjectsCount}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Average:</span>
                      <div className="font-medium">{cls.averageScore.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Pass Rate:</span>
                      <div className="font-medium">{cls.passRate.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-[var(--success-light)] dark:bg-[var(--success-dark)] rounded">
                      <div className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                        {cls.approvedSubjects}
                      </div>
                      <div className="text-[var(--chart-green)] dark:text-[var(--success)]">Approved</div>
                    </div>
                    <div className="text-center p-2 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded">
                      <div className="font-medium text-[var(--info-dark)] dark:text-[var(--info)]">
                        {cls.lockedSubjects}
                      </div>
                      <div className="text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">Locked</div>
                    </div>
                    <div className="text-center p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                      <div className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning)]">
                        {cls.anomaliesCount}
                      </div>
                      <div className="text-[var(--chart-yellow)] dark:text-[var(--warning)]">Anomalies</div>
                    </div>
                  </div>

                  {cls.blockers.length > 0 && (
                    <div className="p-2 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] rounded">
                      <p className="text-xs text-[var(--danger-dark)] dark:text-[var(--danger)] font-medium mb-1">
                        Blockers:
                      </p>
                      <ul className="text-xs text-[var(--chart-red)] dark:text-[var(--danger)] space-y-1">
                        {cls.blockers.map((blocker, index) => (
                          <li key={index}>• {blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link href={`/dos/scores/classes/${cls.classId}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'subjects' && (
        <div className="space-y-4">
          {data.subjectScores.map((subject) => (
            <Card key={subject.id} className={cn(
              "relative",
              subject.hasAnomalies && subject.anomalySeverity === 'HIGH' && "border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]",
              subject.hasAnomalies && subject.anomalySeverity === 'MEDIUM' && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]",
              subject.isLocked && "border-[var(--info-light)] bg-[var(--info-light)] dark:bg-[var(--info-dark)] dark:border-[var(--info-dark)]"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{subject.subjectName}</h3>
                      <Badge variant="outline">{subject.className}</Badge>
                      {subject.isLocked ? (
                        <Lock className="h-4 w-4 text-[var(--chart-blue)]" />
                      ) : subject.dosApproved ? (
                        <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                      ) : (
                        <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                      )}
                      {subject.hasAnomalies && getAnomalyIcon(subject.anomalySeverity)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-[var(--text-muted)]">Teacher:</span>
                        <div className="font-medium">{subject.teacherName}</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Students:</span>
                        <div className="font-medium">{subject.studentCount}</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">CA Average:</span>
                        <div className="font-medium">{subject.caAverage.toFixed(1)}/20</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Exam Average:</span>
                        <div className="font-medium">{subject.examAverage.toFixed(1)}/80</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[var(--text-muted)]">Final Average:</span>
                        <div className="font-medium text-lg">{subject.finalAverage.toFixed(1)}/100</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Pass Rate:</span>
                        <div className={cn(
                          "font-medium",
                          subject.passRate >= 70 ? "text-[var(--chart-green)]" :
                          subject.passRate >= 50 ? "text-[var(--chart-yellow)]" : "text-[var(--chart-red)]"
                        )}>
                          {subject.passRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Grade Distribution:</span>
                        <div className="text-xs">
                          A:{subject.gradeDistribution.A} B:{subject.gradeDistribution.B} C:{subject.gradeDistribution.C} D:{subject.gradeDistribution.D} E:{subject.gradeDistribution.E}
                        </div>
                      </div>
                    </div>

                    {subject.hasAnomalies && (
                      <div className="mt-3 p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                        <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)] mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {subject.anomalySeverity} severity anomalies detected
                          </span>
                        </div>
                        <div className="text-xs text-[var(--warning)] dark:text-[var(--warning)]">
                          Types: {subject.anomalyTypes.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/dos/scores/subjects/${subject.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    {subject.canBlock && subject.hasAnomalies && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBlockSubject(subject.id, 'Anomalies detected')}
                        className="text-[var(--chart-red)] border-[var(--danger-light)] hover:bg-[var(--danger-light)]"
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {subject.canApprove && !subject.dosApproved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveSubject(subject.id)}
                        className="text-[var(--chart-green)] border-[var(--success-light)] hover:bg-[var(--success-light)]"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {subject.canLock && subject.dosApproved && !subject.isLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLockSubject(subject.id)}
                        className="text-[var(--chart-blue)] border-[var(--info-light)] hover:bg-[var(--info-light)]"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'anomalies' && (
        <div className="space-y-4">
          {data.anomalies
            .filter(anomaly => anomalyFilter === 'all' || anomaly.severity === anomalyFilter)
            .map((anomaly) => (
              <Card key={anomaly.id} className={cn(
                "relative",
                getSeverityColor(anomaly.severity).includes('red') && "border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]",
                getSeverityColor(anomaly.severity).includes('yellow') && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline">{anomaly.type.replace('_', ' ')}</Badge>
                        <span className="font-medium">{anomaly.studentName}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-[var(--text-muted)]">Subject:</span>
                          <div className="font-medium">{anomaly.subjectName}</div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)]">Class:</span>
                          <div className="font-medium">{anomaly.className}</div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)]">Expected Range:</span>
                          <div className="font-medium">{anomaly.expectedRange}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-[var(--text-muted)]">CA Score:</span>
                          <div className="font-medium">{anomaly.caScore}/20</div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)]">Exam Score:</span>
                          <div className="font-medium">{anomaly.examScore}/80</div>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)]">Final Score:</span>
                          <div className="font-medium text-lg">{anomaly.finalScore}/100</div>
                        </div>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                        {anomaly.description}
                      </p>

                      <div className="p-2 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded">
                        <p className="text-sm text-[var(--info-dark)] dark:text-[var(--info)]">
                          <strong>Recommendation:</strong> {anomaly.recommendation}
                        </p>
                      </div>
                    </div>

                    {anomaly.requiresAction && (
                      <div className="ml-4">
                        <Button size="sm" variant="outline" className="text-[var(--chart-red)] border-[var(--danger-light)]">
                          Investigate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Bulk Actions */}
      {data.overview.calculatedScores > data.overview.approvedScores && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Bulk Score Actions
                </h3>
                <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                  {data.overview.calculatedScores - data.overview.approvedScores} subjects pending DoS approval
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {/* handleBulkApprove() */}}
                  className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)]"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Clean Scores
                </Button>
                <Button
                  onClick={() => {/* handleExportAnomalies() */}}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Anomalies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}