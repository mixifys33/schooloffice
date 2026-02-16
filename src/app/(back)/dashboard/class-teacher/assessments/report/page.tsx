'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, FileText, TrendingUp, Award, Download, Printer, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography
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
  name: string
  subject: string
}

export default function ClassTeacherAssessmentReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedReportType, setSelectedReportType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data for classes
  const classes: ClassOption[] = [
    { id: '1', name: 'Form 4A', subject: 'Mathematics' },
    { id: '2', name: 'Form 4B', subject: 'Mathematics' },
    { id: '3', name: 'Form 3A', subject: 'Physics' },
    { id: '4', name: 'Form 3B', subject: 'Chemistry' },
  ]

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

  const handleGenerateReport = () => {
    if (!selectedClass || !selectedReportType) {
      setError('Please select both a class and report type')
      return
    }

    setLoading(true)
    setError(null)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      // In a real app, this would trigger report generation/download
      alert(`Generating ${selectedReportType} report for ${classes.find(c => c.id === selectedClass)?.name} - ${classes.find(c => c.id === selectedClass)?.subject}`)
    }, 1000)
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
                    disabled={loading || !selectedClass || !selectedReportType}
                    className="w-full gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    disabled={!selectedClass || !selectedReportType}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
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
                Preview of the selected report type
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-6 min-h-[300px]">
                {selectedReportType ? (
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
                      Preview of the {selectedReportType.replace('-', ' ')} report for the selected class
                    </p>
                    <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-4 text-left">
                      <div className="flex justify-between mb-2">
                        <span className={cn(typography.caption)}>Student Name</span>
                        <span className={cn(typography.caption)}>Score</span>
                      </div>
                      <div className="h-px bg-[var(--border-default)] dark:bg-[var(--border-strong)] my-2"></div>
                      <div className="flex justify-between mb-2">
                        <span>John Doe</span>
                        <span>16.33/20</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Jane Smith</span>
                        <span>18.50/20</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Robert Brown</span>
                        <span>14.75/20</span>
                      </div>
                      <div className="h-px bg-[var(--border-default)] dark:bg-[var(--border-strong)] my-2"></div>
                      <div className="flex justify-between font-medium">
                        <span>Average</span>
                        <span>16.53/20</span>
                      </div>
                    </div>
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
    </div>
  )
}