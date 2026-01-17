/**
 * Receipts API
 * GET: Search receipts with filters
 * 
 * Requirements: 5.6, 11.1, 11.3
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
  getAccessibleStudentIds,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { searchReceipts } from '@/services/receipt.service'

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
    const receiptNumber = searchParams.get('receiptNumber') || undefined
    const studentName = searchParams.get('studentName') || undefined
    const studentId = searchParams.get('studentId') || undefined
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Property 21: Parent Data Isolation
    let filters: {
      receiptNumber?: string
      studentName?: string
      studentId?: string
      dateFrom?: Date
      dateTo?: Date
    } = {
      receiptNumber,
      studentName,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }

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
      } else if (accessibleStudentIds && accessibleStudentIds.length === 1) {
        // For single student access, filter to that student
        filters.studentId = accessibleStudentIds[0]
      }
    } else if (studentId) {
      filters.studentId = studentId
    }

    const result = await searchReceipts(schoolId, filters, page, pageSize)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error searching receipts:', error)
    return NextResponse.json({ error: 'Failed to search receipts' }, { status: 500 })
  }
}
