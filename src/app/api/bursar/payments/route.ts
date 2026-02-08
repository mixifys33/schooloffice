import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classFilter = searchParams.get('class')
    const methodFilter = searchParams.get('method')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause for filtering
    const whereClause: any = {
      student: {
        schoolId: session.user.schoolId
      }
    }

    if (classFilter && classFilter !== 'all') {
      whereClause.student = {
        ...whereClause.student,
        classId: classFilter
      }
    }

    if (methodFilter && methodFilter !== 'all') {
      whereClause.method = methodFilter
    }

    if (dateFrom || dateTo) {
      whereClause.paymentDate = {}
      if (dateFrom) {
        whereClause.paymentDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.paymentDate.lte = new Date(dateTo)
      }
    }

    // Fetch payments with related student data
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    })

    // Format payments
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      className: payment.student.class?.name || 'Unknown',
      stream: payment.student.class?.stream || null,
      amount: payment.amount,
      paymentDate: payment.receivedAt.toISOString(), // Changed from paymentDate to receivedAt
      method: payment.method as 'cash' | 'bank' | 'mobile_money',
      receiptNumber: payment.reference, // Changed from receiptNumber to reference
      recordedBy: payment.receivedBy // Changed from recordedBy to receivedBy
    }))

    // Calculate summary
    const totalPayments = formattedPayments.length
    const totalAmount = formattedPayments.reduce((sum, p) => sum + p.amount, 0)
    const cashPayments = formattedPayments.filter(p => p.method === 'cash').length
    const bankPayments = formattedPayments.filter(p => p.method === 'bank').length
    const mobileMoneyPayments = formattedPayments.filter(p => p.method === 'mobile_money').length

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      summary: {
        totalPayments,
        totalAmount,
        cashPayments,
        bankPayments,
        mobileMoneyPayments
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}