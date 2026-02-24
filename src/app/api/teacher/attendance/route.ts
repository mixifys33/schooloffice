import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/teacher/attendance
 * Get teacher's assigned classes with attendance status for today
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        canTakeAttendance: true,
        teacherAssignments: {
          include: {
            class: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (!teacher.canTakeAttendance) {
      return NextResponse.json({ 
        error: 'You do not have permission to take attendance',
        classes: [],
        lockState: {
          isLocked: true,
          cutoffTime: '',
          canEdit: false,
          message: 'You do not have permission to take attendance. Contact your administrator.',
        }
      }, { status: 403 })
    }

    // Get unique classes from teacher assignments
    const uniqueClasses = new Map()
    teacher.teacherAssignments.forEach(ta => {
      if (!uniqueClasses.has(ta.classId)) {
        uniqueClasses.set(ta.classId, ta.class)
      }
    })

    // Get today's date (normalized to start of day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if attendance is locked (after cutoff time, e.g., 5 PM)
    const now = new Date()
    const cutoffHour = 17 // 5 PM
    const cutoffTime = new Date(today)
    cutoffTime.setHours(cutoffHour, 0, 0, 0)
    
    const isLocked = now > cutoffTime
    const canEdit = !isLocked

    // Build class list with attendance status
    const classes = await Promise.all(
      Array.from(uniqueClasses.values()).map(async (cls) => {
        // Get student count
        const studentCount = await prisma.student.count({
          where: {
            classId: cls.id,
            status: 'ACTIVE',
          },
        })

        // Check if attendance has been taken today
        const attendanceCount = await prisma.attendance.count({
          where: {
            classId: cls.id,
            date: today,
            recordedBy: teacher.id,
          },
        })

        const attendanceStatus = attendanceCount > 0 ? 'done' : (isLocked ? 'locked' : 'not_taken')

        return {
          id: cls.id,
          classId: cls.id,
          className: cls.name,
          streamName: null,
          studentCount,
          attendanceStatus,
          isLocked,
          lockMessage: isLocked ? `Attendance entry closed at ${cutoffHour}:00. Contact admin to reopen.` : undefined,
        }
      })
    )

    return NextResponse.json({
      classes,
      lockState: {
        isLocked,
        cutoffTime: cutoffTime.toISOString(),
        canEdit,
        message: isLocked ? `Attendance entry is locked after ${cutoffHour}:00. Contact your administrator to reopen.` : undefined,
      },
    })
  } catch (error) {
    console.error('Error fetching teacher attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
