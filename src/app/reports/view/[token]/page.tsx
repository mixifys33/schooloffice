'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

/**
 * Report Card View Page
 * Displays report card via secure link
 * Requirements: 7.5 - Deliver via SMS link or email for paid students
 */

interface ReportCardData {
  student: {
    name: string
    admissionNumber: string
    className: string
    streamName?: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    logo?: string
  }
  term: {
    name: string
    academicYear: string
  }
  subjects: {
    name: string
    score: number
    maxScore: number
    percentage: number
    grade?: string
    remarks?: string
  }[]
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    position: number
    totalStudents: number
    overallGrade?: string
  }
  remarks: {
    teacherRemarks?: string
    headTeacherRemarks?: string
  }
  generatedAt: string
}

export default function ReportCardViewPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null)

  useEffect(() => {
    const fetchReportCard = async () => {
      try {
        const response = await fetch(`/api/reports/view/${token}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load report card')
        }

        const data = await response.json()
        setReportCard(data.reportCard)
        setError(null)
      } catch (err) {
        console.error('Error fetching report card:', err)
        setError(err instanceof Error ? err.message : 'Unable to load report card')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchReportCard()
    }
  }, [token])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <SkeletonLoader variant="card" count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <AlertBanner
            type="danger"
            message={error}
          />
          <div className="mt-4 text-center">
            <p className="text-muted-foreground mb-4">
              This link may have expired or is invalid. Please contact your school for a new link.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/login'}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!reportCard) {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <AlertBanner
            type="warning"
            message="Report card not found"
          />
        </div>
      </div>
    )
  }

  const getGradeColor = (grade?: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 'text-[var(--chart-green)]'
      case 'B': return 'text-[var(--chart-blue)]'
      case 'C': return 'text-[var(--chart-yellow)]'
      case 'D': return 'text-[var(--chart-yellow)]'
      default: return 'text-[var(--chart-red)]'
    }
  }

  const isPromoted = ['A', 'B', 'C', 'D'].includes(reportCard.summary.overallGrade?.toUpperCase() || '')

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] print:bg-[var(--bg-main)]">
      {/* Print/Download buttons - hidden when printing */}
      <div className="print:hidden sticky top-0 bg-[var(--bg-main)] border-b p-4 flex justify-end gap-2 z-10">
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0">
        <div className="bg-[var(--bg-main)] rounded-lg shadow-lg print:shadow-none p-6 sm:p-8">
          {/* Header */}
          <div className="text-center border-b-4 border-double border-[var(--border-strong)] pb-6 mb-6">
            {reportCard.school.logo && (
              <img
                src={reportCard.school.logo}
                alt="School Logo"
                className="w-20 h-20 mx-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--info-dark)]">
              {reportCard.school.name}
            </h1>
            {reportCard.school.address && (
              <p className="text-sm text-[var(--text-secondary)] mt-1">{reportCard.school.address}</p>
            )}
            {reportCard.school.phone && (
              <p className="text-sm text-[var(--text-secondary)]">Tel: {reportCard.school.phone}</p>
            )}
            <h2 className="text-xl font-bold mt-4 tracking-widest">STUDENT REPORT CARD</h2>
            <p className="text-[var(--text-secondary)] mt-1">
              {reportCard.term.name} - {reportCard.term.academicYear}
            </p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--bg-surface)] p-4 rounded-lg mb-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase">Student Name</p>
              <p className="font-bold">{reportCard.student.name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase">Admission No.</p>
              <p className="font-bold">{reportCard.student.admissionNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase">Class</p>
              <p className="font-bold">
                {reportCard.student.className}
                {reportCard.student.streamName && ` (${reportCard.student.streamName})`}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase">Position</p>
              <p className="font-bold">
                {reportCard.summary.position} of {reportCard.summary.totalStudents}
              </p>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--info-dark)] text-[var(--white-pure)]">
                  <th className="border border-[var(--border-default)] p-2 text-left">Subject</th>
                  <th className="border border-[var(--border-default)] p-2 text-center">Marks</th>
                  <th className="border border-[var(--border-default)] p-2 text-center">Percentage</th>
                  <th className="border border-[var(--border-default)] p-2 text-center">Grade</th>
                  <th className="border border-[var(--border-default)] p-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjects.map((subject, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-[var(--bg-main)]' : 'bg-[var(--bg-surface)]'}>
                    <td className="border border-[var(--border-default)] p-2">{subject.name}</td>
                    <td className="border border-[var(--border-default)] p-2 text-center">
                      {subject.score}/{subject.maxScore}
                    </td>
                    <td className="border border-[var(--border-default)] p-2 text-center">
                      {subject.percentage.toFixed(1)}%
                    </td>
                    <td className={`border border-[var(--border-default)] p-2 text-center font-bold ${getGradeColor(subject.grade)}`}>
                      {subject.grade || '-'}
                    </td>
                    <td className="border border-[var(--border-default)] p-2 text-sm">
                      {subject.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gradient-to-r from-blue-900 to-blue-700 text-[var(--white-pure)] p-4 rounded-lg mb-6">
            <div className="text-center">
              <p className="text-xs opacity-80 uppercase">Total Marks</p>
              <p className="text-2xl font-bold">
                {reportCard.summary.totalMarks}/{reportCard.summary.totalMaxMarks}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80 uppercase">Average</p>
              <p className="text-2xl font-bold">{reportCard.summary.average.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80 uppercase">Overall Grade</p>
              <p className="text-2xl font-bold">{reportCard.summary.overallGrade || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80 uppercase">Position</p>
              <p className="text-2xl font-bold">
                {reportCard.summary.position}/{reportCard.summary.totalStudents}
              </p>
            </div>
          </div>

          {/* Promotion Status */}
          <div className={`text-center p-4 rounded-lg mb-6 font-bold text-lg ${
            isPromoted
              ? 'bg-[var(--success-light)] text-[var(--success-dark)] border-2 border-[var(--success)]'
              : 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-2 border-[var(--danger)]'
          }`}>
            {isPromoted
              ? `PROMOTED TO NEXT CLASS - Grade: ${reportCard.summary.overallGrade}`
              : `REQUIRES IMPROVEMENT - Grade: ${reportCard.summary.overallGrade || 'N/A'}`
            }
          </div>

          {/* Remarks */}
          <div className="space-y-4 mb-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-xs text-[var(--text-muted)] uppercase font-bold mb-2">
                Class Teacher&apos;s Remarks
              </h3>
              <p className="text-[var(--text-primary)]">
                {reportCard.remarks.teacherRemarks || 'No remarks provided.'}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-xs text-[var(--text-muted)] uppercase font-bold mb-2">
                Head Teacher&apos;s Remarks
              </h3>
              <p className="text-[var(--text-primary)]">
                {reportCard.remarks.headTeacherRemarks || 'No remarks provided.'}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-12 print:mt-8">
            <div className="text-center">
              <div className="border-t border-[var(--border-default)] pt-2 mt-12">
                <p className="text-sm">Class Teacher</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-[var(--border-default)] pt-2 mt-12">
                <p className="text-sm">Head Teacher</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-[var(--border-default)] pt-2 mt-12">
                <p className="text-sm">Parent/Guardian</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-[var(--text-muted)] mt-8 pt-4 border-t">
            <p>Generated on: {new Date(reportCard.generatedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p className="mt-1">This is a computer-generated report card.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
