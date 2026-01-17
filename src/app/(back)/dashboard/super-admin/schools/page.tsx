'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SchoolStatusBadge, SchoolStatus } from '@/components/ui/school-status-badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { SearchInput } from '@/components/ui/search-input'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { 
  Building2, 
  Users, 
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

/**
 * Schools Management Page
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 * - Display schools with name, student count, plan, amount due, due date, status
 * - Activate school functionality
 * - Suspend school functionality
 * - Extend pilot functionality
 * - Student limit modification
 */

interface SchoolWithMetrics {
  id: string
  name: string
  code: string
  studentCount: number
  plan: 'FREE_PILOT' | 'BASIC' | 'PREMIUM'
  amountDue: number
  dueDate: string | null
  status: SchoolStatus
  isActive: boolean
  email: string | null
  phone: string | null
  createdAt: string
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const planLabels: Record<string, string> = {
  FREE_PILOT: 'Pilot',
  BASIC: 'Basic',
  PREMIUM: 'Premium'
}

export default function SchoolsManagementPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useLocalToast()
  const [schools, setSchools] = useState<SchoolWithMetrics[]>([])
  const [filteredSchools, setFilteredSchools] = useState<SchoolWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Modal states
  const [extendPilotModal, setExtendPilotModal] = useState<{ open: boolean; school: SchoolWithMetrics | null }>({
    open: false,
    school: null
  })
  const [extensionDays, setExtensionDays] = useState(30)

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/schools')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch schools data')
      }
      
      const data = await response.json()
      setSchools(data.schools)
      setFilteredSchools(data.schools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  // Filter schools based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSchools(schools)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = schools.filter(school => 
        school.name.toLowerCase().includes(query) ||
        school.code.toLowerCase().includes(query) ||
        school.email?.toLowerCase().includes(query)
      )
      setFilteredSchools(filtered)
    }
    setCurrentPage(1)
  }, [searchQuery, schools])

  // Pagination calculations
  const totalPages = Math.ceil(filteredSchools.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedSchools = filteredSchools.slice(startIndex, startIndex + pageSize)

  // Action handlers
  const handleActivate = async (schoolId: string) => {
    try {
      setActionLoading(schoolId)
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' })
      })

      if (!response.ok) throw new Error('Failed to activate school')

      showToast('success', 'School activated successfully')
      await fetchSchools()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to activate school')
    } finally {
      setActionLoading(null)
      setActionMenuOpen(null)
    }
  }

  const handleSuspend = async (schoolId: string) => {
    try {
      setActionLoading(schoolId)
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' })
      })

      if (!response.ok) throw new Error('Failed to suspend school')

      showToast('success', 'School suspended successfully')
      await fetchSchools()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to suspend school')
    } finally {
      setActionLoading(null)
      setActionMenuOpen(null)
    }
  }

  const handleExtendPilot = async () => {
    if (!extendPilotModal.school) return

    try {
      setActionLoading(extendPilotModal.school.id)
      const response = await fetch(`/api/admin/schools/${extendPilotModal.school.id}/pilot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionDays })
      })

      if (!response.ok) throw new Error('Failed to extend pilot')

      showToast('success', `Pilot extended by ${extensionDays} days`)
      setExtendPilotModal({ open: false, school: null })
      await fetchSchools()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to extend pilot')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-gray-600">Manage all schools, subscriptions, and access</p>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-gray-600">Manage all schools, subscriptions, and access</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSchools}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={hideToast}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-gray-600">Manage all schools, subscriptions, and access</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6">
        <SearchInput
          placeholder="Search schools by name, code, or email..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-md"
        />
      </div>

      {/* Schools table - Requirement 13.1 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSchools.map((school) => (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{school.name}</div>
                        <div className="text-sm text-gray-500">{school.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      {school.studentCount}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      school.plan === 'PREMIUM' 
                        ? 'bg-purple-100 text-purple-700'
                        : school.plan === 'BASIC'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {planLabels[school.plan]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {school.amountDue > 0 ? formatCurrency(school.amountDue) : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(school.dueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SchoolStatusBadge status={school.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === school.id ? null : school.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        disabled={actionLoading === school.id}
                      >
                        {actionLoading === school.id ? (
                          <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="h-5 w-5" />
                        )}
                      </button>

                      {/* Action dropdown menu */}
                      {actionMenuOpen === school.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                          <div className="py-1">
                            {/* Requirement 13.2: Activate school */}
                            {!school.isActive && (
                              <button
                                onClick={() => handleActivate(school.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Activate School
                              </button>
                            )}

                            {/* Requirement 13.3: Suspend school */}
                            {school.isActive && (
                              <button
                                onClick={() => handleSuspend(school.id)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                                Suspend School
                              </button>
                            )}

                            {/* Requirement 13.4: Extend pilot */}
                            {school.plan === 'FREE_PILOT' && (
                              <button
                                onClick={() => {
                                  setExtendPilotModal({ open: true, school })
                                  setActionMenuOpen(null)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Clock className="h-4 w-4 text-purple-500" />
                                Extend Pilot
                              </button>
                            )}

                            {/* Requirement 13.5: Modify limits */}
                            <button
                              onClick={() => {
                                router.push(`/dashboard/super-admin/schools/${school.id}`)
                                setActionMenuOpen(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                              Edit Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedSchools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No schools match your search' : 'No schools found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredSchools.length)} of {filteredSchools.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extend Pilot Modal - Requirement 13.4 */}
      {extendPilotModal.open && extendPilotModal.school && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Extend Pilot Period
            </h3>
            <p className="text-gray-600 mb-4">
              Extend the pilot period for <strong>{extendPilotModal.school.name}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extension Days
              </label>
              <select
                value={extensionDays}
                onChange={(e) => setExtensionDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExtendPilotModal({ open: false, school: null })}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendPilot}
                disabled={actionLoading === extendPilotModal.school.id}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading === extendPilotModal.school.id ? 'Extending...' : 'Extend Pilot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  )
}
