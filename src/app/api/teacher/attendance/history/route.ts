import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/teacher/attendance/history
 * Returns attendance history records for the logged-in teacher
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // Get teacher's assigned classes
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: {
        teacherId: teacher.id
      },
      select: {
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            streamName: true
          }
        }
      },
      distinct: ['classId']
    })

    const classIds = teacherAssignments.map(ta => ta.classId)

    // Get attendance records for these classes
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            streamName: true
          }
        },
        attendanceRecords: {
          select: {
            status: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 100 // Limit to last 100 records
    })

    // Transform records
    const records = attendanceRecords.map(record => {
      const presentCount = record.attendanceRecords.filter(r => r.status === 'PRESENT').length
      const absentCount = record.attendanceRecords.filter(r => r.status === 'ABSENT').length
      const lateCount = record.attendanceRecords.filter(r => r.status === 'LATE').length
      const totalStudents = record.attendanceRecords.length

      // Can edit if record is from today or yesterday
      const recordDate = new Date(record.date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const canEdit = recordDate >= yesterday

      return {
        id: record.id,
        date: record.date.toISOString(),
        classId: record.classId,
        className: record.class.name,
        streamName: record.class.streamName,
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        recordedAt: record.createdAt.toISOString(),
        canEdit
      }
    })

    // Get unique classes for filter dropdown
    const classes = teacherAssignments.map(ta => ({
      id: ta.class.id,
      name: ta.class.name + (ta.class.streamName ? ` - ${ta.class.streamName}` : '')
    }))

    return NextResponse.json({
      records,
      classes
    })

  } catch (error) {
    console.error('Error fetching attendance history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}
