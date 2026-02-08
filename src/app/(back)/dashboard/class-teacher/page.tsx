'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardList, 
  BookOpen, 
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign
} from 'lucide-react'
import { 
  AlertCard, 
  QuickActionButton, 
  StatsCard
} from '@/components/dashboard'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertType, AlertSeverity } from '@/types/enums'
import type { 
  ClassTeacherDashboardData, 
  FeeDefaulterInfo
} from '@/types/staff-dashboard'

/**
 * Class Teacher Dashboard Page
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

// Quick actions for class teacher dashboard - Requirements: 3.3
const classTeacherQuickActions = [
  {
    id: 'class-attendance',
    icon: ClipboardList,
    label: 'Class Attendance',
    href: '/dashboard/attendance/mark',
    variant: 'primary' as const,
  },
  {
    id: 'marks-overview',
    icon: BookOpen,
    label: 'Marks Overview',
    href: '/dashboard/examinations/marks',
    variant: 'secondary' as const,
  },
  {
    id: 'message-parents',
    icon: MessageSquare,
    label: 'Message Parents',
    href: '/dashboard/communications',
    variant: 'outline' as const,
  },
  {
    id: 'view-discipline',
    icon: AlertTriangle,
    label: 'View Discipline',
    href: '/dashboard/discipline',
    variant: 'outline' as const,
  },
]

// Fee Defaulters Table Component - Requirements: 3.5 (read-only)
function FeeDefaultersTable({ defaulters }: { defaulters: FeeDefaulterInfo[] }) {
  return (
    <div className="w-full">
      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {defaulters.map((defaulter) => (
          <div
            key={defaulter.studentId}
            className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4"
          >
            <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2">
              {typeof defaulter.studentName === 'string' ? defaulter.studentName : 'Unknown Student'}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">Adm. No.</span>
                <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {typeof defaulter.admissionNumber === 'string' ? defaulter.admissionNumber : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">Outstanding</span>
                <span className="font-medium text-[var(--chart-red)] dark:text-[var(--danger)]">
                  KES {defaulter.outstandingBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">Last Payment</span>
                <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {defaulter.lastPaymentDate 
                    ? new Date(defaulter.lastPaymentDate).toLocaleDateString() 
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
              <th className="py-3 px-4 font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] text-left">
                Student Name
              </th>
              <th className="py-3 px-4 font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] text-left">
                Adm. No.
              </th>
              <th className="py-3 px-4 font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] text-right">
                Outstanding
              </th>
              <th className="py-3 px-4 font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] text-left">
                Last Payment
              </th>
            </tr>
          </thead>
          <tbody>
            {defaulters.map((defaulter) => (
              <tr
                key={defaulter.studentId}
                className="border-b hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]"
              >
                <td className="py-3 px-4">
                  {typeof defaulter.studentName === 'string' ? defaulter.studentName : 'Unknown Student'}
                </td>
                <td className="py-3 px-4">
                  {typeof defaulter.admissionNumber === 'string' ? defaulter.admissionNumber : 'N/A'}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium text-[var(--chart-red)] dark:text-[var(--danger)]">
                    KES {defaulter.outstandingBalance.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {defaulter.lastPaymentDate 
                    ? new Date(defaulter.lastPaymentDate).toLocaleDateString() 
                    : <span className="text-[var(--text-muted)]">Never</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Loading skeleton for class teacher dashboard
function ClassTeacherDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLoader key={i} variant="stat" count={1} />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
      <SkeletonLoader variant="table" count={1} />
    </div>
  )
}


export default function ClassTeacherDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<ClassTeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard/class-teacher')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      console.error('Error fetching class teacher dashboard:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <ClassTeacherDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Class Teacher Dashboard
          </h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchDashboardData }}
        />
      </div>
    )
  }

  if (!data) return null

  const { classSnapshot, alerts, feeDefaulters } = data


  // Combine all alerts into a single array for display - Requirements: 3.4
  const allAlerts = [
    ...alerts.absentStudents.map((alert) => ({
      id: alert.id,
      type: AlertType.ABSENT_STUDENT,
      severity: alert.severity,
      message: typeof alert.message === 'string' ? alert.message : 'Student absent',
      actionUrl: `/dashboard/students/${alert.studentId}`,
      actionLabel: 'View Student',
    })),
    ...alerts.chronicLateness.map((alert) => ({
      id: alert.id,
      type: AlertType.CHRONIC_LATENESS,
      severity: alert.severity,
      message: typeof alert.message === 'string' ? alert.message : 'Student chronically late',
      actionUrl: `/dashboard/students/${alert.studentId}`,
      actionLabel: 'View Student',
    })),
    ...alerts.pendingReports.map((alert) => ({
      id: alert.id,
      type: AlertType.UNSUBMITTED_REPORT,
      severity: new Date(alert.deadline) < new Date() 
        ? AlertSeverity.CRITICAL 
        : AlertSeverity.WARNING,
      message: typeof alert.message === 'string' ? alert.message : 'Report pending',
      actionUrl: `/dashboard/reports?classId=${alert.classId}`,
      actionLabel: 'Submit Report',
    })),
  ]

  // Calculate attendance percentages for display
  const totalAttendance = classSnapshot.attendanceToday.present + 
    classSnapshot.attendanceToday.absent + 
    classSnapshot.attendanceToday.late
  const attendanceRate = totalAttendance > 0 
    ? Math.round((classSnapshot.attendanceToday.present / totalAttendance) * 100)
    : 0


  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Class Teacher Dashboard
          </h1>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              {typeof classSnapshot.className === 'string' ? classSnapshot.className : 'Unknown Class'} - Overview and management
            </p>
            {classSnapshot.streams && classSnapshot.streams.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {classSnapshot.streams.map((stream) => (
                  <span
                    key={stream.id}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                  >
                    {typeof stream.name === 'string' ? stream.name : 'Unknown Stream'}: {stream.studentCount || 0} students
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Class Snapshot Stats - Requirements: 3.2 */}
      <section aria-label="Class Snapshot">
        <h2 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-3">
          Class Snapshot
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatsCard
            title="Total Students"
            value={classSnapshot.totalStudents}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Present Today"
            value={classSnapshot.attendanceToday.present}
            subtitle={`${attendanceRate}% attendance`}
            icon={UserCheck}
            color="green"
          />
          <StatsCard
            title="Fee Defaulters"
            value={classSnapshot.feeDefaultersCount}
            icon={DollarSign}
            color={classSnapshot.feeDefaultersCount > 0 ? 'red' : 'gray'}
          />
          <StatsCard
            title="Discipline Alerts"
            value={classSnapshot.disciplineAlertsCount}
            icon={AlertTriangle}
            color={classSnapshot.disciplineAlertsCount > 0 ? 'yellow' : 'gray'}
          />
        </div>
      </section>


      {/* Quick Actions Row - Requirements: 3.3 */}
      <section aria-label="Quick Actions">
        <h2 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {classTeacherQuickActions.map((action) => (
            <QuickActionButton
              key={action.id}
              icon={action.icon}
              label={action.label}
              href={action.href}
              variant={action.variant}
            />
          ))}
        </div>
      </section>

      {/* Alerts Section - Requirements: 3.4 */}
      {allAlerts.length > 0 && (
        <section aria-label="Alerts">
          <h2 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-3">
            Alerts
          </h2>
          <div className="space-y-3">
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
        </section>
      )}

      {/* Attendance Details Card */}
      {(classSnapshot.attendanceToday.absent > 0 || classSnapshot.attendanceToday.late > 0) && (
        <section aria-label="Attendance Details">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Today&apos;s Attendance Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-[var(--success-light)] dark:bg-[var(--success-dark)]/50">
                  <UserCheck className="h-5 w-5 mx-auto text-[var(--chart-green)] dark:text-[var(--success)] mb-1" />
                  <p className="text-lg font-semibold text-[var(--chart-green)] dark:text-[var(--success)]">
                    {classSnapshot.attendanceToday.present}
                  </p>
                  <p className="text-xs text-[var(--chart-green)] dark:text-[var(--success)]">Present</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50">
                  <UserX className="h-5 w-5 mx-auto text-[var(--chart-red)] dark:text-[var(--danger)] mb-1" />
                  <p className="text-lg font-semibold text-[var(--chart-red)] dark:text-[var(--danger)]">
                    {classSnapshot.attendanceToday.absent}
                  </p>
                  <p className="text-xs text-[var(--chart-red)] dark:text-[var(--danger)]">Absent</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/50">
                  <Clock className="h-5 w-5 mx-auto text-[var(--chart-yellow)] dark:text-[var(--warning)] mb-1" />
                  <p className="text-lg font-semibold text-[var(--warning-dark)] dark:text-[var(--warning)]">
                    {classSnapshot.attendanceToday.late}
                  </p>
                  <p className="text-xs text-[var(--chart-yellow)] dark:text-[var(--warning)]">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}


      {/* Fee Defaulters Section - Requirements: 3.5 (read-only) */}
      <section aria-label="Fee Defaulters">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[var(--danger)]" />
                Fee Defaulters
              </CardTitle>
              <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {feeDefaulters.length} student{feeDefaulters.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {feeDefaulters.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
                <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  No fee defaulters in your class
                </p>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                  All students are up to date with their fees
                </p>
              </div>
            ) : (
              <>
                {/* 
                  Requirements: 3.5 - Fee defaulters displayed as read-only list
                  No payment recording capability - class teachers can only view
                */}
                <FeeDefaultersTable defaulters={feeDefaulters} />
                <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-3 text-center">
                  Contact the bursar for payment-related actions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
