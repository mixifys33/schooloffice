/**
 * Bulk Invoice Generation API
 * POST: Generate invoices for all students in a class
 * 
 * Requirements: 6.1, 11.1
 * Property 20: Finance Access Control
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  canWriteFinanceData,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { generateClassInvoices, InvoiceError } from '@/services/invoice.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to generate invoices',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { classId, termId } = body

    if (!classId || !termId) {
      return NextResponse.json({ 
        error: 'Missing required fields: classId and termId' 
      }, { status: 400 })
    }

    const result = await generateClassInvoices(classId, termId, userId)

    return NextResponse.json({
      success: true,
      generated: result.generated.length,
      skipped: result.skipped.length,
      invoices: result.generated,
      errors: result.skipped,
    }, { status: 201 })
  } catch (error) {
    console.error('Error generating bulk invoices:', error)
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate invoices' }, { status: 500 })
  }
}
