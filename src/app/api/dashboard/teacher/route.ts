/**
 * Teacher Dashboard API Route
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.1 - Verify authentication and TEACHER role, return TeacherDashboardData with context and today's schedule
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DashboardService, type ScheduledClassEntry } from '@/services/dashboard.service'
import { Role } from '@/types/enums'
import { prisma } from '@/lib/db'

const dashboardService = new DashboardService()

/**
 * Teacher context data interface
 * Requirements: 1.1, 1.4 - Display teacher name, role, current term, academic year
 */
export interface TeacherContextData {
  teacherId: string
  teacherName: string
  roleName: string
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  academicYear: {
    id: string
    name: string
  } | null
  contextError: string | null
}

/**
 * Extended teacher dashboard response with context and today's schedule
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export interface TeacherDashboardResponse {
  context: TeacherContextData
  dashboard: (Awaited<ReturnType<DashboardService['getTeacherDashboardData']>> & {
    todaySchedule?: ScheduledClassEntry[]
  }) | null
}

/**
 * GET /api/dashboard/teacher
 * Fetches teacher dashboard data with context for the authenticated user
 * Requirements: 1.1, 1.2, 1.3, 1.4
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

    // Get staff record for the user with full name
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: { 
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Get current academic year and term
    // Requirements: 1.1, 1.4 - Display current term and academic year
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

    // Get current term based on today's date
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
            endDate: true,
          },
        })
      : null

    // Build context data
    // Requirements: 1.1 - Display teacher's full name, role label, current term, academic year
    // Requirements: 1.4 - Display error state when term/year cannot be determined
    const contextError = !academicYear
      ? 'No active academic year found. Please contact administration.'
      : !currentTerm
        ? 'No active term found for the current date. Please contact administration.'
        : null

    const context: TeacherContextData = {
      teacherId: staff.id,
      teacherName: `${staff.firstName} ${staff.lastName}`,
      roleName: 'Teacher',
      currentTerm: currentTerm
        ? {
            id: currentTerm.id,
            name: currentTerm.name,
            startDate: currentTerm.startDate.toISOString(),
            endDate: currentTerm.endDate.toISOString(),
          }
        : null,
      academicYear: academicYear
        ? {
            id: academicYear.id,
            name: academicYear.name,
          }
        : null,
      contextError,
    }

    // Get teacher dashboard data (only if context is valid)
    // Requirements: 1.4 - Disable data entry operations when context is invalid
    let dashboardData = null
    if (!contextError) {
      // Get base dashboard data
      const baseDashboardData = await dashboardService.getTeacherDashboardData(
        staff.id,
        schoolId
      )

      // Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 - Get today's schedule with status
      const todayScheduleData = await dashboardService.getTodayScheduleWithStatus(
        staff.id,
        schoolId
      )

      // Combine dashboard data with today's schedule
      dashboardData = {
        ...baseDashboardData,
        todaySchedule: todayScheduleData.scheduledClasses,
      }
    }

    const response: TeacherDashboardResponse = {
      context,
      dashboard: dashboardData,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher dashboard data' },
      { status: 500 }
    )
  }
}
