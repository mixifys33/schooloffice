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
  User,
  Search,
  Filter,
  Download,
  Printer,
  ArrowUpDown,
  X
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
  
  // Search, Sort, Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'number'>('name')
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)

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
      
      // Don't reset attendance - keep the selections visible
      // Just refresh data to get updated lock state without changing attendance
      const refreshResponse = await fetch(`/api/teacher/attendance/${classId}`)
      if (refreshResponse.ok) {
        const refreshedData: ClassAttendanceData = await refreshResponse.json()
        setData(refreshedData)
        // Keep current attendance selections
      }
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

  // Filter, Sort, and Search logic
  const getFilteredAndSortedStudents = () => {
    if (!data) return []
    
    let filtered = [...data.students]
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.firstName.toLowerCase().includes(query) ||
        student.lastName.toLowerCase().includes(query) ||
        student.admissionNumber.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(student => attendance[student.id] === filterStatus)
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      } else {
        return a.admissionNumber.localeCompare(b.admissionNumber)
      }
    })
    
    return filtered
  }

  // Print functionality
  const handlePrint = () => {
    if (!data) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const filteredStudents = getFilteredAndSortedStudents()
    const printDate = new Date(data.date).toLocaleDateString('en-UG', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance - ${data.className}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 5px; }
            .meta { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .present { background-color: #d4edda; }
            .absent { background-color: #f8d7da; }
            .late { background-color: #fff3cd; }
            .stats { margin-top: 20px; display: flex; gap: 20px; }
            .stat-box { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${data.className}${data.streamName ? ` (${data.streamName})` : ''}</h1>
          <div class="meta">
            <p><strong>Date:</strong> ${printDate}</p>
            <p><strong>Total Students:</strong> ${filteredStudents.length}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box present">
              <strong>Present:</strong> ${stats.present}
            </div>
            <div class="stat-box absent">
              <strong>Absent:</strong> ${stats.absent}
            </div>
            <div class="stat-box late">
              <strong>Late:</strong> ${stats.late}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Admission Number</th>
                <th>Student Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map((student, index) => {
                const status = attendance[student.id] || 'PRESENT'
                const statusClass = status.toLowerCase()
                return `
                  <tr class="${statusClass}">
                    <td>${index + 1}</td>
                    <td>${student.admissionNumber}</td>
                    <td>${student.firstName} ${student.lastName}</td>
                    <td><strong>${status}</strong></td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  // Download as CSV
  const handleDownloadCSV = () => {
    if (!data) return
    
    const filteredStudents = getFilteredAndSortedStudents()
    const csvRows = [
      ['#', 'Admission Number', 'First Name', 'Last Name', 'Status'],
      ...filteredStudents.map((student, index) => [
        index + 1,
        student.admissionNumber,
        student.firstName,
        student.lastName,
        attendance[student.id] || 'PRESENT'
      ])
    ]
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${data.className}_${new Date(data.date).toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const filteredStudents = getFilteredAndSortedStudents()

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
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
        </div>
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
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
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Attendance
          </Link>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            {data.className}
            {data.streamName && (
              <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)] font-normal">
                {' '}({data.streamName})
              </span>
            )}
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            {today}
          </p>
        </div>
      </div>

      {/* Lock State Warning - Requirements: 4.3, 4.4, 4.5 */}
      {isLocked && (
        <div className="bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-[var(--chart-yellow)] dark:text-[var(--warning)] mt-0.5" />
            <div>
              <p className="font-medium text-[var(--warning-dark)] dark:text-[var(--warning)]">
                Attendance Locked
              </p>
              <p className="text-sm text-[var(--warning-dark)] dark:text-[var(--warning)] mt-1">
                {data.lockState.message || `Attendance cutoff time (${data.lockState.cutoffTime}) has passed. Contact administration for approval to make changes.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle2 className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && data && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats Summary - Mobile Optimized with Progress Indicator */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border-2 border-[var(--border-default)] dark:border-[var(--border-strong)] p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">{stats.total}</div>
            <div className="text-xs sm:text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">Total</div>
          </div>
          <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 rounded-lg border-2 border-[var(--chart-green)] dark:border-[var(--success-dark)] p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-[var(--chart-green)] dark:text-[var(--success)]">{stats.present}</div>
            <div className="text-xs sm:text-sm text-[var(--chart-green)] dark:text-[var(--success)] mt-1 font-medium">Present</div>
          </div>
          <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 rounded-lg border-2 border-[var(--chart-red)] dark:border-[var(--danger-dark)] p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-[var(--chart-red)] dark:text-[var(--danger)]">{stats.absent}</div>
            <div className="text-xs sm:text-sm text-[var(--chart-red)] dark:text-[var(--danger)] mt-1 font-medium">Absent</div>
          </div>
          <div className="bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 rounded-lg border-2 border-[var(--chart-yellow)] dark:border-amber-800 p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-[var(--warning-dark)] dark:text-[var(--warning)]">{stats.late}</div>
            <div className="text-xs sm:text-sm text-[var(--chart-yellow)] dark:text-[var(--warning)] mt-1 font-medium">Late</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div className="h-full flex">
            <div 
              className="bg-[var(--chart-green)] transition-all duration-300"
              style={{ width: `${(stats.present / stats.total) * 100}%` }}
            />
            <div 
              className="bg-[var(--chart-red)] transition-all duration-300"
              style={{ width: `${(stats.absent / stats.total) * 100}%` }}
            />
            <div 
              className="bg-[var(--chart-yellow)] transition-all duration-300"
              style={{ width: `${(stats.late / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll('PRESENT')}
            className="flex-1 sm:flex-none text-[var(--chart-green)] dark:text-[var(--success)] border-[var(--success)] dark:border-[var(--chart-green)] hover:bg-[var(--success-light)] dark:hover:bg-[var(--success-dark)]/30"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark All Present
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAll('ABSENT')}
            className="flex-1 sm:flex-none text-[var(--chart-red)] dark:text-[var(--danger)] border-[var(--danger)] dark:border-[var(--chart-red)] hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/30"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Mark All Absent
          </Button>
        </div>
      )}

      {/* Search, Filter, Sort, and Actions Bar */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-white dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter and Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {filterStatus !== 'ALL' && (
              <span className="ml-1 px-1.5 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full">1</span>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortBy(sortBy === 'name' ? 'number' : 'name')}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            Sort: {sortBy === 'name' ? 'Name' : 'Number'}
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Filter by Status</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'ALL'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-white dark:bg-[var(--text-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                All ({data?.students.length || 0})
              </button>
              <button
                onClick={() => setFilterStatus('PRESENT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'PRESENT'
                    ? 'bg-[var(--chart-green)] text-white'
                    : 'bg-white dark:bg-[var(--text-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--success-light)]'
                }`}
              >
                Present ({stats.present})
              </button>
              <button
                onClick={() => setFilterStatus('ABSENT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'ABSENT'
                    ? 'bg-[var(--chart-red)] text-white'
                    : 'bg-white dark:bg-[var(--text-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--danger-light)]'
                }`}
              >
                Absent ({stats.absent})
              </button>
              <button
                onClick={() => setFilterStatus('LATE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'LATE'
                    ? 'bg-[var(--chart-yellow)] text-white'
                    : 'bg-white dark:bg-[var(--text-primary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--warning-light)]'
                }`}
              >
                Late ({stats.late})
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {(searchQuery || filterStatus !== 'ALL') && (
          <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            Showing {filteredStudents.length} of {data?.students.length || 0} students
            {searchQuery && ` matching "${searchQuery}"`}
            {filterStatus !== 'ALL' && ` with status: ${filterStatus}`}
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredStudents.map((student, index) => (
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
        ) : (
          <div className="p-12 text-center">
            <Search className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              No students found
            </h3>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              {searchQuery 
                ? `No students match "${searchQuery}"`
                : filterStatus !== 'ALL'
                  ? `No students with status: ${filterStatus}`
                  : 'No students in this class'}
            </p>
            {(searchQuery || filterStatus !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterStatus('ALL')
                }}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Save Button - Mobile Optimized with Fixed Position */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border-t border-[var(--border-default)] dark:border-[var(--border-strong)] -mx-4 sm:-mx-6 mt-6">
        <Button
          onClick={handleSave}
          disabled={saving || isLocked}
          size="lg"
          className="w-full shadow-lg"
        >
          {saving ? (
            <>
              <Clock className="h-5 w-5 mr-2 animate-spin" />
              Saving Attendance...
            </>
          ) : isLocked ? (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Attendance Locked
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Attendance ({stats.total} students)
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
  // Determine row background color based on status
  const getRowBackgroundClass = () => {
    switch (status) {
      case 'PRESENT':
        return 'bg-[var(--success-light)]/30 dark:bg-[var(--success-dark)]/20 border-l-4 border-l-[var(--chart-green)]'
      case 'ABSENT':
        return 'bg-[var(--danger-light)]/30 dark:bg-[var(--danger-dark)]/20 border-l-4 border-l-[var(--chart-red)]'
      case 'LATE':
        return 'bg-[var(--warning-light)]/30 dark:bg-[var(--warning-dark)]/20 border-l-4 border-l-[var(--chart-yellow)]'
      default:
        return 'bg-transparent'
    }
  }

  return (
    <div className={`p-3 sm:p-4 transition-all duration-200 ${getRowBackgroundClass()} hover:opacity-90`}>
      {/* Mobile Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Student Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] w-6 flex-shrink-0 font-medium">{index}.</span>
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-800">
            {student.photo ? (
              <img 
                src={student.photo} 
                alt={`${student.firstName} ${student.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-[var(--text-muted)] dark:text-[var(--text-muted)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] truncate">
              {student.firstName} {student.lastName}
            </div>
            <div className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              {student.admissionNumber}
            </div>
          </div>
        </div>

        {/* Status Buttons - Mobile Optimized */}
        <div className="flex gap-2 sm:gap-1.5">
          <button
            type="button"
            onClick={() => onStatusChange('PRESENT')}
            disabled={isLocked}
            className={`flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-medium rounded-lg sm:rounded-md transition-all ${
              status === 'PRESENT'
                ? 'bg-[var(--chart-green)] text-white shadow-md scale-105 ring-2 ring-[var(--chart-green)]/50'
                : 'bg-white dark:bg-[var(--border-strong)] text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:bg-[var(--success-light)] dark:hover:bg-[var(--success-dark)]/30 active:scale-95'
            } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ✓ Present
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('ABSENT')}
            disabled={isLocked}
            className={`flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-medium rounded-lg sm:rounded-md transition-all ${
              status === 'ABSENT'
                ? 'bg-[var(--chart-red)] text-white shadow-md scale-105 ring-2 ring-[var(--chart-red)]/50'
                : 'bg-white dark:bg-[var(--border-strong)] text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/30 active:scale-95'
            } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ✗ Absent
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('LATE')}
            disabled={isLocked}
            className={`flex-1 sm:flex-none px-4 sm:px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-medium rounded-lg sm:rounded-md transition-all ${
              status === 'LATE'
                ? 'bg-[var(--chart-yellow)] text-white shadow-md scale-105 ring-2 ring-[var(--chart-yellow)]/50'
                : 'bg-white dark:bg-[var(--border-strong)] text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:bg-[var(--warning-light)] dark:hover:bg-[var(--warning-dark)]/30 active:scale-95'
            } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ⏰ Late
          </button>
        </div>
      </div>
    </div>
  )
}
