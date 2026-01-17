'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  AlertCircle, 
  Save, 
  Lock,
  CheckCircle2,
  Clock,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import Link from 'next/link'

/**
 * Attendance Recording Page for a Specific Class
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * - Display student list with attendance status options (present/absent/late)
 * - Implement time-based locking based on cutoff configuration
 * - Show locked state with admin approval message after cutoff
 * - Validate teacher assignment before allowing entry
 * - Restrict to current day only
 */

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'

interface Student {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  photo?: string
}

interface AttendanceEntry {
  studentId: string
  status: AttendanceStatus
  remarks?: string
}

interface AttendanceLockState {
  isLocked: boolean
  cutoffTime: string
  canEdit: boolean
  requiresAdminApproval: boolean
  message?: string
}

interface ClassAttendanceData {
  classId: string
  className: string
  streamName: string | null
  date: string
  students: Student[]
  existingRecords: Record<string, AttendanceStatus>
  lockState: AttendanceLockState
  isAssigned: boolean
}

export default function AttendanceRecordingPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId as string

  const [data, setData] = useState<ClassAttendanceData | null>(null)
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchAttendanceData = useCallback(async () => {
    try {
      const response = await fetch(`/api/teacher/attendance/${classId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch attendance data')
      }
      const attendanceData: ClassAttendanceData = await response.json()
      
      // Requirements: 4.6 - Validate teacher assignment
      if (!attendanceData.isAssigned) {
        setError('You are not assigned to this class. Access denied.')
        return
      }

      setData(attendanceData)
      // Initialize attendance state with existing records or default to PRESENT
      const initialAttendance: Record<string, AttendanceStatus> = {}
      attendanceData.students.forEach(student => {
        initialAttendance[student.id] = attendanceData.existingRecords[student.id] || 'PRESENT'
      })
      setAttendance(initialAttendance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load attendance data')
      console.error('Error fetching attendance data:', err)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    // Requirements: 4.3, 4.4, 4.5 - Check lock state before allowing changes
    if (data?.lockState.isLocked && !data?.lockState.canEdit) {
      return
    }
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }))
    setSuccessMessage(null)
  }

  const handleSave = async () => {
    if (!data) return

    // Requirements: 4.3, 4.4, 4.5 - Prevent save if locked
    if (data.lockState.isLocked && !data.lockState.canEdit) {
      setError('Attendance is locked. Admin approval required to make changes.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const records: AttendanceEntry[] = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }))

      const response = await fetch(`/api/teacher/attendance/${classId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          records
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save attendance')
      }

      const result = await response.json()
      setSuccessMessage(result.message || 'Attendance saved successfully')
      
      // Refresh data to get updated lock state
      await fetchAttendanceData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkAll = (status: AttendanceStatus) => {
    if (data?.lockState.isLocked && !data?.lockState.canEdit) {
      return
    }
    const newAttendance: Record<string, AttendanceStatus> = {}
    data?.students.forEach(student => {
      newAttendance[student.id] = status
    })
    setAttendance(newAttendance)
    setSuccessMessage(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={6} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <Link 
            href="/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const isLocked = data.lockState.isLocked && !data.lockState.canEdit
  const today = new Date(data.date).toLocaleDateString('en-UG', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Count attendance stats
  const stats = {
    present: Object.values(attendance).filter(s => s === 'PRESENT').length,
    absent: Object.values(attendance).filter(s => s === 'ABSENT').length,
    late: Object.values(attendance).filter(s => s === 'LATE').length,
    total: data.students.length
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/teacher/attendance"
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {data.className}
            {data.streamName && (
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                {' '}({data.streamName})
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {today}
          </p>
        </div>
      </div>

      {/* Lock State Warning - Requirements: 4.3, 4.4, 4.5 */}
      {isLocked && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Attendance Locked
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {data.lockState.message || `Attendance cutoff time (${data.lockState.cutoffTime}) has passed. Contact administration for approval to make changes.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && data && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 p-3 text-center">
          <div className="text-2xl font-semibold text-green-700 dark:text-green-300">{stats.present}</div>
          <div className="text-xs text-green-600 dark:text-green-400">Present</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 p-3 text-center">
          <div className="text-2xl font-semibold text-red-700 dark:text-red-300">{stats.absent}</div>
          <div className="text-xs text-red-600 dark:text-red-400">Absent</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 p-3 text-center">
          <div className="text-2xl font-semibold text-amber-700 dark:text-amber-300">{stats.late}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400">Late</div>
        </div>
      </div>

      {/* Quick Actions */}
      {!isLocked && (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll('PRESENT')}
            className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
          >
            Mark All Present
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll('ABSENT')}
            className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
          >
            Mark All Absent
          </Button>
        </div>
      )}

      {/* Student List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {data.students.map((student, index) => (
            <StudentAttendanceRow
              key={student.id}
              student={student}
              index={index + 1}
              status={attendance[student.id] || 'PRESENT'}
              onStatusChange={(status) => handleStatusChange(student.id, status)}
              isLocked={isLocked}
            />
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || isLocked}
          size="lg"
          className="shadow-lg"
        >
          {saving ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isLocked ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Locked
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface StudentAttendanceRowProps {
  student: Student
  index: number
  status: AttendanceStatus
  onStatusChange: (status: AttendanceStatus) => void
  isLocked: boolean
}

function StudentAttendanceRow({ 
  student, 
  index, 
  status, 
  onStatusChange, 
  isLocked 
}: StudentAttendanceRowProps) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 w-6">{index}.</span>
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          {student.photo ? (
            <img 
              src={student.photo} 
              alt={`${student.firstName} ${student.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {student.firstName} {student.lastName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {student.admissionNumber}
          </div>
        </div>
      </div>

      {/* Status Buttons */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onStatusChange('PRESENT')}
          disabled={isLocked}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            status === 'PRESENT'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30'
          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Present
        </button>
        <button
          type="button"
          onClick={() => onStatusChange('ABSENT')}
          disabled={isLocked}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            status === 'ABSENT'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Absent
        </button>
        <button
          type="button"
          onClick={() => onStatusChange('LATE')}
          disabled={isLocked}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            status === 'LATE'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Late
        </button>
      </div>
    </div>
  )
}
