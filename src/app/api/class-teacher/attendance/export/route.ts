import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AttendanceStatus } from '@prisma/client'

/**
 * GET /api/class-teacher/attendance/export
 * Export attendance data as CSV
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
    const format = searchParams.get('format') || 'csv'

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
            class: {
              include: {
                students: {
                  where: { status: 'ACTIVE' },
                  orderBy: { firstName: 'asc' },
                },
              },
            },
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

    // Get all attendance records for the date range
    const records = await prisma.attendance.findMany({
      where: {
        classId: assignedClass.id,
        date: {
          gte: start,
          lte: end,
        },
      },
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
        { date: 'asc' },
        { student: { firstName: 'asc' } },
      ],
    })

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        ['Date', 'Student Name', 'Admission Number', 'Status', 'Remarks'],
      ]

      records.forEach(record => {
        csvRows.push([
          record.date.toISOString().split('T')[0],
          `${record.student.firstName} ${record.student.lastName}`,
          record.student.admissionNumber,
          record.status,
          record.remarks || '',
        ])
      })

      const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-${assignedClass.name}-${startDate}-${endDate}.csv"`,
        },
      })
    } else {
      // Return JSON format
      return NextResponse.json({
        class: {
          id: assignedClass.id,
          name: assignedClass.name,
        },
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        records: records.map(record => ({
          date: record.date.toISOString().split('T')[0],
          studentId: record.studentId,
          studentName: `${record.student.firstName} ${record.student.lastName}`,
          admissionNumber: record.student.admissionNumber,
          status: record.status,
          remarks: record.remarks,
        })),
      })
    }
  } catch (error) {
    console.error('Error exporting attendance:', error)
    return NextResponse.json(
      { error: 'Failed to export attendance' },
      { status: 500 }
    )
  }
}
