/**
 * Single Invoice API
 * GET: Get invoice details
 * DELETE: Cancel invoice
 * 
 * Requirements: 6.1, 11.1, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData,
  canWriteFinanceData,
  isParentRole,
  isStudentRole,
  validateFinanceAccessForStudent,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { getInvoice, cancelInvoice, InvoiceError } from '@/services/invoice.service'

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

    const invoice = await getInvoice(id)

    if (!invoice || invoice.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Property 21: Parent Data Isolation
    if (isParentRole(userRole) || isStudentRole(userRole)) {
      try {
        await validateFinanceAccessForStudent(
          { userId, role: userRole, schoolId },
          invoice.studentId
        )
      } catch (error) {
        if (error instanceof FinanceAccessError) {
          return NextResponse.json({ error: error.message }, { status: error.statusCode })
        }
        throw error
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Property 20: Finance Access Control - only write roles can cancel
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to cancel invoices',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Cancellation reason is required (minimum 10 characters)' 
      }, { status: 400 })
    }

    // Verify invoice belongs to this school
    const existingInvoice = await getInvoice(id)
    if (!existingInvoice || existingInvoice.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const invoice = await cancelInvoice(id, userId, reason)

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('Error cancelling invoice:', error)
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 })
  }
}
