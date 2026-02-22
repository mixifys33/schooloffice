import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  console.log('[SEND-REMINDERS] ========== Starting send reminders ==========')
  
  try {
    const session = await auth()
    console.log('[SEND-REMINDERS] Session user:', session?.user?.id)
    console.log('[SEND-REMINDERS] School ID:', session?.user?.schoolId)

    if (!session?.user?.schoolId) {
      console.log('[SEND-REMINDERS] ERROR: No session or school ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[SEND-REMINDERS] Request body:', JSON.stringify(body, null, 2))
    
    const { students, messageType, message } = body

    if (!students || students.length === 0) {
      console.log('[SEND-REMINDERS] ERROR: No students selected')
      return NextResponse.json({ error: 'No students selected' }, { status: 400 })
    }

    if (!message) {
      console.log('[SEND-REMINDERS] ERROR: No message provided')
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log(`[SEND-REMINDERS] Processing ${students.length} students`)
    console.log(`[SEND-REMINDERS] Message type: ${messageType}`)
    console.log(`[SEND-REMINDERS] Message template: ${message}`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i]
      console.log(`[SEND-REMINDERS] Processing student ${i + 1}/${students.length}: ${student.name}`)
      
      try {
        // Get student from database to get guardian info
        const dbStudent = await prisma.student.findUnique({
          where: { id: student.id },
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true },
              take: 1
            }
          }
        })

        if (!dbStudent) {
          console.log(`[SEND-REMINDERS] ERROR: Student ${student.id} not found in database`)
          errorCount++
          errors.push(`${student.name}: Student not found`)
          continue
        }

        const guardian = dbStudent.studentGuardians[0]?.guardian
        if (!guardian) {
          console.log(`[SEND-REMINDERS] ERROR: No guardian found for ${student.name}`)
          errorCount++
          errors.push(`${student.name}: No guardian found`)
          continue
        }

        if (!guardian.phone) {
          console.log(`[SEND-REMINDERS] ERROR: No phone number for guardian of ${student.name}`)
          errorCount++
          errors.push(`${student.name}: No guardian phone number`)
          continue
        }

        // Replace variables in message
        const personalizedMessage = message
          .replace(/{parentName}/g, `${guardian.firstName} ${guardian.lastName}`)
          .replace(/{studentName}/g, `${dbStudent.firstName} ${dbStudent.lastName}`)
          .replace(/{balance}/g, new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
          }).format(student.balance || 0))
          .replace(/{daysOverdue}/g, (student.daysOverdue || 0).toString())

        console.log(`[SEND-REMINDERS] Personalized message for ${student.name}:`, personalizedMessage)
        console.log(`[SEND-REMINDERS] Recipient: ${guardian.firstName} ${guardian.lastName} (${guardian.phone})`)

        // Create Message record to queue for SMS sending
        const messageRecord = await prisma.message.create({
          data: {
            schoolId: session.user.schoolId,
            studentId: dbStudent.id,
            guardianId: guardian.id,
            templateType: 'PAYMENT_REMINDER',
            messageType: 'AUTOMATED',
            channel: 'SMS',
            content: personalizedMessage,
            status: 'QUEUED'
          }
        })
        
        console.log(`[SEND-REMINDERS] ✅ Created Message record: ${messageRecord.id} - Status: QUEUED`)

        // Also create communication log for tracking
        const commLog = await prisma.communicationLog.create({
          data: {
            schoolId: session.user.schoolId,
            messageId: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: session.user.id,
            senderRole: session.user.role || 'ACCOUNTANT',
            channel: 'SMS',
            recipientId: student.id,
            recipientType: 'STUDENT',
            recipientContact: guardian.phone,
            content: personalizedMessage,
            status: 'SENT',
            metadata: {
              type: 'PAYMENT_REMINDER',
              subject: 'Payment Reminder',
              recipientName: `${guardian.firstName} ${guardian.lastName}`,
              balance: student.balance,
              daysOverdue: student.daysOverdue,
              messageRecordId: messageRecord.id
            }
          }
        })
        
        console.log(`[SEND-REMINDERS] ✅ Created communication log: ${commLog.id}`)
        
        successCount++
      } catch (error) {
        console.error(`[SEND-REMINDERS] Error processing student ${student.name}:`, error)
        errorCount++
        errors.push(`${student.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[SEND-REMINDERS] ========== Summary ==========`)
    console.log(`[SEND-REMINDERS] Total students: ${students.length}`)
    console.log(`[SEND-REMINDERS] Success: ${successCount}`)
    console.log(`[SEND-REMINDERS] Errors: ${errorCount}`)
    console.log(`[SEND-REMINDERS] ✅ Messages queued for SMS gateway`)
    console.log(`[SEND-REMINDERS] ========================================`)

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount > 0 ? errors : undefined,
      message: `Successfully queued ${successCount} SMS reminders`
    })
  } catch (error) {
    console.error('[SEND-REMINDERS] FATAL ERROR:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
