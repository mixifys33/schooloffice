'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  Edit3,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  UserCheck,
  GraduationCap,
  Filter,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'

/**
 * ASSIGNMENTS PAGE - ADMIN DASHBOARD
 * 
 * Modern, responsive table-based interface for managing teaching assignments
 * Core Principle: OWNERSHIP - Admin owns staffing, DoS owns academics
 */

interface TeacherAssignment {
  teacherId: string
  teacherName: string
  employeeNumber: string
  assignments: {
    classId: string
    className: string
    subjects: {
      subjectId: string
      subjectName: string
      subjectCode: string
      isPrimary: boolean
      isActive: boolean
    }[]
  }[]
}

interface ClassAssignment {
  classId: string
  className: string
  level: number
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    primaryTeacher: {
      id: string
      name: string
      employeeNumber: string
    } | null
    coTeacher?: {
      id: string
      name: string
      employeeNumber: string
    }
    isActive: boolean
    hasConflict: boolean
  }[]
}

interface AssignmentStats {
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  assignedSubjects: number
  unassignedSubjects: number
  conflictCount: number
}

interface NewAssignmentData {
  teacherId: string
  classId: string
  subjectId: string
  isPrimary: boolean
}

export default function AssignmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'teacher' | 'class'>('table')
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false)
  
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([])
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([])
  const [stats, setStats] = useState<AssignmentStats>({
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    assignedSubjects: 0,
    unassignedSubjects: 0,
    conflictCount: 0
  })

  // Data for dropdowns
  const [teachers, setTeachers] = useState<Array<{id: string, name: string, employeeNumber: string}>>([])
  const [classes, setClasses] = useState<Array<{id: string, name: string, level: number}>>([])
  const [subjects, setSubjects] = useState<Array<{id: string, name: string, code: string}>>([])
  const [classSubjects, setClassSubjects] = useState<Array<{classId: string, subjectId: string}>>([])

  const [newAssignment, setNewAssignment] = useState<NewAssignmentData>({
    teacherId: '',
    classId: '',
    subjectId: '',
    isPrimary: true
  })

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff/assignments/truth-table')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to load assignments')
      }

      const data = await response.json()
      setTeacherAssignments(data.teacherAssignments)
      setClassAssignments(data.classAssignments)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading assignments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDropdownData = useCallback(async () => {
    try {
      // Load teachers
      const teachersResponse = await fetch('/api/teachers?status=ACTIVE')
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json()
        // The API returns an array directly, not wrapped in a teachers property
        if (Array.isArray(teachersData)) {
          setTeachers(teachersData.map((t: any) => ({
            id: t.id,
            name: `${t.firstName} ${t.lastName}`,
            employeeNumber: t.employeeNumber || t.nationalId
          })))
        }
      }

      // Load classes
      const classesResponse = await fetch('/api/classes?active=true')
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        if (classesData.classes && Array.isArray(classesData.classes)) {
          setClasses(classesData.classes.map((c: any) => ({
            id: c.id,
            name: c.name,
            level: c.level
          })))
        }
      }

      // Load subjects
      const subjectsResponse = await fetch('/api/subjects?active=true')
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        if (subjectsData.subjects && Array.isArray(subjectsData.subjects)) {
          setSubjects(subjectsData.subjects.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code
          })))
        }
      }

      // Load class-subject relationships
      const classSubjectsResponse = await fetch('/api/classes/subjects')
      if (classSubjectsResponse.ok) {
        const classSubjectsData = await classSubjectsResponse.json()
        if (classSubjectsData.relationships && Array.isArray(classSubjectsData.relationships)) {
          setClassSubjects(classSubjectsData.relationships)
        }
      }

    } catch (err) {
      console.error('Error loading dropdown data:', err)
    }
  }, [])

  useEffect(() => {
    loadAssignments()
    loadDropdownData()
  }, [loadAssignments, loadDropdownData])

  const handleCreateAssignment = async () => {
    try {
      const response = await fetch('/api/staff/assignments/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssignment)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create assignment')
      }

      // Reset form and close modal
      setNewAssignment({
        teacherId: '',
        classId: '',
        subjectId: '',
        isPrimary: true
      })
      setShowNewAssignmentModal(false)

      // Reload assignments
      await loadAssignments()

    } catch (err) {
      console.error('Error creating assignment:', err)
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/assignments/manage?id=${assignmentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete assignment')
      }

      // Reload assignments
      await loadAssignments()

    } catch (err) {
      console.error('Error deleting assignment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete assignment')
    }
  }

  // Flatten data for table view
  const flattenedAssignments = classAssignments.flatMap(classData => 
    classData.subjects.map(subject => ({
      classId: classData.classId,
      className: classData.className,
      level: classData.level,
      subjectId: subject.subjectId,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      primaryTeacher: subject.primaryTeacher,
      coTeacher: subject.coTeacher,
      isActive: subject.isActive,
      hasConflict: subject.hasConflict
    }))
  )

  // Filter data based on search term
  const filteredTableAssignments = flattenedAssignments.filter(item => 
    item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.primaryTeacher?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.primaryTeacher?.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredTeacherAssignments = teacherAssignments.filter(teacher =>
    teacher.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClassAssignments = classAssignments.filter(classData =>
    classData.className.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableSubjects = subjects.filter(subject =>
    classSubjects.some(cs => cs.classId === newAssignment.classId && cs.subjectId === subject.id)
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <SkeletonLoader variant="card" count={8} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Teaching Assignments</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Admin dashboard for managing teaching responsibilities</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowNewAssignmentModal(true)}
            className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
          <Button
            variant="outline"
            onClick={loadAssignments}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <Users className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Teachers</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalTeachers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Classes</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalClasses}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-[var(--chart-purple)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Subjects</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Assigned</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.assignedSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Unassigned</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.unassignedSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-[var(--chart-yellow)]" />
            <div className="ml-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Conflicts</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.conflictCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <Input
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            size="sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Table View
          </Button>
          <Button
            variant={viewMode === 'teacher' ? 'default' : 'outline'}
            onClick={() => setViewMode('teacher')}
            size="sm"
          >
            <User className="w-4 h-4 mr-2" />
            By Teacher
          </Button>
          <Button
            variant={viewMode === 'class' ? 'default' : 'outline'}
            onClick={() => setViewMode('class')}
            size="sm"
          >
            <Building2 className="w-4 h-4 mr-2" />
            By Class
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <th className="py-3 px-4 text-left" style={{ color: 'var(--text-secondary)' }}>Class</th>
                  <th className="py-3 px-4 text-left" style={{ color: 'var(--text-secondary)' }}>Subject</th>
                  <th className="py-3 px-4 text-left" style={{ color: 'var(--text-secondary)' }}>Primary Teacher</th>
                  <th className="py-3 px-4 text-left" style={{ color: 'var(--text-secondary)' }}>Co-Teacher</th>
                  <th className="py-3 px-4 text-left" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="py-3 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTableAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      No assignments found
                    </td>
                  </tr>
                ) : (
                  filteredTableAssignments.map((item, index) => (
                    <tr 
                      key={`${item.classId}-${item.subjectId}`} 
                      className={`border-b ${item.hasConflict ? 'bg-[var(--danger-light)]' : ''}`}
                      style={{ borderColor: 'var(--border-default)' }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.className}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Level {item.level}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.subjectName}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {item.subjectCode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.primaryTeacher ? (
                          <div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {item.primaryTeacher.name}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {item.primaryTeacher.employeeNumber}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="destructive">Unassigned</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.coTeacher ? (
                          <div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {item.coTeacher.name}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {item.coTeacher.employeeNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm italic" style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.hasConflict ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Conflict
                          </Badge>
                        ) : item.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-[var(--chart-red)] hover:text-[var(--chart-red)]"
                            onClick={() => handleDeleteAssignment(`${item.primaryTeacher?.id}-${item.classId}-${item.subjectId}`)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Teacher-Centric View */}
      {viewMode === 'teacher' && (
        <div className="space-y-4">
          {filteredTeacherAssignments.length === 0 ? (
            <Card className="p-8 text-center" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Teachers Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No teachers match your search criteria.</p>
            </Card>
          ) : (
            filteredTeacherAssignments.map((teacher) => (
              <Card key={teacher.teacherId} className="p-6" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <UserCheck className="w-6 h-6 text-[var(--chart-blue)] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{teacher.teacherName}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Employee: {teacher.employeeNumber}</p>
                    </div>
                  </div>
                  <Badge variant={teacher.assignments.length > 0 ? 'success' : 'secondary'}>
                    {teacher.assignments.length} Assignment{teacher.assignments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {teacher.assignments.length === 0 ? (
                  <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No assignments yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teacher.assignments.map((assignment) => (
                      <div key={assignment.classId} className="border rounded-lg p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{assignment.className}</h4>
                          <Badge variant="outline">
                            {assignment.subjects.length} Subject{assignment.subjects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {assignment.subjects.map((subject) => (
                            <div
                              key={subject.subjectId}
                              className="flex items-center justify-between p-2 rounded border"
                              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
                            >
                              <div className="flex items-center">
                                <GraduationCap className="w-4 h-4 text-[var(--chart-purple)] mr-2" />
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{subject.subjectName}</span>
                                {subject.isPrimary && (
                                  <Badge variant="success" className="ml-2 text-xs">Primary</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAssignment(`${teacher.teacherId}-${assignment.classId}-${subject.subjectId}`)}
                                className="text-[var(--chart-red)] hover:text-[var(--chart-red)]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Class-Centric View */}
      {viewMode === 'class' && (
        <div className="space-y-4">
          {filteredClassAssignments.length === 0 ? (
            <Card className="p-8 text-center" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
              <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Classes Found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No classes match your search criteria.</p>
            </Card>
          ) : (
            filteredClassAssignments.map((classData) => (
              <Card key={classData.classId} className="p-6" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Building2 className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{classData.className}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Level {classData.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {classData.subjects.length} Subject{classData.subjects.length !== 1 ? 's' : ''}
                    </Badge>
                    {classData.subjects.some(s => s.hasConflict) && (
                      <Badge variant="destructive">Conflicts</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {classData.subjects.map((subject) => (
                    <div
                      key={subject.subjectId}
                      className={`flex items-center justify-between p-3 rounded border ${
                        subject.hasConflict ? 'border-[var(--danger-light)] bg-[var(--danger-light)]' : 
                        subject.primaryTeacher ? 'border-[var(--success-light)] bg-[var(--success-light)]' : 'border-[var(--warning-light)] bg-[var(--warning-light)]'
                      }`}
                    >
                      <div className="flex items-center">
                        <GraduationCap className="w-4 h-4 text-[var(--chart-purple)] mr-3" />
                        <div>
                          <span className="font-medium">{subject.subjectName}</span>
                          <span className="text-sm text-[var(--text-secondary)] ml-2">({subject.subjectCode})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {subject.primaryTeacher ? (
                          <div className="text-right">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {subject.primaryTeacher.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {subject.primaryTeacher.employeeNumber}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="destructive">Unassigned</Badge>
                        )}

                        {subject.hasConflict && (
                          <AlertCircle className="w-4 h-4 text-[var(--chart-red)]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New Assignment Modal */}
      {showNewAssignmentModal && (
        <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg p-6 w-full max-w-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Assignment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Teacher</label>
                <select
                  value={newAssignment.teacherId}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full p-2 border rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.employeeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Class</label>
                <select
                  value={newAssignment.classId}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, classId: e.target.value, subjectId: '' }))}
                  className="w-full p-2 border rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Select Class</option>
                  {classes.map(classData => (
                    <option key={classData.id} value={classData.id}>
                      {classData.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Subject</label>
                <select
                  value={newAssignment.subjectId}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, subjectId: e.target.value }))}
                  disabled={!newAssignment.classId}
                  className="w-full p-2 border rounded"
                  style={{ 
                    backgroundColor: 'var(--bg-surface)', 
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={newAssignment.isPrimary}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isPrimary" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Primary Teacher
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowNewAssignmentModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAssignment}
                disabled={!newAssignment.teacherId || !newAssignment.classId || !newAssignment.subjectId}
              >
                Create Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}