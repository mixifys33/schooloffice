/**
 * Fees API Route
 * Requirements: 4.1, 4.5, 6.1, 6.2, 6.4 - Display students with fee information and filter unpaid
 * GET: Return paginated student fee data scoped to authenticated school
 * All queries are scoped by school_id for tenant isolation (Requirement 6.1, 6.2)
 * Role-based access enforced at API level (Requirement 4.5)
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

export interface FeeListItem {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  classId: string
  className: string
  streamName: string | null
  amountRequired: number
  amountPaid: number
  balance: number
  paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL'
  lastPaymentDate: string | null
  lastPaymentMethod: string | null
  isActive: boolean
}

export interface FeesResponse {
  students: FeeListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    totalStudents: number
    paidStudents: number
    unpaidStudents: number
    partialStudents: number
    totalExpected: number
    totalCollected: number
    totalOutstanding: number
  }
}

// GET: List students with fee information
// Requirement 4.5: Enforce role-based access at API level
// Requirement 6.1: All queries scoped by school_id
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

    // Requirement 4.5: Check role-based access for fees read
    if (!canRead(userRole, 'fees')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to fee records' },
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
    const status = searchParams.get('status') || '' // 'NOT_PAID' for unpaid filter

    // Get current term with tenant scoping
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: tenantIsolationService.scopeQuery({}, tenantContext),
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'desc' },
    })

    // Build where clause for students with tenant scoping (Requirement 6.1)
    const where: Record<string, unknown> = tenantIsolationService.scopeQuery({}, tenantContext)
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get all students first to calculate payment status
    const allStudents = await prisma.student.findMany({
      where,
      include: {
        class: true,
        stream: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })


    // Calculate payment status for each student using StudentAccount
    const studentsWithFees = await Promise.all(
      allStudents.map(async (student) => {
        let amountRequired = 0
        let amountPaid = 0
        let lastPaymentDate: string | null = null
        let lastPaymentMethod: string | null = null
        
        if (currentTerm) {
          // Get student account which has aggregated payment data
          const studentAccount = await prisma.studentAccount.findUnique({
            where: {
              studentId_termId: {
                studentId: student.id,
                termId: currentTerm.id,
              },
            },
          })

          if (studentAccount) {
            amountRequired = studentAccount.totalFees
            amountPaid = studentAccount.totalPaid
            lastPaymentDate = studentAccount.lastPaymentDate?.toISOString() || null
            // Get last payment method from most recent payment
            if (studentAccount.lastPaymentDate) {
              const lastPayment = await prisma.payment.findFirst({
                where: {
                  schoolId,
                  studentId: student.id,
                  termId: currentTerm.id,
                  status: 'CONFIRMED',
                },
                orderBy: { receivedAt: 'desc' },
              })
              lastPaymentMethod = lastPayment?.method || null
            }
          } else {
            // Fallback: Get fee structure if no student account exists
            const feeStructure = await prisma.feeStructure.findFirst({
              where: {
                classId: student.classId,
                termId: currentTerm.id,
              },
            })
            amountRequired = feeStructure?.totalAmount || 0
          }
        }

        const balance = amountRequired - amountPaid
        let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
        
        // Determine payment status based on balance and amount paid
        if (balance <= 0 && amountRequired > 0) {
          // Paid in full or overpaid
          paymentStatus = 'PAID'
        } else if (amountPaid > 0 && balance > 0) {
          // Partially paid (has paid something but still owes)
          paymentStatus = 'PARTIAL'
        } else if (amountPaid === 0 && amountRequired > 0) {
          // Not paid at all
          paymentStatus = 'NOT_PAID'
        } else if (amountRequired === 0) {
          // No fees assigned yet
          paymentStatus = 'PAID'
        }

        return {
          id: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          name: `${student.firstName} ${student.lastName}`,
          classId: student.classId,
          className: student.class.name,
          streamName: student.stream?.name || null,
          amountRequired,
          amountPaid,
          balance,
          paymentStatus,
          lastPaymentDate,
          lastPaymentMethod,
          isActive: student.status === 'ACTIVE' && paymentStatus === 'PAID',
        }
      })
    )

    // Filter by payment status if requested (Requirement 6.4)
    let filteredStudents = studentsWithFees
    if (status === 'NOT_PAID') {
      filteredStudents = studentsWithFees.filter(s => s.paymentStatus === 'NOT_PAID')
    } else if (status === 'PAID') {
      filteredStudents = studentsWithFees.filter(s => s.paymentStatus === 'PAID')
    } else if (status === 'PARTIAL') {
      filteredStudents = studentsWithFees.filter(s => s.paymentStatus === 'PARTIAL')
    }

    // Calculate summary
    const summary = {
      totalStudents: studentsWithFees.length,
      paidStudents: studentsWithFees.filter(s => s.paymentStatus === 'PAID').length,
      unpaidStudents: studentsWithFees.filter(s => s.paymentStatus === 'NOT_PAID').length,
      partialStudents: studentsWithFees.filter(s => s.paymentStatus === 'PARTIAL').length,
      totalExpected: studentsWithFees.reduce((sum, s) => sum + s.amountRequired, 0),
      totalCollected: studentsWithFees.reduce((sum, s) => sum + s.amountPaid, 0),
      // Only sum positive balances (money owed), exclude overpaid amounts
      totalOutstanding: studentsWithFees.reduce((sum, s) => sum + Math.max(0, s.balance), 0),
    }

    // Paginate
    const total = filteredStudents.length
    const totalPages = Math.ceil(total / pageSize)
    const paginatedStudents = filteredStudents.slice(
      (page - 1) * pageSize,
      page * pageSize
    )

    const response: FeesResponse = {
      students: paginatedStudents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      summary,
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
    console.error('Error fetching fees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fees data' },
      { status: 500 }
    )
  }
}
