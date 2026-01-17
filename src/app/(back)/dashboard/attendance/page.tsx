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
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
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
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h2>
      {children}
    </div>
  )
}

function AttendanceBar({ percentage }: { percentage: number }) {
  const getColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
    VERIFIED: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    UNVERIFIED: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    NO_GUARDIAN: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
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
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <div className="flex items-end space-x-1 h-24">
        {data.map((item, index) => {
          const height = ((item.value - minValue) / range) * 80 + 20
          const color =
            item.value >= 80
              ? 'bg-green-500'
              : item.value >= 60
              ? 'bg-yellow-500'
              : 'bg-red-500'

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full ${color} rounded-t transition-all duration-300`}
                style={{ height: `${height}%` }}
                title={`${item.label}: ${item.value}%`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

function RefreshIndicator({ isRefreshing, lastUpdated }: { isRefreshing: boolean; lastUpdated: Date | null }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500">
      {isRefreshing && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <LoadingSpinner />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <LoadingSpinner />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Real-Time Attendance Dashboard
        </h1>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Real-Time Attendance Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
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
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
            ⚠️ Classes Below 80% Attendance Threshold
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.classAttendance
              .filter((c) => c.isBelowThreshold)
              .map((cls) => (
                <span
                  key={cls.classId}
                  className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-full text-sm font-medium"
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
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{cls.className}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({cls.totalStudents} students)
                    </span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      cls.isBelowThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {cls.attendancePercentage}%
                  </span>
                </div>
                <AttendanceBar percentage={cls.attendancePercentage} />
                <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-600 dark:text-green-400">Present: {cls.presentCount}</span>
                  <span className="text-yellow-600 dark:text-yellow-400">Late: {cls.lateCount}</span>
                  <span className={cls.absentCount > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                    Absent: {cls.absentCount}
                  </span>
                </div>
              </div>
            ))}
            {data.classAttendance.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
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
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{student.studentName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{student.className}</p>
                  </div>
                  <GuardianStatusBadge status={student.guardianContactStatus} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Periods absent: {student.periodsAbsent.join(', ')}
                  </span>
                  {student.guardianPhone && (
                    <a
                      href={`tel:${student.guardianPhone}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>📞</span>
                      {student.guardianPhone}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {data.absentStudents.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
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
              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✓' : '✗'}</span>
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Contact Guardians Modal */}
      {showContactModal && data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Guardians of Absent Students</h3>
              <button
                onClick={handleCloseContactModal}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {data.absentStudents.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No absent students today</p>
              ) : (
                <div className="space-y-3">
                  {data.absentStudents.map((student) => (
                    <div
                      key={student.studentId}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{student.studentName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.className}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <GuardianStatusBadge status={student.guardianContactStatus} />
                        {student.guardianPhone ? (
                          <div className="flex gap-2">
                            <a
                              href={`tel:${student.guardianPhone}`}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              📞 Call
                            </a>
                            <a
                              href={`https://wa.me/${student.guardianPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No phone</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
              <button
                onClick={handleCloseContactModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCloseContactModal()
                  handleSendAbsenceAlerts()
                }}
                disabled={isSendingAlerts || data.absentStudents.filter(s => s.guardianContactStatus === 'VERIFIED').length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
            className="p-3 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="p-3 text-sm bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            className="p-3 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
          >
            📅 View Full History
          </button>
          <button
            onClick={handleContactGuardians}
            disabled={!data || data.absentStudents.length === 0}
            className="p-3 text-sm bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            👥 Contact Guardians
          </button>
        </div>
      </SectionCard>

      {/* Auto-refresh notice */}
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Dashboard auto-refreshes every minute to show real-time attendance data
      </div>
    </div>
  )
}
