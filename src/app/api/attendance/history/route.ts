/**
 * Attendance History API Route
 * Requirement 5.6: Display absence reasons and patterns by student
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { AttendanceStatus } from '@/types/enums'

interface AbsencePattern {
  type: 'CONSECUTIVE' | 'WEEKLY' | 'FREQUENT'
  description: string
  dates: string[]
}

interface AttendanceHistoryRecord {
  id: string
  date: string
  period: number
  status: AttendanceStatus
  remarks?: string
}

interface StudentAttendanceHistory {
  studentId: string
  studentName: string
  records: AttendanceHistoryRecord[]
  patterns: AbsencePattern[]
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendancePercentage: number
  }
}

/**
 * Detect absence patterns from attendance records
 */
function detectAbsencePatterns(
  records: { date: Date; status: string }[]
): AbsencePattern[] {
  const patterns: AbsencePattern[] = []
  
  // Get absent dates
  const absentDates = records
    .filter(r => r.status === AttendanceStatus.ABSENT)
    .map(r => r.date)
    .sort((a, b) => a.getTime() - b.getTime())

  if (absentDates.length === 0) return patterns

  // Detect consecutive absences (3+ days in a row)
  let consecutiveStart = 0
  for (let i = 1; i <= absentDates.length; i++) {
    const isConsecutive = i < absentDates.length && 
      (absentDates[i].getTime() - absentDates[i-1].getTime()) <= 86400000 * 2 // Within 2 days (accounting for weekends)
    
    if (!isConsecutive) {
      const consecutiveCount = i - consecutiveStart
      if (consecutiveCount >= 3) {
        const consecutiveDates = absentDates.slice(consecutiveStart, i)
        patterns.push({
          type: 'CONSECUTIVE',
          description: `${consecutiveCount} consecutive days absent`,
          dates: consecutiveDates.map(d => d.toISOString().split('T')[0]),
        })
      }
      consecutiveStart = i
    }
  }

  // Detect weekly patterns (same day of week absences)
  const dayOfWeekCounts: Record<number, Date[]> = {}
  for (const date of absentDates) {
    const dayOfWeek = date.getDay()
    if (!dayOfWeekCounts[dayOfWeek]) {
      dayOfWeekCounts[dayOfWeek] = []
    }
    dayOfWeekCounts[dayOfWeek].push(date)
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (const [day, dates] of Object.entries(dayOfWeekCounts)) {
    if (dates.length >= 3) {
      patterns.push({
        type: 'WEEKLY',
        description: `Frequently absent on ${dayNames[parseInt(day)]}s (${dates.length} times)`,
        dates: dates.map(d => d.toISOString().split('T')[0]),
      })
    }
  }

  // Detect frequent absences (more than 5 in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentAbsences = absentDates.filter(d => d >= thirtyDaysAgo)
  if (recentAbsences.length >= 5) {
    patterns.push({
      type: 'FREQUENT',
      description: `${recentAbsences.length} absences in the last 30 days`,
      dates: recentAbsences.map(d => d.toISOString().split('T')[0]),
    })
  }

  return patterns
}

/**
 * GET /api/attendance/history
 * Get attendance history for a student with absence patterns
 * Query params: studentId, termId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const termId = searchParams.get('termId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      )
    }

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Build date filter based on term or default to last 90 days
    let dateFilter: { gte?: Date; lte?: Date } = {}
    
    if (termId) {
      const term = await prisma.term.findUnique({
        where: { id: termId },
      })
      if (term) {
        dateFilter = {
          gte: term.startDate,
          lte: term.endDate,
        }
      }
    } else {
      // Default to last 90 days
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      dateFilter = { gte: ninetyDaysAgo }
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId,
        date: dateFilter,
      },
      orderBy: { date: 'desc' },
    })

    // Group records by date to get unique days
    const uniqueDates = new Map<string, { status: string; date: Date }>()
    for (const record of attendanceRecords) {
      const dateKey = record.date.toISOString().split('T')[0]
      if (!uniqueDates.has(dateKey)) {
        uniqueDates.set(dateKey, { status: record.status, date: record.date })
      }
    }

    // Calculate summary
    let presentDays = 0
    let absentDays = 0
    let lateDays = 0

    for (const { status } of uniqueDates.values()) {
      switch (status) {
        case AttendanceStatus.PRESENT:
          presentDays++
          break
        case AttendanceStatus.ABSENT:
          absentDays++
          break
        case AttendanceStatus.LATE:
          lateDays++
          break
      }
    }

    const totalDays = uniqueDates.size
    const attendancePercentage = totalDays > 0
      ? Math.round(((presentDays + lateDays) / totalDays) * 100)
      : 0

    // Detect absence patterns
    const patterns = detectAbsencePatterns(
      Array.from(uniqueDates.values()).map(v => ({ date: v.date, status: v.status }))
    )

    // Format records for response
    const formattedRecords: AttendanceHistoryRecord[] = attendanceRecords.map(r => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      period: r.period,
      status: r.status as AttendanceStatus,
      remarks: r.remarks || undefined,
    }))

    const history: StudentAttendanceHistory = {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      records: formattedRecords,
      patterns,
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendancePercentage,
      },
    }

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching attendance history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}
