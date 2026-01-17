/**
 * SMS Send with Progress API Route
 * Streams progress updates to the client during SMS sending
 * OPTIMIZED for speed - minimal DB operations during send loop
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MessageChannel, MessageStatus, MessageTemplateType, StudentStatus } from '@/types/enums'
import { SMS_COST_UGX } from '@/services/sms-budget.service'

interface SendSMSRequest {
  message: string
  templateType?: MessageTemplateType
  recipientType: 'all' | 'class' | 'individual'
  classIds?: string[]
  studentIds?: string[]
  excludeUnpaid?: boolean
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      try {
        const session = await auth()
        
        if (!session?.user) {
          sendProgress({ type: 'error', error: 'Unauthorized' })
          controller.close()
          return
        }

        const schoolId = (session.user as { schoolId?: string }).schoolId
        if (!schoolId) {
          sendProgress({ type: 'error', error: 'School ID not found' })
          controller.close()
          return
        }

        // Quick school check - single query
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { id: true, isActive: true, smsBudgetPerTerm: true },
        })

        if (!school?.isActive) {
          sendProgress({ type: 'error', error: 'SMS disabled - subscription inactive' })
          controller.close()
          return
        }

        const body: SendSMSRequest = await request.json()
        const { message, templateType, recipientType, classIds, studentIds, excludeUnpaid = true } = body

        if (!message?.trim()) {
          sendProgress({ type: 'error', error: 'Message content is required' })
          controller.close()
          return
        }

        // Build student query
        const studentQuery: {
          schoolId: string
          status: StudentStatus
          classId?: { in: string[] }
          id?: { in: string[] }
        } = {
          schoolId,
          status: StudentStatus.ACTIVE,
        }

        if (recipientType === 'class' && classIds?.length) {
          studentQuery.classId = { in: classIds }
        } else if (recipientType === 'individual' && studentIds?.length) {
          studentQuery.id = { in: studentIds }
        }

        // Get students with guardians - single query
        const students = await prisma.student.findMany({
          where: studentQuery,
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: {
                guardian: {
                  select: { id: true, phone: true, firstName: true, lastName: true },
                },
              },
            },
          },
        })

        // Filter students with valid phone numbers
        let eligibleStudents = students.filter(s => s.studentGuardians[0]?.guardian?.phone)

        // Simple unpaid filter - only if excludeUnpaid is true and we have fee structures
        if (excludeUnpaid) {
          const currentTerm = await prisma.term.findFirst({
            where: {
              academicYear: { schoolId, isActive: true },
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
            select: { id: true },
          })

          if (currentTerm) {
            const [payments, feeStructures] = await Promise.all([
              prisma.payment.groupBy({
                by: ['studentId'],
                where: { termId: currentTerm.id, studentId: { in: eligibleStudents.map(s => s.id) } },
                _sum: { amount: true },
              }),
              prisma.feeStructure.findMany({
                where: { schoolId, termId: currentTerm.id },
                select: { classId: true, totalAmount: true },
              }),
            ])

            if (feeStructures.length > 0) {
              const paymentMap = new Map(payments.map(p => [p.studentId, p._sum.amount || 0]))
              const feeMap = new Map(feeStructures.map(f => [f.classId, f.totalAmount]))

              eligibleStudents = eligibleStudents.filter(student => {
                const required = feeMap.get(student.classId) || 0
                if (required === 0) return true
                const paid = paymentMap.get(student.id) || 0
                return paid >= required
              })
            }
          }
        }

        const total = eligibleStudents.length

        if (total === 0) {
          sendProgress({ type: 'error', error: 'No eligible recipients found' })
          controller.close()
          return
        }

        // Send initial progress immediately
        sendProgress({ type: 'progress', total, sent: 0, failed: 0, currentRecipient: 'Starting...' })

        // Import SMS gateway once
        const { smsGateway } = await import('@/services/sms-gateway.service')

        let sent = 0
        let failed = 0
        const messageTemplate = templateType || MessageTemplateType.GENERAL_ANNOUNCEMENT

        // Batch create all message records first for speed
        const messageData = eligibleStudents.map(student => ({
          schoolId,
          studentId: student.id,
          guardianId: student.studentGuardians[0]!.guardian!.id,
          templateType: messageTemplate,
          channel: MessageChannel.SMS,
          content: message,
          status: MessageStatus.QUEUED,
        }))

        // Create all messages in one batch
        await prisma.message.createMany({ data: messageData })

        // Get the created message IDs
        const createdMessages = await prisma.message.findMany({
          where: {
            schoolId,
            status: MessageStatus.QUEUED,
            content: message,
            createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
          },
          select: { id: true, studentId: true },
          orderBy: { createdAt: 'desc' },
          take: total,
        })

        const messageIdMap = new Map(createdMessages.map(m => [m.studentId, m.id]))

        // Process each student - send SMS only, batch update later
        const sentIds: string[] = []
        const failedIds: string[] = []
        const failedErrors: Map<string, string> = new Map()

        for (let i = 0; i < eligibleStudents.length; i++) {
          const student = eligibleStudents[i]
          const guardian = student.studentGuardians[0]?.guardian
          const messageId = messageIdMap.get(student.id)
          
          if (!guardian?.phone || !messageId) {
            failed++
            if (messageId) {
              failedIds.push(messageId)
              failedErrors.set(messageId, 'No phone number')
            }
            continue
          }

          const recipientName = `${student.firstName} ${student.lastName}`
          
          // Send progress update every 3 messages or on first/last
          if (i === 0 || i === eligibleStudents.length - 1 || i % 3 === 0) {
            sendProgress({
              type: 'progress',
              total,
              sent,
              failed,
              currentRecipient: recipientName,
            })
          }

          try {
            // Send SMS - this is the main operation
            const smsResult = await smsGateway.sendSMS({
              to: guardian.phone,
              message: message,
            })

            if (smsResult.success) {
              sentIds.push(messageId)
              sent++
            } else {
              failedIds.push(messageId)
              failedErrors.set(messageId, smsResult.error || 'Send failed')
              failed++
            }
          } catch (err) {
            failedIds.push(messageId)
            failedErrors.set(messageId, err instanceof Error ? err.message : 'Unknown error')
            failed++
          }

          // Minimal delay - just 50ms to avoid rate limiting
          if (i < eligibleStudents.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }

        // Batch update all sent messages
        if (sentIds.length > 0) {
          await prisma.message.updateMany({
            where: { id: { in: sentIds } },
            data: { 
              status: MessageStatus.SENT, 
              sentAt: new Date(),
              cost: SMS_COST_UGX,
            },
          })
        }

        // Batch update all failed messages
        if (failedIds.length > 0) {
          await prisma.message.updateMany({
            where: { id: { in: failedIds } },
            data: { status: MessageStatus.FAILED },
          })
        }

        // Send completion
        sendProgress({
          type: 'complete',
          total,
          sentCount: sent,
          failedCount: failed,
          success: true,
        })

        controller.close()
      } catch (error) {
        console.error('SMS send error:', error)
        sendProgress({ type: 'error', error: 'Failed to send SMS' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
