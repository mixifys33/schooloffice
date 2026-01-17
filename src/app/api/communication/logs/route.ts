/**
 * Communication Logs API Route
 * GET /api/communication/logs - Query message logs
 * Requirements: 12.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MessageLogService } from '@/services/message-log.service'
import { MessageChannel, DeliveryStatus, Role } from '@/types/enums'
import { communicationPermissionService } from '@/services/communication-permission.service'

const messageLogService = new MessageLogService()

/**
 * GET /api/communication/logs
 * Query message logs with filters
 * Requirements: 12.3
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const channel = searchParams.get('channel') as MessageChannel | null
    const status = searchParams.get('status') as DeliveryStatus | null
    const senderId = searchParams.get('senderId')
    const recipientId = searchParams.get('recipientId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Query message logs
    const result = await messageLogService.queryMessageLogs({
      schoolId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      channel: channel || undefined,
      status: status || undefined,
      senderId: senderId || undefined,
      recipientId: recipientId || undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    })

    return NextResponse.json({
      success: true,
      logs: result.logs.map(log => ({
        id: log.id,
        messageId: log.messageId,
        channel: log.channel,
        recipientType: log.recipientType,
        recipientContact: log.recipientContact,
        content: log.content.substring(0, 200) + (log.content.length > 200 ? '...' : ''),
        status: log.status,
        statusReason: log.statusReason,
        cost: log.cost,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error querying message logs:', error)
    return NextResponse.json(
      { error: 'Failed to query message logs' },
      { status: 500 }
    )
  }
}
