/**
 * Invoices API
 * GET: List invoices with filters
 * POST: Generate invoice for a student
 * 
 * Requirements: 6.1, 6.6, 11.1, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 * Property 26: Invoice Content Completeness
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData,
  canWriteFinanceData,
  isParentRole,
  isStudentRole,
  getAccessibleStudentIds,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { 
  listInvoices, 
  generateInvoice, 
  InvoiceError 
} from '@/services/invoice.service'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const studentId = searchParams.get('studentId') || undefined
    const guardianId = searchParams.get('guardianId') || undefined
    const termId = searchParams.get('termId') || undefined
    const classId = searchParams.get('classId') || undefined
    const status = searchParams.get('status') || undefined

    // Property 21: Parent Data Isolation
    let filters: {
      studentId?: string
      guardianId?: string
      termId?: string
      classId?: string
      status?: string
    } = { termId, classId, status }

    if (isParentRole(userRole) || isStudentRole(userRole)) {
      const accessibleStudentIds = await getAccessibleStudentIds({ userId, role: userRole, schoolId })
      if (accessibleStudentIds && accessibleStudentIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        })
      }
      // If studentId is provided, verify access
      if (studentId) {
        if (accessibleStudentIds && !accessibleStudentIds.includes(studentId)) {
          return NextResponse.json({ 
            error: 'Forbidden',
            code: FINANCE_ACCESS_ERRORS.PARENT_DATA_ACCESS_DENIED
          }, { status: 403 })
        }
        filters.studentId = studentId
      }
      // For parents, also allow filtering by guardianId
      if (guardianId) {
        filters.guardianId = guardianId
      }
    } else {
      filters.studentId = studentId
      filters.guardianId = guardianId
    }

    const result = await listInvoices(schoolId, filters, page, pageSize)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing invoices:', error)
    return NextResponse.json({ error: 'Failed to list invoices' }, { status: 500 })
  }
}

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
    const { studentId, termId } = body

    if (!studentId || !termId) {
      return NextResponse.json({ error: 'Missing required fields: studentId and termId' }, { status: 400 })
    }

    // Property 26: Invoice Content Completeness
    const invoice = await generateInvoice(studentId, termId, userId)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error generating invoice:', error)
    if (error instanceof InvoiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
