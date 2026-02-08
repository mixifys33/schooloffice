'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Eye,
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  Settings,
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
 * DoS Exam Control Zone (80%)
 * 
 * Purpose: Ensure exams are valid, complete, and locked.
 * Key rule: Unlocked exams = no score merge = no reports.
 */

interface ExamControlData {
  overview: {
    totalExams: number
    approvedExams: number
    lockedExams: number
    markingProgress: number
    averageScore: number
    pastDueExams: number
  }

  examStatus: Array<{
    id: string
    examName: string
    subjectName: string
    className: string
    teacherName: string
    examType: string
    totalMarks: number
    examDate: string
    isLocked: boolean
    dosApproved: boolean
    studentsCount: number
    markedCount: number
    markingProgress: number
    averageScore: number
    isPastDue: boolean
    hasAnomalies: boolean
    canApprove: boolean
    canLock: boolean
  }>

  criticalIssues: Array<{
    id: string
    title: string
    description: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    affectedClasses: number
    actionUrl: string
  }>

  systemStatus: {
    examPeriodActive: boolean
    markingOpen: boolean
  }
}

export default function ExamControlPage() {
  const [data, setData] = useState<ExamControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchExamData()
  }, [])

  const fetchExamData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/exams')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exam data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch exam data')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching exam data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch exam data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchExamData(true)
  }

  const handleApproveExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/dos/exams/${examId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to approve exam')
      }

      fetchExamData(true)
    } catch (err) {
      console.error('Error approving exam:', err)
    }
  }

  const handleLockExam = async (examId: string) => {
    try {
      const response = await fetch(`/api/dos/exams/${examId}/lock`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to lock exam')
      }

      fetchExamData(true)
    } catch (err) {
      console.error('Error locking exam:', err)
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
            <h1 className="text-2xl font-bold">Exam Control</h1>
            <p className="text-[var(--text-secondary)]">Exam validation & marking oversight (80%)</p>
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
            <h1 className="text-2xl font-bold">Exam Control</h1>
            <p className="text-[var(--text-secondary)]">Exam validation & marking oversight (80%)</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load exam data"
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

  const filteredExams = data.examStatus.filter(exam => {
    const matchesSearch = exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'approved' && exam.dosApproved) ||
      (statusFilter === 'pending' && !exam.dosApproved) ||
      (statusFilter === 'locked' && exam.isLocked) ||
      (statusFilter === 'overdue' && exam.isPastDue)
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Exam Control
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Exam validation & marking oversight (80%) • No unlocked exams = no reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={data.systemStatus.examPeriodActive ? 
              'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]' : 
              'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]'
            }
          >
            {data.systemStatus.examPeriodActive ? (
              <>
                <GraduationCap className="h-3 w-3 mr-1" />
                Exam Period
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Normal Period
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
          title="Total Exams"
          value={data.overview.totalExams.toString()}
          subtitle={`${data.overview.lockedExams} locked`}
          color="blue"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Marking Progress"
          value={`${data.overview.markingProgress.toFixed(1)}%`}
          subtitle={`${data.overview.pastDueExams} past due`}
          color={data.overview.markingProgress >= 90 ? "green" : data.overview.markingProgress >= 70 ? "yellow" : "red"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Average Score"
          value={`${data.overview.averageScore.toFixed(1)}%`}
          subtitle="Across all exams"
          color="purple"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Approved"
          value={data.overview.approvedExams.toString()}
          subtitle="DoS approved exams"
          color={data.overview.approvedExams === data.overview.totalExams ? "green" : "yellow"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      {/* Critical Issues */}
      {data.criticalIssues.length > 0 && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
              Critical Exam Issues
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
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="locked">Locked</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>
      </div>

      {/* Exams List */}
      <div className="space-y-4">
        {filteredExams.map((exam) => (
          <Card key={exam.id} className={cn(
            "relative",
            exam.isPastDue && "border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]",
            exam.hasAnomalies && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]",
            exam.isLocked && "border-[var(--info-light)] bg-[var(--info-light)] dark:bg-[var(--info-dark)] dark:border-[var(--info-dark)]"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{exam.examName}</h3>
                    <Badge variant="outline">{exam.examType}</Badge>
                    {exam.isLocked ? (
                      <Lock className="h-4 w-4 text-[var(--chart-blue)]" />
                    ) : exam.dosApproved ? (
                      <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                    ) : exam.isPastDue ? (
                      <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
                    ) : (
                      <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Subject:</span>
                      <div className="font-medium">{exam.subjectName}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Class:</span>
                      <div className="font-medium">{exam.className}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Teacher:</span>
                      <div className="font-medium">{exam.teacherName}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Exam Date:</span>
                      <div className="font-medium">
                        {new Date(exam.examDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-[var(--text-muted)]">Total Marks:</span>
                      <div className="font-medium">{exam.totalMarks}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Students:</span>
                      <div className="font-medium">{exam.studentsCount}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Marked:</span>
                      <div className={cn(
                        "font-medium",
                        exam.markingProgress >= 100 ? "text-[var(--chart-green)]" :
                        exam.markingProgress >= 80 ? "text-[var(--chart-yellow)]" : "text-[var(--chart-red)]"
                      )}>
                        {exam.markedCount}/{exam.studentsCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Average:</span>
                      <div className="font-medium">{exam.averageScore.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-[var(--text-secondary)]">Marking Progress</span>
                      <span className={cn(
                        "text-sm font-medium",
                        exam.markingProgress >= 100 ? "text-[var(--chart-green)]" :
                        exam.markingProgress >= 80 ? "text-[var(--chart-yellow)]" : "text-[var(--chart-red)]"
                      )}>
                        {exam.markingProgress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          exam.markingProgress >= 100 ? "bg-[var(--success)]" :
                          exam.markingProgress >= 80 ? "bg-[var(--warning)]" : "bg-[var(--danger)]"
                        )}
                        style={{ width: `${Math.min(exam.markingProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Alerts */}
                  {(exam.isPastDue || exam.hasAnomalies) && (
                    <div className="mt-3 space-y-2">
                      {exam.isPastDue && (
                        <div className="p-2 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] rounded">
                          <div className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Marking deadline passed</span>
                          </div>
                        </div>
                      )}
                      {exam.hasAnomalies && (
                        <div className="p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                          <div className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Score anomalies detected</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/dos/exams/${exam.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  {exam.canApprove && !exam.dosApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveExam(exam.id)}
                      className="text-[var(--chart-green)] border-[var(--success-light)] hover:bg-[var(--success-light)]"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {exam.canLock && !exam.isLocked && exam.markingProgress >= 100 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLockExam(exam.id)}
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
    </div>
  )
}