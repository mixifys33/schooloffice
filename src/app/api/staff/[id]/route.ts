/**
 * Staff Profile API Route
 * Requirements: 10.8 - GET full staff profile, PATCH update with audit logging
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffManagementService, SelfModificationError } from '@/services/staff-management.service'
import { Role } from '@/types/enums'
import { StaffUpdateData } from '@/types/staff-dashboard'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/staff/[id]
 * Returns full staff profile with all sections
 * Requires SCHOOL_ADMIN permission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this resource' },
        { status: 403 }
      )
    }

    const { id } = await params
    const staffProfile = await staffManagementService.getStaffProfile(id)

    return NextResponse.json({ data: staffProfile })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Staff not found')) {
      return NextResponse.json({ error: 'Not Found', message: 'Staff member not found' }, { status: 404 })
    }
    console.error('Error fetching staff profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * PATCH /api/staff/[id]
 * Updates staff profile with audit logging
 * Requires SCHOOL_ADMIN permission
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to modify staff profiles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const updateData: StaffUpdateData = {}
    
    if (body.firstName !== undefined) {
      if (typeof body.firstName !== 'string' || body.firstName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'First name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.firstName = body.firstName.trim()
    }

    if (body.lastName !== undefined) {
      if (typeof body.lastName !== 'string' || body.lastName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Last name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.lastName = body.lastName.trim()
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || undefined
    }

    if (body.email !== undefined) {
      updateData.email = body.email?.trim().toLowerCase() || undefined
    }

    if (body.department !== undefined) {
      updateData.department = body.department?.trim() || undefined
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updatedProfile = await staffManagementService.updateStaffProfile(
      id,
      updateData,
      session.user.id
    )

    return NextResponse.json({ data: updatedProfile })
  } catch (error) {
    if (error instanceof SelfModificationError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message, code: error.code },
        { status: 403 }
      )
    }
    if (error instanceof Error && error.message.includes('Staff not found')) {
      return NextResponse.json({ error: 'Not Found', message: 'Staff member not found' }, { status: 404 })
    }
    console.error('Error updating staff profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
