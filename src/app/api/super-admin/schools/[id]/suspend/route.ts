/**
 * Super Admin - Suspend School
 * POST /api/super-admin/schools/[id]/suspend
 * 
 * Requirements: 7.1, 7.7, 7.8
 * - Implement suspend action with confirmation and reason
 * - Update school status to suspended
 * - Disable school access
 * - Create audit log entry
 * - Invalidate caches
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { contextManagementService } from '@/services/context-management.service'
import { invalidateDashboardCache } from '@/app/api/super-admin/dashboard/route'

/**
 * POST /api/super-admin/schools/[id]/suspend
 * Suspend a school
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate and authorize
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const { id: schoolId } = await params
    const { reason } = await request.json()

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Get school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    // Check if school is already suspended
    if (!school.isActive) {
      return NextResponse.json(
        { error: 'Conflict', message: 'School is already suspended' },
        { status: 409 }
      )
    }

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Suspend the school
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Invalidate all active sessions for school users
    // This disables school access by logging out all users
    try {
      await contextManagementService.clearAllSchoolContexts(
        schoolId,
        'SCHOOL_SUSPENDED'
      )
    } catch (contextError) {
      console.error('Failed to clear school contexts:', contextError)
      // Continue with audit logging even if context clearing fails
    }

    // Invalidate dashboard cache
    try {
      invalidateDashboardCache()
    } catch (cacheError) {
      console.error('Failed to invalidate dashboard cache:', cacheError)
      // Continue even if cache invalidation fails
    }

    // Create audit log entry
    await prisma.superAdminAuditLog.create({
      data: {
        timestamp: new Date(),
        adminId: session.user.id,
        adminEmail: session.user.email,
        actionType: ActionType.SUSPEND,
        targetSchoolId: schoolId,
        targetSchoolName: school.name,
        reason: reason.trim(),
        result: 'success',
        errorMessage: null,
        ipAddress,
        userAgent,
        metadata: {
          previousStatus: 'active',
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'School suspended successfully',
      data: {
        schoolId: school.id,
        schoolName: school.name,
        previousStatus: 'active',
        newStatus: 'suspended',
      },
    })

  } catch (error) {
    console.error('Suspend school error:', error)
    
    // Try to log the error in audit log
    try {
      const session = await auth()
      if (session?.user) {
        const ipAddress = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        await prisma.superAdminAuditLog.create({
          data: {
            timestamp: new Date(),
            adminId: session.user.id,
            adminEmail: session.user.email,
            actionType: ActionType.SUSPEND,
            targetSchoolId: params.id,
            targetSchoolName: 'Unknown',
            reason: 'System error during suspend',
            result: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            ipAddress,
            userAgent,
            metadata: {},
          },
        })
      }
    } catch (auditError) {
      console.error('Failed to create audit log for error:', auditError)
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to suspend school',
      },
      { status: 500 }
    )
  }
}
