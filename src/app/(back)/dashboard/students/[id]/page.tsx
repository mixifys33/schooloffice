'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Save, X, User, Phone, Mail, Calendar, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, SelectField } from '@/components/ui/form-field'
import { PaymentStatusBadge, PaymentStatus } from '@/components/ui/payment-status-badge'
import { Badge } from '@/components/ui/badge'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, ToastType } from '@/components/ui/toast'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Student Profile Page with View and Edit
 * Requirements: 3.6 - Navigate to student profile on row click, enable editing
 */

interface Guardian {
  id: string
  name: string
  phone: string
  email: string | null
  relationship: string
  isPrimary: boolean
}

interface StudentProfile {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  gender: string | null
  dateOfBirth: string | null
  classId: string
  className: string
  streamId: string | null
  streamName: string | null
  status: string
  pilotType: string
  smsLimitPerTerm: number
  smsSentCount: number
  enrollmentDate: string
  photo: string | null
  medicalInfo: string | null
  paymentStatus: PaymentStatus
  totalFees: number
  totalPaid: number
  balance: number
  isActive: boolean
  guardians: Guardian[]
  primaryGuardian: {
    id: string
    name: string
    phone: string
    email: string | null
  } | null
}

interface ClassWithStreams {
  id: string
  name: string
  level: number
  streams: { id: string; name: string }[]
}

interface FormData {
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: string
  classId: string
  streamId: string
  status: string
  medicalInfo: string
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [classes, setClasses] = useState<ClassWithStreams[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    classId: '',
    streamId: '',
    status: '',
    medicalInfo: '',
  })

  useEffect(() => {
    async function fetchData() {
      // Validate ID format before making API call
      if (!id || typeof id !== 'string') {
        setError('Invalid student ID')
        setLoading(false)
        return
      }

      // Check if ID looks like a valid MongoDB ObjectId (24 hex characters)
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        setError('Invalid student ID format')
        setLoading(false)
        return
      }

      try {
        const [studentRes, classesRes] = await Promise.all([
          fetch(`/api/students/${id}`),
          fetch('/api/classes'),
        ])

        if (!studentRes.ok) {
          if (studentRes.status === 401) {
            throw new Error('Please log in to view student details')
          }
          if (studentRes.status === 403) {
            throw new Error('You do not have permission to view this student')
          }
          if (studentRes.status === 404) {
            throw new Error('Student not found')
          }
          const errorData = await studentRes.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch student')
        }

        const studentData = await studentRes.json()
        const classesData = classesRes.ok ? await classesRes.json() : []

        setStudent(studentData)
        // Ensure classes is always an array
        setClasses(Array.isArray(classesData) ? classesData : [])
        setFormData({
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          gender: studentData.gender || '',
          dateOfBirth: studentData.dateOfBirth ? studentData.dateOfBirth.split('T')[0] : '',
          classId: studentData.classId,
          streamId: studentData.streamId || '',
          status: studentData.status,
          medicalInfo: studentData.medicalInfo || '',
        })
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load student')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const selectedClass = Array.isArray(classes) ? classes.find((c) => c.id === formData.classId) : null
  const streams = selectedClass?.streams || []

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }
      if (name === 'classId') {
        newData.streamId = ''
      }
      return newData
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          gender: formData.gender || null,
          dateOfBirth: formData.dateOfBirth || null,
          classId: formData.classId,
          streamId: formData.streamId || null,
          status: formData.status,
          medicalInfo: formData.medicalInfo.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update student')
      }

      const updatedData = await response.json()
      setStudent((prev) => prev ? {
        ...prev,
        ...updatedData,
        name: `${updatedData.firstName} ${updatedData.lastName}`,
      } : null)
      setIsEditing(false)
      setToast({ type: 'success', message: 'Student updated successfully!' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update student'
      setError(message)
      setToast({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (student) {
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender || '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        classId: student.classId,
        streamId: student.streamId || '',
        status: student.status,
        medicalInfo: student.medicalInfo || '',
      })
    }
    setIsEditing(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SkeletonLoader variant="text" count={1} />
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Student Profile</h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Go Back', onClick: () => router.back() }}
        />
      </div>
    )
  }

  if (!student) return null

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{student.admissionNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner type="danger" message={error} dismissible />
      )}

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <PaymentStatusBadge status={student.paymentStatus} />
        <Badge variant={student.isActive ? 'default' : 'secondary'}>
          {student.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="outline">{student.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Information */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Student Information</h2>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <FormField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  placeholder="Select gender"
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                />
                <FormField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Class"
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  required
                  options={Array.isArray(classes) ? classes.map((c) => ({ value: c.id, label: c.name })) : []}
                />
                <SelectField
                  label="Stream"
                  name="streamId"
                  value={formData.streamId}
                  onChange={handleChange}
                  placeholder="Select stream"
                  disabled={streams.length === 0}
                  options={streams.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
              <SelectField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                  { value: 'TRANSFERRED', label: 'Transferred' },
                  { value: 'GRADUATED', label: 'Graduated' },
                ]}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Full Name" value={student.name} />
              <InfoRow label="Admission Number" value={student.admissionNumber} />
              <InfoRow label="Gender" value={student.gender || '-'} />
              <InfoRow 
                label="Date of Birth" 
                value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'} 
              />
              <InfoRow 
                label="Class" 
                value={`${student.className}${student.streamName ? ` - ${student.streamName}` : ''}`} 
              />
              <InfoRow 
                label="Enrolled" 
                value={new Date(student.enrollmentDate).toLocaleDateString()} 
              />
            </div>
          )}
        </div>

        {/* Guardian Information */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Guardian Information</h2>
          </div>

          {student.guardians.length > 0 ? (
            <div className="space-y-4">
              {student.guardians.map((guardian) => (
                <div 
                  key={guardian.id} 
                  className={`p-3 rounded-lg ${guardian.isPrimary ? 'bg-[var(--info-light)] dark:bg-[var(--info-dark)] border border-[var(--info-light)] dark:border-[var(--info-dark)]' : 'bg-muted'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{guardian.name}</span>
                    {guardian.isPrimary && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{guardian.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{guardian.email || '-'}</span>
                    </div>
                    <div className="text-muted-foreground capitalize">
                      {guardian.relationship.toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No guardians linked to this student.</p>
          )}
        </div>

        {/* Payment Information */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Payment Information</h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="Total Fees" value={`UGX ${student.totalFees.toLocaleString()}`} />
            <InfoRow label="Total Paid" value={`UGX ${student.totalPaid.toLocaleString()}`} />
            <InfoRow 
              label="Balance" 
              value={`UGX ${student.balance.toLocaleString()}`}
              valueClass={student.balance > 0 ? 'text-[var(--chart-red)] font-semibold' : 'text-[var(--chart-green)] font-semibold'}
            />
            <div className="pt-2">
              <PaymentStatusBadge status={student.paymentStatus} />
            </div>
          </div>
        </div>

        {/* SMS Usage */}
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">SMS Usage</h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="SMS Sent This Term" value={student.smsSentCount.toString()} />
            <InfoRow label="SMS Limit" value={student.smsLimitPerTerm.toString()} />
            <InfoRow 
              label="Remaining" 
              value={(student.smsLimitPerTerm - student.smsSentCount).toString()}
              valueClass={student.smsSentCount >= student.smsLimitPerTerm ? 'text-[var(--chart-red)]' : ''}
            />
            <InfoRow label="Pilot Type" value={student.pilotType} />
          </div>
        </div>
      </div>

      {/* Medical Information */}
      {(isEditing || student.medicalInfo) && (
        <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Medical Information</h2>
          {isEditing ? (
            <textarea
              name="medicalInfo"
              value={formData.medicalInfo}
              onChange={handleChange}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter any medical information or allergies..."
            />
          ) : (
            <p className="text-sm">{student.medicalInfo || 'No medical information recorded.'}</p>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Toast
            type={toast.type}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </div>
  )
}

function InfoRow({ 
  label, 
  value, 
  valueClass = '' 
}: { 
  label: string
  value: string
  valueClass?: string 
}) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-dashed last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}
