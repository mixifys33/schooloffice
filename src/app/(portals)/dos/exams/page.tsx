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
  subjectScores: Record<string, {
    examScore: number | null  // Out of 80
    caScore: number | null    // Out of 20
    finalScore: number | null // Out of 100
  }>
  overallAverage: number | null
}

interface ExamSummaryData {
  class: {
    id: string
    name: string
    level: number
  }
  term: {
    id: string
    name: string
  }
  subjectColumns: SubjectColumn[]
  studentRows: StudentRow[]
  summary: {
    totalStudents: number
    totalSubjects: number
    studentsWithExamScores: number
    studentsWithCAScores: number
    studentsWithFinalScores: number
  }
}

export default function DoSExamsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [data, setData] = useState<ExamSummaryData | null>(null)
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
      const response = await fetch('/api/dos/exams/class-exam-summary')
      
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

  const fetchExamSummary = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(
        `/api/dos/exams/class-exam-summary?classId=${selectedClassId}`
      )
      
      const result = await response.json()
      
      console.log('📡 [Exam Summary] API Response:', { status: response.status, result })
      
      if (!response.ok) {
        const errorMsg = result.error || result.message || 'Failed to fetch exam summary'
        console.error('❌ [Exam Summary] API Error:', errorMsg)
        if (result.details) {
          console.error('❌ [Exam Summary] Error Details:', result.details)
        }
        throw new Error(errorMsg)
      }

      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch exam summary')
      }
    } catch (err) {
      console.error('❌ [Exam Summary] Fetch Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch exam summary')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      fetchExamSummary()
    }
  }, [selectedClassId, fetchExamSummary])

  const handleRefresh = () => {
    if (selectedClassId) {
      fetchExamSummary(true)
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

    const headers = ['Adm No', 'Student Name', 'Stream']
    data.subjectColumns.forEach(s => {
      headers.push(`${s.subjectCode} Exam (80)`, `${s.subjectCode} CA (20)`, `${s.subjectCode} Final (100)`)
    })
    headers.push('Overall Average')

    const rows = filteredAndSortedStudents.map(student => {
      const row = [
        student.admissionNumber,
        student.fullName,
        student.stream || '-'
      ]
      data.subjectColumns.forEach(s => {
        const scores = student.subjectScores[s.subjectCode]
        row.push(
          formatScore(scores?.examScore),
          formatScore(scores?.caScore),
          formatScore(scores?.finalScore)
        )
      })
      row.push(formatScore(student.overallAverage))
      return row
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Exam_Summary_${data.class.name}_${data.term.name}.csv`
    a.click()
  }

  const handlePrint = () => {
    if (!data) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Exam Summary - ${data.class.name} (${data.term.name})</title>
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
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px 2px;
              text-align: center;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .adm-col, .name-col {
              text-align: left;
            }
            .exam-col { background-color: #fff3cd; }
            .ca-col { background-color: #d1ecf1; }
            .final-col { background-color: #d4edda; font-weight: bold; }
            .score-high { color: #155724; }
            .score-medium { color: #856404; }
            .score-low { color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Exam Summary (Exam 80% + CA 20% = Final 100%)</h1>
            <p><strong>${data.class.name}</strong> - ${data.term.name}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th rowspan="2" class="adm-col">Adm No.</th>
                <th rowspan="2" class="name-col">Student Name</th>
                <th rowspan="2">Stream</th>
                ${data.subjectColumns.map(s => `<th colspan="3">${s.subjectCode}</th>`).join('')}
                <th rowspan="2">Avg</th>
              </tr>
              <tr>
                ${data.subjectColumns.map(() => '<th class="exam-col">Exam<br/>(80)</th><th class="ca-col">CA<br/>(20)</th><th class="final-col">Final<br/>(100)</th>').join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredAndSortedStudents.map(student => `
                <tr>
                  <td class="adm-col">${student.admissionNumber}</td>
                  <td class="name-col">${student.fullName}</td>
                  <td>${student.stream || '-'}</td>
                  ${data.subjectColumns.map(s => {
                    const scores = student.subjectScores[s.subjectCode]
                    return `
                      <td class="exam-col">${formatScore(scores?.examScore)}</td>
                      <td class="ca-col">${formatScore(scores?.caScore)}</td>
                      <td class="final-col">${formatScore(scores?.finalScore)}</td>
                    `
                  }).join('')}
                  <td class="final-col">${formatScore(student.overallAverage)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const formatScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return '-'
    return score.toFixed(1)
  }

  const getScoreColor = (score: number | null | undefined, maxScore: number): string => {
    if (score === null || score === undefined) return 'text-gray-400'
    const percentage = (score / maxScore) * 100
    if (percentage >= 75) return 'text-green-600 font-semibold'
    if (percentage >= 50) return 'text-yellow-600 font-medium'
    return 'text-red-600 font-semibold'
  }

  const getScoreBgColor = (score: number | null | undefined, maxScore: number): string => {
    if (score === null || score === undefined) return 'bg-gray-50'
    const percentage = (score / maxScore) * 100
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
        } else if (sortColumn.includes('-exam')) {
          const subjectCode = sortColumn.replace('-exam', '')
          aVal = a.subjectScores[subjectCode]?.examScore ?? -1
          bVal = b.subjectScores[subjectCode]?.examScore ?? -1
        } else if (sortColumn.includes('-ca')) {
          const subjectCode = sortColumn.replace('-ca', '')
          aVal = a.subjectScores[subjectCode]?.caScore ?? -1
          bVal = b.subjectScores[subjectCode]?.caScore ?? -1
        } else if (sortColumn.includes('-final')) {
          const subjectCode = sortColumn.replace('-final', '')
          aVal = a.subjectScores[subjectCode]?.finalScore ?? -1
          bVal = b.subjectScores[subjectCode]?.finalScore ?? -1
        } else {
          aVal = 0
          bVal = 0
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
          title="Failed to load exam data"
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Exam Results</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            View exam scores (80%), CA scores (20%), and final marks (100%) for all students
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            title="With Exam Scores"
            value={data.summary.studentsWithExamScores.toString()}
            subtitle={`${((data.summary.studentsWithExamScores / data.summary.totalStudents) * 100).toFixed(1)}% coverage`}
            color={data.summary.studentsWithExamScores === data.summary.totalStudents ? "green" : "yellow"}
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

      {/* Exam Summary Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base sm:text-lg">Exam Summary - {data.class.name} ({data.term.name})</span>
              <Badge variant="outline" className="self-start sm:self-auto">
                Exam (80%) + CA (20%) = Final (100%)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-3">
              {filteredAndSortedStudents.map((student) => {
                const avgScore = student.overallAverage ?? 0
                const avgPercentage = (avgScore / 100) * 100
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
                    <div className="space-y-3">
                      {data.subjectColumns.map((subject) => {
                        const scores = student.subjectScores[subject.subjectCode]
                        
                        return (
                          <div key={subject.subjectId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              {subject.subjectCode} - {subject.subjectName}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-yellow-50 dark:bg-yellow-900 p-2 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Exam (80)</p>
                                <p className={`text-sm font-mono font-semibold ${getScoreColor(scores?.examScore, 80)}`}>
                                  {formatScore(scores?.examScore)}
                                </p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">CA (20)</p>
                                <p className={`text-sm font-mono font-semibold ${getScoreColor(scores?.caScore, 20)}`}>
                                  {formatScore(scores?.caScore)}
                                </p>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900 p-2 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">Final (100)</p>
                                <p className={`text-sm font-mono font-bold ${getScoreColor(scores?.finalScore, 100)}`}>
                                  {formatScore(scores?.finalScore)}
                                </p>
                              </div>
                            </div>
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
                      rowSpan={2}
                      className="p-3 text-left font-semibold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r-2 border-gray-300"
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
                      rowSpan={2}
                      className="p-3 text-left font-semibold text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 sticky left-[120px] bg-gray-50 dark:bg-gray-800 z-10 border-r-2 border-gray-300"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Student Name
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th rowSpan={2} className="p-3 text-left font-semibold text-sm border-r-2 border-gray-300 min-w-[100px]">Stream</th>
                    {data.subjectColumns.map((subject) => (
                      <th
                        key={subject.subjectId}
                        colSpan={3}
                        className="p-3 text-center font-semibold text-sm border-r-2 border-gray-300"
                        title={subject.subjectName}
                      >
                        {subject.subjectCode}
                      </th>
                    ))}
                    <th 
                      rowSpan={2}
                      className="p-3 text-center font-bold text-sm bg-blue-50 dark:bg-blue-900 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800"
                      onClick={() => handleSort('average')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Overall<br/>Average
                        {sortColumn === 'average' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                  </tr>
                  <tr>
                    {data.subjectColumns.map((subject) => (
                      <React.Fragment key={subject.subjectId}>
                        <th
                          className="p-2 text-center text-xs font-medium bg-yellow-50 dark:bg-yellow-900 cursor-pointer hover:bg-yellow-100"
                          onClick={() => handleSort(`${subject.subjectCode}-exam`)}
                        >
                          Exam<br/>(80)
                        </th>
                        <th
                          className="p-2 text-center text-xs font-medium bg-blue-50 dark:bg-blue-900 cursor-pointer hover:bg-blue-100"
                          onClick={() => handleSort(`${subject.subjectCode}-ca`)}
                        >
                          CA<br/>(20)
                        </th>
                        <th
                          className="p-2 text-center text-xs font-medium bg-green-50 dark:bg-green-900 cursor-pointer hover:bg-green-100 border-r-2 border-gray-300"
                          onClick={() => handleSort(`${subject.subjectCode}-final`)}
                        >
                          Final<br/>(100)
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedStudents.map((student, idx) => (
                    <tr key={student.studentId} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'}`}>
                      <td className="p-3 font-mono text-sm sticky left-0 bg-inherit z-10 border-r-2 border-gray-200">
                        {student.admissionNumber}
                      </td>
                      <td className="p-3 font-medium sticky left-[120px] bg-inherit z-10 border-r-2 border-gray-200">
                        {student.fullName}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400 border-r-2 border-gray-200">
                        {student.stream || '-'}
                      </td>
                      {data.subjectColumns.map((subject) => {
                        const scores = student.subjectScores[subject.subjectCode]
                        return (
                          <React.Fragment key={subject.subjectId}>
                            <td className={`p-3 text-center font-mono text-sm bg-yellow-50 dark:bg-yellow-900 ${getScoreColor(scores?.examScore, 80)}`}>
                              {formatScore(scores?.examScore)}
                            </td>
                            <td className={`p-3 text-center font-mono text-sm bg-blue-50 dark:bg-blue-900 ${getScoreColor(scores?.caScore, 20)}`}>
                              {formatScore(scores?.caScore)}
                            </td>
                            <td className={`p-3 text-center font-mono text-sm bg-green-50 dark:bg-green-900 font-bold border-r-2 border-gray-200 ${getScoreColor(scores?.finalScore, 100)}`}>
                              {formatScore(scores?.finalScore)}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td className={`p-3 text-center font-bold font-mono bg-blue-50 dark:bg-blue-900 ${getScoreColor(student.overallAverage, 100)}`}>
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
                <li>• <span className="bg-yellow-100 px-1 rounded">Exam (80)</span> - Exam score out of 80 marks</li>
                <li>• <span className="bg-blue-100 px-1 rounded">CA (20)</span> - Continuous Assessment average out of 20 marks</li>
                <li>• <span className="bg-green-100 px-1 rounded font-semibold">Final (100)</span> - Total score (Exam + CA) out of 100 marks</li>
                <li>• <span className="text-green-600 font-semibold">Green</span> = 75%+, <span className="text-yellow-600 font-medium">Yellow</span> = 50-74%, <span className="text-red-600 font-semibold">Red</span> = Below 50%</li>
                <li>• Click column headers to sort by that column</li>
                <li>• Use filters to find students within specific score ranges</li>
                <li>• Export to CSV or Print for physical records</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
