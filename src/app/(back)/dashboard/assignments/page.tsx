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
  Download,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Database
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

/**
 * ASSIGNMENTS PAGE - ADMIN DASHBOARD
 * 
 * Modern, responsive table-based interface for managing teaching assignments
 * Designed for administrators with clear data visualization and easy management
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
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'teacher' | 'class'>('table')
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive' | 'assigned' | 'unassigned' | 'conflict'>('all')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
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
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData?.error || errorData?.message || `Failed to load assignments (Status: ${response.status})`
        throw new Error(errorMessage)
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
      console.log('📖 Subjects API response status:', subjectsResponse.status)
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        console.log('📖 Subjects API response data:', subjectsData)
        
        // The API returns an array directly, not wrapped in an object
        if (Array.isArray(subjectsData)) {
          console.log('✅ Setting subjects:', subjectsData.length)
          setSubjects(subjectsData.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code
          })))
        } else if (subjectsData.subjects && Array.isArray(subjectsData.subjects)) {
          // Fallback for wrapped response
          console.log('✅ Setting subjects (wrapped):', subjectsData.subjects.length)
          setSubjects(subjectsData.subjects.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code
          })))
        } else {
          console.warn('⚠️ Unexpected subjects response format:', subjectsData)
        }
      } else {
        console.error('❌ Failed to fetch subjects:', subjectsResponse.status)
      }

      // Load class-subject relationships
      const classSubjectsResponse = await fetch('/api/classes/subjects')
      if (classSubjectsResponse.ok) {
        const classSubjectsData = await classSubjectsResponse.json()
        console.log('📊 Class-Subject Relationships Response:', classSubjectsData)
        if (classSubjectsData.relationships && Array.isArray(classSubjectsData.relationships)) {
          console.log('✅ Setting classSubjects:', classSubjectsData.relationships)
          setClassSubjects(classSubjectsData.relationships)
        } else {
          console.warn('⚠️ No relationships array found in response')
        }
      } else {
        console.error('❌ Failed to fetch class-subjects:', classSubjectsResponse.status)
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
      setIsCreating(true)
      setError(null)

      console.log('📤 Creating assignment with data:', newAssignment)

      const response = await fetch('/api/staff/assignments/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAssignment)
      })

      console.log('📥 Response status:', response.status)

      const result = await response.json()
      console.log('📥 Response data:', result)

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create assignment')
      }

      // Show success toast
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
        variant: 'success',
        duration: 3000
      })

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
      console.error('❌ Error creating assignment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assignment'
      setError(errorMessage)
      
      // Show error toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return
    }

    try {
      setIsDeleting(assignmentId)
      setError(null)

      const response = await fetch(`/api/staff/assignments/manage?id=${assignmentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete assignment')
      }

      // Show success toast
      toast({
        title: 'Success',
        description: 'Assignment removed successfully',
        variant: 'success',
        duration: 3000
      })

      // Reload assignments
      await loadAssignments()

    } catch (err) {
      console.error('Error deleting assignment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete assignment'
      setError(errorMessage)
      
      // Show error toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsDeleting(null)
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

  // Sort function
  const sortedAssignments = React.useMemo(() => {
    if (!sortConfig) return flattenedAssignments
    
    return [...flattenedAssignments].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      
      // Convert to strings for comparison to avoid type issues
      const aStr = String(aValue)
      const bStr = String(bValue)
      
      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [flattenedAssignments, sortConfig])

  // Filter data based on search term and selected filter
  const filteredTableAssignments = sortedAssignments.filter(item => {
    const matchesSearch = 
      item.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.primaryTeacher?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.primaryTeacher?.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()))

    let matchesFilter = true
    switch (selectedFilter) {
      case 'active':
        matchesFilter = item.isActive
        break
      case 'inactive':
        matchesFilter = !item.isActive
        break
      case 'assigned':
        matchesFilter = !!item.primaryTeacher
        break
      case 'unassigned':
        matchesFilter = !item.primaryTeacher
        break
      case 'conflict':
        matchesFilter = item.hasConflict
        break
      default:
        matchesFilter = true
    }

    return matchesSearch && matchesFilter
  })

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

  // Debug logging
  if (newAssignment.classId) {
    console.log('🔍 Filtering subjects for class:', newAssignment.classId)
    console.log('📚 All subjects:', subjects.length)
    console.log('🔗 All classSubjects:', classSubjects.length)
    console.log('🔗 ClassSubjects for this class:', classSubjects.filter(cs => cs.classId === newAssignment.classId))
    console.log('✅ Available subjects:', availableSubjects.length, availableSubjects)
  }

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getClassNames = (item: any) => {
    let classes = 'px-6 py-4 whitespace-nowrap text-sm'
    if (item.hasConflict) classes += ' bg-red-50'
    return classes
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Teaching Assignments
              </h1>
              <p className="mt-1 text-gray-600">Admin dashboard for managing teaching responsibilities</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowNewAssignmentModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6">
            <AlertBanner
              type="error"
              title="Error"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Teachers</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalTeachers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Classes</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Subjects</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalSubjects}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Assigned</p>
                <p className="text-xl font-bold text-gray-900">{stats.assignedSubjects}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-xl font-bold text-gray-900">{stats.unassignedSubjects}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Conflicts</p>
                <p className="text-xl font-bold text-gray-900">{stats.conflictCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-64"
                />
              </div>
              
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Assignments</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="assigned">Assigned Only</option>
                <option value="unassigned">Unassigned Only</option>
                <option value="conflict">With Conflicts</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
                size="sm"
                className={viewMode === 'table' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Table View
              </Button>
              <Button
                variant={viewMode === 'teacher' ? 'default' : 'outline'}
                onClick={() => setViewMode('teacher')}
                size="sm"
                className={viewMode === 'teacher' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <User className="w-4 h-4 mr-2" />
                By Teacher
              </Button>
              <Button
                variant={viewMode === 'class' ? 'default' : 'outline'}
                onClick={() => setViewMode('class')}
                size="sm"
                className={viewMode === 'class' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <Building2 className="w-4 h-4 mr-2" />
                By Class
              </Button>
            </div>
          </div>
        </div>

        {/* Table View - Main Admin Interface */}
        {viewMode === 'table' && (
          <Card className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('className')}
                    >
                      <div className="flex items-center gap-1">
                        Class
                        {sortConfig?.key === 'className' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('subjectName')}
                    >
                      <div className="flex items-center gap-1">
                        Subject
                        {sortConfig?.key === 'subjectName' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Primary Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Co-Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTableAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Database className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-1">No assignments found</h3>
                          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTableAssignments.map((item, index) => (
                      <tr 
                        key={`${item.classId}-${item.subjectId}`} 
                        className={`${item.hasConflict ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className={getClassNames(item)}>
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.className}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Level {item.level}
                            </div>
                          </div>
                        </td>
                        <td className={getClassNames(item)}>
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.subjectName}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {item.subjectCode}
                            </div>
                          </div>
                        </td>
                        <td className={getClassNames(item)}>
                          {item.primaryTeacher ? (
                            <div className="flex items-center gap-2">
                              <div className="bg-green-100 p-1 rounded-full">
                                <UserCheck className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {item.primaryTeacher.name}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {item.primaryTeacher.employeeNumber}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="destructive">Unassigned</Badge>
                          )}
                        </td>
                        <td className={getClassNames(item)}>
                          {item.coTeacher ? (
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-100 p-1 rounded-full">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {item.coTeacher.name}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {item.coTeacher.employeeNumber}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-sm">None</span>
                          )}
                        </td>
                        <td className={getClassNames(item)}>
                          <div className="flex flex-col gap-1">
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
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" title="View details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Edit assignment">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            {item.primaryTeacher && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                title="Remove assignment"
                                onClick={() => handleDeleteAssignment(`${item.primaryTeacher?.id}-${item.classId}-${item.subjectId}`)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
          <div className="space-y-6">
            {filteredTeacherAssignments.length === 0 ? (
              <Card className="p-12 text-center bg-white border border-gray-200 rounded-lg">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Teachers Found</h3>
                <p className="text-gray-500">No teachers match your search criteria.</p>
              </Card>
            ) : (
              filteredTeacherAssignments.map((teacher) => (
                <Card key={teacher.teacherId} className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{teacher.teacherName}</h3>
                        <p className="text-gray-600">Employee: {teacher.employeeNumber}</p>
                      </div>
                    </div>
                    <Badge variant={teacher.assignments.length > 0 ? 'success' : 'secondary'} className="text-lg px-3 py-1">
                      {teacher.assignments.length} Assignment{teacher.assignments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {teacher.assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No assignments yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teacher.assignments.map((assignment) => (
                        <div key={assignment.classId} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{assignment.className}</h4>
                            <Badge variant="outline">
                              {assignment.subjects.length} Subject{assignment.subjects.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {assignment.subjects.map((subject) => (
                              <div
                                key={subject.subjectId}
                                className="flex items-center justify-between p-2 bg-white rounded border hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-center">
                                  <GraduationCap className="w-4 h-4 text-purple-600 mr-2" />
                                  <span className="text-sm font-medium text-gray-900">{subject.subjectName}</span>
                                  {subject.isPrimary && (
                                    <Badge variant="success" className="ml-2 text-xs">Primary</Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(`${teacher.teacherId}-${assignment.classId}-${subject.subjectId}`)}
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50"
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
          <div className="space-y-6">
            {filteredClassAssignments.length === 0 ? (
              <Card className="p-12 text-center bg-white border border-gray-200 rounded-lg">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Classes Found</h3>
                <p className="text-gray-500">No classes match your search criteria.</p>
              </Card>
            ) : (
              filteredClassAssignments.map((classData) => (
                <Card key={classData.classId} className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-full mr-4">
                        <Building2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{classData.className}</h3>
                        <p className="text-gray-600">Level {classData.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {classData.subjects.length} Subject{classData.subjects.length !== 1 ? 's' : ''}
                      </Badge>
                      {classData.subjects.some(s => s.hasConflict) && (
                        <Badge variant="destructive">Conflicts</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classData.subjects.map((subject) => (
                      <div
                        key={subject.subjectId}
                        className={`p-4 rounded-lg border transition-all ${
                          subject.hasConflict ? 'border-red-200 bg-red-50 hover:bg-red-100' : 
                          subject.primaryTeacher ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <GraduationCap className="w-5 h-5 text-purple-600 mr-2" />
                            <div>
                              <h4 className="font-medium text-gray-900">{subject.subjectName}</h4>
                              <p className="text-sm text-gray-600">{subject.subjectCode}</p>
                            </div>
                          </div>
                          {subject.hasConflict && (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>

                        <div className="space-y-2">
                          {subject.primaryTeacher ? (
                            <div className="bg-white p-3 rounded border">
                              <div className="flex items-center gap-2 mb-1">
                                <UserCheck className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  {subject.primaryTeacher.name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {subject.primaryTeacher.employeeNumber}
                              </p>
                              <Badge variant="success" className="mt-2">Primary</Badge>
                            </div>
                          ) : (
                            <div className="bg-white p-3 rounded border border-dashed text-center">
                              <p className="text-sm text-gray-500">Unassigned</p>
                            </div>
                          )}

                          {subject.coTeacher && (
                            <div className="bg-white p-3 rounded border">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  {subject.coTeacher.name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {subject.coTeacher.employeeNumber}
                              </p>
                              <Badge variant="outline" className="mt-2">Co-Teacher</Badge>
                            </div>
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">New Assignment</h2>
                <button
                  onClick={() => setShowNewAssignmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <select
                    value={newAssignment.teacherId}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={newAssignment.classId}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, classId: e.target.value, subjectId: '' }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={newAssignment.subjectId}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, subjectId: e.target.value }))}
                    disabled={!newAssignment.classId}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm font-medium text-gray-700">
                    Primary Teacher
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowNewAssignmentModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={!newAssignment.teacherId || !newAssignment.classId || !newAssignment.subjectId || isCreating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Assignment'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}