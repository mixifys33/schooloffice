import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST: Process refund (approve and issue)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, paymentMethod, reference, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use approve or reject' },
        { status: 400 }
      )
    }

    // Get refund request
    const refund = await prisma.refundRequest.findUnique({
      where: { id }
    })

    if (!refund || refund.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Refund request not found' },
        { status: 404 }
      )
    }

    if (refund.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Refund already ${refund.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      // Reject refund
      await prisma.refundRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: session.user.id!,
          reviewedAt: new Date(),
          reviewNotes: notes || 'Refund request rejected'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Refund request rejected'
      })
    }

    // Approve and process refund
    if (!paymentMethod || !reference) {
      return NextResponse.json(
        { error: 'Payment method and reference required for approval' },
        { status: 400 }
      )
    }

    // Get student
    const student = await prisma.student.findUnique({
      where: { id: refund.studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Verify sufficient credit balance
    if (student.creditBalance < refund.amount) {
      return NextResponse.json(
        { error: 'Insufficient credit balance' },
        { status: 400 }
      )
    }

    // Deduct from credit balance
    const newCreditBalance = student.creditBalance - refund.amount

    await prisma.student.update({
      where: { id: refund.studentId },
      data: { creditBalance: newCreditBalance }
    })

    // Record credit transaction
    await prisma.creditTransaction.create({
      data: {
        schoolId: session.user.schoolId,
        studentId: refund.studentId,
        amount: -refund.amount, // Negative for deduction
        type: 'REFUND',
        description: `Refund processed: ${refund.reason}. Method: ${paymentMethod}, Ref: ${reference}`,
        refundId: refund.id,
        balanceBefore: student.creditBalance,
        balanceAfter: newCreditBalance,
        createdBy: session.user.id!
      }
    })

    // Update refund request
    await prisma.refundRequest.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        reviewedBy: session.user.id!,
        reviewedAt: new Date(),
        reviewNotes: notes,
        processedBy: session.user.id!,
        processedAt: new Date(),
        paymentMethod,
        reference
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      newCreditBalance
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}
