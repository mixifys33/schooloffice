/**
 * Individual Guardian API Route
 * GET: Return full guardian profile
 * PUT: Update guardian fields
 * Requirements: 1.2, 1.3 - Guardian profile view and edit
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, RelationshipType, MessageChannel, GuardianStatus, GuardianFlag } from '@/types/enums'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianService } from '@/services/guardian.service'
import { guardianAuditService, GuardianAuditAction } from '@/services/guardian-audit.service'
import { UpdateGuardianInput } from '@/types/entities'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * GET: Get guardian by ID with full profile
 * Requirement 1.2: Display full guardian profile with all fields
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

    // Check role-based access for guardian read
    if (!canRead(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to guardian records' },
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

    // Get guardian with tenant isolation check
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
      include: {
        studentGuardians: {
          include: {
            student: {
              include: {
                class: true,
                stream: true,
              },
            },
          },
        },
        portalAccess: true,
        documents: {
          orderBy: { uploadedAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    // Calculate data quality score
    const dataQualityIssues: string[] = []
    if (!guardian.email) dataQualityIssues.push('Missing email')
    if (!guardian.secondaryPhone) dataQualityIssues.push('Missing secondary phone')
    if (!guardian.nationalId) dataQualityIssues.push('Missing national ID')
    if (!guardian.address) dataQualityIssues.push('Missing address')
    
    const totalFields = 4
    const filledFields = totalFields - dataQualityIssues.length
    const dataQualityScore = Math.round((filledFields / totalFields) * 100)

    // Format response - Requirement 1.2
    return NextResponse.json({
      id: guardian.id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      name: `${guardian.firstName} ${guardian.lastName}`,
      phone: guardian.phone,
      secondaryPhone: guardian.secondaryPhone,
      phoneVerified: guardian.phoneVerified,
      email: guardian.email,
      emailVerified: guardian.emailVerified,
      whatsappNumber: guardian.whatsappNumber,
      nationalId: guardian.nationalId,
      address: guardian.address,
      relationship: guardian.relationship,
      preferredChannel: guardian.preferredChannel,
      languagePreference: guardian.languagePreference,
      status: guardian.status,
      flags: guardian.flags,
      optOutNonCritical: guardian.optOutNonCritical,
      lastContactDate: guardian.lastContactDate,
      consentGiven: guardian.consentGiven,
      consentDate: guardian.consentDate,
      createdAt: guardian.createdAt,
      updatedAt: guardian.updatedAt,
      // Linked students summary
      studentCount: guardian.studentGuardians.length,
      students: guardian.studentGuardians.map(sg => ({
        id: sg.student.id,
        admissionNumber: sg.student.admissionNumber,
        firstName: sg.student.firstName,
        lastName: sg.student.lastName,
        name: `${sg.student.firstName} ${sg.student.lastName}`,
        className: sg.student.class?.name,
        streamName: sg.student.stream?.name,
        relationshipType: sg.relationshipType,
        isPrimary: sg.isPrimary,
        isFinanciallyResponsible: sg.isFinanciallyResponsible,
        receivesAcademicMessages: sg.receivesAcademicMessages,
        receivesFinanceMessages: sg.receivesFinanceMessages,
      })),
      // Portal access summary
      portalAccess: guardian.portalAccess ? {
        isEnabled: guardian.portalAccess.isEnabled,
        canViewAttendance: guardian.portalAccess.canViewAttendance,
        canViewResults: guardian.portalAccess.canViewResults,
        canViewFees: guardian.portalAccess.canViewFees,
        canDownloadReports: guardian.portalAccess.canDownloadReports,
        lastLogin: guardian.portalAccess.lastLogin,
      } : null,
      // Recent documents
      recentDocuments: guardian.documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
      })),
      // Data quality
      dataQualityScore,
      dataQualityIssues: dataQualityIssues.length > 0 ? dataQualityIssues : undefined,
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
    console.error('Error fetching guardian:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guardian' },
      { status: 500 }
    )
  }
}


/**
 * PUT: Update guardian fields
 * Requirement 1.3: Validate phone number format before saving
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

    // Check role-based access for guardian write
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update guardians' },
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
    const existingGuardian = await prisma.guardian.findFirst({
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

    if (!existingGuardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build update input
    const updateInput: UpdateGuardianInput = {}

    if (body.firstName !== undefined) updateInput.firstName = body.firstName
    if (body.lastName !== undefined) updateInput.lastName = body.lastName
    if (body.phone !== undefined) updateInput.phone = body.phone
    if (body.secondaryPhone !== undefined) updateInput.secondaryPhone = body.secondaryPhone
    if (body.email !== undefined) updateInput.email = body.email
    if (body.whatsappNumber !== undefined) updateInput.whatsappNumber = body.whatsappNumber
    if (body.nationalId !== undefined) updateInput.nationalId = body.nationalId
    if (body.address !== undefined) updateInput.address = body.address
    if (body.relationship !== undefined) updateInput.relationship = body.relationship as RelationshipType
    if (body.preferredChannel !== undefined) updateInput.preferredChannel = body.preferredChannel as MessageChannel
    if (body.languagePreference !== undefined) updateInput.languagePreference = body.languagePreference
    if (body.status !== undefined) updateInput.status = body.status as GuardianStatus
    if (body.flags !== undefined) updateInput.flags = body.flags as GuardianFlag[]
    if (body.optOutNonCritical !== undefined) updateInput.optOutNonCritical = body.optOutNonCritical

    // Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      undefined

    // Log status change if applicable - Requirement 6.5
    if (body.status !== undefined && body.status !== existingGuardian.status) {
      await guardianAuditService.logChange({
        guardianId: id,
        action: GuardianAuditAction.STATUS_CHANGED,
        field: 'status',
        previousValue: existingGuardian.status,
        newValue: body.status,
        performedBy: userId,
        ipAddress: ipAddress ?? undefined,
      })
    }

    // Log flag changes if applicable - Requirement 6.5
    if (body.flags !== undefined) {
      const previousFlags = existingGuardian.flags as GuardianFlag[]
      const newFlags = body.flags as GuardianFlag[]
      
      // Find added flags
      const addedFlags = newFlags.filter(f => !previousFlags.includes(f))
      for (const flag of addedFlags) {
        await guardianAuditService.logChange({
          guardianId: id,
          action: GuardianAuditAction.FLAG_ADDED,
          field: 'flags',
          previousValue: undefined,
          newValue: flag,
          performedBy: userId,
          ipAddress: ipAddress ?? undefined,
        })
      }

      // Find removed flags
      const removedFlags = previousFlags.filter(f => !newFlags.includes(f))
      for (const flag of removedFlags) {
        await guardianAuditService.logChange({
          guardianId: id,
          action: GuardianAuditAction.FLAG_REMOVED,
          field: 'flags',
          previousValue: flag,
          newValue: undefined,
          performedBy: userId,
          ipAddress: ipAddress ?? undefined,
        })
      }
    }

    // Update guardian using service - Requirement 1.3
    const updatedGuardian = await guardianService.updateGuardian(id, updateInput)

    return NextResponse.json(updatedGuardian)
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
    // Handle validation errors from service
    if (error instanceof Error) {
      if (error.message.includes('Invalid phone number format')) {
        return NextResponse.json(
          { error: 'GUARDIAN_PHONE_INVALID', message: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'GUARDIAN_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
    }
    console.error('Error updating guardian:', error)
    return NextResponse.json(
      { error: 'Failed to update guardian' },
      { status: 500 }
    )
  }
}
