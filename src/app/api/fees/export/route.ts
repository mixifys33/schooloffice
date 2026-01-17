/**
 * Fees Export API Route
 * Requirements: 6.5 - Generate CSV with all payment data for current term
 * GET: Export payment report as CSV
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'

// GET: Export payment report as CSV
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
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
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

    // Get all students with their class info
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        stream: true,
      },
      orderBy: [
        { class: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    // Build CSV data
    const csvRows: string[] = []
    
    // Header row
    csvRows.push([
      'Admission Number',
      'Student Name',
      'Class',
      'Stream',
      'Amount Required',
      'Amount Paid',
      'Balance',
      'Payment Status',
      'Last Payment Date',
      'Last Payment Method',
      'Active Status',
    ].join(','))

    // Data rows
    for (const student of students) {
      let amountRequired = 0
      let amountPaid = 0
      let lastPaymentDate = ''
      let lastPaymentMethod = ''
      
      if (currentTerm) {
        // Get fee structure for student's class
        const feeStructure = await prisma.feeStructure.findFirst({
          where: {
            classId: student.classId,
            termId: currentTerm.id,
          },
        })

        amountRequired = feeStructure?.totalAmount || 0

        // Get total payments
        const payments = await prisma.payment.aggregate({
          where: {
            studentId: student.id,
            termId: currentTerm.id,
          },
          _sum: { amount: true },
        })

        amountPaid = payments._sum.amount || 0

        // Get last payment
        const lastPayment = await prisma.payment.findFirst({
          where: {
            studentId: student.id,
            termId: currentTerm.id,
          },
          orderBy: { receivedAt: 'desc' },
        })

        if (lastPayment) {
          lastPaymentDate = lastPayment.receivedAt.toISOString().split('T')[0]
          lastPaymentMethod = lastPayment.method
        }
      }

      const balance = amountRequired - amountPaid
      let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
      
      if (amountPaid >= amountRequired && amountRequired > 0) {
        paymentStatus = 'PAID'
      } else if (amountPaid > 0) {
        paymentStatus = 'PARTIAL'
      }

      const isActive = student.status === 'ACTIVE' && paymentStatus === 'PAID'

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      csvRows.push([
        escapeCSV(student.admissionNumber),
        escapeCSV(`${student.firstName} ${student.lastName}`),
        escapeCSV(student.class.name),
        escapeCSV(student.stream?.name || ''),
        amountRequired.toString(),
        amountPaid.toString(),
        balance.toString(),
        paymentStatus,
        lastPaymentDate,
        lastPaymentMethod,
        isActive ? 'Active' : 'Inactive',
      ].join(','))
    }

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payment-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting fees:', error)
    return NextResponse.json(
      { error: 'Failed to export payment report' },
      { status: 500 }
    )
  }
}
