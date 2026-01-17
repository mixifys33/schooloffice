/**
 * Super Admin Individual Pilot School Management API Route
 * Requirements: 15.2, 15.3, 15.4, 15.5
 * - GET: Get pilot school details
 * - PUT: Update pilot limits, extend pilot, convert to paid
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/pilots/[id]
 * Get pilot school details
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

    if (school.licenseType !== LicenseType.FREE_PILOT) {
      return NextResponse.json({ error: 'School is not a pilot school' }, { status: 400 })
    }

    return NextResponse.json({ school })
  } catch (error) {
    console.error('Error fetching pilot school:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pilot school data' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/pilots/[id]
 * Update pilot school - extend pilot, update limits, convert to paid
 * Requirements: 15.2, 15.3, 15.4, 15.5
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
    const { action, ...updateData } = body

    // Get current school state
    const currentSchool = await prisma.school.findUnique({
      where: { id }
    })

    if (!currentSchool) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const currentFeatures = currentSchool.features as Record<string, unknown>
    let updatedSchool

    switch (action) {
      case 'extendPilot':
        // Requirement 15.4: Extend pilot end date
        const { extensionDays } = updateData
        if (!extensionDays || extensionDays < 1) {
          return NextResponse.json({ error: 'Extension days must be at least 1' }, { status: 400 })
        }

        const currentEndDate = currentFeatures.pilotEndDate 
          ? new Date(currentFeatures.pilotEndDate as string)
          : new Date(currentSchool.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        
        const newEndDate = new Date(currentEndDate)
        newEndDate.setDate(newEndDate.getDate() + extensionDays)

        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            isActive: true, // Reactivate if suspended
            features: {
              ...currentFeatures,
              pilotEndDate: newEndDate.toISOString()
            }
          }
        })
        break

      case 'updateLimits':
        // Requirements 15.2, 15.3: Update student and SMS limits
        const { studentLimit, smsLimit } = updateData
        
        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            features: {
              ...currentFeatures,
              pilotStudentLimit: studentLimit ?? currentFeatures.pilotStudentLimit,
              pilotSmsLimit: smsLimit ?? currentFeatures.pilotSmsLimit
            }
          }
        })
        break

      case 'convertToPaid':
        // Requirement 15.5: Convert pilot to paid - remove limits and set plan to Paid
        const { licenseType } = updateData
        const newLicenseType = licenseType || LicenseType.BASIC

        // Get features for the new license type
        const paidFeatures = {
          smsEnabled: true,
          whatsappEnabled: true,
          paymentIntegration: newLicenseType !== LicenseType.FREE_PILOT,
          advancedReporting: newLicenseType === LicenseType.PREMIUM,
          bulkMessaging: newLicenseType !== LicenseType.FREE_PILOT,
          // Remove pilot-specific limits
          pilotEndDate: undefined,
          pilotStudentLimit: undefined,
          pilotSmsLimit: undefined,
          smsSentCount: undefined
        }

        // Set SMS budget based on license type
        const smsBudget = newLicenseType === LicenseType.PREMIUM ? 200000 : 50000

        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            licenseType: newLicenseType,
            isActive: true,
            smsBudgetPerTerm: smsBudget,
            features: paidFeatures
          }
        })
        break

      case 'suspend':
        // Requirement 15.4: Suspend expired pilot
        updatedSchool = await prisma.school.update({
          where: { id },
          data: {
            isActive: false,
            features: {
              ...currentFeatures,
              smsEnabled: false,
              whatsappEnabled: false,
              bulkMessaging: false
            }
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        schoolId: id,
        userId: session.user.id,
        action: `PILOT_${action.toUpperCase()}`,
        resource: 'School',
        resourceId: id,
        previousValue: { features: currentFeatures, licenseType: currentSchool.licenseType },
        newValue: { features: updatedSchool.features, licenseType: updatedSchool.licenseType }
      }
    })

    return NextResponse.json({ school: updatedSchool, success: true })
  } catch (error) {
    console.error('Error updating pilot school:', error)
    return NextResponse.json(
      { error: 'Failed to update pilot school' },
      { status: 500 }
    )
  }
}
