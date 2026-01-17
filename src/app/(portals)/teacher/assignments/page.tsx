'use client'

import React, { useState, useEffect } from 'react'
import { Plus, FileText, Calendar, Users, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssignmentForm } from '@/components/teacher/assignment-form'
import { AssignmentDetail } from '@/components/teacher/assignment-detail'

/**
 * Teacher Assignments Page
 * Requirements: 7.1-7.5 - Assignment Management Module
 * - Create assignments with required fields
 * - Display submission status for each student
 * - Prevent deadline modifications after deadline passes
 */

interface Assignment {
  id: string
  title: string
  description: string
  classId: string
  subjectId: string
  className?: string
  subjectName?: string
  deadline: string
  status: string
  attachments: string[]
  submissions: {
    studentId: string
    studentName: string
    admissionNumber: string
    status: string
    submittedAt: string | null
    grade: string | null
  }[]
  createdAt: string
}

interface AssignedClass {
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [filterClass, setFilterClass] = useState<string>('')

  useEffect(() => {
    fetchAssignments()
    fetchAssignedClasses()
  }, [filterClass])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterClass) params.set('classId', filterClass)
      
      const response = await fetch(`/api/teacher/assignments?${params}`)
      if (!response.ok) throw new Error('Failed to fetch assignments')
      
      const data = await response.json()
      setAssignments(data.assignments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignedClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')
      
      const data = await response.json()
      setAssignedClasses(data.classes || [])
    } catch (err) {
      console.error('Failed to fetch assigned classes:', err)
    }
  }

  const handleCreateSuccess = () => {
    setShowForm(false)
    fetchAssignments()
  }

  const getSubmissionStats = (assignment: Assignment) => {
    const total = assignment.submissions.length
    const submitted = assignment.submissions.filter(
      s => s.status === 'SUBMITTED' || s.status === 'GRADED'
    ).length
    return { total, submitted }
  }

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (selectedAssignment) {
    return (
      <AssignmentDetail
        assignment={selectedAssignment}
        onBack={() => setSelectedAssignment(null)}
        onUpdate={fetchAssignments}
      />
    )
  }

  if (showForm) {
    return (
      <AssignmentForm
        assignedClasses={assignedClasses}
        onSuccess={handleCreateSuccess}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Assignments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage homework assignments for your classes
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Assignment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">All Classes</option>
          {assignedClasses.map((c) => (
            <option key={`${c.classId}-${c.subjectId}`} value={c.classId}>
              {c.className} - {c.subjectName}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No assignments yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create your first assignment to get started
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const stats = getSubmissionStats(assignment)
            const deadlinePassed = isDeadlinePassed(assignment.deadline)
            
            return (
              <Card
                key={assignment.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {assignment.className} • {assignment.subjectName}
                      </p>
                    </div>
                    <Badge variant={deadlinePassed ? 'destructive' : 'secondary'}>
                      {deadlinePassed ? 'Closed' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
                    {assignment.description}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Due: {new Date(assignment.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {stats.submitted}/{stats.total} submitted
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
