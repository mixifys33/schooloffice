/**
 * Guardians API Route
 * GET: Return paginated guardian data with their linked students
 * Requirements: 4.5, 6.1, 6.2 - Role-based access and tenant isolation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canRead, RoleAccessError } from '@/lib/rbac'
import { 
  tenantIsolationService, 
  TenantContext, 
  TenantIsolationError 
} from '@/services/tenant-isolation.service'

export interface GuardianListItem {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  email: string | null
  relationship: string
  studentCount: number
  students: {
    id: string
    name: string
    className: string
    admissionNumber: string
  }[]
  preferredChannel: string
  consentGiven: boolean
}

export interface GuardiansResponse {
  guardians: GuardianListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// GET: List guardians with pagination and search
export async function GET(request: NextRequest) {
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

    // Check role-based access for guardian read
    if (!canRead(userRole, 'student')) { // Guardians are part of student management
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

    // Create tenant context for isolation
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''

    // Build where clause for guardians linked to students in this school
    let where: any = {}
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get guardians that have students in this school
    const guardians = await prisma.guardian.findMany({
      where: {
        ...where,
        studentGuardians: {
          some: {
            student: {
              schoolId: schoolId,
            },
          },
        },
      },
      include: {
        studentGuardians: {
          where: {
            student: {
              schoolId: schoolId,
            },
          },
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get total count
    const total = await prisma.guardian.count({
      where: {
        ...where,
        studentGuardians: {
          some: {
            student: {
              schoolId: schoolId,
            },
          },
        },
      },
    })

    // Transform data
    const guardiansWithStudents: GuardianListItem[] = guardians.map((guardian) => {
      const students = guardian.studentGuardians.map((sg) => ({
        id: sg.student.id,
        name: `${sg.student.firstName} ${sg.student.lastName}`,
        className: sg.student.class.name,
        admissionNumber: sg.student.admissionNumber,
      }))

      return {
        id: guardian.id,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        name: `${guardian.firstName} ${guardian.lastName}`,
        phone: guardian.phone,
        email: guardian.email,
        relationship: guardian.relationship,
        studentCount: students.length,
        students,
        preferredChannel: guardian.preferredChannel,
        consentGiven: guardian.consentGiven,
      }
    })

    const response: GuardiansResponse = {
      guardians: guardiansWithStudents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    // Handle role access errors
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    // Handle tenant isolation errors
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching guardians:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guardians' },
      { status: 500 }
    )
  }
}