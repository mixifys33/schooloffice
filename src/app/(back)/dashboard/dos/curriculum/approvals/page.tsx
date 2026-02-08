'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Shield,
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
  Calendar
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * DoS CURRICULUM APPROVALS
 * 
 * Review and approve curriculum changes, lesson plans, and academic content.
 * DoS has final authority over academic content.
 */

interface CurriculumApproval {
  id: string
  type: 'lesson_plan' | 'curriculum_change' | 'assessment_plan' | 'subject_outline'
  title: string
  description: string
  submittedBy: {
    id: string
    name: string
    employeeNumber: string
    role: string
  }
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  affectedClasses: string[]
  affectedSubjects: string[]
  documents: {
    id: string
    name: string
    url: string
    type: string
  }[]
  reviewNotes?: string
  reviewedAt?: string
  dueDate?: string
}

interface ApprovalStats {
  totalPending: number
  totalApproved: number
  totalRejected: number
  needsRevision: number
  overdue: number
  urgent: number
}

export default function DoSCurriculumApprovalsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  
  const [approvals, setApprovals] = useState<CurriculumApproval[]>([])
  const [stats, setStats] = useState<ApprovalStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    needsRevision: 0,
    overdue: 0,
    urgent: 0
  })

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dos/curriculum/approvals')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to load approvals')
      }

      const data = await response.json()
      setApprovals(data.approvals)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading approvals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         approval.submittedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || approval.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-[var(--chart-green)] bg-[var(--success-light)] border-[var(--success-light)]'
      case 'rejected': return 'text-[var(--chart-red)] bg-[var(--danger-light)] border-[var(--danger-light)]'
      case 'needs_revision': return 'text-[var(--chart-yellow)] bg-[var(--warning-light)] border-[var(--warning-light)]'
      case 'pending': return 'text-[var(--chart-blue)] bg-[var(--info-light)] border-[var(--info-light)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border-[var(--border-default)]'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-[var(--chart-red)] bg-[var(--danger-light)]'
      case 'high': return 'text-[var(--chart-yellow)] bg-[var(--warning-light)]'
      case 'medium': return 'text-[var(--chart-yellow)] bg-[var(--warning-light)]'
      case 'low': return 'text-[var(--chart-green)] bg-[var(--success-light)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)]'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson_plan': return <FileText className="w-4 h-4" />
      case 'curriculum_change': return <BookOpen className="w-4 h-4" />
      case 'assessment_plan': return <Shield className="w-4 h-4" />
      case 'subject_outline': return <Building2 className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/dos/curriculum/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update approval')
      }

      // Reload approvals
      loadApprovals()
    } catch (err) {
      console.error('Error updating approval:', err)
      setError(err instanceof Error ? err.message : 'Failed to update approval')
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Curriculum Approvals</h1>
          <p className="text-[var(--text-secondary)] mt-1">Review and approve academic content and curriculum changes</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <Shield className="w-4 h-4 inline mr-1" />
              <strong>DoS Authority:</strong> You have final approval over all academic content and curriculum changes.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadApprovals}
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
            <Clock className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--info-dark)]">{stats.totalPending}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Urgent</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{stats.urgent}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Overdue</p>
              <p className="text-2xl font-bold text-[var(--warning-dark)]">{stats.overdue}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Approved</p>
              <p className="text-2xl font-bold text-[var(--success-dark)]">{stats.totalApproved}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {stats.urgent > 0 && (
        <AlertBanner
          type="error"
          title="Urgent Approvals"
          message={`${stats.urgent} urgent approval${stats.urgent !== 1 ? 's require' : ' requires'} immediate attention.`}
        />
      )}

      {stats.overdue > 0 && (
        <AlertBanner
          type="warning"
          title="Overdue Approvals"
          message={`${stats.overdue} approval${stats.overdue !== 1 ? 's are' : ' is'} overdue.`}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search approvals..."
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="needs_revision">Needs Revision</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Approvals Found</h3>
            <p className="text-[var(--text-secondary)]">No approvals match your search criteria.</p>
          </Card>
        ) : (
          filteredApprovals.map((approval) => (
            <Card key={approval.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start">
                  {getTypeIcon(approval.type)}
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{approval.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{approval.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span>By: {approval.submittedBy.name}</span>
                      <span>Submitted: {new Date(approval.submittedAt).toLocaleDateString()}</span>
                      {approval.dueDate && (
                        <span>Due: {new Date(approval.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(approval.priority)}>
                    {approval.priority.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(approval.status)}>
                    {approval.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Affected Areas */}
              <div className="mb-4">
                <div className="flex items-center gap-4 text-sm">
                  {approval.affectedClasses.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">Classes: {approval.affectedClasses.join(', ')}</span>
                    </div>
                  )}
                  {approval.affectedSubjects.length > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">Subjects: {approval.affectedSubjects.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {approval.documents.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Documents:</h4>
                  <div className="flex flex-wrap gap-2">
                    {approval.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] rounded text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                      >
                        <FileText className="w-3 h-3" />
                        {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {approval.reviewNotes && (
                <div className="mb-4 p-3 bg-[var(--bg-surface)] rounded">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">Review Notes:</h4>
                  <p className="text-sm text-[var(--text-primary)]">{approval.reviewNotes}</p>
                </div>
              )}

              {/* Actions */}
              {approval.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproval(approval.id, 'approve')}
                    className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(approval.id, 'reject')}
                    className="border-[var(--danger)] text-[var(--chart-red)] hover:bg-[var(--danger-light)]"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}