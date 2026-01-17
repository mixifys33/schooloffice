/**
 * Teacher Reports API Route
 * Requirements: 9.1, 9.3, 9.4 - Return performance summaries scoped to assigned classes
 * Calculate attendance trends and subject averages
 * Exclude all financial data
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus, AttendanceStatus } from '@/types/enums'

/**
 * Class performance summary for teacher reports
 * Requirements: 9.1 - Display class performance summary for assigned classes only
 */
export interface ClassPerformanceSummary {
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  }
  studentCount: number
  averageScore: number
  passRate: number
  topPerformers: number
  attendanceRate: number
}

/**
 * Attendance trend data point
 * Requirements: 9.1 - Show attendance trends
 */
export interface AttendanceTrendPoint {
  date: string
  presentCount: number
  absentCount: number
  lateCount: number
  totalStudents: number
  attendanceRate: number
}

/**
 * Subject average data
 * Requirements: 9.1 - Show subject averages
 */
export interface SubjectAverage {
  subjectId: string
  subjectName: string
  classId: string
  className: string
  averageScore: number
  highestScore: number
  lowestScore: number
  studentCount: number
}

/**
 * Teacher reports response
 * Requirements: 9.1, 9.2, 9.3, 9.4 - Read-only data, no financial info, no export
 */
export interface TeacherReportsResponse {
  classPerformance: ClassPerformanceSummary[]
  attendanceTrends: AttendanceTrendPoint[]
  subjectAverages: SubjectAverage[]
  currentTerm: {
    id: string
    name: string
  } | null
}

/**
 * GET /api/teacher/reports
 * Returns performance summaries scoped to assigned classes
 * Requirements: 9.1, 9.3, 9.4 - Exclude all financial data
 */
export async function GET(request: NextRequest) {
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
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Get current academic year and term
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    })

    const today = new Date()
    const currentTerm = academicYear
      ? await prisma.term.findFirst({
          where: {
            academicYearId: academicYear.id,
            startDate: { lte: today },
            endDate: { gte: today },
          },
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        })
      : null

    // Requirements: 9.1 - Return data only for assigned classes
    if (teacher.assignedClassIds.length === 0) {
      return NextResponse.json({
        classPerformance: [],
        attendanceTrends: [],
        subjectAverages: [],
        currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
      })
    }

    // Get class performance summaries
    const classPerformance = await getClassPerformanceSummaries(
      teacher.assignedClassIds,
      teacher.assignedSubjectIds,
      schoolId,
      currentTerm?.id
    )

    // Get attendance trends for the last 14 days
    const attendanceTrends = await getAttendanceTrends(
      teacher.assignedClassIds,
      schoolId
    )

    // Get subject averages
    const subjectAverages = await getSubjectAverages(
      teacher.assignedClassIds,
      teacher.assignedSubjectIds,
      schoolId,
      currentTerm?.id
    )

    const response: TeacherReportsResponse = {
      classPerformance,
      attendanceTrends,
      subjectAverages,
      currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching teacher reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher reports' },
      { status: 500 }
    )
  }
}

/**
 * Get class performance summaries for assigned classes
 * Requirements: 9.1 - Display class performance summary for assigned classes only
 */
async function getClassPerformanceSummaries(
  assignedClassIds: string[],
  assignedSubjectIds: string[],
  schoolId: string,
  termId?: string
): Promise<ClassPerformanceSummary[]> {
  const summaries: ClassPerformanceSummary[] = []

  // Get class details
  const classes = await prisma.class.findMany({
    where: {
      id: { in: assignedClassIds },
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
        take: 1,
      },
    },
  })

  // Get subject details
  const subjects = assignedSubjectIds.length > 0
    ? await prisma.subject.findMany({
        where: {
          id: { in: assignedSubjectIds },
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      })
    : []

  for (const cls of classes) {
    // Get active students in this class
    const students = await prisma.student.findMany({
      where: {
        classId: cls.id,
        status: StudentStatus.ACTIVE,
      },
      select: { id: true },
    })

    const studentIds = students.map(s => s.id)
    const studentCount = studentIds.length

    if (studentCount === 0) continue

    // Calculate attendance rate for the class (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: cls.id,
        studentId: { in: studentIds },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
      },
    })

    const presentCount = attendanceRecords.filter(
      r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
    ).length
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : 0

    // For each subject, calculate performance metrics
    for (const subject of subjects) {
      // Get marks for this class and subject in current term
      const examIds = termId
        ? (await prisma.exam.findMany({
            where: { termId, schoolId },
            select: { id: true },
          })).map(e => e.id)
        : []

      if (examIds.length === 0) {
        summaries.push({
          classId: cls.id,
          className: cls.name,
          streamName: cls.streams[0]?.name || null,
          subject: { id: subject.id, name: subject.name },
          studentCount,
          averageScore: 0,
          passRate: 0,
          topPerformers: 0,
          attendanceRate,
        })
        continue
      }

      const marks = await prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
          subjectId: subject.id,
          examId: { in: examIds },
        },
        select: {
          score: true,
          maxScore: true,
        },
      })

      if (marks.length === 0) {
        summaries.push({
          classId: cls.id,
          className: cls.name,
          streamName: cls.streams[0]?.name || null,
          subject: { id: subject.id, name: subject.name },
          studentCount,
          averageScore: 0,
          passRate: 0,
          topPerformers: 0,
          attendanceRate,
        })
        continue
      }

      // Calculate average score as percentage
      const totalScore = marks.reduce((sum, m) => sum + m.score, 0)
      const totalMaxScore = marks.reduce((sum, m) => sum + m.maxScore, 0)
      const averageScore = totalMaxScore > 0
        ? Math.round((totalScore / totalMaxScore) * 100)
        : 0

      // Calculate pass rate (assuming 50% is passing)
      const passingMarks = marks.filter(m => (m.score / m.maxScore) >= 0.5)
      const passRate = Math.round((passingMarks.length / marks.length) * 100)

      // Calculate top performers (above 80%)
      const topPerformers = marks.filter(m => (m.score / m.maxScore) >= 0.8).length

      summaries.push({
        classId: cls.id,
        className: cls.name,
        streamName: cls.streams[0]?.name || null,
        subject: { id: subject.id, name: subject.name },
        studentCount,
        averageScore,
        passRate,
        topPerformers,
        attendanceRate,
      })
    }

    // If no subjects assigned, still show class with attendance data
    if (subjects.length === 0) {
      summaries.push({
        classId: cls.id,
        className: cls.name,
        streamName: cls.streams[0]?.name || null,
        subject: { id: '', name: 'All Subjects' },
        studentCount,
        averageScore: 0,
        passRate: 0,
        topPerformers: 0,
        attendanceRate,
      })
    }
  }

  return summaries
}

/**
 * Get attendance trends for the last 14 days
 * Requirements: 9.1 - Show attendance trends
 */
async function getAttendanceTrends(
  assignedClassIds: string[],
  schoolId: string
): Promise<AttendanceTrendPoint[]> {
  const trends: AttendanceTrendPoint[] = []
  const today = new Date()

  // Get all active students in assigned classes
  const students = await prisma.student.findMany({
    where: {
      classId: { in: assignedClassIds },
      status: StudentStatus.ACTIVE,
    },
    select: { id: true },
  })

  const studentIds = students.map(s => s.id)
  const totalStudents = studentIds.length

  if (totalStudents === 0) {
    return trends
  }

  // Get attendance for the last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const records = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: {
          gte: date,
          lt: nextDate,
        },
      },
      select: {
        status: true,
        studentId: true,
      },
      distinct: ['studentId'],
    })

    const presentCount = records.filter(
      r => r.status === AttendanceStatus.PRESENT
    ).length
    const lateCount = records.filter(
      r => r.status === AttendanceStatus.LATE
    ).length
    const absentCount = records.filter(
      r => r.status === AttendanceStatus.ABSENT
    ).length

    const attendanceRate = records.length > 0
      ? Math.round(((presentCount + lateCount) / records.length) * 100)
      : 0

    trends.push({
      date: date.toISOString().split('T')[0],
      presentCount,
      absentCount,
      lateCount,
      totalStudents,
      attendanceRate,
    })
  }

  return trends
}

/**
 * Get subject averages for assigned classes and subjects
 * Requirements: 9.1 - Show subject averages
 */
async function getSubjectAverages(
  assignedClassIds: string[],
  assignedSubjectIds: string[],
  schoolId: string,
  termId?: string
): Promise<SubjectAverage[]> {
  const averages: SubjectAverage[] = []

  if (assignedSubjectIds.length === 0 || !termId) {
    return averages
  }

  // Get exam IDs for current term
  const exams = await prisma.exam.findMany({
    where: { termId, schoolId },
    select: { id: true },
  })

  const examIds = exams.map(e => e.id)

  if (examIds.length === 0) {
    return averages
  }

  // Get class and subject details
  const classes = await prisma.class.findMany({
    where: { id: { in: assignedClassIds }, schoolId },
    select: { id: true, name: true },
  })

  const subjects = await prisma.subject.findMany({
    where: { id: { in: assignedSubjectIds }, schoolId },
    select: { id: true, name: true },
  })

  for (const cls of classes) {
    // Get students in this class
    const students = await prisma.student.findMany({
      where: {
        classId: cls.id,
        status: StudentStatus.ACTIVE,
      },
      select: { id: true },
    })

    const studentIds = students.map(s => s.id)

    if (studentIds.length === 0) continue

    for (const subject of subjects) {
      // Get marks for this class and subject
      const marks = await prisma.mark.findMany({
        where: {
          studentId: { in: studentIds },
          subjectId: subject.id,
          examId: { in: examIds },
        },
        select: {
          score: true,
          maxScore: true,
        },
      })

      if (marks.length === 0) continue

      // Calculate percentages for each mark
      const percentages = marks.map(m => 
        m.maxScore > 0 ? (m.score / m.maxScore) * 100 : 0
      )

      const averageScore = Math.round(
        percentages.reduce((sum, p) => sum + p, 0) / percentages.length
      )
      const highestScore = Math.round(Math.max(...percentages))
      const lowestScore = Math.round(Math.min(...percentages))

      averages.push({
        subjectId: subject.id,
        subjectName: subject.name,
        classId: cls.id,
        className: cls.name,
        averageScore,
        highestScore,
        lowestScore,
        studentCount: marks.length,
      })
    }
  }

  return averages
}
