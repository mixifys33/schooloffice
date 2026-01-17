'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { FormField, PasswordField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'
import { ServerErrorBanner } from '@/components/ui/error-banner'

/**
 * School-First Login Page
 * Requirements: 2.1, 2.2, 2.6, 2.7, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5
 * - School code input as first step before credential fields
 * - Validate school code before showing credentials
 * - Display generic error messages on failure (no information leakage)
 * - Centered card layout with ample white space
 * - "Welcome to SchoolOffice" heading without marketing slogans
 * - Neutral colors with strong contrast, no gradients
 * - Subtle focus animations only
 */

type LoginStep = 'school_code' | 'credentials'

interface FormErrors {
  schoolCode?: string
  identifier?: string
  password?: string
  general?: string
}

interface ServerErrorState {
  error: unknown
  isRetrying: boolean
}

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Two-step login state
  const [step, setStep] = useState<LoginStep>('school_code')
  const [schoolCode, setSchoolCode] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{ schoolCode: boolean; identifier: boolean; password: boolean }>({
    schoolCode: false,
    identifier: false,
    password: false,
  })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [serverError, setServerError] = useState<ServerErrorState>({ error: null, isRetrying: false })

  /**
   * Validate school code format (alphanumeric only)
   * Requirements: 2.1, 2.2
   */
  const validateSchoolCode = (): boolean => {
    const newErrors: FormErrors = {}
    const trimmedCode = schoolCode.trim().toUpperCase()
    
    if (!trimmedCode) {
      newErrors.schoolCode = 'School code is required'
    } else if (!/^[A-Za-z0-9]+$/.test(trimmedCode)) {
      newErrors.schoolCode = 'School code must contain only letters and numbers'
    } else if (trimmedCode.length < 3) {
      newErrors.schoolCode = 'School code must be at least 3 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Validate credential fields
   * Requirements: 2.4 - Support Email, Phone, or Username
   */
  const validateCredentials = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!identifier.trim()) {
      newErrors.identifier = 'Email, phone, or username is required'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle field blur to mark as touched
   */
  const handleBlur = (field: 'schoolCode' | 'identifier' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    const newErrors = { ...errors }
    
    if (field === 'schoolCode') {
      const trimmedCode = schoolCode.trim().toUpperCase()
      if (!trimmedCode) {
        newErrors.schoolCode = 'School code is required'
      } else if (!/^[A-Za-z0-9]+$/.test(trimmedCode)) {
        newErrors.schoolCode = 'School code must contain only letters and numbers'
      } else if (trimmedCode.length < 3) {
        newErrors.schoolCode = 'School code must be at least 3 characters'
      } else {
        delete newErrors.schoolCode
      }
    }
    
    if (field === 'identifier') {
      if (!identifier.trim()) {
        newErrors.identifier = 'Email, phone, or username is required'
      } else {
        delete newErrors.identifier
      }
    }
    
    if (field === 'password') {
      if (!password) {
        newErrors.password = 'Password is required'
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      } else {
        delete newErrors.password
      }
    }
    
    setErrors(newErrors)
  }

  /**
   * Handle school code submission - proceed to credentials step
   * Requirements: 2.1, 2.2
   */
  const handleSchoolCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(prev => ({ ...prev, schoolCode: true }))
    
    if (!validateSchoolCode()) {
      return
    }
    
    setErrors({})
    
    // Proceed to credentials step
    // Note: We don't validate school existence here to prevent information leakage
    // The actual validation happens during authentication
    setStep('credentials')
  }

  /**
   * Handle credentials submission - authenticate user
   * Requirements: 2.3, 2.4, 2.5, 2.6, 2.7
   */
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(prev => ({ ...prev, identifier: true, password: true }))
    
    if (!validateCredentials()) {
      return
    }
    
    setErrors({})
    setServerError({ error: null, isRetrying: false })
    
    startTransition(async () => {
      try {
        const result = await signIn('credentials', {
          schoolCode: schoolCode.trim().toUpperCase(),
          identifier: identifier.trim(),
          password,
          redirect: false,
        })
        
        if (result?.error) {
          // Handle different error types with generic messages
          // Requirements: 2.6, 2.7 - Don't reveal which field was incorrect
          if (result.code === 'subscription_expired') {
            setErrors({ general: 'Subscription expired. Please contact support.' })
          } else if (result.code === 'school_suspended') {
            setErrors({ general: 'Account suspended. Please contact support.' })
          } else if (result.code === 'account_locked') {
            setErrors({ general: 'Account temporarily locked. Please try again later.' })
          } else {
            // Generic error for invalid school code, user not found, or wrong password
            setErrors({ general: 'Invalid credentials' })
          }
          return
        }
        
        if (result?.ok) {
          setToast({ type: 'success', message: 'Login successful! Redirecting...' })
          
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 500)
        }
      } catch (error) {
        console.error('Login error:', error)
        setServerError({ error, isRetrying: false })
      }
    })
  }

  /**
   * Go back to school code step
   */
  const handleBackToSchoolCode = () => {
    setStep('school_code')
    setErrors({})
    setIdentifier('')
    setPassword('')
    setTouched(prev => ({ ...prev, identifier: false, password: false }))
  }

  /**
   * Handle retry for server errors
   */
  const handleRetry = async () => {
    setServerError({ error: null, isRetrying: true })
    
    try {
      const result = await signIn('credentials', {
        schoolCode: schoolCode.trim().toUpperCase(),
        identifier: identifier.trim(),
        password,
        redirect: false,
      })
      
      if (result?.error) {
        if (result.code === 'subscription_expired') {
          setErrors({ general: 'Subscription expired. Please contact support.' })
        } else if (result.code === 'school_suspended') {
          setErrors({ general: 'Account suspended. Please contact support.' })
        } else {
          setErrors({ general: 'Invalid credentials' })
        }
        setServerError({ error: null, isRetrying: false })
        return
      }
      
      if (result?.ok) {
        setToast({ type: 'success', message: 'Login successful! Redirecting...' })
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 500)
      }
    } catch (error) {
      setServerError({ error, isRetrying: false })
    }
  }

  return (
    <div className="w-full">
      {/* Toast notifications */}
      {toast && (
        <ToastContainer position="top-center">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        </ToastContainer>
      )}
      
      {/* Login Card - Requirements: 9.1, 9.2, 10.1 - Centered card layout with neutral colors, no gradients */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        {/* Header - Requirements: 10.2 - "Welcome to SchoolOffice" without marketing slogans */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            SchoolOffice Login
          </h1>
          {step === 'school_code' && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your school code to continue
            </p>
          )}
          {step === 'credentials' && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to <span className="font-medium text-gray-900 dark:text-white">{schoolCode.toUpperCase()}</span>
            </p>
          )}
        </div>
        
        {/* General Error Message */}
        {errors.general && (
          <div 
            role="alert"
            className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md"
          >
            <p className="text-sm text-red-700 dark:text-red-400 text-center">
              {errors.general}
            </p>
          </div>
        )}
        
        {/* Server Error Banner */}
        {serverError.error && (
          <div className="mb-6">
            <ServerErrorBanner
              error={serverError.error}
              onRetry={handleRetry}
              isRetrying={serverError.isRetrying}
              onDismiss={() => setServerError({ error: null, isRetrying: false })}
            />
          </div>
        )}
        
        {/* Step 1: School Code - Requirements: 10.3 - School code input as first step */}
        {step === 'school_code' && (
          <form onSubmit={handleSchoolCodeSubmit} noValidate className="space-y-6">
            <FormField
              label="School Code"
              name="schoolCode"
              type="text"
              placeholder="Enter your school code"
              value={schoolCode}
              onChange={(e) => {
                setSchoolCode(e.target.value.toUpperCase())
                if (errors.schoolCode) {
                  setErrors(prev => ({ ...prev, schoolCode: undefined }))
                }
              }}
              onBlur={() => handleBlur('schoolCode')}
              error={touched.schoolCode ? errors.schoolCode : undefined}
              required
              touchFriendly
              autoFocus
            />
            
            {/* Requirements: 10.4 - Display example school codes */}
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4">
              Example: STMARYS, GREENHILL, KASENYI
            </p>
            
            <Button
              type="submit"
              size="touch"
              className="w-full"
            >
              Continue
            </Button>
          </form>
        )}
        
        {/* Step 2: Credentials */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-6">
            {/* Back button - subtle styling */}
            <button
              type="button"
              onClick={handleBackToSchoolCode}
              className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Change school
            </button>
            
            {/* Identifier Field - Requirements: 2.4 - Support Email, Phone, or Username */}
            <FormField
              label="Email, Phone, or Username"
              name="identifier"
              type="text"
              placeholder="Enter your email, phone, or username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                if (errors.identifier) {
                  setErrors(prev => ({ ...prev, identifier: undefined }))
                }
              }}
              onBlur={() => handleBlur('identifier')}
              error={touched.identifier ? errors.identifier : undefined}
              required
              touchFriendly
              autoFocus
            />
            
            {/* Password Field */}
            <PasswordField
              label="Password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: undefined }))
                }
              }}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              required
              touchFriendly
            />
            
            <Button
              type="submit"
              size="touch"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg 
                    className="animate-spin h-5 w-5" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        )}
        
        {/* Footer - Requirements: 10.5 - "Forgot password?" and "Having trouble?" links */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3 text-center">
          {step === 'credentials' && (
            <p className="text-sm">
              <a 
                href="/forgot-password" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Forgot password?
              </a>
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Having trouble?{' '}
            <a 
              href="/contact-admin"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Contact school admin.
            </a>
          </p>
          
          {/* Super Admin Login Link */}
          <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
            <a 
              href="/admin/login"
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-medium"
            >
              Super Admin Login →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
