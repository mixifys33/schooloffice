'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  RefreshCw,
  Search,
  Filter,
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { StaffRole, ResponsibilityType } from '@/types/enums'

/**
 * Staff Assignments Page
 * Displays all staff assignments including class teachers, subject teachers, and responsibilities
 */

interface StaffAssignment {
  id: string
  staffId: string
  staffName: string
  employeeNumber: string
  primaryRole: string
  type: ResponsibilityType
  details: {
    classId?: string
    className?: string
    subjectId?: string
    subjectName?: string
    dutyDays?: string[]
  }
  assignedAt: Date
}

interface ClassTeacherAssignment {
  classId: string
  className: string
  staffId: string
  staffName: string
  employeeNumber: string
}

interface SubjectAssignment {
  subjectId: string
  subjectName: string
  subjectCode: string
  staffId: string
  staffName: string
  employeeNumber: string
  classes: string[]
}

export default function StaffAssignmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'class_teacher' | 'subject'>('all')
  
  const [classTeachers, setClassTeachers] = useState<ClassTeacherAssignment[]>([])
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([])
  const [responsibilities, setResponsibilities] = useState<StaffAssignment[]>([])

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff/assignments')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard/access-denied')
          return
        }
        throw new Error('Failed to fetch assignments')
      }

      const result = await response.json()
      setClassTeachers(result.data?.classTeachers || [])
      setSubjectAssignments(result.data?.subjectAssignments || [])
      setResponsibilities(result.data?.responsibilities || [])
    } catch (err) {
      console.error('Error fetching assignments:', err)
      setError('Unable to load staff assignments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Filter class teachers by search term
  const filteredClassTeachers = classTeachers.filter(ct =>
    ct.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter subject assignments by search term
  const filteredSubjectAssignments = subjectAssignments.filter(sa =>
    sa.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sa.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sa.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sa.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchAssignments }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Staff Assignments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage class teacher and subject assignments
          </p>
        </div>
        <button
          onClick={fetchAssignments}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, class, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'class_teacher' | 'subject')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Assignments</option>
          <option value="class_teacher">Class Teachers</option>
          <option value="subject">Subject Teachers</option>
        </select>
      </div>

      {/* Class Teachers Section */}
      {(filterType === 'all' || filterType === 'class_teacher') && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Class Teachers
              </h2>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                {filteredClassTeachers.length} assignment{filteredClassTeachers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {filteredClassTeachers.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No class teachers match your search' : 'No class teacher assignments found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredClassTeachers.map((ct) => (
                <div
                  key={`${ct.classId}-${ct.staffId}`}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/staff/${ct.staffId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {ct.staffName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ct.employeeNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ct.className}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Class Teacher
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subject Teachers Section */}
      {(filterType === 'all' || filterType === 'subject') && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Subject Teachers
              </h2>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                {filteredSubjectAssignments.length} assignment{filteredSubjectAssignments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {filteredSubjectAssignments.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No subject teachers match your search' : 'No subject assignments found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredSubjectAssignments.map((sa) => (
                <div
                  key={`${sa.subjectId}-${sa.staffId}`}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/staff/${sa.staffId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {sa.staffName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sa.employeeNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {sa.subjectName} ({sa.subjectCode})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {sa.classes.length} class{sa.classes.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {classTeachers.length === 0 && subjectAssignments.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Assignments Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Staff assignments will appear here once classes and subjects are assigned to staff members.
          </p>
        </div>
      )}
    </div>
  )
}
