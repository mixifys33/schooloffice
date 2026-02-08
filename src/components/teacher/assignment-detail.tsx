'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Users,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  ActionButton, 
  ErrorMessagePanel, 
  StatusBadge,
  ButtonGroup 
} from '@/components/teacher'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  transitions,
  errorMessages 
} from '@/lib/teacher-ui-standards'

/**
 * Assignment Detail View
 * Requirement 7.3: Display submission status for each student
 * Requirement 7.4: Prevent deadline modifications after deadline passes
 */

interface Submission {
  studentId: string
  studentName: string
  admissionNumber: string
  status: string
  submittedAt: string | null
  grade: string | null
}

interface Assignment {
  id: string
  title: string
  description: string
  classId: string
  subjectId: string
  className?: string
  subjectName?: string
  deadline: string
  status: string
  attachments: string[]
  submissions: Submission[]
  createdAt: string
}

interface AssignmentDetailProps {
  assignment: Assignment
  onBack: () => void
  onUpdate: () => void
}

export function AssignmentDetail({ assignment, onBack, onUpdate }: AssignmentDetailProps) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    title: assignment.title,
    description: assignment.description,
    deadline: new Date(assignment.deadline).toISOString().slice(0, 16),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const deadlinePassed = new Date(assignment.deadline) < new Date()

  const handleUpdate = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teacher/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title,
          description: editData.description,
          deadline: deadlinePassed ? undefined : new Date(editData.deadline).toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update assignment')
      }

      setEditing(false)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/teacher/assignments/${assignment.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete assignment')
      }

      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
      case 'GRADED':
        return <CheckCircle className="h-4 w-4 text-[var(--chart-green)] dark:text-[var(--success)]" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-[var(--chart-yellow)] dark:text-[var(--warning)]" />
      default:
        return <XCircle className="h-4 w-4 text-[var(--text-muted)]" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <StatusBadge status="done" label="Submitted" />
      case 'GRADED':
        return <StatusBadge status="done" label="Graded" />
      case 'LATE':
        return <StatusBadge status="error" label="Late" />
      default:
        return <StatusBadge status="pending" label="Not Submitted" />
    }
  }

  const stats = {
    total: assignment.submissions.length,
    submitted: assignment.submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length,
    late: assignment.submissions.filter(s => s.status === 'LATE').length,
    notSubmitted: assignment.submissions.filter(s => s.status === 'NOT_SUBMITTED').length,
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Header - Requirement 12.1: Dense but clean layout */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <ActionButton
            label="Back"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={onBack}
            variant="outline"
            size="sm"
          />
          <div>
            <h1 className={typography.pageTitle}>
              {assignment.title}
            </h1>
            <p className={typography.caption}>
              {assignment.className} • {assignment.subjectName}
            </p>
          </div>
        </div>
        
        {/* Action buttons - Requirements 12.2, 12.3 */}
        <ButtonGroup>
          <ActionButton
            label="Edit"
            icon={<Edit2 className="h-4 w-4" />}
            onClick={() => setEditing(!editing)}
            variant="outline"
            size="sm"
          />
          <ActionButton
            label="Delete"
            icon={deleting ? <Loader2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            isLoading={deleting}
            variant="outline"
            size="sm"
            className="text-[var(--chart-red)] hover:text-[var(--chart-red)] dark:text-[var(--danger)]"
          />
        </ButtonGroup>
      </div>

      {/* Error display - Requirement 12.4: Clear error messages */}
      {error && (
        <ErrorMessagePanel
          config={{
            title: 'Assignment Error',
            message: error,
            nextSteps: ['Check your connection and try again', 'Contact support if the problem persists']
          }}
          onRetry={() => setError(null)}
        />
      )}

      {/* Edit Form */}
      {editing && (
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <div className={cn(cardStyles.header, 'mb-4')}>
            <h2 className={typography.sectionTitle}>Edit Assignment</h2>
          </div>
          <form className={spacing.form}>
            <div>
              <label htmlFor="edit-title" className={cn(typography.label, 'block mb-1')}>
                Title
              </label>
              <input
                id="edit-title"
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 rounded-md border',
                  'bg-[var(--bg-main)] dark:bg-slate-800',
                  'border-slate-300 dark:border-slate-600',
                  'text-[var(--text-primary)] dark:text-[var(--white-pure)]',
                  'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                  transitions.color
                )}
              />
            </div>
            <div>
              <label htmlFor="edit-description" className={cn(typography.label, 'block mb-1')}>
                Description
              </label>
              <textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className={cn(
                  'w-full px-3 py-2 rounded-md border min-h-[100px]',
                  'bg-[var(--bg-main)] dark:bg-slate-800',
                  'border-slate-300 dark:border-slate-600',
                  'text-[var(--text-primary)] dark:text-[var(--white-pure)]',
                  'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                  transitions.color
                )}
              />
            </div>
            <div>
              <label htmlFor="edit-deadline" className={cn(typography.label, 'block mb-1')}>
                Deadline
                {deadlinePassed && (
                  <span className="ml-2 text-xs text-[var(--chart-red)] dark:text-[var(--danger)]">
                    (Cannot modify - deadline passed)
                  </span>
                )}
              </label>
              <input
                id="edit-deadline"
                type="datetime-local"
                value={editData.deadline}
                onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                disabled={deadlinePassed}
                className={cn(
                  'w-full px-3 py-2 rounded-md border',
                  'bg-[var(--bg-main)] dark:bg-slate-800',
                  'border-slate-300 dark:border-slate-600',
                  'text-[var(--text-primary)] dark:text-[var(--white-pure)]',
                  'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                  deadlinePassed && 'opacity-60 cursor-not-allowed',
                  transitions.color
                )}
              />
            </div>
            <ButtonGroup className="justify-end">
              <ActionButton
                label="Cancel"
                onClick={() => setEditing(false)}
                variant="outline"
              />
              <ActionButton
                label="Save Changes"
                onClick={handleUpdate}
                isLoading={loading}
                loadingLabel="Saving..."
                variant="primary"
              />
            </ButtonGroup>
          </form>
        </div>
      )}

      {/* Assignment Info */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={typography.sectionTitle}>Assignment Details</h2>
          <StatusBadge 
            status={deadlinePassed ? 'locked' : 'active'} 
            label={deadlinePassed ? 'Closed' : 'Active'}
          />
        </div>
        <div className={spacing.card}>
          <p className={typography.body}>{assignment.description}</p>
          <div className="flex items-center gap-6 text-sm">
            <div className={cn('flex items-center gap-1', typography.caption)}>
              <Calendar className="h-4 w-4" />
              <span>Due: {new Date(assignment.deadline).toLocaleString()}</span>
            </div>
            <div className={cn('flex items-center gap-1', typography.caption)}>
              <Users className="h-4 w-4" />
              <span>{stats.total} students</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Stats - Requirement 12.1: Dense layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={cn(cardStyles.base, cardStyles.compact, 'text-center')}>
          <div className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">{stats.total}</div>
          <div className={typography.caption}>Total Students</div>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact, 'text-center')}>
          <div className="text-2xl font-bold text-[var(--chart-green)] dark:text-[var(--success)]">{stats.submitted}</div>
          <div className={typography.caption}>Submitted</div>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact, 'text-center')}>
          <div className="text-2xl font-bold text-[var(--chart-yellow)] dark:text-[var(--warning)]">{stats.late}</div>
          <div className={typography.caption}>Late</div>
        </div>
        <div className={cn(cardStyles.base, cardStyles.compact, 'text-center')}>
          <div className="text-2xl font-bold text-[var(--text-muted)]">{stats.notSubmitted}</div>
          <div className={typography.caption}>Not Submitted</div>
        </div>
      </div>

      {/* Submissions List */}
      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <h2 className={cn(typography.sectionTitle, 'mb-4')}>Student Submissions</h2>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {assignment.submissions.map((submission) => (
            <div
              key={submission.studentId}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(submission.status)}
                <div>
                  <div className={typography.label}>
                    {submission.studentName}
                  </div>
                  <div className={typography.caption}>
                    {submission.admissionNumber}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {submission.submittedAt && (
                  <span className={typography.caption}>
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                )}
                {getStatusBadge(submission.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
