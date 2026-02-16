'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  BookOpen,
  User,
  AlertCircle,
  BarChart3,
  Award,
  Target
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Assessment {
  type: string
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  totalStudents: number
  completedStudents: number
  trend: 'improving' | 'declining' | 'stable'
  lastAssessment: string
}

interface SubjectPerformance {
  subjectId: string
  subjectName: string
  subjectCode: string
  teacher: { name: string; employeeNumber: string } | null
  assessments: Assessment[]
  overallAverage: number
  overallPassRate: number
  trend: 'improving' | 'declining' | 'stable'
}

interface ClassPerformance {
  classId: string
  className: string
  subjects: SubjectPerformance[]
  classAverage: number
  classPassRate: number
  classTrend: 'improving' | 'declining' | 'stable'
}

interface PerformanceStats {
  totalClasses: number
  totalSubjects: number
  overallAverage: number
  overallPassRate: number
  improvingSubjects: number
  decliningSubjects: number
  criticalSubjects: number
  topPerformingClass: string
  lowestPerformingClass: string
}

export default function DoSAssessmentPerformancePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [performanceData, setPerformanceData] = useState<ClassPerformance[]>([])
  const [stats, setStats] = useState<PerformanceStats>({
    totalClasses: 0,
    totalSubjects: 0,
    overallAverage: 0,
    overallPassRate: 0,
    improvingSubjects: 0,
    decliningSubjects: 0,
    criticalSubjects: 0,
    topPerformingClass: '',
    lowestPerformingClass: ''
  })

  const loadPerformance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dos/assessments/performance')
      if (!response.ok) throw new Error('Failed to load performance data')
      const data = await response.json()
      setPerformanceData(data.performanceData)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPerformance() }, [loadPerformance])

  const filteredData = performanceData.filter(cls =>
    searchTerm === '' ||
    cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subjects.some(s => s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-600" />
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getTrendBadge = (trend: string) => {
    if (trend === 'improving') return <Badge variant="success">Improving</Badge>
    if (trend === 'declining') return <Badge variant="destructive">Declining</Badge>
    return <Badge variant="secondary">Stable</Badge>
  }

  const getPerformanceColor = (average: number) => {
    if (average >= 75) return 'text-green-600'
    if (average >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold">Assessment Performance</h1>
        </div>
        <p className="text-gray-600">Monitor academic performance across all classes and subjects</p>
      </div>

      {error && <AlertBanner variant="error" title="Error" message={error} className="mb-6" />}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Overall Average</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.overallAverage)}`}>
              {stats.overallAverage.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Pass Rate</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.overallPassRate)}`}>
              {stats.overallPassRate.toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="text-sm text-green-700">Improving</div>
            <div className="text-2xl font-bold text-green-600">{stats.improvingSubjects}</div>
          </Card>
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="text-sm text-red-700">Declining</div>
            <div className="text-2xl font-bold text-red-600">{stats.decliningSubjects}</div>
          </Card>
          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="text-sm text-orange-700">Critical</div>
            <div className="text-2xl font-bold text-orange-600">{stats.criticalSubjects}</div>
          </Card>
        </div>
      )}

      {!loading && stats.topPerformingClass && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-green-600" />
              <div className="text-sm text-green-700 font-medium">Top Performing Class</div>
            </div>
            <div className="text-xl font-bold text-green-900">{stats.topPerformingClass}</div>
          </Card>
          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-orange-600" />
              <div className="text-sm text-orange-700 font-medium">Needs Attention</div>
            </div>
            <div className="text-xl font-bold text-orange-900">{stats.lowestPerformingClass}</div>
          </Card>
        </div>
      )}

      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by class or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={loadPerformance} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {loading ? (
        <SkeletonLoader count={3} height={200} />
      ) : filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No performance data found</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredData.map((classData) => (
            <Card key={classData.classId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{classData.className}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className={`font-semibold ${getPerformanceColor(classData.classAverage)}`}>
                      Average: {classData.classAverage.toFixed(1)}%
                    </span>
                    <span className={`font-semibold ${getPerformanceColor(classData.classPassRate)}`}>
                      Pass Rate: {classData.classPassRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(classData.classTrend)}
                  {getTrendBadge(classData.classTrend)}
                </div>
              </div>

              <div className="space-y-4">
                {classData.subjects.map((subject) => (
                  <div key={subject.subjectId} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{subject.subjectName}</h3>
                          {getTrendBadge(subject.trend)}
                        </div>
                        {subject.teacher ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <User className="h-3 w-3" />
                            {subject.teacher.name}
                          </div>
                        ) : (
                          <Badge variant="destructive" className="mt-1">No Teacher</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getPerformanceColor(subject.overallAverage)}`}>
                          {subject.overallAverage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Pass: {subject.overallPassRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {subject.assessments.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        {subject.assessments.map((assessment, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded">
                            <div className="text-xs text-gray-600 mb-1">{assessment.type}</div>
                            <div className={`text-lg font-bold ${getPerformanceColor(assessment.averageScore)}`}>
                              {assessment.averageScore.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              Pass: {assessment.passRate.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
