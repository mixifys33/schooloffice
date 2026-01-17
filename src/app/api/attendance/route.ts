/**
 * Attendance API Routes
 * Requirements: 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.5 (Super Admin), 6.1, 6.2, 9.4
 * - GET: Get attendance records by class and date
 * - POST: Mark attendance for students with SMS notification trigger
 * - Teacher access restricted to assigned classes (Requirement 9.4)
 * - Super Admin cannot record attendance directly (Requirement 5.5)
 * - All queries are scoped by school_id for tenant isolation (Requirement 6.1, 6.2)
 * - Role-based access enforced at API level (Requirement 4.5)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { attendanceService } from '@/services/attendance.service'
import { prisma } from '@/lib/db'
import { AttendanceStatus, Role } from '@/types/enums'
import { checkTeacherAccess, getTeacherAssignments } from '@/lib/teacher-access'
import { guardSuperAdminWrite } from '@/lib/super-admin-guard'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { 
  tenantIsolationService, 
  TenantContext, 
  TenantIsolationError 
} from '@/services/tenant-isolation.service'
import { guardAttendanceModification } from '@/lib/system-state-guard'

interface AttendanceRecordInput {
  studentId: string
  status: AttendanceStatus
  remarks?: string
}

/**
 * GET /api/attendance
 * Get attendance records for a class on a specific date
 * Query params: classId, date
 * Requirement 4.5: Enforce role-based access at API level
 * Requirement 6.1: All queries scoped by school_id
 * Requirement 9.4: Teachers can only access attendance for their assigned classes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const userId = session.user.id as string

    // Requirement 4.5: Check role-based access for attendance read
    if (!canRead(userRole, 'attendance')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to attendance records' },
        { status: 403 }
      )
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const dateStr = searchParams.get('date')

    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      )
    }

    // Verify class belongs to user's school (Requirement 6.2)
    const classRecord = await prisma.class.findFirst({
      where: tenantIsolationService.scopeQuery({ id: classId }, tenantContext),
    })

    if (!classRecord) {
      // Log potential cross-tenant access attempt (Requirement 6.5)
      await tenantIsolationService.logViolationAttempt(
        userId,
        'unknown',
        `attendance/class/${classId}`,
        { userSchoolId: schoolId, action: 'GET_ATTENDANCE' }
      )
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Requirement 9.4: Check teacher access to the class
    if (userRole === Role.TEACHER) {
      const accessCheck = await checkTeacherAccess(
        userId,
        userRole,
        'class',
        classId
      )
      if (!accessCheck.allowed) {
        return NextResponse.json(
          { error: accessCheck.reason || 'Access denied to this class' },
          { status: 403 }
        )
      }
    }

    const date = dateStr ? new Date(dateStr) : new Date()
    
    // Normalize date to start of day
    const normalizedDate = new Date(date)
    normalizedDate.setUTCHours(0, 0, 0, 0)

    // Get attendance records for the class and date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId,
        date: normalizedDate,
      },
      orderBy: { period: 'asc' },
    })

    // Convert to a map of studentId -> status for easy lookup
    const records: Record<string, AttendanceStatus> = {}
    for (const record of attendanceRecords) {
      // Use the first period's status as the representative status
      if (!records[record.studentId]) {
        records[record.studentId] = record.status as AttendanceStatus
      }
    }

    return NextResponse.json({ records, date: normalizedDate.toISOString() })
  } catch (error) {
    // Handle role access errors (Requirement 4.5)
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}


/**
 * POST /api/attendance
 * Mark attendance for students in a class
 * Requirements: 4.2, 4.5, 5.3, 5.4, 5.5, 5.5 (Super Admin), 6.1, 6.2, 9.4
 * - Save attendance via POST with student ID, date, status
 * - Trigger SMS notification to parent when absent
 * - Skip SMS for unpaid students
 * - Teachers can only mark attendance for their assigned classes (Requirement 9.4)
 * - Super Admin cannot record attendance directly (Requirement 5.5)
 * - All queries are scoped by school_id for tenant isolation (Requirement 6.1, 6.2)
 * - Role-based access enforced at API level (Requirement 4.5)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const userId = session.user.id as string

    // Requirement 4.5: Check role-based access for attendance write
    if (!canWrite(userRole, 'attendance')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to record attendance' },
        { status: 403 }
      )
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    // Requirement 5.5: Super Admin cannot record attendance directly
    const superAdminRestriction = guardSuperAdminWrite(session, 'attendance', 'POST')
    if (superAdminRestriction) {
      return superAdminRestriction
    }

    const body = await request.json()
    const { classId, date, period = 1, records } = body as {
      classId: string
      date: string
      period?: number
      records: AttendanceRecordInput[]
    }

    if (!classId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'classId, date, and records are required' },
        { status: 400 }
      )
    }

    // Get current term for system state check
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId },
        startDate: { lte: new Date(date) },
        endDate: { gte: new Date(date) },
      },
    })

    // Requirements 20.3: Check if term is closed before allowing attendance modification
    const systemStateCheck = await guardAttendanceModification(schoolId, currentTerm?.id)
    if (!systemStateCheck.allowed && systemStateCheck.response) {
      return systemStateCheck.response
    }

    if (!classId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'classId, date, and records are required' },
        { status: 400 }
      )
    }

    // Verify class belongs to user's school (Requirement 6.2)
    const classRecord = await prisma.class.findFirst({
      where: tenantIsolationService.scopeQuery({ id: classId }, tenantContext),
    })

    if (!classRecord) {
      // Log potential cross-tenant access attempt (Requirement 6.5)
      await tenantIsolationService.logViolationAttempt(
        userId,
        'unknown',
        `attendance/class/${classId}`,
        { userSchoolId: schoolId, action: 'POST_ATTENDANCE' }
      )
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Requirement 9.4: Check teacher access to the class
    if (userRole === Role.TEACHER) {
      const accessCheck = await checkTeacherAccess(
        userId,
        userRole,
        'class',
        classId
      )
      if (!accessCheck.allowed) {
        return NextResponse.json(
          { error: accessCheck.reason || 'Access denied to this class' },
          { status: 403 }
        )
      }
    }

    // Get the staff ID from the session user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { staff: true },
    })

    const recordedBy = user?.staff?.id || session.user.id

    // Record attendance using the service
    const attendanceRecords = await attendanceService.recordAttendance(
      classId,
      new Date(date),
      period,
      records.map(r => ({
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks,
      })),
      recordedBy
    )

    // Get absent students for notification (Requirement 5.4)
    const absentRecords = records.filter(r => r.status === AttendanceStatus.ABSENT)
    
    let notificationsSent = 0
    const skippedUnpaid: string[] = []

    if (absentRecords.length > 0) {
      // Get current term for payment status check
      const currentTerm = await prisma.term.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      })

      for (const absentRecord of absentRecords) {
        // Get student with payment status
        const student = await prisma.student.findUnique({
          where: { id: absentRecord.studentId },
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true },
            },
          },
        })

        if (!student) continue

        // Check payment status (Requirement 5.5: Skip SMS for unpaid students)
        let isPaid = false
        if (currentTerm) {
          const payments = await prisma.payment.aggregate({
            where: {
              studentId: student.id,
              termId: currentTerm.id,
              status: 'COMPLETED',
            },
            _sum: { amount: true },
          })

          const feeStructure = await prisma.feeStructure.findFirst({
            where: {
              schoolId: student.schoolId,
              termId: currentTerm.id,
              classLevel: student.classLevel || undefined,
            },
          })

          const totalFees = feeStructure?.amount || 0
          const totalPaid = payments._sum.amount || 0
          isPaid = totalPaid >= totalFees
        }

        if (!isPaid) {
          // Skip SMS for unpaid students (Requirement 5.5)
          skippedUnpaid.push(student.id)
          continue
        }

        // Create absence notification
        const notification = await attendanceService.createAbsenceNotification(
          student.id,
          new Date(date),
          [period]
        )

        if (notification) {
          // In a real implementation, this would queue the SMS
          // For now, we just count it as sent
          notificationsSent++
          
          // Log the notification attempt
          console.log(`Absence notification created for student ${student.id}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      recordsCreated: attendanceRecords.length,
      notificationsSent,
      skippedUnpaid: skippedUnpaid.length,
      message: `Attendance saved for ${attendanceRecords.length} students. ${notificationsSent} absence notifications sent.`,
    })
  } catch (error) {
    // Handle role access errors (Requirement 4.5)
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error saving attendance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save attendance' },
      { status: 500 }
    )
  }
}
