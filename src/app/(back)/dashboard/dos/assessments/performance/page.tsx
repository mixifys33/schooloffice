'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  RefreshCw,
  Search,
  BookOpen,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Target
} from 'lucide-react'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader, Skeleton } from '@/components/ui/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * DoS ASSESSMENT PERFORMANCE
 * 
 * Monitor assessment performance across classes and subjects.
 * DoS needs to identify academic trends and intervention needs.
 */

interface PerformanceData {
  classId: string
  className: string
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    teacher: {
      id: string
      name: string
      employeeNumber: string
    } | null
    assessments: {
      type: string
      averageScore: number
      highestScore: number
      lowestScore: number
      passRate: number
      totalStudents: number
      completedStudents: number
      trend: 'improving' | 'declining' | 'stable'
      lastAssessment: string
    }[]
    overallAverage: number
    overallPassRate: number
    trend: 'improving' | 'declining' | 'stable'
  }[]
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
  const [trendFilter, setTrendFilter] = useState<string>('all')
  
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
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

  const loadPerformanceData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dos/assessments/performance')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to load performance data')
      }

      const data = await response.json()
      setPerformanceData(data.performanceData)
      setStats(data.stats)

    } catch (err) {
      console.error('Error loading performance data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPerformanceData()
  }, [loadPerformanceData])

  const filteredData = performanceData.filter(classData => {
    const matchesSearch = classData.className.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTrend = trendFilter === 'all' || classData.classTrend === trendFilter
    
    return matchesSearch && matchesTrend
  })

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-[var(--chart-green)] bg-[var(--success-light)]'
      case 'declining': return 'text-[var(--chart-red)] bg-[var(--danger-light)]'
      case 'stable': return 'text-[var(--text-secondary)] bg-[var(--bg-surface)]'
      default: return 'text-[var(--text-secondary)] bg-[var(--bg-surface)]'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4" />
      case 'declining': return <TrendingDown className="w-4 h-4" />
      case 'stable': return <BarChart3 className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-[var(--chart-green)]'
    if (score >= 60) return 'text-[var(--chart-yellow)]'
    if (score >= 40) return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-red)]'
  }

  const getPassRateColor = (rate: number) => {
    if (rate >= 80) return 'text-[var(--chart-green)]'
    if (rate >= 60) return 'text-[var(--chart-yellow)]'
    if (rate >= 40) return 'text-[var(--chart-yellow)]'
    return 'text-[var(--chart-red)]'
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
        <SkeletonLoader rows={8} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Assessment Performance</h1>
          <p className="text-[var(--text-secondary)] mt-1">Monitor academic performance trends across all classes and subjects</p>
          <div className="mt-2 p-3 bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg">
            <p className="text-sm text-[var(--info-dark)]">
              <BarChart3 className="w-4 h-4 inline mr-1" />
              <strong>DoS View:</strong> Identify performance trends and areas requiring academic intervention.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadPerformanceData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-[var(--chart-blue)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Overall Average</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(stats.overallAverage)}`}>
                {stats.overallAverage.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pass Rate</p>
              <p className={`text-2xl font-bold ${getPassRateColor(stats.overallPassRate)}`}>
                {stats.overallPassRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-[var(--chart-green)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Improving</p>
              <p className="text-2xl font-bold text-[var(--success-dark)]">{stats.improvingSubjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-[var(--chart-red)]" />
            <div className="ml-3">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Declining</p>
              <p className="text-2xl font-bold text-[var(--danger-dark)]">{stats.decliningSubjects}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {stats.criticalSubjects > 0 && (
        <AlertBanner
          type="error"
          title="Critical Performance"
          message={`${stats.criticalSubjects} subject${stats.criticalSubjects !== 1 ? 's have' : ' has'} critically low performance requiring immediate intervention.`}
        />
      )}

      {stats.decliningSubjects > 0 && (
        <AlertBanner
          type="warning"
          title="Declining Performance"
          message={`${stats.decliningSubjects} subject${stats.decliningSubjects !== 1 ? 's are' : ' is'} showing declining performance trends.`}
        />
      )}

      {/* Top/Bottom Performers */}
      {(stats.topPerformingClass || stats.lowestPerformingClass) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topPerformingClass && (
            <Card className="p-4 border-[var(--success-light)] bg-[var(--success-light)]">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                <div>
                  <p className="text-sm font-medium text-[var(--success-dark)]">Top Performing Class</p>
                  <p className="text-lg font-bold text-[var(--success-dark)]">{stats.topPerformingClass}</p>
                </div>
              </div>
            </Card>
          )}
          {stats.lowestPerformingClass && (
            <Card className="p-4 border-[var(--danger-light)] bg-[var(--danger-light)]">
              <div className="flex items-center">
                <TrendingDown className="w-6 h-6 text-[var(--chart-red)] mr-3" />
                <div>
                  <p className="text-sm font-medium text-[var(--danger-dark)]">Needs Attention</p>
                  <p className="text-lg font-bold text-[var(--danger-dark)]">{stats.lowestPerformingClass}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        <select
          value={trendFilter}
          onChange={(e) => setTrendFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm"
        >
          <option value="all">All Trends</option>
          <option value="improving">Improving</option>
          <option value="stable">Stable</option>
          <option value="declining">Declining</option>
        </select>
      </div>

      {/* Performance Data by Class */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <Card className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Performance Data Found</h3>
            <p className="text-[var(--text-secondary)]">No classes match your search criteria.</p>
          </Card>
        ) : (
          filteredData.map((classData) => (
            <Card key={classData.classId} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Building2 className="w-6 h-6 text-[var(--chart-green)] mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{classData.className}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                      <span>Average: <span className={getPerformanceColor(classData.classAverage)}>{classData.classAverage.toFixed(1)}%</span></span>
                      <span>Pass Rate: <span className={getPassRateColor(classData.classPassRate)}>{classData.classPassRate.toFixed(1)}%</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getTrendColor(classData.classTrend)}>
                    {getTrendIcon(classData.classTrend)}
                    <span className="ml-1">{classData.classTrend.toUpperCase()}</span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {classData.subjects.map((subject) => (
                  <div key={subject.subjectId} className="border rounded-lg p-4 bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 text-[var(--chart-purple)] mr-2" />
                        <div>
                          <span className="font-medium">{subject.subjectName}</span>
                          <span className="text-sm text-[var(--text-secondary)] ml-2">({subject.subjectCode})</span>
                          {subject.teacher && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1">{subject.teacher.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTrendColor(subject.trend)}>
                          {getTrendIcon(subject.trend)}
                          <span className="ml-1">{subject.trend}</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Overall Performance</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={`font-medium ${getPerformanceColor(subject.overallAverage)}`}>
                            Avg: {subject.overallAverage.toFixed(1)}%
                          </span>
                          <span className={`font-medium ${getPassRateColor(subject.overallPassRate)}`}>
                            Pass: {subject.overallPassRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Recent Assessments</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {subject.assessments.slice(0, 3).map((assessment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {assessment.type}: {assessment.averageScore.toFixed(1)}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  <FileText className="w-4 h-4 mr-1" />
                  Generate Report
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}