/**
 * Teacher Dashboard API Route
 * Requirements: New Curriculum Support - Dashboard with teaching load, alerts, and obligations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * Teacher dashboard data structure
 */
export interface TeacherDashboardData {
  teachingLoad: {
    classes: number
    subjects: number
    periodsPerWeek: number
    curriculumSyllabus: string
  }
  todayTimetable: {
    period: number
    class: string
    subject: string
    startTime: string
    endTime: string
    isCurrent: boolean
  }[]
  alerts: {
    id: string
    type: string
    message: string
    priority: number
    dueDate?: string
    isRead: boolean
  }[]
  obligations: {
    id: string
    type: string
    description: string
    dueDate?: string
    status: string
  }[]
}

/**
 * GET /api/teacher/dashboard
 * Returns teacher's dashboard data including teaching load, timetable, and alerts
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

    // Get staff record (which includes teacher functionality)
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Get staff subject assignments to determine classes and subjects
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } }
      }
    })

    // Calculate teaching load from staff assignments
    const uniqueClasses = new Set(staffSubjects.map(ss => ss.classId)).size
    const uniqueSubjects = new Set(staffSubjects.map(ss => ss.subjectId)).size

    // Get today's timetable entries for this teacher
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    const todayTimetableEntries = await prisma.timetableEntry.findMany({
      where: {
        staffId: staff.id,
        dayOfWeek,
        isActive: true,
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: {
        period: 'asc',
      },
    })

    const todayTimetable = todayTimetableEntries.map(entry => ({
      id: entry.id,
      period: entry.period,
      timeSlot: `${entry.startTime} - ${entry.endTime}`,
      subject: entry.subject.name,
      class: entry.class.name,
      room: entry.room || 'TBA',
    }))

    // Get real alerts for this teacher
    const teacherAlerts = await prisma.teacherAlert.findMany({
      where: {
        staffId: staff.id,
        isActive: true,
        isResolved: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    const formattedAlerts = teacherAlerts.map(alert => ({
      id: alert.id,
      type: alert.type.toLowerCase(),
      severity: alert.severity.toLowerCase(),
      message: alert.message,
      dueDate: alert.dueDate?.toISOString() || null,
      isRead: alert.isRead,
      createdAt: alert.createdAt.toISOString(),
    }))

    // Get real curriculum syllabus information
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: staff.schoolId,
        isActive: true,
      },
      select: {
        name: true,
        curriculumVersion: true,
      },
    })

    // Prepare obligations based on alerts and pending tasks
    const obligations = formattedAlerts
      .filter(alert => !alert.isRead)
      .map(alert => ({
        id: alert.id,
        type: 'alert',
        description: alert.message,
        dueDate: alert.dueDate,
        status: 'pending',
      }))

    const dashboardData: TeacherDashboardData = {
      teachingLoad: {
        classes: uniqueClasses,
        subjects: uniqueSubjects,
        periodsPerWeek: staffSubjects.length,
        curriculumSyllabus: currentAcademicYear?.curriculumVersion || 'Current Curriculum',
      },
      todayTimetable,
      alerts: formattedAlerts,
      obligations,
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher dashboard' },
      { status: 500 }
    )
  }
}