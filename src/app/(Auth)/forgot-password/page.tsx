'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'

/**
 * Forgot Password Page
 * Secure password recovery with multiple options
 * - No information leakage (same response whether user exists or not)
 * - Multiple recovery methods: email, phone, security questions
 */

type RecoveryMethod = 'email' | 'phone' | 'admin'
type Step = 'school' | 'method' | 'verify' | 'reset' | 'success'

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const RESEND_COOLDOWN_SECONDS = 120 // 2 minutes

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('school')
  const [schoolCode, setSchoolCode] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [maskedContact, setMaskedContact] = useState('')
  const [resetToken, setResetToken] = useState('')
  
  // Resend countdown timer
  const [resendCountdown, setResendCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)

  // Start countdown when entering verify step
  const startResendCountdown = useCallback(() => {
    setResendCountdown(RESEND_COOLDOWN_SECONDS)
    setCanResend(false)
  }, [])

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (resendCountdown === 0 && step === 'verify') {
      setCanResend(true)
    }
  }, [resendCountdown, step])

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const validateSchoolStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!schoolCode.trim()) {
      newErrors.schoolCode = 'School code is required'
    } else if (schoolCode.trim().length < 3) {
      newErrors.schoolCode = 'School code must be at least 3 characters'
    }
    if (!identifier.trim()) {
      newErrors.identifier = 'Email, phone, or username is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVerifyStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!verificationCode.trim()) {
      newErrors.verificationCode = 'Verification code is required'
    } else if (verificationCode.length !== 6) {
      newErrors.verificationCode = 'Code must be 6 digits'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateResetStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Password must include uppercase, lowercase, and number'
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Step 1: Submit school code and identifier to initiate recovery
  const handleInitiateRecovery = async () => {
    if (!validateSchoolStep()) return

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/forgot-password/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
        }),
      })

      const data = await response.json()

      // Always show success to prevent user enumeration
      // The response will indicate available recovery methods without revealing if user exists
      if (data.methods) {
        setStep('method')
        // Store masked contact info for display
        if (data.maskedEmail) setMaskedContact(data.maskedEmail)
      } else {
        // Generic success message even if user doesn't exist
        setStep('method')
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Select recovery method and send code
  const handleSendCode = async () => {
    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          method: recoveryMethod,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMaskedContact(data.maskedContact || '')
        setStep('verify')
        startResendCountdown()
        setToast({ type: 'success', message: 'Verification code sent!' })
      } else {
        // Generic error to prevent information leakage
        setToast({ type: 'info', message: 'If an account exists, a verification code has been sent.' })
        setStep('verify')
        startResendCountdown()
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Verify code
  const handleVerifyCode = async () => {
    if (!validateVerifyStep()) return

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          code: verificationCode,
        }),
      })

      const data = await response.json()

      if (response.ok && data.token) {
        setResetToken(data.token)
        setStep('reset')
      } else {
        setErrors({ verificationCode: 'Invalid or expired code' })
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 4: Reset password
  const handleResetPassword = async () => {
    if (!validateResetStep()) return

    setIsLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      })

      if (response.ok) {
        setStep('success')
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || 'Failed to reset password' })
      }
    } catch {
      setToast({ type: 'error', message: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Request admin help
  const handleRequestAdminHelp = () => {
    // Redirect to contact admin page with pre-filled info
    const params = new URLSearchParams({
      schoolCode: schoolCode,
      issue: 'password',
    })
    window.location.href = `/contact-admin?${params.toString()}`
  }

  // Resend code
  const handleResendCode = async () => {
    if (!canResend) return
    
    setIsLoading(true)
    try {
      await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          method: recoveryMethod,
        }),
      })
      startResendCountdown()
      setToast({ type: 'success', message: 'New code sent!' })
    } catch {
      setToast({ type: 'error', message: 'Failed to resend code' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {toast && (
        <ToastContainer position="top-center">
          <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
        </ToastContainer>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {step === 'success' ? 'Password Reset' : 'Recover Your Account'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 'school' && 'Enter your school code and account identifier'}
            {step === 'method' && 'Choose how to receive your verification code'}
            {step === 'verify' && 'Enter the verification code'}
            {step === 'reset' && 'Create your new password'}
            {step === 'success' && 'Your password has been reset successfully'}
          </p>
        </div>

        {/* Progress Indicator */}
        {step !== 'success' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                Step {step === 'school' ? 1 : step === 'method' ? 2 : step === 'verify' ? 3 : 4} of 4
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div 
                className="bg-gray-900 dark:bg-white h-1 rounded-full transition-all duration-300"
                style={{ 
                  width: step === 'school' ? '25%' : step === 'method' ? '50%' : step === 'verify' ? '75%' : '100%' 
                }}
              />
            </div>
          </div>
        )}

        {/* Step 1: School Code & Identifier */}
        {step === 'school' && (
          <div className="space-y-4">
            <FormField
              label="School Code"
              name="schoolCode"
              placeholder="Enter your school code"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
              error={errors.schoolCode}
              required
              touchFriendly
            />
            <p className="text-xs text-gray-500 -mt-2">Example: STMARYS, GREENHILL</p>

            <FormField
              label="Email, Phone, or Username"
              name="identifier"
              placeholder="Enter your registered email, phone, or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
              required
              touchFriendly
            />

            <Button
              onClick={handleInitiateRecovery}
              disabled={isLoading}
              size="touch"
              className="w-full"
            >
              {isLoading ? 'Please wait...' : 'Continue'}
            </Button>
          </div>
        )}

        {/* Step 2: Choose Recovery Method */}
        {step === 'method' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select how you&apos;d like to receive your verification code:
            </p>

            <div className="space-y-3">
              <label 
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  recoveryMethod === 'email' 
                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={recoveryMethod === 'email'}
                  onChange={() => setRecoveryMethod('email')}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Email</div>
                  <div className="text-xs text-gray-500">Send code to your registered email</div>
                </div>
                {recoveryMethod === 'email' && (
                  <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>

              <label 
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  recoveryMethod === 'phone' 
                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="phone"
                  checked={recoveryMethod === 'phone'}
                  onChange={() => setRecoveryMethod('phone')}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">SMS</div>
                  <div className="text-xs text-gray-500">Send code to your registered phone</div>
                </div>
                {recoveryMethod === 'phone' && (
                  <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>

              <label 
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  recoveryMethod === 'admin' 
                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="admin"
                  checked={recoveryMethod === 'admin'}
                  onChange={() => setRecoveryMethod('admin')}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Contact Admin</div>
                  <div className="text-xs text-gray-500">Request help from school administrator</div>
                </div>
                {recoveryMethod === 'admin' && (
                  <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep('school')}
                size="touch"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={recoveryMethod === 'admin' ? handleRequestAdminHelp : handleSendCode}
                disabled={isLoading}
                size="touch"
                className="flex-1"
              >
                {isLoading ? 'Sending...' : recoveryMethod === 'admin' ? 'Contact Admin' : 'Send Code'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            {maskedContact && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Code sent to: <span className="font-medium">{maskedContact}</span>
                </p>
              </div>
            )}

            <FormField
              label="Verification Code"
              name="verificationCode"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={errors.verificationCode}
              required
              touchFriendly
            />

            <p className="text-xs text-gray-500 text-center">
              Didn&apos;t receive the code?{' '}
              {canResend ? (
                <button
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="text-gray-900 dark:text-white hover:underline font-medium"
                >
                  Resend Code
                </button>
              ) : (
                <span className="text-gray-400">
                  Resend in {formatCountdown(resendCountdown)}
                </span>
              )}
            </p>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep('method')}
                size="touch"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                size="touch"
                className="flex-1"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Reset Password */}
        {step === 'reset' && (
          <div className="space-y-4">
            <FormField
              label="New Password"
              name="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
              required
              touchFriendly
            />
            <p className="text-xs text-gray-500 -mt-2">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>

            <FormField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              required
              touchFriendly
            />

            <Button
              onClick={handleResetPassword}
              disabled={isLoading}
              size="touch"
              className="w-full"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link href="/login">
              <Button size="touch" className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        )}

        {/* Footer */}
        {step !== 'success' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
            <Link 
              href="/login" 
              className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              ← Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
