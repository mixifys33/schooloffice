'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Users, MessageSquare, Eye, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'

/**
 * Guardian Settings Component
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 * - Relationship types, max guardians, message routing, portal visibility
 */

interface GuardianSettingsData {
  allowedRelationshipTypes: string[]
  maxGuardiansPerStudent: number
  defaultPrimaryGuardianLogic: 'FIRST_ADDED' | 'MOTHER' | 'FATHER' | 'MANUAL'
  academicMessageRecipients: string[]
  financeMessageRecipients: string[]
  portalDefaultVisibility: {
    attendance: boolean
    results: boolean
    fees: boolean
  }
  requireConsentAcknowledgement: boolean
  consentPolicyVersion: string
}

const ALL_RELATIONSHIP_TYPES = ['FATHER', 'MOTHER', 'GUARDIAN', 'UNCLE', 'AUNT', 'GRANDPARENT', 'SPONSOR', 'SIBLING', 'OTHER']

const PRIMARY_GUARDIAN_LOGIC = [
  { value: 'FIRST_ADDED', label: 'First Added Guardian' },
  { value: 'MOTHER', label: 'Mother (if available)' },
  { value: 'FATHER', label: 'Father (if available)' },
  { value: 'MANUAL', label: 'Manual Selection Only' },
]

export function GuardianSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<GuardianSettingsData>({
    allowedRelationshipTypes: ALL_RELATIONSHIP_TYPES,
    maxGuardiansPerStudent: 4,
    defaultPrimaryGuardianLogic: 'FIRST_ADDED',
    academicMessageRecipients: ['FATHER', 'MOTHER', 'GUARDIAN'],
    financeMessageRecipients: ['FATHER', 'MOTHER', 'GUARDIAN', 'SPONSOR'],
    portalDefaultVisibility: {
      attendance: true,
      results: true,
      fees: true,
    },
    requireConsentAcknowledgement: false,
    consentPolicyVersion: '1.0',
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/guardian')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: GuardianSettingsData = await response.json()
      setFormData({
        allowedRelationshipTypes: data.allowedRelationshipTypes?.length ? data.allowedRelationshipTypes : ALL_RELATIONSHIP_TYPES,
        maxGuardiansPerStudent: data.maxGuardiansPerStudent || 4,
        defaultPrimaryGuardianLogic: data.defaultPrimaryGuardianLogic || 'FIRST_ADDED',
        academicMessageRecipients: data.academicMessageRecipients || ['FATHER', 'MOTHER', 'GUARDIAN'],
        financeMessageRecipients: data.financeMessageRecipients || ['FATHER', 'MOTHER', 'GUARDIAN', 'SPONSOR'],
        portalDefaultVisibility: data.portalDefaultVisibility || { attendance: true, results: true, fees: true },
        requireConsentAcknowledgement: data.requireConsentAcknowledgement ?? false,
        consentPolicyVersion: data.consentPolicyVersion || '1.0',
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load guardian settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleRelationshipToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      allowedRelationshipTypes: prev.allowedRelationshipTypes.includes(type)
        ? prev.allowedRelationshipTypes.filter(t => t !== type)
        : [...prev.allowedRelationshipTypes, type]
    }))
  }

  const handleAcademicRecipientToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      academicMessageRecipients: prev.academicMessageRecipients.includes(type)
        ? prev.academicMessageRecipients.filter(t => t !== type)
        : [...prev.academicMessageRecipients, type]
    }))
  }

  const handleFinanceRecipientToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      financeMessageRecipients: prev.financeMessageRecipients.includes(type)
        ? prev.financeMessageRecipients.filter(t => t !== type)
        : [...prev.financeMessageRecipients, type]
    }))
  }

  const handlePortalVisibilityChange = (field: 'attendance' | 'results' | 'fees') => {
    setFormData(prev => ({
      ...prev,
      portalDefaultVisibility: {
        ...prev.portalDefaultVisibility,
        [field]: !prev.portalDefaultVisibility[field]
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.allowedRelationshipTypes.length === 0) {
      showToast('error', 'At least one relationship type is required')
      return
    }
    try {
      setSaving(true)
      const response = await fetch('/api/settings/guardian', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Guardian settings saved successfully')
      fetchSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={3} />
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
              <Users className="h-5 w-5" />
              Relationship Types
            </CardTitle>
            <CardDescription>Allowed guardian relationship types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ALL_RELATIONSHIP_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={formData.allowedRelationshipTypes.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleRelationshipToggle(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Click to toggle relationship types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardian Limits</CardTitle>
            <CardDescription>Configure guardian assignment rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Max Guardians per Student" 
              name="maxGuardiansPerStudent" 
              type="number" 
              value={formData.maxGuardiansPerStudent.toString()} 
              onChange={handleInputChange} 
              helpText="Maximum number of guardians per student (1-10)"
            />
            <div>
              <label className="block text-sm font-medium mb-1">Default Primary Guardian Logic</label>
              <select name="defaultPrimaryGuardianLogic" value={formData.defaultPrimaryGuardianLogic} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {PRIMARY_GUARDIAN_LOGIC.map(logic => (
                  <option key={logic.value} value={logic.value}>{logic.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Academic Message Recipients
            </CardTitle>
            <CardDescription>Who receives academic messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.allowedRelationshipTypes.map(type => (
                <Badge
                  key={type}
                  variant={formData.academicMessageRecipients.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleAcademicRecipientToggle(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Finance Message Recipients
            </CardTitle>
            <CardDescription>Who receives finance messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.allowedRelationshipTypes.map(type => (
                <Badge
                  key={type}
                  variant={formData.financeMessageRecipients.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleFinanceRecipientToggle(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Portal Default Visibility
            </CardTitle>
            <CardDescription>Default visibility settings for guardian portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="portalAttendance" checked={formData.portalDefaultVisibility.attendance} onChange={() => handlePortalVisibilityChange('attendance')} className="rounded border-input" />
              <label htmlFor="portalAttendance" className="text-sm font-medium">Attendance</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="portalResults" checked={formData.portalDefaultVisibility.results} onChange={() => handlePortalVisibilityChange('results')} className="rounded border-input" />
              <label htmlFor="portalResults" className="text-sm font-medium">Results</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="portalFees" checked={formData.portalDefaultVisibility.fees} onChange={() => handlePortalVisibilityChange('fees')} className="rounded border-input" />
              <label htmlFor="portalFees" className="text-sm font-medium">Fees</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Consent Settings
            </CardTitle>
            <CardDescription>Configure consent requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="requireConsentAcknowledgement" name="requireConsentAcknowledgement" checked={formData.requireConsentAcknowledgement} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="requireConsentAcknowledgement" className="text-sm font-medium">Require consent acknowledgement</label>
            </div>
            <FormField 
              label="Consent Policy Version" 
              name="consentPolicyVersion" 
              value={formData.consentPolicyVersion} 
              onChange={handleInputChange} 
              helpText="Current version of consent policy"
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
