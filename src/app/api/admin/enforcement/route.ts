/**
 * Super Admin Enforcement API Route
 * Requirements: 14.4, 19.1, 19.2, 19.3, 19.4
 * - POST: Trigger manual enforcement check for all schools
 * - GET: Get current enforcement status for all schools
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enforcementService } from '@/services/enforcement.service'
import { prisma } from '@/lib/db'

/**
 * GET /api/admin/enforcement
 * Gets the current enforcement status for all schools
 * Requirement 19.1: Daily system check for all schools
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Get all schools and check their enforcement status
    const schools = await prisma.school.findMany({
      select: { id: true }
    })

    const enforcementStatuses = await Promise.all(
      schools.map(school => enforcementService.checkSchoolStatus(school.id))
    )

    const summary = {
      totalSchools: enforcementStatuses.length,
      activeSchools: enforcementStatuses.filter(s => s.isActive && !s.isSuspended).length,
      gracePeriodSchools: enforcementStatuses.filter(s => s.paymentStatus === 'GRACE_PERIOD').length,
      suspendedSchools: enforcementStatuses.filter(s => s.isSuspended).length,
      needsEnforcement: enforcementStatuses.filter(s => s.nextAction !== undefined).length
    }

    return NextResponse.json({
      summary,
      schools: enforcementStatuses.map(s => ({
        schoolId: s.schoolId,
        schoolName: s.schoolName,
        paymentStatus: s.paymentStatus,
        daysOverdue: s.daysOverdue,
        isActive: s.isActive,
        isSuspended: s.isSuspended,
        disabledFeatures: s.disabledFeatures,
        needsAction: s.nextAction !== undefined
      })),
      lastChecked: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting enforcement status:', error)
    return NextResponse.json(
      { error: 'Failed to get enforcement status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/enforcement
 * Triggers enforcement check and applies suspensions
 * Requirement 14.4: Set school status to Suspended when grace period expires
 * Requirement 19.2: Automatically suspend schools unpaid and past grace period
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Run the daily enforcement check using the enforcement service
    const result = await enforcementService.runDailyCheck()

    // Log enforcement actions in audit trail
    for (const schoolId of result.suspendedSchools) {
      try {
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: session.user.id,
            action: 'SCHOOL_SUSPENDED',
            resource: 'school',
            resourceId: schoolId,
            details: {
              reason: 'Grace period expired - automatic suspension',
              enforcedAt: new Date().toISOString(),
              enforcedBy: session.user.id
            }
          }
        })
      } catch {
        console.error(`Failed to create audit log for school suspension: ${schoolId}`)
      }
    }

    for (const schoolId of result.warningSchools) {
      try {
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: session.user.id,
            action: 'FEATURES_RESTRICTED',
            resource: 'school',
            resourceId: schoolId,
            details: {
              reason: 'Payment overdue - features restricted',
              enforcedAt: new Date().toISOString(),
              enforcedBy: session.user.id
            }
          }
        })
      } catch {
        console.error(`Failed to create audit log for feature restriction: ${schoolId}`)
      }
    }

    for (const schoolId of result.restoredSchools) {
      try {
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: session.user.id,
            action: 'SCHOOL_RESTORED',
            resource: 'school',
            resourceId: schoolId,
            details: {
              reason: 'Payment received - access restored',
              enforcedAt: new Date().toISOString(),
              enforcedBy: session.user.id
            }
          }
        })
      } catch {
        console.error(`Failed to create audit log for school restoration: ${schoolId}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Enforcement completed. ${result.suspendedSchools.length} schools suspended, ${result.warningSchools.length} schools warned, ${result.restoredSchools.length} schools restored.`,
      details: {
        checked: result.checkedSchools,
        suspended: result.suspendedSchools.length,
        warned: result.warningSchools.length,
        restored: result.restoredSchools.length
      },
      timestamp: result.timestamp.toISOString()
    })
  } catch (error) {
    console.error('Error running enforcement:', error)
    return NextResponse.json(
      { error: 'Failed to run enforcement' },
      { status: 500 }
    )
  }
}
