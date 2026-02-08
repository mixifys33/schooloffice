'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FormField, PasswordField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/**
 * Modern Forgot Password Form Component
 * Features:
 * - Multi-step wizard with smooth transitions
 * - Enhanced security with no information leakage
 * - Modern UI with improved accessibility
 * - Touch-friendly design for mobile
 * - Real-time validation and feedback
 * - Progressive enhancement
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
    sendResult: any
    error?: string
  }
}

const RESEND_COOLDOWN_SECONDS = 120 // 2 minutes
const CODE_LENGTH = 6

export default function ForgotPasswordForm() {
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

  // API handlers
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
}