import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AttendanceStatus } from '@prisma/client'

/**
 * GET /api/class-teacher/attendance/history
 * Fetch attendance history for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const studentId = searchParams.get('studentId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setUTCHours(23, 59, 59, 999)

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: {
        staffClasses: {
          include: {
            class: true,
          },
        },
      },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    const assignedClass = staff.staffClasses[0]?.class
    if (!assignedClass) {
      return NextResponse.json(
        { error: 'No class assigned' },
        { status: 400 }
      )
    }

    // Build query
    const where: any = {
      classId: assignedClass.id,
      date: {
        gte: start,
        lte: end,
      },
    }

    if (studentId) {
      where.studentId = studentId
    }

    // Get attendance records
    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { student: { firstName: 'asc' } },
      ],
    })

    // Group by date
    const groupedByDate = records.reduce((acc, record) => {
      const dateKey = record.date.toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push({
        studentId: record.studentId,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNumber: record.student.admissionNumber,
        status: record.status,
        remarks: record.remarks,
      })
      return acc
    }, {} as Record<string, any[]>)

    // Calculate statistics
    const totalRecords = records.length
    const presentCount = records.filter(r => r.status === AttendanceStatus.PRESENT).length
    const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT).length
    const lateCount = records.filter(r => r.status === AttendanceStatus.LATE).length
    const excusedCount = records.filter(r => r.status === AttendanceStatus.EXCUSED).length

    return NextResponse.json({
      records: groupedByDate,
      statistics: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate: totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0,
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching attendance history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}
