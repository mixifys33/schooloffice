'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'

/**
 * Contact School Admin Page
 * Allows users to request help from their school administrator
 */

interface FormData {
  schoolCode: string
  name: string
  email: string
  phone: string
  issue: string
  message: string
}

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const ISSUE_OPTIONS = [
  { value: 'login', label: 'Cannot log in' },
  { value: 'password', label: 'Forgot password' },
  { value: 'account', label: 'Account not found' },
  { value: 'locked', label: 'Account locked' },
  { value: 'other', label: 'Other issue' },
]

function ContactAdminForm() {
  const searchParams = useSearchParams()
  
  const [formData, setFormData] = useState<FormData>({
    schoolCode: '',
    name: '',
    email: '',
    phone: '',
    issue: '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Pre-fill from URL params
  useEffect(() => {
    const schoolCode = searchParams.get('schoolCode')
    const issue = searchParams.get('issue')
    
    if (schoolCode || issue) {
      setFormData(prev => ({
        ...prev,
        schoolCode: schoolCode || prev.schoolCode,
        issue: issue || prev.issue,
      }))
    }
  }, [searchParams])

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.schoolCode.trim()) {
      newErrors.schoolCode = 'School code is required'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Your name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.issue) {
      newErrors.issue = 'Please select an issue type'
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Please describe your issue'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json()
        setToast({ type: 'error', message: data.error || 'Failed to send request. Please try again.' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to send request. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-[var(--text-primary)] dark:text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Request Sent
            </h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-6">
              Your school administrator has been notified and will contact you soon.
            </p>
            <Link href="/login">
              <Button size="touch" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {toast && (
        <ToastContainer position="top-center">
          <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
        </ToastContainer>
      )}

      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            Contact School Admin
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Having trouble accessing your account? Let us help.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="School Code"
            name="schoolCode"
            placeholder="Enter your school code"
            value={formData.schoolCode}
            onChange={(e) => updateField('schoolCode', e.target.value.toUpperCase())}
            error={errors.schoolCode}
            required
            touchFriendly
          />

          <FormField
            label="Your Name"
            name="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            error={errors.name}
            required
            touchFriendly
          />

          <FormField
            label="Email"
            name="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
            required
            touchFriendly
          />

          <FormField
            label="Phone (optional)"
            name="phone"
            type="tel"
            placeholder="+256 700 000 000"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            touchFriendly
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
              Issue Type <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              value={formData.issue}
              onChange={(e) => updateField('issue', e.target.value)}
              className="w-full h-12 px-3 rounded-md border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--border-default)]"
            >
              <option value="">Select an issue...</option>
              {ISSUE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.issue && <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)]">{errors.issue}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
              Describe Your Issue <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Please describe your issue in detail..."
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] resize-none"
            />
            {errors.message && <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)]">{errors.message}</p>}
          </div>

          <Button type="submit" size="touch" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] text-center">
          <Link 
            href="/login" 
            className="text-sm text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}


// Wrapper component with Suspense boundary
export default function ContactAdminPage() {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ContactAdminForm />
    </Suspense>
  )
}
