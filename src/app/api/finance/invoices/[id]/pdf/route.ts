/**
 * Invoice PDF API
 * GET: Generate invoice PDF/HTML for printing
 * 
 * Requirements: 6.5, 11.1, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 * Property 26: Invoice Content Completeness
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
import { getInvoice, generateInvoiceHTML } from '@/services/invoice.service'

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

    // Get school info for invoice header
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true, logo: true },
    })

    // Property 26: Invoice Content Completeness - generate complete invoice HTML
    const html = generateInvoiceHTML(invoice, {
      name: school?.name,
      address: school?.address ?? undefined,
      phone: school?.phone ?? undefined,
      email: school?.email ?? undefined,
      logo: school?.logo ?? undefined,
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate invoice PDF' 
    }, { status: 500 })
  }
}
