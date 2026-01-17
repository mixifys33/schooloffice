'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormField, SelectField, PasswordField } from '@/components/ui/form-field'
import { Toast, ToastContainer } from '@/components/ui/toast'

/**
 * School Registration Page
 * Requirements: 1.1, 1.8, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 11.1, 11.2, 11.3, 11.4, 11.5
 * - Progress indicator showing current step
 * - Clearly titled sections: School Identity, System Identity, Primary Administrator
 * - All fields visible without collapsible sections
 * - Warning text under School Code about immutability
 * - Simple confirmation message without celebration graphics
 * - Neutral colors with strong contrast, no gradients
 */

type RegistrationStep = 1 | 2 | 3

interface FormData {
  schoolName: string
  schoolType: '' | 'PRIMARY' | 'SECONDARY' | 'BOTH'
  registrationNumber: string
  ownership: '' | 'PRIVATE' | 'GOVERNMENT'
  country: string
  district: string
  contactPhone: string
  contactEmail: string
  physicalLocation: string
  schoolCode: string
  adminFullName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
  adminConfirmPassword: string
  termsAccepted: boolean
  dataResponsibilityAcknowledged: boolean
}

interface FormErrors {
  [key: string]: string | undefined
}

interface SchoolCodeStatus {
  checking: boolean
  available: boolean | null
  message: string
}

interface ToastState {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const initialFormData: FormData = {
  schoolName: '',
  schoolType: '',
  registrationNumber: '',
  ownership: '',
  country: '',
  district: '',
  contactPhone: '',
  contactEmail: '',
  physicalLocation: '',
  schoolCode: '',
  adminFullName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
  adminConfirmPassword: '',
  termsAccepted: false,
  dataResponsibilityAcknowledged: false,
}


const STORAGE_KEY = 'school_registration_data'

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<RegistrationStep>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [schoolCodeStatus, setSchoolCodeStatus] = useState<SchoolCodeStatus>({
    checking: false,
    available: null,
    message: '',
  })

  // Restore form data and step from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.formData) setFormData(parsed.formData)
        if (parsed.step) setStep(parsed.step as RegistrationStep)
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save form data and step to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, step }))
  }, [formData, step])

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Check school code availability - Requirements: 8.1
  useEffect(() => {
    const code = formData.schoolCode.trim().toUpperCase()
    if (code.length < 3) {
      setSchoolCodeStatus({ checking: false, available: null, message: '' })
      return
    }
    if (!/^[A-Za-z0-9]+$/.test(code)) {
      setSchoolCodeStatus({ checking: false, available: false, message: 'Only letters and numbers allowed' })
      return
    }
    setSchoolCodeStatus({ checking: true, available: null, message: 'Checking availability...' })
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/schools/check-code?code=${encodeURIComponent(code)}`)
        const data = await response.json()
        setSchoolCodeStatus({
          checking: false,
          available: data.available,
          message: data.available ? 'This code is available' : 'This school code is already taken',
        })
      } catch {
        setSchoolCodeStatus({ checking: false, available: null, message: 'Could not check availability' })
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.schoolCode])

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.schoolName.trim()) newErrors.schoolName = 'School name is required'
    if (!formData.schoolType) newErrors.schoolType = 'School type is required'
    if (!formData.ownership) newErrors.ownership = 'Ownership type is required'
    if (!formData.country.trim()) newErrors.country = 'Country is required'
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {}
    const code = formData.schoolCode.trim().toUpperCase()
    if (!code) {
      newErrors.schoolCode = 'School code is required'
    } else if (code.length < 3) {
      newErrors.schoolCode = 'School code must be at least 3 characters'
    } else if (!/^[A-Za-z0-9]+$/.test(code)) {
      newErrors.schoolCode = 'School code must contain only letters and numbers'
    } else if (schoolCodeStatus.available === false) {
      newErrors.schoolCode = 'This school code is already taken'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && schoolCodeStatus.available === true
  }

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.adminFullName.trim()) newErrors.adminFullName = 'Full name is required'
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address'
    }
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required'
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters'
    }
    if (formData.adminPassword !== formData.adminConfirmPassword) {
      newErrors.adminConfirmPassword = 'Passwords do not match'
    }
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms of service'
    if (!formData.dataResponsibilityAcknowledged) {
      newErrors.dataResponsibilityAcknowledged = 'You must acknowledge data responsibility'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as RegistrationStep)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep3()) return

    startTransition(async () => {
      try {
        const response = await fetch('/api/schools/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolName: formData.schoolName.trim(),
            schoolType: formData.schoolType,
            registrationNumber: formData.registrationNumber.trim() || undefined,
            ownership: formData.ownership,
            country: formData.country.trim(),
            district: formData.district.trim() || undefined,
            contactPhone: formData.contactPhone.trim() || undefined,
            contactEmail: formData.contactEmail.trim(),
            physicalLocation: formData.physicalLocation.trim() || undefined,
            schoolCode: formData.schoolCode.trim().toUpperCase(),
            adminFullName: formData.adminFullName.trim(),
            adminEmail: formData.adminEmail.trim(),
            adminPhone: formData.adminPhone.trim() || undefined,
            adminPassword: formData.adminPassword,
            termsAccepted: formData.termsAccepted,
            dataResponsibilityAcknowledged: formData.dataResponsibilityAcknowledged,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          setToast({ type: 'error', message: data.error || 'Registration failed. Please try again.' })
          return
        }
        // Clear saved data on successful registration
        sessionStorage.removeItem(STORAGE_KEY)
        setRegistrationComplete(true)
      } catch (error) {
        console.error('Registration error:', error)
        setToast({ type: 'error', message: 'An unexpected error occurred. Please try again.' })
      }
    })
  }

  // Registration complete screen - Requirements: 11.5 - Simple confirmation without celebration graphics
  if (registrationComplete) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your school system is ready.</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">You can now sign in with your admin credentials.</p>
            <Button onClick={() => router.push('/login')} size="touch" className="w-full">Proceed to Login</Button>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="w-full max-w-lg mx-auto">
      {toast && (
        <ToastContainer position="top-center">
          <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
        </ToastContainer>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">SchoolOffice Registration</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Create your school&apos;s management system</p>
        </div>

        {/* Progress Indicator - Requirements: 11.1 - Progress indicator showing current step */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Step {step} of 3</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {step === 1 && 'School Identity'}
              {step === 2 && 'System Identity'}
              {step === 3 && 'Primary Administrator'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-gray-900 dark:bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: School Identity - Requirements: 11.2, 11.3 - Clearly titled sections, all fields visible */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-gray-900 dark:text-white pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">School Identity</h2>
              <FormField label="School Name" name="schoolName" placeholder="Enter school name" value={formData.schoolName} onChange={(e) => updateField('schoolName', e.target.value)} error={errors.schoolName} required touchFriendly />
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="School Type" name="schoolType" options={[{ value: 'PRIMARY', label: 'Primary' }, { value: 'SECONDARY', label: 'Secondary' }, { value: 'BOTH', label: 'Both' }]} placeholder="Select type" value={formData.schoolType} onChange={(e) => updateField('schoolType', e.target.value)} error={errors.schoolType} required touchFriendly />
                <SelectField label="Ownership" name="ownership" options={[{ value: 'PRIVATE', label: 'Private' }, { value: 'GOVERNMENT', label: 'Government' }]} placeholder="Select" value={formData.ownership} onChange={(e) => updateField('ownership', e.target.value)} error={errors.ownership} required touchFriendly />
              </div>
              <FormField label="Registration Number" name="registrationNumber" placeholder="Official registration number (optional)" value={formData.registrationNumber} onChange={(e) => updateField('registrationNumber', e.target.value)} touchFriendly />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Country" name="country" placeholder="Country" value={formData.country} onChange={(e) => updateField('country', e.target.value)} error={errors.country} required touchFriendly />
                <FormField label="District" name="district" placeholder="District (optional)" value={formData.district} onChange={(e) => updateField('district', e.target.value)} touchFriendly />
              </div>
              <FormField label="Contact Email" name="contactEmail" type="email" placeholder="school@example.com" value={formData.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} error={errors.contactEmail} required touchFriendly />
              <FormField label="Contact Phone" name="contactPhone" type="tel" placeholder="+256 700 000 000 (optional)" value={formData.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} touchFriendly />
              <FormField label="Physical Location" name="physicalLocation" placeholder="Address or location (optional)" value={formData.physicalLocation} onChange={(e) => updateField('physicalLocation', e.target.value)} touchFriendly />
              <Button type="button" onClick={handleNext} size="touch" className="w-full mt-6">Continue</Button>
            </div>
          )}


          {/* Step 2: System Identity - Requirements: 8.2, 8.3, 8.4, 11.4 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-gray-900 dark:text-white pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">System Identity</h2>
              <div>
                <FormField label="School Code" name="schoolCode" placeholder="e.g., STMARYS, GREENHILL" value={formData.schoolCode} onChange={(e) => updateField('schoolCode', e.target.value.toUpperCase())} error={errors.schoolCode} required touchFriendly />
                {/* Real-time availability feedback - Requirements: 8.1 */}
                {formData.schoolCode.length >= 3 && (
                  <div className={`mt-1 text-sm flex items-center gap-1 ${schoolCodeStatus.checking ? 'text-gray-500' : schoolCodeStatus.available === true ? 'text-gray-700 dark:text-gray-300' : schoolCodeStatus.available === false ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                    {schoolCodeStatus.checking && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {schoolCodeStatus.available === true && (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {schoolCodeStatus.available === false && (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {schoolCodeStatus.message}
                  </div>
                )}
                {/* Warning about immutability - Requirements: 8.2, 11.4 - Clear warning text */}
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                  ⚠️ This will be used to access your system and cannot be changed.
                </p>
                {/* Examples - Requirements: 8.3 */}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Examples: STMARYS, GREENHILL, KASENYI</p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={handleBack} size="touch" className="flex-1">Back</Button>
                <Button type="button" onClick={handleNext} disabled={schoolCodeStatus.checking || schoolCodeStatus.available === false} size="touch" className="flex-1">Continue</Button>
              </div>
            </div>
          )}


          {/* Step 3: Primary Administrator - Requirements: 1.5, 1.8, 11.2 */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-gray-900 dark:text-white pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">Primary Administrator</h2>
              <FormField label="Full Name" name="adminFullName" placeholder="Administrator's full name" value={formData.adminFullName} onChange={(e) => updateField('adminFullName', e.target.value)} error={errors.adminFullName} required touchFriendly />
              <FormField label="Email" name="adminEmail" type="email" placeholder="admin@school.com" value={formData.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} error={errors.adminEmail} required touchFriendly />
              <FormField label="Phone" name="adminPhone" type="tel" placeholder="+256 700 000 000 (optional)" value={formData.adminPhone} onChange={(e) => updateField('adminPhone', e.target.value)} touchFriendly />
              <PasswordField label="Password" name="adminPassword" placeholder="Create a strong password" value={formData.adminPassword} onChange={(e) => updateField('adminPassword', e.target.value)} error={errors.adminPassword} required touchFriendly />
              <PasswordField label="Confirm Password" name="adminConfirmPassword" placeholder="Confirm your password" value={formData.adminConfirmPassword} onChange={(e) => updateField('adminConfirmPassword', e.target.value)} error={errors.adminConfirmPassword} required touchFriendly />

              {/* Legal Acknowledgments - Requirements: 1.8 */}
              <div className="pt-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Legal Acknowledgments</h3>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.termsAccepted} onChange={(e) => updateField('termsAccepted', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    I accept the <a href="/terms" className="text-gray-900 dark:text-white hover:underline">Terms of Service</a> and <a href="/privacy" className="text-gray-900 dark:text-white hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {errors.termsAccepted && <p className="text-sm text-red-600 dark:text-red-400 ml-7">{errors.termsAccepted}</p>}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.dataResponsibilityAcknowledged} onChange={(e) => updateField('dataResponsibilityAcknowledged', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    I acknowledge that I am responsible for the data entered into this system and will comply with applicable data protection regulations
                  </span>
                </label>
                {errors.dataResponsibilityAcknowledged && <p className="text-sm text-red-600 dark:text-red-400 ml-7">{errors.dataResponsibilityAcknowledged}</p>}
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={handleBack} size="touch" className="flex-1">Back</Button>
                <Button type="submit" disabled={isPending} size="touch" className="flex-1">
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </span>
                  ) : 'Create School'}
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
