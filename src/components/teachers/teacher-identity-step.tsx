'use client'

import * as React from 'react'
import { FormField, SelectField, TextareaField } from '@/components/ui/form-field'
import { ImageKitUpload } from '@/components/ui/imagekit-upload'
import { TeacherIdentityData } from '@/types/teacher'
import { Gender } from '@/types/enums'
import { cn } from '@/lib/utils'
import { createThemeStyle, getThemeClasses } from '@/lib/theme-utils'

/**
 * Teacher Identity Step Component
 * Requirements: 1.1
 * - Implements identity fields: firstName, lastName, gender, nationalId, phone, email, dateOfBirth, photo, address
 * - Adds validation for required fields
 * - Integrates ImageKit for photo uploads
 */

export interface TeacherIdentityStepProps {
  /** Current identity data */
  data: Partial<TeacherIdentityData>
  /** Validation errors */
  errors: Record<string, string[]>
  /** Change handler */
  onChange: (data: Partial<TeacherIdentityData>) => void
  /** Teacher ID for photo uploads (optional, for edit mode) */
  teacherId?: string
}

const GENDER_OPTIONS = [
  { value: Gender.MALE, label: 'Male' },
  { value: Gender.FEMALE, label: 'Female' },
]

export function TeacherIdentityStep({
  data,
  errors,
  onChange,
  teacherId,
}: TeacherIdentityStepProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'dateOfBirth') {
      onChange({ [name]: value ? new Date(value) : undefined })
    } else {
      onChange({ [name]: value })
    }
  }

  // Format date for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return ''
    if (typeof date === 'string') return date
    return date.toISOString().split('T')[0]
  }

  // Handle photo upload completion
  const handlePhotoUpload = (result: { url: string }) => {
    onChange({ photo: result.url })
  }

  return (
    <div className="space-y-6">
      {/* Name Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="First Name"
          name="firstName"
          placeholder="Enter first name"
          value={data.firstName || ''}
          onChange={handleInputChange}
          error={errors.firstName?.[0]}
          required
        />
        <FormField
          label="Last Name"
          name="lastName"
          placeholder="Enter last name"
          value={data.lastName || ''}
          onChange={handleInputChange}
          error={errors.lastName?.[0]}
          required
        />
      </div>

      {/* Gender and Date of Birth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Gender"
          name="gender"
          options={GENDER_OPTIONS}
          placeholder="Select gender"
          value={data.gender || ''}
          onChange={handleInputChange}
          error={errors.gender?.[0]}
          required
        />
        <FormField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formatDateForInput(data.dateOfBirth)}
          onChange={handleInputChange}
          error={errors.dateOfBirth?.[0]}
          required
        />
      </div>

      {/* National ID */}
      <FormField
        label="National ID / Passport / Staff ID"
        name="nationalId"
        placeholder="Enter national ID, passport number, or staff ID"
        value={data.nationalId || ''}
        onChange={handleInputChange}
        error={errors.nationalId?.[0]}
        helpText="This must be unique within the school"
        required
      />

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          placeholder="Enter phone number"
          value={data.phone || ''}
          onChange={handleInputChange}
          error={errors.phone?.[0]}
          required
        />
        <FormField
          label="Email Address"
          name="email"
          type="email"
          placeholder="Enter email address"
          value={data.email || ''}
          onChange={handleInputChange}
          error={errors.email?.[0]}
          helpText="This must be unique within the school"
          required
        />
      </div>

      {/* Photo Upload with ImageKit */}
      <div 
        className="p-4 border rounded-lg"
        style={createThemeStyle.card()}
      >
        <h3 
          className="text-lg font-medium mb-3"
          style={createThemeStyle.text('primary')}
        >
          Profile Photo
        </h3>
        <ImageKitUpload
          uploadType="teacher_photo"
          entityId={teacherId || 'new'}
          onUploadComplete={handlePhotoUpload}
          onUploadError={(error) => console.error('Photo upload error:', error)}
          currentFileUrl={data.photo}
          label=""
          helpText="Upload a professional photo for the teacher's profile"
          maxSizeMB={5}
        />
        {/* Fallback URL input for manual entry */}
        <details 
          className="mt-3 text-sm" 
          style={createThemeStyle.text('secondary')}
        >
          <summary 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            style={createThemeStyle.text('primary')}
          >
            Or enter photo URL manually
          </summary>
          <div className="mt-2">
            <FormField
              label=""
              name="photo"
              type="url"
              placeholder="Enter photo URL (optional)"
              value={data.photo || ''}
              onChange={handleInputChange}
              helpText="Direct URL to teacher's profile photo"
            />
          </div>
        </details>
      </div>

      {/* Address (Optional) */}
      <TextareaField
        label="Address"
        name="address"
        placeholder="Enter residential address (optional)"
        value={data.address || ''}
        onChange={handleInputChange}
        rows={3}
      />
    </div>
  )
}

export default TeacherIdentityStep
