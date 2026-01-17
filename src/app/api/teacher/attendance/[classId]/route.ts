/**
 * Teacher Attendance API Route for Specific Class
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * - GET: Get students and attendance status for a specific class
 * - POST: Record attendance for students in the class
 * - Validate teacher assignment before allowing entry
 * - Implement time-based locking based on cutoff configuration
 * - Restrict to current day only
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, AttendanceStatus } from '@/types/enums'
import { schoolSettingsService, AttendanceSettings } from '@/services/school-settings.service'
import { attendanceService } from '@/services/attendance.service'
import { auditService } from '@/services/audit.service'

interface AttendanceRecordInput {
  studentId: string
  status: AttendanceStatus
  remarks?: string
}

/**
 * Check if current time is past the attendance cutoff time
 * Requirements: 4.3, 4.4 - Time-based locking
 */
function isAfterCutoffTime(cutoffTime: string): boolean {
  const now = new Date()
  const [hours, minutes] = cutoffTime.split(':').map(Number)
  const cutoff = new Date()
  cutoff.setHours(hours, minutes, 0, 0)
  return now > cutoff
}

/**
 * GET /api/teacher/attendance/[classId]
 * Get students and attendance status for a specific class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params
    const userRole = session.user.activeRole || session.user.role
    
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context' }, { status: 400 })
    }

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'No staff profile' }, { status: 404 })
    }

    const staffClass = await prisma.staffClass.findFirst({
      where: { staffId: staff.id, classId },
    })

    const isAssigned = !!staffClass || userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!isAssigned) {
      return NextResponse.json({
        classId, className: '', streamName: null, date: new Date().toISOString(),
        students: [], existingRecords: {},
        lockState: { isLocked: true, cutoffTime: '17:00', canEdit: false, requiresAdminApproval: true, message: 'Not assigned' },
        isAssigned: false
      })
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: { streams: true },
    })

    if (!classRecord || classRecord.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const attendanceSettings = await schoolSettingsService.getSettings<AttendanceSettings>(schoolId, 'attendance')
    const cutoffTime = attendanceSettings.absentCutoffTime || '17:00'
    const isLocked = isAfterCutoffTime(cutoffTime)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true, admissionNumber: true, firstName: true, lastName: true, photo: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const existingAttendance = await prisma.attendance.findMany({
      where: { classId, date: today },
      select: { studentId: true, status: true },
    })

    const existingRecords: Record<string, AttendanceStatus> = {}
    existingAttendance.forEach(r => { existingRecords[r.studentId] = r.status as AttendanceStatus })

    return NextResponse.json({
      classId, className: classRecord.name, streamName: classRecord.streams[0]?.name || null,
      date: today.toISOString(),
      students: students.map(s => ({ id: s.id, admissionNumber: s.admissionNumber, firstName: s.firstName, lastName: s.lastName, photo: s.photo })),
      existingRecords,
      lockState: { isLocked, cutoffTime, canEdit: !isLocked, requiresAdminApproval: isLocked, message: isLocked ? `Cutoff (${cutoffTime}) passed` : undefined },
      isAssigned: true
    })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}


/**
 * POST /api/teacher/attendance/[classId]
 * Record attendance for students in the class
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { classId } = await params
    const userRole = session.user.activeRole || session.user.role
    
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context' }, { status: 400 })
    }

    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id, schoolId },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'No staff profile' }, { status: 404 })
    }

    // Validate teacher assignment
    const staffClass = await prisma.staffClass.findFirst({
      where: { staffId: staff.id, classId },
    })

    const isAssigned = !!staffClass || userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!isAssigned) {
      return NextResponse.json({ error: 'Not assigned to this class' }, { status: 403 })
    }

    const classRecord = await prisma.class.findUnique({ where: { id: classId } })
    if (!classRecord || classRecord.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Check lock state
    const attendanceSettings = await schoolSettingsService.getSettings<AttendanceSettings>(schoolId, 'attendance')
    const cutoffTime = attendanceSettings.absentCutoffTime || '17:00'
    const isLocked = isAfterCutoffTime(cutoffTime)

    if (isLocked && userRole === Role.TEACHER) {
      return NextResponse.json({
        error: 'Attendance locked',
        message: `Cutoff time (${cutoffTime}) passed. Contact admin.`,
        lockState: { isLocked: true, cutoffTime, canEdit: false, requiresAdminApproval: true }
      }, { status: 403 })
    }

    const body = await request.json()
    const { date, records } = body as { date: string; records: AttendanceRecordInput[] }

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Records required' }, { status: 400 })
    }

    // Restrict teachers to current day only
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const requestDate = new Date(date)
    requestDate.setHours(0, 0, 0, 0)

    if (userRole === Role.TEACHER && requestDate.getTime() !== today.getTime()) {
      return NextResponse.json({ error: 'Teachers can only record for current day' }, { status: 403 })
    }

    // Get device info for audit
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown'

    // Record attendance
    const attendanceRecords = await attendanceService.recordAttendance(
      classId, requestDate, 1,
      records.map(r => ({ studentId: r.studentId, status: r.status, remarks: r.remarks })),
      staff.id
    )

    // Audit log
    try {
      await auditService.logAction({
        schoolId, userId: session.user.id, action: 'ATTENDANCE_RECORDED',
        resourceType: 'Attendance', resourceId: classId,
        details: {
          classId, date: requestDate.toISOString(), recordCount: records.length,
          presentCount: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
          absentCount: records.filter(r => r.status === AttendanceStatus.ABSENT).length,
          lateCount: records.filter(r => r.status === AttendanceStatus.LATE).length,
        },
        ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress.split(',')[0],
        userAgent,
      })
    } catch (e) { console.error('Audit log failed:', e) }

    // Trigger absence notifications
    let notificationsSent = 0
    if (attendanceSettings.autoNotifyOnAbsence) {
      const absentRecords = records.filter(r => r.status === AttendanceStatus.ABSENT)
      if (absentRecords.length > 0) {
        try {
          const notifications = await attendanceService.triggerAbsenceNotifications(classId, requestDate)
          notificationsSent = notifications.length
        } catch (e) { console.error('Notification failed:', e) }
      }
    }

    return NextResponse.json({
      success: true,
      recordsCreated: attendanceRecords.length,
      notificationsSent,
      message: `Attendance saved for ${attendanceRecords.length} students.`
    })
  } catch (error) {
    console.error('Error saving attendance:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save' }, { status: 500 })
  }
}
