/**
 * Teacher Reports API Route
 * Requirements: 9.1, 9.3, 9.4 - Return simple class lists and basic info
 * 
 * FOCUS: Teachers want "Enter marks", "Take attendance", "See my class"
 * NOT: Performance analytics, trends, or fancy dashboards
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * Simple class info for teacher reports
 * Requirements: 9.1 - Show basic class information only
 */
export interface SimpleClassInfo {
  classId: string
  className: string
  studentCount: number
  subjectName: string
  lastAttendanceDate: string | null
  pendingMarksCount: number
}

/**
 * Simple teacher reports response
 */
export interface TeacherReportsResponse {
  classes: SimpleClassInfo[]
  currentTerm: {
    id: string
    name: string
  } | null
}

/**
 * GET /api/teacher/reports
 * Returns simple class information for assigned classes
 * Requirements: 9.1, 9.3, 9.4 - Exclude all financial data
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

    // Only teachers can access this endpoint
    if (userRole !== Role.TEACHER) {
      return NextResponse.json({ error: 'Only teachers can access reports' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      select: { id: true, name: true },
    })

    // Get teacher assignments
    const teacher = await prisma.staff.findFirst({
      where: {
        userId,
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher || !teacher.assignedClassIds || teacher.assignedClassIds.length === 0) {
      return NextResponse.json({
        classes: [],
        currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
      })
    }

    // Get simple class information
    const classes: SimpleClassInfo[] = []
    
    for (const classId of teacher.assignedClassIds) {
      // Get class details
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { name: true },
      })

      if (!classInfo) continue

      // Get student count
      const studentCount = await prisma.student.count({
        where: {
          classId,
          status: 'ACTIVE',
        },
      })

      // Get subject name (first assigned subject for this class)
      let subjectName = 'General'
      if (teacher.assignedSubjectIds && teacher.assignedSubjectIds.length > 0) {
        const subject = await prisma.subject.findFirst({
          where: {
            id: { in: teacher.assignedSubjectIds },
            schoolId,
          },
          select: { name: true },
        })
        if (subject) {
          subjectName = subject.name
        }
      }

      // Get last attendance date
      const lastAttendance = await prisma.attendance.findFirst({
        where: {
          classId,
          schoolId,
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      })

      // Get pending marks count (simplified)
      const pendingMarksCount = 0 // Simplified - no complex calculations

      classes.push({
        classId,
        className: classInfo.name,
        studentCount,
        subjectName,
        lastAttendanceDate: lastAttendance?.date.toISOString() || null,
        pendingMarksCount,
      })
    }

    const response: TeacherReportsResponse = {
      classes,
      currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching teacher reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}