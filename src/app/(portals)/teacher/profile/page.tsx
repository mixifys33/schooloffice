'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Briefcase, 
  BookOpen, 
  GraduationCap,
  Check,
  Loader2,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ImageKitUpload, type ImageKitUploadResult } from '@/components/ui/imagekit-upload'
import { ErrorMessagePanel, SuccessMessage, ActionButton, ButtonGroup } from '@/components/teacher'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  transitions,
  errorMessages 
} from '@/lib/teacher-ui-standards'

/**
 * Teacher Profile Self-Service Page
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * - Allow editing of phone, email, and profile photo (10.1)
 * - Display name, role, subjects, and classes as read-only (10.4)
 * - Log all updates to audit service (10.2)
 * - Prevent modification of name, role, subjects, classes (10.3)
 */

interface EditableProfileData {
  phone: string
  email: string
  photo: string | null
}

interface ReadOnlyProfileData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  jobTitle: string
  department: string
  employmentType: string
  assignedSubjects: Array<{ id: string; name: string }>
  assignedClasses: Array<{ id: string; name: string }>
  classTeacherFor: Array<{ id: string; name: string }>
}

interface TeacherProfileResponse {
  editable: EditableProfileData
  readOnly: ReadOnlyProfileData
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state for editable fields
  const [formData, setFormData] = useState<EditableProfileData>({
    phone: '',
    email: '',
    photo: null,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/teacher/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }
        const data: TeacherProfileResponse = await response.json()
        setProfile(data)
        setFormData({
          phone: data.editable.phone,
          email: data.editable.email,
          photo: data.editable.photo,
        })
      } catch (err) {
        setError('Unable to load profile')
        console.error('Error fetching teacher profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Check for changes
  useEffect(() => {
    if (profile) {
      const changed = 
        formData.phone !== profile.editable.phone ||
        formData.email !== profile.editable.email ||
        formData.photo !== profile.editable.photo
      setHasChanges(changed)
    }
  }, [formData, profile])

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setFormErrors(prev => ({ ...prev, [name]: '' }))
    setSuccess(null)
  }, [])

  // Handle photo upload
  const handlePhotoUpload = useCallback((result: ImageKitUploadResult) => {
    setFormData(prev => ({ ...prev, photo: result.url }))
    setSuccess(null)
  }, [])

  // Handle photo upload error
  const handlePhotoError = useCallback((error: string) => {
    setFormErrors(prev => ({ ...prev, photo: error }))
  }, [])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    // Validate email
    if (!formData.email) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Invalid email format'
      }
    }

    // Validate phone
    if (!formData.phone) {
      errors.phone = 'Phone number is required'
    } else {
      const phoneRegex = /^[+]?[\d\s-]{10,}$/
      if (!phoneRegex.test(formData.phone)) {
        errors.phone = 'Invalid phone number format'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/teacher/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
          photo: formData.photo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      if (data.updated) {
        setSuccess('Profile updated successfully')
        // Update the profile state with new values
        if (profile) {
          setProfile({
            ...profile,
            editable: data.editable,
          })
        }
        setHasChanges(false)
      } else {
        setSuccess('No changes to save')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Reset form to original values
  const handleReset = useCallback(() => {
    if (profile) {
      setFormData({
        phone: profile.editable.phone,
        email: profile.editable.email,
        photo: profile.editable.photo,
      })
      setFormErrors({})
      setSuccess(null)
      setError(null)
    }
  }, [profile])

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={{
            title: 'Unable to Load Profile',
            message: error,
            nextSteps: [
              'Check your internet connection',
              'Try refreshing the page',
              'Contact support if the problem persists',
            ],
          }}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const { readOnly } = profile

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6 max-w-4xl mx-auto')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <h1 className={cn(typography.pageTitle, 'flex items-center gap-2')}>
          <User className="h-5 w-5" />
          My Profile
        </h1>
        <p className={cn(typography.caption, 'mt-1')}>
          View and update your contact information
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <SuccessMessage message={success} />
      )}

      {error && (
        <ErrorMessagePanel
          config={{
            title: 'Update Failed',
            message: error,
            nextSteps: [
              'Check your input and try again',
              'Ensure you have a stable internet connection',
            ],
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editable Section - Requirements: 10.1 */}
        <div className={cn(cardStyles.base, cardStyles.normal)}>
          <h2 className={cn(typography.sectionTitle, 'mb-3 flex items-center gap-2')}>
            <Mail className="h-4 w-4" />
            Contact Information
          </h2>
          <p className={cn(typography.body, 'mb-4')}>
            You can update your contact details below.
          </p>

          <form onSubmit={handleSubmit} className={spacing.form}>
            {/* Profile Photo */}
            <div className={spacing.card}>
              <label className={cn(typography.label, 'flex items-center gap-2')}>
                <Camera className="h-4 w-4" />
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                {formData.photo ? (
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                    <Image 
                      src={formData.photo} 
                      alt="Profile" 
                      fill 
                      className="object-cover" 
                      unoptimized 
                    />
                  </div>
                ) : (
                  <div className={cn('h-20 w-20 rounded-full flex items-center justify-center border-2', teacherColors.secondary.bg, teacherColors.secondary.border)}>
                    <User className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <ImageKitUpload
                  uploadType="teacher_photo"
                  entityId={readOnly.id}
                  onUploadComplete={handlePhotoUpload}
                  onUploadError={handlePhotoError}
                  currentFileUrl={formData.photo || undefined}
                  compact
                  maxSizeMB={5}
                />
              </div>
              {formErrors.photo && (
                <p className={typography.error}>{formErrors.photo}</p>
              )}
            </div>

            {/* Email */}
            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={formErrors.email}
              required
              helpText="Your primary email for school communications"
            />

            {/* Phone */}
            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              error={formErrors.phone}
              required
              helpText="Your contact phone number"
            />

            {/* Action Buttons */}
            <ButtonGroup className="justify-end pt-2">
              <ActionButton
                label="Reset"
                onClick={handleReset}
                isPermitted={!saving && hasChanges}
                variant="outline"
              />
              <ActionButton
                label={saving ? 'Saving...' : 'Save Changes'}
                type="submit"
                isPermitted={!saving && hasChanges}
                isLoading={saving}
                variant="primary"
              />
            </ButtonGroup>
          </form>
        </div>

        {/* Read-Only Section - Requirements: 10.3, 10.4 */}
        <div className={spacing.card}>
          {/* Personal Information */}
          <div className={cn(cardStyles.base, cardStyles.normal)}>
            <h2 className={cn(typography.sectionTitle, 'mb-3 flex items-center gap-2')}>
              <Lock className="h-4 w-4 text-slate-400" />
              Personal Information
              <span className={cn(typography.caption, 'font-normal')}>(Read-only)</span>
            </h2>
            <p className={cn(typography.body, 'mb-4')}>
              Contact administration to update these details.
            </p>

            <div className={spacing.card}>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className={typography.caption}>Full Name</span>
                <span className={typography.label}>{readOnly.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className={typography.caption}>Role</span>
                <span className={typography.label}>{readOnly.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className={typography.caption}>Job Title</span>
                <span className={typography.label}>{readOnly.jobTitle.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className={typography.caption}>Department</span>
                <span className={typography.label}>{readOnly.department}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className={typography.caption}>Employment Type</span>
                <span className={typography.label}>{readOnly.employmentType.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Academic Assignments */}
          <div className={cn(cardStyles.base, cardStyles.normal)}>
            <h2 className={cn(typography.sectionTitle, 'mb-3 flex items-center gap-2')}>
              <GraduationCap className="h-4 w-4 text-slate-400" />
              Academic Assignments
              <span className={cn(typography.caption, 'font-normal')}>(Read-only)</span>
            </h2>

            {/* Assigned Subjects */}
            <div className="mb-4">
              <h3 className={cn(typography.label, 'mb-2 flex items-center gap-2')}>
                <BookOpen className="h-4 w-4" />
                Subjects
              </h3>
              {readOnly.assignedSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {readOnly.assignedSubjects.map(subject => (
                    <span 
                      key={subject.id}
                      className={cn('px-3 py-1 text-sm rounded-full', teacherColors.info.bg, teacherColors.info.text)}
                    >
                      {subject.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={typography.body}>No subjects assigned</p>
              )}
            </div>

            {/* Assigned Classes */}
            <div className="mb-4">
              <h3 className={cn(typography.label, 'mb-2 flex items-center gap-2')}>
                <Briefcase className="h-4 w-4" />
                Classes
              </h3>
              {readOnly.assignedClasses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {readOnly.assignedClasses.map(cls => (
                    <span 
                      key={cls.id}
                      className={cn('px-3 py-1 text-sm rounded-full', teacherColors.success.bg, teacherColors.success.text)}
                    >
                      {cls.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={typography.body}>No classes assigned</p>
              )}
            </div>

            {/* Class Teacher For */}
            {readOnly.classTeacherFor.length > 0 && (
              <div>
                <h3 className={cn(typography.label, 'mb-2 flex items-center gap-2')}>
                  <User className="h-4 w-4" />
                  Class Teacher For
                </h3>
                <div className="flex flex-wrap gap-2">
                  {readOnly.classTeacherFor.map(cls => (
                    <span 
                      key={cls.id}
                      className={cn('px-3 py-1 text-sm rounded-full', teacherColors.warning.bg, teacherColors.warning.text)}
                    >
                      {cls.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
