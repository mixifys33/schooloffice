'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Send,
  Shield,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface StudentReport {
  studentId: string
  studentName: string
  admissionNumber: string
  caCount: number
  examCount: number
  caApproved: boolean
  examApproved: boolean
  reportStatus: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PUBLISHED' | null
  reportId: string | null
  reportGeneratedAt: string | null
  reportPublishedAt: string | null
  shareableLink: string | null
  linkExpiry: string | null
  status: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PUBLISHED' | null
  caAverage: number
  examAverage: number
  finalAverage: number
}

interface ClassReportDetails {
  class: {
    id: string
    name: string
    studentCount: number
  }
  term: {
    id: string
    name: string
    startDate: Date
    endDate: Date
  }
  validation: {
    readyForGeneration: boolean
    caComplete: boolean
    examsComplete: boolean
    scoresApproved: boolean
    scoresLocked: boolean
    blockers: string[]
  }
  validationStatus: {
    curriculumApproved: boolean
    caComplete: boolean
    examsComplete: boolean
    scoresApproved: boolean
    scoresLocked: boolean
  }
  reportStats: {
    total: number
    generated: number
    approved: number
    published: number
    draft: number
  }
  stats: {
    total: number
    generated: number
    approved: number
    published: number
    draft: number
  }
  blockers: string[]
  studentReports: StudentReport[]
  canGenerate: boolean
  canApprove: boolean
  canPublish: boolean
}

export default function ClassReportsPage() {
  const params = useParams()
  const router = useRouter()
  const classId = params.classId as string

  const [data, setData] = useState<ClassReportDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchClassReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  const fetchClassReports = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/dos/reports/classes/${classId}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch class reports')
      }

      const result = await res.json()
      setData(result.data)
    } catch {
      setError('Failed to fetch class reports')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAll = async () => {
    setProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/dos/reports/generate/class/${classId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (res.ok) {
        setSuccess(`Generated ${result.successCount} reports successfully!`)
        fetchClassReports()
      } else {
        setError(result.error || 'Failed to generate reports')
      }
    } catch {
      setError('Failed to generate reports')
    } finally {
      setProcessing(false)
    }
  }

  const handleApproveAll = async () => {
    if (!data) return

    setProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/dos/reports/review/${classId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId: data.term.id }),
      })

      const result = await res.json()

      if (res.ok) {
        setSuccess(`Approved ${result.successCount} reports!`)
        fetchClassReports()
      } else {
        setError(result.error || 'Failed to approve reports')
      }
    } catch {
      setError('Failed to approve reports')
    } finally {
      setProcessing(false)
    }
  }

  const handlePublishAll = async () => {
    if (!data) return

    setProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/dos/reports/review/${classId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId: data.term.id, linkExpiryDays: 90 }),
      })

      const result = await res.json()

      if (res.ok) {
        setSuccess(`Published ${result.successCount} reports!`)
        fetchClassReports()
      } else {
        setError(result.error || 'Failed to publish reports')
      }
    } catch {
      setError('Failed to publish reports')
    } finally {
      setProcessing(false)
    }
  }

  const handlePreview = async (studentId: string) => {
    window.open(`/api/dos/reports/review/${studentId}/preview`, '_blank')
  }

  const handleDownload = async (studentId: string) => {
    window.open(`/api/dos/reports/review/${studentId}/download`, '_blank')
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline" className="bg-gray-100">Not Generated</Badge>
    }
    
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-gray-100">Draft</Badge>
      case 'GENERATED':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">Generated</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Approved</Badge>
      case 'PUBLISHED':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700">Published</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const filteredStudents = data?.studentReports?.filter(student => {
    if (statusFilter === 'all') return true
    return student.reportStatus === statusFilter.toUpperCase()
  }) || []

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{data.class.name} Reports</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {data.term.name} • {data.class.studentCount} students
            </p>
          </div>
        </div>
        <Button onClick={fetchClassReports} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Validation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Status</CardTitle>
          <CardDescription>Requirements for report generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              {data.validationStatus.curriculumApproved ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">Curriculum</span>
            </div>
            <div className="flex items-center gap-2">
              {data.validationStatus.caComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">CA Complete</span>
            </div>
            <div className="flex items-center gap-2">
              {data.validationStatus.examsComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">Exams Complete</span>
            </div>
            <div className="flex items-center gap-2">
              {data.validationStatus.scoresApproved ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">Scores Approved</span>
            </div>
            <div className="flex items-center gap-2">
              {data.validationStatus.scoresLocked ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm">Scores Locked</span>
            </div>
          </div>

          {data.blockers.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="text-sm font-medium text-orange-700 mb-2">Blockers:</h4>
              <ul className="space-y-1">
                {data.blockers.map((blocker: string, idx: number) => (
                  <li key={idx} className="text-sm text-orange-600 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{data.stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.stats.generated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.stats.published}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>Perform actions on all reports in this class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {data.canGenerate && (
              <Button
                onClick={handleGenerateAll}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate All Reports
                  </>
                )}
              </Button>
            )}

            {data.canApprove && data.stats.generated > 0 && (
              <Button
                onClick={handleApproveAll}
                disabled={processing}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Shield className="h-4 w-4 mr-2" />
                Approve All ({data.stats.generated})
              </Button>
            )}

            {data.canPublish && data.stats.approved > 0 && (
              <Button
                onClick={handlePublishAll}
                disabled={processing}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Publish All ({data.stats.approved})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Student Reports</CardTitle>
          <CardDescription>Individual report cards for each student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All ({data.stats.total})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'generated' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('generated')}
            >
              Generated ({data.stats.generated})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}
            >
              Approved ({data.stats.approved})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'published' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('published')}
            >
              Published ({data.stats.published})
            </Button>
          </div>

          {/* Student List */}
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{student.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.admissionNumber}
                      </div>
                    </div>
                    {getStatusBadge(student.status)}
                  </div>
                  
                  {student.status !== 'DRAFT' && (
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">CA:</span>{' '}
                        <span className="font-medium">{student.caAverage.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Exam:</span>{' '}
                        <span className="font-medium">{student.examAverage.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Final:</span>{' '}
                        <span className="font-medium">{student.finalAverage.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {student.status !== 'DRAFT' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(student.studentId)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(student.studentId)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                No reports match the selected filter
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
