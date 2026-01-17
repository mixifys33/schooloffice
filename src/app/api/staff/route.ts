/**
 * Staff List API Route
 * Requirements: 10.7 - Return paginated staff list with filters
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffManagementService } from '@/services/staff-management.service'
import { Role, StaffRole, StaffStatus } from '@/types/enums'
import { StaffFilters } from '@/types/staff-dashboard'

/**
 * GET /api/staff
 * Returns paginated staff list with filters (role, department, status, search)
 * Requires SCHOOL_ADMIN permission
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify SCHOOL_ADMIN permission
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this resource' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No school context found' },
        { status: 400 }
      )
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url)
    const filters: StaffFilters = {}

    const role = searchParams.get('role')
    if (role) {
      // Check if it's a StaffRole or Role
      if (Object.values(StaffRole).includes(role as StaffRole)) {
        filters.role = role as StaffRole
      } else if (Object.values(Role).includes(role as Role)) {
        filters.role = role as Role
      }
    }

    const department = searchParams.get('department')
    if (department) {
      filters.department = department
    }

    const status = searchParams.get('status')
    if (status && Object.values(StaffStatus).includes(status as StaffStatus)) {
      filters.status = status as StaffStatus
    }

    const search = searchParams.get('search')
    if (search) {
      filters.searchTerm = search
    }

    // Get staff list from service
    const staffList = await staffManagementService.getStaffList(schoolId, filters)

    // Handle pagination (optional query params)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedList = staffList.slice(startIndex, endIndex)
    const totalCount = staffList.length
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: paginatedList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching staff list:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
