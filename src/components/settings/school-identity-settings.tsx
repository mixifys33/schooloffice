'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Upload, Building2, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * REAL School Identity Settings Component
 * Uses actual School model data, not fake settings
 * Shows current school information with ability to edit
 */

interface SchoolData {
  id: string
  name: string
  code: string
  schoolType: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  registrationNumber?: string
  ownership: 'PRIVATE' | 'GOVERNMENT'
  country: string
  district?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  licenseType: string
  smsBudgetPerTerm?: number
  features: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface SchoolStats {
  totalUsers: number
  totalClasses: number
  totalSubjects: number
  roleBreakdown: Record<string, number>
}

const SCHOOL_TYPES = [
  { value: 'PRIMARY', label: 'Primary School' },
  { value: 'SECONDARY', label: 'Secondary School' },
  { value: 'BOTH', label: 'Primary & Secondary' },
]

const OWNERSHIP_TYPES = [
  { value: 'PRIVATE', label: 'Private School' },
  { value: 'GOVERNMENT', label: 'Government School' },
]

export function SchoolIdentitySettings() {
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [stats, setStats] = useState<SchoolStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState({
    name: '',
    schoolType: 'PRIMARY' as const,
    registrationNumber: '',
    ownership: 'PRIVATE' as const,
    district: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    smsBudgetPerTerm: '',
    features: {}
  })

  const fetchSchoolData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/settings/school')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load school data')
      }

      const data = await response.json()
      setSchool(data.school)
      setStats(data.stats)

      // Populate form with real data
      setFormData({
        name: data.school.name || '',
        schoolType: data.school.schoolType || 'PRIMARY',
        registrationNumber: data.school.registrationNumber || '',
        ownership: data.school.ownership || 'PRIVATE',
        district: data.school.district || '',
        address: data.school.address || '',
        phone: data.school.phone || '',
        email: data.school.email || '',
        logo: data.school.logo || '',
        smsBudgetPerTerm: data.school.smsBudgetPerTerm?.toString() || '',
        features: data.school.features || {}
      })

    } catch (err) {
      console.error('Error loading school data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load school data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchoolData()
  }, [fetchSchoolData])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save school settings')
      }

      // Update local state with saved data
      setSchool(result.school)
      
      showToast('success', 'School information has been updated successfully')

      // Refresh data to get latest stats
      await fetchSchoolData()

    } catch (err) {
      console.error('Error saving school settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save school settings')
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Failed to save school settings'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader rows={8} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Real Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-[var(--chart-blue)]" />
              <div>
                <CardTitle>School Information</CardTitle>
                <CardDescription>
                  Manage your school's basic information and settings
                </CardDescription>
              </div>
            </div>
            {school && (
              <div className="text-right">
                <div className="text-sm text-[var(--text-secondary)]">School Code</div>
                <div className="font-mono font-bold text-lg">{school.code}</div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="error"
          title="Error"
          message={error}
          dismissible={true}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Real School Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-[var(--chart-blue)]">{stats.totalUsers}</div>
            <div className="text-sm text-[var(--text-secondary)]">Total Users</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-[var(--chart-green)]">{stats.totalClasses}</div>
            <div className="text-sm text-[var(--text-secondary)]">Active Classes</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-[var(--chart-purple)]">{stats.totalSubjects}</div>
            <div className="text-sm text-[var(--text-secondary)]">Subjects</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-[var(--chart-yellow)]">
              {stats.roleBreakdown.TEACHER || 0}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Teachers</div>
          </Card>
        </div>
      )}

      {/* Editable School Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your school's basic information. Changes are saved immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="School Name"
              value={formData.name}
              onChange={(value) => handleInputChange('name', value)}
              placeholder="Enter school name"
              required
            />

            <FormField
              label="School Type"
              type="select"
              value={formData.schoolType}
              onChange={(value) => handleInputChange('schoolType', value)}
              options={SCHOOL_TYPES}
              required
            />

            <FormField
              label="Registration Number"
              value={formData.registrationNumber}
              onChange={(value) => handleInputChange('registrationNumber', value)}
              placeholder="Enter registration number"
            />

            <FormField
              label="Ownership"
              type="select"
              value={formData.ownership}
              onChange={(value) => handleInputChange('ownership', value)}
              options={OWNERSHIP_TYPES}
              required
            />

            <FormField
              label="District"
              value={formData.district}
              onChange={(value) => handleInputChange('district', value)}
              placeholder="Enter district"
            />

            <FormField
              label="SMS Budget per Term"
              type="number"
              value={formData.smsBudgetPerTerm}
              onChange={(value) => handleInputChange('smsBudgetPerTerm', value)}
              placeholder="Enter SMS budget"
            />
          </div>

          <FormField
            label="Address"
            type="textarea"
            value={formData.address}
            onChange={(value) => handleInputChange('address', value)}
            placeholder="Enter school address"
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              placeholder="Enter phone number"
            />

            <FormField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
            />
          </div>

          <FormField
            label="Logo URL"
            value={formData.logo}
            onChange={(value) => handleInputChange('logo', value)}
            placeholder="Enter logo URL"
          />
        </CardContent>
      </Card>

      {/* School Status */}
      {school && (
        <Card>
          <CardHeader>
            <CardTitle>School Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
                <div>
                  <div className="font-medium">License Type</div>
                  <div className="text-sm text-[var(--text-secondary)]">{school.licenseType}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
                <div>
                  <div className="font-medium">Status</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {school.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-[var(--chart-green)]" />
                <div>
                  <div className="font-medium">Created</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {new Date(school.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !formData.name}
          className="min-w-32"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={hideToast}
        />
      )}
    </div>
  )
}
