'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  SchoolMessagingStats, 
  MessageChannel, 
  QuotaUpdate,
  SchoolQuotas 
} from '@/types/communication-hub'
import QuotaManagementModal from './quota-management-modal'

/**
 * Schools Tab Component
 * Requirements: 2.1-2.9, 10.6, 10.7
 * - School list with messaging stats table
 * - Pause/resume buttons with confirmation dialogs
 * - Filtering and sorting controls
 * - Quota management functionality
 */

interface SchoolRowActionsProps {
  school: SchoolMessagingStats
  onPause: () => void
  onResume: () => void
  onManageQuota: () => void
}

function SchoolRowActions({ school, onPause, onResume, onManageQuota }: SchoolRowActionsProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      
      {showActions && (
        <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[150px]">
          <div className="py-1">
            {school.isPaused ? (
              <button
                onClick={() => {
                  onResume()
                  setShowActions(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--success)] hover:bg-slate-700"
              >
                Resume Messaging
              </button>
            ) : (
              <button
                onClick={() => {
                  onPause()
                  setShowActions(false)
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--warning)] hover:bg-slate-700"
              >
                Pause Messaging
              </button>
            )}
            <button
              onClick={() => {
                onManageQuota()
                setShowActions(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-slate-700"
            >
              Manage Quotas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface PauseConfirmationModalProps {
  school: SchoolMessagingStats
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

function PauseConfirmationModal({ school, isOpen, onClose, onConfirm }: PauseConfirmationModalProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onConfirm(reason.trim())
      setReason('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Pause Messaging for {school.schoolName}
        </h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          This will immediately block all outgoing messages for this school. Please provide a reason:
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for pausing..."
            className="mb-4"
            required
          />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[var(--chart-yellow)] hover:bg-[var(--warning)] text-[var(--white-pure)]"
            >
              Pause Messaging
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SchoolsTabProps {
  schools: SchoolMessagingStats[]
  onPause: (schoolId: string, reason: string) => void
  onResume: (schoolId: string) => void
  onUpdateQuota: (schoolId: string, quotas: QuotaUpdate) => void
  onAddCredits: (schoolId: string, channel: MessageChannel, amount: number) => void
  onSetEmergencyOverride: (schoolId: string, enabled: boolean) => void
}

export default function SchoolsTab({
  schools,
  onPause,
  onResume,
  onUpdateQuota,
  onAddCredits,
  onSetEmergencyOverride
}: SchoolsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof SchoolMessagingStats>('schoolName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [pauseModal, setPauseModal] = useState<SchoolMessagingStats | null>(null)
  const [quotaModal, setQuotaModal] = useState<SchoolMessagingStats | null>(null)

  // Filter and sort schools
  const filteredAndSortedSchools = schools
    .filter(school => 
      school.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.schoolCode.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

  const handleSort = (field: keyof SchoolMessagingStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getUsageColor = (sent: number, limit: number | null) => {
    if (!limit) return 'text-[var(--text-muted)]'
    const percentage = (sent / limit) * 100
    if (percentage >= 90) return 'text-[var(--danger)]'
    if (percentage >= 75) return 'text-[var(--warning)]'
    return 'text-[var(--success)]'
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">School Monitoring</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Monitor messaging activity and manage quotas for all schools
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Input
            placeholder="Search schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* Schools Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th 
                    className="text-left py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-secondary)]"
                    onClick={() => handleSort('schoolName')}
                  >
                    School Name
                    {sortField === 'schoolName' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">SMS</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">WhatsApp</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Email</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Failures</th>
                  <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Last Message</th>
                  <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-muted)]">
                {filteredAndSortedSchools.map((school) => (
                  <tr key={school.schoolId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{school.schoolName}</div>
                        {school.isPaused && (
                          <div className="text-xs text-[var(--warning)] mt-1">⏸ Messaging Paused</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{school.schoolCode}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        school.isActive 
                          ? 'bg-[var(--success-dark)]/50 text-[var(--success)]' 
                          : 'bg-[var(--danger-dark)]/50 text-[var(--danger)]'
                      }`}>
                        {school.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={getUsageColor(school.sms.sent, school.sms.limit)}>
                        {school.sms.sent.toLocaleString()}
                        {school.sms.limit && (
                          <span className="text-[var(--text-muted)]">/{school.sms.limit.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {school.sms.remaining.toLocaleString()} remaining
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={getUsageColor(school.whatsapp.sent, school.whatsapp.limit)}>
                        {school.whatsapp.sent.toLocaleString()}
                        {school.whatsapp.limit && (
                          <span className="text-[var(--text-muted)]">/{school.whatsapp.limit.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {school.whatsapp.remaining.toLocaleString()} remaining
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={getUsageColor(school.email.sent, school.email.limit)}>
                        {school.email.sent.toLocaleString()}
                        {school.email.limit && (
                          <span className="text-[var(--text-muted)]">/{school.email.limit.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {school.email.remaining.toLocaleString()} remaining
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        school.failureCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'
                      }`}>
                        {school.failureCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--text-muted)] text-xs">
                      {school.lastMessageAt 
                        ? new Date(school.lastMessageAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3 px-4 text-right">
                      <SchoolRowActions
                        school={school}
                        onPause={() => setPauseModal(school)}
                        onResume={() => onResume(school.schoolId)}
                        onManageQuota={() => setQuotaModal(school)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSortedSchools.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)]">No schools found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {schools.length}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Total Schools</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-[var(--success)]">
              {schools.filter(s => s.isActive).length}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Active Schools</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-[var(--warning)]">
              {schools.filter(s => s.isPaused).length}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Paused Schools</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-[var(--danger)]">
              {schools.filter(s => s.failureCount > 0).length}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Schools with Failures</p>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {pauseModal && (
        <PauseConfirmationModal
          school={pauseModal}
          isOpen={true}
          onClose={() => setPauseModal(null)}
          onConfirm={(reason) => onPause(pauseModal.schoolId, reason)}
        />
      )}

      {quotaModal && (
        <QuotaManagementModal
          school={quotaModal}
          isOpen={true}
          onClose={() => setQuotaModal(null)}
          onUpdateQuota={(quotas) => onUpdateQuota(quotaModal.schoolId, quotas)}
          onAddCredits={(channel, amount) => onAddCredits(quotaModal.schoolId, channel, amount)}
          onSetEmergencyOverride={(enabled) => onSetEmergencyOverride(quotaModal.schoolId, enabled)}
        />
      )}
    </div>
  )
}