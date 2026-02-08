'use client'

import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Send, AlertCircle, CheckCircle, RefreshCw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Dialog } from '@/components/ui/dialog'

interface StaffCredentials {
  name: string
  email: string
  phone: string
  password: string
  role: string
  schoolCode: string
  staffId?: string
  createdAt?: Date
}

interface StaffCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: string | null
  staffName?: string
}

export function StaffCredentialsModal({ 
  isOpen, 
  onClose, 
  staffId, 
  staffName 
}: StaffCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<StaffCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationData, setVerificationData] = useState({
    identifier: '',
    password: '',
  })
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [credentialsSent, setCredentialsSent] = useState(false)
  const [sentTimestamp, setSentTimestamp] = useState<number | null>(null)

  // Auto-reset success state after 2 minutes
  useEffect(() => {
    if (credentialsSent && sentTimestamp) {
      const timer = setTimeout(() => {
        setCredentialsSent(false)
        setSentTimestamp(null)
        setSuccess(null)
      }, 2 * 60 * 1000) // 2 minutes

      return () => clearTimeout(timer)
    }
  }, [credentialsSent, sentTimestamp])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && staffId) {
      setError(null)
      setSuccess(null)
      setShowPassword(false)
      setShowVerification(false)
      setVerified(false)
      setCredentials(null)
      fetchCredentials()
    } else {
      // Reset all state when modal closes
      setCredentials(null)
      setError(null)
      setSuccess(null)
      setShowPassword(false)
      setShowVerification(false)
      setVerified(false)
      setVerificationData({ identifier: '', password: '' })
    }
  }, [isOpen, staffId])

  const fetchCredentials = async () => {
    if (!staffId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/staff/onboarding/credentials/${staffId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch credentials')
      }

      const data = await response.json()
      setCredentials(data.credentials)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAdmin = async () => {
    if (!verificationData.identifier || !verificationData.password) {
      setError('Please enter your email/phone/username and password')
      return
    }

    setVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      setVerified(true)
      setShowVerification(false)
      setSuccess('Admin credentials verified successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCredentials = async () => {
    if (!staffId || !verified) {
      setShowVerification(true)
      return
    }

    setResending(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/staff/onboarding/credentials/${staffId}/resend`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resend credentials')
      }

      const data = await response.json()
      setSuccess(data.message)
      
      // Refresh credentials to get the new password
      await fetchCredentials()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend credentials')
    } finally {
      setResending(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
                <Shield className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  Staff Login Credentials
                </h2>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  {staffName ? `View and manage credentials for ${staffName}` : 'View and manage staff credentials'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto mb-4"></div>
                <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Loading credentials...</p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[var(--chart-red)] dark:text-[var(--danger)]" />
                  <p className="text-[var(--chart-red)] dark:text-[var(--danger)]">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20 border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[var(--chart-green)] dark:text-[var(--success)]" />
                  <p className="text-[var(--chart-green)] dark:text-[var(--success)]">{success}</p>
                </div>
              </div>
            )}

            {/* Admin Verification */}
            {showVerification && (
              <div className="mb-6 p-6 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-6 w-6 text-[var(--chart-yellow)] dark:text-[var(--warning)]" />
                  <div>
                    <h3 className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning-light)]">
                      Admin Verification Required
                    </h3>
                    <p className="text-sm text-[var(--warning-dark)] dark:text-[var(--warning)]">
                      Please verify your admin credentials to proceed with this action.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FormField
                    label="Email, Phone, or Username"
                    name="identifier"
                    value={verificationData.identifier}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, identifier: e.target.value }))}
                    placeholder="Enter your email, phone, or username"
                    required
                  />

                  <FormField
                    label="Password"
                    name="password"
                    type="password"
                    value={verificationData.password}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowVerification(false)}
                      disabled={verifying}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleVerifyAdmin}
                      disabled={verifying}
                      className="flex-1"
                    >
                      {verifying ? 'Verifying...' : 'Verify Admin'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Credentials Display */}
            {credentials && !loading && (
              <div className="space-y-6">
                <div className="p-6 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      Login Credentials for {credentials.name}
                    </h4>
                    {credentials.createdAt && (
                      <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                        Generated: {new Date(credentials.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Name</label>
                      <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{credentials.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Role</label>
                      <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{credentials.role}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Email</label>
                      <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{credentials.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Phone</label>
                      <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{credentials.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">School Code</label>
                      <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{credentials.schoolCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Temporary Password</label>
                      <div className="flex items-center gap-2">
                        <code className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] px-2 py-1 rounded text-sm font-mono">
                          {showPassword ? credentials.password : '••••••••••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[var(--chart-yellow)] dark:text-[var(--warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning-light)] mb-1">
                        Important Notes
                      </h4>
                      <ul className="text-sm text-[var(--warning-dark)] dark:text-[var(--warning)] space-y-1">
                        <li>• Staff member must change password on first login</li>
                        <li>• Credentials are only valid until first password change</li>
                        <li>• Share credentials securely (preferably in person)</li>
                        <li>• Use "Resend Credentials" to generate new temporary password</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleResendCredentials}
                    disabled={resending}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Generating & Sending...' : 'Resend Credentials'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}