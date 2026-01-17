'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AttendanceStatus } from '@/types/enums'

/**
 * Attendance Marking Page
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * - Class selector and date picker defaulting to current date (5.1)
 * - Display students with attendance status options (5.2)
 * - Save attendance via POST to /api/attendance (5.3)
 * - Trigger SMS notification to parent when absent (5.4)
 * - Skip SMS for unpaid students (5.5)
 * - Display attendance history with absence patterns (5.6)
 */

interface ClassOption {
  id: string
  name: string
  level: number
  streams: { id: string; name: string }[]
}

interface StudentForAttendance {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  streamName: string | null
  paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL'
  currentStatus?: AttendanceStatus
}

interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
  remarks?: string
}

interface AttendanceHistoryRecord {
  id: string
  date: string
  period: number
  status: AttendanceStatus
  remarks?: string
}

interface AbsencePattern {
  type: 'CONSECUTIVE' | 'WEEKLY' | 'FREQUENT'
  description: string
  dates: string[]
}

interface StudentAttendanceHistory {
  studentId: string
  studentName: string
  records: AttendanceHistoryRecord[]
  patterns: AbsencePattern[]
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendancePercentage: number
  }
}

// Class Selector Component
function ClassSelector({
  classes,
  selectedClassId,
  onSelect,
  loading,
}: {
  classes: ClassOption[]
  selectedClassId: string
  onSelect: (classId: string) => void
  loading: boolean
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor="class-select" className="text-sm font-medium text-gray-700 mb-1">
        Select Class
      </label>
      <select
        id="class-select"
        value={selectedClassId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      >
        <option value="">-- Select a class --</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Date Picker Component - defaults to current date (Requirement 5.1)
function DatePicker({
  selectedDate,
  onDateChange,
  loading,
}: {
  selectedDate: string
  onDateChange: (date: string) => void
  loading: boolean
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor="date-picker" className="text-sm font-medium text-gray-700 mb-1">
        Date
      </label>
      <input
        id="date-picker"
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        disabled={loading}
        max={new Date().toISOString().split('T')[0]}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      />
    </div>
  )
}

// Attendance Status Button Component
function StatusButton({
  status,
  isSelected,
  onClick,
  disabled,
}: {
  status: AttendanceStatus
  isSelected: boolean
  onClick: () => void
  disabled: boolean
}) {
  const statusConfig = {
    [AttendanceStatus.PRESENT]: {
      label: 'Present',
      selectedClass: 'bg-green-600 text-white border-green-600',
      unselectedClass: 'bg-white text-green-600 border-green-300 hover:bg-green-50',
    },
    [AttendanceStatus.ABSENT]: {
      label: 'Absent',
      selectedClass: 'bg-red-600 text-white border-red-600',
      unselectedClass: 'bg-white text-red-600 border-red-300 hover:bg-red-50',
    },
    [AttendanceStatus.LATE]: {
      label: 'Late',
      selectedClass: 'bg-yellow-500 text-white border-yellow-500',
      unselectedClass: 'bg-white text-yellow-600 border-yellow-300 hover:bg-yellow-50',
    },
  }

  const config = statusConfig[status]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 text-sm font-medium rounded border transition-colors ${
        isSelected ? config.selectedClass : config.unselectedClass
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {config.label}
    </button>
  )
}

// Payment Status Badge
function PaymentBadge({ status }: { status: 'PAID' | 'NOT_PAID' | 'PARTIAL' }) {
  const config = {
    PAID: { label: 'Paid', className: 'bg-green-100 text-green-800' },
    NOT_PAID: { label: 'Unpaid', className: 'bg-red-100 text-red-800' },
    PARTIAL: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800' },
  }

  const { label, className } = config[status]

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${className}`}>
      {label}
    </span>
  )
}

// Student Attendance Row Component
function StudentAttendanceRow({
  student,
  currentStatus,
  onStatusChange,
  onViewHistory,
  saving,
}: {
  student: StudentForAttendance
  currentStatus: AttendanceStatus | undefined
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
  onViewHistory: (studentId: string) => void
  saving: boolean
}) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{student.name}</span>
          <span className="text-sm text-gray-500">{student.admissionNumber}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {student.streamName || '-'}
      </td>
      <td className="px-4 py-3">
        <PaymentBadge status={student.paymentStatus} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {[AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE].map(
            (status) => (
              <StatusButton
                key={status}
                status={status}
                isSelected={currentStatus === status}
                onClick={() => onStatusChange(student.id, status)}
                disabled={saving}
              />
            )
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewHistory(student.id)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View History
        </button>
      </td>
    </tr>
  )
}

// Attendance History Modal
function AttendanceHistoryModal({
  history,
  onClose,
}: {
  history: StudentAttendanceHistory | null
  onClose: () => void
}) {
  if (!history) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Attendance History - {history.studentName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{history.summary.totalDays}</p>
              <p className="text-sm text-blue-600">Total Days</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{history.summary.presentDays}</p>
              <p className="text-sm text-green-600">Present</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{history.summary.absentDays}</p>
              <p className="text-sm text-red-600">Absent</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-700">{history.summary.attendancePercentage}%</p>
              <p className="text-sm text-yellow-600">Attendance</p>
            </div>
          </div>

          {/* Absence Patterns (Requirement 5.6) */}
          {history.patterns.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Absence Patterns</h4>
              <div className="space-y-2">
                {history.patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      pattern.type === 'CONSECUTIVE'
                        ? 'bg-red-50 border-red-200'
                        : pattern.type === 'WEEKLY'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <p className="font-medium text-sm">{pattern.description}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Dates: {pattern.dates.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Records */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recent Records</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Period</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {history.records.slice(0, 20).map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{record.date}</td>
                      <td className="px-4 py-2 text-sm">{record.period}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            record.status === AttendanceStatus.PRESENT
                              ? 'bg-green-100 text-green-800'
                              : record.status === AttendanceStatus.ABSENT
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {record.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

// Toast Notification
function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error' | 'warning'
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
  }

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
      {message}
    </div>
  )
}

export default function AttendanceMarkingPage() {
  // State for class selector and date picker (Requirement 5.1)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  // State for students and attendance
  const [students, setStudents] = useState<StudentForAttendance[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceStatus>>(new Map())
  
  // State for history modal
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentAttendanceHistory | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // Loading and error states
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch('/api/classes')
        if (!response.ok) throw new Error('Failed to fetch classes')
        const data = await response.json()
        setClasses(data)
      } catch (error) {
        console.error('Error fetching classes:', error)
        setToast({ message: 'Failed to load classes', type: 'error' })
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  // Fetch students when class is selected (Requirement 5.2)
  const fetchStudents = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([])
      return
    }

    setLoadingStudents(true)
    try {
      // Fetch students for the selected class
      const studentsResponse = await fetch(`/api/students?classId=${selectedClassId}&pageSize=200`)
      if (!studentsResponse.ok) throw new Error('Failed to fetch students')
      const studentsData = await studentsResponse.json()

      // Fetch existing attendance records for the date
      const attendanceResponse = await fetch(
        `/api/attendance?classId=${selectedClassId}&date=${selectedDate}`
      )
      
      let existingRecords: Record<string, AttendanceStatus> = {}
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        existingRecords = attendanceData.records || {}
      }

      // Map students with their current attendance status
      const studentsWithStatus: StudentForAttendance[] = studentsData.students.map(
        (student: StudentForAttendance) => ({
          ...student,
          currentStatus: existingRecords[student.id],
        })
      )

      setStudents(studentsWithStatus)
      
      // Initialize attendance records map
      const recordsMap = new Map<string, AttendanceStatus>()
      for (const [studentId, status] of Object.entries(existingRecords)) {
        recordsMap.set(studentId, status as AttendanceStatus)
      }
      setAttendanceRecords(recordsMap)
    } catch (error) {
      console.error('Error fetching students:', error)
      setToast({ message: 'Failed to load students', type: 'error' })
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedClassId, selectedDate])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Handle attendance status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const newMap = new Map(prev)
      newMap.set(studentId, status)
      return newMap
    })
  }

  // Save attendance (Requirement 5.3)
  const handleSaveAttendance = async () => {
    if (attendanceRecords.size === 0) {
      setToast({ message: 'No attendance records to save', type: 'warning' })
      return
    }

    setSaving(true)
    try {
      const records: AttendanceRecord[] = Array.from(attendanceRecords.entries()).map(
        ([studentId, status]) => ({
          studentId,
          status,
        })
      )

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          date: selectedDate,
          period: 1, // Default to period 1
          records,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save attendance')
      }

      const result = await response.json()
      
      setToast({ 
        message: `Attendance saved. ${result.notificationsSent || 0} absence notifications sent.`, 
        type: 'success' 
      })
    } catch (error) {
      console.error('Error saving attendance:', error)
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to save attendance', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  // View student attendance history (Requirement 5.6)
  const handleViewHistory = async (studentId: string) => {
    try {
      const response = await fetch(`/api/attendance/history?studentId=${studentId}`)
      if (!response.ok) throw new Error('Failed to fetch history')
      const history = await response.json()
      setSelectedStudentHistory(history)
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error fetching history:', error)
      setToast({ message: 'Failed to load attendance history', type: 'error' })
    }
  }

  // Mark all students with a status
  const handleMarkAll = (status: AttendanceStatus) => {
    const newMap = new Map<string, AttendanceStatus>()
    students.forEach((student) => {
      newMap.set(student.id, status)
    })
    setAttendanceRecords(newMap)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
        <p className="text-gray-600">Record daily attendance for students</p>
      </div>

      {/* Class Selector and Date Picker (Requirement 5.1) */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ClassSelector
            classes={classes}
            selectedClassId={selectedClassId}
            onSelect={setSelectedClassId}
            loading={loadingClasses}
          />
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            loading={loadingStudents}
          />
          <div className="flex items-end">
            <button
              onClick={fetchStudents}
              disabled={!selectedClassId || loadingStudents}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingStudents ? 'Loading...' : 'Load Students'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
            <button
              onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
              disabled={saving}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
            >
              Mark All Present
            </button>
            <button
              onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
              disabled={saving}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Mark All Absent
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSaveAttendance}
              disabled={saving || attendanceRecords.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              Save Attendance
            </button>
          </div>
        </div>
      )}

      {/* Students Table (Requirement 5.2) */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loadingStudents ? (
          <LoadingSpinner />
        ) : !selectedClassId ? (
          <div className="p-8 text-center text-gray-500">
            Please select a class to view students
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students found in this class
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stream
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  History
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <StudentAttendanceRow
                  key={student.id}
                  student={student}
                  currentStatus={attendanceRecords.get(student.id)}
                  onStatusChange={handleStatusChange}
                  onViewHistory={handleViewHistory}
                  saving={saving}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {students.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Students:</span>{' '}
              <span className="font-medium">{students.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Present:</span>{' '}
              <span className="font-medium text-green-600">
                {Array.from(attendanceRecords.values()).filter(s => s === AttendanceStatus.PRESENT).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Absent:</span>{' '}
              <span className="font-medium text-red-600">
                {Array.from(attendanceRecords.values()).filter(s => s === AttendanceStatus.ABSENT).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Late:</span>{' '}
              <span className="font-medium text-yellow-600">
                {Array.from(attendanceRecords.values()).filter(s => s === AttendanceStatus.LATE).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Not Marked:</span>{' '}
              <span className="font-medium text-gray-600">
                {students.length - attendanceRecords.size}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Modal (Requirement 5.6) */}
      {showHistoryModal && (
        <AttendanceHistoryModal
          history={selectedStudentHistory}
          onClose={() => {
            setShowHistoryModal(false)
            setSelectedStudentHistory(null)
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
