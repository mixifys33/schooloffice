'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Eye,
  Download,
  Send,
  Users,
  Calendar,
  RefreshCw,
  Search,
  Filter,
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
 * DoS Report Control Zone (Power)
 * 
 * Purpose: Produce official academic documents, not drafts.
 * 
 * Flow:
 * - DoS selects class / term
 * - System validates: CA present, Exams present, Scores approved
 * - PDFs are generated
 * - DoS previews samples
 * - DoS releases reports
 * - Links are generated
 * 
 * What the DoS controls:
 * - When reports exist
 * - Who can access them
 * - Expiry of links
 * - Regeneration
 * 
 * Reports are outputs, not editable files.
 */

interface ReportControlData {
  overview: {
    totalClasses: number
    readyClasses: number
    generatedReports: number
    approvedReports: number
    publishedReports: number
    totalStudents: number
    reportsDownloaded: number
    averageGenerationTime: number
  }

  classReportStatus: Array<{
    classId: string
    className: string
    studentCount: number
    termName: string
    readyForGeneration: boolean
    reportsGenerated: boolean
    dosApproved: boolean
    published: boolean
    publishedAt?: string
    downloadCount: number
    linkExpiry?: string
    blockers: string[]
    validationStatus: {
      curriculumApproved: boolean
      caComplete: boolean
      examsComplete: boolean
      scoresApproved: boolean
      scoresLocked: boolean
    }
    canGenerate: boolean
    canApprove: boolean
    canPublish: boolean
    canRegenerate: boolean
  }>

  reportTemplates: Array<{
    id: string
    name: string
    type: 'NEW_CURRICULUM' | 'LEGACY'
    isDefault: boolean
    isActive: boolean
    lastModified: string
    usageCount: number
  }>

  recentActivity: Array<{
    id: string
    action: 'GENERATED' | 'APPROVED' | 'PUBLISHED' | 'DOWNLOADED' | 'REGENERATED'
    className: string
    studentCount: number
    timestamp: string
    dosUser: string
  }>

  criticalIssues: Array<{
    id: string
    type: 'VALIDATION_FAILED' | 'GENERATION_ERROR' | 'TEMPLATE_MISSING' | 'DEADLINE_APPROACHING'
    title: string
    description: string
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    affectedClasses: number
    affectedStudents: number
    actionRequired: string
    actionUrl: string
  }>

  systemStatus: {
    pdfGenerationEngine: 'ACTIVE' | 'MAINTENANCE' | 'ERROR'
    templateEngine: 'ACTIVE' | 'ERROR'
    reportingAllowed: boolean
    bulkGenerationEnabled: boolean
    lastSystemCheck: string
  }
}

export default function ReportControlPage() {
  const [data, setData] = useState<ReportControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters and view state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('current')
  const [viewMode, setViewMode] = useState<'classes' | 'templates' | 'activity'>('classes')

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch('/api/dos/reports')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch report data: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch report data')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching report data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch report data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchReportData(true)
  }

  const handleGenerateReports = async (classId: string) => {
    try {
      const response = await fetch('/api/dos/reports/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      })

      if (!response.ok) {
        throw new Error('Failed to generate reports')
      }

      fetchReportData(true)
    } catch (err) {
      console.error('Error generating reports:', err)
    }
  }

  const handleApproveReports = async (classId: string) => {
    try {
      const response = await fetch(`/api/dos/reports/cards/${classId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to approve reports')
      }

      fetchReportData(true)
    } catch (err) {
      console.error('Error approving reports:', err)
    }
  }

  const handlePublishReports = async (classId: string) => {
    try {
      const response = await fetch(`/api/dos/reports/cards/${classId}/publish`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to publish reports')
      }

      fetchReportData(true)
    } catch (err) {
      console.error('Error publishing reports:', err)
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

  const getValidationIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
    )
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'GENERATED': return 'bg-[var(--info-light)] text-[var(--info-dark)]'
      case 'APPROVED': return 'bg-[var(--success-light)] text-[var(--success-dark)]'
      case 'PUBLISHED': return 'bg-[var(--info-light)] text-[var(--info-dark)]'
      case 'DOWNLOADED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
      case 'REGENERATED': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]'
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Report Control</h1>
            <p className="text-[var(--text-secondary)]">Official document generation & release</p>
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
            <h1 className="text-2xl font-bold">Report Control</h1>
            <p className="text-[var(--text-secondary)]">Official document generation & release</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <ErrorMessage
          title="Failed to load report data"
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

  const filteredClasses = data.classReportStatus.filter(cls => {
    const matchesSearch = cls.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'ready' && cls.readyForGeneration) ||
      (statusFilter === 'generated' && cls.reportsGenerated) ||
      (statusFilter === 'approved' && cls.dosApproved) ||
      (statusFilter === 'published' && cls.published)
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Report Control
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Official document generation & release • Reports are outputs, not editable files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={data.systemStatus.reportingAllowed ? 
              'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]' : 
              'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
            }
          >
            {data.systemStatus.reportingAllowed ? (
              <>
                <Unlock className="h-3 w-3 mr-1" />
                Reporting Open
              </>
            ) : (
              <>
                <Lock className="h-3 w-3 mr-1" />
                Reporting Locked
              </>
            )}
          </Badge>
          <Badge 
            variant="outline" 
            className={data.systemStatus.pdfGenerationEngine === 'ACTIVE' ? 
              'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]' : 
              'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]'
            }
          >
            <FileText className="h-3 w-3 mr-1" />
            PDF Engine: {data.systemStatus.pdfGenerationEngine}
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
          subtitle={`${data.overview.readyClasses} ready for reports`}
          color="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Generated Reports"
          value={data.overview.generatedReports.toString()}
          subtitle={`${data.overview.totalStudents} students`}
          color="purple"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Published Reports"
          value={data.overview.publishedReports.toString()}
          subtitle={`${data.overview.reportsDownloaded} downloads`}
          color={data.overview.publishedReports === data.overview.generatedReports ? "green" : "yellow"}
          icon={<Send className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Generation Time"
          value={`${data.overview.averageGenerationTime.toFixed(1)}s`}
          subtitle="Per report card"
          color="orange"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Critical Issues */}
      {data.criticalIssues.length > 0 && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] dark:border-[var(--danger-dark)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--danger-dark)] dark:text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
              Critical Report Issues
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

      {/* View Mode Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'classes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('classes')}
          >
            <Users className="h-4 w-4 mr-1" />
            Class Reports
          </Button>
          <Button
            variant={viewMode === 'templates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('templates')}
          >
            <Settings className="h-4 w-4 mr-1" />
            Templates
          </Button>
          <Button
            variant={viewMode === 'activity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('activity')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Recent Activity
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          {viewMode === 'classes' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <option value="all">All Status</option>
              <option value="ready">Ready</option>
              <option value="generated">Generated</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </Select>
          )}
        </div>
      </div>

      {/* Main Content Based on View Mode */}
      {viewMode === 'classes' && (
        <div className="space-y-4">
          {filteredClasses.map((cls) => (
            <Card key={cls.classId} className={cn(
              "relative",
              !cls.readyForGeneration && "border-[var(--warning-light)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] dark:border-[var(--warning-dark)]",
              cls.published && "border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-medium text-lg">{cls.className}</h3>
                      <Badge variant="outline">{cls.termName}</Badge>
                      {cls.published ? (
                        <Send className="h-4 w-4 text-[var(--chart-green)]" />
                      ) : cls.dosApproved ? (
                        <CheckCircle className="h-4 w-4 text-[var(--chart-blue)]" />
                      ) : cls.reportsGenerated ? (
                        <FileText className="h-4 w-4 text-[var(--chart-purple)]" />
                      ) : cls.readyForGeneration ? (
                        <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
                      )}
                    </div>

                    {/* Validation Status */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                        Validation Status
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          {getValidationIcon(cls.validationStatus.curriculumApproved)}
                          <span>Curriculum</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(cls.validationStatus.caComplete)}
                          <span>CA Complete</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(cls.validationStatus.examsComplete)}
                          <span>Exams Complete</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(cls.validationStatus.scoresApproved)}
                          <span>Scores Approved</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(cls.validationStatus.scoresLocked)}
                          <span>Scores Locked</span>
                        </div>
                      </div>
                    </div>

                    {/* Report Status */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-[var(--text-muted)]">Students:</span>
                        <div className="font-medium">{cls.studentCount}</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Downloads:</span>
                        <div className="font-medium">{cls.downloadCount}</div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Published:</span>
                        <div className="font-medium">
                          {cls.publishedAt ? new Date(cls.publishedAt).toLocaleDateString() : 'Not published'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Link Expiry:</span>
                        <div className="font-medium">
                          {cls.linkExpiry ? new Date(cls.linkExpiry).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Blockers */}
                    {cls.blockers.length > 0 && (
                      <div className="p-3 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] rounded mb-3">
                        <h4 className="text-sm font-medium text-[var(--danger-dark)] dark:text-[var(--danger)] mb-2">
                          Blockers preventing report generation:
                        </h4>
                        <ul className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] space-y-1">
                          {cls.blockers.map((blocker, index) => (
                            <li key={index}>• {blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Status Progress */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded",
                        cls.readyForGeneration ? "bg-[var(--success-light)] text-[var(--success-dark)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", cls.readyForGeneration ? "bg-[var(--chart-green)]" : "bg-[var(--border-default)]")} />
                        Ready
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded",
                        cls.reportsGenerated ? "bg-[var(--success-light)] text-[var(--success-dark)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", cls.reportsGenerated ? "bg-[var(--chart-green)]" : "bg-[var(--border-default)]")} />
                        Generated
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded",
                        cls.dosApproved ? "bg-[var(--success-light)] text-[var(--success-dark)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", cls.dosApproved ? "bg-[var(--chart-green)]" : "bg-[var(--border-default)]")} />
                        Approved
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded",
                        cls.published ? "bg-[var(--success-light)] text-[var(--success-dark)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", cls.published ? "bg-[var(--chart-green)]" : "bg-[var(--border-default)]")} />
                        Published
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/dos/reports/classes/${cls.classId}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    {cls.canGenerate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReports(cls.classId)}
                        className="text-[var(--chart-blue)] border-[var(--info-light)] hover:bg-[var(--info-light)]"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {cls.canApprove && cls.reportsGenerated && !cls.dosApproved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveReports(cls.classId)}
                        className="text-[var(--chart-green)] border-[var(--success-light)] hover:bg-[var(--success-light)]"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {cls.canPublish && cls.dosApproved && !cls.published && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublishReports(cls.classId)}
                        className="text-[var(--chart-purple)] border-[var(--info-light)] hover:bg-[var(--info-light)]"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {cls.published && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[var(--text-secondary)] border-[var(--border-default)]"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.reportTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{template.name}</span>
                  <div className="flex items-center gap-2">
                    {template.isDefault && (
                      <Badge variant="outline" className="bg-[var(--info-light)] text-[var(--info-dark)]">
                        Default
                      </Badge>
                    )}
                    {template.isActive ? (
                      <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                    ) : (
                      <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Type:</span>
                      <div className="font-medium">{template.type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Usage:</span>
                      <div className="font-medium">{template.usageCount} times</div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[var(--text-muted)] text-sm">Last Modified:</span>
                    <div className="font-medium text-sm">
                      {new Date(template.lastModified).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href="/dos/reports/templates" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-1" />
                        Manage Templates
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'activity' && (
        <div className="space-y-4">
          {data.recentActivity.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getActionColor(activity.action)}>
                      {activity.action}
                    </Badge>
                    <div>
                      <span className="font-medium">{activity.className}</span>
                      <span className="text-[var(--text-muted)] ml-2">• {activity.studentCount} students</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-[var(--text-muted)]">
                    <div>{activity.dosUser}</div>
                    <div>{new Date(activity.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {data.overview.readyClasses > 0 && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:bg-[var(--success-dark)] dark:border-[var(--success-dark)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
                  Bulk Report Actions
                </h3>
                <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                  {data.overview.readyClasses} classes ready for report generation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {/* handleBulkGenerate() */}}
                  className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)] text-[var(--white-pure)]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate All Ready
                </Button>
                <Button
                  onClick={() => {/* handleBulkPublish() */}}
                  variant="outline"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish Approved
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}