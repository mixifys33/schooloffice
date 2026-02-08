import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStudentAccountDetails } from '@/services/student-account.service'
import { InvoiceService } from '@/services/invoice.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const termId = searchParams.get('termId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const balanceStatus = searchParams.get('balanceStatus')
    const classId = searchParams.get('classId')

    if (studentId && termId) {
      // Get specific student account details
      const accountDetails = await StudentAccountService.getStudentAccountDetails(studentId, termId)
      return NextResponse.json(accountDetails)
    }

    // List student accounts with filters
    const filters: any = {}
    if (termId) filters.termId = termId
    if (balanceStatus) filters.balanceStatus = balanceStatus
    if (classId) filters.classId = classId

    const result = await StudentAccountService.listStudentAccounts(
      session.user.schoolId,
      filters,
      page,
      limit
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Student fees API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student fees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, studentId, termId, classId } = body

    if (action === 'recalculate' && studentId && termId) {
      // Recalculate specific student balance
      const result = await StudentAccountService.recalculateStudentBalance(
        studentId,
        termId,
        session.user.id
      )
      return NextResponse.json(result)
    }

    if (action === 'generate-invoice' && studentId && termId) {
      // Generate invoice for student
      const result = await InvoiceService.generateInvoice(
        studentId,
        termId,
        session.user.id
      )
      return NextResponse.json(result)
    }

    if (action === 'generate-class-invoices' && classId && termId) {
      // Generate invoices for entire class
      const result = await InvoiceService.generateClassInvoices(
        classId,
        termId,
        session.user.id
      )
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Student fees action error:', error)
    return NextResponse.json(
      { error: 'Failed to process student fees action' },
      { status: 500 }
    )
  }
}