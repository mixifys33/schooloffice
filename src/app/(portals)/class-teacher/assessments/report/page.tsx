'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, FileText, TrendingUp, Award, Download, Printer, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  teacherColors,
  errorMessages
} from '@/lib/teacher-ui-standards'

/**
 * Assessment Reports Page for Class Teacher Portal
 * Requirements: 5.7, 7.1, 7.2, 7.3
 * - Generate CA-only, Exam-only, or Final reports
 * - Preview and download reports
 * - Enhanced with class management features
 */

interface ReportOption {
  id: string
  title: string
  description: string
  type: 'ca-only' | 'exam-only' | 'final'
  icon: React.ReactNode
  color: string
}

interface ClassOption {
  id: string
  classId: string
  subjectId: string
  name: string
  subject: string
  subjectCode: string
}

interface ReportData {
  reportType: string
  class: { name: string; level: number }
  subject: { name: string; code: string }
  term: { name: string; academicYear: string }
  students: Array<{
    studentId: string
    studentName: string
    admissionNumber: string
    caScore: number
    caActivities: Array<{ name: string; type: string; score: number; maxScore: number }>
    examScore: number
    finalScore: number
    hasCAs: boolean
    hasExam: boolean
  }>
  classStats: {
    totalStudents: number
    averageCA: number
    averageExam: number
    averageFinal: number
    highestScore: number
    lowestScore: number
  }
  generatedAt: string
}

export default function ClassTeacherAssessmentReportsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetchingClasses, setFetchingClasses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [generating, setGenerating] = useState(false)

  // Report options
  const reportOptions: ReportOption[] = [
    {
      id: 'ca-only',
      title: 'CA-Only Performance Report',
      description: 'Shows all CA activities, scores per activity, average CA %, CA contribution (out of 20), and competency comments',
      type: 'ca-only',
      icon: <FileText className="h-5 w-5" />,
      color: 'text-[var(--chart-green)]'
    },
    {
      id: 'exam-only',
      title: 'Exam-Only Performance Report',
      description: 'Shows exam scores, exam contribution (out of 80), and status note about CA pending/incomplete',
      type: 'exam-only',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-[var(--chart-blue)]'
    },
    {
      id: 'final',
      title: 'Final Term Report Card',
      description: 'Complete report with CA contribution (20), Exam contribution (80), Final score (100), competency descriptors, teacher remark, DoS approval, and promotion decision',
      type: 'final',
      icon: <Award className="h-5 w-5" />,
      color: 'text-[var(--chart-purple)]'
    }
  ]

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch('/api/class-teacher/assessments/reports')
        if (!response.ok) throw new Error('Failed to fetch classes')
        const data = await response.json()
        setClasses(data.classes)
      } catch (err) {
        console.error('Error fetching classes:', err)
        setError('Failed to load classes')
      } finally {
        setFetchingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  const handleGenerateReport = async () => {
    if (!selectedClass || !selectedReportType) {
      setError('Please select both a class and report type')
      return
    }

    setGenerating(true)
    setError(null)
    setReportData(null)

    try {
      const selectedClassData = classes.find((c) => c.id === selectedClass)
      if (!selectedClassData) throw new Error('Class not found')

      const response = await fetch('/api/class-teacher/assessments/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassData.classId,
          subjectId: selectedClassData.subjectId,
          reportType: selectedReportType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      console.error('Error generating report:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrintReport = () => {
    if (!reportData) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const getReportContent = () => {
      if (reportData.reportType === 'ca-only') {
        return reportData.students.map((student) => `
          <tr>
            <td>${student.studentName}</td>
            <td>${student.admissionNumber}</td>
            <td>
              ${student.caActivities.map((ca) => `
                <div style="margin-bottom: 4px;">
                  ${ca.name}: ${ca.score}/${ca.maxScore}
                </div>
              `).join('')}
            </td>
            <td class="score-cell">${student.caScore.toFixed(2)}/20</td>
          </tr>
        `).join('')
      } else if (reportData.reportType === 'exam-only') {
        return reportData.students.map((student) => `
          <tr>
            <td>${student.studentName}</td>
            <td>${student.admissionNumber}</td>
            <td class="score-cell">${student.examScore.toFixed(2)}/80</td>
            <td>${student.hasCAs ? 'CA Complete' : 'CA Pending'}</td>
          </tr>
        `).join('')
      } else {
        return reportData.students.map((student) => `
          <tr>
            <td>${student.studentName}</td>
            <td>${student.admissionNumber}</td>
            <td class="score-cell">${student.caScore.toFixed(2)}/20</td>
            <td class="score-cell">${student.examScore.toFixed(2)}/80</td>
            <td class="score-cell"><strong>${student.finalScore.toFixed(2)}/100</strong></td>
          </tr>
        `).join('')
      }
    }

    const getTableHeaders = () => {
      if (reportData.reportType === 'ca-only') {
        return '<th>NAME</th><th>ADM NO.</th><th>CA ACTIVITIES</th><th>CA SCORE (20%)</th>'
      } else if (reportData.reportType === 'exam-only') {
        return '<th>NAME</th><th>ADM NO.</th><th>EXAM SCORE (80%)</th><th>CA STATUS</th>'
      } else {
        return '<th>NAME</th><th>ADM NO.</th><th>CA (20%)</th><th>EXAM (80%)</th><th>FINAL (100%)</th>'
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportData.class.name} - ${reportData.subject.name} Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              padding: 30px;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .header-info {
              display: flex;
              justify-content: center;
              gap: 30px;
              font-size: 14px;
              color: #6b7280;
              margin-top: 12px;
              flex-wrap: wrap;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 15px;
              margin: 20px 0;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .stat-item {
              text-align: center;
            }
            .stat-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .stat-value {
              font-size: 20px;
              font-weight: 600;
              color: #111827;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              border: 1px solid #e5e7eb;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: #6b7280;
              background: #f9fafb;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #f3f4f6;
            }
            .score-cell {
              font-family: 'Courier New', monospace;
              font-weight: 500;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 20px; }
              .stats-grid { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.class.name} - ${reportData.subject.name}</h1>
            <h2 style="font-size: 18px; color: #6b7280; margin-top: 8px;">
              ${reportOptions.find((opt) => opt.id === reportData.reportType)?.title}
            </h2>
            <div class="header-info">
              <div><strong>Term:</strong> ${reportData.term.name}</div>
              <div><strong>Academic Year:</strong> ${reportData.term.academicYear}</div>
              <div><strong>Total Students:</strong> ${reportData.classStats.totalStudents}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-label">Average CA</div>
              <div class="stat-value">${reportData.classStats.averageCA.toFixed(2)}/20</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Average Exam</div>
              <div class="stat-value">${reportData.classStats.averageExam.toFixed(2)}/80</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Average Final</div>
              <div class="stat-value">${reportData.classStats.averageFinal.toFixed(2)}/100</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Highest Score</div>
              <div class="stat-value">${reportData.classStats.highestScore.toFixed(2)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Lowest Score</div>
              <div class="stat-value">${reportData.classStats.lowestScore.toFixed(2)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>${getTableHeaders()}</tr>
            </thead>
            <tbody>
              ${getReportContent()}
            </tbody>
          </table>

          <div class="footer">
            <div>SchoolOffice.academy - Class Teacher Portal</div>
            <div style="margin-top: 8px;">Generated: ${new Date(reportData.generatedAt).toLocaleString()}</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const handleDownloadCSV = () => {
    if (!reportData) return

    const getCSVContent = () => {
      if (reportData.reportType === 'ca-only') {
        const headers = ['Name', 'Admission Number', 'CA Activities', 'CA Score (20%)']
        const rows = reportData.students.map((student) => [
          `"${student.studentName}"`,
          student.admissionNumber,
          `"${student.caActivities.map((ca) => `${ca.name}: ${ca.score}/${ca.maxScore}`).join('; ')}"`,
          `${student.caScore.toFixed(2)}/20`,
        ])
        return [headers, ...rows].map((row) => row.join(',')).join('\n')
      } else if (reportData.reportType === 'exam-only') {
        const headers = ['Name', 'Admission Number', 'Exam Score (80%)', 'CA Status']
        const rows = reportData.students.map((student) => [
          `"${student.studentName}"`,
          student.admissionNumber,
          `${student.examScore.toFixed(2)}/80`,
          student.hasCAs ? 'CA Complete' : 'CA Pending',
        ])
        return [headers, ...rows].map((row) => row.join(',')).join('\n')
      } else {
        const headers = ['Name', 'Admission Number', 'CA (20%)', 'Exam (80%)', 'Final (100%)']
        const rows = reportData.students.map((student) => [
          `"${student.studentName}"`,
          student.admissionNumber,
          `${student.caScore.toFixed(2)}/20`,
          `${student.examScore.toFixed(2)}/80`,
          `${student.finalScore.toFixed(2)}/100`,
        ])
        return [headers, ...rows].map((row) => row.join(',')).join('\n')
      }
    }

    const csvContent = getCSVContent()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${reportData.class.name}_${reportData.subject.name}_${reportData.reportType}_${new Date().toISOString().split('T')[0]}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/class-teacher/assessments"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessments
      </Link>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <BarChart3 className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Assessment Reports
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Generate CA-only, Exam-only, or Final term reports for your classes
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {fetchingClasses ? (
        <SkeletonLoader count={3} height={200} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Configuration */}
        <div className="lg:col-span-1">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="">Select a class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Report Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Report Type
                  </label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  >
                    <option value="">Select report type</option>
                    <option value="ca-only">CA-Only Report</option>
                    <option value="exam-only">Exam-Only Report</option>
                    <option value="final">Final Term Report</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleGenerateReport} 
                    disabled={generating || !selectedClass || !selectedReportType}
                    className="w-full gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    disabled={!reportData}
                    className="w-full gap-2"
                    onClick={handlePrintReport}
                  >
                    <Printer className="h-4 w-4" />
                    Print Report
                  </Button>

                  <Button 
                    variant="outline" 
                    disabled={!reportData}
                    className="w-full gap-2"
                    onClick={handleDownloadCSV}
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Options */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Available Report Types</CardTitle>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                Select the type of report you want to generate
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportOptions.map((option) => (
                  <div 
                    key={option.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedReportType === option.id
                        ? 'border-[var(--accent-primary)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]'
                        : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50'
                    }`}
                    onClick={() => setSelectedReportType(option.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${option.color.replace('text', 'bg-opacity-20 bg').replace('[', '').replace(']', '')}`}>
                        {option.icon}
                      </div>
                      <div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {option.title}
                        </h3>
                        <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                          {option.description}
                        </p>
                        <div className="mt-2">
                          <Badge variant={option.type === 'ca-only' ? 'secondary' : option.type === 'exam-only' ? 'outline' : 'default'}>
                            {option.type.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Report Preview</CardTitle>
              <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                {reportData ? 'Generated report data' : 'Preview of the selected report type'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-6 min-h-[300px]">
                {reportData ? (
                  <div>
                    <div className="mb-6">
                      <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                        {reportData.class.name} - {reportData.subject.name}
                      </h3>
                      <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                        {reportData.term.name} | {reportData.term.academicYear}
                      </p>
                    </div>

                    {/* Class Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-3 rounded-lg">
                        <div className="text-xs text-[var(--text-muted)]">Students</div>
                        <div className="text-lg font-semibold">{reportData.classStats.totalStudents}</div>
                      </div>
                      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-3 rounded-lg">
                        <div className="text-xs text-[var(--text-muted)]">Avg CA</div>
                        <div className="text-lg font-semibold">{reportData.classStats.averageCA.toFixed(1)}/20</div>
                      </div>
                      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-3 rounded-lg">
                        <div className="text-xs text-[var(--text-muted)]">Avg Exam</div>
                        <div className="text-lg font-semibold">{reportData.classStats.averageExam.toFixed(1)}/80</div>
                      </div>
                      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-3 rounded-lg">
                        <div className="text-xs text-[var(--text-muted)]">Avg Final</div>
                        <div className="text-lg font-semibold">{reportData.classStats.averageFinal.toFixed(1)}/100</div>
                      </div>
                      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-3 rounded-lg">
                        <div className="text-xs text-[var(--text-muted)]">Highest</div>
                        <div className="text-lg font-semibold">{reportData.classStats.highestScore.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Student Data Preview (first 5 students) */}
                    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">NAME</th>
                              {reportData.reportType === 'ca-only' && (
                                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">CA SCORE</th>
                              )}
                              {reportData.reportType === 'exam-only' && (
                                <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">EXAM SCORE</th>
                              )}
                              {reportData.reportType === 'final' && (
                                <>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">CA</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">EXAM</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)]">FINAL</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.students.slice(0, 5).map((student, index) => (
                              <tr key={student.studentId} className="border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                                <td className="px-4 py-2 text-sm">{student.studentName}</td>
                                {reportData.reportType === 'ca-only' && (
                                  <td className="px-4 py-2 text-sm font-mono">{student.caScore.toFixed(2)}/20</td>
                                )}
                                {reportData.reportType === 'exam-only' && (
                                  <td className="px-4 py-2 text-sm font-mono">{student.examScore.toFixed(2)}/80</td>
                                )}
                                {reportData.reportType === 'final' && (
                                  <>
                                    <td className="px-4 py-2 text-sm font-mono">{student.caScore.toFixed(2)}/20</td>
                                    <td className="px-4 py-2 text-sm font-mono">{student.examScore.toFixed(2)}/80</td>
                                    <td className="px-4 py-2 text-sm font-mono font-semibold">{student.finalScore.toFixed(2)}/100</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {reportData.students.length > 5 && (
                        <div className="px-4 py-2 text-xs text-center text-[var(--text-muted)] bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                          Showing 5 of {reportData.students.length} students
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedReportType ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4">
                      {selectedReportType === 'ca-only' && <FileText className="h-12 w-12 text-[var(--chart-green)] mx-auto" />}
                      {selectedReportType === 'exam-only' && <TrendingUp className="h-12 w-12 text-[var(--chart-blue)] mx-auto" />}
                      {selectedReportType === 'final' && <Award className="h-12 w-12 text-[var(--chart-purple)] mx-auto" />}
                    </div>
                    <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                      {reportOptions.find(opt => opt.id === selectedReportType)?.title}
                    </h3>
                    <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4')}>
                      Click "Generate Report" to load data for the selected class
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                      Select a Report Type
                    </h3>
                    <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                      Choose a report type from the options to see a preview
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  )
}