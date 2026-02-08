'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, useSession, getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { FormField, PasswordField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'
import { Role } from '@/types/enums'

/**
 * Super Admin Login Page with First-Time Setup
 * Requirements: 11.1, 11.2, 11.3
 * - If no super admin exists, show one-time registration form
 * - Display login form with email and password fields
 * - Verify Super Admin role and grant full system access
 * - Redirect to Super Admin dashboard with no restrictions
 */

type PageMode = 'loading' | 'setup' | 'login' | 'already-logged-in'

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<PageMode>('loading')
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState({ 
    email: false, 
    password: false, 
    confirmPassword: false
  })
  const [toast, setToast] = useState<ToastState | null>(null)

  // Check session and super admin status on mount
  useEffect(() => {
    if (status === 'loading') return
    
    // If already logged in as Super Admin, redirect to dashboard
    if (session?.user?.role === Role.SUPER_ADMIN) {
      router.push('/super-admin')
      return
    }
    
    // If logged in as another role, show option to switch
    if (session?.user) {
      setMode('already-logged-in')
      return
    }
    
    // Not logged in - check if super admin exists
    checkSuperAdminExists()
  }, [session, status, router])

  const checkSuperAdminExists = async () => {
    try {
      const response = await fetch('/api/admin/setup')
      const data = await response.json()
      setMode(data.exists ? 'login' : 'setup')
    } catch (error) {
      console.error('Error checking super admin status:', error)
      setMode('login')
    }
  }

  const handleSwitchAccount = async () => {
    await signOut({ redirect: false })
    checkSuperAdminExists()
  }


  const validateLoginForm = (): boolean => {
    const newErrors: FormErrors = {}
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateSetupForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else {
      const hasUppercase = /[A-Z]/.test(password)
      const hasLowercase = /[a-z]/.test(password)
      const hasNumber = /[0-9]/.test(password)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
      
      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        newErrors.password = 'Must include uppercase, lowercase, number, and special character'
      }
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, confirmPassword: false })
    if (!validateLoginForm()) return
    setErrors({})
    
    startTransition(async () => {
      try {
        const result = await signIn('credentials', { 
          identifier: email.trim(), 
          password, 
          redirect: false 
        })
        
        if (result?.error) {
          if (result.error === 'subscription_expired') {
            setErrors({ general: 'Subscription expired. Please contact support.' })
          } else if (result.error === 'school_suspended') {
            setErrors({ general: 'Account suspended. Please contact support.' })
          } else {
            setErrors({ general: 'Invalid email or password' })
          }
          return
        }
        
        if (result?.ok) {
          const session = await getSession()
          if (!session?.user) {
            setErrors({ general: 'Authentication failed. Please try again.' })
            return
          }
          if (session.user.role !== Role.SUPER_ADMIN) {
            setErrors({ general: 'Access denied. This portal is for Super Admins only.' })
            return
          }
          
          setToast({ type: 'success', message: 'Login successful! Redirecting to dashboard...' })
          router.prefetch('/super-admin')
          setTimeout(() => { 
            router.push('/super-admin')
            router.refresh() 
          }, 800)
        }
      } catch (error) {
        console.error('Login error:', error)
        setErrors({ general: 'An unexpected error occurred. Please try again.' })
      }
    })
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, confirmPassword: true })
    if (!validateSetupForm()) return
    setErrors({})
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            confirmPassword,
          }),
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          setErrors({ general: data.error || 'Failed to create account' })
          return
        }
        
        setToast({ type: 'success', message: 'Account created! Signing you in...' })
        
        // Auto-login after successful registration
        setTimeout(async () => {
          const result = await signIn('credentials', { 
            identifier: email.trim(), 
            password, 
            redirect: false 
          })
          
          if (result?.ok) {
            router.push('/super-admin')
            router.refresh()
          } else {
            setMode('login')
            setToast({ type: 'info', message: 'Account created. Please sign in.' })
          }
        }, 1000)
      } catch (error) {
        console.error('Setup error:', error)
        setErrors({ general: 'An unexpected error occurred. Please try again.' })
      }
    })
  }


  // Loading state
  if (mode === 'loading') {
    return (
      <div className="w-full">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-[var(--chart-purple)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Checking system status...</p>
          </div>
        </div>
      </div>
    )
  }

  // Already logged in as different user
  if (mode === 'already-logged-in') {
    return (
      <div className="w-full">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[var(--chart-yellow)] dark:text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Already Logged In</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              You are currently logged in as <span className="font-medium">{session?.user?.email}</span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              Role: {session?.user?.role?.replace('_', ' ')}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleSwitchAccount}
              className="w-full bg-[var(--chart-purple)] hover:bg-[var(--chart-purple)]"
              size="touch"
            >
              Sign Out & Login as Super Admin
            </Button>
            
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full"
              size="touch"
            >
              Go to My Dashboard
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              <a href="/login" className="text-[var(--chart-purple)] hover:text-[var(--chart-purple)] dark:text-[var(--chart-purple)]">
                School Admin Login
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // First-time setup mode
  if (mode === 'setup') {
    return (
      <div className="w-full">
        {toast && (
          <ToastContainer position="top-center">
            <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
          </ToastContainer>
        )}
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 bg-[var(--success-light)] dark:bg-[var(--success-dark)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[var(--chart-green)] dark:text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Welcome to SchoolOffice</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Create your Super Admin account to get started
            </p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/50 text-[var(--warning-dark)] dark:text-[var(--warning)] text-xs font-medium">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              One-time setup - This form will only appear once
            </div>
          </div>
          
          {errors.general && (
            <div role="alert" className="mb-6 p-4 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg">
              <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] text-center">{errors.general}</p>
            </div>
          )}
          
          <form onSubmit={handleSetup} noValidate className="space-y-5">
            <FormField 
              label="Email Address" 
              name="email" 
              type="email" 
              placeholder="admin@yourcompany.com" 
              value={email}
              onChange={(e) => { 
                setEmail(e.target.value)
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined })) 
              }}
              onBlur={() => handleBlur('email')} 
              error={touched.email ? errors.email : undefined} 
              required 
              touchFriendly 
            />
            
            <PasswordField 
              label="Password" 
              name="password" 
              placeholder="Create a strong password" 
              value={password}
              onChange={(e) => { 
                setPassword(e.target.value)
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined })) 
              }}
              onBlur={() => handleBlur('password')} 
              error={touched.password ? errors.password : undefined} 
              required 
              touchFriendly 
            />
            
            <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] -mt-3 ml-1">
              Min 8 characters with uppercase, lowercase, number, and special character
            </div>
            
            <PasswordField 
              label="Confirm Password" 
              name="confirmPassword" 
              placeholder="Confirm your password" 
              value={confirmPassword}
              onChange={(e) => { 
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined })) 
              }}
              onBlur={() => handleBlur('confirmPassword')} 
              error={touched.confirmPassword ? errors.confirmPassword : undefined} 
              required 
              touchFriendly 
            />
            
            <Button 
              type="submit" 
              size="touch" 
              className="w-full bg-[var(--chart-green)] hover:bg-[var(--chart-green)]" 
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Super Admin Account'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Not a Super Admin?{' '}
              <a href="/login" className="text-[var(--chart-purple)] hover:text-[var(--chart-purple)] dark:text-[var(--chart-purple)]">
                School Admin Login
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }


  // Login mode (default)
  return (
    <div className="w-full">
      {toast && (
        <ToastContainer position="top-center">
          <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
        </ToastContainer>
      )}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-[var(--chart-purple)] dark:text-[var(--chart-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Super Admin Portal</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Platform administration access</p>
        </div>
        
        {errors.general && (
          <div role="alert" className="mb-6 p-4 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg">
            <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] text-center">{errors.general}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} noValidate className="space-y-6">
          <FormField 
            label="Email" 
            name="email" 
            type="email" 
            placeholder="Enter your admin email" 
            value={email}
            onChange={(e) => { 
              setEmail(e.target.value)
              if (errors.email) setErrors(prev => ({ ...prev, email: undefined })) 
            }}
            onBlur={() => handleBlur('email')} 
            error={touched.email ? errors.email : undefined} 
            required 
            touchFriendly 
          />
          
          <PasswordField 
            label="Password" 
            name="password" 
            placeholder="Enter your password" 
            value={password}
            onChange={(e) => { 
              setPassword(e.target.value)
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined })) 
            }}
            onBlur={() => handleBlur('password')} 
            error={touched.password ? errors.password : undefined} 
            required 
            touchFriendly 
          />
          
          <Button 
            type="submit" 
            size="touch" 
            className="w-full bg-[var(--chart-purple)] hover:bg-[var(--chart-purple)]" 
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : 'Sign In as Super Admin'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Not a Super Admin?{' '}
            <a href="/login" className="text-[var(--chart-purple)] hover:text-[var(--chart-purple)] dark:text-[var(--chart-purple)]">
              School Admin Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
