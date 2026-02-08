/**
 * Super Admin - Impersonate School Admin
 * POST /api/super-admin/schools/[id]/impersonate
 * 
 * Requirements: 7.6, 7.7, 7.8
 * - Log super admin into school admin account
 * - Maintain audit trail of impersonation
 * - Create audit log entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, AuthEventType } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { superAdminRestrictionService } from '@/services/super-admin-restriction.service'

/**
 * POST /api/super-admin/schools/[id]/impersonate
 * Start impersonation session for school admin
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
    const body = await request.json()
    const { reason, durationMinutes = 30, isReadOnly = true } = body

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Validate duration (max 2 hours)
    const maxDurationMinutes = 120
    const actualDuration = Math.min(durationMinutes, maxDurationMinutes)
    const durationMs = actualDuration * 60 * 1000

    // Get school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    // Find the school admin user
    const schoolAdmin = await prisma.user.findFirst({
      where: {
        schoolId: schoolId,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!schoolAdmin) {
      return NextResponse.json(
        { error: 'Not Found', message: 'No active school admin found for this school' },
        { status: 404 }
      )
    }

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Start impersonation session using the super admin restriction service
    let impersonationSession
    try {
      impersonationSession = await superAdminRestrictionService.startImpersonation(
        session.user.id,
        schoolId,
        durationMs,
        isReadOnly
      )
    } catch (error) {
      console.error('Failed to start impersonation session:', error)
      
      // Create failure audit log
      await prisma.superAdminAuditLog.create({
        data: {
          timestamp: new Date(),
          adminId: session.user.id,
          adminEmail: session.user.email,
          actionType: ActionType.IMPERSONATE,
          targetSchoolId: schoolId,
          targetSchoolName: school.name,
          reason: reason.trim(),
          result: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Failed to start impersonation session',
          ipAddress,
          userAgent,
          metadata: {
            schoolAdminId: schoolAdmin.id,
            schoolAdminEmail: schoolAdmin.email,
            durationMinutes: actualDuration,
            isReadOnly,
          },
        },
      })

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Failed to start impersonation session',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // Create success audit log entry
    await prisma.superAdminAuditLog.create({
      data: {
        timestamp: new Date(),
        adminId: session.user.id,
        adminEmail: session.user.email,
        actionType: ActionType.IMPERSONATE,
        targetSchoolId: schoolId,
        targetSchoolName: school.name,
        reason: reason.trim(),
        result: 'success',
        errorMessage: null,
        ipAddress,
        userAgent,
        metadata: {
          sessionId: impersonationSession.id,
          schoolAdminId: schoolAdmin.id,
          schoolAdminEmail: schoolAdmin.email,
          schoolAdminName: `${schoolAdmin.firstName} ${schoolAdmin.lastName}`,
          durationMinutes: actualDuration,
          isReadOnly,
          startedAt: impersonationSession.startedAt.toISOString(),
          expiresAt: impersonationSession.expiresAt.toISOString(),
        },
      },
    })

    // Return impersonation session details
    return NextResponse.json({
      success: true,
      message: `Impersonation session started for ${school.name}. ${isReadOnly ? 'Read-only access.' : 'Time-boxed access.'} Expires in ${actualDuration} minutes.`,
      data: {
        sessionId: impersonationSession.id,
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        schoolAdminId: schoolAdmin.id,
        schoolAdminEmail: schoolAdmin.email,
        schoolAdminName: `${schoolAdmin.firstName} ${schoolAdmin.lastName}`,
        startedAt: impersonationSession.startedAt.toISOString(),
        expiresAt: impersonationSession.expiresAt.toISOString(),
        durationMinutes: actualDuration,
        isReadOnly,
        // URL to redirect to for impersonation
        redirectUrl: `/dashboard?impersonate=${impersonationSession.id}`,
      },
    })

  } catch (error) {
    console.error('Impersonate error:', error)
    
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
            actionType: ActionType.IMPERSONATE,
            targetSchoolId: params.id,
            targetSchoolName: 'Unknown',
            reason: 'System error during impersonation',
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
        message: 'Failed to start impersonation session',
      },
      { status: 500 }
    )
  }
}
