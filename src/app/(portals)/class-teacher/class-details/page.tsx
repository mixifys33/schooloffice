'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Users,
  ClipboardList,
  BookOpen,
  BarChart3,
  FileText,
  MessageSquare,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  FolderOpen,
  Eye,
  Edit3,
  Plus,
  Shield,
  X,
  Save,
  Download,
  Printer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  errorMessages,
  spacing,
  typography,
  cardStyles,
  teacherColors,
  transitions
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

/**
 * Class Details Page for Class Teacher Portal
 * Requirements: Class management features for class teachers
 * - Detailed class information
 * - Student roster management
 * - Class performance tracking
 * - Curriculum coverage tracking
 * - Class-specific tasks and responsibilities
 */

interface ClassDetailsData {
  class: {
    id: string
    name: string
    streamName: string | null
    teacherName: string
    studentCount: number
    averageAttendance: number
    averagePerformance: number
    caContribution: number
    examContribution: number
    isClassTeacher: boolean
  }
  availableClasses?: Array<{
    id: string
    streamId: string | null
    name: string
    streamName: string | null
    displayName: string
  }>
  students: Array<{
    id: string
    name: string
    admissionNumber: string
    gender: string | null
    age: number | null
    parentPhone: string | null
    parentEmail: string | null
    status: string
    attendanceRate: number
    performance: number
    caScore: number | null
    examScore: number | null
    finalScore: number | null
    lastAttendanceDate: string | null
    lastMarkEntryDate: string | null
  }>
  curriculumTopics: Array<{
    id: string
    name: string
    subject: string
    status: 'not-started' | 'in-progress' | 'completed'
    completionDate: string | null
  }>
  classTasks: Array<{
    id: string
    title: string
    description: string
    dueDate: string
    status: 'pending' | 'completed' | 'overdue'
    assignedBy: string
  }>
  classAnnouncements: Array<{
    id: string
    title: string
    content: string
    date: string
    author: string
  }>
}

export default function ClassTeacherClassDetailsPage() {
  const [data, setData] = useState<ClassDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  
  // Modal states
  const [viewStudentId, setViewStudentId] = useState<string | null>(null)
  const [editStudentId, setEditStudentId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchClassDetails() {
      try {
        const url = selectedClassId 
          ? `/api/class-teacher/class-details?classId=${selectedClassId}`
          : '/api/class-teacher/class-details'
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch class details')
        }
        const classData = await response.json()
        setData(classData)
      } catch (err) {
        setError('Unable to load class details')
        console.error('Error fetching class details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchClassDetails()
  }, [selectedClassId])

  // Handle class selection change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setLoading(true)
  }

  // Get student by ID
  const getStudent = (id: string) => {
    return data?.students.find(s => s.id === id)
  }

  // Handle view student
  const handleViewStudent = (studentId: string) => {
    setViewStudentId(studentId)
  }

  // Handle edit student
  const handleEditStudent = (studentId: string) => {
    const student = getStudent(studentId)
    if (student) {
      // Split name into firstName and lastName for editing
      const nameParts = student.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setEditFormData({
        id: student.id,
        name: student.name,
        firstName,
        lastName,
        admissionNumber: student.admissionNumber,
        gender: student.gender || '',
        age: student.age || '',
        parentPhone: student.parentPhone || '',
        parentEmail: student.parentEmail || '',
      })
      setEditStudentId(studentId)
    }
  }

  // Handle save student
  const handleSaveStudent = async () => {
    if (!editFormData) return

    setSaving(true)
    try {
      console.log('📤 Sending update request:', editFormData)
      
      const response = await fetch(`/api/class-teacher/students/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Error response:', errorData)
        throw new Error(errorData.error || `Failed to update student (${response.status})`)
      }

      const result = await response.json()
      console.log('✅ Update successful:', result)

      // Close the dialog first
      setEditStudentId(null)
      setEditFormData(null)

      // Refresh the entire data from server to ensure consistency
      const refreshResponse = await fetch('/api/class-teacher/class-details')
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        setData(refreshedData)
        console.log('✅ Data refreshed from server')
      }

    } catch (err) {
      console.error('❌ Error updating student:', err)
      alert(err instanceof Error ? err.message : 'Failed to update student. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle download student roster as CSV
  const handleDownloadRoster = () => {
    if (!data) return

    // Create CSV content with proper formatting
    const headers = ['NAME', 'CA (20%)', 'EXAM (80%)', 'FINAL', 'ACTIONS']
    const csvRows = [headers.join(',')]

    data.students.forEach(student => {
      const caScore = student.caScore !== null ? `${student.caScore}/20` : '0/20'
      const examScore = student.examScore !== null ? `${student.examScore}/80` : '0/80'
      const finalScore = student.finalScore !== null ? `${student.finalScore}/100` : '0/100'
      
      const row = [
        `"${student.name}"`,
        caScore,
        examScore,
        finalScore,
        'View/Edit'
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${data.class.name}_student_roster_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle print student roster
  const handlePrintRoster = () => {
    if (!data) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.class.name} - Student Roster</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 30px;
              color: #1a1a1a;
              background: #fff;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .header h1 {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 8px;
              color: #111827;
            }
            
            .header-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              font-size: 14px;
              color: #6b7280;
              margin-top: 12px;
            }
            
            .header-info-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .header-info-item strong {
              color: #374151;
            }
            
            .table-container {
              margin-top: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
            }
            
            thead {
              background: #f9fafb;
            }
            
            th {
              padding: 12px 16px;
              text-align: left;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              color: #6b7280;
              border-bottom: 1px solid #e5e7eb;
              letter-spacing: 0.05em;
            }
            
            tbody tr {
              border-bottom: 1px solid #f3f4f6;
            }
            
            tbody tr:last-child {
              border-bottom: none;
            }
            
            tbody tr:hover {
              background: #f9fafb;
            }
            
            td {
              padding: 14px 16px;
              font-size: 14px;
              color: #374151;
            }
            
            td:first-child {
              font-weight: 500;
              color: #111827;
            }
            
            .score-cell {
              font-family: 'Courier New', monospace;
              font-weight: 500;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            }
            
            .print-date {
              margin-top: 8px;
              font-size: 11px;
            }
            
            @media print {
              body {
                padding: 20px;
              }
              
              .header {
                margin-bottom: 20px;
                padding-bottom: 15px;
              }
              
              tbody tr:hover {
                background: transparent;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.class.name} - Student Roster</h1>
            <div class="header-info">
              <div class="header-info-item">
                <strong>Class Teacher:</strong> ${data.class.teacherName}
              </div>
              <div class="header-info-item">
                <strong>Total Students:</strong> ${data.class.studentCount}
              </div>
              <div class="header-info-item">
                <strong>Average Performance:</strong> ${data.class.averagePerformance}%
              </div>
            </div>
          </div>
          
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>CA (20%)</th>
                  <th>EXAM (80%)</th>
                  <th>FINAL</th>
                </tr>
              </thead>
              <tbody>
                ${data.students.map((student) => {
                  const caScore = student.caScore !== null ? student.caScore : 0
                  const examScore = student.examScore !== null ? student.examScore : 0
                  const finalScore = student.finalScore !== null ? student.finalScore : 0
                  
                  return `
                    <tr>
                      <td>${student.name}</td>
                      <td class="score-cell">${caScore}/20</td>
                      <td class="score-cell">${examScore}/80</td>
                      <td class="score-cell">${finalScore}/100</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <div>SchoolOffice.academy - Class Teacher Portal</div>
            <div class="print-date">Generated: ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={errorMessages.networkError}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  const { class: classData, students, curriculumTopics, classTasks, classAnnouncements } = data

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={cn('p-2 sm:p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Shield className={cn('h-5 w-5 sm:h-6 sm:w-6', teacherColors.info.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] truncate">
              {classData.name} {classData.streamName && `(${classData.streamName})`} - Class Details
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-0.5 sm:mt-1">
              Manage your class as a class teacher
            </p>
          </div>
          
          {/* Class Selector - Show if multiple classes available */}
          {data.availableClasses && data.availableClasses.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="class-selector" className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap">
                Switch Class:
              </label>
              <select
                id="class-selector"
                value={selectedClassId || classData.id}
                onChange={(e) => handleClassChange(e.target.value)}
                className="px-3 py-2 border border-[var(--border-primary)] dark:border-[var(--border-dark)] rounded-lg bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {data.availableClasses.map((cls) => (
                  <option key={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id} value={cls.id}>
                    {cls.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Students</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.studentCount}
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.info.bg)}>
                <Users className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Attendance</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.averageAttendance}%
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.success.bg)}>
                <ClipboardList className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Performance</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.averagePerformance}%
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.info.bg)}>
                <TrendingUp className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Class Teacher</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                  {classData.isClassTeacher ? 'Yes' : 'No'}
                </p>
              </div>
              <div className={cn('p-1.5 sm:p-2 rounded-lg', teacherColors.warning.bg)}>
                <Shield className={cn('h-4 w-4 sm:h-5 sm:w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Student Roster */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Student Roster</CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  onClick={handleDownloadRoster}
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Download</span>
                  <span className="xs:hidden">CSV</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  onClick={handlePrintRoster}
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Print</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {students.map((student) => (
                  <div 
                    key={student.id} 
                    className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-base">
                          {student.name}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditStudent(student.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">CA</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.caScore !== null ? `${student.caScore}/20` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Exam</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.examScore !== null ? `${student.examScore}/80` : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Final</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {student.finalScore !== null ? `${student.finalScore}/100` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={cn(teacherColors.secondary.bg)}>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">CA (20%)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Exam (80%)</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Final</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            {student.caScore !== null ? `${student.caScore}/20` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            {student.examScore !== null ? `${student.examScore}/80` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                            {student.finalScore !== null ? `${student.finalScore}/100` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewStudent(student.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditStudent(student.id)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class Management Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Curriculum Coverage */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Curriculum</CardTitle>
              <Badge variant="outline" className="text-sm">{curriculumTopics.length} topics</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {curriculumTopics.slice(0, 4).map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] truncate">
                        {topic.name}
                      </h3>
                      <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                        {topic.subject}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant={
                          topic.status === 'completed' ? 'default' : 
                          topic.status === 'in-progress' ? 'secondary' : 'outline'
                        }
                        className="text-xs sm:text-sm whitespace-nowrap"
                      >
                        {topic.status.replace('-', ' ')}
                      </Badge>
                      {topic.completionDate && (
                        <span className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(topic.completionDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Topics
              </Button>
            </CardContent>
          </Card>

          {/* Class Tasks */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Class Tasks</CardTitle>
              <Badge variant="outline" className="text-sm">{classTasks.length} tasks</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {classTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {task.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
                          {task.description.substring(0, 50)}...
                        </p>
                      </div>
                      <Badge 
                        variant={
                          task.status === 'completed' ? 'default' : 
                          task.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                        className="text-xs sm:text-sm whitespace-nowrap"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        Due: {new Date(task.dueDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        By: {task.assignedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-semibold">Announcements</CardTitle>
              <Badge variant="outline" className="text-sm">{classAnnouncements.length} announcements</Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {classAnnouncements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          {announcement.title}
                        </h3>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
                          {announcement.content.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm sm:text-base">
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        {new Date(announcement.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        By: {announcement.author}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 h-10 text-sm sm:text-base">
                View All Announcements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Student Dialog */}
      <Dialog open={viewStudentId !== null} onOpenChange={() => setViewStudentId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Student Details</DialogTitle>
            <DialogDescription>View complete student information</DialogDescription>
          </DialogHeader>
          {viewStudentId && getStudent(viewStudentId) && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--white-pure)]">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Name</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Admission Number</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.admissionNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Gender</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.gender || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Age</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.age || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Status</Label>
                    <Badge variant="outline" className="mt-1">
                      {getStudent(viewStudentId)!.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Contact */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--white-pure)]">Parent/Guardian Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Phone</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.parentPhone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Email</Label>
                    <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.parentEmail || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Performance */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--white-pure)]">Academic Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg">
                    <Label className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">CA Score</Label>
                    <p className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.caScore !== null ? `${getStudent(viewStudentId)!.caScore}/20` : '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg">
                    <Label className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Exam Score</Label>
                    <p className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.examScore !== null ? `${getStudent(viewStudentId)!.examScore}/80` : '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg">
                    <Label className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Final Score</Label>
                    <p className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.finalScore !== null ? `${getStudent(viewStudentId)!.finalScore}/100` : '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]/50 rounded-lg">
                    <Label className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Attendance</Label>
                    <p className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-1">
                      {getStudent(viewStudentId)!.attendanceRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewStudentId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editStudentId !== null} onOpenChange={() => { setEditStudentId(null); setEditFormData(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Student</DialogTitle>
            <DialogDescription>Update student information</DialogDescription>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editFormData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      const nameParts = newName.trim().split(' ')
                      const firstName = nameParts[0] || ''
                      const lastName = nameParts.slice(1).join(' ') || ''
                      setEditFormData({ 
                        ...editFormData, 
                        name: newName,
                        firstName,
                        lastName
                      })
                    }}
                    placeholder="Student name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="admissionNumber">Admission Number *</Label>
                  <Input
                    id="admissionNumber"
                    value={editFormData.admissionNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, admissionNumber: e.target.value })}
                    placeholder="Admission number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-default)] dark:bg-[var(--bg-surface)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    placeholder="Age"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="parentPhone">Parent Phone</Label>
                  <Input
                    id="parentPhone"
                    value={editFormData.parentPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                    placeholder="Parent phone number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={editFormData.parentEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, parentEmail: e.target.value })}
                    placeholder="Parent email"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setEditStudentId(null); setEditFormData(null); }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveStudent}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}