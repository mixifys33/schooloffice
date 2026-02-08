import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsSendingService } from '@/services/sms-sending.service' // Import the service

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { schoolId, minimumBalance, classIds, studentIds } = await request.json() // Destructure relevant options

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    // Call the sendFeesReminders from the service
    const sendResult = await smsSendingService.sendFeesReminders(
      schoolId,
      session.user.id, // Assuming session.user.id is the sentBy user
      session.user.role as string, // Assuming session.user.role is the sentByRole
      {
        minimumBalance,
        classIds,
        studentIds,
      }
    )

    // Return the result from the service
    return NextResponse.json({
      success: sendResult.success,
      messagesSent: sendResult.sentCount,
      messagesFailed: sendResult.failedCount,
      totalRecipients: sendResult.totalRecipients,
      errors: sendResult.errors,
      auditLogId: sendResult.auditLogId,
    })

  } catch (error) {
    console.error('Fee reminder SMS API error:', error)
    return NextResponse.json(
      { error: 'Failed to send fee reminders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}