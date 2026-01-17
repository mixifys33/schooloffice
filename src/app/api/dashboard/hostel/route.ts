/**
 * Hostel Staff Dashboard API Route
 * Requirements: 10.5 - Verify authentication and HOSTEL_STAFF role, return HostelDashboardData
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DashboardService } from '@/services/dashboard.service'
import { Role, StaffRole } from '@/types/enums'
import { prisma } from '@/lib/db'

const dashboardService = new DashboardService()

/**
 * GET /api/dashboard/hostel
 * Fetches hostel staff dashboard data for the authenticated user
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

    // Verify user has HOSTEL_STAFF role
    const hasHostelRole =
      staff.primaryRole === StaffRole.HOSTEL_STAFF ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.HOSTEL_STAFF)

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasHostelRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Hostel Staff role required.' },
        { status: 403 }
      )
    }

    // Get hostel dashboard data
    const dashboardData = await dashboardService.getStaffDashboardData(
      staff.id,
      StaffRole.HOSTEL_STAFF
    )

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching hostel dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hostel dashboard data' },
      { status: 500 }
    )
  }
}
