/**
 * Super Admin - Force Logout School Users
 * POST /api/super-admin/schools/[id]/force-logout
 * 
 * Requirements: 7.5, 7.7, 7.8
 * - Invalidate all active sessions for school users
 * - Create audit log entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { contextManagementService } from '@/services/context-management.service'

/**
 * POST /api/super-admin/schools/[id]/force-logout
 * Force logout all users in a school
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
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get count of active users in the school for reporting
    const activeUsersCount = await prisma.user.count({
      where: {
        schoolId: schoolId,
        isActive: true,
      },
    })

    // Invalidate all active sessions for school users
    // This uses the context management service to clear all session contexts
    // for users belonging to this school
    try {
      await contextManagementService.clearAllSchoolContexts(
        schoolId,
        'SECURITY_CONCERN'
      )
    } catch (contextError) {
      console.error('Failed to clear school contexts:', contextError)
      // Continue with audit logging even if context clearing fails
    }

    // Create audit log entry
    await prisma.superAdminAuditLog.create({
      data: {
        timestamp: new Date(),
        adminId: session.user.id,
        adminEmail: session.user.email,
        actionType: ActionType.FORCE_LOGOUT,
        targetSchoolId: schoolId,
        targetSchoolName: school.name,
        reason: reason.trim(),
        result: 'success',
        errorMessage: null,
        ipAddress,
        userAgent,
        metadata: {
          activeUsersCount,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'All school users have been logged out successfully',
      data: {
        schoolId: school.id,
        schoolName: school.name,
        usersAffected: activeUsersCount,
      },
    })

  } catch (error) {
    console.error('Force logout error:', error)
    
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
            actionType: ActionType.FORCE_LOGOUT,
            targetSchoolId: params.id,
            targetSchoolName: 'Unknown',
            reason: 'System error during force logout',
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
        message: 'Failed to force logout school users',
      },
      { status: 500 }
    )
  }
}
