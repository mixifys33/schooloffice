'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User,
  BookOpen,
  Users,
  Calendar,
  Clock,
  Award,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Settings,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit3
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
  teacherColors,
  transitions,
  errorMessages
} from '@/lib/teacher-ui-standards'

/**
 * Profile & Workload Page for Teacher Portal
 * Requirements: 8.1, 8.2, 8.3
 * - Display teacher profile information
 * - Show workload (classes, subjects, periods)
 * - Allow profile updates
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

interface WorkloadItem {
  id: string
  className: string
  streamName: string | null
  subjectName: string
  periodsPerWeek: number
  studentCount: number
  isClassTeacher: boolean
}

interface ProfileData {
  profile: TeacherProfile
  workload: WorkloadItem[]
  workloadStats: {
    totalClasses: number
    totalSubjects: number
    totalPeriods: number
    totalStudents: number
  }
}

export default function ProfileWorkloadPage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

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

  const { profile, workload, workloadStats } = data

  // Additional safety checks
  if (!profile || !workloadStats) {
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="mx-auto mb-4">
                  <div className="h-24 w-24 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex items-center justify-center text-xl font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                  </div>
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
          
          {/* Workload Stats */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Workload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[var(--chart-blue)]" />
                    <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Classes</span>
                  </div>
                  <span className={cn(typography.h3, 'font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {workloadStats.totalClasses}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[var(--chart-green)]" />
                    <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Subjects</span>
                  </div>
                  <span className={cn(typography.h3, 'font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {workloadStats.totalSubjects}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[var(--chart-yellow)]" />
                    <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Periods/Week</span>
                  </div>
                  <span className={cn(typography.h3, 'font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {workloadStats.totalPeriods}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-[var(--chart-purple)]" />
                    <span className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Students</span>
                  </div>
                  <span className={cn(typography.h3, 'font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                    {workloadStats.totalStudents}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Workload Details */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Teaching Assignments</CardTitle>
              <Badge variant="outline">{workload.length} assignments</Badge>
            </CardHeader>
            <CardContent>
              {workload.length > 0 ? (
                <div className="space-y-4">
                  {workload.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {item.className} {item.streamName && `(${item.streamName})`}
                            </h3>
                            {item.isClassTeacher && (
                              <Badge variant="default">Class Teacher</Badge>
                            )}
                          </div>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                            {item.subjectName} • {item.studentCount} students
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                            <span className={cn(typography.caption, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {item.periodsPerWeek} periods/week
                            </span>
                          </div>
                          <Button size="sm" variant="outline" className="mt-2">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{item.subjectName}</Badge>
                        {item.isClassTeacher && (
                          <Badge variant="default">Class Teacher</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Teaching Assignments
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    You are not currently assigned to any classes. Contact administration for class assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  View My Timetable
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  My Classes & Students
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Award className="h-4 w-4" />
                  Enter Marks & Grades
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Take Attendance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}