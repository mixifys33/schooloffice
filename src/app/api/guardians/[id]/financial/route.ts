/**
 * Guardian Financial API Route
 * GET: Return financial summary for guardian
 * Requirements: 4.4, 4.5 - Guardian financial summary
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canRead, RoleAccessError } from '@/lib/rbac'
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
 * GET: Get financial summary for a guardian
 * Requirement 4.4: Display total fee balance across all linked students
 * Requirement 4.5: Display payment history for all financially-linked students
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
        { error: 'Forbidden', message: 'Your role does not have access to financial records' },
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

    // Get term ID from query params or use current term
    const { searchParams } = new URL(request.url)
    let termId = searchParams.get('termId')

    // If no term specified, get current term
    if (!termId) {
      const currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId },
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { startDate: 'desc' },
      })

      if (!currentTerm) {
        return NextResponse.json(
          { error: 'No active term found', message: 'Please specify a term ID or ensure there is an active term' },
          { status: 400 }
        )
      }

      termId = currentTerm.id
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

    // Get financial summary using service - Requirement 4.4, 4.5
    const financialSummary = await guardianService.getGuardianFinancialSummary(id, termId)

    return NextResponse.json({
      guardianId: financialSummary.guardianId,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      termId,
      totalBalance: financialSummary.totalBalance,
      studentCount: financialSummary.students.length,
      students: financialSummary.students.map(student => ({
        studentId: student.studentId,
        studentName: student.studentName,
        admissionNumber: student.admissionNumber,
        className: student.className,
        totalFees: student.totalFees,
        totalPaid: student.totalPaid,
        balance: student.balance,
        lastPaymentDate: student.lastPaymentDate,
        lastPaymentAmount: student.lastPaymentAmount,
        paymentStatus: student.balance <= 0 ? 'PAID' : 
                       student.totalPaid > 0 ? 'PARTIAL' : 'NOT_PAID',
      })),
      paymentHistory: financialSummary.paymentHistory.map(payment => ({
        id: payment.id,
        studentId: payment.studentId,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        receiptNumber: payment.receiptNumber,
        receivedAt: payment.receivedAt,
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
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: error.message },
        { status: 404 }
      )
    }
    console.error('Error fetching guardian financial summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial summary' },
      { status: 500 }
    )
  }
}
