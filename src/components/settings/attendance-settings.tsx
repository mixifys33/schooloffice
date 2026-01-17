'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Clock, Users, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'

/**
 * Attendance Settings Component
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * - Late threshold, absent cutoff, statuses, marking roles
 */

interface AttendanceSettingsData {
  lateThresholdMinutes: number
  absentCutoffTime: string
  statuses: string[]
  markingRoles: string[]
  autoNotifyOnAbsence: boolean
}

const DEFAULT_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
const AVAILABLE_ROLES = ['TEACHER', 'SCHOOL_ADMIN', 'DOS', 'CLASS_TEACHER']

export function AttendanceSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<AttendanceSettingsData>({
    lateThresholdMinutes: 15,
    absentCutoffTime: '09:00',
    statuses: DEFAULT_STATUSES,
    markingRoles: ['TEACHER', 'SCHOOL_ADMIN'],
    autoNotifyOnAbsence: true,
  })

  const [newStatus, setNewStatus] = useState('')

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/attendance')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: AttendanceSettingsData = await response.json()
      setFormData({
        lateThresholdMinutes: data.lateThresholdMinutes || 15,
        absentCutoffTime: data.absentCutoffTime || '09:00',
        statuses: data.statuses || DEFAULT_STATUSES,
        markingRoles: data.markingRoles || ['TEACHER', 'SCHOOL_ADMIN'],
        autoNotifyOnAbsence: data.autoNotifyOnAbsence ?? true,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load attendance settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      markingRoles: prev.markingRoles.includes(role)
        ? prev.markingRoles.filter(r => r !== role)
        : [...prev.markingRoles, role]
    }))
  }

  const handleAddStatus = () => {
    if (newStatus.trim() && !formData.statuses.includes(newStatus.toUpperCase())) {
      setFormData(prev => ({
        ...prev,
        statuses: [...prev.statuses, newStatus.toUpperCase()]
      }))
      setNewStatus('')
    }
  }

  const handleRemoveStatus = (status: string) => {
    if (['PRESENT', 'ABSENT'].includes(status)) {
      showToast('error', `${status} is a required status and cannot be removed`)
      return
    }
    setFormData(prev => ({
      ...prev,
      statuses: prev.statuses.filter(s => s !== status)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.markingRoles.length === 0) {
      showToast('error', 'At least one marking role is required')
      return
    }
    try {
      setSaving(true)
      const response = await fetch('/api/settings/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Attendance settings saved successfully')
      fetchSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: fetchSettings }} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Thresholds
            </CardTitle>
            <CardDescription>Configure late and absent cutoff times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Late Threshold (minutes)" 
              name="lateThresholdMinutes" 
              type="number" 
              value={formData.lateThresholdMinutes.toString()} 
              onChange={handleInputChange} 
              helpText="Minutes after start time to mark as late"
            />
            <FormField 
              label="Absent Cutoff Time" 
              name="absentCutoffTime" 
              type="time" 
              value={formData.absentCutoffTime} 
              onChange={handleInputChange} 
              helpText="Time after which students are marked absent"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Marking Roles
            </CardTitle>
            <CardDescription>Who can mark attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ROLES.map(role => (
                <Badge
                  key={role}
                  variant={formData.markingRoles.includes(role) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleRoleToggle(role)}
                >
                  {role.replace('_', ' ')}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Click to toggle roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Statuses</CardTitle>
            <CardDescription>Available attendance status options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.statuses.map(status => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveStatus(status)}
                >
                  {status} {!['PRESENT', 'ABSENT'].includes(status) && '×'}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="Add new status"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="button" variant="outline" onClick={handleAddStatus}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Automatic absence notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="autoNotifyOnAbsence" 
                name="autoNotifyOnAbsence" 
                checked={formData.autoNotifyOnAbsence} 
                onChange={handleInputChange} 
                className="rounded border-input" 
              />
              <label htmlFor="autoNotifyOnAbsence" className="text-sm font-medium">
                Automatically notify guardians on absence
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
