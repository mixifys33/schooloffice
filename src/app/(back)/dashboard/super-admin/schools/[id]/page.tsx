'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { SchoolStatusBadge, SchoolStatus } from '@/components/ui/school-status-badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { 
  ArrowLeft,
  Building2, 
  Users, 
  Mail,
  Phone,
  Calendar,
  Save,
  MessageSquare
} from 'lucide-react'
import { LicenseType } from '@/types/enums'

/**
 * School Detail/Edit Page
 * Requirements: 13.5 - Update school's maximum student count
 */

interface SchoolDetail {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  address: string | null
  licenseType: string
  smsBudgetPerTerm: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  features: {
    smsEnabled: boolean
    whatsappEnabled: boolean
    paymentIntegration: boolean
    advancedReporting: boolean
    bulkMessaging: boolean
  }
  _count: {
    students: number
    staff: number
  }
}

const planLabels: Record<string, string> = {
  FREE_PILOT: 'Free Pilot',
  BASIC: 'Basic',
  PREMIUM: 'Premium'
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export default function SchoolDetailPage() {
  const router = useRouter()
  const params = useParams()
  const schoolId = params.id as string
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [school, setSchool] = useState<SchoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [smsBudgetPerTerm, setSmsBudgetPerTerm] = useState(0)
  const [licenseType, setLicenseType] = useState<string>('FREE_PILOT')

  const fetchSchool = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/schools/${schoolId}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        if (response.status === 404) {
          throw new Error('School not found')
        }
        throw new Error('Failed to fetch school data')
      }
      
      const data = await response.json()
      setSchool(data.school)
      setSmsBudgetPerTerm(data.school.smsBudgetPerTerm)
      setLicenseType(data.school.licenseType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    fetchSchool()
  }, [fetchSchool])

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Update SMS budget - Requirement 13.5
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'updateLimits',
          smsBudgetPerTerm 
        })
      })

      if (!response.ok) throw new Error('Failed to update school')

      // Update license type if changed
      if (licenseType !== school?.licenseType) {
        const licenseResponse = await fetch(`/api/admin/schools/${schoolId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'updateLicense',
            licenseType 
          })
        })

        if (!licenseResponse.ok) throw new Error('Failed to update license type')
      }

      showToast('success', 'School settings updated successfully')
      await fetchSchool()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update school')
    } finally {
      setSaving(false)
    }
  }

  // Determine status
  const getStatus = (): SchoolStatus => {
    if (!school) return 'ACTIVE'
    if (!school.isActive) return 'SUSPENDED'
    if (school.licenseType === 'FREE_PILOT') return 'PILOT'
    return 'ACTIVE'
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Schools
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">School Details</h1>
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error || !school) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Schools
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">School Details</h1>
        </div>
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4">
          <p className="text-[var(--chart-red)]">{error || 'School not found'}</p>
          <button
            onClick={fetchSchool}
            className="mt-2 text-sm text-[var(--chart-red)] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schools
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-[var(--info-light)] flex items-center justify-center">
              <Building2 className="h-8 w-8 text-[var(--chart-blue)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{school.name}</h1>
              <p className="text-[var(--text-muted)]">{school.code}</p>
            </div>
          </div>
          <SchoolStatusBadge status={getStatus()} plan={school.licenseType as 'FREE_PILOT' | 'BASIC' | 'PREMIUM'} />
        </div>
      </div>

      {/* School Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-main)] rounded-lg border p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Students</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{school._count.students}</p>
        </div>
        <div className="bg-[var(--bg-main)] rounded-lg border p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Staff</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{school._count.staff}</p>
        </div>
        <div className="bg-[var(--bg-main)] rounded-lg border p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm">SMS Budget</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(school.smsBudgetPerTerm)}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-[var(--bg-main)] rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Email</p>
              <p className="text-[var(--text-primary)]">{school.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Phone</p>
              <p className="text-[var(--text-primary)]">{school.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <Calendar className="h-5 w-5 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm text-[var(--text-muted)]">Created</p>
              <p className="text-[var(--text-primary)]">
                {new Date(school.createdAt).toLocaleDateString('en-UG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form - Requirement 13.5 */}
      <div className="bg-[var(--bg-main)] rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">School Settings</h2>
        
        <div className="space-y-4">
          {/* License Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              License Type
            </label>
            <select
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            >
              <option value="FREE_PILOT">Free Pilot</option>
              <option value="BASIC">Basic</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Changing the license type will update available features
            </p>
          </div>

          {/* SMS Budget - Requirement 13.5 */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              SMS Budget Per Term (UGX)
            </label>
            <input
              type="number"
              value={smsBudgetPerTerm}
              onChange={(e) => setSmsBudgetPerTerm(Number(e.target.value))}
              min={0}
              step={10000}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            />
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Maximum SMS budget allocated to this school per term
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-[var(--bg-main)] rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Enabled Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(school.features).map(([key, enabled]) => (
            <div 
              key={key}
              className={`p-3 rounded-lg border ${
                enabled 
                  ? 'bg-[var(--success-light)] border-[var(--success-light)]' 
                  : 'bg-[var(--bg-surface)] border-[var(--border-default)]'
              }`}
            >
              <div className={`text-sm font-medium ${enabled ? 'text-[var(--chart-green)]' : 'text-[var(--text-muted)]'}`}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
              <div className={`text-xs ${enabled ? 'text-[var(--chart-green)]' : 'text-[var(--text-muted)]'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
