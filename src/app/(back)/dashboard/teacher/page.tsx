'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardList, 
  BookOpen, 
  Users, 
  MessageSquare,
  RefreshCw
} from 'lucide-react'
import { 
  AlertCard, 
  QuickActionButton, 
  ClassCard, 
  TaskList 
} from '@/components/dashboard'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { AlertType, AlertSeverity, TaskStatus } from '@/types/enums'
import type { 
  TeacherDashboardData, 
  TeacherClassCard as TeacherClassCardData,
  Task 
} from '@/types/staff-dashboard'

/**
 * Teacher Dashboard Page
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * - Located at /dashboard/teacher
 * - Displays alerts section showing pending attendance, marks deadlines, unsubmitted reports
 * - Displays quick action buttons for: Take Attendance, Enter Marks, View Class List, Message Class
 * - Displays class cards showing subject, class name, term, attendance status, marks status
 * - Displays pending tasks list with task type, description, and deadline
 * - Does NOT display fee information, mark approval functions, or class assignment editing
 */

// Quick actions for teacher dashboard - Requirements: 2.3
const teacherQuickActions = [
  {
    id: 'take-attendance',
    icon: ClipboardList,
    label: 'Take Attendance',
    href: '/dashboard/attendance/mark',
    variant: 'primary' as const,
  },
  {
    id: 'enter-marks',
    icon: BookOpen,
    label: 'Enter Marks',
    href: '/dashboard/examinations/marks',
    variant: 'secondary' as const,
  },
  {
    id: 'view-class-list',
    icon: Users,
    label: 'View Class List',
    href: '/dashboard/classes',
    variant: 'outline' as const,
  },
  {
    id: 'message-class',
    icon: MessageSquare,
    label: 'Message Class',
    href: '/dashboard/communications',
    variant: 'outline' as const,
  },
]


// Loading skeleton for teacher dashboard
function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Alerts skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Classes grid skeleton */}
      <div>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="card" count={1} />
          ))}
        </div>
      </div>

      {/* Tasks skeleton */}
      <SkeletonLoader variant="card" count={1} />
    </div>
  )
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard/teacher')
      
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
      console.error('Error fetching teacher dashboard:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return <TeacherDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Teacher Dashboard
          </h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ 
            label: 'Retry', 
            onClick: fetchDashboardData 
          }}
        />
      </div>
    )
  }

  if (!data) return null


  // Combine all alerts into a single array for display - Requirements: 2.2
  const allAlerts = [
    ...data.alerts.pendingAttendance.map((alert) => ({
      id: alert.id,
      type: AlertType.PENDING_ATTENDANCE,
      severity: AlertSeverity.WARNING,
      message: alert.message,
      actionUrl: `/dashboard/attendance/mark?classId=${alert.classId}`,
      actionLabel: 'Take Attendance',
    })),
    ...data.alerts.marksDeadlines.map((alert) => ({
      id: alert.id,
      type: AlertType.MARKS_DEADLINE,
      severity: new Date(alert.deadline) < new Date() 
        ? AlertSeverity.CRITICAL 
        : AlertSeverity.WARNING,
      message: alert.message,
      actionUrl: `/dashboard/examinations/marks?examId=${alert.examId}&subjectId=${alert.subjectId}`,
      actionLabel: 'Enter Marks',
    })),
    ...data.alerts.unsubmittedReports.map((alert) => ({
      id: alert.id,
      type: AlertType.UNSUBMITTED_REPORT,
      severity: new Date(alert.deadline) < new Date() 
        ? AlertSeverity.CRITICAL 
        : AlertSeverity.INFO,
      message: alert.message,
      actionUrl: `/dashboard/reports?classId=${alert.classId}`,
      actionLabel: 'Submit Report',
    })),
  ]

  // Filter tasks to show only pending and overdue - Requirements: 2.5
  const pendingTasks = data.tasks.filter(
    (task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.OVERDUE
  )

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Teacher Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your classes, attendance, and marks
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

      {/* Alerts Section - Requirements: 2.2 */}
      {allAlerts.length > 0 && (
        <section aria-label="Alerts">
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


      {/* Quick Actions Row - Requirements: 2.3 */}
      <section aria-label="Quick Actions">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {teacherQuickActions.map((action) => (
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

      {/* My Classes Grid - Requirements: 2.4 */}
      <section aria-label="My Classes">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          My Classes
        </h2>
        {data.classes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No classes assigned yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Contact your administrator to get class assignments
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.classes.map((classData: TeacherClassCardData) => (
              <ClassCard
                key={classData.classId}
                classId={classData.classId}
                className={classData.className}
                subject={classData.subject}
                term={classData.term}
                studentCount={classData.studentCount}
                attendanceDone={classData.attendanceDone}
                marksDone={classData.marksDone}
              />
            ))}
          </div>
        )}
      </section>


      {/* Pending Tasks - Requirements: 2.5 */}
      <section aria-label="Pending Tasks">
        <TaskList
          tasks={pendingTasks}
          title="Pending Tasks"
          showStatus={true}
          maxItems={5}
          viewAllUrl="/dashboard/tasks"
          onTaskClick={(taskId) => {
            // Navigate based on task type
            const task = pendingTasks.find((t) => t.id === taskId)
            if (task) {
              switch (task.type) {
                case 'SUBMIT_MARKS':
                  router.push('/dashboard/examinations/marks')
                  break
                case 'COMPLETE_ATTENDANCE':
                  router.push('/dashboard/attendance/mark')
                  break
                case 'SUBMIT_REPORT':
                  router.push('/dashboard/reports')
                  break
                default:
                  // Generic task view
                  break
              }
            }
          }}
        />
      </section>

      {/* 
        Requirements: 2.6 - Excluded features:
        - No fee information displayed
        - No mark approval buttons (teachers can only enter marks, not approve)
        - No class assignment editing (read-only class display)
      */}
    </div>
  )
}
