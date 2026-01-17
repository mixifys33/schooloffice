'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Shield, Lock, Clock, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Security Settings Component
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.6
 * - Password rules, login limits, session timeout, 2FA toggle
 */

interface SecuritySettingsData {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  sessionTimeoutMinutes: number
  enableTwoFactorAuth: boolean
  autoLogoutOnInactivity: boolean
}

export function SecuritySettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<SecuritySettingsData>({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 60,
    enableTwoFactorAuth: false,
    autoLogoutOnInactivity: true,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/security')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: SecuritySettingsData = await response.json()
      setFormData({
        passwordMinLength: data.passwordMinLength || 8,
        passwordRequireUppercase: data.passwordRequireUppercase ?? true,
        passwordRequireNumbers: data.passwordRequireNumbers ?? true,
        passwordRequireSpecialChars: data.passwordRequireSpecialChars ?? false,
        maxLoginAttempts: data.maxLoginAttempts || 5,
        lockoutDurationMinutes: data.lockoutDurationMinutes || 15,
        sessionTimeoutMinutes: data.sessionTimeoutMinutes || 60,
        enableTwoFactorAuth: data.enableTwoFactorAuth ?? false,
        autoLogoutOnInactivity: data.autoLogoutOnInactivity ?? true,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load security settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate password minimum length
    if (formData.passwordMinLength < 6 || formData.passwordMinLength > 128) {
      showToast('error', 'Password minimum length must be between 6 and 128 characters')
      return
    }
    
    // Validate max login attempts
    if (formData.maxLoginAttempts < 1 || formData.maxLoginAttempts > 20) {
      showToast('error', 'Maximum login attempts must be between 1 and 20')
      return
    }
    
    // Validate lockout duration
    if (formData.lockoutDurationMinutes < 1 || formData.lockoutDurationMinutes > 1440) {
      showToast('error', 'Lockout duration must be between 1 and 1440 minutes')
      return
    }
    
    // Validate session timeout
    if (formData.sessionTimeoutMinutes < 5 || formData.sessionTimeoutMinutes > 1440) {
      showToast('error', 'Session timeout must be between 5 and 1440 minutes')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Security settings saved successfully')
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
              <Lock className="h-5 w-5" />
              Password Rules
            </CardTitle>
            <CardDescription>Configure password complexity requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Minimum Password Length" 
              name="passwordMinLength" 
              type="number" 
              value={formData.passwordMinLength.toString()} 
              onChange={handleInputChange} 
              helpText="Between 6 and 128 characters"
            />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="passwordRequireUppercase" 
                  name="passwordRequireUppercase" 
                  checked={formData.passwordRequireUppercase} 
                  onChange={handleInputChange} 
                  className="rounded border-input" 
                />
                <label htmlFor="passwordRequireUppercase" className="text-sm font-medium">
                  Require uppercase letters
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="passwordRequireNumbers" 
                  name="passwordRequireNumbers" 
                  checked={formData.passwordRequireNumbers} 
                  onChange={handleInputChange} 
                  className="rounded border-input" 
                />
                <label htmlFor="passwordRequireNumbers" className="text-sm font-medium">
                  Require numbers
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="passwordRequireSpecialChars" 
                  name="passwordRequireSpecialChars" 
                  checked={formData.passwordRequireSpecialChars} 
                  onChange={handleInputChange} 
                  className="rounded border-input" 
                />
                <label htmlFor="passwordRequireSpecialChars" className="text-sm font-medium">
                  Require special characters
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Login Security
            </CardTitle>
            <CardDescription>Configure login attempt limits and lockout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Maximum Login Attempts" 
              name="maxLoginAttempts" 
              type="number" 
              value={formData.maxLoginAttempts.toString()} 
              onChange={handleInputChange} 
              helpText="Between 1 and 20 attempts"
            />
            <FormField 
              label="Lockout Duration (minutes)" 
              name="lockoutDurationMinutes" 
              type="number" 
              value={formData.lockoutDurationMinutes.toString()} 
              onChange={handleInputChange} 
              helpText="Between 1 and 1440 minutes (24 hours)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Settings
            </CardTitle>
            <CardDescription>Configure session timeout and inactivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Session Timeout (minutes)" 
              name="sessionTimeoutMinutes" 
              type="number" 
              value={formData.sessionTimeoutMinutes.toString()} 
              onChange={handleInputChange} 
              helpText="Between 5 and 1440 minutes (24 hours)"
            />
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="autoLogoutOnInactivity" 
                name="autoLogoutOnInactivity" 
                checked={formData.autoLogoutOnInactivity} 
                onChange={handleInputChange} 
                className="rounded border-input" 
              />
              <label htmlFor="autoLogoutOnInactivity" className="text-sm font-medium">
                Automatic logout on inactivity
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Enable additional security layer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="enableTwoFactorAuth" 
                name="enableTwoFactorAuth" 
                checked={formData.enableTwoFactorAuth} 
                onChange={handleInputChange} 
                className="rounded border-input" 
              />
              <label htmlFor="enableTwoFactorAuth" className="text-sm font-medium">
                Enable Two-Factor Authentication
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, users will be required to verify their identity using a second factor during login.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
