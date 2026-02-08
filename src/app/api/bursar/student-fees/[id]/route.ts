import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: studentId } = params

    // Fetch student details
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: session.user.schoolId
      },
      include: {
        class: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Calculate financial data
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        academicYear: student.academicYear || 'current',
        term: student.term || 'current'
      }
    })

    const totalDue = feeStructure?.amount || 0
    const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const balance = totalDue - totalPaid

    // Determine payment status
    let paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid' = 'not_paid'
    if (balance === 0) {
      paymentStatus = 'fully_paid'
    } else if (totalPaid > 0) {
      paymentStatus = 'partially_paid'
    }

    // Format payments
    const payments = student.payments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      amount: payment.amount,
      paymentDate: payment.paymentDate.toISOString(),
      method: payment.method as 'cash' | 'bank' | 'mobile_money',
      receiptNumber: payment.receiptNumber,
      recordedBy: payment.recordedBy
    }))

    // Fee breakdown
    const feeBreakdown = feeStructure?.breakdown || {
      tuition: 0,
      development: 0,
      meals: 0,
      boarding: 0,
      optional: []
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        classId: student.classId,
        className: student.class?.name || 'Unknown',
        stream: student.class?.stream || null,
        status: student.status as 'active' | 'transferred' | 'left',
        totalDue,
        totalPaid,
        balance,
        lastPaymentDate: student.payments[0]?.paymentDate.toISOString() || null,
        paymentStatus
      },
      payments,
      feeBreakdown
    })
  } catch (error) {
    console.error('Error fetching student fees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student fees' },
      { status: 500 }
    )
  }
}