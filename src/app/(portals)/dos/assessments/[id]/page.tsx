'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  BookOpen,
  Calendar,
  User,
  TrendingUp,
  FileText,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'

interface StudentScore {
  studentId: string
  admissionNumber: string
  studentName: string
  score: number | null
  maxScore: number
  percentage: number | null
  status: string
}

interface AssessmentDetail {
  id: string
  name: string
  type: string
  subjectId: string
  subjectName: string
  subjectCode: string
  classId: string
  className: string
  teacherId: string
  teacherName: string
  termId: string
  termName: string
  maxScore: number
  weightPercentage: number
  createdAt: string
  status: string
  
  // Statistics
  totalStudents: number
  entriesWithScores: number
  completionRate: number
  averageScore: number
  highestScore: number
  lowestScore: number
  
  // Student scores
  studentScores: StudentScore[]
  
  // Flags
  isOverdue: boolean
  hasAnomalies: boolean
  dosApproved: boolean
  canApprove: boolean
}

export default function AssessmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string
  
  const [data, setData] = useState<AssessmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    fetchAssessmentDetail()
  }, [assessmentId])

  const fetchAssessmentDetail = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/dos/assessments/plans/${assessmentId}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          setTimeout(() => {
            window.location.href = '/login'
          }, 3000)
          return
        }
        
        if (response.status === 404) {
          setError('Assessment not found. It may have been deleted.')
          return
        }
        
        throw new Error('Failed to fetch assessment details')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch assessment details')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching assessment detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch assessment details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAssessmentDetail(true)
  }

  const handleApprove = async () => {
    if (!data || !data.canApprove) return
    
    try {
      setApproving(true)
      
      const response = await fetch(`/api/dos/assessments/plans/${assessmentId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to approve assessment')
      }

      // Refresh data
      await fetchAssessmentDetail(true)
    } catch (err) {
      console.error('Error approving assessment:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve assessment')
    } finally {
      setApproving(false)
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Admission No', 'Student Name', 'Score', 'Max Score', 'Percentage', 'Status']
    const rows = data.studentScores.map(s => [
      s.admissionNumber,
      s.studentName,
      s.score?.toString() || '-',
      s.maxScore.toString(),
      s.percentage?.toFixed(1) || '-',
      s.status
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.name}_${data.className}_${data.subjectCode}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonLoader variant="button" />
          <SkeletonLoader variant="text" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>
        <SkeletonLoader variant="card" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dos/assessments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
        
        <ErrorMessage
          title="Failed to load assessment details"
          message={error}
          suggestedActions={[
            'Check your internet connection',
            'Verify the assessment still exists',
            'Contact system administrator if the problem persists'
          ]}
        />
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dos/assessments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {data.className} • {data.subjectName} • {data.termName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              data.dosApproved 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : data.isOverdue
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            )}
          >
            {data.dosApproved ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </>
            ) : data.isOverdue ? (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </>
            )}
          </Badge>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {data.canApprove && !data.dosApproved && (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Type</span>
              </div>
              <p className="font-medium">{data.type}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Subject</span>
              </div>
              <p className="font-medium">{data.subjectName} ({data.subjectCode})</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <User className="h-4 w-4" />
                <span className="text-sm">Teacher</span>
              </div>
              <p className="font-medium">{data.teacherName}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Created</span>
              </div>
              <p className="font-medium">{new Date(data.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Max Score</div>
              <p className="text-2xl font-bold">{data.maxScore}</p>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Weight</div>
              <p className="text-2xl font-bold">{data.weightPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={data.totalStudents.toString()}
          subtitle="in class"
          color="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${data.completionRate.toFixed(1)}%`}
          subtitle={`${data.entriesWithScores} of ${data.totalStudents} scored`}
          color={data.completionRate >= 90 ? "green" : data.completionRate >= 70 ? "yellow" : "red"}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Average Score"
          value={data.averageScore.toFixed(1)}
          subtitle={`out of ${data.maxScore}`}
          color="purple"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Score Range"
          value={`${data.lowestScore.toFixed(1)} - ${data.highestScore.toFixed(1)}`}
          subtitle="lowest to highest"
          color="gray"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Anomalies Warning */}
      {data.hasAnomalies && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Quality Anomalies Detected</p>
                <p className="text-sm mt-1">
                  This assessment may have data quality issues. Please review the scores carefully.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Student Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left font-semibold text-sm">Adm No.</th>
                  <th className="p-3 text-left font-semibold text-sm">Student Name</th>
                  <th className="p-3 text-center font-semibold text-sm">Score</th>
                  <th className="p-3 text-center font-semibold text-sm">Max Score</th>
                  <th className="p-3 text-center font-semibold text-sm">Percentage</th>
                  <th className="p-3 text-center font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.studentScores.map((student, idx) => (
                  <tr 
                    key={student.studentId} 
                    className={cn(
                      "border-b hover:bg-gray-50 dark:hover:bg-gray-800",
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'
                    )}
                  >
                    <td className="p-3 font-mono text-sm">{student.admissionNumber}</td>
                    <td className="p-3 font-medium">{student.studentName}</td>
                    <td className={cn(
                      "p-3 text-center font-semibold",
                      student.score === null ? 'text-gray-400' :
                      (student.percentage ?? 0) >= 75 ? 'text-green-600' :
                      (student.percentage ?? 0) >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    )}>
                      {student.score !== null ? student.score.toFixed(1) : '-'}
                    </td>
                    <td className="p-3 text-center text-gray-600">{student.maxScore}</td>
                    <td className={cn(
                      "p-3 text-center font-semibold",
                      student.percentage === null ? 'text-gray-400' :
                      student.percentage >= 75 ? 'text-green-600' :
                      student.percentage >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    )}>
                      {student.percentage !== null ? `${student.percentage.toFixed(1)}%` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge 
                        variant="outline"
                        className={cn(
                          student.status === 'SUBMITTED' 
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        )}
                      >
                        {student.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
