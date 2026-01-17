/**
 * Staff Deactivation API Route
 * Requirements: 8.7 - Deactivate staff with reason (prevent deletion)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { staffManagementService } from '@/services/staff-management.service'
import { Role } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/staff/[id]/deactivate
 * Deactivates a staff member with reason
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
        { error: 'Forbidden', message: 'Only administrators can deactivate staff' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Deactivation reason is required' },
        { status: 400 }
      )
    }

    await staffManagementService.deactivateStaff(id, reason.trim(), session.user.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Staff member deactivated successfully' 
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Staff not found')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Staff member not found' },
          { status: 404 }
        )
      }
      if (error.message.includes('already inactive')) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Staff member is already inactive' },
          { status: 400 }
        )
      }
    }
    console.error('Error deactivating staff:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
