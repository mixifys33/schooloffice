'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { SearchInput } from '@/components/ui/search-input'
import { 
  Building2, 
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Ban,
  Settings
} from 'lucide-react'

/**
 * Pilot Control Page
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

interface PilotSchoolData {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  studentCount: number
  studentLimit: number
  smsCount: number
  smsLimit: number
  startDate: string
  endDate: string
  daysRemaining: number
  isExpired: boolean
  isStudentLimitReached: boolean
  isSmsLimitReached: boolean
  isActive: boolean
  createdAt: string
}

interface PilotSummary {
  total: number
  active: number
  expired: number
  limitReached: number
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function PilotStatusBadge({ pilot }: { pilot: PilotSchoolData }) {
  if (!pilot.isActive) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-primary)]">Suspended</span>
  }
  if (pilot.isExpired) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--danger-light)] text-[var(--chart-red)]">Expired</span>
  }
  if (pilot.daysRemaining <= 7) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--warning-light)] text-[var(--warning)]">Expiring Soon</span>
  }
  return <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--success-light)] text-[var(--chart-green)]">Active</span>
}

function LimitIndicator({ current, limit, label }: { current: number; limit: number; label: string }) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isAtLimit = current >= limit
  const isNearLimit = percentage >= 80

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-[var(--chart-red)]' : isNearLimit ? 'text-[var(--chart-yellow)]' : 'text-[var(--text-primary)]'}`}>
          {current}/{limit}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-[var(--danger)]' : isNearLimit ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function PilotControlPage() {
  const { toast, showToast, hideToast } = useLocalToast()
  const [pilots, setPilots] = useState<PilotSchoolData[]>([])
  const [filteredPilots, setFilteredPilots] = useState<PilotSchoolData[]>([])
  const [summary, setSummary] = useState<PilotSummary>({ total: 0, active: 0, expired: 0, limitReached: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'limited'>('all')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modal states
  const [extendModal, setExtendModal] = useState<{ open: boolean; pilot: PilotSchoolData | null }>({ open: false, pilot: null })
  const [extensionDays, setExtensionDays] = useState(30)
  const [convertModal, setConvertModal] = useState<{ open: boolean; pilot: PilotSchoolData | null }>({ open: false, pilot: null })
  const [selectedLicense, setSelectedLicense] = useState<'BASIC' | 'PREMIUM'>('BASIC')
  const [limitsModal, setLimitsModal] = useState<{ open: boolean; pilot: PilotSchoolData | null }>({ open: false, pilot: null })
  const [newStudentLimit, setNewStudentLimit] = useState(50)
  const [newSmsLimit, setNewSmsLimit] = useState(100)

  const fetchPilots = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/pilots')
      if (!response.ok) {
        if (response.status === 403) throw new Error('Access denied. Super Admin privileges required.')
        throw new Error('Failed to fetch pilot schools data')
      }
      const data = await response.json()
      setPilots(data.pilots)
      setFilteredPilots(data.pilots)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPilots() }, [fetchPilots])

  useEffect(() => {
    let filtered = pilots
    if (filter === 'active') filtered = filtered.filter(p => p.isActive && !p.isExpired)
    else if (filter === 'expired') filtered = filtered.filter(p => p.isExpired)
    else if (filter === 'limited') filtered = filtered.filter(p => p.isStudentLimitReached || p.isSmsLimitReached)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(pilot => 
        pilot.name.toLowerCase().includes(query) || pilot.code.toLowerCase().includes(query) || pilot.email?.toLowerCase().includes(query)
      )
    }
    setFilteredPilots(filtered)
    setCurrentPage(1)
  }, [searchQuery, filter, pilots])

  const totalPages = Math.ceil(filteredPilots.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedPilots = filteredPilots.slice(startIndex, startIndex + pageSize)

  const handleExtendPilot = async () => {
    if (!extendModal.pilot) return
    try {
      setActionLoading(extendModal.pilot.id)
      const response = await fetch(`/api/admin/pilots/${extendModal.pilot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extendPilot', extensionDays })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to extend pilot') }
      showToast('success', `Pilot extended by ${extensionDays} days`)
      setExtendModal({ open: false, pilot: null })
      await fetchPilots()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to extend pilot')
    } finally { setActionLoading(null) }
  }

  const handleConvertToPaid = async () => {
    if (!convertModal.pilot) return
    try {
      setActionLoading(convertModal.pilot.id)
      const response = await fetch(`/api/admin/pilots/${convertModal.pilot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convertToPaid', licenseType: selectedLicense })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to convert pilot') }
      showToast('success', `School converted to ${selectedLicense} plan`)
      setConvertModal({ open: false, pilot: null })
      await fetchPilots()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to convert pilot')
    } finally { setActionLoading(null) }
  }

  const handleUpdateLimits = async () => {
    if (!limitsModal.pilot) return
    try {
      setActionLoading(limitsModal.pilot.id)
      const response = await fetch(`/api/admin/pilots/${limitsModal.pilot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateLimits', studentLimit: newStudentLimit, smsLimit: newSmsLimit })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to update limits') }
      showToast('success', 'Pilot limits updated successfully')
      setLimitsModal({ open: false, pilot: null })
      await fetchPilots()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update limits')
    } finally { setActionLoading(null) }
  }

  const handleSuspendPilot = async (pilotId: string) => {
    try {
      setActionLoading(pilotId)
      const response = await fetch(`/api/admin/pilots/${pilotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' })
      })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to suspend pilot') }
      showToast('success', 'Pilot school suspended')
      await fetchPilots()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to suspend pilot')
    } finally { setActionLoading(null); setActionMenuOpen(null) }
  }

  const handleRunEnforcement = async () => {
    const expiredPilots = pilots.filter(p => p.isExpired && p.isActive)
    if (expiredPilots.length === 0) { showToast('info', 'No expired pilots to suspend'); return }
    try {
      setActionLoading('enforcement')
      let suspended = 0
      for (const pilot of expiredPilots) {
        const response = await fetch(`/api/admin/pilots/${pilot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'suspend' })
        })
        if (response.ok) suspended++
      }
      showToast('success', `Suspended ${suspended} expired pilot school(s)`)
      await fetchPilots()
    } catch { showToast('error', 'Failed to run enforcement') }
    finally { setActionLoading(null) }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pilot Control</h1>
          <p className="text-[var(--text-secondary)]">Manage pilot schools, limits, and conversions</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <SkeletonLoader key={i} variant="stat" count={1} />)}
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pilot Control</h1>
          <p className="text-[var(--text-secondary)]">Manage pilot schools, limits, and conversions</p>
        </div>
        <AlertBanner type="danger" message={error} action={{ label: 'Try Again', onClick: fetchPilots }} />
      </div>
    )
  }


  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pilot Control</h1>
          <p className="text-[var(--text-secondary)]">Manage pilot schools, limits, and conversions</p>
        </div>
        <button
          onClick={handleRunEnforcement}
          disabled={actionLoading === 'enforcement'}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--chart-red)] text-[var(--white-pure)] rounded-md hover:bg-[var(--chart-red)] disabled:opacity-50"
        >
          <Ban className="h-4 w-4" />
          {actionLoading === 'enforcement' ? 'Running...' : 'Enforce Expired Pilots'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-main)] p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-[var(--text-secondary)]">Total Pilots</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{summary.total}</p>
        </div>
        <div className="bg-[var(--success-light)] p-4 rounded-lg border border-[var(--success-light)]">
          <p className="text-sm text-[var(--chart-green)]">Active</p>
          <p className="text-2xl font-bold text-[var(--chart-green)]">{summary.active}</p>
        </div>
        <div className="bg-[var(--danger-light)] p-4 rounded-lg border border-[var(--danger-light)]">
          <p className="text-sm text-[var(--chart-red)]">Expired</p>
          <p className="text-2xl font-bold text-[var(--chart-red)]">{summary.expired}</p>
        </div>
        <div className="bg-[var(--warning-light)] p-4 rounded-lg border border-[var(--warning-light)]">
          <p className="text-sm text-[var(--chart-yellow)]">Limit Reached</p>
          <p className="text-2xl font-bold text-[var(--warning)]">{summary.limitReached}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput placeholder="Search pilots..." value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'limited', label: 'Limit Reached' }].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === tab.key ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-surface)] border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">School</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">End Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">SMS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedPilots.map((pilot) => (
                <tr key={pilot.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[var(--info-light)] flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[var(--chart-purple)]" />
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{pilot.name}</div>
                        <div className="text-sm text-[var(--text-muted)]">{pilot.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                      <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                      {formatDate(pilot.startDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                      <div>
                        <div className="text-[var(--text-primary)]">{formatDate(pilot.endDate)}</div>
                        {!pilot.isExpired && (
                          <div className={`text-xs ${pilot.daysRemaining <= 7 ? 'text-[var(--chart-yellow)]' : 'text-[var(--text-muted)]'}`}>
                            {pilot.daysRemaining} days left
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 w-32">
                    <LimitIndicator current={pilot.studentCount} limit={pilot.studentLimit} label="Students" />
                    {pilot.isStudentLimitReached && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-[var(--chart-red)]">
                        <AlertTriangle className="h-3 w-3" />Limit reached
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 w-32">
                    <LimitIndicator current={pilot.smsCount} limit={pilot.smsLimit} label="SMS" />
                    {pilot.isSmsLimitReached && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-[var(--chart-red)]">
                        <AlertTriangle className="h-3 w-3" />Limit reached
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4"><PilotStatusBadge pilot={pilot} /></td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === pilot.id ? null : pilot.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)]"
                        disabled={actionLoading === pilot.id}
                      >
                        {actionLoading === pilot.id ? (
                          <div className="h-5 w-5 border-2 border-[var(--border-default)] border-t-blue-600 rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="h-5 w-5" />
                        )}
                      </button>
                      {actionMenuOpen === pilot.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-main)] rounded-lg shadow-lg border z-10">
                          <div className="py-1">
                            <button onClick={() => { setExtendModal({ open: true, pilot }); setActionMenuOpen(null) }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2">
                              <Clock className="h-4 w-4 text-[var(--chart-purple)]" />Extend Pilot
                            </button>
                            <button onClick={() => { setNewStudentLimit(pilot.studentLimit); setNewSmsLimit(pilot.smsLimit); setLimitsModal({ open: true, pilot }); setActionMenuOpen(null) }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2">
                              <Settings className="h-4 w-4 text-[var(--accent-primary)]" />Update Limits
                            </button>
                            <button onClick={() => { setConvertModal({ open: true, pilot }); setActionMenuOpen(null) }} className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] flex items-center gap-2">
                              <ArrowUpCircle className="h-4 w-4 text-[var(--success)]" />Convert to Paid
                            </button>
                            {pilot.isExpired && pilot.isActive && (
                              <button onClick={() => handleSuspendPilot(pilot.id)} className="w-full px-4 py-2 text-left text-sm text-[var(--chart-red)] hover:bg-[var(--danger-light)] flex items-center gap-2">
                                <Ban className="h-4 w-4" />Suspend Pilot
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPilots.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">{searchQuery || filter !== 'all' ? 'No pilots match your criteria' : 'No pilot schools found'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-[var(--bg-surface)] flex items-center justify-between">
            <div className="text-sm text-[var(--text-muted)]">Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredPilots.length)} of {filteredPilots.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm text-[var(--text-primary)]">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border bg-[var(--bg-main)] hover:bg-[var(--bg-surface)] disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {actionMenuOpen && <div className="fixed inset-0 z-0" onClick={() => setActionMenuOpen(null)} />}

      {/* Extend Pilot Modal */}
      {extendModal.open && extendModal.pilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-[var(--text-primary)]/50" onClick={() => setExtendModal({ open: false, pilot: null })} />
          <div className="relative bg-[var(--bg-main)] rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Extend Pilot Period</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Extend the pilot period for <span className="font-medium">{extendModal.pilot.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Extension Days</label>
              <input
                type="number"
                min="1"
                max="365"
                value={extensionDays}
                onChange={(e) => setExtensionDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Current end date: {formatDate(extendModal.pilot.endDate)}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExtendModal({ open: false, pilot: null })}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-md hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendPilot}
                disabled={actionLoading === extendModal.pilot.id}
                className="px-4 py-2 text-sm font-medium text-[var(--white-pure)] bg-[var(--chart-purple)] rounded-md hover:bg-[var(--chart-purple)] disabled:opacity-50"
              >
                {actionLoading === extendModal.pilot.id ? 'Extending...' : 'Extend Pilot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Limits Modal */}
      {limitsModal.open && limitsModal.pilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-[var(--text-primary)]/50" onClick={() => setLimitsModal({ open: false, pilot: null })} />
          <div className="relative bg-[var(--bg-main)] rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Update Pilot Limits</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Update limits for <span className="font-medium">{limitsModal.pilot.name}</span>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Student Limit</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newStudentLimit}
                  onChange={(e) => setNewStudentLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Current: {limitsModal.pilot.studentCount} / {limitsModal.pilot.studentLimit} students
                </p>
                {limitsModal.pilot.isStudentLimitReached && (
                  <p className="text-xs text-[var(--chart-red)] mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pilot limit reached - new enrollment blocked
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">SMS Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={newSmsLimit}
                  onChange={(e) => setNewSmsLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Current: {limitsModal.pilot.smsCount} / {limitsModal.pilot.smsLimit} SMS
                </p>
                {limitsModal.pilot.isSmsLimitReached && (
                  <p className="text-xs text-[var(--chart-red)] mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pilot SMS limit reached - SMS sending disabled
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLimitsModal({ open: false, pilot: null })}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-md hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLimits}
                disabled={actionLoading === limitsModal.pilot.id}
                className="px-4 py-2 text-sm font-medium text-[var(--white-pure)] bg-[var(--chart-blue)] rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {actionLoading === limitsModal.pilot.id ? 'Updating...' : 'Update Limits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Paid Modal */}
      {convertModal.open && convertModal.pilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-[var(--text-primary)]/50" onClick={() => setConvertModal({ open: false, pilot: null })} />
          <div className="relative bg-[var(--bg-main)] rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Convert to Paid Plan</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Convert <span className="font-medium">{convertModal.pilot.name}</span> from pilot to a paid subscription.
              This will remove all pilot limits.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Plan</label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                  <input
                    type="radio"
                    name="license"
                    value="BASIC"
                    checked={selectedLicense === 'BASIC'}
                    onChange={() => setSelectedLicense('BASIC')}
                    className="h-4 w-4 text-[var(--chart-blue)]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-[var(--text-primary)]">Basic Plan</span>
                    <p className="text-xs text-[var(--text-muted)]">50,000 SMS/term, standard features</p>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                  <input
                    type="radio"
                    name="license"
                    value="PREMIUM"
                    checked={selectedLicense === 'PREMIUM'}
                    onChange={() => setSelectedLicense('PREMIUM')}
                    className="h-4 w-4 text-[var(--chart-blue)]"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-[var(--text-primary)]">Premium Plan</span>
                    <p className="text-xs text-[var(--text-muted)]">200,000 SMS/term, advanced reporting</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-3 mb-6">
              <p className="text-sm text-[var(--warning-dark)]">
                <strong>Note:</strong> This action will:
              </p>
              <ul className="text-xs text-[var(--warning)] mt-1 list-disc list-inside">
                <li>Remove student enrollment limit</li>
                <li>Remove SMS sending limit</li>
                <li>Remove pilot expiration date</li>
                <li>Enable all plan features</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConvertModal({ open: false, pilot: null })}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-md hover:bg-[var(--bg-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToPaid}
                disabled={actionLoading === convertModal.pilot.id}
                className="px-4 py-2 text-sm font-medium text-[var(--white-pure)] bg-[var(--chart-green)] rounded-md hover:bg-[var(--chart-green)] disabled:opacity-50"
              >
                {actionLoading === convertModal.pilot.id ? 'Converting...' : 'Convert to Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
