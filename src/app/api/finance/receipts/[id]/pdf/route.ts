/**
 * Receipt PDF API
 * GET: Generate receipt PDF/HTML for printing
 * 
 * Requirements: 5.3, 11.1, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData,
  isParentRole,
  isStudentRole,
  validateFinanceAccessForStudent,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { generateReceiptPDF } from '@/services/receipt.service'

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

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { id } = await params

    const { html, receipt } = await generateReceiptPDF(id)

    // Verify school ownership
    if (receipt.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Property 21: Parent Data Isolation
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

    // Return HTML that can be rendered as PDF by the client
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="receipt-${receipt.receiptNumber}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating receipt PDF:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate receipt PDF' 
    }, { status: 500 })
  }
}
