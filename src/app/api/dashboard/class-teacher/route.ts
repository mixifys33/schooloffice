/**
 * Class Teacher Dashboard API Route
 * Requirements: 10.2 - Verify authentication and CLASS_TEACHER role, return ClassTeacherDashboardData
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DashboardService } from '@/services/dashboard.service'
import { Role, StaffRole, ResponsibilityType } from '@/types/enums'
import { prisma } from '@/lib/db'

const dashboardService = new DashboardService()

/**
 * GET /api/dashboard/class-teacher
 * Fetches class teacher dashboard data for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff record for the user
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: { 
        id: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Verify user has CLASS_TEACHER role or responsibility
    const hasClassTeacherRole = 
      staff.primaryRole === StaffRole.CLASS_TEACHER ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)

    // Also check for CLASS_TEACHER_DUTY responsibility
    const hasClassTeacherResponsibility = await prisma.staffResponsibility.findFirst({
      where: {
        staffId: staff.id,
        type: ResponsibilityType.CLASS_TEACHER_DUTY,
      },
    })

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasClassTeacherRole && !hasClassTeacherResponsibility && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class Teacher role required.' },
        { status: 403 }
      )
    }

    // Get class teacher dashboard data
    const dashboardData = await dashboardService.getClassTeacherDashboardData(
      staff.id,
      schoolId
    )

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching class teacher dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class teacher dashboard data' },
      { status: 500 }
    )
  }
}
