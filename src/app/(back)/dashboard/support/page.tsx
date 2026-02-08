'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell,
  RefreshCw,
  Clock,
  LogIn,
  LogOut
} from 'lucide-react'
import { 
  AlertCard, 
  TaskList
} from '@/components/dashboard'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertType, AlertSeverity, TaskStatus } from '@/types/enums'
import type { 
  SupportDashboardData, 
  Notice,
  SimpleAttendance,
  Task
} from '@/types/staff-dashboard'

/**
 * Support Staff Dashboard Page
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 * - Located at /dashboard/support
 * - Displays assigned tasks with status, description, and deadline
 * - Displays notices with priority indicators
 * - Optionally displays simple attendance check-in/check-out
 * - Does NOT display student records, marks, or financial data
 */

// Priority badge styles
const priorityStyles = {
  low: {
    variant: 'secondary' as const,
    className: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]',
  },
  normal: {
    variant: 'secondary' as const,
    className: 'bg-[var(--info-light)] text-[var(--accent-hover)] dark:bg-[var(--info-dark)]/50 dark:text-[var(--info)]',
  },
  high: {
    variant: 'destructive' as const,
    className: 'bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/50 dark:text-[var(--danger)]',
  },
}

// Notice Card Component - Requirements: 7.2
function NoticeCard({ notice }: { notice: Notice }) {
  const priorityStyle = priorityStyles[notice.priority]
  const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date()
  
  return (
    <div className={`p-4 rounded-lg border ${isExpired ? 'opacity-60' : ''} bg-[var(--bg-main)] dark:bg-[var(--text-primary)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] line-clamp-1">
              {notice.title}
            </h3>
            <Badge className={priorityStyle.className}>
              {notice.priority}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] line-clamp-2">
            {notice.content}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            <span>
              Posted: {new Date(notice.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {notice.expiresAt && (
              <span className={isExpired ? 'text-[var(--danger)]' : ''}>
                {isExpired ? 'Expired' : `Expires: ${new Date(notice.expiresAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Notices List Component - Requirements: 7.2
function NoticesList({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 mx-auto text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">
          No notices to display
        </p>
      </div>
    )
  }

  // Sort notices by priority (high first) and then by date
  const sortedNotices = [...notices].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="space-y-3">
      {sortedNotices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} />
      ))}
    </div>
  )
}


// Attendance Check-in Component - Requirements: 7.3
function AttendanceCheckIn({ attendance }: { attendance?: SimpleAttendance }) {
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleCheckIn = async () => {
    setCheckingIn(true)
    // In a real implementation, this would call an API
    // For now, we just simulate the action
    setTimeout(() => {
      setCheckingIn(false)
      // Would refresh data here
    }, 1000)
  }

  const handleCheckOut = async () => {
    setCheckingOut(true)
    // In a real implementation, this would call an API
    setTimeout(() => {
      setCheckingOut(false)
      // Would refresh data here
    }, 1000)
  }

  const formatTime = (date?: Date) => {
    if (!date) return '--:--'
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = () => {
    if (!attendance) {
      return <Badge className="bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]">Not Checked In</Badge>
    }
    switch (attendance.status) {
      case 'present':
        return <Badge className="bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/50 dark:text-[var(--success)]">Present</Badge>
      case 'late':
        return <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/50 dark:text-[var(--warning)]">Late</Badge>
      case 'absent':
        return <Badge className="bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/50 dark:text-[var(--danger)]">Absent</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--accent-primary)]" />
            Attendance
          </CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{today}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
            <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Check In</p>
            <p className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatTime(attendance?.checkInTime)}
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
            <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mb-1">Check Out</p>
            <p className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatTime(attendance?.checkOutTime)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={checkingIn || !!attendance?.checkInTime}
            className="flex-1"
            variant={attendance?.checkInTime ? 'outline' : 'default'}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {checkingIn ? 'Checking In...' : attendance?.checkInTime ? 'Checked In' : 'Check In'}
          </Button>
          <Button
            onClick={handleCheckOut}
            disabled={checkingOut || !attendance?.checkInTime || !!attendance?.checkOutTime}
            className="flex-1"
            variant="outline"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {checkingOut ? 'Checking Out...' : attendance?.checkOutTime ? 'Checked Out' : 'Check Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton for support dashboard
function SupportDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonLoader variant="card" count={1} />
        </div>
        <div>
          <SkeletonLoader variant="stat" count={1} />
        </div>
      </div>
      <SkeletonLoader variant="card" count={2} />
    </div>
  )
}


export default function SupportDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<SupportDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard/support')
      
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
      console.error('Error fetching support dashboard:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <SupportDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Support Staff Dashboard
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

  const { tasks, notices, attendanceTracking } = data

  // Filter tasks to show only pending and overdue - Requirements: 7.1
  const pendingTasks = tasks.filter(
    (task) => task.status === TaskStatus.PENDING || task.status === TaskStatus.OVERDUE
  )

  // Create alerts from overdue tasks
  const overdueAlerts = tasks
    .filter((task) => task.status === TaskStatus.OVERDUE)
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      type: AlertType.TASK_OVERDUE,
      severity: AlertSeverity.WARNING,
      message: `Task overdue: ${task.title}`,
      actionUrl: '/dashboard/tasks',
      actionLabel: 'View Tasks',
    }))

  // Create alerts from high priority notices
  const highPriorityNoticeAlerts = notices
    .filter((notice) => notice.priority === 'high')
    .slice(0, 2)
    .map((notice) => ({
      id: notice.id,
      type: AlertType.EMERGENCY,
      severity: AlertSeverity.CRITICAL,
      message: notice.title,
    }))

  const allAlerts = [...overdueAlerts, ...highPriorityNoticeAlerts]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Support Staff Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            View your tasks and notices
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Alerts Section */}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Section - Requirements: 7.1 */}
        <section aria-label="Assigned Tasks" className="lg:col-span-2">
          <TaskList
            tasks={pendingTasks}
            title="Assigned Tasks"
            showStatus={true}
            maxItems={10}
            viewAllUrl="/dashboard/tasks"
            onTaskClick={(taskId) => {
              // Navigate to task details or handle task action
              const task = pendingTasks.find((t) => t.id === taskId)
              if (task) {
                // For support staff, tasks are typically viewed in a list
                router.push('/dashboard/tasks')
              }
            }}
          />
        </section>

        {/* Attendance Check-in Section - Requirements: 7.3 */}
        <section aria-label="Attendance">
          <AttendanceCheckIn attendance={attendanceTracking} />
        </section>
      </div>

      {/* Notices Section - Requirements: 7.2 */}
      <section aria-label="Notices">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--chart-purple)]" />
                Notices
              </CardTitle>
              <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                {notices.length} notice{notices.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <NoticesList notices={notices} />
          </CardContent>
        </Card>
      </section>

      {/* 
        Requirements: 7.4, 7.5 - Support Dashboard exclusions
        This dashboard does NOT display:
        - Student records
        - Marks or academic data
        - Financial data
        These are intentionally excluded to maintain role separation
      */}
    </div>
  )
}
