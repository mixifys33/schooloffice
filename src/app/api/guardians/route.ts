/**
 * Guardians API Route
 * GET: Return paginated guardian list with search and filtering
 * POST: Create a new guardian
 * Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5 - Guardian creation, list, search, filter, display, export
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, RelationshipType, MessageChannel } from '@/types/enums'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { 
  TenantContext, 
  TenantIsolationError 
} from '@/services/tenant-isolation.service'
import { GuardianStatus, GuardianFlag } from '@/types/enums'
import { guardianService } from '@/services/guardian.service'
import { CreateGuardianInput } from '@/types/entities'

/**
 * Guardian list item for API response
 * Requirement 9.4: Show name, phone, number of linked students, and status
 */
export interface GuardianListItem {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  secondaryPhone: string | null
  email: string | null
  status: GuardianStatus
  flags: GuardianFlag[]
  studentCount: number
  preferredChannel: string
  lastContactDate: Date | null
  dataQualityScore?: number
  dataQualityIssues?: string[]
}

/**
 * Paginated guardians response
 * Requirement 9.1: Display a paginated list of all guardians
 */
export interface GuardiansListResponse {
  guardians: GuardianListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * GET: List guardians with pagination, search, and filtering
 * Requirement 9.1: Display a paginated list of all guardians
 * Requirement 9.2: Allow searching guardians by name, phone number, or email
 * Requirement 9.3: Allow filtering guardians by status, flags, and linked class
 * Requirement 9.4: Show name, phone, number of linked students, and status
 */
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

    // Create tenant context for isolation
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    
    // Search parameter - Requirement 9.2
    const search = searchParams.get('search')?.trim() || ''
    
    // Filter parameters - Requirement 9.3
    const statusFilter = searchParams.get('status') as GuardianStatus | null
    const flagsFilter = searchParams.getAll('flags') as GuardianFlag[]
    const classIdFilter = searchParams.get('classId')
    
    // Export format parameter - Requirement 9.5
    const format = searchParams.get('format')

    // Build where clause for guardians linked to students in this school
    const whereClause: Record<string, unknown> = {
      studentGuardians: {
        some: {
          student: {
            schoolId: schoolId,
            ...(classIdFilter ? { classId: classIdFilter } : {}),
          },
        },
      },
    }

    // Requirement 9.2: Search by name, phone, or email
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { secondaryPhone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Requirement 9.3: Filter by status
    if (statusFilter && Object.values(GuardianStatus).includes(statusFilter)) {
      whereClause.status = statusFilter
    }

    // Requirement 9.3: Filter by flags
    if (flagsFilter.length > 0) {
      const validFlags = flagsFilter.filter(f => Object.values(GuardianFlag).includes(f))
      if (validFlags.length > 0) {
        whereClause.flags = { hasEvery: validFlags }
      }
    }

    // Get total count for pagination
    const total = await prisma.guardian.count({
      where: whereClause,
    })

    // Get guardians with student count
    const guardians = await prisma.guardian.findMany({
      where: whereClause,
      include: {
        studentGuardians: {
          where: {
            student: {
              schoolId: schoolId,
              ...(classIdFilter ? { classId: classIdFilter } : {}),
            },
          },
          select: {
            studentId: true,
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

    // Transform data - Requirement 9.4
    const guardianList: GuardianListItem[] = guardians.map((guardian) => {
      // Calculate data quality issues
      const dataQualityIssues: string[] = []
      if (!guardian.email) dataQualityIssues.push('Missing email')
      if (!guardian.secondaryPhone) dataQualityIssues.push('Missing secondary phone')
      if (!guardian.nationalId) dataQualityIssues.push('Missing national ID')
      if (!guardian.address) dataQualityIssues.push('Missing address')
      
      // Calculate data quality score (0-100)
      const totalFields = 4
      const filledFields = totalFields - dataQualityIssues.length
      const dataQualityScore = Math.round((filledFields / totalFields) * 100)

      return {
        id: guardian.id,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        name: `${guardian.firstName} ${guardian.lastName}`,
        phone: guardian.phone,
        secondaryPhone: guardian.secondaryPhone,
        email: guardian.email,
        status: guardian.status as GuardianStatus,
        flags: guardian.flags as GuardianFlag[],
        studentCount: guardian.studentGuardians.length,
        preferredChannel: guardian.preferredChannel,
        lastContactDate: guardian.lastContactDate,
        dataQualityScore,
        dataQualityIssues: dataQualityIssues.length > 0 ? dataQualityIssues : undefined,
      }
    })

    // Requirement 9.5: Export to CSV
    if (format === 'csv') {
      // For CSV export, get all guardians (no pagination)
      const allGuardians = await prisma.guardian.findMany({
        where: whereClause,
        include: {
          studentGuardians: {
            where: {
              student: {
                schoolId: schoolId,
              },
            },
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  admissionNumber: true,
                },
              },
            },
          },
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      })

      // Generate CSV content
      const csvHeaders = [
        'First Name',
        'Last Name',
        'Phone',
        'Secondary Phone',
        'Email',
        'Status',
        'Flags',
        'Preferred Channel',
        'Student Count',
        'Students',
        'Last Contact Date',
      ]

      const csvRows = allGuardians.map((guardian) => {
        const students = guardian.studentGuardians
          .map(sg => `${sg.student.firstName} ${sg.student.lastName} (${sg.student.admissionNumber})`)
          .join('; ')
        
        return [
          guardian.firstName,
          guardian.lastName,
          guardian.phone,
          guardian.secondaryPhone || '',
          guardian.email || '',
          guardian.status,
          guardian.flags.join('; '),
          guardian.preferredChannel,
          guardian.studentGuardians.length.toString(),
          students,
          guardian.lastContactDate?.toISOString() || '',
        ]
      })

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="guardians-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    const response: GuardiansListResponse = {
      guardians: guardianList,
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


/**
 * POST: Create a new guardian
 * Requirement 1.1: Create guardian with full name and at least one phone number
 */
export async function POST(request: NextRequest) {
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

    // Check role-based access for guardian write
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to create guardians' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields - Requirement 1.1
    if (!body.firstName || body.firstName.trim().length === 0) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'First name is required' },
        { status: 400 }
      )
    }

    if (!body.lastName || body.lastName.trim().length === 0) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Last name is required' },
        { status: 400 }
      )
    }

    if (!body.phone || body.phone.trim().length === 0) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Build create input
    const createInput: CreateGuardianInput = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: body.phone.trim(),
      secondaryPhone: body.secondaryPhone?.trim() || undefined,
      email: body.email?.trim() || undefined,
      whatsappNumber: body.whatsappNumber?.trim() || undefined,
      nationalId: body.nationalId?.trim() || undefined,
      address: body.address?.trim() || undefined,
      relationship: body.relationship as RelationshipType || RelationshipType.GUARDIAN,
      preferredChannel: body.preferredChannel as MessageChannel || MessageChannel.SMS,
      languagePreference: body.languagePreference || 'en',
      status: body.status as GuardianStatus || GuardianStatus.ACTIVE,
      flags: body.flags as GuardianFlag[] || [],
      optOutNonCritical: body.optOutNonCritical ?? false,
    }

    // Create guardian using service
    const guardian = await guardianService.createGuardian(createInput)

    return NextResponse.json(guardian, { status: 201 })
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
    // Handle validation errors from service
    if (error instanceof Error) {
      if (error.message.includes('Invalid phone number format')) {
        return NextResponse.json(
          { error: 'GUARDIAN_PHONE_INVALID', message: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('required')) {
        return NextResponse.json(
          { error: 'GUARDIAN_VALIDATION_ERROR', message: error.message },
          { status: 400 }
        )
      }
    }
    console.error('Error creating guardian:', error)
    return NextResponse.json(
      { error: 'Failed to create guardian' },
      { status: 500 }
    )
  }
}
