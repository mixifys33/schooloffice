import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendSMS } from '@/services/sms.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { defaulters, message } = body

    if (!defaulters || !Array.isArray(defaulters) || defaulters.length === 0) {
      return NextResponse.json({ error: 'No defaulters provided' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Format currency with comma separator (e.g., 18,000 instead of 18.000)
    const formatCurrency = (amount: number) => {
      return `UGX ${amount.toLocaleString('en-US')}`
    }

    // Process each defaulter and send SMS
    const results = []
    let successCount = 0
    let failCount = 0

    for (const defaulter of defaulters) {
      try {
        // Replace placeholders in message
        let personalizedMessage = message
          .replace(/{guardianName}/g, defaulter.guardianName || 'Guardian')
          .replace(/{studentName}/g, defaulter.studentName)
          .replace(/{className}/g, defaulter.className)
          .replace(/{balance}/g, formatCurrency(defaulter.outstandingAmount))
          .replace(/{daysPastDue}/g, String(defaulter.daysPastDue || 0))

        // Send SMS using Africa's Talking service
        const smsResult = await sendSMS(defaulter.guardianPhone, personalizedMessage)

        if (smsResult.success) {
          successCount++
          results.push({
            studentName: defaulter.studentName,
            phone: defaulter.guardianPhone,
            status: 'sent',
            messageId: smsResult.messageId
          })
        } else {
          failCount++
          results.push({
            studentName: defaulter.studentName,
            phone: defaulter.guardianPhone,
            status: 'failed',
            error: smsResult.error
          })
        }
      } catch (error) {
        failCount++
        results.push({
          studentName: defaulter.studentName,
          phone: defaulter.guardianPhone,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      total: defaulters.length,
      results
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
