/**
 * Communication Emergency Alert API Route
 * POST /api/communication/emergency - Send emergency alert
 * Requirements: 7.1
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { messageOrchestratorService } from '@/services/message-orchestrator.service'
import { MessageChannel, Role } from '@/types/enums'

interface EmergencyAlertRequestBody {
  content: string
  channels?: MessageChannel[]
}

/**
 * POST /api/communication/emergency
 * Send emergency alert to entire school
 * Requirements: 7.1
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
    const userId = (session.user as { id?: string }).id
    const userRole = (session.user as { role?: Role }).role

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }

    // Only admins can send emergency alerts
    const allowedRoles = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Only administrators can send emergency alerts' },
        { status: 403 }
      )
    }

    const body: EmergencyAlertRequestBody = await request.json()

    // Validate required fields
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Alert content is required' },
        { status: 400 }
      )
    }

    // Default to all channels if not specified
    const channels = body.channels || [
      MessageChannel.SMS,
      MessageChannel.WHATSAPP,
      MessageChannel.EMAIL,
    ]

    // Send emergency alert via orchestrator
    const result = await messageOrchestratorService.sendEmergencyAlert({
      schoolId,
      content: body.content,
      channels,
      senderId: userId,
    })

    // Calculate totals
    const totalSent = result.channelResults.reduce((sum, r) => sum + r.sent, 0)
    const totalFailed = result.channelResults.reduce((sum, r) => sum + r.failed, 0)

    return NextResponse.json({
      success: totalSent > 0,
      alertId: result.alertId,
      channelResults: result.channelResults,
      totalSent,
      totalFailed,
    })
  } catch (error) {
    console.error('Error sending emergency alert:', error)
    return NextResponse.json(
      { error: 'Failed to send emergency alert' },
      { status: 500 }
    )
  }
}
