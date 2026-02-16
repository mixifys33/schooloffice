'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Info, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Marks Entry Page - Redirect to Assessments
 * This page redirects users to the new Assessments & Results section
 * which handles both CA and Exam entry
 */

export default function ClassTeacherMarksEntryPage() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/class-teacher/assessments')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/dashboard/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Info Card */}
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Marks Entry Has Moved
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Redirecting you to the new location...
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-slate-700 dark:text-slate-300">
              The marks entry feature is now part of the <strong>Assessments & Results</strong> section, 
              which provides a unified interface for managing both:
            </p>

            <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 ml-4">
              <li>
                <strong>CA (Continuous Assessment)</strong> - Tests, assignments, and classwork
              </li>
              <li>
                <strong>Exam Scores</strong> - End of term examinations
              </li>
            </ul>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    What you can do in Assessments & Results:
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Enter and manage CA scores (multiple entries per term)</li>
                    <li>• Enter and manage Exam scores (one exam per term)</li>
                    <li>• View assessment progress and statistics</li>
                    <li>• Submit scores for final approval</li>
                    <li>• Auto-save functionality to prevent data loss</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/dashboard/class-teacher/assessments')}
              className="flex-1"
            >
              Go to Assessments & Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/class-teacher')}
            >
              Back to Dashboard
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
            You will be automatically redirected in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  )
}
