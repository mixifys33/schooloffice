'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, GraduationCap, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Academic Settings Component
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * - Academic year format, term structure
 * - Classes, streams, subjects management
 */

interface AcademicSettingsData {
  academicYearFormat: string
  termStructure: 'TRIMESTER' | 'SEMESTER' | 'QUARTER'
  defaultTermWeeks: number
  gradingScale: string
}

const TERM_STRUCTURES = [
  { value: 'TRIMESTER', label: 'Trimester (3 terms)' },
  { value: 'SEMESTER', label: 'Semester (2 terms)' },
  { value: 'QUARTER', label: 'Quarter (4 terms)' },
]

const YEAR_FORMATS = [
  { value: 'YYYY', label: 'Single Year (e.g., 2024)' },
  { value: 'YYYY-YYYY', label: 'Academic Year (e.g., 2024-2025)' },
]

export function AcademicSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<AcademicSettingsData>({
    academicYearFormat: 'YYYY',
    termStructure: 'TRIMESTER',
    defaultTermWeeks: 12,
    gradingScale: 'default',
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/academic')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: AcademicSettingsData = await response.json()
      setFormData({
        academicYearFormat: data.academicYearFormat || 'YYYY',
        termStructure: data.termStructure || 'TRIMESTER',
        defaultTermWeeks: data.defaultTermWeeks || 12,
        gradingScale: data.gradingScale || 'default',
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load academic settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await fetch('/api/settings/academic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Academic settings saved successfully')
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
              <Calendar className="h-5 w-5" />
              Academic Year
            </CardTitle>
            <CardDescription>Configure academic year format and structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year Format</label>
              <select name="academicYearFormat" value={formData.academicYearFormat} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {YEAR_FORMATS.map(format => (
                  <option key={format.value} value={format.value}>{format.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Term Structure
            </CardTitle>
            <CardDescription>Configure terms and their duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Term Structure</label>
              <select name="termStructure" value={formData.termStructure} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {TERM_STRUCTURES.map(structure => (
                  <option key={structure.value} value={structure.value}>{structure.label}</option>
                ))}
              </select>
            </div>
            <FormField 
              label="Default Term Weeks" 
              name="defaultTermWeeks" 
              type="number" 
              value={formData.defaultTermWeeks.toString()} 
              onChange={handleInputChange} 
              helpText="Number of weeks per term"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes & Subjects</CardTitle>
          <CardDescription>Manage classes, streams, and subjects from the Classes menu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              To manage classes, streams, and subjects, please use the dedicated management pages in the sidebar menu.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
