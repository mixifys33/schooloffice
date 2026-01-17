/**
 * Guardian Students API Route
 * GET: Return linked students with relationships
 * POST: Link guardian to student
 * Requirements: 2.1, 2.2, 2.4 - Guardian-student linking
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, RelationshipType } from '@/types/enums'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianService } from '@/services/guardian.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * GET: Get all students linked to a guardian
 * Requirement 2.4: Display all linked students with relationships and primary/secondary status
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

    // Get linked students using service - Requirement 2.4
    const students = await guardianService.getStudentsByGuardian(id)

    return NextResponse.json({
      guardianId: id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      studentCount: students.length,
      students: students.map(student => ({
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`,
        classId: student.classId,
        className: student.className,
        streamId: student.streamId,
        streamName: student.streamName,
        relationshipType: student.relationshipType,
        isPrimary: student.isPrimary,
        isFinanciallyResponsible: student.isFinanciallyResponsible,
        receivesAcademicMessages: student.receivesAcademicMessages,
        receivesFinanceMessages: student.receivesFinanceMessages,
      })),
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
    console.error('Error fetching guardian students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guardian students' },
      { status: 500 }
    )
  }
}

/**
 * POST: Link guardian to a student
 * Requirement 2.1: Require selection of relationship type when linking
 * Requirement 2.2: Allow designation as primary or secondary guardian
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to link guardians' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id: guardianId } = await params

    // Validate ObjectId format
    if (!isValidObjectId(guardianId)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields - Requirement 2.1
    if (!body.studentId) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Student ID is required' },
        { status: 400 }
      )
    }

    if (!body.relationshipType) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Relationship type is required' },
        { status: 400 }
      )
    }

    // Validate relationship type
    if (!Object.values(RelationshipType).includes(body.relationshipType)) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: `Invalid relationship type. Allowed: ${Object.values(RelationshipType).join(', ')}` },
        { status: 400 }
      )
    }

    // Verify guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    // Verify student belongs to school (tenant isolation)
    const student = await prisma.student.findFirst({
      where: {
        id: body.studentId,
        schoolId,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found', message: 'Student not found or does not belong to this school' },
        { status: 404 }
      )
    }

    // Link guardian to student - Requirement 2.1, 2.2
    const studentGuardian = await guardianService.linkGuardianToStudent(
      body.studentId,
      guardianId,
      body.isPrimary ?? false,
      body.relationshipType as RelationshipType
    )

    return NextResponse.json({
      id: studentGuardian.id,
      studentId: studentGuardian.studentId,
      guardianId: studentGuardian.guardianId,
      relationshipType: studentGuardian.relationshipType,
      isPrimary: studentGuardian.isPrimary,
      isFinanciallyResponsible: studentGuardian.isFinanciallyResponsible,
      receivesAcademicMessages: studentGuardian.receivesAcademicMessages,
      receivesFinanceMessages: studentGuardian.receivesFinanceMessages,
      createdAt: studentGuardian.createdAt,
    }, { status: 201 })
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
    // Handle service errors
    if (error instanceof Error) {
      if (error.message.includes('already linked')) {
        return NextResponse.json(
          { error: 'GUARDIAN_LINK_EXISTS', message: error.message },
          { status: 409 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'GUARDIAN_NOT_FOUND', message: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('Relationship type is required')) {
        return NextResponse.json(
          { error: 'GUARDIAN_VALIDATION_ERROR', message: error.message },
          { status: 400 }
        )
      }
    }
    console.error('Error linking guardian to student:', error)
    return NextResponse.json(
      { error: 'Failed to link guardian to student' },
      { status: 500 }
    )
  }
}
