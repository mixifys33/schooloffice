'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User, 
  GraduationCap, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Award, 
  Users, 
  BookOpen, 
  Clock, 
  Edit3,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import { 
  errorMessages, 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors,
  transitions 
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

/**
 * Class Teacher Profile Page
 * Requirements: 10.1-10.5, 10.7-10.10
 * - Display teacher's full profile information
 * - Show assigned classes and subjects
 * - Show workload summary
 * - Allow profile updates (limited fields)
 * - Display read-only fields for protected information
 * - Show class teacher responsibilities
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface ClassTeacherProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  employeeNumber: string
  department: string
  position: string
  hireDate: string
  qualifications: string[]
  photo: string | null
  classTeacherFor: Array<{ id: string; name: string }>
  subjectsTaught: Array<{ id: string; name: string; classId: string; className: string }>
  workload: {
    totalPeriods: number
    completedPeriods: number
    remainingPeriods: number
    classesTaught: number
    subjectsTaught: number
  }
}

interface ClassTeacherContextData {
  teacherId: string
  teacherName: string
  roleName: string
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  academicYear: {
    id: string
    name: string
  } | null
  contextError: string | null
}

interface ClassTeacherProfileData {
  context: ClassTeacherContextData
  profile: ClassTeacherProfile
}

export default function ClassTeacherProfilePage() {
  const [data, setData] = useState<ClassTeacherProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Edit form state
  const [formData, setFormData] = useState<Partial<ClassTeacherProfile>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const response = await fetch('/api/class-teacher/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch profile data')
        }
        const profileData = await response.json()
        setData(profileData)
        setFormData({
          firstName: profileData.profile.firstName,
          lastName: profileData.profile.lastName,
          email: profileData.profile.email,
          phone: profileData.profile.phone,
          qualifications: profileData.profile.qualifications,
        })
      } catch (err) {
        setError('Unable to load profile')
        console.error('Error fetching class teacher profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  // Handle form changes
  const handleInputChange = (field: keyof ClassTeacherProfile, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/class-teacher/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      // Refresh profile data
      const refreshResponse = await fetch('/api/class-teacher/profile')
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        setData(refreshedData)
      }

      setEditing(false)
      setHasChanges(false)
      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={6} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { context, profile } = data
  const fullName = `${profile.firstName} ${profile.lastName}`
  const readOnly = {
    employeeNumber: profile.employeeNumber,
    department: profile.department,
    position: profile.position,
    hireDate: profile.hireDate,
    classTeacherFor: profile.classTeacherFor,
    subjectsTaught: profile.subjectsTaught,
    workload: profile.workload,
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Back Navigation */}
      <Link
        href="/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <User className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              {fullName}
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {profile.position} • Class Teacher
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'bg-[var(--success-light)] dark:bg-[var(--success-dark)] border-[var(--success-light)] dark:border-[var(--success-dark)]')}>
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border-[var(--danger-light)] dark:border-[var(--danger-dark)]')}>
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border-2 border-dashed rounded-xl w-16 h-16 flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-[var(--text-muted)]" />
                </div>
                <h2 className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>{fullName}</h2>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  {profile.position}
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm">{profile.department}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm">Employee #{profile.employeeNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm">Joined: {new Date(profile.hireDate).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                <div className="pt-4">
                  <h3 className={cn(typography.h3, 'mb-2')}>Qualifications</h3>
                  <div className="space-y-2">
                    {profile.qualifications.map((qual, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-[var(--text-muted)]" />
                        <span className="text-sm">{qual}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? (
                      <>
                        <Save className="h-4 w-4" />
                        Cancel Edit
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workload Summary */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Workload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Periods</span>
                    <span className="font-medium">{readOnly.workload.totalPeriods}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span className="font-medium">{readOnly.workload.completedPeriods}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining</span>
                    <span className="font-medium">{readOnly.workload.remainingPeriods}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classes Taught</span>
                    <span className="font-medium">{readOnly.workload.classesTaught}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subjects Taught</span>
                    <span className="font-medium">{readOnly.workload.subjectsTaught}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Weekly Progress</span>
                      <span>{Math.round((readOnly.workload.completedPeriods / readOnly.workload.totalPeriods) * 100)}%</span>
                    </div>
                    <Progress 
                      value={Math.round((readOnly.workload.completedPeriods / readOnly.workload.totalPeriods) * 100)} 
                      className="h-3" 
                    />
                  </div>

                  <div>
                    <h3 className={cn(typography.h3, 'mb-2')}>Teaching Load Distribution</h3>
                    <div className="space-y-2">
                      {readOnly.subjectsTaught.map((subject, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm">{subject.name} - {subject.className}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">6 periods</span>
                            <Progress 
                              value={75} 
                              className="w-20 h-2" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Teacher Responsibilities */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Class Teacher Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readOnly.classTeacherFor.length > 0 ? (
                  readOnly.classTeacherFor.map((cls, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{cls.name}</div>
                          <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                            {readOnly.subjectsTaught.filter(sub => sub.classId === cls.id).length} subjects
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Class
                        </Button>
                        <Button size="sm">
                          View Students
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                      No Class Responsibilities
                    </h3>
                    <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      You are not currently assigned as a class teacher for any classes.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subjects Taught */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Subjects Taught</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {readOnly.subjectsTaught.map((subject, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)]">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-[var(--text-muted)]" />
                      <div>
                        <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{subject.name}</div>
                        <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {subject.className}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        View Performance
                      </Button>
                      <Button size="sm">
                        Enter Marks
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}