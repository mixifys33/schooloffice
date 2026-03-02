'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

interface NotificationPreferences {
  emailNotifications: boolean
  inAppNotifications: boolean
  attendanceReminders: boolean
  gradeSubmissionReminders: boolean
  classUpdates: boolean
  systemAnnouncements: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    inAppNotifications: true,
    attendanceReminders: true,
    gradeSubmissionReminders: true,
    classUpdates: true,
    systemAnnouncements: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/teacher/settings/notifications')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences || preferences)
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/teacher/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully!' })
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
          Notification Preferences
        </h3>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
          Choose how you want to be notified about important updates
        </p>
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

      {/* Notification Channels */}
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h4 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">
          Notification Channels
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Email Notifications</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-[var(--text-muted)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">In-App Notifications</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Show notifications within the app
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppNotifications}
              onCheckedChange={() => handleToggle('inAppNotifications')}
            />
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h4 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">
          What to Notify Me About
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Attendance Reminders</p>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                Remind me to take attendance for my classes
              </p>
            </div>
            <Switch
              checked={preferences.attendanceReminders}
              onCheckedChange={() => handleToggle('attendanceReminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Grade Submission Reminders</p>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                Remind me about upcoming grade submission deadlines
              </p>
            </div>
            <Switch
              checked={preferences.gradeSubmissionReminders}
              onCheckedChange={() => handleToggle('gradeSubmissionReminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Class Updates</p>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                Notify me about changes to my class schedules or assignments
              </p>
            </div>
            <Switch
              checked={preferences.classUpdates}
              onCheckedChange={() => handleToggle('classUpdates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">System Announcements</p>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                Important updates and announcements from administration
              </p>
            </div>
            <Switch
              checked={preferences.systemAnnouncements}
              onCheckedChange={() => handleToggle('systemAnnouncements')}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  )
}
