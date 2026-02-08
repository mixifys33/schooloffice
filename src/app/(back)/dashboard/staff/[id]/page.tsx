'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft,
  RefreshCw,
  User,
  Shield,
  BarChart3,
  History,
  FileText,
  ClipboardList,
  Mail,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Role, StaffRole, StaffStatus, StaffEventType, AlertSeverity } from '@/types/enums'
import type { 
  StaffProfile, 
  PermissionSummary, 
  PerformanceSummary,
  StaffResponsibility,
  StaffHistoryEntry,
  StaffAlert
} from '@/types/staff-dashboard'

/**
 * Staff Profile Page
 * Requirements: 8.5, 8.6, 8.7, 8.8
 * - Located at /dashboard/staff/[id]
 * - Displays tabbed interface: Overview, Roles, Performance, History, Documents, Audit
 * - Overview tab: identity and employment info
 * - Roles tab: role management with assign/remove
 * - Performance tab: metrics display
 * - History tab: timeline of events
 * - Documents tab: document list
 * - Audit tab: audit trail entries
 * - Provides deactivate button instead of delete
 * - Displays audit trail for staff member
 */

type TabId = 'overview' | 'roles' | 'performance' | 'history' | 'documents' | 'audit'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'audit', label: 'Audit', icon: ClipboardList },
]

// Format role for display
function formatRole(role: StaffRole | Role): string {
  const roleLabels: Record<string, string> = {
    [Role.TEACHER]: 'Teacher',
    [Role.SCHOOL_ADMIN]: 'School Admin',
    [Role.DEPUTY]: 'Deputy',
    [Role.ACCOUNTANT]: 'Accountant',
    [StaffRole.CLASS_TEACHER]: 'Class Teacher',
    [StaffRole.DOS]: 'Director of Studies',
    [StaffRole.BURSAR]: 'Bursar',
    [StaffRole.HOSTEL_STAFF]: 'Hostel Staff',
    [StaffRole.SUPPORT_STAFF]: 'Support Staff',
  }
  return roleLabels[role] || role
}

// Format date
function formatDate(date?: Date | string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format datetime
function formatDateTime(date?: Date | string): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


// Status badge component
function StatusBadge({ status }: { status: StaffStatus }) {
  const styles = {
    [StaffStatus.ACTIVE]: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]',
    [StaffStatus.INACTIVE]: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === StaffStatus.ACTIVE ? 'Active' : 'Inactive'}
    </span>
  )
}

// Permission indicator
function PermissionIndicator({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <CheckCircle className="h-4 w-4 text-[var(--success)]" />
  ) : (
    <XCircle className="h-4 w-4 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
  )
}

// Info row component
function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <dt className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{label}</dt>
        <dd className="text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-0.5">{value || '—'}</dd>
      </div>
    </div>
  )
}

// Event type badge
function EventTypeBadge({ type }: { type: StaffEventType }) {
  const styles: Record<StaffEventType, string> = {
    [StaffEventType.HIRED]: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]',
    [StaffEventType.ROLE_ASSIGNED]: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-blue)]',
    [StaffEventType.ROLE_REMOVED]: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/30 dark:text-[var(--warning)]',
    [StaffEventType.PROMOTED]: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-purple)]',
    [StaffEventType.TRANSFERRED]: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-cyan)]',
    [StaffEventType.RESPONSIBILITY_ASSIGNED]: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-indigo)]',
    [StaffEventType.RESPONSIBILITY_REMOVED]: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/30 dark:text-[var(--warning)]',
    [StaffEventType.STATUS_CHANGED]: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]',
    [StaffEventType.DEACTIVATED]: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)]/30 dark:text-[var(--danger)]',
  }
  
  const labels: Record<StaffEventType, string> = {
    [StaffEventType.HIRED]: 'Hired',
    [StaffEventType.ROLE_ASSIGNED]: 'Role Assigned',
    [StaffEventType.ROLE_REMOVED]: 'Role Removed',
    [StaffEventType.PROMOTED]: 'Promoted',
    [StaffEventType.TRANSFERRED]: 'Transferred',
    [StaffEventType.RESPONSIBILITY_ASSIGNED]: 'Responsibility Assigned',
    [StaffEventType.RESPONSIBILITY_REMOVED]: 'Responsibility Removed',
    [StaffEventType.STATUS_CHANGED]: 'Status Changed',
    [StaffEventType.DEACTIVATED]: 'Deactivated',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}


// Overview Tab Component
function OverviewTab({ profile }: { profile: StaffProfile }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Identity Section */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Identity</h3>
        <dl className="space-y-1">
          <InfoRow icon={User} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
          <InfoRow label="Employee Number" value={profile.employeeNumber} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Phone} label="Phone" value={profile.phone} />
        </dl>
      </div>

      {/* Employment Section */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Employment</h3>
        <dl className="space-y-1">
          <InfoRow icon={Shield} label="Primary Role" value={formatRole(profile.primaryRole)} />
          <InfoRow icon={Building} label="Department" value={profile.department} />
          <InfoRow icon={Calendar} label="Hire Date" value={formatDate(profile.hireDate)} />
          <InfoRow label="Status" value={<StatusBadge status={profile.status} />} />
        </dl>
      </div>

      {/* Alerts Section */}
      {profile.alerts.length > 0 && (
        <div className="md:col-span-2 bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Active Alerts</h3>
          <div className="space-y-2">
            {profile.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === AlertSeverity.CRITICAL
                    ? 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20'
                    : alert.severity === AlertSeverity.WARNING
                    ? 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20'
                    : 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20'
                }`}
              >
                <AlertCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  alert.severity === AlertSeverity.CRITICAL
                    ? 'text-[var(--danger)]'
                    : alert.severity === AlertSeverity.WARNING
                    ? 'text-[var(--warning)]'
                    : 'text-[var(--accent-primary)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">{alert.message}</p>
                  <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                    {formatDateTime(alert.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// Roles Tab Component - Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
interface RolesTabProps {
  profile: StaffProfile
  isSelf: boolean
  onRoleAssign: (role: StaffRole | Role, isPrimary: boolean) => Promise<void>
  onRoleRemove: (role: StaffRole | Role) => Promise<void>
}

function RolesTab({ profile, isSelf, onRoleAssign, onRoleRemove }: RolesTabProps) {
  const [assigning, setAssigning] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [isPrimary, setIsPrimary] = useState(false)

  const availableRoles = [
    Role.TEACHER,
    Role.DEPUTY,
    Role.ACCOUNTANT,
    StaffRole.CLASS_TEACHER,
    StaffRole.DOS,
    StaffRole.BURSAR,
    StaffRole.HOSTEL_STAFF,
    StaffRole.SUPPORT_STAFF,
  ].filter(r => r !== profile.primaryRole && !profile.secondaryRoles.includes(r as StaffRole))

  const handleAssign = async () => {
    if (!selectedRole) return
    setAssigning(true)
    try {
      await onRoleAssign(selectedRole as StaffRole | Role, isPrimary)
      setSelectedRole('')
      setIsPrimary(false)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Self-modification warning - Requirements: 9.6 */}
      {isSelf && (
        <AlertBanner
          type="warning"
          message="You cannot modify your own roles. Contact another administrator to make changes."
        />
      )}

      {/* Current Roles */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Current Roles</h3>
        
        {/* Primary Role */}
        <div className="mb-4">
          <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-2">Primary Role</p>
          <div className="flex items-center justify-between p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--accent-primary)]" />
              <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatRole(profile.primaryRole)}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Roles */}
        <div>
          <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-2">Secondary Roles</p>
          {profile.secondaryRoles.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] italic">No secondary roles assigned</p>
          ) : (
            <div className="space-y-2">
              {profile.secondaryRoles.map((role) => (
                <div key={role} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <span className="text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">{formatRole(role)}</span>
                  {!isSelf && (
                    <button
                      onClick={() => onRoleRemove(role)}
                      className="text-[var(--danger)] hover:text-[var(--chart-red)] text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign New Role */}
      {!isSelf && availableRoles.length > 0 && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Assign New Role</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)]"
            >
              <option value="">Select a role...</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>{formatRole(role)}</option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-[var(--border-default)] dark:border-[var(--border-strong)]"
              />
              <span className="text-sm text-[var(--text-primary)] dark:text-[var(--text-muted)]">Set as primary</span>
            </label>
            <button
              onClick={handleAssign}
              disabled={!selectedRole || assigning}
              className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </div>
      )}

      {/* Permissions Summary - Requirements: 9.5 */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">Auto-Applied Permissions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(profile.permissionsSummary).map(([key, value]) => {
            if (key === 'dataScope') return null
            const label = key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()
            return (
              <div key={key} className="flex items-center gap-2">
                <PermissionIndicator allowed={value as boolean} />
                <span className="text-sm text-[var(--text-primary)] dark:text-[var(--text-muted)]">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            Data Scope: <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">{profile.permissionsSummary.dataScope.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}


// Performance Tab Component
function PerformanceTab({ performance }: { performance: PerformanceSummary }) {
  const metrics = [
    { label: 'Attendance Rate', value: performance.attendanceRate, suffix: '%', color: 'blue', notTracked: performance.attendanceRate === undefined },
    { label: 'Task Completion', value: performance.taskCompletionRate, suffix: '%', color: 'green' },
    { label: 'Marks Submission', value: performance.marksSubmissionTimeliness, suffix: '%', color: 'purple' },
    { label: 'Report Completion', value: performance.reportCompletionRate, suffix: '%', color: 'amber' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
            <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{metric.label}</p>
            {metric.notTracked ? (
              <>
                <p className="text-lg font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  Not tracked
                </p>
                <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  Focus on student attendance first
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mt-1">
                  {metric.value !== undefined ? `${metric.value.toFixed(1)}${metric.suffix}` : '—'}
                </p>
                {metric.value !== undefined && (
                  <div className="mt-2 h-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.color === 'blue' ? 'bg-[var(--accent-primary)]' :
                        metric.color === 'green' ? 'bg-[var(--success)]' :
                        metric.color === 'purple' ? 'bg-[var(--info)]' :
                        'bg-[var(--warning)]'
                      }`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// History Tab Component
function HistoryTab({ staffId }: { staffId: string }) {
  const [history, setHistory] = useState<StaffHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/staff/${staffId}/history`)
        if (response.ok) {
          const data = await response.json()
          setHistory(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [staffId])

  if (loading) {
    return <SkeletonLoader variant="card" count={3} />
  }

  if (history.length === 0) {
    return (
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
        <History className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No history entries found</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
      <div className="divide-y divide-[var(--border-default)] dark:divide-[var(--border-strong)]">
        {history.map((entry) => (
          <div key={entry.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <EventTypeBadge type={entry.eventType} />
                  <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                    {formatDateTime(entry.performedAt)}
                  </span>
                </div>
                {entry.previousValue && (
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    From: <span className="font-medium">{entry.previousValue}</span>
                  </p>
                )}
                {entry.newValue && (
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    To: <span className="font-medium">{entry.newValue}</span>
                  </p>
                )}
                {entry.reason && (
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1 italic">
                    Reason: {entry.reason}
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  By: {entry.performedBy}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// Documents Tab Component
function DocumentsTab({ staffId }: { staffId: string }) {
  const [documents, setDocuments] = useState<Array<{
    id: string
    category: string
    fileName: string
    uploadedAt: Date
    uploadedBy: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch(`/api/staff/${staffId}/documents`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [staffId])

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (documents.length === 0) {
    return (
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
        <FileText className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No documents uploaded</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
      <div className="divide-y divide-[var(--border-default)] dark:divide-[var(--border-strong)]">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{doc.fileName}</p>
                <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  {doc.category} • Uploaded {formatDate(doc.uploadedAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Audit Tab Component
function AuditTab({ staffId }: { staffId: string }) {
  const [auditEntries, setAuditEntries] = useState<Array<{
    id: string
    action: string
    resource: string
    previousValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    createdAt: Date
    userId: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAudit() {
      try {
        const response = await fetch(`/api/staff/${staffId}/audit`)
        if (response.ok) {
          const data = await response.json()
          setAuditEntries(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching audit:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [staffId])

  if (loading) {
    return <SkeletonLoader variant="card" count={3} />
  }

  if (auditEntries.length === 0) {
    return (
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8 text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No audit entries found</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
      <div className="divide-y divide-[var(--border-default)] dark:divide-[var(--border-strong)]">
        {auditEntries.map((entry) => (
          <div key={entry.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {entry.action.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  Resource: {entry.resource}
                </p>
              </div>
              <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
            {(entry.previousValue || entry.newValue) && (
              <div className="mt-2 text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded p-2">
                {entry.previousValue && (
                  <p>Previous: {JSON.stringify(entry.previousValue)}</p>
                )}
                {entry.newValue && (
                  <p>New: {JSON.stringify(entry.newValue)}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


// Main Page Component
export default function StaffProfilePage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string
  
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isSelf, setIsSelf] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivating, setDeactivating] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/staff/${staffId}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        if (response.status === 404) {
          setError('Staff member not found')
          return
        }
        throw new Error('Failed to fetch staff profile')
      }
      
      const result = await response.json()
      setProfile(result.data)
      
      // Check if viewing own profile
      const contextResponse = await fetch('/api/auth/context')
      if (contextResponse.ok) {
        const context = await contextResponse.json()
        setIsSelf(context.staffId === staffId)
      }
    } catch (err) {
      console.error('Error fetching staff profile:', err)
      setError('Unable to load staff profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [staffId, router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleRoleAssign = async (role: StaffRole | Role, isPrimary: boolean) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, isPrimary }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to assign role')
      }
      
      await fetchProfile()
    } catch (err) {
      console.error('Error assigning role:', err)
      throw err
    }
  }

  const handleRoleRemove = async (role: StaffRole | Role) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/roles?role=${encodeURIComponent(role)}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to remove role')
      }
      
      await fetchProfile()
    } catch (err) {
      console.error('Error removing role:', err)
      throw err
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateReason.trim()) return
    
    try {
      setDeactivating(true)
      const response = await fetch(`/api/staff/${staffId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deactivateReason }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to deactivate staff')
      }
      
      setShowDeactivateConfirm(false)
      setDeactivateReason('')
      await fetchProfile()
    } catch (err) {
      console.error('Error deactivating staff:', err)
      setError('Failed to deactivate staff member')
    } finally {
      setDeactivating(false)
    }
  }


  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <button
          onClick={() => router.push('/dashboard/staff')}
          className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff List
        </button>
        <AlertBanner
          type="danger"
          message={error || 'Staff member not found'}
          action={{ label: 'Retry', onClick: fetchProfile }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/staff')}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
            aria-label="Back to staff list"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {profile.firstName} {profile.lastName}
              </h1>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              {profile.employeeNumber} • {formatRole(profile.primaryRole)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfile}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
            aria-label="Refresh profile"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {/* Deactivate button - Requirements: 8.7 */}
          {!isSelf && profile.status === StaffStatus.ACTIVE && (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="px-4 py-2 text-[var(--chart-red)] hover:text-[var(--chart-red)] border border-[var(--danger)] dark:border-[var(--danger-dark)] rounded-lg hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/20 transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--accent-primary)] text-[var(--chart-blue)] dark:text-[var(--chart-blue)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>


      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab profile={profile} />}
        {activeTab === 'roles' && (
          <RolesTab
            profile={profile}
            isSelf={isSelf}
            onRoleAssign={handleRoleAssign}
            onRoleRemove={handleRoleRemove}
          />
        )}
        {activeTab === 'performance' && <PerformanceTab performance={profile.performanceSummary} />}
        {activeTab === 'history' && <HistoryTab staffId={staffId} />}
        {activeTab === 'documents' && <DocumentsTab staffId={staffId} />}
        {activeTab === 'audit' && <AuditTab staffId={staffId} />}
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/50">
          <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
              Deactivate Staff Member
            </h3>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-4">
              Are you sure you want to deactivate {profile.firstName} {profile.lastName}? 
              This will revoke their access to the system.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-1">
                Reason for deactivation
              </label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
                 className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--danger)]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeactivateConfirm(false)
                  setDeactivateReason('')
                }}
                className="px-4 py-2 text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={!deactivateReason.trim() || deactivating}
                className="px-4 py-2 bg-[var(--chart-red)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--chart-red)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
