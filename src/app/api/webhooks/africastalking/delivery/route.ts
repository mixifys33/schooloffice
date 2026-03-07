/**
 * Africa's Talking Delivery Report Webhook
 * POST /api/webhooks/africastalking/delivery
 * Receives delivery status updates from Africa's Talking
 */
import { NextRequest, NextResponse } from 'next/server'
import { MessageLogService } from '@/services/message-log.service'

const messageLogService = new MessageLogService()

/**
 * POST /api/webhooks/africastalking/delivery
 * Handle delivery status updates from Africa's Talking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('[AT Webhook] Received delivery report:', body)

    // Africa's Talking sends delivery reports with this structure:
    // {
    //   id: "ATXid_...",
    //   status: "Success" | "Failed" | "Sent" | "Buffered" | "Rejected",
    //   phoneNumber: "+256...",
    //   networkCode: "...",
    //   retryCount: 0,
    //   failureReason: "..." (if failed)
    // }

    const { id: messageId, status, failureReason } = body

    if (!messageId) {
      console.error('[AT Webhook] No message ID in delivery report')
      return NextResponse.json({ error: 'No message ID' }, { status: 400 })
    }

    // Map Africa's Talking status to our status
    let mappedStatus: string
    switch (status?.toLowerCase()) {
      case 'success':
      case 'delivered':
        mappedStatus = 'DELIVERED'
        break
      case 'sent':
        mappedStatus = 'SENT'
        break
      case 'failed':
      case 'rejected':
        mappedStatus = 'FAILED'
        break
      case 'buffered':
        mappedStatus = 'QUEUED'
        break
      default:
        mappedStatus = 'QUEUED'
    }

    console.log(`[AT Webhook] Updating message ${messageId} to status ${mappedStatus}`)

    // Update message status in database
    await messageLogService.updateMessageStatus(
      messageId,
      mappedStatus as any,
      failureReason
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AT Webhook] Error processing delivery report:', error)
    return NextResponse.json(
      { error: 'Failed to process delivery report' },
      { status: 500 }
    )
  }
}

// Allow POST requests without authentication (webhook from Africa's Talking)
export const dynamic = 'force-dynamic'
