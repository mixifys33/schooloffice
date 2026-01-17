/**
 * Super Admin Individual School Management API Route
 * Requirements: 13.2, 13.3, 13.5, 18.4
 * - GET: Get school details
 * - PUT: Update school (activate, suspend, modify limits)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'
import { auditService } from '@/services/audit.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/schools/[id]
 * Get school details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, staff: true }
        }
      }
    })

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    return NextResponse.json({ school })
  } catch (error) {
    console.error('Error fetching school:', error)
    return NextResponse.json(
      { error: 'Failed to fetch school data' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/schools/[id]
 * Update school - activate, suspend, modify limits
 * Requirements: 13.2, 13.3, 13.5
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason, ...updateData } = body

    // Get current school state for audit logging
    const currentSchool = await prisma.school.findUnique({
      where: { id }
    })

    if (!currentSchool) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    let updatedSchool

    switch (action) {
      case 'activate':
        // Requirement 13.2: Set school status to Active and enable all features
        updatedSchool = await prisma.school.update({
          where: { id },
          data: { 
            isActive: true,
            features: {
              smsEnabled: true,
              whatsappEnabled: true,
              paymentIntegration: currentSchool.licenseType !== LicenseType.FREE_PILOT,
              advancedReporting: currentSchool.licenseType === LicenseType.PREMIUM,
              bulkMessaging: currentSchool.licenseType !== LicenseType.FREE_PILOT
            }
          }
        })
        break

      case 'suspend':
        // Requirement 13.3: Set school status to Suspended and disable features
        updatedSchool = await prisma.school.update({
          where: { id },
          data: { 
            isActive: false,
            features: {
              smsEnabled: false,
              whatsappEnabled: false,
              paymentIntegration: false,
              advancedReporting: false,
              bulkMessaging: false
            }
          }
        })
        break

      case 'updateLimits':
        // Requirement 13.5: Update school's maximum student count
        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            smsBudgetPerTerm: updateData.smsBudgetPerTerm ?? currentSchool.smsBudgetPerTerm
          }
        })
        break

      case 'updateLicense':
        // Update license type
        const newLicenseType = updateData.licenseType as LicenseType
        const features = {
          smsEnabled: true,
          whatsappEnabled: true,
          paymentIntegration: newLicenseType !== LicenseType.FREE_PILOT,
          advancedReporting: newLicenseType === LicenseType.PREMIUM,
          bulkMessaging: newLicenseType !== LicenseType.FREE_PILOT
        }
        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            licenseType: newLicenseType,
            features
          }
        })
        break

      default:
        // General update
        updatedSchool = await prisma.school.update({
          where: { id },
          data: updateData
        })
    }

    // Create audit log entry - Requirement 18.4
    // Log action with Super Admin ID and reason
    await auditService.log({
      schoolId: id,
      userId: session.user.id,
      action: action === 'activate' ? 'school_activated' : 
              action === 'suspend' ? 'school_suspended' : 
              action === 'updateLicense' ? 'license_changed' :
              action || 'school_updated',
      resource: 'school',
      resourceId: id,
      previousValue: {
        isActive: currentSchool.isActive,
        licenseType: currentSchool.licenseType,
        features: currentSchool.features,
        smsBudgetPerTerm: currentSchool.smsBudgetPerTerm,
      },
      newValue: {
        isActive: updatedSchool.isActive,
        licenseType: updatedSchool.licenseType,
        features: updatedSchool.features,
        smsBudgetPerTerm: updatedSchool.smsBudgetPerTerm,
        reason: reason || undefined,
        superAdminId: session.user.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({ school: updatedSchool, success: true })
  } catch (error) {
    console.error('Error updating school:', error)
    return NextResponse.json(
      { error: 'Failed to update school' },
      { status: 500 }
    )
  }
}
