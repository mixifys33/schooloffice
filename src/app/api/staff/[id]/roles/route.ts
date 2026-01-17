/**
 * Staff Role Management API Routes
 * Requirements: 9.2, 9.3, 9.6 - Assign/remove roles with self-modification prevention
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffManagementService, SelfModificationError } from '@/services/staff-management.service'
import { Role, StaffRole } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

const VALID_STAFF_ROLES = [...Object.values(StaffRole), Role.TEACHER, Role.SCHOOL_ADMIN]

/**
 * POST /api/staff/[id]/roles
 * Assigns a role to a staff member
 * Requires SCHOOL_ADMIN permission
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only administrators can assign roles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { role, isPrimary = false } = body

    if (!role || !VALID_STAFF_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid role. Must be one of: ${VALID_STAFF_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    await staffManagementService.assignRole(id, role, session.user.id, isPrimary)

    return NextResponse.json({ success: true, message: `Role ${role} assigned successfully` })
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
    console.error('Error assigning role:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


/**
 * DELETE /api/staff/[id]/roles
 * Removes a role from a staff member
 * Requires SCHOOL_ADMIN permission
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only administrators can remove roles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (!role || !VALID_STAFF_ROLES.includes(role as StaffRole | Role)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid role. Must be one of: ${VALID_STAFF_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    await staffManagementService.removeRole(id, role as StaffRole | Role, session.user.id)

    return NextResponse.json({ success: true, message: `Role ${role} removed successfully` })
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
    console.error('Error removing role:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
