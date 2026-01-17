/**
 * Single Payment API
 * GET: Get payment details
 * DELETE: Reverse payment (soft delete with audit)
 * 
 * Requirements: 11.1, 11.3, 11.4
 * Property 22: Reversal Authorization
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canRead } from '@/lib/rbac'
import { 
  canReversePayment, 
  requireReversalAuthorization,
  validateFinanceAccessForStudent,
  isParentRole,
  isStudentRole,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { reversePayment } from '@/services/finance.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    if (!canRead(userRole, 'fees')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: { include: { class: true, stream: true } },
        receipt: true,
        term: true,
      },
    })

    if (!payment || payment.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Property 21: Parent Data Isolation - verify parent has access to this student
    // Requirement 11.3: Parent can only see their linked students' data
    if (isParentRole(userRole) || isStudentRole(userRole)) {
      try {
        await validateFinanceAccessForStudent(
          { userId, role: userRole, schoolId },
          payment.studentId
        )
      } catch (error) {
        if (error instanceof FinanceAccessError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode })
        }
        throw error
      }
    }

    return NextResponse.json({
      id: payment.id,
      studentId: payment.studentId,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      admissionNumber: payment.student.admissionNumber,
      className: payment.student.class.name,
      termName: payment.term.name,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      bankName: payment.bankName,
      chequeNumber: payment.chequeNumber,
      mobileNumber: payment.mobileNumber,
      notes: payment.notes,
      status: payment.status,
      receipt: payment.receipt ? {
        id: payment.receipt.id,
        receiptNumber: payment.receipt.receiptNumber,
        amountInWords: payment.receipt.amountInWords,
        balanceBefore: payment.receipt.balanceBefore,
        balanceAfter: payment.receipt.balanceAfter,
        issuedAt: payment.receipt.issuedAt.toISOString(),
      } : null,
      receivedAt: payment.receivedAt.toISOString(),
      reversedAt: payment.reversedAt?.toISOString(),
      reversalReason: payment.reversalReason,
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    // Property 22: Reversal Authorization
    // Requirement 11.4: Require SCHOOL_ADMIN for payment reversals
    if (!canReversePayment(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Only SCHOOL_ADMIN or higher can reverse payments',
        code: FINANCE_ACCESS_ERRORS.REVERSAL_NOT_AUTHORIZED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Reversal reason is required (minimum 10 characters)' 
      }, { status: 400 })
    }

    await reversePayment(id, schoolId, userId, reason)

    return NextResponse.json({ success: true, message: 'Payment reversed successfully' })
  } catch (error) {
    console.error('Error reversing payment:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to reverse payment' 
    }, { status: 500 })
  }
}
