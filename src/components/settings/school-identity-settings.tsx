'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Upload, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * School Identity Settings Component
 * Requirements: 10.1, 10.2, 10.3
 * - School name, logo, motto, contact information
 * - School type and boarding status
 * - Timezone and default language
 */

interface SchoolIdentityData {
  name: string
  code: string
  logo?: string
  motto?: string
  schoolType: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  boardingStatus: 'DAY' | 'BOARDING' | 'MIXED'
  address?: string
  phone?: string
  email?: string
  timezone: string
  defaultLanguage: string
}

const SCHOOL_TYPES = [
  { value: 'PRIMARY', label: 'Primary School' },
  { value: 'SECONDARY', label: 'Secondary School' },
  { value: 'BOTH', label: 'Primary & Secondary' },
]

const BOARDING_STATUSES = [
  { value: 'DAY', label: 'Day School' },
  { value: 'BOARDING', label: 'Boarding School' },
  { value: 'MIXED', label: 'Day & Boarding' },
]

const TIMEZONES = [
  { value: 'Africa/Kampala', label: 'East Africa Time (EAT)' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT)' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST)' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'fr', label: 'French' },
]

export function SchoolIdentitySettings() {
  const [settings, setSettings] = useState<SchoolIdentityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<SchoolIdentityData>({
    name: '',
    code: '',
    logo: '',
    motto: '',
    schoolType: 'PRIMARY',
    boardingStatus: 'DAY',
    address: '',
    phone: '',
    email: '',
    timezone: 'Africa/Kampala',
    defaultLanguage: 'en',
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/identity')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: SchoolIdentityData = await response.json()
      setSettings(data)
      setFormData({
        name: data.name || '',
        code: data.code || '',
        logo: data.logo || '',
        motto: data.motto || '',
        schoolType: data.schoolType || 'PRIMARY',
        boardingStatus: data.boardingStatus || 'DAY',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        timezone: data.timezone || 'Africa/Kampala',
        defaultLanguage: data.defaultLanguage || 'en',
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('error', 'School name is required')
      return
    }
    try {
      setSaving(true)
      const response = await fetch('/api/settings/identity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'School identity settings saved successfully')
      fetchSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: fetchSettings }} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>School name, code, and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="School Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <FormField label="School Code" name="code" value={formData.code} onChange={handleInputChange} helpText="Unique identifier for your school" />
            <FormField label="Motto" name="motto" value={formData.motto || ''} onChange={handleInputChange} />
            <FormField label="Logo URL" name="logo" value={formData.logo || ''} onChange={handleInputChange} helpText="URL to your school logo image" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Address and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Address" name="address" value={formData.address || ''} onChange={handleInputChange} />
            <FormField label="Phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleInputChange} />
            <FormField label="Email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Type</CardTitle>
            <CardDescription>Classification and boarding status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">School Type</label>
              <select name="schoolType" value={formData.schoolType} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SCHOOL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Boarding Status</label>
              <select name="boardingStatus" value={formData.boardingStatus} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {BOARDING_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>Timezone and language preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Language</label>
              <select name="defaultLanguage" value={formData.defaultLanguage} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
