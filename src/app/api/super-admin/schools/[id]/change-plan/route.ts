/**
 * Super Admin - Change School Plan
 * POST /api/super-admin/schools/[id]/change-plan
 * 
 * Requirements: 7.3, 7.7, 7.8
 * - Implement plan change action
 * - Update subscription plan and billing
 * - Create audit log entry
 * - Invalidate caches
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType, LicenseType, PaymentTier } from '@prisma/client'
import { invalidateDashboardCache } from '@/app/api/super-admin/dashboard/route'

/**
 * POST /api/super-admin/schools/[id]/change-plan
 * Change a school's subscription plan
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
    const { reason, licenseType, paymentTier, paymentAmount, studentCount } = await request.json()

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Validate licenseType if provided
    if (licenseType && !Object.values(LicenseType).includes(licenseType)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid license type' },
        { status: 400 }
      )
    }

    // Validate paymentTier if provided
    if (paymentTier && !Object.values(PaymentTier).includes(paymentTier)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid payment tier' },
        { status: 400 }
      )
    }

    // Get school details with current subscription
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        licenseType: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    // Get current subscription if exists
    const currentSubscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
    })

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Update license type if provided
    if (licenseType) {
      updateData.licenseType = licenseType
    }

    // Store previous values for audit log
    const previousValues = {
      licenseType: school.licenseType,
      paymentTier: currentSubscription?.paymentTier,
      paymentAmount: currentSubscription?.paymentAmount,
      studentCount: currentSubscription?.studentCount,
    }

    // Update school license type
    await prisma.school.update({
      where: { id: schoolId },
      data: updateData,
    })

    // Update or create subscription if payment tier is provided
    if (paymentTier) {
      const subscriptionData = {
        paymentTier,
        paymentAmount: paymentAmount ?? currentSubscription?.paymentAmount ?? 0,
        studentCount: studentCount ?? currentSubscription?.studentCount ?? 0,
        isActive: true,
        lastPaymentDate: new Date(),
        updatedAt: new Date(),
      }

      // Calculate access expiry for HALF and QUARTER tiers
      if (paymentTier === PaymentTier.HALF || paymentTier === PaymentTier.QUARTER) {
        const expiryDate = new Date()
        expiryDate.setMonth(expiryDate.getMonth() + 1) // 1 month access
        subscriptionData['accessExpiresAt'] = expiryDate
      } else {
        subscriptionData['accessExpiresAt'] = null
      }

      if (currentSubscription) {
        // Update existing subscription
        await prisma.schoolSubscription.update({
          where: { schoolId },
          data: subscriptionData,
        })
      } else {
        // Create new subscription
        await prisma.schoolSubscription.create({
          data: {
            schoolId,
            ...subscriptionData,
          },
        })
      }

      // Update SMS credit allocation if payment tier changed
      if (studentCount && paymentTier) {
        const creditsAllocated = calculateSMSCredits(paymentTier, studentCount)
        
        const existingAllocation = await prisma.sMSCreditAllocation.findUnique({
          where: { schoolId },
        })

        const allocationData = {
          paymentTier,
          studentCount,
          creditsAllocated,
          creditsRemaining: existingAllocation 
            ? existingAllocation.creditsRemaining + (creditsAllocated - existingAllocation.creditsAllocated)
            : creditsAllocated,
          accessExpiresAt: subscriptionData['accessExpiresAt'],
          updatedAt: new Date(),
        }

        if (existingAllocation) {
          await prisma.sMSCreditAllocation.update({
            where: { schoolId },
            data: allocationData,
          })
        } else {
          await prisma.sMSCreditAllocation.create({
            data: {
              schoolId,
              creditsUsed: 0,
              ...allocationData,
            },
          })
        }
      }
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
        actionType: ActionType.CHANGE_PLAN,
        targetSchoolId: schoolId,
        targetSchoolName: school.name,
        reason: reason.trim(),
        result: 'success',
        errorMessage: null,
        ipAddress,
        userAgent,
        metadata: {
          previousValues,
          newValues: {
            licenseType: licenseType ?? school.licenseType,
            paymentTier,
            paymentAmount,
            studentCount,
          },
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Get updated subscription for response
    const updatedSubscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
    })

    const updatedSchool = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { licenseType: true },
    })

    return NextResponse.json({
      success: true,
      message: 'School plan changed successfully',
      data: {
        schoolId: school.id,
        schoolName: school.name,
        previousValues,
        newValues: {
          licenseType: updatedSchool?.licenseType,
          paymentTier: updatedSubscription?.paymentTier,
          paymentAmount: updatedSubscription?.paymentAmount,
          studentCount: updatedSubscription?.studentCount,
          accessExpiresAt: updatedSubscription?.accessExpiresAt,
        },
      },
    })

  } catch (error) {
    console.error('Change plan error:', error)
    
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
            actionType: ActionType.CHANGE_PLAN,
            targetSchoolId: params.id,
            targetSchoolName: 'Unknown',
            reason: 'System error during plan change',
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
        message: 'Failed to change school plan',
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate SMS credits based on payment tier and student count
 * FULL: 9x student count
 * HALF: 4.5x student count
 * QUARTER: 2.25x student count
 * NONE: 0 credits
 */
function calculateSMSCredits(paymentTier: PaymentTier, studentCount: number): number {
  switch (paymentTier) {
    case PaymentTier.FULL:
      return Math.floor(studentCount * 9)
    case PaymentTier.HALF:
      return Math.floor(studentCount * 4.5)
    case PaymentTier.QUARTER:
      return Math.floor(studentCount * 2.25)
    case PaymentTier.NONE:
      return 0
    default:
      return 0
  }
}
