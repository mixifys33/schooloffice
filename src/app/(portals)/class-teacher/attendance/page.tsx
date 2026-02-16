'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, ClipboardList, Calendar, AlertCircle, CheckCircle, 
  Save, Send, Lock, Download, History as HistoryIcon, BarChart3,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import { BulkActions } from '@/components/class-teacher/attendance/BulkActions'
import { AttendanceFilters } from '@/components/class-teacher/attendance/AttendanceFilters'
import { AttendanceCalendar } from '@/components/class-teacher/attendance/AttendanceCalendar'
import { AttendanceStats } from '@/components/class-teacher/attendance/AttendanceStats'
import { LowAttendanceAlerts } from '@/components/class-teacher/attendance/LowAttendanceAlerts'

interface StudentAttendance {
  studentId: string
  studentName: string
  admissionNumber: string
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null
  lastAttendanceDate: string | null
  attendanceRate: number
}

interface ClassTeacherAttendanceData {
  context: {
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
  class: {
    id: string
    name: string
    streamName: string | null
    studentCount: number
  } | null
  date: string
  students: StudentAttendance[]
  isPublished: boolean
  isTermActive: boolean
  canEdit: boolean
  lockMessage: string | null
  hasUnsavedChanges: boolean
  submittedAt: string | null
}

export default function ClassTeacherAttendancePage() {
  const [data, setData] = useState<ClassTeacherAttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('marking')

  // Attendance state
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rateFilter, setRateFilter] = useState('all')

  // Get localStorage key for current date and class
  const getLocalStorageKey = useCallback(() => {
    if (!data?.class?.id) return null
    const dateStr = selectedDate.toISOString().split('T')[0]
    return `attendance-${data.class.id}-${dateStr}`
  }, [data?.class?.id, selectedDate])

  // Save to localStorage
  useEffect(() => {
    const storageKey = getLocalStorageKey()
    if (!storageKey || !hasChanges) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(attendanceStatus))
      console.log('💾 Saved to localStorage:', storageKey)
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
    }
  }, [attendanceStatus, hasChanges, getLocalStorageKey])

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/class-teacher/attendance?date=${dateStr}`)
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data')
      }
      const attendanceData = await response.json()
      setData(attendanceData)

      // Initialize attendance status from fetched data
      const initialStatus: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null> = {}
      attendanceData.students.forEach((student: StudentAttendance) => {
        initialStatus[student.studentId] = student.attendanceStatus
      })

      // Check for localStorage backup
      const storageKey = `attendance-${attendanceData.class?.id}-${dateStr}`
      const savedData = localStorage.getItem(storageKey)
      
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData)
          console.log('📂 Restored from localStorage:', storageKey)
          setAttendanceStatus(parsedData)
          setHasChanges(true)
        } catch (err) {
          console.error('Failed to parse localStorage data:', err)
          setAttendanceStatus(initialStatus)
          setHasChanges(false)
        }
      } else {
        setAttendanceStatus(initialStatus)
        setHasChanges(false)
      }

      setError(null)
    } catch (err) {
      setError('Unable to load attendance data')
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  // Auto-save functionality - triggers 2 seconds after changes
  useEffect(() => {
    if (!hasChanges || !data?.canEdit) return

    setAutoSaveStatus('idle')
    const timer = setTimeout(() => {
      autoSaveAttendance()
    }, 2000) // 2 seconds debounce

    return () => clearTimeout(timer)
  }, [attendanceStatus, hasChanges, data?.canEdit])

  // Auto-save function
  const autoSaveAttendance = async () => {
    if (!data || !hasChanges) return

    setAutoSaveStatus('saving')
    console.log('💾 Auto-saving attendance...')

    try {
      const attendanceToSave = Object.entries(attendanceStatus).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate.toISOString().split('T')[0],
      }))

      const response = await fetch('/api/class-teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: data.class?.id,
          date: selectedDate.toISOString().split('T')[0],
          attendance: attendanceToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Auto-save failed')
      }

      // Clear localStorage after successful save
      const storageKey = getLocalStorageKey()
      if (storageKey) {
        localStorage.removeItem(storageKey)
        console.log('🗑️ Cleared localStorage:', storageKey)
      }

      setHasChanges(false)
      setAutoSaveStatus('saved')
      setLastSavedAt(new Date())
      console.log('✅ Auto-save successful')

      // Reset status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle')
      }, 3000)
    } catch (err) {
      console.error('❌ Auto-save failed:', err)
      setAutoSaveStatus('idle')
    }
  }

  // Handle attendance status change
  const handleAttendanceChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: status
    }))
    setHasChanges(true)
  }

  // Bulk actions
  const handleMarkAllPresent = () => {
    if (!data) return
    const newStatus: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null> = {}
    data.students.forEach(student => {
      newStatus[student.studentId] = 'PRESENT'
    })
    setAttendanceStatus(newStatus)
    setHasChanges(true)
  }

  const handleMarkAllAbsent = () => {
    if (!data) return
    const newStatus: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null> = {}
    data.students.forEach(student => {
      newStatus[student.studentId] = 'ABSENT'
    })
    setAttendanceStatus(newStatus)
    setHasChanges(true)
  }

  const handleClearAll = () => {
    if (!data) return
    const newStatus: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null> = {}
    data.students.forEach(student => {
      newStatus[student.studentId] = null
    })
    setAttendanceStatus(newStatus)
    setHasChanges(true)
  }

  // Save attendance
  const handleSaveDraft = async () => {
    if (!data || !hasChanges) return

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const attendanceToSave = Object.entries(attendanceStatus).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate.toISOString().split('T')[0],
      }))

      const response = await fetch('/api/class-teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: data.class?.id,
          date: selectedDate.toISOString().split('T')[0],
          attendance: attendanceToSave,
          isDraft: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      // Clear localStorage after successful save
      const storageKey = getLocalStorageKey()
      if (storageKey) {
        localStorage.removeItem(storageKey)
      }

      await fetchAttendanceData()
      setHasChanges(false)
      setSuccessMessage('Attendance saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // Submit final attendance
  const handleSubmitFinal = async () => {
    if (!data) return

    const confirmed = window.confirm(
      'Are you sure you want to submit final attendance? This will notify the administration.'
    )
    if (!confirmed) return

    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // First save any pending changes
      if (hasChanges) {
        await handleSaveDraft()
      }

      // Submit final attendance
      const response = await fetch('/api/class-teacher/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: data.class?.id,
          date: selectedDate.toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit attendance')
      }

      await fetchAttendanceData()
      setSuccessMessage('Attendance submitted successfully')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attendance')
    } finally {
      setSubmitting(false)
    }
  }

  // Export attendance
  const handleExport = async () => {
    try {
      const startDate = new Date(selectedDate)
      startDate.setDate(1) // First day of month
      const endDate = new Date(selectedDate)
      endDate.setMonth(endDate.getMonth() + 1, 0) // Last day of month

      const url = `/api/class-teacher/attendance/export?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&format=csv`
      window.open(url, '_blank')
    } catch (err) {
      setError('Failed to export attendance')
    }
  }

  // Filter students
  const filteredStudents = data?.students.filter(student => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = student.studentName.toLowerCase().includes(query)
      const matchesAdmission = student.admissionNumber.toLowerCase().includes(query)
      if (!matchesName && !matchesAdmission) return false
    }

    // Status filter
    const currentStatus = attendanceStatus[student.studentId]
    if (statusFilter !== 'all') {
      if (statusFilter === 'not-marked' && currentStatus !== null) return false
      if (statusFilter !== 'not-marked' && currentStatus?.toLowerCase() !== statusFilter) return false
    }

    // Rate filter
    if (rateFilter !== 'all') {
      if (rateFilter === 'excellent' && student.attendanceRate < 90) return false
      if (rateFilter === 'good' && (student.attendanceRate < 75 || student.attendanceRate >= 90)) return false
      if (rateFilter === 'fair' && (student.attendanceRate < 50 || student.attendanceRate >= 75)) return false
      if (rateFilter === 'poor' && student.attendanceRate >= 50) return false
    }

    return true
  }) || []

  // Calculate statistics
  const presentCount = Object.values(attendanceStatus).filter(s => s === 'PRESENT').length
  const absentCount = Object.values(attendanceStatus).filter(s => s === 'ABSENT').length
  const lateCount = Object.values(attendanceStatus).filter(s => s === 'LATE').length
  const excusedCount = Object.values(attendanceStatus).filter(s => s === 'EXCUSED').length
  const notMarkedCount = Object.values(attendanceStatus).filter(s => s === null).length
  const totalStudents = data?.students.length || 0
  const classRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0

  // Low attendance alerts
  const lowAttendanceAlerts = data?.students
    .filter(s => s.attendanceRate < 75)
    .map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      admissionNumber: s.admissionNumber,
      attendanceRate: s.attendanceRate,
      daysAbsent: 0, // Would need to calculate from history
    })) || []

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={6} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Back Navigation */}
      <Link
        href="/dashboard/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Attendance Management</h1>
              <p className="text-muted-foreground">
                {data?.class ? `${data.class.name} ${data.class.streamName ? `(${data.class.streamName})` : ''}` : 'Class Attendance'}
                {data?.context.currentTerm && (
                  <span className="ml-2 text-sm font-medium text-blue-600">
                    • {data.context.currentTerm.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save status indicator */}
            {autoSaveStatus !== 'idle' && (
              <div className="flex items-center gap-2 text-sm">
                {autoSaveStatus === 'saving' && (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span className="text-blue-600">Saving...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">
                      Saved {lastSavedAt && `at ${lastSavedAt.toLocaleTimeString()}`}
                    </span>
                  </>
                )}
              </div>
            )}
            {hasChanges && autoSaveStatus === 'idle' && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Lock Message */}
      {data?.lockMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Lock className="h-5 w-5" />
            <span>{data.lockMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="marking" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts {lowAttendanceAlerts.length > 0 && `(${lowAttendanceAlerts.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Marking Tab */}
        <TabsContent value="marking" className="space-y-6">
          {/* Date Selection & Bulk Actions */}
          <div className="bg-card rounded-lg border p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Date:</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              {data?.canEdit && (
                <BulkActions
                  onMarkAllPresent={handleMarkAllPresent}
                  onMarkAllAbsent={handleMarkAllAbsent}
                  onClearAll={handleClearAll}
                  disabled={saving || submitting}
                  studentCount={totalStudents}
                />
              )}
            </div>

            {/* Filters */}
            <AttendanceFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              rateFilter={rateFilter}
              onRateFilterChange={setRateFilter}
            />
          </div>

          {/* Statistics Summary */}
          <AttendanceStats
            totalStudents={totalStudents}
            presentCount={presentCount}
            absentCount={absentCount}
            lateCount={lateCount}
            excusedCount={excusedCount}
            notMarkedCount={notMarkedCount}
            classRate={classRate}
          />

          {/* Student List */}
          <div className="bg-card rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Student Roster</h2>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredStudents.length} of {totalStudents} students
                </p>
              </div>
              {data?.canEdit && hasChanges && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={saving || submitting}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitFinal}
                    disabled={submitting || saving}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting...' : 'Submit Final'}
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Admission #</th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.studentId} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{student.studentName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {student.admissionNumber}
                      </td>
                      <td className="px-4 py-3">
                        {data?.canEdit ? (
                          <div className="flex justify-center items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={attendanceStatus[student.studentId] === 'PRESENT'}
                                onChange={(e) => {
                                  handleAttendanceChange(
                                    student.studentId,
                                    e.target.checked ? 'PRESENT' : 'ABSENT'
                                  )
                                }}
                                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm font-medium">
                                {attendanceStatus[student.studentId] === 'PRESENT' ? (
                                  <span className="text-green-600">Present</span>
                                ) : (
                                  <span className="text-red-600">Absent</span>
                                )}
                              </span>
                            </label>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <span className={cn(
                              'px-3 py-1 rounded-full text-sm font-medium',
                              student.attendanceStatus === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            )}>
                              {student.attendanceStatus === 'PRESENT' ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Students Found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <AttendanceCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            markedDates={[]} // Would need to fetch from API
          />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <AttendanceStats
            totalStudents={totalStudents}
            presentCount={presentCount}
            absentCount={absentCount}
            lateCount={lateCount}
            excusedCount={excusedCount}
            notMarkedCount={notMarkedCount}
            classRate={classRate}
          />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <LowAttendanceAlerts
            alerts={lowAttendanceAlerts}
            onStudentClick={(studentId) => {
              // Navigate to student details
              window.location.href = `/dashboard/class-teacher/students/${studentId}`
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
