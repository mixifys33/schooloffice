/**
 * Student Payment API Route
 * Requirements: 5.5, 6.2, 6.3, 6.6, 18.3 - Update payment status, set student active/inactive, log changes
 * PUT: Update payment status via marking as paid
 * Super Admin cannot modify student payment records directly (Requirement 5.5)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PaymentMethod, StudentStatus } from '@/types/enums'
import { auditService } from '@/services/audit.service'
import { guardSuperAdminWrite } from '@/lib/super-admin-guard'
import { guardFeeModification } from '@/lib/system-state-guard'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT: Update payment status (mark as paid)
// Requirement 5.5: Super Admin cannot modify student payment records directly
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Requirement 5.5: Super Admin cannot modify student payment records directly
    const superAdminRestriction = guardSuperAdminWrite(session, 'student-payment', 'PUT')
    if (superAdminRestriction) {
      return superAdminRestriction
    }
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = (session.user as { id?: string }).id
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, amount, method, reference } = body

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        class: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get current term
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
        { error: 'No active term found' },
        { status: 400 }
      )
    }

    // Requirements 20.5: Check if financial period is locked before allowing fee modification
    const systemStateCheck = await guardFeeModification(schoolId, currentTerm.id)
    if (!systemStateCheck.allowed && systemStateCheck.response) {
      return systemStateCheck.response
    }

    // Get fee structure for student's class
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        termId: currentTerm.id,
      },
    })

    const totalFees = feeStructure?.totalAmount || 0

    // Get current payments
    const currentPayments = await prisma.payment.aggregate({
      where: {
        studentId: id,
        termId: currentTerm.id,
      },
      _sum: { amount: true },
    })

    const currentPaid = currentPayments._sum.amount || 0

    // Handle marking as PAID - Requirements 6.2, 6.3
    if (status === 'PAID') {
      const remainingBalance = totalFees - currentPaid
      const previousStatus = student.status
      
      // Create a payment record for the remaining balance
      if (remainingBalance > 0) {
        await prisma.payment.create({
          data: {
            schoolId: schoolId,
            studentId: id,
            termId: currentTerm.id,
            amount: amount || remainingBalance,
            method: (method as PaymentMethod) || PaymentMethod.CASH,
            reference: reference || `MARK_PAID_${Date.now()}`,
            receivedBy: userId || 'system',
            receivedAt: new Date(),
            status: 'CONFIRMED',
            notes: `Marked as paid by ${session.user.name || session.user.email || 'School Admin'} (${session.user.role || 'SCHOOL_ADMIN'})`,
          },
        })
      }

      // Set student to active status - Requirement 6.2
      // This enables SMS notifications and report card access - Requirement 6.3
      await prisma.student.update({
        where: { id },
        data: { status: StudentStatus.ACTIVE },
      })

      // Log payment status change - Requirement 18.3
      await auditService.log({
        schoolId,
        userId: userId || 'system',
        action: 'payment_status_changed',
        resource: 'student',
        resourceId: id,
        previousValue: {
          paymentStatus: 'NOT_PAID',
          studentStatus: previousStatus,
        },
        newValue: {
          paymentStatus: 'PAID',
          studentStatus: StudentStatus.ACTIVE,
          amount: amount || remainingBalance,
          method: method || PaymentMethod.CASH,
          markedBy: session.user.name || session.user.email || 'School Admin',
          markedByRole: session.user.role || 'SCHOOL_ADMIN',
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })

      return NextResponse.json({
        success: true,
        message: 'Student marked as paid and set to active',
        paymentStatus: 'PAID',
        isActive: true,
      })
    }

    // Handle marking as NOT_PAID - Requirement 6.6
    if (status === 'NOT_PAID') {
      const previousStatus = student.status
      
      // Set student to inactive status when payment status changes to NOT PAID
      // This automatically excludes them from SMS and reports
      await prisma.student.update({
        where: { id },
        data: { status: StudentStatus.SUSPENDED },
      })

      // Log payment status change - Requirement 18.3
      await auditService.log({
        schoolId,
        userId: userId || 'system',
        action: 'payment_status_changed',
        resource: 'student',
        resourceId: id,
        previousValue: {
          paymentStatus: 'PAID',
          studentStatus: previousStatus,
        },
        newValue: {
          paymentStatus: 'NOT_PAID',
          studentStatus: StudentStatus.SUSPENDED,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })

      return NextResponse.json({
        success: true,
        message: 'Student marked as unpaid and set to inactive',
        paymentStatus: 'NOT_PAID',
        isActive: false,
      })
    }

    return NextResponse.json(
      { error: 'Invalid status. Use PAID or NOT_PAID' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating payment status:', error)
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    )
  }
}

// GET: Get payment details for a student
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
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        class: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { startDate: 'desc' },
    })

    if (!currentTerm) {
      return NextResponse.json({
        studentId: id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.class.name,
        totalFees: 0,
        totalPaid: 0,
        balance: 0,
        paymentStatus: 'NOT_PAID',
        payments: [],
      })
    }

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        termId: currentTerm.id,
      },
    })

    const totalFees = feeStructure?.totalAmount || 0

    // Get all payments
    const payments = await prisma.payment.findMany({
      where: {
        studentId: id,
        termId: currentTerm.id,
      },
      orderBy: { receivedAt: 'desc' },
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const balance = totalFees - totalPaid

    let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
    if (totalPaid >= totalFees && totalFees > 0) {
      paymentStatus = 'PAID'
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL'
    }

    return NextResponse.json({
      studentId: id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.class.name,
      totalFees,
      totalPaid,
      balance,
      paymentStatus,
      isActive: student.status === StudentStatus.ACTIVE && paymentStatus === 'PAID',
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        receiptNumber: p.receiptNumber,
        receivedAt: p.receivedAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching payment details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    )
  }
}
