'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { 
  GuardianStatus, GuardianFlag, MessageChannel, RelationshipType 
} from '@/types/enums'

/**
 * Guardian Edit Form
 * Form for all guardian fields with phone validation, status and flag management
 * Requirements: 1.3, 6.1, 6.2
 */

interface GuardianFormData {
  firstName: string
  lastName: string
  phone: string
  secondaryPhone: string
  email: string
  whatsappNumber: string
  nationalId: string
  address: string
  relationship: RelationshipType
  preferredChannel: MessageChannel
  languagePreference: string
  status: GuardianStatus
  flags: GuardianFlag[]
  optOutNonCritical: boolean
}

const initialFormData: GuardianFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  secondaryPhone: '',
  email: '',
  whatsappNumber: '',
  nationalId: '',
  address: '',
  relationship: RelationshipType.GUARDIAN,
  preferredChannel: MessageChannel.SMS,
  languagePreference: 'en',
  status: GuardianStatus.ACTIVE,
  flags: [],
  optOutNonCritical: false,
}

// Phone validation regex (supports various formats)
const phoneRegex = /^(\+?[0-9]{1,4})?[-.\s]?(\(?[0-9]{1,4}\)?)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}$/

export default function GuardianEditPage() {
  const params = useParams()
  const router = useRouter()
  const guardianId = params.id as string

  const [formData, setFormData] = useState<GuardianFormData>(initialFormData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const fetchGuardian = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/guardians/${guardianId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Guardian not found')
        throw new Error('Failed to fetch guardian')
      }
      const data = await response.json()
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        secondaryPhone: data.secondaryPhone || '',
        email: data.email || '',
        whatsappNumber: data.whatsappNumber || '',
        nationalId: data.nationalId || '',
        address: data.address || '',
        relationship: data.relationship || RelationshipType.GUARDIAN,
        preferredChannel: data.preferredChannel || MessageChannel.SMS,
        languagePreference: data.languagePreference || 'en',
        status: data.status || GuardianStatus.ACTIVE,
        flags: data.flags || [],
        optOutNonCritical: data.optOutNonCritical || false,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching guardian:', err)
      setError(err instanceof Error ? err.message : 'Unable to load guardian')
    } finally {
      setLoading(false)
    }
  }, [guardianId])

  useEffect(() => {
    fetchGuardian()
  }, [fetchGuardian])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Invalid phone number format'
    }
    if (formData.secondaryPhone && !phoneRegex.test(formData.secondaryPhone.trim())) {
      errors.secondaryPhone = 'Invalid phone number format'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          secondaryPhone: formData.secondaryPhone || null,
          email: formData.email || null,
          whatsappNumber: formData.whatsappNumber || null,
          nationalId: formData.nationalId || null,
          address: formData.address || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update guardian')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/students/guardians/${guardianId}`)
      }, 1500)
    } catch (err) {
      console.error('Error updating guardian:', err)
      setError(err instanceof Error ? err.message : 'Failed to update guardian')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof GuardianFormData, value: string | boolean | GuardianFlag[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when field is edited
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const toggleFlag = (flag: GuardianFlag) => {
    const newFlags = formData.flags.includes(flag)
      ? formData.flags.filter(f => f !== flag)
      : [...formData.flags, flag]
    handleInputChange('flags', newFlags)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error && !formData.firstName) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Go Back', onClick: () => router.push('/dashboard/students/guardians') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Guardian</h1>
        </div>
      </div>

      {/* Success/Error Banners */}
      {success && (
        <AlertBanner type="success" message="Guardian updated successfully! Redirecting..." />
      )}
      {error && (
        <AlertBanner type="danger" message={error} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  validationErrors.firstName ? 'border-red-500' : 'border-input'
                } bg-background`}
              />
              {validationErrors.firstName && (
                <p className="text-xs text-red-500">{validationErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  validationErrors.lastName ? 'border-red-500' : 'border-input'
                } bg-background`}
              />
              {validationErrors.lastName && (
                <p className="text-xs text-red-500">{validationErrors.lastName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Relationship</label>
              <select
                value={formData.relationship}
                onChange={(e) => handleInputChange('relationship', e.target.value as RelationshipType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.values(RelationshipType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">National ID</label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => handleInputChange('nationalId', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  validationErrors.phone ? 'border-red-500' : 'border-input'
                } bg-background`}
                placeholder="+256 700 000000"
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-500">{validationErrors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secondary Phone</label>
              <input
                type="tel"
                value={formData.secondaryPhone}
                onChange={(e) => handleInputChange('secondaryPhone', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  validationErrors.secondaryPhone ? 'border-red-500' : 'border-input'
                } bg-background`}
                placeholder="+256 700 000000"
              />
              {validationErrors.secondaryPhone && (
                <p className="text-xs text-red-500">{validationErrors.secondaryPhone}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  validationErrors.email ? 'border-red-500' : 'border-input'
                } bg-background`}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Number</label>
              <input
                type="tel"
                value={formData.whatsappNumber}
                onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="+256 700 000000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Channel</label>
              <select
                value={formData.preferredChannel}
                onChange={(e) => handleInputChange('preferredChannel', e.target.value as MessageChannel)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.values(MessageChannel).map((channel) => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Language Preference</label>
              <select
                value={formData.languagePreference}
                onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
                <option value="lg">Luganda</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.optOutNonCritical}
                  onChange={(e) => handleInputChange('optOutNonCritical', e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm">Opt out of non-critical messages</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Guardian will only receive emergency and critical messages
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status and Flags - Requirements 6.1, 6.2 */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as GuardianStatus)}
                className="w-full md:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.values(GuardianStatus).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              {formData.status === GuardianStatus.BLOCKED && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Blocked guardians cannot receive non-emergency messages
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Flags</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(GuardianFlag).map((flag) => (
                  <Badge
                    key={flag}
                    variant={formData.flags.includes(flag) ? 'destructive' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFlag(flag)}
                  >
                    {formData.flags.includes(flag) && '✓ '}
                    {flag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle flags. Flags are visible to staff when viewing this guardian.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
