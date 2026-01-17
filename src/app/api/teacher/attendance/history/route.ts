/**
 * Teacher Attendance History API Route
 * Requirements: 5.1, 5.2, 5.3
 * - GET: Get attendance history for teacher's assigned classes
 * - Display past attendance records in read-only format
 * - Show date, student name, status, and recording timestamp
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, AttendanceStatus } from '@/types/enums'

interface AttendanceHistoryRecord {
  id: string
  date: string
  studentId: string
  studentName: string
  admissionNumber: string
  status: AttendanceStatus
  recordedAt: string
  recordedBy: string
  remarks?: string
}

interface ClassAttendanceHistory {
  classId: string
  className: string
  streamName: string | null
  records: AttendanceHistoryRecord[]
  summary: {
    totalRecords: number
    presentCount: number
    absentCount: number
    lateCount: number
  }
}

/**
 * GET /api/teacher/attendance/history
 * Get attendance history for teacher's assigned classes
 * Query params: classId (optional), startDate (optional), endDate (optional)
 * Requirements: 5.1, 5.2 - Display past attendance records in read-only format
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Get classes assigned to this teacher
    const staffClasses = await prisma.staffClass.findMany({
      where: { staffId: staff.id },
      include: {
        class: {
          include: {
            streams: true,
          }
        }
      }
    })

    const assignedClassIds = staffClasses.map(sc => sc.classId)

    // If classId is provided, validate it's assigned to this teacher
    if (classId && !assignedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    // Build date filter - default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    startDate.setHours(0, 0, 0, 0)

    // Get attendance records
    const targetClassIds = classId ? [classId] : assignedClassIds
    
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: { in: targetClassIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            streams: {
              select: { name: true },
              take: 1,
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { student: { lastName: 'asc' } },
      ],
    })

    // Group records by class
    const recordsByClass = new Map<string, {
      classId: string
      className: string
      streamName: string | null
      records: AttendanceHistoryRecord[]
    }>()

    for (const record of attendanceRecords) {
      if (!recordsByClass.has(record.classId)) {
        recordsByClass.set(record.classId, {
          classId: record.classId,
          className: record.class.name,
          streamName: record.class.streams[0]?.name || null,
          records: [],
        })
      }

      recordsByClass.get(record.classId)!.records.push({
        id: record.id,
        date: record.date.toISOString().split('T')[0],
        studentId: record.studentId,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNumber: record.student.admissionNumber || '',
        status: record.status as AttendanceStatus,
        recordedAt: record.recordedAt.toISOString(),
        recordedBy: record.recordedBy,
        remarks: record.remarks || undefined,
      })
    }

    // Build response with summaries
    const classHistories: ClassAttendanceHistory[] = []
    
    for (const [, classData] of recordsByClass) {
      const summary = {
        totalRecords: classData.records.length,
        presentCount: classData.records.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absentCount: classData.records.filter(r => r.status === AttendanceStatus.ABSENT).length,
        lateCount: classData.records.filter(r => r.status === AttendanceStatus.LATE).length,
      }

      classHistories.push({
        ...classData,
        summary,
      })
    }

    // Sort by class name
    classHistories.sort((a, b) => a.className.localeCompare(b.className))

    return NextResponse.json({
      classes: classHistories,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      assignedClasses: staffClasses.map(sc => ({
        classId: sc.classId,
        className: sc.class.name,
        streamName: sc.class.streams[0]?.name || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching teacher attendance history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}
