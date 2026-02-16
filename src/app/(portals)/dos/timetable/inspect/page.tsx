'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  DoorOpen, 
  BookOpen,
  Lightbulb,
  BarChart3
} from 'lucide-react'

interface InspectionData {
  timetable: {
    id: string
    name: string
    class: { id: string; name: string }
    term: { id: string; name: string }
    status: string
    isLocked: boolean
    entryCount: number
  }
  qualityScore: {
    overall: number
    breakdown: {
      teacherGaps: number
      heavySubjectsAfternoon: number
      workloadBalance: number
      subjectDistribution: number
    }
  }
  conflicts: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
    affectedEntries: string[]
  }>
  teacherWorkload: Array<{
    teacher: {
      id: string
      name: string
      employeeNumber: string
    }
    periodsPerWeek: number
    periodsPerDay: { [day: number]: number }
    gaps: number
    subjects: string[]
  }>
  roomUtilization: Array<{
    room: string
    periodsUsed: number
    utilizationRate: number
    schedule: { [day: number]: number[] }
  }>
  subjectCoverage: Array<{
    subject: {
      id: string
      name: string
      code: string
    }
    required: number
    assigned: number
    coverage: number
    status: 'complete' | 'partial' | 'missing'
  }>
  suggestions: string[]
}

export default function TimetableInspectionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const timetableId = searchParams.get('id')

  const [data, setData] = useState<InspectionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!timetableId) {
      setError('No timetable ID provided')
      setIsLoading(false)
      return
    }

    fetchInspectionData()
  }, [timetableId])

  const fetchInspectionData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/dos/timetable/${timetableId}/inspect`)
      if (!response.ok) {
        throw new Error('Failed to fetch inspection data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Failed to load inspection data'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>
    return <Badge className="bg-red-500">Needs Improvement</Badge>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dos/timetable')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Timetables
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.timetable.name}</h1>
            <p className="text-sm text-gray-500">
              {data.timetable.class.name} • {data.timetable.term.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data.timetable.status === 'APPROVED' ? 'default' : 'secondary'}>
            {data.timetable.status}
          </Badge>
          {data.timetable.isLocked && (
            <Badge variant="outline">🔒 Locked</Badge>
          )}
        </div>
      </div>

      {/* Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quality Score
          </CardTitle>
          <CardDescription>Overall timetable quality assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className={`text-6xl font-bold ${getScoreColor(data.qualityScore.overall)}`}>
                {data.qualityScore.overall}
              </div>
              <div className="text-sm text-gray-500">out of 100</div>
            </div>
            <div>
              {getScoreBadge(data.qualityScore.overall)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Teacher Gaps</span>
                <span className={getScoreColor(data.qualityScore.breakdown.teacherGaps)}>
                  {data.qualityScore.breakdown.teacherGaps}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${data.qualityScore.breakdown.teacherGaps}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Heavy Subjects Timing</span>
                <span className={getScoreColor(data.qualityScore.breakdown.heavySubjectsAfternoon)}>
                  {data.qualityScore.breakdown.heavySubjectsAfternoon}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${data.qualityScore.breakdown.heavySubjectsAfternoon}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Workload Balance</span>
                <span className={getScoreColor(data.qualityScore.breakdown.workloadBalance)}>
                  {data.qualityScore.breakdown.workloadBalance}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${data.qualityScore.breakdown.workloadBalance}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subject Distribution</span>
                <span className={getScoreColor(data.qualityScore.breakdown.subjectDistribution)}>
                  {data.qualityScore.breakdown.subjectDistribution}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${data.qualityScore.breakdown.subjectDistribution}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts */}
      {data.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Conflicts ({data.conflicts.length})
            </CardTitle>
            <CardDescription>Issues that need to be resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.conflicts.map((conflict, index) => (
                <Alert
                  key={index}
                  variant={conflict.severity === 'high' ? 'destructive' : 'default'}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{conflict.message}</span>
                      <Badge variant={
                        conflict.severity === 'high' ? 'destructive' :
                        conflict.severity === 'medium' ? 'default' : 'secondary'
                      }>
                        {conflict.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Optimization Suggestions
            </CardTitle>
            <CardDescription>Recommendations to improve timetable quality</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Teacher Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teacher Workload
          </CardTitle>
          <CardDescription>Periods per week and gap analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Teacher</th>
                  <th className="text-center p-2">Periods/Week</th>
                  <th className="text-center p-2">Gaps</th>
                  <th className="text-left p-2">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {data.teacherWorkload.map((teacher, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{teacher.teacher.name}</div>
                        <div className="text-xs text-gray-500">{teacher.teacher.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={teacher.periodsPerWeek > 30 ? 'destructive' : 'secondary'}>
                        {teacher.periodsPerWeek}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={teacher.gaps > 5 ? 'destructive' : 'secondary'}>
                        {teacher.gaps}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="text-xs text-gray-600">
                        {teacher.subjects.join(', ')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Room Utilization */}
      {data.roomUtilization.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              Room Utilization
            </CardTitle>
            <CardDescription>Room usage across the week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Room</th>
                    <th className="text-center p-2">Periods Used</th>
                    <th className="text-center p-2">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roomUtilization.map((room, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{room.room}</td>
                      <td className="text-center p-2">{room.periodsUsed}/40</td>
                      <td className="text-center p-2">
                        <Badge variant={
                          room.utilizationRate >= 70 ? 'default' :
                          room.utilizationRate >= 40 ? 'secondary' : 'outline'
                        }>
                          {room.utilizationRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Coverage
          </CardTitle>
          <CardDescription>Required vs assigned periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Subject</th>
                  <th className="text-center p-2">Required</th>
                  <th className="text-center p-2">Assigned</th>
                  <th className="text-center p-2">Coverage</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectCoverage.map((subject, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{subject.subject.name}</div>
                        <div className="text-xs text-gray-500">{subject.subject.code}</div>
                      </div>
                    </td>
                    <td className="text-center p-2">{subject.required}</td>
                    <td className="text-center p-2">{subject.assigned}</td>
                    <td className="text-center p-2">{subject.coverage}%</td>
                    <td className="text-center p-2">
                      <Badge variant={
                        subject.status === 'complete' ? 'default' :
                        subject.status === 'partial' ? 'secondary' : 'destructive'
                      }>
                        {subject.status}
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
