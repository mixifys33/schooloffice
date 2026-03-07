/**
 * Resend Failed Messages API Route
 * POST /api/communication/resend-failed - Resend failed messages
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { messageOrchestratorService } from '@/services/message-orchestrator.service'

interface ResendFailedRequest {
  dateFrom?: string
  dateTo?: string
}

/**
 * POST /api/communication/resend-failed
 * Resend all failed messages from a date range
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

    const body: ResendFailedRequest = await request.json()

    // Default to today if no date range provided
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dateFrom = body.dateFrom ? new Date(body.dateFrom) : today
    const dateTo = body.dateTo ? new Date(body.dateTo) : tomorrow

    // Get all failed messages in the date range
    const failedMessages = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        status: 'FAILED',
        createdAt: {
          gte: dateFrom,
          lt: dateTo,
        },
      },
      select: {
        messageId: true,
      },
    })

    console.log(`[Resend Failed] Found ${failedMessages.length} failed messages to resend`)

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    // Retry each failed message
    for (const message of failedMessages) {
      try {
        const result = await messageOrchestratorService.retryFailedMessage(message.messageId)
        
        if (result.status === 'FAILED') {
          failCount++
          errors.push(`${message.messageId}: ${result.error}`)
        } else {
          successCount++
        }
      } catch (error) {
        failCount++
        errors.push(`${message.messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      total: failedMessages.length,
      resent: successCount,
      failed: failCount,
      errors: errors.slice(0, 10), // Return first 10 errors
    })
  } catch (error) {
    console.error('Error resending failed messages:', error)
    return NextResponse.json(
      { error: 'Failed to resend messages' },
      { status: 500 }
    )
  }
}
