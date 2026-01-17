/**
 * Payments API
 * GET: List payments with filters
 * POST: Record new payment
 * 
 * Requirements: 11.1, 11.2, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData, 
  canWriteFinanceData,
  isParentRole,
  isStudentRole,
  getAccessibleStudentIds,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { recordPayment } from '@/services/finance.service'

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
    // Requirement 11.1, 11.2: Verify role has finance read access
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
    const studentId = searchParams.get('studentId')
    const termId = searchParams.get('termId')
    const method = searchParams.get('method')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { schoolId, status: 'CONFIRMED' }
    
    // Property 21: Parent Data Isolation
    // Requirement 11.3: Parent can only see their linked students' data
    if (isParentRole(userRole) || isStudentRole(userRole)) {
      const accessibleStudentIds = await getAccessibleStudentIds({ userId, role: userRole, schoolId })
      if (accessibleStudentIds && accessibleStudentIds.length === 0) {
        // No accessible students, return empty result
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        })
      }
      if (accessibleStudentIds) {
        // If a specific studentId is requested, verify access
        if (studentId) {
          if (!accessibleStudentIds.includes(studentId)) {
            return NextResponse.json({ 
              error: 'Forbidden',
              message: 'You do not have access to this student\'s payment data',
              code: FINANCE_ACCESS_ERRORS.PARENT_DATA_ACCESS_DENIED
            }, { status: 403 })
          }
          where.studentId = studentId
        } else {
          // Filter to only accessible students
          where.studentId = { in: accessibleStudentIds }
        }
      }
    } else if (studentId) {
      where.studentId = studentId
    }
    
    if (termId) where.termId = termId
    if (method) where.method = method
    if (startDate || endDate) {
      where.receivedAt = {}
      if (startDate) where.receivedAt.gte = new Date(startDate)
      if (endDate) where.receivedAt.lte = new Date(endDate)
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          student: { include: { class: true, stream: true } },
          receipt: true,
          term: true,
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({
      data: payments.map(p => ({
        id: p.id,
        studentId: p.studentId,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        admissionNumber: p.student.admissionNumber,
        className: p.student.class.name + (p.student.stream ? ` - ${p.student.stream.name}` : ''),
        termId: p.termId,
        termName: p.term.name,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        bankName: p.bankName,
        mobileNumber: p.mobileNumber,
        notes: p.notes,
        status: p.status,
        receiptNumber: p.receipt?.receiptNumber,
        receivedAt: p.receivedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
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
    // Requirement 11.1, 11.2: Only ACCOUNTANT, SCHOOL_ADMIN can record payments
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to record payments',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { studentId, guardianId, termId, amount, method, reference, bankName, chequeNumber, mobileNumber, notes } = body

    if (!studentId || !termId || !amount || !method || !reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user name for receipt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    })
    const receivedByName = user?.staff 
      ? `${user.staff.firstName} ${user.staff.lastName}` 
      : user?.email || 'Unknown'

    const { payment, receipt } = await recordPayment({
      schoolId,
      studentId,
      guardianId,
      termId,
      amount: parseFloat(amount),
      method,
      reference,
      bankName,
      chequeNumber,
      mobileNumber,
      notes,
      receivedBy: userId,
      receivedByName,
      receivedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      payment: { id: payment.id, amount: payment.amount, receiptId: receipt.id },
      receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber },
    }, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to record payment' 
    }, { status: 500 })
  }
}
