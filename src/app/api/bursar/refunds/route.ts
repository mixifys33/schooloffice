import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: Get all refund requests
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const refunds = await prisma.refundRequest.findMany({
      where: {
        schoolId: session.user.schoolId,
        ...(status && status !== 'all' ? { status } : {})
      },
      orderBy: { requestedAt: 'desc' }
    })

    // Get student details for each refund
    const refundsWithDetails = await Promise.all(
      refunds.map(async (refund) => {
        const student = await prisma.student.findUnique({
          where: { id: refund.studentId },
          include: { class: true }
        })

        return {
          ...refund,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          className: student?.class.name || 'Unknown',
          admissionNumber: student?.admissionNumber || 'N/A'
        }
      })
    )

    return NextResponse.json({
      success: true,
      refunds: refundsWithDetails
    })
  } catch (error) {
    console.error('Error fetching refunds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch refunds' },
      { status: 500 }
    )
  }
}

// POST: Create refund request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, amount, reason } = body

    if (!studentId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify student has sufficient credit balance
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student || student.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    if (student.creditBalance < parseFloat(amount)) {
      return NextResponse.json(
        { error: `Insufficient credit balance. Available: ${student.creditBalance}` },
        { status: 400 }
      )
    }

    // Create refund request
    const refund = await prisma.refundRequest.create({
      data: {
        schoolId: session.user.schoolId,
        studentId,
        amount: parseFloat(amount),
        reason,
        requestedBy: session.user.id!
      }
    })

    return NextResponse.json({
      success: true,
      refund
    })
  } catch (error) {
    console.error('Error creating refund request:', error)
    return NextResponse.json(
      { error: 'Failed to create refund request' },
      { status: 500 }
    )
  }
}
