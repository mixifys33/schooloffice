/**
 * Receipt API
 * GET: Get receipt details for printing/viewing
 * 
 * Requirements: 11.1, 11.3, 11.5
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData,
  isParentRole,
  isStudentRole,
  validateFinanceAccessForStudent,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    if (!canReadFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    const { id } = await params

    const receipt = await prisma.receipt.findUnique({
      where: { id },
    })

    if (!receipt || receipt.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Property 21: Parent Data Isolation
    // Requirement 11.3: Parent can only see their linked students' receipts
    if (isParentRole(userRole) || isStudentRole(userRole)) {
      try {
        await validateFinanceAccessForStudent(
          { userId, role: userRole, schoolId },
          receipt.studentId
        )
      } catch (error) {
        if (error instanceof FinanceAccessError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode })
        }
        throw error
      }
    }

    // Get school info for receipt header
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true, logo: true },
    })

    return NextResponse.json({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      school: {
        name: school?.name,
        address: school?.address,
        phone: school?.phone,
        email: school?.email,
        logo: school?.logo,
      },
      studentId: receipt.studentId,
      studentName: receipt.studentName,
      guardianName: receipt.guardianName,
      className: receipt.className,
      termName: receipt.termName,
      amount: receipt.amount,
      amountInWords: receipt.amountInWords,
      method: receipt.method,
      reference: receipt.reference,
      balanceBefore: receipt.balanceBefore,
      balanceAfter: receipt.balanceAfter,
      issuedBy: receipt.issuedByName,
      issuedAt: receipt.issuedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}
