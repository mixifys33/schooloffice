'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

/**
 * Student Portal Dashboard
 * Requirements: 16.1, 16.2, 16.3
 * - Timetable, results, and assignments sections
 * - Minimal interaction capabilities
 * - Read-only access enforced
 */

// Mock data - in production, this would come from API/session
const mockStudentData = {
  id: 'student-1',
  name: 'Alice Doe',
  admissionNumber: 'ADM001',
  className: 'Primary 5',
  streamName: 'A',
  status: 'ACTIVE' as const,
  photo: null,
  currentTerm: 'Term 1 2026',
  feeSummary: {
    totalFees: 500000,
    totalPaid: 350000,
    balance: 150000,
    hasArrears: true,
  },
  academicSummary: {
    lastTermAverage: 78.5,
    lastTermPosition: 5,
    totalStudents: 35,
    lastTermGrade: 'B',
  },
  attendanceSummary: {
    presentDays: 45,
    totalDays: 50,
    percentage: 90,
  },
  todaySchedule: [
    { period: 1, time: '8:00 - 8:40', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'Room 5A' },
    { period: 2, time: '8:45 - 9:25', subject: 'English', teacher: 'Mrs. Nambi', room: 'Room 5A' },
    { period: 3, time: '9:30 - 10:10', subject: 'Science', teacher: 'Mr. Wasswa', room: 'Lab 1' },
    { period: 4, time: '10:30 - 11:10', subject: 'Social Studies', teacher: 'Ms. Apio', room: 'Room 5A' },
    { period: 5, time: '11:15 - 11:55', subject: 'Kiswahili', teacher: 'Mr. Juma', room: 'Room 5A' },
  ],
  upcomingExams: [
    { subject: 'Mathematics', date: '2026-01-15', type: 'BOT' },
    { subject: 'English', date: '2026-01-16', type: 'BOT' },
  ],
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-UG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function StudentDashboard() {
  const student = mockStudentData

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Welcome Section */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.name}</h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1 text-sm">
              {student.className} {student.streamName && `(${student.streamName})`} • {student.admissionNumber}
            </p>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">{student.currentTerm}</p>
          </div>
          <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {student.status === 'ACTIVE' ? 'Active' : student.status}
          </Badge>
        </div>
      </div>

      {/* Summary Cards - Requirements: 16.1 - Timetable, results sections */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Academic Summary */}
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
            <Link href="/student/results" className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]">
              View →
            </Link>
          </div>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Last Term Average</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.academicSummary.lastTermAverage.toFixed(1)}%</p>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            Position {student.academicSummary.lastTermPosition}/{student.academicSummary.totalStudents}
          </p>
        </div>

        {/* Attendance Summary */}
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📅</span>
            <div className={`w-3 h-3 rounded-full ${
              student.attendanceSummary.percentage >= 90 ? 'bg-[var(--success)]' :
              student.attendanceSummary.percentage >= 80 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
            }`} />
          </div>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Attendance</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">{student.attendanceSummary.percentage}%</p>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {student.attendanceSummary.presentDays}/{student.attendanceSummary.totalDays} days
          </p>
        </div>

        {/* Fees Summary */}
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <Link href="/student/fees" className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]">
              View →
            </Link>
          </div>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Fee Balance</p>
          <p className={`text-2xl font-semibold ${student.feeSummary.hasArrears ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' : 'text-[var(--chart-green)] dark:text-[var(--success)]'}`}>
            {formatCurrency(student.feeSummary.balance)}
          </p>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            {student.feeSummary.hasArrears ? 'Outstanding' : 'Fully Paid'}
          </p>
        </div>
      </div>

      {/* Today's Schedule - Requirements: 16.1 - Timetable section */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Today&apos;s Schedule</h2>
          <Link href="/student/timetable" className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]">
            Full Timetable →
          </Link>
        </div>
        <div className="space-y-3">
          {student.todaySchedule.map((period) => (
            <div key={period.period} className="flex items-center gap-4 p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
              <div className="w-10 h-10 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg flex items-center justify-center text-[var(--text-primary)] dark:text-[var(--text-muted)] font-medium text-sm">
                P{period.period}
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{period.subject}</p>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{period.teacher} • {period.room}</p>
              </div>
              <div className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{period.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Exams */}
      {student.upcomingExams.length > 0 && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
          <h2 className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-4">Upcoming Exams</h2>
          <div className="space-y-3">
            {student.upcomingExams.map((exam, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div>
                  <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{exam.subject}</p>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{exam.type} Examination</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{formatDate(exam.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Requirements: 16.2 - Minimal interaction capabilities */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-4">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/student/timetable"
            className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          >
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Timetable</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Weekly schedule</p>
            </div>
          </Link>
          <Link
            href="/student/results"
            className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Results</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Report cards</p>
            </div>
          </Link>
          <Link
            href="/student/fees"
            className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
          >
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Fee Status</p>
              <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">View balance</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
