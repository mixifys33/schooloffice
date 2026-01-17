'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, MessageSquare, Mail, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Communication Settings Component
 * Requirements: 13.1, 13.2, 13.3, 13.5
 * - SMS provider config, WhatsApp settings, email SMTP
 * - Quiet hours configuration
 */

interface CommunicationSettingsData {
  smsProvider?: string
  smsApiKey?: string
  smsSenderId?: string
  whatsappEnabled: boolean
  whatsappApiKey?: string
  emailSmtpHost?: string
  emailSmtpPort?: number
  emailSmtpUser?: string
  emailSmtpPassword?: string
  emailFromAddress?: string
  quietHoursStart?: string
  quietHoursEnd?: string
  emergencyOverrideEnabled: boolean
}

const SMS_PROVIDERS = [
  { value: 'africas_talking', label: "Africa's Talking" },
  { value: 'twilio', label: 'Twilio' },
  { value: 'nexmo', label: 'Nexmo/Vonage' },
]

export function CommunicationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<CommunicationSettingsData>({
    smsProvider: '',
    smsApiKey: '',
    smsSenderId: '',
    whatsappEnabled: false,
    whatsappApiKey: '',
    emailSmtpHost: '',
    emailSmtpPort: 587,
    emailSmtpUser: '',
    emailSmtpPassword: '',
    emailFromAddress: '',
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    emergencyOverrideEnabled: true,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/communication')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: CommunicationSettingsData = await response.json()
      setFormData({
        smsProvider: data.smsProvider || '',
        smsApiKey: data.smsApiKey || '',
        smsSenderId: data.smsSenderId || '',
        whatsappEnabled: data.whatsappEnabled || false,
        whatsappApiKey: data.whatsappApiKey || '',
        emailSmtpHost: data.emailSmtpHost || '',
        emailSmtpPort: data.emailSmtpPort || 587,
        emailSmtpUser: data.emailSmtpUser || '',
        emailSmtpPassword: data.emailSmtpPassword || '',
        emailFromAddress: data.emailFromAddress || '',
        quietHoursStart: data.quietHoursStart || '21:00',
        quietHoursEnd: data.quietHoursEnd || '07:00',
        emergencyOverrideEnabled: data.emergencyOverrideEnabled ?? true,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load communication settings. Please try again.')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await fetch('/api/settings/communication', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Communication settings saved successfully')
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
              <MessageSquare className="h-5 w-5" />
              SMS Configuration
            </CardTitle>
            <CardDescription>Configure SMS provider and sender settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">SMS Provider</label>
              <select name="smsProvider" value={formData.smsProvider} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select Provider</option>
                {SMS_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>{provider.label}</option>
                ))}
              </select>
            </div>
            <FormField label="API Key" name="smsApiKey" type="password" value={formData.smsApiKey || ''} onChange={handleInputChange} helpText="Your SMS provider API key" />
            <FormField label="Sender ID" name="smsSenderId" value={formData.smsSenderId || ''} onChange={handleInputChange} helpText="Max 11 characters" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              WhatsApp Configuration
            </CardTitle>
            <CardDescription>Configure WhatsApp Business API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="whatsappEnabled" name="whatsappEnabled" checked={formData.whatsappEnabled} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="whatsappEnabled" className="text-sm font-medium">Enable WhatsApp</label>
            </div>
            {formData.whatsappEnabled && (
              <FormField label="WhatsApp API Key" name="whatsappApiKey" type="password" value={formData.whatsappApiKey || ''} onChange={handleInputChange} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email SMTP Configuration
            </CardTitle>
            <CardDescription>Configure email server settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="SMTP Host" name="emailSmtpHost" value={formData.emailSmtpHost || ''} onChange={handleInputChange} />
            <FormField label="SMTP Port" name="emailSmtpPort" type="number" value={formData.emailSmtpPort?.toString() || '587'} onChange={handleInputChange} />
            <FormField label="SMTP Username" name="emailSmtpUser" value={formData.emailSmtpUser || ''} onChange={handleInputChange} />
            <FormField label="SMTP Password" name="emailSmtpPassword" type="password" value={formData.emailSmtpPassword || ''} onChange={handleInputChange} />
            <FormField label="From Address" name="emailFromAddress" type="email" value={formData.emailFromAddress || ''} onChange={handleInputChange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>Configure when non-emergency messages are held</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Quiet Hours Start" name="quietHoursStart" type="time" value={formData.quietHoursStart || '21:00'} onChange={handleInputChange} />
            <FormField label="Quiet Hours End" name="quietHoursEnd" type="time" value={formData.quietHoursEnd || '07:00'} onChange={handleInputChange} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="emergencyOverrideEnabled" name="emergencyOverrideEnabled" checked={formData.emergencyOverrideEnabled} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="emergencyOverrideEnabled" className="text-sm font-medium">Allow emergency messages during quiet hours</label>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
