'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  AlertCircle,
  Edit3,
  Camera,
  Upload,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  errorMessages
} from '@/lib/teacher-ui-standards'
import Image from 'next/image'

/**
 * Profile Page for Teacher Portal
 * Requirements: 8.1, 8.2, 8.3
 * - Display teacher profile information
 * - Allow profile updates
 * - Profile photo upload with ImageKit integration
 * 
 * Features:
 * - View profile information (name, email, phone, address, etc.)
 * - Upload/update profile photo (max 5MB, JPEG/PNG/WebP)
 * - Real-time photo preview
 * - Secure file storage via ImageKit
 */

interface TeacherProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  position: string
  department: string
  hireDate: string
  qualifications: string[]
  photo: string | null
}

interface ProfileData {
  profile: TeacherProfile
}

export default function ProfileWorkloadPage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/teacher/profile')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch profile data')
        }
        const profileData = await response.json()
        setData(profileData)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to load profile data'
        setError(errorMessage)
        console.error('Error fetching profile data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit')
      return
    }

    try {
      setUploadingPhoto(true)
      setError(null)
      setSuccessMessage(null)

      // Compress image before upload
      const compressedFile = await compressImage(file)

      const formData = new FormData()
      formData.append('photo', compressedFile)

      const response = await fetch('/api/teacher/profile/photo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload photo')
      }

      const result = await response.json()
      
      // Update local state with new photo
      if (data) {
        setData({
          ...data,
          profile: {
            ...data.profile,
            photo: result.photo,
          },
        })
      }

      setSuccessMessage('Profile photo updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photo'
      setError(errorMessage)
    } finally {
      setUploadingPhoto(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new window.Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calculate new dimensions (max 800x800)
          let width = img.width
          let height = img.height
          const maxSize = 800
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            file.type,
            0.85 // Quality 85%
          )
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Unable to load profile data'}</span>
          </div>
        </div>
      </div>
    )
  }

  const { profile } = data

  // Additional safety check
  if (!profile) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>Profile data is incomplete</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <AlertCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="max-w-2xl mx-auto">
        <Card className={cn(cardStyles.base, cardStyles.normal)}>
          <CardHeader>
            <CardTitle className={cn(typography.sectionTitle)}>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {/* Profile Photo with Upload */}
              <div className="mx-auto mb-4 relative inline-block">
                <div className="h-24 w-24 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex items-center justify-center text-xl font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] overflow-hidden relative">
                  {profile?.photo ? (
                    <Image
                      src={profile.photo}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span>{profile?.firstName?.[0]}{profile?.lastName?.[0]}</span>
                  )}
                </div>
                
                {/* Upload Button Overlay */}
                <button
                  onClick={triggerFileInput}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Upload profile photo"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              
              <h2 className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4')}>
                {profile?.position} • {profile?.department}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Email</span>
                  <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{profile?.email}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Phone</span>
                  <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{profile?.phone}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Address</span>
                  <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{profile?.address}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Hire Date</span>
                  <span className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {profile?.hireDate && new Date(profile.hireDate).toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Qualifications</span>
                  <div className="text-right">
                    {profile?.qualifications?.map((qual, idx) => (
                      <Badge key={idx} variant="outline" className="ml-1">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button className="w-full gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}