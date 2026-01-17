/**
 * Communication Log Detail API Route
 * GET /api/communication/logs/:id - Get message details
 * Requirements: 12.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MessageLogService } from '@/services/message-log.service'
import { Role } from '@/types/enums'
import { communicationPermissionService } from '@/services/communication-permission.service'

const messageLogService = new MessageLogService()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/communication/logs/:id
 * Get detailed message log by messageId
 * Requirements: 12.3
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'User information not found in session' },
        { status: 400 }
      )
    }

    // Check permission to view logs
    const permissionResult = await communicationPermissionService.canSendMessage({
      userId,
      userRole,
      schoolId,
      action: 'VIEW_LOGS',
    })

    if (!permissionResult.allowed) {
      return NextResponse.json(
        { error: permissionResult.reason || 'Permission denied' },
        { status: 403 }
      )
    }

    const { id: messageId } = await params

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Get message log
    const log = await messageLogService.getMessageLog(messageId)

    if (!log) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Verify the message belongs to the user's school
    if (log.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Get delivery proof
    let deliveryProof = null
    try {
      deliveryProof = await messageLogService.getDeliveryProof(messageId)
    } catch {
      // Delivery proof may not be available for all messages
    }

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        messageId: log.messageId,
        senderId: log.senderId,
        senderRole: log.senderRole,
        channel: log.channel,
        recipientId: log.recipientId,
        recipientType: log.recipientType,
        recipientContact: log.recipientContact,
        content: log.content,
        templateId: log.templateId,
        status: log.status,
        statusReason: log.statusReason,
        cost: log.cost,
        externalMessageId: log.externalMessageId,
        statusHistory: log.statusHistory,
        metadata: log.metadata,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      },
      deliveryProof: deliveryProof ? {
        messageId: deliveryProof.messageId,
        channel: deliveryProof.channel,
        recipientContact: deliveryProof.recipientContact,
        statusHistory: deliveryProof.statusHistory,
        finalStatus: deliveryProof.finalStatus,
        createdAt: deliveryProof.createdAt,
        generatedAt: deliveryProof.generatedAt,
      } : null,
    })
  } catch (error) {
    console.error('Error getting message log:', error)
    return NextResponse.json(
      { error: 'Failed to get message log' },
      { status: 500 }
    )
  }
}
