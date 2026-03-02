'use client'

import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, AlertCircle, CheckCircle2, Loader2, Edit3, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  position: string
  department: string
  photo: string | null
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState<Partial<ProfileData>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/teacher/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else {
        throw new Error('Failed to load profile')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditMode(true)
    setEditedData({
      phone: profile?.phone,
      email: profile?.email,
      address: profile?.address,
    })
    setMessage(null)
  }

  const handleCancel = () => {
    setEditMode(false)
    setEditedData({})
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/teacher/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData)
      })

      if (response.ok) {
        const result = await response.json()
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setEditMode(false)
        // Refresh profile data
        await fetchProfile()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update profile. Please try again.' 
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6 rounded-lg border bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-[var(--danger-light)] dark:border-[var(--danger-dark)]">
        <div className="flex items-center gap-2 text-[var(--chart-red)]">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load profile data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            Profile Settings
          </h3>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
            Manage your personal information
          </p>
        </div>
        {!editMode && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 border-[var(--success-light)] dark:border-[var(--success-dark)]'
            : 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-[var(--danger-light)] dark:border-[var(--danger-dark)]'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--chart-green)]" />
            ) : (
              <AlertCircle className="h-5 w-5 text-[var(--chart-red)]" />
            )}
            <span className={message.type === 'success' ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'}>
              {message.text}
            </span>
          </div>
        </div>
      )}

      {/* Profile Photo */}
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-main)] dark:bg-[var(--text-primary)] flex items-center justify-center overflow-hidden">
            {profile.photo ? (
              <Image
                src={profile.photo}
                alt={`${profile.firstName} ${profile.lastName}`}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              {profile.firstName} {profile.lastName}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {profile.position} • {profile.department}
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h4 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">
          Contact Information
        </h4>
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
              <Mail className="h-4 w-4" />
              Email Address
            </label>
            {editMode ? (
              <input
                type="email"
                value={editedData.email || ''}
                onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            ) : (
              <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{profile.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </label>
            {editMode ? (
              <input
                type="tel"
                value={editedData.phone || ''}
                onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            ) : (
              <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{profile.phone}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
              <MapPin className="h-4 w-4" />
              Address
            </label>
            {editMode ? (
              <textarea
                value={editedData.address || ''}
                onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            ) : (
              <p className="text-[var(--text-primary)] dark:text-[var(--white-pure)]">{profile.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Read-Only Information */}
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h4 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">
          Employment Information (Read-Only)
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Position</p>
            <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{profile.position}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Department</p>
            <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{profile.department}</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-4">
          Contact your administrator to update employment information
        </p>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="flex justify-end gap-3">
          <Button onClick={handleCancel} variant="outline" disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
