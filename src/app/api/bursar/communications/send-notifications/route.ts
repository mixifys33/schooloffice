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
    const { feeStructureIds, messageType, subject, message } = body

    if (!feeStructureIds || feeStructureIds.length === 0) {
      return NextResponse.json({ error: 'No fee structures selected' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get fee structures with their students
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        id: { in: feeStructureIds },
        schoolId: session.user.schoolId
      },
      include: {
        class: {
          include: {
            students: {
              where: { status: 'ACTIVE' },
              include: {
                studentGuardians: {
                  where: { isPrimary: true },
                  include: { guardian: true },
                  take: 1
                }
              }
            }
          }
        },
        term: true
      }
    })

    let sentCount = 0
    const communicationRecords = []

    // Send notifications to all students in selected classes
    for (const feeStructure of feeStructures) {
      for (const student of feeStructure.class.students) {
        const guardian = student.studentGuardians[0]?.guardian
        if (!guardian) continue

        // Replace variables in message
        const personalizedMessage = message
          .replace(/{termName}/g, feeStructure.term.name)
          .replace(/{className}/g, feeStructure.class.name)
          .replace(/{amount}/g, new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
          }).format(feeStructure.totalAmount))
          .replace(/{parentName}/g, `${guardian.firstName} ${guardian.lastName}`)
          .replace(/{studentName}/g, `${student.firstName} ${student.lastName}`)

        // Determine recipient contact based on message type
        const recipientContact = messageType === 'sms' 
          ? guardian.phone 
          : messageType === 'email' 
            ? guardian.email || guardian.phone
            : guardian.phone

        // Create communication log
        const commLog = await prisma.communicationLog.create({
          data: {
            schoolId: session.user.schoolId,
            messageId: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: session.user.id,
            senderRole: session.user.role || 'ACCOUNTANT',
            channel: messageType.toUpperCase() as 'SMS' | 'EMAIL',
            recipientId: student.id,
            recipientType: 'STUDENT',
            recipientContact,
            content: personalizedMessage,
            status: 'SENT',
            metadata: {
              type: 'FEE_NOTIFICATION',
              subject: subject || 'Fee Notification',
              guardianName: `${guardian.firstName} ${guardian.lastName}`,
              feeStructureId: feeStructure.id,
              termName: feeStructure.term.name,
              className: feeStructure.class.name,
              totalAmount: feeStructure.totalAmount
            }
          }
        })

        communicationRecords.push(commLog)
        sentCount++
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      message: `Successfully sent ${sentCount} notifications`
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
