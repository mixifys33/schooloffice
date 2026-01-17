/**
 * Teacher Messages Send API Route
 * POST /api/teacher/messages/send - Send in-app message
 * Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7
 * - Validate recipients are in assigned classes (8.1)
 * - Check school settings for parent messaging (8.2)
 * - Log all messages to audit service (8.3)
 * - Prevent bulk announcements (8.5)
 * - Prevent SMS (8.6)
 * - Prevent WhatsApp (8.7)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { schoolSettingsService, CommunicationSettings } from '@/services/school-settings.service'
import { teacherCommunicationService } from '@/services/teacher-communication.service'

interface SendMessageBody {
  recipientIds: string[]
  recipientType: 'student' | 'parent'
  content: string
  classId: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id
    const schoolId = (session.user as { schoolId?: string }).schoolId

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    const body: SendMessageBody = await request.json()
    const { recipientIds, recipientType, content, classId } = body

    // Validate input
    if (!recipientIds || recipientIds.length === 0) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Message exceeds maximum length of 1000 characters' }, { status: 400 })
    }

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedClassIds: true,
        canSendMessages: true,
        hasSystemAccess: true,
        inAppMessagingEnabled: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Check permissions
    if (!teacher.hasSystemAccess || !teacher.canSendMessages || !teacher.inAppMessagingEnabled) {
      return NextResponse.json({ error: 'Messaging not enabled for this account' }, { status: 403 })
    }

    // Requirement 8.1: Verify class is assigned to teacher
    if (!teacher.assignedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    // Requirement 8.2: Check parent messaging if sending to parents
    if (recipientType === 'parent') {
      const commSettings = await schoolSettingsService.getSettings<CommunicationSettings>(
        schoolId,
        'communication'
      )

      if (!commSettings.teacherParentMessagingEnabled) {
        return NextResponse.json(
          { error: 'Parent messaging is not enabled for this school' },
          { status: 403 }
        )
      }
    }

    // Validate all recipients are in the assigned class
    if (recipientType === 'student') {
      const validStudents = await prisma.student.findMany({
        where: {
          id: { in: recipientIds },
          classId,
          schoolId,
        },
        select: { id: true },
      })

      if (validStudents.length !== recipientIds.length) {
        return NextResponse.json(
          { error: 'Some recipients are not in your assigned class' },
          { status: 403 }
        )
      }
    } else {
      // For parents, verify they have students in the class
      const studentsInClass = await prisma.student.findMany({
        where: {
          classId,
          schoolId,
        },
        select: {
          studentGuardians: {
            select: { guardianId: true },
          },
        },
      })

      const validGuardianIds = new Set(
        studentsInClass.flatMap((s) => s.studentGuardians.map((sg) => sg.guardianId))
      )

      const invalidRecipients = recipientIds.filter((id) => !validGuardianIds.has(id))
      if (invalidRecipients.length > 0) {
        return NextResponse.json(
          { error: 'Some recipients do not have students in your assigned class' },
          { status: 403 }
        )
      }
    }

    // Create in-app notification records for each recipient
    const notifications = await Promise.all(
      recipientIds.map(async (recipientId) => {
        // For students, use their userId; for guardians, use their userId
        let notificationUserId = recipientId
        
        if (recipientType === 'student') {
          const student = await prisma.student.findUnique({
            where: { id: recipientId },
            select: { userId: true },
          })
          notificationUserId = student?.userId || recipientId
        } else {
          const guardian = await prisma.guardian.findUnique({
            where: { id: recipientId },
            select: { userId: true },
          })
          notificationUserId = guardian?.userId || recipientId
        }

        return prisma.inAppNotification.create({
          data: {
            schoolId,
            userId: notificationUserId,
            title: `Message from ${teacher.firstName} ${teacher.lastName}`,
            content,
            type: 'MESSAGE',
            priority: 'NORMAL',
            metadata: {
              senderId: teacher.id,
              senderType: 'TEACHER',
              senderName: `${teacher.firstName} ${teacher.lastName}`,
              recipientType,
              recipientId,
              classId,
            },
          },
        })
      })
    )

    // Requirement 8.3: Log to audit service
    await auditService.log({
      schoolId,
      userId: teacher.id,
      action: AuditAction.CREATE,
      resource: AuditResource.ANNOUNCEMENT,
      resourceId: notifications[0]?.id || 'batch',
      newValue: {
        recipientType,
        recipientCount: recipientIds.length,
        classId,
        contentPreview: content.substring(0, 100),
        channel: 'IN_APP',
        sentAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      messageCount: notifications.length,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
