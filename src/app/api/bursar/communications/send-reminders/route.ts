import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { students, messageType, message } = body

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students selected' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Log the communication
    const communicationRecords = await Promise.all(
      students.map(async (student: any) => {
        // Replace variables in message
        const personalizedMessage = message
          .replace(/{parentName}/g, student.parentName)
          .replace(/{studentName}/g, student.name)
          .replace(/{balance}/g, new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
          }).format(student.balance))
          .replace(/{daysOverdue}/g, student.daysOverdue.toString())

        // Create communication log record
        return prisma.communicationLog.create({
          data: {
            schoolId: session.user.schoolId,
            messageId: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: session.user.id,
            senderRole: session.user.role || 'ACCOUNTANT',
            channel: messageType.toUpperCase() as 'SMS' | 'EMAIL',
            recipientId: student.id,
            recipientType: 'STUDENT',
            recipientContact: messageType === 'sms' ? student.parentPhone : student.parentEmail,
            content: personalizedMessage,
            status: 'SENT',
            metadata: {
              type: 'PAYMENT_REMINDER',
              subject: 'Payment Reminder',
              recipientName: student.parentName,
              balance: student.balance,
              daysOverdue: student.daysOverdue
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      sent: communicationRecords.length,
      message: `Successfully sent ${communicationRecords.length} reminders`
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
