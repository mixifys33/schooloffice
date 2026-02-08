'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Parent Portal - Academic Performance View
 * Requirement 16.3: Display report cards and exam results for children
 */

// Mock data - in production, this would come from API
const mockAcademicsData = {
  children: [
    {
      id: 'student-1',
      name: 'Alice Doe',
      admissionNumber: 'ADM001',
      className: 'Primary 5',
      streamName: 'A',
      reportCards: [
        {
          id: 'rc-1',
          termName: 'Term 3 2025',
          academicYear: '2025',
          publishedAt: '2025-12-01',
          isAccessible: true,
          summary: {
            totalMarks: 720,
            totalMaxMarks: 900,
            average: 80.0,
            position: 5,
            totalStudents: 35,
            overallGrade: 'B',
          },
          subjects: [
            { name: 'Mathematics', score: 85, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'English', score: 78, maxScore: 100, grade: 'B', remarks: 'Very Good' },
            { name: 'Science', score: 82, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Social Studies', score: 75, maxScore: 100, grade: 'B', remarks: 'Very Good' },
            { name: 'Kiswahili', score: 70, maxScore: 100, grade: 'B', remarks: 'Good' },
            { name: 'Religious Education', score: 88, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Creative Arts', score: 72, maxScore: 100, grade: 'B', remarks: 'Good' },
            { name: 'Physical Education', score: 90, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Agriculture', score: 80, maxScore: 100, grade: 'A', remarks: 'Very Good' },
          ],
          remarks: {
            teacherRemarks: 'Alice has shown consistent improvement this term. Keep up the good work!',
            headTeacherRemarks: 'A dedicated student with great potential. Encouraged to maintain focus.',
          },
        },
        {
          id: 'rc-2',
          termName: 'Term 2 2025',
          academicYear: '2025',
          publishedAt: '2025-08-15',
          isAccessible: true,
          summary: {
            totalMarks: 695,
            totalMaxMarks: 900,
            average: 77.2,
            position: 7,
            totalStudents: 35,
            overallGrade: 'B',
          },
          subjects: [],
          remarks: {
            teacherRemarks: 'Good progress. Needs to work on Mathematics.',
            headTeacherRemarks: 'Satisfactory performance.',
          },
        },
      ],
    },
    {
      id: 'student-2',
      name: 'Bob Doe',
      admissionNumber: 'ADM002',
      className: 'Primary 3',
      streamName: 'B',
      reportCards: [
        {
          id: 'rc-3',
          termName: 'Term 3 2025',
          academicYear: '2025',
          publishedAt: '2025-12-01',
          isAccessible: true,
          summary: {
            totalMarks: 765,
            totalMaxMarks: 900,
            average: 85.0,
            position: 2,
            totalStudents: 32,
            overallGrade: 'A',
          },
          subjects: [
            { name: 'Mathematics', score: 92, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'English', score: 88, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Science', score: 85, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Social Studies', score: 80, maxScore: 100, grade: 'A', remarks: 'Very Good' },
            { name: 'Kiswahili', score: 78, maxScore: 100, grade: 'B', remarks: 'Very Good' },
            { name: 'Religious Education', score: 90, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Creative Arts', score: 82, maxScore: 100, grade: 'A', remarks: 'Very Good' },
            { name: 'Physical Education', score: 85, maxScore: 100, grade: 'A', remarks: 'Excellent' },
            { name: 'Agriculture', score: 85, maxScore: 100, grade: 'A', remarks: 'Excellent' },
          ],
          remarks: {
            teacherRemarks: 'Outstanding performance! Bob is a role model for his classmates.',
            headTeacherRemarks: 'Exceptional student. Keep up the excellent work!',
          },
        },
      ],
    },
  ],
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: 'bg-[var(--success-light)] text-[var(--success-dark)]',
    B: 'bg-[var(--info-light)] text-[var(--info-dark)]',
    C: 'bg-[var(--warning-light)] text-[var(--warning-dark)]',
    D: 'bg-[var(--warning-light)] text-[var(--warning-dark)]',
    E: 'bg-[var(--danger-light)] text-[var(--danger-dark)]',
    F: 'bg-[var(--danger)] text-[var(--danger-dark)]',
  }
  return colors[grade] || 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
}

export default function ParentAcademicsPage() {
  const [selectedChild, setSelectedChild] = useState(mockAcademicsData.children[0].id)
  const [selectedReportCard, setSelectedReportCard] = useState<string | null>(null)
  
  const child = mockAcademicsData.children.find(c => c.id === selectedChild)!
  const reportCard = selectedReportCard 
    ? child.reportCards.find(rc => rc.id === selectedReportCard)
    : child.reportCards[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Academic Performance</h1>
        <p className="text-[var(--text-secondary)] mt-1">View report cards and exam results for your children.</p>
      </div>

      {/* Child Selector */}
      {mockAcademicsData.children.length > 1 && (
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Child</label>
          <div className="flex gap-2 flex-wrap">
            {mockAcademicsData.children.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedChild(c.id)
                  setSelectedReportCard(null)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChild === c.id
                    ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report Card Selector */}
      <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Select Report Card</label>
        <div className="flex gap-2 flex-wrap">
          {child.reportCards.map((rc) => (
            <button
              key={rc.id}
              onClick={() => setSelectedReportCard(rc.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (selectedReportCard === rc.id || (!selectedReportCard && rc.id === child.reportCards[0].id))
                  ? 'bg-[var(--chart-blue)] text-[var(--white-pure)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              {rc.termName}
            </button>
          ))}
        </div>
      </div>

      {reportCard && (
        <>
          {/* Summary Card */}
          <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{child.name}</h2>
                <p className="text-[var(--text-secondary)]">
                  {child.className} {child.streamName && `(${child.streamName})`} • {reportCard.termName}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">Published: {formatDate(reportCard.publishedAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[var(--text-primary)]">{reportCard.summary.average.toFixed(1)}%</p>
                  <p className="text-sm text-[var(--text-muted)]">Average</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {reportCard.summary.position}<span className="text-lg">/{reportCard.summary.totalStudents}</span>
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Position</p>
                </div>
                <div className={`px-4 py-2 rounded-lg text-2xl font-bold ${getGradeColor(reportCard.summary.overallGrade || 'N/A')}`}>
                  {reportCard.summary.overallGrade || 'N/A'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-1">
                <span>Total: {reportCard.summary.totalMarks}/{reportCard.summary.totalMaxMarks}</span>
                <span>{((reportCard.summary.totalMarks / reportCard.summary.totalMaxMarks) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-[var(--bg-surface)] rounded-full h-3">
                <div
                  className="bg-[var(--chart-blue)] h-3 rounded-full transition-all"
                  style={{ width: `${(reportCard.summary.totalMarks / reportCard.summary.totalMaxMarks) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="subjects" className="bg-[var(--bg-main)] rounded-lg shadow-sm">
            <TabsList className="w-full justify-start border-b rounded-none px-4">
              <TabsTrigger value="subjects">Subject Results</TabsTrigger>
              <TabsTrigger value="remarks">Remarks</TabsTrigger>
            </TabsList>

            {/* Subject Results Tab */}
            <TabsContent value="subjects" className="p-6">
              {reportCard.subjects.length === 0 ? (
                <p className="text-[var(--text-muted)] text-center py-8">Detailed subject results not available for this term.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-default)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Subject</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Score</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Percentage</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Grade</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCard.subjects.map((subject, index) => (
                        <tr key={index} className="border-b border-[var(--border-default)]">
                          <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">{subject.name}</td>
                          <td className="py-3 px-4 text-sm text-[var(--text-primary)] text-center">
                            {subject.score}/{subject.maxScore}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--text-primary)] text-center">
                            {((subject.score / subject.maxScore) * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getGradeColor(subject.grade)}`}>
                              {subject.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{subject.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Remarks Tab */}
            <TabsContent value="remarks" className="p-6 space-y-4">
              <div className="p-4 bg-[var(--info-light)] rounded-lg border border-[var(--info-light)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Class Teacher&apos;s Remarks</h4>
                <p className="text-[var(--text-primary)]">{reportCard.remarks.teacherRemarks || 'No remarks provided.'}</p>
              </div>
              <div className="p-4 bg-[var(--success-light)] rounded-lg border border-[var(--success-light)]">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Head Teacher&apos;s Remarks</h4>
                <p className="text-[var(--text-primary)]">{reportCard.remarks.headTeacherRemarks || 'No remarks provided.'}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Download Button */}
          <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-4 flex justify-end">
            <button className="px-4 py-2 bg-[var(--chart-blue)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-2">
              <span>📄</span>
              Download Report Card (PDF)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
