/**
 * Support Staff Dashboard API Route
 * Requirements: 10.6 - Verify authentication and SUPPORT_STAFF role, return SupportDashboardData
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DashboardService } from '@/services/dashboard.service'
import { Role, StaffRole } from '@/types/enums'
import { prisma } from '@/lib/db'

const dashboardService = new DashboardService()

/**
 * GET /api/dashboard/support
 * Fetches support staff dashboard data for the authenticated user
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

    // Verify user has SUPPORT_STAFF role
    const hasSupportRole =
      staff.primaryRole === StaffRole.SUPPORT_STAFF ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.SUPPORT_STAFF)

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasSupportRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Support Staff role required.' },
        { status: 403 }
      )
    }

    // Get support staff dashboard data
    const dashboardData = await dashboardService.getStaffDashboardData(
      staff.id,
      StaffRole.SUPPORT_STAFF
    )

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching support dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support dashboard data' },
      { status: 500 }
    )
  }
}
