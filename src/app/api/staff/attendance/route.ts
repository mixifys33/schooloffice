/**
 * Staff Attendance API
 * Handles staff attendance recording and retrieval
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { staffManagementService } from '@/services/staff-management.service'

/**
 * GET /api/staff/attendance
 * Get staff attendance records
 * Query params: staffId, startDate, endDate, date (for single day summary)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // If date is provided, get school-wide summary for that date
    if (date && !staffId) {
      const summary = await staffManagementService.getSchoolStaffAttendanceSummary(
        schoolId,
        new Date(date)
      )
      return NextResponse.json({ summary })
    }

    // If staffId is provided, get individual attendance records
    if (staffId) {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate ? new Date(endDate) : new Date()
      
      const records = await staffManagementService.getStaffAttendance(staffId, start, end)
      return NextResponse.json({ records })
    }

    return NextResponse.json({ error: 'staffId or date parameter required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching staff attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff attendance' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/attendance
 * Record staff attendance
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can record attendance
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPUTY'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const body = await request.json()
    const { staffId, date, status, checkInAt, checkOutAt, lateMinutes, remarks, bulk } = body

    // Handle bulk attendance recording
    if (bulk && Array.isArray(bulk)) {
      const result = await staffManagementService.bulkRecordAttendance(
        schoolId,
        new Date(date),
        bulk,
        session.user.id
      )
      return NextResponse.json({
        success: true,
        message: `Recorded ${result.recorded} attendance records, ${result.failed} failed`,
        ...result,
      })
    }

    // Handle single attendance recording
    if (!staffId || !date || !status) {
      return NextResponse.json(
        { error: 'staffId, date, and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await staffManagementService.recordStaffAttendance(
      staffId,
      schoolId,
      new Date(date),
      status,
      session.user.id,
      {
        checkInAt: checkInAt ? new Date(checkInAt) : undefined,
        checkOutAt: checkOutAt ? new Date(checkOutAt) : undefined,
        lateMinutes,
        remarks,
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully',
      attendance: result,
    })
  } catch (error) {
    console.error('Error recording staff attendance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record attendance' },
      { status: 500 }
    )
  }
}
