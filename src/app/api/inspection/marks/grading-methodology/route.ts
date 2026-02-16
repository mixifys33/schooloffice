/**
 * Marks Grading Methodology Inspection API Route
 * Generates grading methodology compliance reports for inspection
 * Requirements: 32.2, 32.3
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

    if (!schoolId || !termId) {
      return NextResponse.json(
        { success: false, error: 'School ID and Term ID are required' },
        { status: 400 }
      )
    }

    // Generate grading methodology compliance report
    const report = await marksInspectionService.generateGradingMethodologyReport(
      schoolId,
      termId,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error('Grading Methodology Inspection API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate inspection report' },
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
    const { schoolId, termId } = body

    if (!schoolId || !termId) {
      return NextResponse.json(
        { success: false, error: 'School ID and Term ID are required' },
        { status: 400 }
      )
    }

    // Generate and save inspection report
    const report = await marksInspectionService.generateGradingMethodologyReport(
      schoolId,
      termId,
      session.user.id
    )

    // TODO: Save report to database for audit trail
    // This would be implemented when we have an InspectionReport model

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Grading methodology inspection report generated successfully',
    })
  } catch (error) {
    console.error('Grading Methodology Inspection API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate inspection report' },
      { status: 500 }
    )
  }
}