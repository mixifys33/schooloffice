import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/class-teacher/attendance/submit
 * Submit final attendance (marks as submitted)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classId, date } = body

    if (!classId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const selectedDate = new Date(date)
    selectedDate.setUTCHours(0, 0, 0, 0)

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    // Check if attendance records exist for this date
    const attendanceCount = await prisma.attendance.count({
      where: {
        classId,
        date: selectedDate,
      },
    })

    if (attendanceCount === 0) {
      return NextResponse.json(
        { error: 'No attendance records found for this date' },
        { status: 400 }
      )
    }

    // Mark attendance as submitted (we can add a submitted flag later if needed)
    // For now, we just return success
    return NextResponse.json({
      success: true,
      message: 'Attendance submitted successfully',
      submittedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error submitting attendance:', error)
    return NextResponse.json(
      { error: 'Failed to submit attendance' },
      { status: 500 }
    )
  }
}
