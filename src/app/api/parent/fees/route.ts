/**
 * Parent Fees API Route
 * Requirement 23.2: Fetch fee balances and payment history for parent's children
 * GET: Return fee information for all children linked to the authenticated parent
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface FeeItem {
  name: string
  amount: number
  isOptional: boolean
}

export interface PaymentRecord {
  id: string
  date: string
  amount: number
  method: string
  reference: string
  receiptNumber: string
}

export interface PreviousTerm {
  name: string
  totalFees: number
  totalPaid: number
  balance: number
}

export interface ChildFeeData {
  id: string
  name: string
  admissionNumber: string
  className: string
  currentTerm: {
    name: string
    feeStructure: FeeItem[]
    totalFees: number
    totalPaid: number
    balance: number
    hasArrears: boolean
    payments: PaymentRecord[]
  }
  previousTerms: PreviousTerm[]
}

export interface ParentFeesResponse {
  children: ChildFeeData[]
}

// GET: Fetch fee data for authenticated parent's children
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a parent
    if (session.user.role !== Role.PARENT) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access only' },
        { status: 403 }
      )
    }

    const userId = session.user.id

    // Get the user to find matching guardian
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find guardian by email or phone
    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          { email: user.email },
          { phone: user.phone || '' }
        ]
      }
    })

    if (!guardian) {
      return NextResponse.json({ children: [] })
    }

    // Get all students linked to this guardian
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: {
            class: true,
            school: true
          }
        }
      }
    })

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: true
      },
      orderBy: { startDate: 'desc' }
    })

    // Get previous terms (last 2)
    const previousTerms = await prisma.term.findMany({
      where: currentTerm ? {
        endDate: { lt: currentTerm.startDate }
      } : {},
      include: {
        academicYear: true
      },
      orderBy: { endDate: 'desc' },
      take: 2
    })

    // Build fee data for each child
    const children: ChildFeeData[] = await Promise.all(
      studentGuardians.map(async (sg) => {
        const student = sg.student

        // Current term fee data
        let currentTermData = {
          name: currentTerm ? `${currentTerm.name} ${currentTerm.academicYear.name}` : 'No active term',
          feeStructure: [] as FeeItem[],
          totalFees: 0,
          totalPaid: 0,
          balance: 0,
          hasArrears: false,
          payments: [] as PaymentRecord[]
        }

        if (currentTerm) {
          // Get fee structure
          const feeStructure = await prisma.feeStructure.findFirst({
            where: {
              classId: student.classId,
              termId: currentTerm.id
            },
            include: {
              items: true
            }
          })

          const feeItems: FeeItem[] = feeStructure?.items.map(item => ({
            name: item.name,
            amount: item.amount,
            isOptional: item.isOptional
          })) || []

          const totalFees = feeStructure?.totalAmount || 0

          // Get payments for current term
          const payments = await prisma.payment.findMany({
            where: {
              studentId: student.id,
              termId: currentTerm.id
            },
            orderBy: { receivedAt: 'desc' }
          })

          const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
          const balance = totalFees - totalPaid

          currentTermData = {
            name: `${currentTerm.name} ${currentTerm.academicYear.name}`,
            feeStructure: feeItems,
            totalFees,
            totalPaid,
            balance,
            hasArrears: balance > 0,
            payments: payments.map(p => ({
              id: p.id,
              date: p.receivedAt.toISOString(),
              amount: p.amount,
              method: p.method,
              reference: p.reference,
              receiptNumber: p.receiptNumber
            }))
          }
        }

        // Previous terms fee data
        const previousTermsData: PreviousTerm[] = await Promise.all(
          previousTerms.map(async (term) => {
            const feeStructure = await prisma.feeStructure.findFirst({
              where: {
                classId: student.classId,
                termId: term.id
              }
            })

            const totalFees = feeStructure?.totalAmount || 0

            const payments = await prisma.payment.aggregate({
              where: {
                studentId: student.id,
                termId: term.id
              },
              _sum: { amount: true }
            })

            const totalPaid = payments._sum.amount || 0

            return {
              name: `${term.name} ${term.academicYear.name}`,
              totalFees,
              totalPaid,
              balance: totalFees - totalPaid
            }
          })
        )

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          currentTerm: currentTermData,
          previousTerms: previousTermsData
        }
      })
    )

    const response: ParentFeesResponse = { children }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching parent fees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fee data' },
      { status: 500 }
    )
  }
}
