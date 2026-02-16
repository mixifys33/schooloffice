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
  schoolLogo: string
  schoolLogoPreview: string
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
  schoolLogo: '',
  schoolLogoPreview: '',
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
  const [logoUploading, setLogoUploading] = useState(false)

  // Restore form data and step from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        if (parsed.formData) {
          // Restore form data and regenerate preview from logo URL if available
          const restoredData = {
            ...parsed.formData,
            schoolLogoPreview: parsed.formData.schoolLogo || '', // Use logo URL as preview
          }
          setFormData(restoredData)
        }
        if (parsed.step) setStep(parsed.step as RegistrationStep)
      } catch (error) {
        // If parse fails, clear corrupted data
        console.warn('Failed to restore registration data:', error)
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Save form data and step to sessionStorage whenever they change
  useEffect(() => {
    try {
      // Create a copy without the large base64 preview to avoid quota errors
      const dataToSave = {
        formData: {
          ...formData,
          schoolLogoPreview: '', // Don't save preview (can be large base64)
        },
        step,
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (error) {
      // If quota exceeded, clear old data and try again with minimal data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('SessionStorage quota exceeded, clearing old data')
        sessionStorage.removeItem(STORAGE_KEY)
        // Save only essential data (no logo preview)
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            formData: { ...formData, schoolLogo: '', schoolLogoPreview: '' }, 
            step 
          }))
        } catch {
          // If still fails, just continue without saving
          console.error('Unable to save to sessionStorage')
        }
      }
    }
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
            schoolLogo: formData.schoolLogo.trim() || undefined,
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
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-[var(--text-primary)] dark:text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">Your school system is ready.</h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-8">You can now sign in with your admin credentials.</p>
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

      <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Create Your School System</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Set up your digital school management platform</p>
        </div>

        {/* Progress Indicator - Requirements: 11.1 - Progress indicator showing current step */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Step {step} of 3</span>
            <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              {step === 1 && 'School Identity'}
              {step === 2 && 'System Identity'}
              {step === 3 && 'Primary Administrator'}
            </span>
          </div>
          <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-default)] rounded-full h-1.5">
            <div className="bg-[var(--text-primary)] dark:bg-[var(--bg-main)] h-1.5 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: School Identity - Requirements: 11.2, 11.3 - Clearly titled sections, all fields visible */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] pb-2 mb-4 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">School Identity</h2>
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
              <h2 className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] pb-2 mb-4 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">System Identity</h2>
              
              {/* School Logo Upload Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
                  School Logo <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">(Optional)</span>
                </label>
                
                {/* Logo Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-[var(--border-default)] dark:border-[var(--border-strong)] flex items-center justify-center bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] relative">
                    {logoUploading ? (
                      // Loading animation
                      <div className="flex flex-col items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-[var(--text-primary)] dark:text-[var(--text-muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : formData.schoolLogoPreview ? (
                      <img 
                        src={formData.schoolLogoPreview} 
                        alt="School logo preview" 
                        className="w-14 h-14 object-contain rounded"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    {/* URL Input */}
                    <FormField 
                      label="" 
                      name="schoolLogo" 
                      placeholder="Enter logo URL or upload file" 
                      value={formData.schoolLogo} 
                      onChange={(e) => {
                        const url = e.target.value.trim();
                        updateField('schoolLogo', e.target.value);
                        
                        // Update preview when URL changes
                        if (url) {
                          setLogoUploading(true);
                          // Simulate loading for URL (check if image loads)
                          const img = new Image();
                          img.onload = () => {
                            updateField('schoolLogoPreview', url);
                            setLogoUploading(false);
                          };
                          img.onerror = () => {
                            setLogoUploading(false);
                            setToast({ type: 'error', message: 'Failed to load image from URL' });
                          };
                          img.src = url;
                        } else {
                          updateField('schoolLogoPreview', '');
                          setLogoUploading(false);
                        }
                      }} 
                      disabled={logoUploading}
                      touchFriendly 
                    />
                    
                    {/* File Upload */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={logoUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (max 2MB)
                            if (file.size > 2 * 1024 * 1024) {
                              setToast({ type: 'error', message: 'Image size must be less than 2MB' });
                              e.target.value = ''; // Clear input
                              return;
                            }
                            
                            setLogoUploading(true);
                            
                            // Create preview URL
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              updateField('schoolLogoPreview', result);
                              updateField('schoolLogo', result);
                              setLogoUploading(false);
                            };
                            reader.onerror = () => {
                              setLogoUploading(false);
                              setToast({ type: 'error', message: 'Failed to read image file' });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className={`flex items-center justify-center px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] ${logoUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] cursor-pointer'}`}>
                        {logoUploading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Choose File
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Clear button when logo is uploaded */}
                    {formData.schoolLogoPreview && !logoUploading && (
                      <button
                        type="button"
                        onClick={() => {
                          updateField('schoolLogo', '');
                          updateField('schoolLogoPreview', '');
                        }}
                        className="text-xs text-[var(--chart-red)] dark:text-[var(--danger)] hover:underline"
                      >
                        Remove logo
                      </button>
                    )}
                    
                    <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                      {logoUploading 
                        ? 'Processing image...' 
                        : 'Upload your school logo or badge. Max size: 2MB, Recommended: 200x200px'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <FormField label="School Code" name="schoolCode" placeholder="e.g., STMARYS, GREENHILL" value={formData.schoolCode} onChange={(e) => updateField('schoolCode', e.target.value.toUpperCase())} error={errors.schoolCode} required touchFriendly />
                {/* Real-time availability feedback - Requirements: 8.1 */}
                {formData.schoolCode.length >= 3 && (
                  <div className={`mt-1 text-sm flex items-center gap-1 ${schoolCodeStatus.checking ? 'text-[var(--text-muted)]' : schoolCodeStatus.available === true ? 'text-[var(--text-primary)] dark:text-[var(--text-muted)]' : schoolCodeStatus.available === false ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
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
                <p className="mt-2 text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-default)] dark:border-[var(--border-default)]">
                  ⚠️ This will be used to access your system and cannot be changed.
                </p>
                {/* Examples - Requirements: 8.3 */}
                <p className="mt-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">Examples: STMARYS, GREENHILL, KASENYI</p>
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
              <h2 className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] pb-2 mb-4 border-b border-[var(--border-default)] dark:border-[var(--border-default)]">Primary Administrator</h2>
              <FormField label="Full Name" name="adminFullName" placeholder="Administrator's full name" value={formData.adminFullName} onChange={(e) => updateField('adminFullName', e.target.value)} error={errors.adminFullName} required touchFriendly />
              <FormField label="Email" name="adminEmail" type="email" placeholder="admin@school.com" value={formData.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} error={errors.adminEmail} required touchFriendly />
              <FormField label="Phone" name="adminPhone" type="tel" placeholder="+256 700 000 000 (optional)" value={formData.adminPhone} onChange={(e) => updateField('adminPhone', e.target.value)} touchFriendly />
              <PasswordField label="Password" name="adminPassword" placeholder="Create a strong password" value={formData.adminPassword} onChange={(e) => updateField('adminPassword', e.target.value)} error={errors.adminPassword} required touchFriendly />
              <PasswordField label="Confirm Password" name="adminConfirmPassword" placeholder="Confirm your password" value={formData.adminConfirmPassword} onChange={(e) => updateField('adminConfirmPassword', e.target.value)} error={errors.adminConfirmPassword} required touchFriendly />

              {/* Legal Acknowledgments - Requirements: 1.8 */}
              <div className="pt-4 space-y-3 border-t border-[var(--border-default)] dark:border-[var(--border-default)]">
                <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Legal Acknowledgments</h3>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.termsAccepted} onChange={(e) => updateField('termsAccepted', e.target.checked)} className="mt-1 h-4 w-4 rounded border-[var(--border-default)] text-[var(--text-primary)] focus:ring-[var(--border-default)]" />
                  <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    I accept the <a href="/terms" className="text-[var(--text-primary)] dark:text-[var(--white-pure)] hover:underline">Terms of Service</a> and <a href="/privacy" className="text-[var(--text-primary)] dark:text-[var(--white-pure)] hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {errors.termsAccepted && <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] ml-7">{errors.termsAccepted}</p>}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.dataResponsibilityAcknowledged} onChange={(e) => updateField('dataResponsibilityAcknowledged', e.target.checked)} className="mt-1 h-4 w-4 rounded border-[var(--border-default)] text-[var(--text-primary)] focus:ring-[var(--border-default)]" />
                  <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    I acknowledge that I am responsible for the data entered into this system and will comply with applicable data protection regulations
                  </span>
                </label>
                {errors.dataResponsibilityAcknowledged && <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] ml-7">{errors.dataResponsibilityAcknowledged}</p>}
              </div>

              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={handleBack} size="touch" className="flex-1">Back</Button>
                <Button 
                  type="submit" 
                  disabled={isPending || !formData.termsAccepted || !formData.dataResponsibilityAcknowledged} 
                  size="touch" 
                  className="flex-1"
                >
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
        <div className="mt-8 pt-6 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] text-center">
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Already have a school account?{' '}
            <a 
              href="/login" 
              className="text-[var(--chart-blue)] dark:text-[var(--chart-blue)] hover:text-[var(--accent-hover)] dark:hover:text-[var(--chart-blue)] transition-colors font-medium"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
