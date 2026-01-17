/**
 * Teacher Attendance API Route
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * - GET: Get assigned classes with attendance status for today
 * - Validate teacher assignment before allowing entry
 * - Implement time-based locking based on cutoff configuration
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { schoolSettingsService, AttendanceSettings } from '@/services/school-settings.service'

/**
 * Check if current time is past the attendance cutoff time
 */
function isAfterCutoffTime(cutoffTime: string): boolean {
  const now = new Date()
  const [hours, minutes] = cutoffTime.split(':').map(Number)
  
  const cutoff = new Date()
  cutoff.setHours(hours, minutes, 0, 0)
  
  return now > cutoff
}

/**
 * GET /api/teacher/attendance
 * Get assigned classes with attendance status for today
 * Requirements: 4.1, 4.6 - Display assigned classes, validate teacher assignment
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff/teacher record
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Get attendance settings for lock state
    // Requirements: 4.3, 4.4, 4.5 - Time-based locking
    const attendanceSettings = await schoolSettingsService.getSettings<AttendanceSettings>(
      schoolId,
      'attendance'
    )

    const cutoffTime = attendanceSettings.absentCutoffTime || '17:00'
    const isLocked = isAfterCutoffTime(cutoffTime)

    // Get today's date normalized to start of day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get classes assigned to this teacher via StaffClass
    // Requirements: 4.6 - Only assigned classes
    const staffClasses = await prisma.staffClass.findMany({
      where: { staffId: staff.id },
      include: {
        class: {
          include: {
            streams: true,
            _count: {
              select: { students: { where: { status: 'ACTIVE' } } }
            }
          }
        }
      }
    })

    // Get attendance records for today for these classes
    const classIds = staffClasses.map(sc => sc.classId)
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        classId: { in: classIds },
        date: today,
      },
      select: {
        classId: true,
        studentId: true,
      }
    })

    // Group attendance by class to determine status
    const attendanceByClass = new Map<string, Set<string>>()
    todayAttendance.forEach(record => {
      if (!attendanceByClass.has(record.classId)) {
        attendanceByClass.set(record.classId, new Set())
      }
      attendanceByClass.get(record.classId)!.add(record.studentId)
    })

    // Build response with attendance status
    const classes = staffClasses.map(sc => {
      const studentCount = sc.class._count.students
      const attendedStudents = attendanceByClass.get(sc.classId)?.size || 0
      const attendanceStatus = attendedStudents >= studentCount && studentCount > 0 
        ? 'done' 
        : isLocked 
          ? 'locked' 
          : 'not_taken'

      return {
        id: sc.id,
        classId: sc.classId,
        className: sc.class.name,
        streamName: sc.class.streams[0]?.name || null,
        studentCount,
        attendanceStatus,
        isLocked: isLocked && attendanceStatus !== 'done',
        lockMessage: isLocked && attendanceStatus !== 'done' 
          ? `Attendance cutoff time (${cutoffTime}) has passed. Contact administration for approval.`
          : undefined
      }
    })

    return NextResponse.json({
      classes,
      lockState: {
        isLocked,
        cutoffTime,
        canEdit: !isLocked,
        message: isLocked 
          ? `Attendance cutoff time (${cutoffTime}) has passed. Contact administration for approval to make changes.`
          : undefined
      },
      date: today.toISOString()
    })
  } catch (error) {
    console.error('Error fetching teacher attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
