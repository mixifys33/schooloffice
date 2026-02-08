import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    // Build the where clause for term filtering
    const termFilter = termId ? { termId } : {}

    // Get fee structure totals (what should be collected)
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId,
        ...termFilter,
        isActive: true
      },
      include: {
        class: {
          include: {
            students: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    // Calculate total expected fees
    let totalExpected = 0
    feeStructures.forEach(fee => {
      const studentCount = fee.class.students.length
      totalExpected += fee.totalAmount * studentCount
    })

    // Get actual payments collected
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        ...termFilter,
        status: 'COMPLETED'
      }
    })

    const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalOutstanding = totalExpected - totalCollected

    // Get students with outstanding balances
    const studentsWithBalances = await prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        balance: { gt: 0 }
      },
      include: {
        class: true
      },
      orderBy: {
        balance: 'desc'
      }
    })

    const unpaidStudents = studentsWithBalances.map(student => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      class: student.class?.name || 'No Class',
      balance: student.balance
    }))

    return NextResponse.json({
      totalExpected,
      totalCollected,
      totalOutstanding,
      unpaidStudentsCount: unpaidStudents.length,
      unpaidStudents: unpaidStudents.slice(0, 50), // Limit to 50 for performance
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Money at glance API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    )
  }
}