/**
 * Simple SMS Send API Route
 * For internal use (staff credentials, etc.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { smsGateway } from '@/services/sms-gateway.service'

interface SimpleSMSRequest {
  to: string
  message: string
  type?: string
}

/**
 * POST /api/sms/send-simple
 * Send SMS directly (for internal use)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for internal call header
    const isInternalCall = request.headers.get('x-internal-call') === 'true'
    
    if (!isInternalCall) {
      return NextResponse.json(
        { error: 'This endpoint is for internal use only' },
        { status: 403 }
      )
    }

    const body: SimpleSMSRequest = await request.json()
    const { to, message, type } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    // Send SMS directly
    const result = await smsGateway.sendSMS({
      to,
      message,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}