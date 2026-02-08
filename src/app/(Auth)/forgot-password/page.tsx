'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FormField, PasswordField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Modern Forgot Password Page - Redesigned
 * Features:
 * - Enhanced UI/UX with modern design patterns
 * - Multi-step wizard with smooth transitions
 * - Improved security with no information leakage
 * - Touch-friendly mobile design
 * - Real-time validation and feedback
 * - Progressive enhancement
 * - Better accessibility
 */

type RecoveryMethod = 'email' | 'sms' | 'admin'
type Step = 'identify' | 'method' | 'verify' | 'reset' | 'success'

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface SendCodeResult {
  success: boolean
  sent: boolean
  maskedContact: string
  debugInfo?: {
    email: string
    verificationCode: string
    sendResult: Record<string, unknown>
    error?: string
  }
}

const RESEND_COOLDOWN_SECONDS = 120 // 2 minutes
const CODE_LENGTH = 6

export default function ForgotPasswordPage() {
  // Core state
  const [step, setStep] = useState<Step>('identify')
  const [schoolCode, setSchoolCode] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [maskedContact, setMaskedContact] = useState('')
  
  // Debug state (development only)
  const [debugInfo, setDebugInfo] = useState<SendCodeResult['debugInfo'] | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  
  // Resend functionality
  const [resendCountdown, setResendCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [] as string[]
  })

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Resend countdown timer
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

  // Password strength calculation
  useEffect(() => {
    if (newPassword) {
      const strength = calculatePasswordStrength(newPassword)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength({ score: 0, feedback: [] })
    }
  }, [newPassword])

  // Start resend countdown
  const startResendCountdown = useCallback(() => {
    setResendCountdown(RESEND_COOLDOWN_SECONDS)
    setCanResend(false)
  }, [])

  // Format countdown as MM:SS
  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score += 1
    else feedback.push('At least 8 characters')

    if (/[a-z]/.test(password)) score += 1
    else feedback.push('Lowercase letter')

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('Uppercase letter')

    if (/\d/.test(password)) score += 1
    else feedback.push('Number')

    if (/[^a-zA-Z0-9]/.test(password)) score += 1
    else feedback.push('Special character')

    return { score, feedback }
  }

  // Validation functions
  const validateIdentifyStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!schoolCode.trim()) {
      newErrors.schoolCode = 'School code is required'
    } else if (schoolCode.trim().length < 3) {
      newErrors.schoolCode = 'School code must be at least 3 characters'
    }
    
    if (!identifier.trim()) {
      newErrors.identifier = 'Email, phone, or username is required'
    } else {
      // Basic format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/
      
      if (!emailRegex.test(identifier) && !phoneRegex.test(identifier) && identifier.length < 3) {
        newErrors.identifier = 'Please enter a valid email, phone number, or username'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVerifyStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!verificationCode.trim()) {
      newErrors.verificationCode = 'Verification code is required'
    } else if (verificationCode.length !== CODE_LENGTH) {
      newErrors.verificationCode = `Code must be ${CODE_LENGTH} digits`
    } else if (!/^\d+$/.test(verificationCode)) {
      newErrors.verificationCode = 'Code must contain only numbers'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateResetStep = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (passwordStrength.score < 4) {
      newErrors.newPassword = 'Password is too weak. Please address the requirements below.'
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Step 1: Submit school code and identifier to initiate recovery
  const handleInitiateRecovery = async () => {
    if (!validateIdentifyStep()) return

    setIsLoading(true)
    setErrors({})
    setShowDebug(false)

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

      if (response.ok) {
        // Store masked contact info if available
        if (data.maskedEmail) setMaskedContact(data.maskedEmail)
        if (data.maskedPhone && !data.maskedEmail) setMaskedContact(data.maskedPhone)
        
        setStep('method')
        setToast({ 
          type: 'success', 
          message: 'Account verified. Please select a recovery method.' 
        })
      } else {
        // Even on error, proceed to method selection to prevent enumeration
        setStep('method')
        setToast({ 
          type: 'info', 
          message: 'Please select how you\'d like to recover your account.' 
        })
      }
    } catch (error) {
      console.error('Initiate recovery error:', error)
      setToast({ 
        type: 'error', 
        message: 'Something went wrong. Please try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Select recovery method and send code
  const handleSendCode = async () => {
    setIsLoading(true)
    setErrors({})
    setShowDebug(false)

    try {
      const response = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          method: recoveryMethod === 'sms' ? 'phone' : recoveryMethod,
        }),
      })

      const data: SendCodeResult = await response.json()

      if (response.ok) {
        setMaskedContact(data.maskedContact || '')
        setDebugInfo(data.debugInfo || null)
        
        setStep('verify')
        startResendCountdown()
        
        if (data.sent) {
          setToast({ 
            type: 'success', 
            message: `Verification code sent to ${typeof data.maskedContact === 'string' ? data.maskedContact : 'your contact method'}` 
          })
        } else {
          setToast({ 
            type: 'warning', 
            message: 'Code generated but delivery may have failed. Check debug info.' 
          })
        }
        
        // Show debug info in development
        if (process.env.NODE_ENV === 'development' && data.debugInfo) {
          setShowDebug(true)
        }
      } else {
        // Generic success to prevent enumeration
        setStep('verify')
        startResendCountdown()
        setToast({ 
          type: 'info', 
          message: 'If an account exists, a verification code has been sent.' 
        })
      }
    } catch (error) {
      console.error('Send code error:', error)
      setToast({ 
        type: 'error', 
        message: 'Failed to send verification code. Please try again.' 
      })
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
        setToast({ 
          type: 'success', 
          message: 'Code verified! Please set your new password.' 
        })
      } else {
        setErrors({ 
          verificationCode: typeof data.error === 'string' ? data.error : 'Invalid or expired code' 
        })
      }
    } catch (error) {
      console.error('Verify code error:', error)
      setToast({ 
        type: 'error', 
        message: 'Failed to verify code. Please try again.' 
      })
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

      const data = await response.json()

      if (response.ok) {
        setStep('success')
        // Remove the duplicate toast - success step will handle the message
      } else {
        setToast({ 
          type: 'error', 
          message: typeof data.error === 'string' ? data.error : 'Failed to reset password' 
        })
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setToast({ 
        type: 'error', 
        message: 'Failed to reset password. Please try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Request admin help
  const handleRequestAdminHelp = () => {
    const params = new URLSearchParams({
      schoolCode: schoolCode,
      issue: 'password-reset',
      identifier: identifier,
    })
    window.location.href = `/contact-admin?${params.toString()}`
  }

  // Resend code
  const handleResendCode = async () => {
    if (!canResend) return
    
    setIsLoading(true)
    setShowDebug(false)
    
    try {
      const response = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          method: recoveryMethod === 'sms' ? 'phone' : recoveryMethod,
        }),
      })
      
      const data: SendCodeResult = await response.json()
      
      if (response.ok) {
        setDebugInfo(data.debugInfo || null)
        
        if (data.sent) {
          setToast({ 
            type: 'success', 
            message: 'New verification code sent!' 
          })
        } else {
          setToast({ 
            type: 'warning', 
            message: 'Code generated but delivery may have failed.' 
          })
        }
        
        if (process.env.NODE_ENV === 'development' && data.debugInfo) {
          setShowDebug(true)
        }
      } else {
        setToast({ 
          type: 'error', 
          message: 'Failed to resend code. Please try again.' 
        })
      }
      
      startResendCountdown()
    } catch (error) {
      console.error('Resend code error:', error)
      setToast({ 
        type: 'error', 
        message: 'Failed to resend code. Please try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get step progress percentage
  const getStepProgress = (): number => {
    switch (step) {
      case 'identify': return 20
      case 'method': return 40
      case 'verify': return 60
      case 'reset': return 80
      case 'success': return 100
      default: return 0
    }
  }

  // Get step title
  const getStepTitle = (): string => {
    switch (step) {
      case 'identify': return 'Identify Your Account'
      case 'method': return 'Choose Recovery Method'
      case 'verify': return 'Verify Your Identity'
      case 'reset': return 'Set New Password'
      case 'success': return 'Password Reset Complete'
      default: return 'Account Recovery'
    }
  }

  // Get step description
  const getStepDescription = (): string => {
    switch (step) {
      case 'identify': return 'Enter your school code and account identifier to begin'
      case 'method': return 'Select how you\'d like to receive your verification code'
      case 'verify': return 'Enter the verification code sent to your contact method'
      case 'reset': return 'Create a strong new password for your account'
      case 'success': return 'Your password has been reset successfully'
      default: return 'Recover access to your account'
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Toast Notifications */}
      {toast && (
        <ToastContainer position="top-center">
          <Toast 
            type={toast.type} 
            message={toast.message} 
            onDismiss={() => setToast(null)} 
          />
        </ToastContainer>
      )}

      <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-surface)] rounded-xl shadow-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
        {/* Debug Information (Development Only) */}
        {showDebug && debugInfo && (
          <div className="p-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-b border-[var(--border-default)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning-light)] text-sm">
                Debug Information (Development)
              </h3>
              <button 
                onClick={() => setShowDebug(false)}
                className="text-[var(--warning-dark)] dark:text-[var(--warning-light)] hover:opacity-70 text-lg leading-none"
                aria-label="Close debug info"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-[var(--warning-dark)] dark:text-[var(--warning-light)] space-y-1 font-mono">
              <p><strong>Email:</strong> {debugInfo.email}</p>
              <p><strong>Code:</strong> <span className="bg-[var(--warning)] text-[var(--warning-dark)] px-1 rounded">{debugInfo.verificationCode}</span></p>
              {debugInfo.error && (
                <p className="text-[var(--danger)]"><strong>Error:</strong> {debugInfo.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-primary)] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-contrast)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
            {getStepTitle()}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
            {getStepDescription()}
          </p>
        </div>

        {/* Progress Bar */}
        {step !== 'success' && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Step {step === 'identify' ? 1 : step === 'method' ? 2 : step === 'verify' ? 3 : 4} of 4
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {getStepProgress()}%
              </span>
            </div>
            <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-default)] rounded-full h-2">
              <div 
                className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 pt-2">
          {/* Step 1: Identify Account */}
          {step === 'identify' && (
            <div className="space-y-4">
              <FormField
                label="School Code"
                name="schoolCode"
                placeholder="e.g., STMARYS, GREENHILL"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                error={errors.schoolCode}
                required
                touchFriendly
              />

              <FormField
                label="Email, Phone, or Username"
                name="identifier"
                placeholder="Enter your registered contact or username"
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
                className="w-full mt-6"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Choose Recovery Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Email Option */}
                <label 
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200',
                    'hover:shadow-sm',
                    recoveryMethod === 'email' 
                      ? 'border-[var(--accent-primary)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]' 
                      : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-strong)] dark:hover:border-[var(--accent-primary)]'
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value="email"
                    checked={recoveryMethod === 'email'}
                    onChange={() => setRecoveryMethod('email')}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-full bg-[var(--chart-blue)] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Email Verification</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
                      {maskedContact || 'Send code to your registered email'}
                    </div>
                  </div>
                  {recoveryMethod === 'email' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>

                {/* SMS Option */}
                <label 
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200',
                    'hover:shadow-sm',
                    recoveryMethod === 'sms' 
                      ? 'border-[var(--accent-primary)] bg-[var(--success-light)] dark:bg-[var(--success-dark)]' 
                      : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-strong)] dark:hover:border-[var(--accent-primary)]'
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value="sms"
                    checked={recoveryMethod === 'sms'}
                    onChange={() => setRecoveryMethod('sms')}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-full bg-[var(--chart-green)] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">SMS Verification</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
                      Send code to your registered phone
                    </div>
                  </div>
                  {recoveryMethod === 'sms' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>

                {/* Admin Contact Option */}
                <label 
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200',
                    'hover:shadow-sm',
                    recoveryMethod === 'admin' 
                      ? 'border-[var(--accent-primary)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]' 
                      : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-strong)] dark:hover:border-[var(--accent-primary)]'
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value="admin"
                    checked={recoveryMethod === 'admin'}
                    onChange={() => setRecoveryMethod('admin')}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-full bg-[var(--chart-purple)] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Contact Administrator</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
                      Request help from school administrator
                    </div>
                  </div>
                  {recoveryMethod === 'admin' && (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep('identify')}
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
                <div className="p-4 rounded-lg bg-[var(--info-light)] dark:bg-[var(--info-dark)] text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-[var(--chart-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-[var(--text-primary)]">Code Sent</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Verification code sent to: <span className="font-medium">{maskedContact}</span>
                  </p>
                </div>
              )}

              <FormField
                label="Verification Code"
                name="verificationCode"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                error={errors.verificationCode}
                required
                touchFriendly
              />

              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                  Didn&apos;t receive the code?
                </p>
                {canResend ? (
                  <button
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-sm text-[var(--accent-primary)] hover:underline font-medium disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">
                    Resend available in {formatCountdown(resendCountdown)}
                  </span>
                )}
              </div>

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
                  disabled={isLoading || verificationCode.length !== CODE_LENGTH}
                  size="touch"
                  className="flex-1"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Reset Password */}
          {step === 'reset' && (
            <div className="space-y-4">
              <PasswordField
                label="New Password"
                name="newPassword"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.newPassword}
                required
                touchFriendly
              />

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Password Strength</span>
                    <span className={cn(
                      'text-xs font-medium',
                      passwordStrength.score < 2 ? 'text-[var(--danger)]' :
                      passwordStrength.score < 4 ? 'text-[var(--warning)]' :
                      'text-[var(--success)]'
                    )}>
                      {passwordStrength.score < 2 ? 'Weak' :
                       passwordStrength.score < 4 ? 'Fair' :
                       'Strong'}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-default)] rounded-full h-2">
                    <div 
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        passwordStrength.score < 2 ? 'bg-[var(--danger)]' :
                        passwordStrength.score < 4 ? 'bg-[var(--warning)]' :
                        'bg-[var(--success)]'
                      )}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-[var(--text-muted)] space-y-1">
                      <p>Missing requirements:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index}>{String(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <PasswordField
                label="Confirm Password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                required
                touchFriendly
              />

              <Button
                onClick={handleResetPassword}
                disabled={isLoading || passwordStrength.score < 4}
                size="touch"
                className="w-full mt-6"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-[var(--success-light)] dark:bg-[var(--success-dark)] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--success)] dark:text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Password Reset Complete!</h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
              </div>

              <Link href="/login">
                <Button size="touch" className="w-full">
                  Continue to Login
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-6 pt-0 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] text-center">
            <Link 
              href="/login" 
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}