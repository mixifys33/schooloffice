'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Marks Entry Selection Page
 * Allows teachers to choose between CA marks entry and Exam marks entry
 * for a specific class and subject
 */

function MarksSelectionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const className = searchParams.get('className') || 'Selected Class'
  const subjectName = searchParams.get('subjectName') || 'Selected Subject'

  const handleCAEntry = () => {
    // Redirect to CA assessments page with class and subject
    router.push(`/teacher/assessments/ca-entry?classId=${classId}&subjectId=${subjectId}`)
  }

  const handleExamEntry = () => {
    // Redirect to Exam assessments page with class and subject
    router.push(`/teacher/assessments/exam?classId=${classId}&subjectId=${subjectId}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Navigation */}
        <Link
          href="/teacher"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
              <BookOpen className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                Enter Marks
              </h1>
              <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                {className} • {subjectName}
              </p>
            </div>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* CA Marks Entry Card */}
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-[var(--accent-primary)]">
            <button
              onClick={handleCAEntry}
              className="w-full p-6 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <ClipboardCheck className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                    Enter CA Marks
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    Continuous Assessment marks for tests, assignments, projects, and quizzes
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[var(--accent-primary)] font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Enter CA Marks</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          </Card>

          {/* Exam Marks Entry Card */}
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-[var(--accent-primary)]">
            <button
              onClick={handleExamEntry}
              className="w-full p-6 text-left"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                  <FileText className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                    Enter Exam Marks
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    End of term examination marks for BOT, MID, and EOT exams
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[var(--accent-primary)] font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Enter Exam Marks</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          </Card>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                About Marks Entry
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• CA Marks: Multiple entries per term (tests, assignments, projects)</li>
                <li>• Exam Marks: One entry per exam period (BOT, MID, EOT)</li>
                <li>• Final grade calculation: CA (20%) + Exam (80%)</li>
                <li>• You can save drafts and submit final marks when ready</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarksSelectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <MarksSelectionContent />
    </Suspense>
  )
}
