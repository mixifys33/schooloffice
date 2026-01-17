/**
 * Finance Reports Export API
 * GET: Export report to CSV or PDF
 * 
 * Requirements: 9.7, 11.1
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
  exportReport,
  ReportError,
  ReportType,
} from '@/services/finance-report.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
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
    const reportType = searchParams.get('type') as ReportType
    const format = (searchParams.get('format') || 'CSV').toUpperCase() as 'CSV' | 'PDF'
    const termId = searchParams.get('termId')
    const classId = searchParams.get('classId')
    const date = searchParams.get('date')

    if (!reportType) {
      return NextResponse.json({ 
        error: 'Report type is required' 
      }, { status: 400 })
    }

    if (format !== 'CSV' && format !== 'PDF') {
      return NextResponse.json({ 
        error: 'Invalid format. Valid formats: CSV, PDF' 
      }, { status: 400 })
    }

    // Generate the report data first
    let reportData

    switch (reportType) {
      case 'daily_collections':
        const reportDate = date ? new Date(date) : new Date()
        reportData = await getDailyCollections(schoolId, reportDate)
        break

      case 'term_collections':
        if (!termId) {
          return NextResponse.json({ error: 'termId is required' }, { status: 400 })
        }
        reportData = await getTermCollections(schoolId, termId)
        break

      case 'class_collections':
        if (!classId || !termId) {
          return NextResponse.json({ 
            error: 'classId and termId are required' 
          }, { status: 400 })
        }
        reportData = await getClassCollections(schoolId, classId, termId)
        break

      case 'payment_method':
        if (!termId) {
          return NextResponse.json({ error: 'termId is required' }, { status: 400 })
        }
        reportData = await getPaymentMethodBreakdown(schoolId, termId)
        break

      case 'outstanding_balances':
        if (!termId) {
          return NextResponse.json({ error: 'termId is required' }, { status: 400 })
        }
        reportData = await getOutstandingBalances(schoolId, termId)
        break

      case 'discounts_penalties':
        if (!termId) {
          return NextResponse.json({ error: 'termId is required' }, { status: 400 })
        }
        reportData = await getDiscountsAndPenalties(schoolId, termId)
        break

      default:
        return NextResponse.json({ 
          error: `Invalid report type: ${reportType}` 
        }, { status: 400 })
    }

    // Property 18: Report Total Consistency - export from actual data
    const buffer = await exportReport(reportType, reportData, format)

    const contentType = format === 'CSV' ? 'text/csv' : 'text/plain'
    const extension = format.toLowerCase()
    const filename = `${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting report:', error)
    if (error instanceof ReportError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 })
  }
}
