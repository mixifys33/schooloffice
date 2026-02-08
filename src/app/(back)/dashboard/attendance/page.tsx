'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Real-Time Attendance Dashboard Page
 * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5
 * - Current day attendance percentages per class (39.1)
 * - Update dashboard within 1 minute of attendance recording (39.2)
 * - Highlight classes below 80% in red (39.3)
 * - Show absent students with guardian contact status (39.4)
 * - Weekly/monthly attendance trends (39.5)
 */

interface ClassAttendanceData {
  classId: string
  className: string
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendancePercentage: number
  isBelowThreshold: boolean
}

interface AbsentStudentData {
  studentId: string
  studentName: string
  className: string
  periodsAbsent: number[]
  guardianContactStatus: 'VERIFIED' | 'UNVERIFIED' | 'NO_GUARDIAN'
  guardianPhone?: string
}

interface AttendanceTrends {
  weekly: { date: string; percentage: number }[]
  monthly: { week: string; percentage: number }[]
}

interface RealTimeAttendanceDashboard {
  schoolId: string
  date: string
  overallAttendance: number
  classAttendance: ClassAttendanceData[]
  absentStudents: AbsentStudentData[]
  trends: AttendanceTrends
}

// Auto-refresh interval in milliseconds (1 minute as per Requirement 39.2)
const REFRESH_INTERVAL = 60000

function StatCard({
  title,
  value,
  subtitle,
  color = 'blue',
}: {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 border-[var(--info-light)] dark:border-[var(--info-dark)] text-[var(--accent-hover)] dark:text-[var(--info)]',
    green: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 border-[var(--success-light)] dark:border-[var(--success-dark)] text-[var(--chart-green)] dark:text-[var(--success)]',
    yellow: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 border-[var(--warning-light)] dark:border-[var(--warning-dark)] text-[var(--warning)] dark:text-[var(--warning)]',
    red: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 border-[var(--danger-light)] dark:border-[var(--danger-dark)] text-[var(--chart-red)] dark:text-[var(--danger)]',
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
    </div>
  )
}


function SectionCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6 ${className}`}>
      <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--text-primary)]">{title}</h2>
      {children}
    </div>
  )
}

function AttendanceBar({ percentage }: { percentage: number }) {
  const getColor = (pct: number) => {
    if (pct >= 80) return 'bg-[var(--success)]'
    if (pct >= 60) return 'bg-[var(--warning)]'
    return 'bg-[var(--danger)]'
  }

  return (
    <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${getColor(percentage)}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

function GuardianStatusBadge({
  status,
}: {
  status: 'VERIFIED' | 'UNVERIFIED' | 'NO_GUARDIAN'
}) {
  const classes = {
    VERIFIED: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/40 text-[var(--success-dark)] dark:text-[var(--success)] border-[var(--success-light)] dark:border-[var(--success-dark)]',
    UNVERIFIED: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/40 text-[var(--warning-dark)] dark:text-[var(--warning)] border-[var(--warning-light)] dark:border-[var(--warning-dark)]',
    NO_GUARDIAN: 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/40 text-[var(--danger-dark)] dark:text-[var(--danger)] border-[var(--danger-light)] dark:border-[var(--danger-dark)]',
  }

  const labels = {
    VERIFIED: '✓ Verified',
    UNVERIFIED: '⚠ Unverified',
    NO_GUARDIAN: '✗ No Guardian',
  }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${classes[status]}`}>
      {labels[status]}
    </span>
  )
}

function SimpleTrendChart({
  data,
  label,
}: {
  data: { label: string; value: number }[]
  label: string
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 100)
  const minValue = Math.min(...data.map((d) => d.value), 0)
  const range = maxValue - minValue || 1

  return (
    <div>
      <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">{label}</p>
      <div className="flex items-end space-x-1 h-24">
        {data.map((item, index) => {
          const height = ((item.value - minValue) / range) * 80 + 20
          const color =
            item.value >= 80
              ? 'bg-[var(--success)]'
              : item.value >= 60
              ? 'bg-[var(--warning)]'
              : 'bg-[var(--danger)]'

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full ${color} rounded-t transition-all duration-300`}
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}%`}
              />
              <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1 truncate w-full text-center">
                {item.label.slice(-5)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
    </div>
  )
}

function RefreshIndicator({ isRefreshing, lastUpdated }: { isRefreshing: boolean; lastUpdated: Date | null }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-[var(--text-muted)]">
      {isRefreshing && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--chart-blue)]"></div>
      )}
      <span>
        {lastUpdated
          ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
          : 'Loading...'}
      </span>
    </div>
  )
}


export default function RealTimeAttendanceDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<RealTimeAttendanceDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  // Quick Actions state
  const [isSendingAlerts, setIsSendingAlerts] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Get schoolId from session
  const schoolId = session?.user?.schoolId

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!schoolId) {
      setError('No school context found. Please log in again.')
      setIsLoading(false)
      return
    }

    if (showRefreshIndicator) {
      setIsRefreshing(true)
    }

    try {
      const response = await fetch(
        `/api/dashboard/attendance?schoolId=${schoolId}&date=${selectedDate}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch attendance data')
      }

      const dashboardData = await response.json()
      setData(dashboardData)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching attendance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load attendance data. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [schoolId, selectedDate])

  // Initial fetch - wait for session to be ready
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      setError('Please log in to view attendance data.')
      setIsLoading(false)
      return
    }
    if (schoolId) {
      setIsLoading(true)
      fetchData()
    }
  }, [fetchData, status, schoolId])

  // Auto-refresh every minute (Requirement 39.2) - only when authenticated
  useEffect(() => {
    if (!schoolId || status !== 'authenticated') return

    const interval = setInterval(() => {
      fetchData(true)
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchData, schoolId, status])

  const handleRefresh = () => {
    fetchData(true)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  // Clear action message after 5 seconds
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [actionMessage])

  // Send Absence Alerts to guardians of absent students
  const handleSendAbsenceAlerts = async () => {
    if (!data || data.absentStudents.length === 0) {
      setActionMessage({ type: 'error', text: 'No absent students to send alerts for.' })
      return
    }

    const verifiedStudents = data.absentStudents.filter(
      s => s.guardianContactStatus === 'VERIFIED' && s.guardianPhone
    )

    if (verifiedStudents.length === 0) {
      setActionMessage({ type: 'error', text: 'No absent students with verified guardian contacts.' })
      return
    }

    setIsSendingAlerts(true)
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Dear Parent/Guardian, your child was marked absent today (${selectedDate}). Please contact the school if this is unexpected.`,
          recipientType: 'individual',
          studentIds: verifiedStudents.map(s => s.studentId),
          excludeUnpaid: false, // Send to all absent students regardless of payment
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setActionMessage({
          type: 'success',
          text: `Absence alerts sent to ${result.sentCount} guardian(s).${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''}`,
        })
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Failed to send alerts.' })
      }
    } catch (err) {
      console.error('Error sending absence alerts:', err)
      setActionMessage({ type: 'error', text: 'Failed to send absence alerts. Please try again.' })
    } finally {
      setIsSendingAlerts(false)
    }
  }

  // Export attendance report as CSV
  const handleExportReport = async () => {
    if (!data) return

    setIsExporting(true)
    try {
      // Build CSV content
      const headers = ['Class', 'Total Students', 'Present', 'Late', 'Absent', 'Attendance %']
      const classRows = data.classAttendance.map(cls => [
        cls.className,
        cls.totalStudents,
        cls.presentCount,
        cls.lateCount,
        cls.absentCount,
        `${cls.attendancePercentage}%`,
      ])

      const absentHeaders = ['Student Name', 'Class', 'Periods Absent', 'Guardian Status', 'Guardian Phone']
      const absentRows = data.absentStudents.map(s => [
        s.studentName,
        s.className,
        s.periodsAbsent.join('; '),
        s.guardianContactStatus,
        s.guardianPhone || 'N/A',
      ])

      const csvContent = [
        `Attendance Report - ${selectedDate}`,
        `Overall Attendance: ${data.overallAttendance}%`,
        '',
        'CLASS ATTENDANCE',
        headers.join(','),
        ...classRows.map(row => row.join(',')),
        '',
        'ABSENT STUDENTS',
        absentHeaders.join(','),
        ...absentRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `attendance-report-${selectedDate}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      setActionMessage({ type: 'success', text: 'Report exported successfully!' })
    } catch (err) {
      console.error('Error exporting report:', err)
      setActionMessage({ type: 'error', text: 'Failed to export report.' })
    } finally {
      setIsExporting(false)
    }
  }

  // Navigate to full attendance history
  const handleViewFullHistory = () => {
    router.push('/dashboard/reports?type=attendance')
  }

  // Open contact guardians modal
  const handleContactGuardians = () => {
    if (!data || data.absentStudents.length === 0) {
      setActionMessage({ type: 'error', text: 'No absent students to contact guardians for.' })
      return
    }
    setShowContactModal(true)
  }

  // Close contact modal
  const handleCloseContactModal = () => {
    setShowContactModal(false)
  }

  // Show loading while session is being fetched
  if (status === 'loading') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <LoadingSpinner />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <LoadingSpinner />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <p className="text-[var(--danger-dark)] dark:text-[var(--danger)]">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 px-4 py-2 bg-[var(--chart-red)] text-[var(--white-pure)] rounded hover:bg-[var(--chart-red)]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const belowThresholdCount = data.classAttendance.filter(
    (c) => c.isBelowThreshold
  ).length

  const displayDate = new Date(data.date)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            Real-Time Attendance Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            {displayDate.toLocaleDateString('en-UG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg text-sm bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
          />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 text-sm"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <RefreshIndicator isRefreshing={isRefreshing} lastUpdated={lastUpdated} />
        </div>
      </div>

      {/* Overview Stats - Requirement 39.1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Overall Attendance"
          value={`${data.overallAttendance}%`}
          color={data.overallAttendance >= 80 ? 'green' : 'red'}
        />
        <StatCard
          title="Total Classes"
          value={data.classAttendance.length}
          color="blue"
        />
        <StatCard
          title="Classes Below 80%"
          value={belowThresholdCount}
          subtitle="Requires attention"
          color={belowThresholdCount > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Absent Students"
          value={data.absentStudents.length}
          color="yellow"
        />
      </div>

      {/* Alert for classes below threshold - Requirement 39.3 */}
      {belowThresholdCount > 0 && (
        <div className="mb-6 p-4 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg">
          <h3 className="font-semibold text-[var(--danger-dark)] dark:text-[var(--danger)] mb-2">
            ⚠️ Classes Below 80% Attendance Threshold
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.classAttendance
              .filter((c) => c.isBelowThreshold)
              .map((cls) => (
                <span
                  key={cls.classId}
                  className="px-3 py-1 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50 text-[var(--danger-dark)] dark:text-[var(--danger)] rounded-full text-sm font-medium"
                >
                  {cls.className}: {cls.attendancePercentage}%
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Class Attendance - Requirement 39.1 */}
        <SectionCard title="Attendance by Class" className="lg:col-span-2">
          <div className="space-y-4">
            {data.classAttendance.map((cls) => (
              <div
                key={cls.classId}
                className={`p-4 rounded-lg border transition-colors ${
                  cls.isBelowThreshold
                    ? 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 border-[var(--danger-light)] dark:border-[var(--danger-dark)]'
                    : 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 border-[var(--border-default)] dark:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{cls.className}</span>
                    <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] ml-2">
                      ({cls.totalStudents} students)
                    </span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      cls.isBelowThreshold ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' : 'text-[var(--chart-green)] dark:text-[var(--success)]'
                    }`}
                  >
                    {cls.attendancePercentage}%
                  </span>
                </div>
                <AttendanceBar percentage={cls.attendancePercentage} />
                <div className="flex justify-between mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <span className="text-[var(--chart-green)] dark:text-[var(--success)]">Present: {cls.presentCount}</span>
                  <span className="text-[var(--chart-yellow)] dark:text-[var(--warning)]">Late: {cls.lateCount}</span>
                  <span className={cls.absentCount > 0 ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' : ''}>
                    Absent: {cls.absentCount}
                  </span>
                </div>
              </div>
            ))}
            {data.classAttendance.length === 0 && (
              <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted)] py-4">
                No attendance data available
              </p>
            )}
          </div>
        </SectionCard>

        {/* Absent Students - Requirement 39.4 */}
        <SectionCard title="Absent Students with Guardian Status">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.absentStudents.map((student) => (
              <div
                key={student.studentId}
                className="p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.studentName}</p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{student.className}</p>
                  </div>
                  <GuardianStatusBadge status={student.guardianContactStatus} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    Periods absent: {student.periodsAbsent.join(', ')}
                  </span>
                  {student.guardianPhone && (
                    <a
                      href={`tel:${student.guardianPhone}`}
                      className="text-[var(--chart-blue)] dark:text-[var(--chart-blue)] hover:underline flex items-center gap-1"
                    >
                      <span>📞</span>
                      {student.guardianPhone}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {data.absentStudents.length === 0 && (
              <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted)] py-4">
                No absent students today 🎉
              </p>
            )}
          </div>
        </SectionCard>

        {/* Attendance Trends - Requirement 39.5 */}
        <SectionCard title="Attendance Trends">
          <div className="space-y-6">
            <SimpleTrendChart
              data={data.trends.weekly.map((d) => ({
                label: d.date,
                value: d.percentage,
              }))}
              label="Last 7 Days"
            />
            <SimpleTrendChart
              data={data.trends.monthly.map((d) => ({
                label: d.week,
                value: d.percentage,
              }))}
              label="Last 4 Weeks"
            />
          </div>
        </SectionCard>
      </div>

      {/* Action Message Toast */}
      {actionMessage && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            actionMessage.type === 'success'
              ? 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/50 text-[var(--success-dark)] dark:text-[var(--success)] border border-[var(--success-light)] dark:border-[var(--success-dark)]'
              : 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/50 text-[var(--danger-dark)] dark:text-[var(--danger)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✓' : '✗'}</span>
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-2 text-[var(--text-muted)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Contact Guardians Modal */}
      {showContactModal && data && (
        <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)] flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Contact Guardians of Absent Students</h3>
              <button
                onClick={handleCloseContactModal}
                className="text-[var(--text-muted)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {data.absentStudents.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] dark:text-[var(--text-muted)] py-4">No absent students today</p>
              ) : (
                <div className="space-y-3">
                  {data.absentStudents.map((student) => (
                    <div
                      key={student.studentId}
                      className="p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.studentName}</p>
                        <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{student.className}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <GuardianStatusBadge status={student.guardianContactStatus} />
                        {student.guardianPhone ? (
                          <div className="flex gap-2">
                            <a
                              href={`tel:${student.guardianPhone}`}
                              className="px-3 py-1 bg-[var(--chart-blue)] text-[var(--white-pure)] text-sm rounded hover:bg-[var(--accent-hover)] flex items-center gap-1"
                            >
                              📞 Call
                            </a>
                            <a
                              href={`https://wa.me/${student.guardianPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-[var(--chart-green)] text-[var(--white-pure)] text-sm rounded hover:bg-[var(--chart-green)] flex items-center gap-1"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">No phone</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex justify-end gap-2">
              <button
                onClick={handleCloseContactModal}
                className="px-4 py-2 text-[var(--text-primary)] dark:text-[var(--text-muted)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded hover:bg-[var(--border-default)] dark:hover:bg-[var(--text-secondary)]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCloseContactModal()
                  handleSendAbsenceAlerts()
                }}
                disabled={isSendingAlerts || data.absentStudents.filter(s => s.guardianContactStatus === 'VERIFIED').length === 0}
                className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {isSendingAlerts ? 'Sending...' : 'Send SMS to All Verified'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={handleSendAbsenceAlerts}
            disabled={isSendingAlerts || !data || data.absentStudents.length === 0}
            className="p-3 text-sm bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 text-[var(--accent-hover)] dark:text-[var(--info)] rounded-lg hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSendingAlerts ? (
              <>
                <span className="animate-spin">⏳</span>
                Sending...
              </>
            ) : (
              <>📱 Send Absence Alerts</>
            )}
          </button>
          <button
            onClick={handleExportReport}
            disabled={isExporting || !data}
            className="p-3 text-sm bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 text-[var(--chart-green)] dark:text-[var(--success)] rounded-lg hover:bg-[var(--success-light)] dark:hover:bg-[var(--success-dark)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Exporting...
              </>
            ) : (
              <>📊 Export Report</>
            )}
          </button>
          <button
            onClick={handleViewFullHistory}
            className="p-3 text-sm bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 text-[var(--chart-purple)] dark:text-[var(--chart-purple)] rounded-lg hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]/50 transition-colors flex items-center justify-center gap-2"
          >
            📅 View Full History
          </button>
          <button
            onClick={handleContactGuardians}
            disabled={!data || data.absentStudents.length === 0}
            className="p-3 text-sm bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 text-[var(--warning)] dark:text-[var(--warning)] rounded-lg hover:bg-[var(--warning-light)] dark:hover:bg-[var(--warning-dark)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            👥 Contact Guardians
          </button>
        </div>
      </SectionCard>

      {/* Auto-refresh notice */}
      <div className="mt-4 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
        Dashboard auto-refreshes every minute to show real-time attendance data
      </div>
    </div>
  )
}
