'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Filter,
  Search,
  RefreshCw,
  Eye,
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
import { CurriculumSubjectsManager } from '@/components/dos/curriculum-subjects-manager'
import { cn } from '@/lib/utils'

/**
 * DoS Curriculum Control Zone
 * 
 * Purpose: Ensure subjects, competencies, and weighting are correct.
 * 
 * What the DoS does:
 * - Approves subject offerings per class
 * - Confirms competencies per subject  
 * - Confirms assessment structure
 * - Locks curriculum for the term
 * 
 * Key rule: If curriculum is not approved:
 * - No CA entry
 * - No exams  
 * - No reports
 * 
 * This forces discipline.
 */

interface CurriculumControlData {
  overview: {
    totalClasses: number
    totalSubjects: number
    approvedSubjects: number
    pendingApproval: number
    lockedClasses: number
    complianceRate: number
  }
  
  classStatus: Array<{
    classId: string
    className: string
    level: number
    studentCount: number
    totalSubjects: number
    approvedSubjects: number
    pendingSubjects: number
    isLocked: boolean
    lockedAt?: string
    lockedBy?: string
    complianceRate: number
    blockers: string[]
  }>
  
  subjectStatus: Array<{
    id: string
    subjectName: string
    subjectCode: string
    className: string
    classId: string
    isCore: boolean
    periodsPerWeek: number
    practicalPeriods: number
    caWeight: number
    examWeight: number
    minPassMark: number
    dosApproved: boolean
    dosApprovedAt?: string
    dosApprovedBy?: string
    createdAt: string
    teacherAssigned: boolean
    teacherName?: string
    canApprove: boolean
    canEdit: boolean
  }>
  
  pendingActions: Array<{
    id: string
    type: 'APPROVAL' | 'REVIEW' | 'LOCK' | 'UNLOCK'
    title: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    classesAffected: number
    actionUrl: string
  }>
  
  systemStatus: {
    dataEntryAllowed: boolean
    curriculumLocked: boolean
    termStatus: 'PLANNING' | 'ACTIVE' | 'EXAM_PERIOD' | 'CLOSED'
    lastUpdate: string
  }
}

export default function CurriculumControlPage() {
  const [data, setData] = useState<CurriculumControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'classes' | 'subjects'>('classes')

  useEffect(() => {
    fetchCurriculumData()
  }, [])

  const fetchCurriculumData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/curriculum/overview')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch curriculum data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch curriculum data')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching curriculum data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch curriculum data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchCurriculumData(true)
  }

  const handleBulkApprove = async (classId?: string) => {
    try {
      const response = await fetch('/api/dos/curriculum/subjects/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })

      if (!response.ok) {
        throw new Error('Failed to bulk approve subjects')
      }

      // Refresh data
      fetchCurriculumData(true)
    } catch (err) {
      console.error('Error bulk approving:', err)
      // Handle error (show toast, etc.)
    }
  }

  const handleLockClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/dos/curriculum/classes/${classId}/lock`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to lock class curriculum')
      }

      // Refresh data
      fetchCurriculumData(true)
    } catch (err) {
      console.error('Error locking class:', err)
      // Handle error
    }
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 100) return 'text-[var(--chart-green)]'
    if (rate >= 80) return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-red)]'
  }

  const getComplianceIcon = (rate: number) => {
    if (rate >= 100) return <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
    if (rate >= 80) return <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
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

  // Filter data
  const filteredClasses = data?.classStatus.filter(cls => {
    const matchesSearch = cls.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && cls.complianceRate === 100) ||
      (statusFilter === 'pending' && cls.complianceRate < 100) ||
      (statusFilter === 'locked' && cls.isLocked)
    return matchesSearch && matchesStatus
  }) || []

  const filteredSubjects = data?.subjectStatus.filter(subject => {
    const matchesSearch = subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = classFilter === 'all' || subject.classId === classFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'approved' && subject.dosApproved) ||
      (statusFilter === 'pending' && !subject.dosApproved)
    return matchesSearch && matchesClass && matchesStatus
  }) || []

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Curriculum Control</h1>
            <p className="text-[var(--text-secondary)]">Academic structure approval & management</p>
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
            <h1 className="text-2xl font-bold">Curriculum Control</h1>
            <p className="text-[var(--text-secondary)]">Academic structure approval & management</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load curriculum data"
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
            Curriculum Control
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Academic structure approval & management • Controlled Truth
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={data.systemStatus.dataEntryAllowed ? 
              'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]' : 
              'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
            }
          >
            {data.systemStatus.dataEntryAllowed ? (
              <>
                <Unlock className="h-3 w-3 mr-1" />
                Entry Open
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Entry Locked
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
          title="Total Classes"
          value={data.overview.totalClasses.toString()}
          subtitle="Academic classes"
          color="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Subjects"
          value={data.overview.totalSubjects.toString()}
          subtitle="Curriculum subjects"
          color="purple"
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Approved"
          value={data.overview.approvedSubjects.toString()}
          subtitle={`${data.overview.pendingApproval} pending`}
          color={data.overview.pendingApproval === 0 ? "green" : "yellow"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Compliance"
          value={`${data.overview.complianceRate.toFixed(1)}%`}
          subtitle="Overall approval rate"
          color={data.overview.complianceRate >= 100 ? "green" : data.overview.complianceRate >= 80 ? "yellow" : "red"}
          icon={getComplianceIcon(data.overview.complianceRate)}
        />
      </div>

      {/* Pending Actions */}
      {data.pendingActions.length > 0 && (
        <Card className="border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--warning-dark)] dark:text-[var(--warning)]">
              <Clock className="h-5 w-5" />
              Pending DoS Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.pendingActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getPriorityColor(action.priority)}>
                        {action.priority}
                      </Badge>
                      <span className="font-medium">{action.title}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {action.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {action.classesAffected} classes affected
                    </p>
                  </div>
                  <Link href={action.actionUrl}>
                    <Button size="sm" variant="outline">
                      Action Required
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'classes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('classes')}
            >
              <Users className="h-4 w-4 mr-1" />
              By Classes
            </Button>
            <Button
              variant={viewMode === 'subjects' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('subjects')}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              By Subjects
            </Button>
          </div>
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
          
          {viewMode === 'subjects' && (
            <Select
              value={classFilter}
              onValueChange={setClassFilter}
            >
              <option value="all">All Classes</option>
              {data.classStatus.map((cls) => (
                <option key={cls.classId} value={cls.classId}>
                  {cls.className}
                </option>
              ))}
            </Select>
          )}
          
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            {viewMode === 'classes' && <option value="locked">Locked</option>}
          </Select>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'classes' ? (
        /* Classes View */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.classId} className={cn(
              "relative",
              cls.isLocked && "border-[var(--info-light)] bg-[var(--info-light)] dark:bg-[var(--info-dark)] dark:border-[var(--info-dark)]"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {cls.className}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {cls.isLocked ? (
                      <Lock className="h-4 w-4 text-[var(--chart-blue)]" />
                    ) : (
                      getComplianceIcon(cls.complianceRate)
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Students:</span>
                      <span className="ml-2 font-medium">{cls.studentCount}</span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Subjects:</span>
                      <span className="ml-2 font-medium">{cls.totalSubjects}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Approval Progress</span>
                      <span className={cn("text-sm font-medium", getComplianceColor(cls.complianceRate))}>
                        {cls.complianceRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          cls.complianceRate >= 100 ? "bg-[var(--success)]" :
                          cls.complianceRate >= 80 ? "bg-[var(--warning)]" : "bg-[var(--danger)]"
                        )}
                        style={{ width: `${Math.min(cls.complianceRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-[var(--success-light)] dark:bg-[var(--success-dark)] rounded">
                      <div className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                        {cls.approvedSubjects}
                      </div>
                      <div className="text-[var(--chart-green)] dark:text-[var(--success)]">Approved</div>
                    </div>
                    <div className="text-center p-2 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded">
                      <div className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning)]">
                        {cls.pendingSubjects}
                      </div>
                      <div className="text-[var(--chart-yellow)] dark:text-[var(--warning)]">Pending</div>
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

                  <div className="flex gap-2 pt-2">
                    <Link href={`/dos/curriculum/classes/${cls.classId}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    
                    {!cls.isLocked && cls.pendingSubjects === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLockClass(cls.classId)}
                        className="text-[var(--chart-blue)] border-[var(--info-light)] hover:bg-[var(--info-light)]"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {cls.pendingSubjects > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkApprove(cls.classId)}
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
      ) : (
        /* Subjects View */
        <CurriculumSubjectsManager
          curriculumSubjects={filteredSubjects}
          schoolId={data.overview.totalClasses.toString()} // This should be actual schoolId
          userId="current-user" // This should be actual userId
        />
      )}

      {/* Bulk Actions */}
      {data.overview.pendingApproval > 0 && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Bulk Actions Available
                </h3>
                <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                  {data.overview.pendingApproval} subjects pending approval across all classes
                </p>
              </div>
              <Button
                onClick={() => handleBulkApprove()}
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