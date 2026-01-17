/**
 * Finance Reports API
 * GET: Get various finance reports
 * 
 * Requirements: 9.1-9.8, 11.1
 * Property 18: Report Total Consistency
 * Property 20: Finance Access Control
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  hasFinanceAccess,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import {
  getDailyCollections,
  getTermCollections,
  getClassCollections,
  getPaymentMethodBreakdown,
  getOutstandingBalances,
  getDiscountsAndPenalties,
  ReportError,
} from '@/services/finance-report.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control - only staff with finance access
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const termId = searchParams.get('termId')
    const classId = searchParams.get('classId')
    const date = searchParams.get('date')

    if (!reportType) {
      return NextResponse.json({ 
        error: 'Report type is required. Valid types: daily, term, class, payment_method, outstanding, discounts_penalties' 
      }, { status: 400 })
    }

    let report

    switch (reportType) {
      case 'daily':
        // Requirement 9.1: Daily collections report
        const reportDate = date ? new Date(date) : new Date()
        report = await getDailyCollections(schoolId, reportDate)
        break

      case 'term':
        // Requirement 9.2: Term collections report
        if (!termId) {
          return NextResponse.json({ error: 'termId is required for term report' }, { status: 400 })
        }
        report = await getTermCollections(schoolId, termId)
        break

      case 'class':
        // Requirement 9.3: Class collections report
        if (!classId || !termId) {
          return NextResponse.json({ 
            error: 'classId and termId are required for class report' 
          }, { status: 400 })
        }
        report = await getClassCollections(schoolId, classId, termId)
        break

      case 'payment_method':
        // Requirement 9.4: Payment method breakdown
        if (!termId) {
          return NextResponse.json({ error: 'termId is required for payment method report' }, { status: 400 })
        }
        report = await getPaymentMethodBreakdown(schoolId, termId)
        break

      case 'outstanding':
        // Requirement 9.5: Outstanding balances report
        if (!termId) {
          return NextResponse.json({ error: 'termId is required for outstanding report' }, { status: 400 })
        }
        report = await getOutstandingBalances(schoolId, termId)
        break

      case 'discounts_penalties':
        // Requirement 9.6: Discounts and penalties report
        if (!termId) {
          return NextResponse.json({ error: 'termId is required for discounts/penalties report' }, { status: 400 })
        }
        report = await getDiscountsAndPenalties(schoolId, termId)
        break

      default:
        return NextResponse.json({ 
          error: `Invalid report type: ${reportType}. Valid types: daily, term, class, payment_method, outstanding, discounts_penalties` 
        }, { status: 400 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating report:', error)
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
