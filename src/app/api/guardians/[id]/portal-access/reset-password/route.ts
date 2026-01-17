/**
 * Guardian Portal Password Reset API Route
 * POST: Request password reset for guardian portal
 * Requirements: 5.3 - Password reset functionality
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canWrite, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianPortalAccessService } from '@/services/guardian-portal-access.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * POST: Request password reset for guardian portal
 * Requirement 5.3: Password reset functionality
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Check role-based access
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to reset passwords' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    // Verify guardian belongs to school (tenant isolation)
    const guardian = await prisma.guardian.findFirst({
      where: {
        id,
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    // Request password reset using service - Requirement 5.3
    const result = await guardianPortalAccessService.requestPasswordReset(id)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Password reset failed', message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been generated',
      guardianId: id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      // In production, the reset link would be sent via SMS/Email
      // For development, we include it in the response
      ...(process.env.NODE_ENV === 'development' && { resetInfo: result.message }),
    })
  } catch (error) {
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: error.message },
        { status: 404 }
      )
    }
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'Failed to request password reset' },
      { status: 500 }
    )
  }
}
