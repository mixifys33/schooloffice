/**
 * Students API Route
 * Requirements: 3.1, 3.3, 3.5, 4.5, 6.1, 6.2, 9.4, 22.1, 22.3
 * GET: Return paginated student data scoped to authenticated school
 * POST: Create new student with default payment status NOT PAID
 * Teachers can only view students in their assigned classes (Requirement 9.4)
 * All queries are scoped by school_id for tenant isolation (Requirement 6.1, 6.2)
 * Role-based access enforced at API level (Requirement 4.5)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentStatus, PilotType, Gender, Role } from '@/types/enums'
import { getTeacherAssignments } from '@/lib/teacher-access'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { 
  tenantIsolationService, 
  TenantContext, 
  TenantIsolationError 
} from '@/services/tenant-isolation.service'

export interface StudentListItem {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  gender: string | null
  age: number | null
  classId: string
  className: string
  streamId: string | null
  streamName: string | null
  status: string
  parentPhone: string | null
  parentEmail: string | null
  paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL'
  isActive: boolean
  createdAt: Date
}

export interface StudentsResponse {
  students: StudentListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// GET: List students with pagination, search, filters
// Requirement 4.5: Enforce role-based access at API level
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

    // Requirement 4.5: Check role-based access for student read
    if (!canRead(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to student records' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const classId = searchParams.get('classId') || ''
    const streamId = searchParams.get('streamId') || ''
    const gender = searchParams.get('gender') || ''
    const paymentStatus = searchParams.get('paymentStatus') || ''
    const status = searchParams.get('status') || ''
    const ageRange = searchParams.get('ageRange') || '' // Format: "min-max" e.g., "10-15"

    // Build where clause with tenant scoping (Requirement 6.1)
    const where: Record<string, unknown> = tenantIsolationService.scopeQuery({}, tenantContext)
    
    // Requirement 9.4: Teachers can only view students in their assigned classes
    if (userRole === Role.TEACHER) {
      const assignments = await getTeacherAssignments(userId)
      if (!assignments || assignments.classIds.length === 0) {
        // Teacher has no class assignments - return empty result
        return NextResponse.json({
          students: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        })
      }
      where.classId = { in: assignments.classIds }
    }
    
    if (search) {
      // Enhanced search: search in full name, first name, last name, and admission number
      const searchTerms = search.trim().split(/\s+/)
      
      if (searchTerms.length === 1) {
        // Single term - search across all fields
        const term = searchTerms[0]
        where.OR = [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { admissionNumber: { contains: term, mode: 'insensitive' } },
          // Search for full name match
          {
            AND: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ]
          }
        ]
      } else {
        // Multiple terms - try to match as first name + last name
        const [firstName, ...lastNameParts] = searchTerms
        const lastName = lastNameParts.join(' ')
        
        where.OR = [
          // Exact first + last name match
          {
            AND: [
              { firstName: { contains: firstName, mode: 'insensitive' } },
              { lastName: { contains: lastName, mode: 'insensitive' } },
            ]
          },
          // Reverse order (last name first)
          {
            AND: [
              { firstName: { contains: lastName, mode: 'insensitive' } },
              { lastName: { contains: firstName, mode: 'insensitive' } },
            ]
          },
          // Any term in first name
          { firstName: { contains: search, mode: 'insensitive' } },
          // Any term in last name
          { lastName: { contains: search, mode: 'insensitive' } },
          // Admission number
          { admissionNumber: { contains: search, mode: 'insensitive' } },
        ]
      }
    }

    if (classId) {
      // For teachers, verify they have access to the requested class
      if (userRole === Role.TEACHER) {
        const assignments = await getTeacherAssignments(userId)
        if (!assignments || !assignments.classIds.includes(classId)) {
          return NextResponse.json(
            { error: 'Access denied to this class' },
            { status: 403 }
          )
        }
      }
      where.classId = classId
    }

    if (streamId) {
      where.streamId = streamId
    }

    if (gender) {
      where.gender = gender
    }

    if (status) {
      where.status = status
    }

    // Note: Age range filtering is handled after student data is fetched and age is calculated

    // Get total count
    const total = await prisma.student.count({ where })

    // Get students with related data
    const students = await prisma.student.findMany({
      where,
      include: {
        class: true,
        stream: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
          take: 1,
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get current term for payment status calculation
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'desc' },
    })

    // Calculate payment status for each student
    const studentsWithPayment = await Promise.all(
      students.map(async (student) => {
        let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
        
        if (currentTerm) {
          // Get fee structure for student's class
          const feeStructure = await prisma.feeStructure.findFirst({
            where: {
              classId: student.classId,
              termId: currentTerm.id,
            },
          })

          const totalFees = feeStructure?.totalAmount || 0

          // Get total payments
          const payments = await prisma.payment.aggregate({
            where: {
              studentId: student.id,
              termId: currentTerm.id,
            },
            _sum: { amount: true },
          })

          const totalPaid = payments._sum.amount || 0

          if (totalPaid >= totalFees && totalFees > 0) {
            paymentStatus = 'PAID'
          } else if (totalPaid > 0) {
            paymentStatus = 'PARTIAL'
          }
        }

        const primaryGuardian = student.studentGuardians[0]?.guardian

        // Calculate age
        let age: number | null = null
        if (student.dateOfBirth) {
          const today = new Date()
          const birthDate = new Date(student.dateOfBirth)
          age = today.getFullYear() - birthDate.getFullYear()
          const monthDiff = today.getMonth() - birthDate.getMonth()
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
        }

        return {
          id: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          gender: student.gender,
          age,
          classId: student.classId,
          className: student.class.name,
          streamId: student.streamId,
          streamName: student.stream?.name || null,
          status: student.status,
          parentPhone: primaryGuardian?.phone || null,
          parentEmail: primaryGuardian?.email || null,
          paymentStatus,
          isActive: student.status === StudentStatus.ACTIVE && paymentStatus === 'PAID',
          createdAt: student.createdAt,
        }
      })
    )

    // Filter by payment status and age range if specified (after calculation)
    let filteredStudents = studentsWithPayment
    
    if (paymentStatus) {
      filteredStudents = filteredStudents.filter(
        (student) => student.paymentStatus === paymentStatus
      )
    }
    
    if (ageRange) {
      const [minAge, maxAge] = ageRange.split('-').map(Number)
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        filteredStudents = filteredStudents.filter((student) => {
          if (student.age === null) return false
          
          // Handle special case for "19+" which is represented as "19-25"
          if (ageRange === '19-25') {
            return student.age >= 19
          }
          
          return student.age >= minAge && student.age <= maxAge
        })
      }
    }

    // Recalculate pagination if filters were applied
    const needsClientSidePagination = paymentStatus || ageRange
    const finalTotal = needsClientSidePagination ? filteredStudents.length : total
    const finalTotalPages = Math.ceil(finalTotal / pageSize)
    
    // Apply pagination to filtered results if client-side filtering was used
    if (needsClientSidePagination) {
      const startIndex = (page - 1) * pageSize
      filteredStudents = filteredStudents.slice(startIndex, startIndex + pageSize)
    }

    const response: StudentsResponse = {
      students: filteredStudents,
      pagination: {
        page,
        pageSize,
        total: finalTotal,
        totalPages: finalTotalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    // Handle role access errors (Requirement 4.5)
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}


// POST: Create new student
// Requirement 4.5: Enforce role-based access at API level
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
    const userId = session.user.id as string

    // Requirement 4.5: Check role-based access for student write
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to create students' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    // Requirement 15.2: Check pilot student limit before enrollment
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: { select: { students: true } }
      }
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Validate school belongs to user's tenant (Requirement 6.2)
    tenantIsolationService.enforceResourceAccess(school.id, tenantContext)

    // Check if school is a pilot and has reached student limit
    if (school.licenseType === 'FREE_PILOT') {
      const features = school.features as Record<string, unknown>
      const pilotStudentLimit = (features?.pilotStudentLimit as number) || 50
      
      if (school._count.students >= pilotStudentLimit) {
        return NextResponse.json(
          { error: 'Pilot limit reached', message: 'Pilot limit reached. Cannot enroll new students. Please upgrade to a paid plan.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      admissionNumber,
      classId,
      streamId,
      gender,
      dateOfBirth,
      parentName,
      parentPhone,
      parentEmail,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !admissionNumber || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, admissionNumber, classId' },
        { status: 400 }
      )
    }

    // Check for duplicate admission number
    const existingStudent = await prisma.student.findFirst({
      where: {
        schoolId,
        admissionNumber,
      },
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: `Student with admission number "${admissionNumber}" already exists` },
        { status: 400 }
      )
    }

    // Validate class belongs to school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Invalid class' },
        { status: 400 }
      )
    }

    // Validate stream if provided
    if (streamId) {
      const stream = await prisma.stream.findFirst({
        where: {
          id: streamId,
          classId,
        },
      })

      if (!stream) {
        return NextResponse.json(
          { error: 'Invalid stream for the selected class' },
          { status: 400 }
        )
      }
    }

    // Create student and guardian in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create student with default payment status NOT PAID (Requirement 3.3)
      const student = await tx.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          admissionNumber,
          classId,
          streamId: streamId || null,
          gender: gender as Gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          pilotType: PilotType.FREE,
          smsLimitPerTerm: 2,
          smsSentCount: 0,
          status: StudentStatus.ACTIVE,
          enrollmentDate: new Date(),
        },
      })

      // Create guardian if parent info provided
      if (parentPhone || parentEmail) {
        const [parentFirstName, ...parentLastNameParts] = (parentName || 'Parent').split(' ')
        const parentLastName = parentLastNameParts.join(' ') || lastName

        const guardian = await tx.guardian.create({
          data: {
            firstName: parentFirstName,
            lastName: parentLastName,
            phone: parentPhone || '',
            email: parentEmail || null,
            relationship: 'GUARDIAN',
            preferredChannel: 'SMS',
            consentGiven: false,
          },
        })

        // Link guardian to student as primary
        await tx.studentGuardian.create({
          data: {
            studentId: student.id,
            guardianId: guardian.id,
            isPrimary: true,
          },
        })
      }

      return student
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Handle role access errors (Requirement 4.5)
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error creating student:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}
