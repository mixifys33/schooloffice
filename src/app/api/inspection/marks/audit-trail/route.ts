/**
 * Marks Audit Trail Inspection API Route
 * Generates audit trail reports for inspection
 * Requirements: 32.1, 32.2
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { marksInspectionService } from '@/services/marks-inspection.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only DoS and School Admin can generate inspection reports
    if (!['DOS', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || session.user.schoolId
    const termId = searchParams.get('termId')
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      )
    }

    // Default to last 30 days if no date range provided
    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dateTo = dateToStr ? new Date(dateToStr) : new Date()

    // Generate audit trail report
    const report = await marksInspectionService.generateAuditTrailReport(
      schoolId,
      dateFrom,
      dateTo,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error('Audit Trail Inspection API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate audit trail report' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only DoS and School Admin can generate inspection reports
    if (!['DOS', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { schoolId, termId, dateFrom, dateTo } = body

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'School ID is required' },
        { status: 400 }
      )
    }

    const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const toDate = dateTo ? new Date(dateTo) : new Date()

    // Generate and save audit trail report
    const report = await marksInspectionService.generateAuditTrailReport(
      schoolId,
      fromDate,
      toDate,
      session.user.id
    )

    // TODO: Save report to database for audit trail
    // This would be implemented when we have an InspectionReport model

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Audit trail inspection report generated successfully',
    })
  } catch (error) {
    console.error('Audit Trail Inspection API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate audit trail report' },
      { status: 500 }
    )
  }
}