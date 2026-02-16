'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, User, Calendar, Phone, Mail, TrendingUp, ClipboardList, BookOpen, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'

/**
 * Student Detail Page for Class Teacher Portal
 * Shows detailed information about a specific student
 */

interface StudentDetail {
  id: string
  name: string
  admissionNumber: string
  gender: string | null
  age: number | null
  dateOfBirth: string | null
  status: string
  class: {
    id: string
    name: string
    streamName: string | null
  }
  guardian: {
    name: string
    phone: string | null
    email: string | null
    relationship: string
  } | null
  attendance: {
    rate: number
    present: number
    absent: number
    late: number
    excused: number
    total: number
  }
  performance: {
    average: number
    caAverage: number
    examAverage: number
    totalAssessments: number
  }
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentDetail() {
      try {
        const response = await fetch(`/api/class-teacher/students/${studentId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch student details')
        }
        const data = await response.json()
        setStudent(data)
      } catch (err) {
        setError('Unable to load student details')
        console.error('Error fetching student detail:', err)
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentDetail()
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{error || 'Student not found'}</span>
            </div>
          </div>
          <Link
            href="/class-teacher/students"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Navigation */}
        <Link
          href="/class-teacher/students"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>

        {/* Student Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-20 w-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {student.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {student.admissionNumber} • {student.class.name}
                {student.class.streamName && ` (${student.class.streamName})`}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600 dark:text-slate-400">
                {student.gender && (
                  <span>Gender: {student.gender}</span>
                )}
                {student.age && (
                  <span>Age: {student.age} years</span>
                )}
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  student.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                )}>
                  {student.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/class-teacher/attendance?studentId=${student.id}`}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Attendance</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">View records</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/class-teacher/assessments?studentId=${student.id}`}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Assessments</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">View scores</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/class-teacher/reports?studentId=${student.id}`}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">Reports</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">View progress</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Attendance
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Overall Rate</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {student.attendance.rate}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      student.attendance.rate >= 90 ? 'bg-green-500' :
                      student.attendance.rate >= 75 ? 'bg-blue-500' :
                      student.attendance.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${student.attendance.rate}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Present:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.attendance.present}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Absent:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.attendance.absent}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Late:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.attendance.late}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Excused:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.attendance.excused}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Academic Performance
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Overall Average</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {student.performance.average}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      student.performance.average >= 90 ? 'bg-green-500' :
                      student.performance.average >= 75 ? 'bg-blue-500' :
                      student.performance.average >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${student.performance.average}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">CA Average:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.performance.caAverage}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Exam Average:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.performance.examAverage}%
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600 dark:text-slate-400">Total Assessments:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                    {student.performance.totalAssessments}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guardian Information */}
        {student.guardian && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Guardian Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Name</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {student.guardian.name} ({student.guardian.relationship})
                  </p>
                </div>
              </div>
              {student.guardian.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {student.guardian.phone}
                    </p>
                  </div>
                </div>
              )}
              {student.guardian.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {student.guardian.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
