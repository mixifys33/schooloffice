import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, AttendanceStatus } from '@prisma/client'

/**
 * GET /api/class-teacher/attendance
 * Fetch attendance data for class teacher's assigned class
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const selectedDate = new Date(date)
    selectedDate.setUTCHours(0, 0, 0, 0)

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
      include: {
        staffClasses: {
          include: {
            class: {
              include: {
                streams: true,
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

    // Get the first assigned class (class teacher should have one primary class)
    const assignedClass = staff.staffClasses[0]?.class
    if (!assignedClass) {
      return NextResponse.json({
        error: 'No class assigned',
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          contextError: 'You are not assigned to any class',
        },
      }, { status: 400 })
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: staff.schoolId,
          isCurrent: true,
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        academicYear: true,
      },
    })

    // Get attendance records for the selected date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: assignedClass.id,
        date: selectedDate,
      },
    })

    // Map attendance to students
    const attendanceMap = new Map(
      attendanceRecords.map(record => [record.studentId, record])
    )

    // Calculate attendance rates for each student
    const studentsWithAttendance = await Promise.all(
      assignedClass.students.map(async (student) => {
        // Get total attendance records for this student in current term
        const totalRecords = currentTerm
          ? await prisma.attendance.count({
              where: {
                studentId: student.id,
                date: {
                  gte: currentTerm.startDate,
                  lte: currentTerm.endDate,
                },
              },
            })
          : 0

        const presentRecords = currentTerm
          ? await prisma.attendance.count({
              where: {
                studentId: student.id,
                status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
                date: {
                  gte: currentTerm.startDate,
                  lte: currentTerm.endDate,
                },
              },
            })
          : 0

        const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100

        // Get last attendance date
        const lastAttendance = await prisma.attendance.findFirst({
          where: { studentId: student.id },
          orderBy: { date: 'desc' },
        })

        const currentAttendance = attendanceMap.get(student.id)

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          attendanceStatus: currentAttendance?.status || null,
          lastAttendanceDate: lastAttendance?.date.toISOString() || null,
          attendanceRate,
        }
      })
    )

    // Check if attendance is locked
    const now = new Date()
    const cutoffTime = '17:00' // 5 PM cutoff
    const [hours, minutes] = cutoffTime.split(':').map(Number)
    const cutoff = new Date()
    cutoff.setHours(hours, minutes, 0, 0)
    const isLocked = now > cutoff && selectedDate.toDateString() === new Date().toDateString()

    const canEdit = !isLocked || session.user.role === Role.SCHOOL_ADMIN

    return NextResponse.json({
      context: {
        teacherId: staff.id,
        teacherName: `${staff.firstName} ${staff.lastName}`,
        roleName: staff.primaryRole,
        currentTerm: currentTerm
          ? {
              id: currentTerm.id,
              name: currentTerm.name,
              startDate: currentTerm.startDate.toISOString(),
              endDate: currentTerm.endDate.toISOString(),
            }
          : null,
        academicYear: currentTerm?.academicYear
          ? {
              id: currentTerm.academicYear.id,
              name: currentTerm.academicYear.name,
            }
          : null,
        contextError: null,
      },
      class: {
        id: assignedClass.id,
        name: assignedClass.name,
        streamName: assignedClass.streams?.[0]?.name || null,
        studentCount: assignedClass.students.length,
      },
      date: selectedDate.toISOString(),
      students: studentsWithAttendance,
      isPublished: false,
      isTermActive: !!currentTerm,
      canEdit,
      lockMessage: isLocked && !canEdit
        ? `Attendance cutoff time (${cutoffTime}) has passed. Contact administration for approval.`
        : null,
      hasUnsavedChanges: false,
      submittedAt: null,
    })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/class-teacher/attendance
 * Save attendance records
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { classId, date, attendance, isDraft } = body

    if (!classId || !date || !Array.isArray(attendance)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    // Verify staff is assigned to this class
    const staffClass = await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId,
      },
    })

    if (!staffClass && session.user.role !== Role.SCHOOL_ADMIN) {
      return NextResponse.json(
        { error: 'Not authorized for this class' },
        { status: 403 }
      )
    }

    const selectedDate = new Date(date)
    selectedDate.setUTCHours(0, 0, 0, 0)
    const now = new Date()

    // Save attendance records
    const savedRecords = await Promise.all(
      attendance.map(async (record: any) => {
        if (!record.status) return null

        return await prisma.attendance.upsert({
          where: {
            studentId_date_period: {
              studentId: record.studentId,
              date: selectedDate,
              period: 1, // Default period
            },
          },
          update: {
            status: record.status,
            recordedBy: staff.id,
            recordedAt: now,
            remarks: record.remarks || null,
          },
          create: {
            studentId: record.studentId,
            classId,
            schoolId: staff.schoolId,
            date: selectedDate,
            period: 1,
            status: record.status,
            recordedBy: staff.id,
            recordedAt: now,
            remarks: record.remarks || null,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      saved: savedRecords.filter(Boolean).length,
      message: isDraft ? 'Attendance saved as draft' : 'Attendance saved successfully',
    })
  } catch (error) {
    console.error('Error saving attendance:', error)
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 }
    )
  }
}
