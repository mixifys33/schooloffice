'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'

/**
 * Forced Password Reset Component
 * Handles mandatory password reset for new staff members
 * Requirements: Force password reset on first login with validation
 */

interface PasswordValidation {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

interface ForcedPasswordResetProps {
  onComplete?: () => void
}

export function ForcedPasswordReset({ onComplete }: ForcedPasswordResetProps) {
  const { data: session, update } = useSession()
  
  const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(3)

  // Form data
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    // Verification fields
    email: session?.user?.email || '',
    phone: '',
    name: '',
    role: session?.user?.role || '',
    schoolId: session?.user?.schoolId || '',
  })

  // Password validation
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  })

  // Handle completion callback
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    } else {
      // Redirect to login page for fresh authentication
      window.location.href = '/login?message=password-updated'
    }
  }, [onComplete])

  // Countdown timer for redirect
  useEffect(() => {
    if (step === 'success' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (step === 'success' && redirectCountdown === 0) {
      handleComplete()
    }
  }, [step, redirectCountdown, handleComplete])

  // Validate password in real-time
  useEffect(() => {
    const password = formData.newPassword
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    })
  }, [formData.newPassword])

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)
  const passwordsMatch = formData.newPassword === formData.confirmPassword

  const handleVerifyIdentity = async () => {
    // Only require email, name, and current password - phone is optional
    if (!formData.email || !formData.name || !formData.currentPassword) {
      setError('Email, name, and current password are required for identity verification')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone,
          name: formData.name,
          role: formData.role,
          schoolId: formData.schoolId,
          currentPassword: formData.currentPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Identity verification failed')
      }

      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identity verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed')
      }

      // Update session to remove force password reset flag
      await update({
        ...session,
        user: {
          ...session?.user,
          forcePasswordReset: false,
        },
      })

      setStep('success')
      
      // Reset countdown for redirect
      setRedirectCountdown(3)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-[var(--chart-red)] dark:text-[var(--danger)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Password Reset Required
            </h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
              For security reasons, you must change your password before accessing the system
            </p>
          </div>

          {/* Verify Identity Step */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[var(--chart-blue)] dark:text-[var(--chart-blue)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-[var(--info-dark)] dark:text-[var(--info-light)] mb-1">
                      Identity Verification Required
                    </h3>
                    <p className="text-sm text-[var(--accent-hover)] dark:text-[var(--info)]">
                      Please verify your identity by providing the following information along with your temporary password.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name as registered"
                  required
                  touchFriendly
                />

                <FormField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your registered email"
                  required
                  touchFriendly
                />

                <FormField
                  label="Phone Number (Optional)"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your registered phone number (optional)"
                  touchFriendly
                />

                <FormField
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Enter your role (e.g., Deputy, Bursar, Teacher)"
                  required
                  touchFriendly
                />

                <FormField
                  label="School Code"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={(e) => setFormData(prev => ({ ...prev, schoolId: e.target.value.toUpperCase() }))}
                  placeholder="Enter your school code"
                  required
                  touchFriendly
                />

                <div className="relative">
                  <FormField
                    label="Temporary Password"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter the temporary password you received"
                    required
                    touchFriendly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 text-[var(--chart-red)] dark:text-[var(--danger)] rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                onClick={handleVerifyIdentity}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Verifying...' : 'Verify Identity'}
              </Button>
            </div>
          )}

          {/* Reset Password Step */}
          {step === 'reset' && (
            <div className="space-y-6">
              <div className="p-4 bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[var(--chart-green)] dark:text-[var(--success)]" />
                  <p className="text-sm text-[var(--chart-green)] dark:text-[var(--success)]">
                    Identity verified successfully. Now create your new password.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <FormField
                    label="New Password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter your new password"
                    required
                    touchFriendly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Password Requirements */}
                <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3">
                    Password Requirements:
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: 'minLength', label: 'At least 8 characters' },
                      { key: 'hasUppercase', label: 'One uppercase letter' },
                      { key: 'hasLowercase', label: 'One lowercase letter' },
                      { key: 'hasNumber', label: 'One number' },
                      { key: 'hasSpecialChar', label: 'One special character (!@#$%^&*)' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordValidation[key as keyof PasswordValidation]
                            ? 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]'
                            : 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]'
                        }`}>
                          {passwordValidation[key as keyof PasswordValidation] && (
                            <CheckCircle className="h-3 w-3 text-[var(--chart-green)] dark:text-[var(--success)]" />
                          )}
                        </div>
                        <span className={`text-sm ${
                          passwordValidation[key as keyof PasswordValidation]
                            ? 'text-[var(--chart-green)] dark:text-[var(--success)]'
                            : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
                        }`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <FormField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your new password"
                    required
                    touchFriendly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {formData.confirmPassword && !passwordsMatch && (
                  <div className="flex items-center gap-2 p-2 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 text-[var(--chart-red)] dark:text-[var(--danger)] rounded">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">Passwords do not match</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 text-[var(--chart-red)] dark:text-[var(--danger)] rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                onClick={handleResetPassword}
                disabled={isLoading || !isPasswordValid || !passwordsMatch}
                className="w-full"
                size="lg"
              >
                <Lock className="h-4 w-4 mr-2" />
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-[var(--success-light)] dark:bg-[var(--success-dark)] rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-[var(--chart-green)] dark:text-[var(--success)]" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                  Password Updated Successfully!
                </h3>
                <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Your password has been changed and your account is now secure. You will be redirected to the login page to sign in with your new password.
                </p>
              </div>

              <div className="p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 rounded-lg text-left">
                <h4 className="font-medium text-[var(--info-dark)] dark:text-[var(--info-light)] mb-2">
                  Next Steps:
                </h4>
                <ul className="text-sm text-[var(--accent-hover)] dark:text-[var(--info)] space-y-1">
                  <li>• You will be redirected to the login page automatically</li>
                  <li>• Sign in using your email and new password</li>
                  <li>• Your account will have full access to all features</li>
                  <li>• Keep your new password secure and confidential</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleComplete}
                  className="w-full"
                  size="lg"
                >
                  Continue to Login
                </Button>
                
                <p className="text-xs text-[var(--text-muted)]">
                  {redirectCountdown > 0 
                    ? `Redirecting automatically in ${redirectCountdown} second${redirectCountdown !== 1 ? 's' : ''}...`
                    : 'Redirecting now...'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}