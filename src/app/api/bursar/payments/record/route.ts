import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      studentId,
      amount,
      method,
      reference,
      bankName,
      chequeNumber,
      mobileNumber,
      notes,
      receivedAt
    } = body

    // Validate required fields
    if (!studentId || !amount || !method || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get student to verify they exist and get their current term
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true
      }
    })

    if (!student || student.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get current term for the school
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No active term found' },
        { status: 400 }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        schoolId: session.user.schoolId,
        studentId,
        termId: currentTerm.id,
        amount: parseFloat(amount),
        method,
        reference,
        bankName: bankName || null,
        chequeNumber: chequeNumber || null,
        mobileNumber: mobileNumber || null,
        notes: notes || null,
        status: 'CONFIRMED',
        receivedBy: session.user.id!,
        receivedAt: new Date(receivedAt)
      }
    })

    // Create receipt
    const receipt = await prisma.receipt.create({
      data: {
        schoolId: session.user.schoolId,
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        termId: currentTerm.id,
        receiptNumber: `RCP-${Date.now()}`,
        totalAmount: parseFloat(amount),
        issuedBy: session.user.id!,
        issuedAt: new Date(receivedAt)
      }
    })

    // Link payment to receipt
    await prisma.payment.update({
      where: { id: payment.id },
      data: { receiptId: receipt.id }
    })

    // Get fee structure for this student's class, student type, and term
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: session.user.schoolId,
        classId: student.classId,
        termId: currentTerm.id,
        studentType: student.studentType,
        isActive: true
      }
    })

    if (feeStructure) {
      // Check if invoice exists for this student
      let invoice = await prisma.invoice.findFirst({
        where: {
          schoolId: session.user.schoolId,
          studentId,
          termId: currentTerm.id
        }
      })

      // Create invoice if it doesn't exist
      if (!invoice) {
        invoice = await prisma.invoice.create({
          data: {
            schoolId: session.user.schoolId,
            studentId,
            termId: currentTerm.id,
            feeStructureId: feeStructure.id,
            invoiceNumber: `INV-${Date.now()}`,
            totalAmount: feeStructure.totalAmount,
            amountPaid: 0,
            balance: feeStructure.totalAmount,
            status: 'PENDING',
            dueDate: feeStructure.dueDate || new Date(),
            issuedBy: session.user.id!,
            issuedAt: new Date()
          }
        })
      }

      // Create payment allocation
      await prisma.paymentAllocation.create({
        data: {
          schoolId: session.user.schoolId,
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: parseFloat(amount)
        }
      })

      // Update invoice amounts
      const newAmountPaid = invoice.amountPaid + parseFloat(amount)
      const newBalance = invoice.totalAmount - newAmountPaid
      const newStatus = newBalance <= 0 ? 'PAID' : newBalance < invoice.totalAmount ? 'PARTIAL' : 'PENDING'

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        }
      })
    }

    return NextResponse.json({
      success: true,
      payment,
      receipt
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
