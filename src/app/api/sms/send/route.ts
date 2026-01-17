/**
 * SMS Send API Route
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 18.5
 * - Send SMS to selected recipients
 * - Automatically exclude unpaid students
 * - Disable SMS if school subscription suspended
 * - Track SMS balance
 * - Log SMS sending with school ID, recipient count, cost
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { MessageChannel, MessageStatus, MessageTemplateType, StudentStatus } from '@/types/enums'
import { smsBudgetService, SMS_COST_UGX } from '@/services/sms-budget.service'
import { auditService } from '@/services/audit.service'

interface SendSMSRequest {
  message: string
  templateType?: MessageTemplateType
  recipientType: 'all' | 'class' | 'individual'
  classIds?: string[]
  studentIds?: string[]
  excludeUnpaid?: boolean
}

/**
 * POST /api/sms/send
 * Send SMS to selected recipients
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
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

    // Check if school is active (Requirement 8.4)
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        isActive: true,
        smsBudgetPerTerm: true,
        licenseType: true,
        features: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    if (!school.isActive) {
      return NextResponse.json(
        { error: 'SMS disabled - subscription inactive' },
        { status: 403 }
      )
    }

    // Requirement 15.3: Check pilot SMS limit before sending
    if (school.licenseType === 'FREE_PILOT') {
      const features = school.features as Record<string, unknown>
      const pilotSmsLimit = (features?.pilotSmsLimit as number) || 100
      const smsSentCount = (features?.smsSentCount as number) || 0
      
      if (smsSentCount >= pilotSmsLimit) {
        return NextResponse.json(
          { error: 'Pilot SMS limit reached', message: 'Pilot SMS limit reached. Cannot send SMS. Please upgrade to a paid plan.' },
          { status: 403 }
        )
      }
    }

    const body: SendSMSRequest = await request.json()
    const { message, templateType, recipientType, classIds, studentIds, excludeUnpaid = true } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Build query for recipients based on selection type (Requirement 8.2)
    let studentQuery: {
      schoolId: string
      status: StudentStatus
      classId?: { in: string[] }
      id?: { in: string[] }
    } = {
      schoolId,
      status: StudentStatus.ACTIVE,
    }

    if (recipientType === 'class' && classIds && classIds.length > 0) {
      studentQuery.classId = { in: classIds }
    } else if (recipientType === 'individual' && studentIds && studentIds.length > 0) {
      studentQuery.id = { in: studentIds }
    }

    // Get students with their guardians and payment status
    const students = await prisma.student.findMany({
      where: studentQuery,
      include: {
        studentGuardians: {
          where: { isPrimary: true },
          include: {
            guardian: {
              select: {
                id: true,
                phone: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
    })

    // Get current term for payment status check
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    })

    // Filter out unpaid students if excludeUnpaid is true (Requirement 8.3)
    let eligibleStudents = students
    const excludedStudents: { id: string; name: string; reason: string }[] = []

    if (excludeUnpaid && currentTerm) {
      // Get payment status for all students
      const payments = await prisma.payment.groupBy({
        by: ['studentId'],
        where: {
          termId: currentTerm.id,
          studentId: { in: students.map(s => s.id) },
        },
        _sum: {
          amount: true,
        },
      })

      const paymentMap = new Map(payments.map(p => [p.studentId, p._sum.amount || 0]))

      // Get fee structures for classes
      const feeStructures = await prisma.feeStructure.findMany({
        where: {
          schoolId,
          termId: currentTerm.id,
          classId: { in: [...new Set(students.map(s => s.classId))] },
        },
      })

      const feeMap = new Map(feeStructures.map(f => [f.classId, f.totalAmount]))

      eligibleStudents = students.filter(student => {
        const paid = paymentMap.get(student.id) || 0
        const required = feeMap.get(student.classId) || 0
        const isPaid = required === 0 || paid >= required

        if (!isPaid) {
          excludedStudents.push({
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            reason: 'Unpaid fees',
          })
          return false
        }
        return true
      })
    }

    // Filter students with valid guardian phone numbers
    const recipientsWithPhone = eligibleStudents.filter(student => {
      const guardian = student.studentGuardians[0]?.guardian
      if (!guardian?.phone) {
        excludedStudents.push({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          reason: 'No guardian phone number',
        })
        return false
      }
      return true
    })

    if (recipientsWithPhone.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible recipients found',
        excludedStudents,
        sentCount: 0,
        failedCount: 0,
      })
    }

    // Check SMS budget (Requirement 8.6)
    const estimatedCost = recipientsWithPhone.length * SMS_COST_UGX
    const budgetCheck = await smsBudgetService.canSendSMS(schoolId)

    if (!budgetCheck.canSend) {
      return NextResponse.json({
        success: false,
        error: budgetCheck.reason || 'SMS budget exceeded',
        excludedStudents,
        sentCount: 0,
        failedCount: 0,
      })
    }

    // Check if we have enough budget for all recipients
    if (budgetCheck.remainingBudget > 0 && estimatedCost > budgetCheck.remainingBudget) {
      const maxRecipients = Math.floor(budgetCheck.remainingBudget / SMS_COST_UGX)
      return NextResponse.json({
        success: false,
        error: `Insufficient SMS budget. You can send to max ${maxRecipients} recipients (budget: UGX ${budgetCheck.remainingBudget.toLocaleString()}, needed: UGX ${estimatedCost.toLocaleString()})`,
        excludedStudents,
        sentCount: 0,
        failedCount: 0,
      })
    }

    // Create message records and queue for sending
    const messageRecords = []
    const sentMessages = []
    const failedMessages = []

    for (const student of recipientsWithPhone) {
      const guardian = student.studentGuardians[0]?.guardian
      if (!guardian) continue

      try {
        // Create message record
        const messageRecord = await prisma.message.create({
          data: {
            schoolId,
            studentId: student.id,
            guardianId: guardian.id,
            templateType: templateType || MessageTemplateType.GENERAL_ANNOUNCEMENT,
            channel: MessageChannel.SMS,
            content: message,
            status: MessageStatus.QUEUED,
          },
        })

        messageRecords.push(messageRecord)

        // Actually send SMS through Africa's Talking gateway
        const { smsGateway } = await import('@/services/sms-gateway.service')
        
        const smsResult = await smsGateway.sendSMS({
          to: guardian.phone,
          message: message,
        })

        if (smsResult.success) {
          await prisma.message.update({
            where: { id: messageRecord.id },
            data: {
              status: MessageStatus.SENT,
              sentAt: new Date(),
              // Note: externalId not in schema, store in a different way if needed
            },
          })
        } else {
          await prisma.message.update({
            where: { id: messageRecord.id },
            data: {
              status: MessageStatus.FAILED,
              errorMessage: smsResult.error,
            },
          })
          throw new Error(smsResult.error || 'SMS send failed')
        }

        // Log SMS cost (Requirement 8.6)
        if (currentTerm) {
          await smsBudgetService.logSMSCost({
            schoolId,
            messageId: messageRecord.id,
            studentId: student.id,
            cost: SMS_COST_UGX,
            recipient: guardian.phone,
            segments: Math.ceil(message.length / 160),
          })
        }

        // Update pilot SMS count if applicable
        const currentSchool = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { licenseType: true, features: true }
        })
        
        if (currentSchool?.licenseType === 'FREE_PILOT') {
          const currentFeatures = currentSchool.features as Record<string, unknown>
          const currentSmsCount = (currentFeatures?.smsSentCount as number) || 0
          await prisma.school.update({
            where: { id: schoolId },
            data: {
              features: {
                ...currentFeatures,
                smsSentCount: currentSmsCount + 1
              }
            }
          })
        }

        sentMessages.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          guardianPhone: guardian.phone,
        })
      } catch (error) {
        console.error(`Failed to send SMS to ${student.firstName} ${student.lastName}:`, error)
        failedMessages.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log SMS sending - Requirement 18.5
    // Log school ID, recipient count, cost
    if (sentMessages.length > 0) {
      const userId = (session.user as { id?: string }).id
      await auditService.log({
        schoolId,
        userId: userId || 'system',
        action: 'sms_sent',
        resource: 'message',
        resourceId: `bulk_sms_${Date.now()}`,
        newValue: {
          recipientCount: sentMessages.length,
          failedCount: failedMessages.length,
          excludedCount: excludedStudents.length,
          totalCost: sentMessages.length * SMS_COST_UGX,
          templateType: templateType || MessageTemplateType.GENERAL_ANNOUNCEMENT,
          recipientType,
          classIds: classIds || [],
          messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      sentCount: sentMessages.length,
      failedCount: failedMessages.length,
      excludedCount: excludedStudents.length,
      excludedStudents,
      sentMessages,
      failedMessages,
      totalCost: sentMessages.length * SMS_COST_UGX,
    })
  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
