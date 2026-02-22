import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: studentId } = await params

    // Get current academic year with intelligent fallback
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        isCurrent: true
      }
    })

    // Intelligent fallback: Find academic year that matches current year or is active
    if (!currentAcademicYear) {
      const currentYear = new Date().getFullYear()
      
      // Try to find academic year with current year in the name
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Final fallback: Use isActive flag or most recent
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Last resort: Most recent academic year
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: { schoolId: session.user.schoolId },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return NextResponse.json(
        { error: 'No academic year found' },
        { status: 400 }
      )
    }

    // Get current term with intelligent fallback
    const today = new Date()
    
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    // Intelligent fallback: Find term that includes today's date
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Second fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Last resort: Most recent term regardless of dates
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAcademicYear.id },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No term found' },
        { status: 400 }
      )
    }

    // Fetch student details with payments filtered by current term
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: session.user.schoolId
      },
      include: {
        class: true,
        stream: true,
        payments: {
          where: currentTerm ? {
            termId: currentTerm.id
          } : undefined,
          orderBy: { receivedAt: 'desc' }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Calculate financial data - determine student type
    // TODO: Add a studentType field to Student model
    // For now, default to DAY
    const studentType: 'DAY' | 'BOARDING' = 'DAY'
    
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        schoolId: session.user.schoolId,
        termId: currentTerm?.id,
        studentType: studentType,
        isActive: true
      },
      include: {
        items: true
      }
    })

    const totalDue = feeStructure?.totalAmount || 0
    const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const balance = totalDue - totalPaid

    // Determine payment status
    let paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid' = 'not_paid'
    if (balance <= 0 && totalDue > 0) {
      // Fully paid or overpaid
      paymentStatus = 'fully_paid'
    } else if (totalPaid > 0 && balance > 0) {
      paymentStatus = 'partially_paid'
    }

    // For display, show balance as 0 if overpaid (negative)
    const displayBalance = Math.max(0, balance)

    // Format payments
    const payments = student.payments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      amount: payment.amount,
      paymentDate: payment.receivedAt.toISOString(),
      method: payment.method as 'cash' | 'bank' | 'mobile_money',
      receiptNumber: payment.reference,
      recordedBy: payment.receivedBy // Fixed: use receivedBy instead of recordedBy
    }))

    // Fee breakdown from fee items
    const feeBreakdown = {
      tuition: feeStructure?.items.find(item => item.category === 'TUITION')?.amount || 0,
      development: feeStructure?.items.find(item => item.category === 'DEVELOPMENT')?.amount || 0,
      meals: feeStructure?.items.find(item => item.category === 'MEALS')?.amount || 0,
      boarding: feeStructure?.items.find(item => item.category === 'BOARDING')?.amount || 0,
      optional: feeStructure?.items
        .filter(item => item.category === 'OPTIONAL' || item.isOptional)
        .map(item => ({
          name: item.name,
          amount: item.amount,
          paid: 0 // TODO: Calculate paid amount per item
        })) || []
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        classId: student.classId,
        className: student.class?.name || 'Unknown',
        stream: student.stream?.name || null,
        status: student.status as 'active' | 'transferred' | 'left',
        totalDue,
        totalPaid,
        balance: displayBalance, // Show 0 instead of negative
        actualBalance: balance, // Keep actual for internal use
        lastPaymentDate: student.payments[0]?.receivedAt.toISOString() || null,
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