/**
 * Guardian Portal Access API Route
 * GET: Return portal access configuration
 * PUT: Update portal access configuration
 * Requirements: 5.1, 5.2 - Guardian portal access management
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
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
 * GET: Get portal access configuration for a guardian
 * Requirement 5.1: Enable/disable portal access per guardian
 * Requirement 5.2: Configure visible modules
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    if (!canRead(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to portal settings' },
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

    // Get or create portal access using service - Requirement 5.1, 5.2
    const portalAccess = await guardianPortalAccessService.getOrCreatePortalAccess(id)

    return NextResponse.json({
      guardianId: id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      isEnabled: portalAccess.isEnabled,
      canViewAttendance: portalAccess.canViewAttendance,
      canViewResults: portalAccess.canViewResults,
      canViewFees: portalAccess.canViewFees,
      canDownloadReports: portalAccess.canDownloadReports,
      hasPassword: !!portalAccess.passwordHash,
      lastLogin: portalAccess.lastLogin,
      createdAt: portalAccess.createdAt,
      updatedAt: portalAccess.updatedAt,
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
    console.error('Error fetching guardian portal access:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portal access' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update portal access configuration for a guardian
 * Requirement 5.1: Enable/disable portal access per guardian
 * Requirement 5.2: Configure visible modules
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const userId = session.user.id as string

    // Check role-based access
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update portal settings' },
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

    const body = await request.json()

    // Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      undefined

    // Ensure portal access exists
    await guardianPortalAccessService.getOrCreatePortalAccess(id)

    // Update portal access using service - Requirement 5.1, 5.2
    const updatedAccess = await guardianPortalAccessService.updatePortalAccess(
      id,
      {
        isEnabled: body.isEnabled,
        canViewAttendance: body.canViewAttendance,
        canViewResults: body.canViewResults,
        canViewFees: body.canViewFees,
        canDownloadReports: body.canDownloadReports,
        password: body.password, // Optional: set new password
      },
      userId,
      ipAddress ?? undefined
    )

    return NextResponse.json({
      guardianId: id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      isEnabled: updatedAccess.isEnabled,
      canViewAttendance: updatedAccess.canViewAttendance,
      canViewResults: updatedAccess.canViewResults,
      canViewFees: updatedAccess.canViewFees,
      canDownloadReports: updatedAccess.canDownloadReports,
      hasPassword: !!updatedAccess.passwordHash,
      lastLogin: updatedAccess.lastLogin,
      updatedAt: updatedAccess.updatedAt,
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
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'GUARDIAN_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('Password must be')) {
        return NextResponse.json(
          { error: 'GUARDIAN_VALIDATION_ERROR', message: error.message },
          { status: 400 }
        )
      }
    }
    console.error('Error updating guardian portal access:', error)
    return NextResponse.json(
      { error: 'Failed to update portal access' },
      { status: 500 }
    )
  }
}
