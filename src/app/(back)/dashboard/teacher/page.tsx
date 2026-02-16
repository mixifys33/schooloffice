'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  GraduationCap,
  Calendar,
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Building2,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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
import {
  AlertCard,
  QuickActionButton,
  ClassCard,
  TaskList
} from '@/components/dashboard'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { AlertType, AlertSeverity, TaskStatus } from '@/types/enums'
import type {
  TeacherDashboardData,
  TeacherClassCard as TeacherClassCardData,
  Task
} from '@/types/staff-dashboard'

/**
 * Unified Teacher Portal Dashboard
 * Combines the best features from both teacher dashboard implementations
 * Requirements: 1.1, 1.4, 2.1-2.7, 12.1-12.4, 14.1-14.4
 * - Context-aware dashboard that respects term/year state
 * - "My Classes" section showing assigned classes
 * - "Today" section showing current timetable
 * - Quick action buttons: Take attendance, Enter marks
 * - Alerts section showing pending attendance, marks deadlines, unsubmitted reports
 * - Displays pending tasks list with task type, description, and deadline
 * - Limited to assigned classes, timetable, and pending tasks only
 * - Disable data entry when context is invalid (1.4)
 * - Dense but clean layout with muted colors (12.1)
 * - Clear enabled/disabled states (12.2)
 * - Hide/disable non-permitted actions (12.3)
 * - Clear error messages with next steps (12.4)
 */

interface TeacherClass {
  id: string
  name: string
  streamName: string | null
  subjectName: string
  studentCount: number
  averageAttendance: number
  averagePerformance: number
  isClassTeacher: boolean
}

interface TimetableEntry {
  period: number
  time: string
  className: string
  subjectName: string
  isCurrent: boolean
  isToday: boolean
  classId: string
  subjectId: string
}

interface Alert {
  id: string
  type: 'warning' | 'info' | 'urgent'
  message: string
  dueDate?: string
}

interface TeacherContextData {
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

interface UnifiedTeacherDashboardData {
  context: TeacherContextData
  classes: TeacherClass[]
  timetable: TimetableEntry[]
  alerts: {
    pendingAttendance: Array<{ id: string; classId: string; className: string; date: string; message: string }>
    marksDeadlines: Array<{ id: string; examId: string; examName: string; subjectId: string; subjectName: string; deadline: string; message: string }>
  }
  // Data from the dashboard teacher page
  dashboardData?: TeacherDashboardData
}

// Quick actions for teacher dashboard - Requirements: 2.3
const teacherQuickActions = [
  {
    id: 'take-attendance',
    icon: ClipboardList,
    label: 'Take Attendance',
    href: '/teacher/attendance',
    variant: 'primary' as const,
  },
  {
    id: 'enter-marks',
    icon: BookOpen,
    label: 'Enter Marks',
    href: '/teacher/marks',
    variant: 'secondary' as const,
  },
  {
    id: 'view-class-list',
    icon: GraduationCap,
    label: 'My Classes',
    href: '/teacher/classes',
    variant: 'outline' as const,
  },
  {
    id: 'message-class',
    icon: MessageSquare,
    label: 'Messages',
    href: '/teacher/messages',
    variant: 'outline' as const,
  },
]

// Loading skeleton for unified teacher dashboard
function UnifiedTeacherDashboardSkeleton() {
  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Header skeleton */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mb-6')}>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Quick actions skeleton */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 min-w-[200px]">
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes skeleton */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>My Classes</CardTitle>
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <SkeletonLoader variant="card" count={2} />
            </CardContent>
          </Card>
        </div>

        {/* Today's Timetable skeleton */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Today's Timetable</CardTitle>
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <SkeletonLoader variant="table" count={3} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts skeleton */}
      <div className="mt-6 space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Classes grid skeleton */}
      <div className="mt-6">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="card" count={1} />
          ))}
        </div>
      </div>

      {/* Tasks skeleton */}
      <div className="mt-6">
        <SkeletonLoader variant="card" count={1} />
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [data, setData] = useState<UnifiedTeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session?.user) {
      console.log('No session found, redirecting to login')
      router.push('/login')
      return
    }
    
    // Check if user has required data
    if (!session.user.schoolId) {
      console.warn('User has no schoolId, this may cause API issues')
      setError('Session error: No school ID found. Please log out and log in again.')
      setLoading(false)
      return
    }
  }, [session, status, router])

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch data from both APIs to combine them
        const [portalResponse, dashboardResponse] = await Promise.all([
          fetch('/api/teacher/dashboard'),
          fetch('/api/dashboard/teacher')
        ])

        const portalData = await portalResponse.json()
        const dashboardData = await dashboardResponse.json()

        // Combine the data from both sources
        const combinedData: UnifiedTeacherDashboardData = {
          context: portalData.context || {
            teacherId: '',
            teacherName: 'Teacher',
            roleName: 'Teacher',
            currentTerm: null,
            academicYear: null,
            contextError: null
          },
          classes: portalData.classes || [],
          timetable: portalData.timetable || [],
          alerts: portalData.alerts || {
            pendingAttendance: [],
            marksDeadlines: []
          },
          dashboardData: dashboardData.dashboard || undefined
        }

        setData(combinedData)
      } catch (err) {
        setError('Unable to load dashboard')
        console.error('Error fetching unified teacher dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch data after authentication is confirmed
    if (status === 'authenticated' && session?.user?.schoolId) {
      fetchDashboardData()
    }
  }, [status, session?.user?.schoolId])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no session (will redirect)
  if (!session?.user) {
    return null
  }

  if (loading) {
    return <UnifiedTeacherDashboardSkeleton />
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

  const { context, classes, timetable, alerts, dashboardData } = data
  const hasContextError = !!context.contextError
  const teacherName = context.teacherName

  // Combine all alerts from both data sources - Requirements: 2.2
  const allAlerts = [
    // Alerts from the portal dashboard
    ...(alerts?.pendingAttendance || []).map((alert) => {
      // Ensure message is a string, not an object
      let messageStr = 'Pending attendance';
      if (alert.message) {
        if (typeof alert.message === 'object' && alert.message !== null) {
          // Extract text from object
          if ('text' in alert.message && typeof (alert.message as any).text === 'string') {
            messageStr = (alert.message as any).text;
          } else if ('name' in alert.message && typeof (alert.message as any).name === 'string') {
            messageStr = (alert.message as any).name;
          } else {
            messageStr = String(alert.message);
          }
        } else {
          messageStr = String(alert.message);
        }
      }
      return {
        id: alert.id,
        type: AlertType.PENDING_ATTENDANCE,
        severity: AlertSeverity.WARNING,
        message: messageStr,
        actionUrl: `/teacher/attendance?classId=${alert.classId}`,
        actionLabel: 'Take Attendance',
      };
    }),
    ...(alerts?.marksDeadlines || []).map((alert) => {
      // Ensure message is a string, not an object
      let messageStr = 'Marks deadline';
      if (alert.message) {
        if (typeof alert.message === 'object' && alert.message !== null) {
          // Extract text from object
          if ('text' in alert.message && typeof (alert.message as any).text === 'string') {
            messageStr = (alert.message as any).text;
          } else if ('name' in alert.message && typeof (alert.message as any).name === 'string') {
            messageStr = (alert.message as any).name;
          } else {
            messageStr = String(alert.message);
          }
        } else {
          messageStr = String(alert.message);
        }
      }
      return {
        id: alert.id,
        type: AlertType.MARKS_DEADLINE,
        severity: new Date(alert.deadline) < new Date()
          ? AlertSeverity.CRITICAL
          : AlertSeverity.WARNING,
        message: messageStr,
        actionUrl: `/teacher/marks?examId=${alert.examId}&subjectId=${alert.subjectId}`,
        actionLabel: 'Enter Marks',
      };
    }),
    // Additional alerts from the dashboard data if available
    ...(dashboardData?.alerts?.pendingAttendance || []).map((alert) => {
      // Ensure message is a string, not an object
      let messageStr = 'Pending attendance';
      if (alert.message) {
        if (typeof alert.message === 'object' && alert.message !== null) {
          // Extract text from object
          if ('text' in alert.message && typeof (alert.message as any).text === 'string') {
            messageStr = (alert.message as any).text;
          } else if ('name' in alert.message && typeof (alert.message as any).name === 'string') {
            messageStr = (alert.message as any).name;
          } else {
            messageStr = String(alert.message);
          }
        } else {
          messageStr = String(alert.message);
        }
      }
      return {
        id: alert.id,
        type: AlertType.PENDING_ATTENDANCE,
        severity: AlertSeverity.WARNING,
        message: messageStr,
        actionUrl: `/teacher/attendance?classId=${alert.classId}`,
        actionLabel: 'Take Attendance',
      };
    }),
    ...(dashboardData?.alerts?.marksDeadlines || []).map((alert) => {
      // Ensure message is a string, not an object
      let messageStr = 'Marks deadline';
      if (alert.message) {
        if (typeof alert.message === 'object' && alert.message !== null) {
          // Extract text from object
          if ('text' in alert.message && typeof (alert.message as any).text === 'string') {
            messageStr = (alert.message as any).text;
          } else if ('name' in alert.message && typeof (alert.message as any).name === 'string') {
            messageStr = (alert.message as any).name;
          } else {
            messageStr = String(alert.message);
          }
        } else {
          messageStr = String(alert.message);
        }
      }
      return {
        id: alert.id,
        type: AlertType.MARKS_DEADLINE,
        severity: new Date(alert.deadline) < new Date()
          ? AlertSeverity.CRITICAL
          : AlertSeverity.WARNING,
        message: messageStr,
        actionUrl: `/teacher/marks?examId=${alert.examId}&subjectId=${alert.subjectId}`,
        actionLabel: 'Enter Marks',
      };
    }),
    ...(dashboardData?.alerts?.unsubmittedReports || []).map((alert) => {
      // Ensure message is a string, not an object
      let messageStr = 'Unsubmitted report';
      if (alert.message) {
        if (typeof alert.message === 'object' && alert.message !== null) {
          // Extract text from object
          if ('text' in alert.message && typeof (alert.message as any).text === 'string') {
            messageStr = (alert.message as any).text;
          } else if ('name' in alert.message && typeof (alert.message as any).name === 'string') {
            messageStr = (alert.message as any).name;
          } else {
            messageStr = String(alert.message);
          }
        } else {
          messageStr = String(alert.message);
        }
      }
      return {
        id: alert.id,
        type: AlertType.UNSUBMITTED_REPORT,
        severity: new Date(alert.deadline) < new Date()
          ? AlertSeverity.CRITICAL
          : AlertSeverity.INFO,
        message: messageStr,
        actionUrl: `/teacher/reports?classId=${alert.classId}`,
        actionLabel: 'Submit Report',
      };
    }),
  ]

  // Filter tasks to show only pending and overdue - Requirements: 2.5
  const pendingTasks = (dashboardData?.tasks || []).filter(
    (task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.OVERDUE
  )

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Welcome Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mb-6')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <GraduationCap className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Welcome, {teacherName}
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {context.currentTerm && (
                <span className="ml-2 text-sm font-medium text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  • {context.currentTerm.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Context Error Warning - Requirement 12.4: Clear error messages */}
      {hasContextError && (
        <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4 mb-6 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]')}>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
            <div>
              <h3 className={cn(typography.h3, teacherColors.warning.text)}>Data Entry Disabled</h3>
              <p className={cn(typography.caption, teacherColors.warning.text)}>
                {context.contextError || 'Academic context could not be determined. Please contact administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={cn('flex flex-wrap gap-3', spacing.card, 'mb-6')}>
        {teacherQuickActions.map((action) => (
          <Link
            key={action.id}
            href={hasContextError ? '#' : action.href}
            className={cn(
              'flex-1 min-w-[200px] p-4 rounded-lg border transition-colors',
              hasContextError
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              teacherColors.secondary.bg,
              teacherColors.secondary.border
            )}
            onClick={hasContextError ? (e) => e.preventDefault() : undefined}
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                <action.icon className={cn('h-6 w-6', teacherColors.info.text)} />
              </div>
              <div>
                <h3 className={typography.label}>{action.label}</h3>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                  {action.id === 'take-attendance' && 'Record daily attendance'}
                  {action.id === 'enter-marks' && 'Record student assessments'}
                  {action.id === 'view-class-list' && 'View your assigned classes'}
                  {action.id === 'message-class' && 'Send messages to students'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes Section */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>My Classes</CardTitle>
              <Link
                href="/teacher/classes"
                className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <div className="space-y-4">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                            {cls.name} {cls.streamName && `(${cls.streamName})`}
                          </h3>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                            {cls.subjectName} • {cls.studentCount} students
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {cls.isClassTeacher && (
                            <Badge variant="default">Class Teacher</Badge>
                          )}
                          <Link href={`/teacher/classes/${cls.id}`}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Attendance</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  cls.averageAttendance >= 90 ? 'bg-green-500' :
                                  cls.averageAttendance >= 75 ? 'bg-blue-500' :
                                  cls.averageAttendance >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${cls.averageAttendance}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {cls.averageAttendance}%
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1')}>Performance</p>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full',
                                  cls.averagePerformance >= 90 ? 'bg-green-500' :
                                  cls.averagePerformance >= 75 ? 'bg-blue-500' :
                                  cls.averagePerformance >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                )}
                                style={{ width: `${cls.averagePerformance}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {cls.averagePerformance}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Classes Assigned
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    You are not currently assigned to any classes. Contact administration for class assignments.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Timetable */}
        <div>
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Today's Timetable</CardTitle>
              <Link
                href="/teacher/timetable"
                className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
              >
                View full →
              </Link>
            </CardHeader>
            <CardContent>
              {timetable.filter(entry => entry.isToday).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetable.filter(entry => entry.isToday).map((entry, index) => (
                      <TableRow
                        key={index}
                        className={entry.isCurrent ? 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]' : ''}
                      >
                        <TableCell className="font-medium">P{entry.period}</TableCell>
                        <TableCell>{entry.time}</TableCell>
                        <TableCell>{entry.className}</TableCell>
                        <TableCell>{entry.subjectName}</TableCell>
                        <TableCell>
                          <Link href={`/teacher/attendance?classId=${entry.classId}&subjectId=${entry.subjectId}`}>
                            <Button size="sm" variant={entry.isCurrent ? 'default' : 'outline'}>
                              {entry.isCurrent ? 'Teach Now' : 'View'}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Classes Today
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Check back tomorrow for your scheduled classes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts & Obligations */}
      {allAlerts.length > 0 && (
        <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
          <CardHeader>
            <CardTitle className={cn(typography.sectionTitle)}>Alerts & Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  type={alert.type}
                  severity={alert.severity}
                  message={alert.message}
                  actionUrl={alert.actionUrl}
                  actionLabel={alert.actionLabel}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Classes Grid - From dashboard teacher page */}
      {dashboardData?.classes && dashboardData.classes.length > 0 && (
        <section aria-label="My Classes" className="mt-6">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>My Classes (Detailed)</CardTitle>
              <Link
                href="/teacher/classes"
                className={cn(typography.caption, 'hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors')}
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(dashboardData?.classes || []).map((classData: TeacherClassCardData) => (
                  <ClassCard
                    key={classData.classId}
                    classId={classData.classId}
                    className={classData.className}
                    subject={typeof classData.subject === 'object' && classData.subject !== null
                      ? (classData.subject.name || String(classData.subject))
                      : String(classData.subject || '')}
                    term={String(classData.term || '')}
                    studentCount={classData.studentCount}
                    attendanceDone={classData.attendanceDone}
                    marksDone={classData.marksDone}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Pending Tasks - From dashboard teacher page */}
      {pendingTasks.length > 0 && (
        <section aria-label="Pending Tasks" className="mt-6">
          <TaskList
            tasks={pendingTasks.map(task => ({
              ...task,
              title: typeof task.title === 'object' && task.title !== null
                ? (task.title.name || task.title.text || String(task.title))
                : String(task.title || 'Task'),
              description: task.description && typeof task.description === 'object' && task.description !== null
                ? (task.description.text || task.description.name || String(task.description))
                : task.description ? String(task.description) : undefined
            }))}
            title="Pending Tasks"
            showStatus={true}
            maxItems={5}
            viewAllUrl="/teacher/tasks"
            onTaskClick={(taskId) => {
              // Navigate based on task type
              const task = pendingTasks.find((t) => t.id === taskId)
              if (task) {
                switch (task.type) {
                  case 'SUBMIT_MARKS':
                    window.location.href = '/teacher/marks'
                    break
                  case 'COMPLETE_ATTENDANCE':
                    window.location.href = '/teacher/attendance'
                    break
                  case 'SUBMIT_REPORT':
                    window.location.href = '/teacher/reports'
                    break
                  default:
                    // Generic task view
                    break
                }
              }
            }}
          />
        </section>
      )}
    </div>
  )
}