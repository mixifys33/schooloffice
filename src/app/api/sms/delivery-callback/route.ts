/**
 * SMS Delivery Callback Webhook
 * Receives delivery reports from Africa's Talking
 * Updates message status based on actual delivery
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MessageStatus } from '@/types/enums'

/**
 * Africa's Talking Delivery Report Format:
 * - id: The message ID (ATXid_xxx format)
 * - status: Success, Failed, Rejected
 * - phoneNumber: Recipient phone number
 * - networkCode: Network code
 * - failureReason: Reason for failure (if failed)
 */
interface DeliveryReport {
  id: string
  status: string
  phoneNumber: string
  networkCode?: string
  failureReason?: string
}

/**
 * POST /api/sms/delivery-callback
 * Webhook endpoint for Africa's Talking delivery reports
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the delivery report - AT sends as form data
    const contentType = request.headers.get('content-type') || ''
    
    let report: DeliveryReport
    
    if (contentType.includes('application/json')) {
      report = await request.json()
    } else {
      // Form data
      const formData = await request.formData()
      report = {
        id: formData.get('id') as string,
        status: formData.get('status') as string,
        phoneNumber: formData.get('phoneNumber') as string,
        networkCode: formData.get('networkCode') as string || undefined,
        failureReason: formData.get('failureReason') as string || undefined,
      }
    }

    console.log('[SMS Delivery] Received callback:', report)

    if (!report.id || !report.status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Map Africa's Talking status to our MessageStatus
    const messageStatus = mapDeliveryStatus(report.status)
    
    // Find and update the message by looking for the AT message ID in recent messages
    // Since we don't store the AT message ID directly, we'll match by phone number and recent time
    const recentMessages = await prisma.message.findMany({
      where: {
        status: MessageStatus.SENT,
        channel: 'SMS',
        guardian: {
          phone: {
            contains: report.phoneNumber.replace('+', ''),
          },
        },
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 1,
      include: {
        guardian: { select: { phone: true } },
      },
    })

    if (recentMessages.length > 0) {
      const message = recentMessages[0]
      
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: messageStatus,
          deliveredAt: messageStatus === MessageStatus.DELIVERED ? new Date() : undefined,
          errorMessage: report.failureReason || undefined,
        },
      })

      console.log(`[SMS Delivery] Updated message ${message.id} to ${messageStatus}`)
    } else {
      console.log(`[SMS Delivery] No matching message found for ${report.phoneNumber}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SMS Delivery] Callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Map Africa's Talking delivery status to MessageStatus
 */
function mapDeliveryStatus(atStatus: string): MessageStatus {
  switch (atStatus.toLowerCase()) {
    case 'success':
    case 'delivered':
      return MessageStatus.DELIVERED
    case 'failed':
    case 'rejected':
      return MessageStatus.FAILED
    default:
      return MessageStatus.SENT
  }
}
