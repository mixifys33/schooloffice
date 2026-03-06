/**
 * Communication Targeting Preview API Route
 * POST /api/communication/targeting/preview - Preview recipient count
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { targetingService } from '@/services/targeting.service'
import { TargetType } from '@/types/enums'
import { TargetCriteria } from '@/types/entities'

interface PreviewRequestBody {
  targetType: TargetType
  criteria: TargetCriteria
}

/**
 * POST /api/communication/targeting/preview
 * Get recipient count for targeting criteria
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    const body: PreviewRequestBody = await request.json()

    if (!body.targetType) {
      return NextResponse.json(
        { error: 'Target type is required' },
        { status: 400 }
      )
    }

    // Resolve recipients to get count
    const recipients = await targetingService.resolveRecipients({
      schoolId,
      targetType: body.targetType,
      criteria: body.criteria || {},
    })

    // Count by type
    const students = recipients.filter(r => r.type === 'STUDENT').length
    const guardians = recipients.filter(r => r.type === 'GUARDIAN').length
    const staff = recipients.filter(r => r.type === 'STAFF').length

    // For SMS, only guardians and staff receive messages (students don't have phones)
    const smsRecipients = guardians + staff

    return NextResponse.json({
      success: true,
      total: recipients.length,
      smsRecipients, // Actual SMS recipients (guardians + staff)
      students,
      guardians,
      staff,
      breakdown: {
        message: `${guardians} guardian${guardians !== 1 ? 's' : ''} for ${students} student${students !== 1 ? 's' : ''}${staff > 0 ? ` + ${staff} staff` : ''}`
      }
    })
  } catch (error) {
    console.error('Error previewing recipients:', error)
    return NextResponse.json(
      { error: 'Failed to preview recipients' },
      { status: 500 }
    )
  }
}
