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
            className="bg-white dark:bg-gray-800 rounded-lg border p-4"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {defaulter.studentName}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Adm. No.</span>
                <span className="text-gray-900 dark:text-gray-100">{defaulter.admissionNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Outstanding</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  KES {defaulter.outstandingBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Last Payment</span>
                <span className="text-gray-900 dark:text-gray-100">
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
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Student Name
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Adm. No.
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-right">
                Outstanding
              </th>
              <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-left">
                Last Payment
              </th>
            </tr>
          </thead>
          <tbody>
            {defaulters.map((defaulter) => (
              <tr
                key={defaulter.studentId}
                className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="py-3 px-4">{defaulter.studentName}</td>
                <td className="py-3 px-4">{defaulter.admissionNumber}</td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium text-red-600 dark:text-red-400">
                    KES {defaulter.outstandingBalance.toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {defaulter.lastPaymentDate 
                    ? new Date(defaulter.lastPaymentDate).toLocaleDateString() 
                    : <span className="text-gray-400">Never</span>}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
      message: alert.message,
      actionUrl: `/dashboard/students/${alert.studentId}`,
      actionLabel: 'View Student',
    })),
    ...alerts.chronicLateness.map((alert) => ({
      id: alert.id,
      type: AlertType.CHRONIC_LATENESS,
      severity: alert.severity,
      message: alert.message,
      actionUrl: `/dashboard/students/${alert.studentId}`,
      actionLabel: 'View Student',
    })),
    ...alerts.pendingReports.map((alert) => ({
      id: alert.id,
      type: AlertType.UNSUBMITTED_REPORT,
      severity: new Date(alert.deadline) < new Date() 
        ? AlertSeverity.CRITICAL 
        : AlertSeverity.WARNING,
      message: alert.message,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Class Teacher Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {classSnapshot.className} - Overview and management
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Class Snapshot Stats - Requirements: 3.2 */}
      <section aria-label="Class Snapshot">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/50">
                  <UserCheck className="h-5 w-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                    {classSnapshot.attendanceToday.present}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">Present</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50">
                  <UserX className="h-5 w-5 mx-auto text-red-600 dark:text-red-400 mb-1" />
                  <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                    {classSnapshot.attendanceToday.absent}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">Absent</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50">
                  <Clock className="h-5 w-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                    {classSnapshot.attendanceToday.late}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Late</p>
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
                <DollarSign className="h-5 w-5 text-red-500" />
                Fee Defaulters
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {feeDefaulters.length} student{feeDefaulters.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {feeDefaulters.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No fee defaulters in your class
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
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
