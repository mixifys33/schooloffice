/**
 * Super Admin - Bulk Suspend Schools
 * POST /api/super-admin/schools/bulk-suspend
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.6
 * - Process multiple schools with suspend action
 * - Return individual results for each school
 * - Create individual audit log entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { contextManagementService } from '@/services/context-management.service'

interface BulkSuspendRequest {
  schoolIds: string[]
  reason: string
}

interface SchoolResult {
  schoolId: string
  schoolName: string
  success: boolean
  error?: string
}

/**
 * POST /api/super-admin/schools/bulk-suspend
 * Suspend multiple schools
 */
export async function POST(request: NextRequest) {
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

    const body: BulkSuspendRequest = await request.json()
    const { schoolIds, reason } = body

    // Validate schoolIds array
    if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'schoolIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Process each school individually
    const results: SchoolResult[] = []

    for (const schoolId of schoolIds) {
      try {
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
          results.push({
            schoolId,
            schoolName: 'Unknown',
            success: false,
            error: 'School not found',
          })

          // Create failure audit log
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_SUSPEND,
              targetSchoolId: schoolId,
              targetSchoolName: 'Unknown',
              reason: reason.trim(),
              result: 'failure',
              errorMessage: 'School not found',
              ipAddress,
              userAgent,
              metadata: {},
            },
          })

          continue
        }

        // Check if school is already suspended
        if (!school.isActive) {
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            success: false,
            error: 'School is already suspended',
          })

          // Create failure audit log
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_SUSPEND,
              targetSchoolId: school.id,
              targetSchoolName: school.name,
              reason: reason.trim(),
              result: 'failure',
              errorMessage: 'School is already suspended',
              ipAddress,
              userAgent,
              metadata: {
                previousStatus: 'suspended',
              },
            },
          })

          continue
        }

        // Suspend the school
        await prisma.school.update({
          where: { id: schoolId },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        })

        // Invalidate all active sessions for school users
        try {
          await contextManagementService.clearAllSchoolContexts(
            schoolId,
            'SCHOOL_SUSPENDED'
          )
        } catch (contextError) {
          console.error(`Failed to clear school contexts for ${schoolId}:`, contextError)
          // Continue with audit logging even if context clearing fails
        }

        // Create success audit log entry
        await prisma.superAdminAuditLog.create({
          data: {
            timestamp: new Date(),
            adminId: session.user.id,
            adminEmail: session.user.email,
            actionType: ActionType.BULK_SUSPEND,
            targetSchoolId: school.id,
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

        results.push({
          schoolId: school.id,
          schoolName: school.name,
          success: true,
        })

      } catch (schoolError) {
        console.error(`Error suspending school ${schoolId}:`, schoolError)
        
        const errorMessage = schoolError instanceof Error ? schoolError.message : 'Unknown error'
        
        results.push({
          schoolId,
          schoolName: 'Unknown',
          success: false,
          error: errorMessage,
        })

        // Create failure audit log
        try {
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_SUSPEND,
              targetSchoolId: schoolId,
              targetSchoolName: 'Unknown',
              reason: reason.trim(),
              result: 'failure',
              errorMessage,
              ipAddress,
              userAgent,
              metadata: {},
            },
          })
        } catch (auditError) {
          console.error(`Failed to create audit log for school ${schoolId}:`, auditError)
        }
      }
    }

    // Calculate summary statistics
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Bulk suspend completed: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
    })

  } catch (error) {
    console.error('Bulk suspend error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process bulk suspend',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
