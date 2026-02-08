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
    const termFilter = searchParams.get('term')

    // Get all students in the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active'
      },
      include: {
        class: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    // Get fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId
      }
    })

    // Process student data with financial information
    const processedStudents = students.map(student => {
      // Find fee structure for this student's class
      const feeStructure = feeStructures.find(fs => fs.classId === student.classId)
      const totalDue = feeStructure?.totalAmount || 0 // Changed from amount to totalAmount
      
      // Calculate total payments for this student
      const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const balance = totalDue - totalPaid

      // Determine payment status
      let paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid' = 'not_paid'
      if (balance === 0 && totalDue > 0) {
        paymentStatus = 'fully_paid'
      } else if (totalPaid > 0 && balance > 0) {
        paymentStatus = 'partially_paid'
      } else if (totalDue > 0 && totalPaid === 0) {
        paymentStatus = 'not_paid'
      }

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        classId: student.classId,
        className: student.class?.name || 'Unknown',
        stream: student.class?.stream || null,
        status: student.status as 'active' | 'transferred' | 'left',
        totalDue,
        totalPaid,
        balance,
        lastPaymentDate: student.payments[0]?.receivedAt.toISOString() || null, // Changed from paymentDate to receivedAt
        paymentStatus
      }
    })

    // Apply filters
    let filteredStudents = processedStudents

    if (classFilter && classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.className === classFilter)
    }

    if (termFilter && termFilter !== 'all') {
      // Note: This assumes students have a term property; adjust as needed
      // For now, we'll skip term filtering since students don't have a direct term property
    }

    return NextResponse.json({
      success: true,
      students: filteredStudents
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}