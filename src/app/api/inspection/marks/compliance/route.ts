/**
 * Marks Compliance Verification API Route
 * Verifies grading methodology compliance and curriculum alignment
 * Requirements: 32.3, 32.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { marksComplianceService } from '@/services/marks-compliance.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only DoS and School Admin can verify compliance
    if (!['DOS', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || session.user.schoolId
    const termId = searchParams.get('termId')
    const verificationType = searchParams.get('type') || 'methodology' // 'methodology' or 'alignment'

    if (!schoolId || !termId) {
      return NextResponse.json(
        { success: false, error: 'School ID and Term ID are required' },
        { status: 400 }
      )
    }

    let verificationResult

    if (verificationType === 'alignment') {
      // Verify curriculum alignment
      verificationResult = await marksComplianceService.verifyCurriculumAlignment(
        schoolId,
        termId,
        session.user.id
      )
    } else {
      // Verify grading methodology compliance (default)
      verificationResult = await marksComplianceService.verifyGradingMethodologyCompliance(
        schoolId,
        termId,
        session.user.id
      )
    }

    return NextResponse.json({
      success: true,
      data: verificationResult,
    })
  } catch (error) {
    console.error('Marks Compliance Verification API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify compliance' },
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

    // Only DoS and School Admin can verify compliance
    if (!['DOS', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { schoolId, termId, verificationType = 'methodology' } = body

    if (!schoolId || !termId) {
      return NextResponse.json(
        { success: false, error: 'School ID and Term ID are required' },
        { status: 400 }
      )
    }

    let verificationResult
    let message

    if (verificationType === 'alignment') {
      // Verify curriculum alignment
      verificationResult = await marksComplianceService.verifyCurriculumAlignment(
        schoolId,
        termId,
        session.user.id
      )
      message = 'Curriculum alignment verification completed successfully'
    } else {
      // Verify grading methodology compliance (default)
      verificationResult = await marksComplianceService.verifyGradingMethodologyCompliance(
        schoolId,
        termId,
        session.user.id
      )
      message = 'Grading methodology compliance verification completed successfully'
    }

    // TODO: Save verification result to database for audit trail
    // This would be implemented when we have a ComplianceVerification model

    return NextResponse.json({
      success: true,
      data: verificationResult,
      message,
    })
  } catch (error) {
    console.error('Marks Compliance Verification API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify compliance' },
      { status: 500 }
    )
  }
}