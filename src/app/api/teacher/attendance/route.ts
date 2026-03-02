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

    // Get today's date in East Africa Time (EAT - UTC+3)
    const now = new Date()
    
    // Convert to EAT timezone
    const eatOffset = 3 * 60 // EAT is UTC+3 (180 minutes)
    const localOffset = now.getTimezoneOffset() // Get server's offset from UTC in minutes
    const eatTime = new Date(now.getTime() + (eatOffset + localOffset) * 60 * 1000)
    
    // Get today's date normalized to start of day in EAT
    const today = new Date(eatTime)
    today.setHours(0, 0, 0, 0)

    // Check if attendance is locked (after cutoff time, e.g., 5 PM EAT)
    const cutoffHour = 17 // 5 PM
    const cutoffTime = new Date(today)
    cutoffTime.setHours(cutoffHour, 0, 0, 0)
    
    const isLocked = eatTime > cutoffTime
    const canEdit = !isLocked
    
    // Format cutoff time for display
    const cutoffTimeDisplay = `${cutoffHour}:00 EAT`
    
    // Debug logging
    console.log('Attendance Lock Check:', {
      serverTime: now.toISOString(),
      serverHour: now.getHours(),
      eatTime: eatTime.toISOString(),
      eatHour: eatTime.getHours(),
      cutoffTime: cutoffTime.toISOString(),
      isLocked,
      canEdit
    })

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
          lockMessage: isLocked ? `Attendance entry closed at ${cutoffTimeDisplay}. Contact admin to reopen.` : undefined,
        }
      })
    )

    return NextResponse.json({
      classes,
      lockState: {
        isLocked,
        cutoffTime: cutoffTimeDisplay,
        canEdit,
        message: isLocked ? `Attendance entry is locked after ${cutoffTimeDisplay}. Contact your administrator to reopen.` : undefined,
      },
      debug: {
        serverTime: now.toISOString(),
        eatTime: eatTime.toISOString(),
        cutoffTime: cutoffTime.toISOString(),
        isLocked,
        currentHour: eatTime.getHours(),
      }
    })
  } catch (error) {
    console.error('Error fetching teacher attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
