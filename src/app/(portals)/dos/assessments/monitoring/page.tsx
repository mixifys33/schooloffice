'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  RefreshCw, Download, Users, BookOpen, TrendingUp, Search,
  ChevronDown, ChevronUp, Filter, X, FileSpreadsheet, Printer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'

interface ClassOption {
  id: string
  name: string
  level: number
}

interface SubjectColumn {
  subjectId: string
  subjectCode: string
  subjectName: string
}

interface StudentRow {
  studentId: string
  admissionNumber: string
  firstName: string
  lastName: string
  fullName: string
  stream: string | null
  subjectScores: Record<string, number | null>
  overallAverage: number | null
}

interface CASummaryData {
  class: {
    id: string
    name: string
    level: number
  }
  term: {
    id: string
    name: string
  }
  conversionMode: string
  conversionTarget: number
  subjectColumns: SubjectColumn[]
  studentRows: StudentRow[]
  summary: {
    totalStudents: number
    totalSubjects: number
    studentsWithScores: number
  }
}

export default function DoSCAMonitoringPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [conversionMode, setConversionMode] = useState<'100' | '20'>('100')
  const [data, setData] = useState<CASummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [filterMinScore, setFilterMinScore] = useState<string>('')
  const [filterMaxScore, setFilterMaxScore] = useState<string>('')

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dos/assessments/class-ca-summary')
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }

      const result = await response.json()
      
      if (result.success) {
        setClasses(result.data.classes)
      }
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
    }
  }

  const fetchCASummary = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(
        `/api/dos/assessments/class-ca-summary?classId=${selectedClassId}&conversionMode=${conversionMode}`
      )
      
      const result = await response.json()
      
      console.log('📡 [CA Monitoring] API Response:', { status: response.status, result })
      
      if (!response.ok) {
        const errorMsg = result.error || result.message || 'Failed to fetch CA summary'
        console.error('❌ [CA Monitoring] API Error:', errorMsg)
        if (result.details) {
          console.error('❌ [CA Monitoring] Error Details:', result.details)
        }
        throw new Error(errorMsg)
      }

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch CA summary')
      }
    } catch (err) {
      console.error('❌ [CA Monitoring] Fetch Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch CA summary')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedClassId, conversionMode])

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      fetchCASummary()
    }
  }, [selectedClassId, conversionMode, fetchCASummary])

  const handleRefresh = () => {
    if (selectedClassId) {
      fetchCASummary(true)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Adm No', 'Student Name', 'Stream', ...data.subjectColumns.map(s => s.subjectCode), 'Average']
    const rows = filteredAndSortedStudents.map(student => [
      student.admissionNumber,
      student.fullName,
      student.stream || '-',
      ...data.subjectColumns.map(s => formatScore(student.subjectScores[s.subjectCode])),
      formatScore(student.overallAverage)
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CA_Summary_${data.class.name}_${data.term.name}.csv`
    a.click()
  }

  const handlePrint = () => {
    if (!data) return

    // Create print window with styled content
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CA Averages - ${data.class.name} (${data.term.name})</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0.5cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
            }
            .info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .adm-col, .name-col {
              text-align: left;
            }
            .score-high {
              background-color: #d4edda;
              font-weight: bold;
            }
            .score-medium {
              background-color: #fff3cd;
            }
            .score-low {
              background-color: #f8d7da;
            }
            .avg-col {
              background-color: #e7f3ff;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Continuous Assessment (CA) Averages</h1>
            <p><strong>${data.class.name}</strong> - ${data.term.name}</p>
          </div>
          
          <div class="info">
            <div>
              <strong>Total Students:</strong> ${data.summary.totalStudents} | 
              <strong>Total Subjects:</strong> ${data.summary.totalSubjects}
            </div>
            <div>
              <strong>Score Format:</strong> ${data.conversionMode === '100' ? 'Out of 100%' : 'Out of 20'} | 
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="adm-col">Adm No.</th>
                <th class="name-col">Student Name</th>
                <th>Stream</th>
                ${data.subjectColumns.map(s => `<th title="${s.subjectName}">${s.subjectCode}</th>`).join('')}
                <th class="avg-col">Average</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedStudents.map(student => {
                const avgScore = student.overallAverage ?? 0
                const avgPercentage = (avgScore / data.conversionTarget) * 100
                const avgClass = avgPercentage >= 75 ? 'score-high' : avgPercentage >= 50 ? 'score-medium' : 'score-low'
                
                return `
                  <tr>
                    <td class="adm-col">${student.admissionNumber}</td>
                    <td class="name-col">${student.fullName}</td>
                    <td>${student.stream || '-'}</td>
                    ${data.subjectColumns.map(s => {
                      const score = student.subjectScores[s.subjectCode]
                      if (score === null) return '<td>-</td>'
                      const percentage = (score / data.conversionTarget) * 100
                      const scoreClass = percentage >= 75 ? 'score-high' : percentage >= 50 ? 'score-medium' : 'score-low'
                      return `<td class="${scoreClass}">${formatScore(score)}</td>`
                    }).join('')}
                    <td class="avg-col ${avgClass}">${formatScore(student.overallAverage)}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Color Legend:</strong> Green = 75%+, Yellow = 50-74%, Red = Below 50%</p>
            <p>Generated on ${new Date().toLocaleString()} | School Office Management System</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              // Uncomment to auto-close after printing
              // window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const formatScore = (score: number | null): string => {
    if (score === null) return '-'
    return score.toFixed(2)
  }

  const getScoreColor = (score: number | null, target: number): string => {
    if (score === null) return 'text-gray-400'
    const percentage = (score / target) * 100
    if (percentage >= 75) return 'text-green-600 font-semibold'
    if (percentage >= 50) return 'text-yellow-600 font-medium'
    return 'text-red-600 font-semibold'
  }

  const getScoreBgColor = (score: number | null, target: number): string => {
    if (score === null) return 'bg-gray-50'
    const percentage = (score / target) * 100
    if (percentage >= 75) return 'bg-green-50'
    if (percentage >= 50) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  const filteredAndSortedStudents = React.useMemo(() => {
    if (!data) return []

    let filtered = data.studentRows.filter(student => {
      const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (!matchesSearch) return false

      if (filterMinScore || filterMaxScore) {
        const avg = student.overallAverage
        if (avg === null) return false
        if (filterMinScore && avg < parseFloat(filterMinScore)) return false
        if (filterMaxScore && avg > parseFloat(filterMaxScore)) return false
      }

      return true
    })

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | number
        let bVal: string | number

        if (sortColumn === 'name') {
          aVal = a.fullName
          bVal = b.fullName
        } else if (sortColumn === 'admNo') {
          aVal = a.admissionNumber
          bVal = b.admissionNumber
        } else if (sortColumn === 'average') {
          aVal = a.overallAverage ?? -1
          bVal = b.overallAverage ?? -1
        } else {
          // Subject column
          aVal = a.subjectScores[sortColumn] ?? -1
          bVal = b.subjectScores[sortColumn] ?? -1
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        } else {
          const numA = typeof aVal === 'number' ? aVal : -1
          const numB = typeof bVal === 'number' ? bVal : -1
          return sortDirection === 'asc' ? numA - numB : numB - numA
        }
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection, filterMinScore, filterMaxScore])

  if (loading && classes.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader variant="card" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 space-y-6">
        <ErrorMessage
          title="Failed to load CA monitoring data"
          message={error}
        />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">CA Monitoring</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Monitor continuous assessment averages across all students
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data && (
            <>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Printer className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
                className="flex-1 sm:flex-none"
              >
                <RefreshCw className={`h-4 w-4 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Select a class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Score Format
              </label>
              <select
                value={conversionMode}
                onChange={(e) => setConversionMode(e.target.value as '100' | '20')}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="100">Out of 100%</option>
                <option value="20">Out of 20</option>
              </select>
            </div>

            {data && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Current Term
                </label>
                <div className="h-10 sm:h-11 flex items-center">
                  <Badge variant="outline" className="text-sm px-3 py-1.5">
                    {data.term.name}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Students"
            value={data.summary.totalStudents.toString()}
            subtitle={`in ${data.class.name}`}
            color="blue"
            icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Subjects"
            value={data.summary.totalSubjects.toString()}
            subtitle="assigned to class"
            color="purple"
            icon={<BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="With Scores"
            value={data.summary.studentsWithScores.toString()}
            subtitle={`${((data.summary.studentsWithScores / data.summary.totalStudents) * 100).toFixed(1)}% coverage`}
            color={data.summary.studentsWithScores === data.summary.totalStudents ? "green" : "yellow"}
            icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Showing"
            value={filteredAndSortedStudents.length.toString()}
            subtitle={`of ${data.summary.totalStudents} students`}
            color="gray"
            icon={<Filter className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
        </div>
      )}

      {/* Search and Filters */}
      {data && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              {(searchTerm || filterMinScore || filterMaxScore) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterMinScore('')
                    setFilterMaxScore('')
                  }}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Average Score</label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={filterMinScore}
                    onChange={(e) => setFilterMinScore(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Average Score</label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={filterMaxScore}
                    onChange={(e) => setFilterMaxScore(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CA Summary Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base sm:text-lg">CA Averages - {data.class.name} ({data.term.name})</span>
              <Badge variant="outline" className="self-start sm:self-auto">
                {data.conversionMode === '100' ? 'Out of 100%' : 'Out of 20'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3">
              {filteredAndSortedStudents.map((student) => {
                const avgScore = student.overallAverage ?? 0
                const avgPercentage = (avgScore / data.conversionTarget) * 100
                const avgColorClass = avgPercentage >= 75 ? 'text-green-600' : avgPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                
                return (
                  <div key={student.studentId} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    {/* Student Header */}
                    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white">{student.fullName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {student.admissionNumber} {student.stream && `• ${student.stream}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                        <p className={`text-xl font-bold ${avgColorClass}`}>
                          {formatScore(student.overallAverage)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Subject Scores Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {data.subjectColumns.map((subject) => {
                        const score = student.subjectScores[subject.subjectCode]
                        const percentage = score !== null ? (score / data.conversionTarget) * 100 : 0
                        const scoreColorClass = score === null ? 'text-gray-400' : 
                          percentage >= 75 ? 'text-green-600 font-semibold' : 
                          percentage >= 50 ? 'text-yellow-600 font-medium' : 
                          'text-red-600 font-semibold'
                        const bgColorClass = score === null ? 'bg-gray-50' :
                          percentage >= 75 ? 'bg-green-50' :
                          percentage >= 50 ? 'bg-yellow-50' :
                          'bg-red-50'
                        
                        return (
                          <div key={subject.subjectId} className={`p-2 rounded ${bgColorClass}`}>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={subject.subjectName}>
                              {subject.subjectCode}
                            </p>
                            <p className={`text-sm font-mono ${scoreColorClass}`}>
                              {formatScore(score)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {filteredAndSortedStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No students found matching your filters</p>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th 
                      className="p-3 text-left font-semibold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10"
                      onClick={() => handleSort('admNo')}
                    >
                      <div className="flex items-center gap-2">
                        Adm No.
                        {sortColumn === 'admNo' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-3 text-left font-semibold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 sticky left-[100px] bg-gray-50 dark:bg-gray-800 z-10"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Student Name
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="p-3 text-left font-semibold text-sm">Stream</th>
                    {data.subjectColumns.map((subject) => (
                      <th
                        key={subject.subjectId}
                        className="p-3 text-center font-semibold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={subject.subjectName}
                        onClick={() => handleSort(subject.subjectCode)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {subject.subjectCode}
                          {sortColumn === subject.subjectCode && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th 
                      className="p-3 text-center font-bold text-sm bg-blue-50 dark:bg-blue-900 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800"
                      onClick={() => handleSort('average')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Average
                        {sortColumn === 'average' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStudents.map((student, idx) => (
                    <tr key={student.studentId} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'}`}>
                      <td className="p-3 font-mono text-sm sticky left-0 bg-inherit z-10">
                        {student.admissionNumber}
                      </td>
                      <td className="p-3 font-medium sticky left-[100px] bg-inherit z-10">
                        {student.fullName}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {student.stream || '-'}
                      </td>
                      {data.subjectColumns.map((subject) => (
                        <td
                          key={subject.subjectId}
                          className={`p-3 text-center font-mono text-sm ${getScoreBgColor(
                            student.subjectScores[subject.subjectCode],
                            data.conversionTarget
                          )} ${getScoreColor(
                            student.subjectScores[subject.subjectCode],
                            data.conversionTarget
                          )}`}
                        >
                          {formatScore(student.subjectScores[subject.subjectCode])}
                        </td>
                      ))}
                      <td className={`p-3 text-center font-bold font-mono bg-blue-50 dark:bg-blue-900 ${getScoreColor(
                        student.overallAverage,
                        data.conversionTarget
                      )}`}>
                        {formatScore(student.overallAverage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                How to Read This Table
              </h4>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• All CA scores are converted to {data.conversionMode === '100' ? '100%' : 'out of 20'} format for consistency</li>
                <li>• Each subject column shows the average of ALL CA entries for that subject this term</li>
                <li>• <span className="text-green-600 font-semibold">Green</span> = 75%+, <span className="text-yellow-600 font-medium">Yellow</span> = 50-74%, <span className="text-red-600 font-semibold">Red</span> = Below 50%</li>
                <li>• Click column headers to sort by that column</li>
                <li>• Use filters to find students within specific score ranges</li>
                <li>• Export to CSV for further analysis in Excel/Sheets</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}