/**
 * Teacher Class Detail API Route
 * Requirements: 3.3 - Display student list, attendance history, marks entry, performance summary
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus, AttendanceStatus } from '@/types/enums'

/**
 * Student list item for class detail view
 */
export interface StudentListItem {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string | null
  photo: string | null
}

/**
 * Attendance record for history view
 */
export interface AttendanceRecord {
  id: string
  date: string
  status: AttendanceStatus
  recordedAt: string
  recordedBy: string
}

/**
 * Performance summary for class
 */
export interface PerformanceSummary {
  averageScore: number | null
  passRate: number | null
  topPerformers: number
  attendanceRate: number | null
}

/**
 * Class detail response
 */
export interface ClassDetailResponse {
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  } | null
  studentCount: number
  isClassTeacher: boolean
  students: StudentListItem[]
  attendanceHistory: AttendanceRecord[]
  performanceSummary: PerformanceSummary
}

/**
 * GET /api/teacher/classes/[classId]
 * Returns class detail with student list, attendance history, and performance summary
 * Requirements: 3.3 - Enforce teacher assignment validation
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

    // Verify user has TEACHER role
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

    const { classId } = await params

    // Get optional subjectId from query params
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    // Get teacher record for the user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        classTeacherForIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Requirements: 3.4 - Verify teacher is assigned to this class
    if (!teacher.assignedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'Access denied. You are not assigned to this class.' },
        { status: 403 }
      )
    }

    // Get class details
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        streams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Get subject details if provided
    let subject: { id: string; name: string } | null = null
    if (subjectId && teacher.assignedSubjectIds.includes(subjectId)) {
      const subjectData = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      })
      if (subjectData) {
        subject = subjectData
      }
    }

    // Get students in this class
    // Requirements: 3.3 - Display student list for the assigned class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: StudentStatus.ACTIVE,
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        gender: true,
        photo: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    const studentIds = students.map(s => s.id)

    // Get attendance history for the last 30 days
    // Requirements: 3.3 - Show attendance history in read-only format
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId,
        studentId: { in: studentIds },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        date: true,
        status: true,
        recordedAt: true,
        recorder: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 100, // Limit to recent records
    })

    const attendanceHistory: AttendanceRecord[] = attendanceRecords.map(record => ({
      id: record.id,
      date: record.date.toISOString(),
      status: record.status as AttendanceStatus,
      recordedAt: record.recordedAt.toISOString(),
      recordedBy: `${record.recorder.firstName} ${record.recorder.lastName}`,
    }))

    // Calculate performance summary
    // Requirements: 3.3 - Display performance summary
    let performanceSummary: PerformanceSummary = {
      averageScore: null,
      passRate: null,
      topPerformers: 0,
      attendanceRate: null,
    }

    // Get current term for marks calculation
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
      select: { id: true },
    })

    if (academicYear) {
      const today = new Date()
      const currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: academicYear.id,
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { id: true },
      })

      if (currentTerm && subjectId) {
        // Get marks for this class and subject in current term
        const exams = await prisma.exam.findMany({
          where: {
            schoolId,
            termId: currentTerm.id,
          },
          select: { id: true },
        })

        const examIds = exams.map(e => e.id)

        if (examIds.length > 0) {
          const marks = await prisma.mark.findMany({
            where: {
              examId: { in: examIds },
              subjectId,
              studentId: { in: studentIds },
            },
            select: {
              score: true,
              maxScore: true,
            },
          })

          if (marks.length > 0) {
            const totalScore = marks.reduce((sum, m) => sum + m.score, 0)
            const totalMaxScore = marks.reduce((sum, m) => sum + m.maxScore, 0)
            const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0

            const passingMarks = marks.filter(m => (m.score / m.maxScore) >= 0.5)
            const passRate = (passingMarks.length / marks.length) * 100

            const topPerformers = marks.filter(m => (m.score / m.maxScore) >= 0.8).length

            performanceSummary = {
              averageScore: Math.round(averageScore * 10) / 10,
              passRate: Math.round(passRate * 10) / 10,
              topPerformers,
              attendanceRate: null,
            }
          }
        }
      }

      // Calculate attendance rate
      if (currentTerm) {
        const termStart = await prisma.term.findUnique({
          where: { id: currentTerm.id },
          select: { startDate: true },
        })

        if (termStart) {
          const totalAttendanceRecords = await prisma.attendance.count({
            where: {
              classId,
              studentId: { in: studentIds },
              date: { gte: termStart.startDate },
            },
          })

          const presentRecords = await prisma.attendance.count({
            where: {
              classId,
              studentId: { in: studentIds },
              date: { gte: termStart.startDate },
              status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
            },
          })

          if (totalAttendanceRecords > 0) {
            performanceSummary.attendanceRate = Math.round((presentRecords / totalAttendanceRecords) * 1000) / 10
          }
        }
      }
    }

    const response: ClassDetailResponse = {
      classId: classData.id,
      className: classData.name,
      streamName: classData.streams.length > 0 ? classData.streams[0].name : null,
      subject,
      studentCount: students.length,
      isClassTeacher: teacher.classTeacherForIds.includes(classId),
      students: students.map(s => ({
        id: s.id,
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        photo: s.photo,
      })),
      attendanceHistory,
      performanceSummary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching class detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class detail' },
      { status: 500 }
    )
  }
}
