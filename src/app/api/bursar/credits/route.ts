import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: Get all students with credit balances or a specific student
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    // If studentId is provided, fetch that specific student
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          schoolId: session.user.schoolId
        },
        include: {
          class: true,
          stream: true
        }
      })

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }

      const transactions = await prisma.creditTransaction.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      return NextResponse.json({
        success: true,
        students: [{
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          stream: student.stream?.name || null,
          creditBalance: student.creditBalance,
          status: student.status,
          recentTransactions: transactions
        }]
      })
    }

    // Get all students with credit balance > 0
    const studentsWithCredits = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        creditBalance: { gt: 0 }
      },
      include: {
        class: true,
        stream: true
      },
      orderBy: {
        creditBalance: 'desc'
      }
    })

    // Get credit transactions for each student
    const studentsWithTransactions = await Promise.all(
      studentsWithCredits.map(async (student) => {
        const transactions = await prisma.creditTransaction.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          stream: student.stream?.name || null,
          creditBalance: student.creditBalance,
          status: student.status,
          recentTransactions: transactions
        }
      })
    )

    const totalCredits = studentsWithCredits.reduce((sum, s) => sum + s.creditBalance, 0)

    return NextResponse.json({
      success: true,
      students: studentsWithTransactions,
      summary: {
        totalStudentsWithCredits: studentsWithCredits.length,
        totalCreditAmount: totalCredits
      }
    })
  } catch (error) {
    console.error('Error fetching credit balances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit balances' },
      { status: 500 }
    )
  }
}
