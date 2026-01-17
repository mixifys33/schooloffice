'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Shield, Save, Key, Loader2, 
  Eye, FileText, CreditCard, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

/**
 * Portal Access Management UI
 * Enable/disable portal access, configure visible modules, reset password
 * Requirements: 5.1, 5.2, 5.3
 */

interface PortalAccess {
  isEnabled: boolean
  canViewAttendance: boolean
  canViewResults: boolean
  canViewFees: boolean
  canDownloadReports: boolean
  lastLogin: string | null
}

interface GuardianBasic {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string | null
  phone: string
}

export default function GuardianPortalPage() {
  const params = useParams()
  const router = useRouter()
  const guardianId = params.id as string

  const [guardian, setGuardian] = useState<GuardianBasic | null>(null)
  const [portalAccess, setPortalAccess] = useState<PortalAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Form state
  const [formData, setFormData] = useState<PortalAccess>({
    isEnabled: false,
    canViewAttendance: true,
    canViewResults: true,
    canViewFees: true,
    canDownloadReports: false,
    lastLogin: null,
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch guardian basic info
      const guardianRes = await fetch(`/api/guardians/${guardianId}`)
      if (!guardianRes.ok) throw new Error('Failed to fetch guardian')
      const guardianData = await guardianRes.json()
      setGuardian({
        id: guardianData.id,
        firstName: guardianData.firstName,
        lastName: guardianData.lastName,
        name: guardianData.name,
        email: guardianData.email,
        phone: guardianData.phone,
      })

      // Fetch portal access
      const portalRes = await fetch(`/api/guardians/${guardianId}/portal-access`)
      if (portalRes.ok) {
        const portalData = await portalRes.json()
        setPortalAccess(portalData)
        setFormData({
          isEnabled: portalData.isEnabled ?? false,
          canViewAttendance: portalData.canViewAttendance ?? true,
          canViewResults: portalData.canViewResults ?? true,
          canViewFees: portalData.canViewFees ?? true,
          canDownloadReports: portalData.canDownloadReports ?? false,
          lastLogin: portalData.lastLogin,
        })
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Unable to load portal access settings')
    } finally {
      setLoading(false)
    }
  }, [guardianId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggle = (field: keyof PortalAccess) => {
    if (field === 'lastLogin') return
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field],
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/portal-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: formData.isEnabled,
          canViewAttendance: formData.canViewAttendance,
          canViewResults: formData.canViewResults,
          canViewFees: formData.canViewFees,
          canDownloadReports: formData.canDownloadReports,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update portal access')
      }

      setSuccess('Portal access settings saved successfully')
      setHasChanges(false)
      await fetchData()
    } catch (err) {
      console.error('Error saving:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      setResetting(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/portal-access/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess('Password reset link sent to guardian')
      setShowResetDialog(false)
    } catch (err) {
      console.error('Error resetting password:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Portal Access</h1>
            <p className="text-sm text-muted-foreground">{guardian?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            disabled={!formData.isEnabled}
          >
            <Key className="h-4 w-4 mr-2" />
            Reset Password
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
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
      </div>

      {/* Alerts */}
      {error && <AlertBanner type="danger" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      {/* Portal Access Toggle - Requirement 5.1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portal Access
          </CardTitle>
          <CardDescription>
            Enable or disable this guardian's access to the parent portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Portal Access</p>
              <p className="text-sm text-muted-foreground">
                {formData.isEnabled 
                  ? 'Guardian can log in to the parent portal' 
                  : 'Guardian cannot access the parent portal'}
              </p>
            </div>
            <button
              onClick={() => handleToggle('isEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {portalAccess?.lastLogin && (
            <p className="text-sm text-muted-foreground mt-4">
              Last login: {formatDate(portalAccess.lastLogin)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Module Visibility - Requirement 5.2 */}
      <Card>
        <CardHeader>
          <CardTitle>Visible Modules</CardTitle>
          <CardDescription>
            Configure which modules this guardian can access in the portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attendance */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Attendance</p>
                <p className="text-sm text-muted-foreground">View student attendance records</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('canViewAttendance')}
              disabled={!formData.isEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.canViewAttendance && formData.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              } ${!formData.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.canViewAttendance ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Results */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Results</p>
                <p className="text-sm text-muted-foreground">View exam results and grades</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('canViewResults')}
              disabled={!formData.isEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.canViewResults && formData.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              } ${!formData.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.canViewResults ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Fees */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium">Fees</p>
                <p className="text-sm text-muted-foreground">View fee balances and payment history</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('canViewFees')}
              disabled={!formData.isEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.canViewFees && formData.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              } ${!formData.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.canViewFees ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Download Reports */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Download Reports</p>
                <p className="text-sm text-muted-foreground">Download report cards and documents</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('canDownloadReports')}
              disabled={!formData.isEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.canDownloadReports && formData.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              } ${!formData.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.canDownloadReports ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!formData.isEnabled && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Enable portal access to configure module visibility
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Login Credentials</CardTitle>
          <CardDescription>
            Guardian login information for the parent portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Email (Username)</p>
              <p className="font-medium">{guardian?.email || 'Not set'}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{guardian?.phone}</p>
            </div>
          </div>
          {!guardian?.email && (
            <AlertBanner 
              type="warning" 
              message="Guardian needs an email address to access the portal. Please update their profile." 
            />
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog - Requirement 5.3 */}
      <ConfirmationDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetPassword}
        title="Reset Portal Password"
        message={`Send a password reset link to ${guardian?.email || guardian?.phone}?`}
        confirmLabel="Send Reset Link"
        variant="default"
        loading={resetting}
      />
    </div>
  )
}
