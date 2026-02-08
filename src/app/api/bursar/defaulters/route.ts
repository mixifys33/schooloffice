import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classFilter = searchParams.get('class')
    const severityFilter = searchParams.get('severity')
    const minBalance = searchParams.get('minBalance')

    // Get all students in the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: StudentStatus.ACTIVE
      },
      include: {
        class: true,
        studentGuardians: {
          include: {
            guardian: true
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    // Get fee structures for each class
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId
      }
    })

    // Calculate defaulter data
    const defaulters = students
      .map(student => {
        // Find the appropriate fee structure for this student's class
        const feeStructure = feeStructures.find(fs => fs.classId === student.classId)
        const totalDue = feeStructure?.amount || 0
        
        // Calculate total payments for this student
        const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const balance = totalDue - totalPaid

        // Skip students with no balance
        if (balance <= 0) return null

        // Calculate days overdue (from last payment or enrollment date)
        const lastPaymentDate = student.payments[0]?.paymentDate || student.createdAt
        const daysOverdue = Math.floor(
          (Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Get guardian contact info (primary guardian)
        const primaryGuardian = student.studentGuardians?.[0]?.guardian
        const contactInfo = {
          parentName: primaryGuardian ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` : 'N/A',
          parentPhone: primaryGuardian?.phone || 'N/A',
          parentEmail: primaryGuardian?.email || 'N/A'
        }

        return {
          id: student.id,
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          className: student.class?.name || 'Unknown',
          stream: student.class?.stream || null,
          totalDue,
          totalPaid,
          balance,
          daysOverdue,
          lastPaymentDate: student.payments[0]?.paymentDate.toISOString() || null,
          contactInfo
        }
      })
      .filter(Boolean) as any[]

    // Apply filters
    let filteredDefaulters = defaulters

    if (classFilter && classFilter !== 'all') {
      filteredDefaulters = filteredDefaulters.filter(d => d.className === classFilter)
    }

    if (severityFilter) {
      if (severityFilter === 'high') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue > 60)
      } else if (severityFilter === 'medium') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue > 30 && d.daysOverdue <= 60)
      } else if (severityFilter === 'low') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue <= 30)
      }
    }

    if (minBalance) {
      const minBalanceNum = parseInt(minBalance)
      filteredDefaulters = filteredDefaulters.filter(d => d.balance >= minBalanceNum)
    }

    // Sort by balance descending
    filteredDefaulters.sort((a, b) => b.balance - a.balance)

    return NextResponse.json({
      success: true,
      defaulters: filteredDefaulters
    })
  } catch (error) {
    console.error('Error fetching defaulters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch defaulters' },
      { status: 500 }
    )
  }
}