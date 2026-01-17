/**
 * Messaging Service
 * Handles direct parent-school communication
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */
import { prisma } from '@/lib/db'
import {
  Conversation,
  DirectMessage,
  CreateConversationInput,
  SendDirectMessageInput,
  ConversationWithMessages,
  ConversationSummary,
  MessageNotificationResult,
} from '@/types'
import {
  DirectMessageStatus,
  ConversationParticipantType,
  Role,
  MessageChannel,
} from '@/types/enums'

/**
 * Map Prisma Conversation to domain type
 */
function mapPrismaConversationToDomain(prismaConversation: {
  id: string
  schoolId: string
  studentId: string
  guardianId: string
  staffId: string | null
  isOfficial: boolean
  subject: string | null
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}): Conversation {
  return {
    id: prismaConversation.id,
    schoolId: prismaConversation.schoolId,
    studentId: prismaConversation.studentId,
    guardianId: prismaConversation.guardianId,
    staffId: prismaConversation.staffId ?? undefined,
    isOfficial: prismaConversation.isOfficial,
    subject: prismaConversation.subject ?? undefined,
    lastMessageAt: prismaConversation.lastMessageAt,
    createdAt: prismaConversation.createdAt,
    updatedAt: prismaConversation.updatedAt,
  }
}

/**
 * Map Prisma DirectMessage to domain type
 */
function mapPrismaDirectMessageToDomain(prismaMessage: {
  id: string
  conversationId: string
  senderId: string
  senderType: string
  content: string
  isOfficial: boolean
  status: string
  readAt: Date | null
  notificationSent: boolean
  notificationChannel: string | null
  createdAt: Date
  updatedAt: Date
}): DirectMessage {
  return {
    id: prismaMessage.id,
    conversationId: prismaMessage.conversationId,
    senderId: prismaMessage.senderId,
    senderType: prismaMessage.senderType as ConversationParticipantType,
    content: prismaMessage.content,
    isOfficial: prismaMessage.isOfficial,
    status: prismaMessage.status as DirectMessageStatus,
    readAt: prismaMessage.readAt ?? undefined,
    notificationSent: prismaMessage.notificationSent,
    notificationChannel: prismaMessage.notificationChannel ?? undefined,
    createdAt: prismaMessage.createdAt,
    updatedAt: prismaMessage.updatedAt,
  }
}


export class MessagingService {
  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================

  /**
   * Create or get existing conversation between parent and teacher/admin
   * Requirement 36.1: Display "Message Teacher" button for each assigned teacher
   */
  async getOrCreateConversation(input: CreateConversationInput): Promise<Conversation> {
    const existing = await prisma.conversation.findFirst({
      where: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        staffId: input.staffId ?? null,
      },
    })

    if (existing) {
      return mapPrismaConversationToDomain(existing)
    }

    const conversation = await prisma.conversation.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        staffId: input.staffId,
        isOfficial: input.isOfficial ?? false,
        subject: input.subject,
      },
    })

    return mapPrismaConversationToDomain(conversation)
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(id: string): Promise<Conversation | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return null
    }

    return mapPrismaConversationToDomain(conversation)
  }

  /**
   * Get conversation with all messages (thread history)
   * Requirement 36.5: Display complete conversation thread with timestamps
   */
  async getConversationWithMessages(id: string): Promise<ConversationWithMessages | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return null
    }

    const guardian = await prisma.guardian.findUnique({
      where: { id: conversation.guardianId },
      select: { id: true, firstName: true, lastName: true },
    })

    let staff = null
    if (conversation.staffId) {
      staff = await prisma.staff.findUnique({
        where: { id: conversation.staffId },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    }

    const student = await prisma.student.findUnique({
      where: { id: conversation.studentId },
      select: { id: true, firstName: true, lastName: true },
    })

    return {
      ...mapPrismaConversationToDomain(conversation),
      messages: conversation.messages.map(mapPrismaDirectMessageToDomain),
      guardian: guardian ?? undefined,
      staff: staff ?? undefined,
      student: student ?? undefined,
    }
  }

  /**
   * Get all conversations for a guardian (parent)
   */
  async getConversationsForGuardian(guardianId: string): Promise<ConversationSummary[]> {
    const conversations = await prisma.conversation.findMany({
      where: { guardianId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    const summaries: ConversationSummary[] = []

    for (const conv of conversations) {
      const student = await prisma.student.findUnique({
        where: { id: conv.studentId },
        select: { firstName: true, lastName: true },
      })

      let participantName = 'School Administration'
      let participantType = ConversationParticipantType.SCHOOL_ADMIN

      if (conv.staffId) {
        const staff = await prisma.staff.findUnique({
          where: { id: conv.staffId },
          select: { firstName: true, lastName: true, role: true },
        })
        if (staff) {
          participantName = `${staff.firstName} ${staff.lastName}`
          participantType = staff.role === Role.SCHOOL_ADMIN
            ? ConversationParticipantType.SCHOOL_ADMIN
            : ConversationParticipantType.TEACHER
        }
      }

      const unreadCount = await prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          senderType: { not: ConversationParticipantType.PARENT },
          status: { not: DirectMessageStatus.READ },
        },
      })

      summaries.push({
        id: conv.id,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        participantName,
        participantType,
        lastMessage: conv.messages[0]?.content,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        isOfficial: conv.isOfficial,
      })
    }

    return summaries
  }

  /**
   * Get all conversations for a staff member (teacher/admin)
   */
  async getConversationsForStaff(staffId: string): Promise<ConversationSummary[]> {
    const conversations = await prisma.conversation.findMany({
      where: { staffId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    const summaries: ConversationSummary[] = []

    for (const conv of conversations) {
      const student = await prisma.student.findUnique({
        where: { id: conv.studentId },
        select: { firstName: true, lastName: true },
      })

      const guardian = await prisma.guardian.findUnique({
        where: { id: conv.guardianId },
        select: { firstName: true, lastName: true },
      })

      const unreadCount = await prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          senderType: ConversationParticipantType.PARENT,
          status: { not: DirectMessageStatus.READ },
        },
      })

      summaries.push({
        id: conv.id,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        participantName: guardian ? `${guardian.firstName} ${guardian.lastName}` : 'Unknown',
        participantType: ConversationParticipantType.PARENT,
        lastMessage: conv.messages[0]?.content,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        isOfficial: conv.isOfficial,
      })
    }

    return summaries
  }

  // ============================================
  // MESSAGE SENDING
  // ============================================

  /**
   * Send a direct message
   * Requirement 36.2: Parent sends message, deliver to teacher inbox with notification
   * Requirement 36.3: Teacher responds, notify parent via in-app and optionally SMS/WhatsApp
   * Requirement 36.4: School Admin sends official message with branding
   */
  async sendMessage(input: SendDirectMessageInput): Promise<DirectMessage> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: input.conversationId },
    })

    if (!conversation) {
      throw new Error(`Conversation with id ${input.conversationId} not found`)
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        senderType: input.senderType,
        content: input.content,
        isOfficial: input.isOfficial ?? false,
        status: DirectMessageStatus.SENT,
      },
    })

    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: new Date() },
    })

    if (input.sendNotification !== false) {
      await this.sendMessageNotification(message.id, conversation, input.senderType)
    }

    return mapPrismaDirectMessageToDomain(message)
  }

  /**
   * Send notification for a new message
   */
  private async sendMessageNotification(
    messageId: string,
    conversation: { guardianId: string; staffId: string | null; studentId: string; schoolId: string },
    senderType: ConversationParticipantType
  ): Promise<MessageNotificationResult> {
    try {
      if (senderType === ConversationParticipantType.PARENT) {
        await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            notificationSent: true,
            notificationChannel: 'IN_APP',
          },
        })

        return { success: true, channel: 'IN_APP' }
      } else {
        const guardian = await prisma.guardian.findUnique({
          where: { id: conversation.guardianId },
          select: { preferredChannel: true, phone: true, email: true, whatsappNumber: true },
        })

        if (!guardian) {
          return { success: false, error: 'Guardian not found' }
        }

        const { communicationService } = await import('./communication.service')
        
        const result = await communicationService.sendMessage({
          studentId: conversation.studentId,
          templateType: 'GENERAL_ANNOUNCEMENT' as any,
          data: {
            content: 'You have a new message from your child\'s school. Please check your messages.',
          },
          priority: 'normal',
        })

        const channel = result.channel

        await prisma.directMessage.update({
          where: { id: messageId },
          data: {
            notificationSent: true,
            notificationChannel: channel,
          },
        })

        return { success: true, channel }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Parent sends message to teacher
   * Requirement 36.1, 36.2
   */
  async parentSendMessageToTeacher(
    guardianId: string,
    studentId: string,
    staffId: string,
    content: string
  ): Promise<DirectMessage> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, classId: true },
    })

    if (!student) {
      throw new Error(`Student with id ${studentId} not found`)
    }

    const guardianLink = await prisma.studentGuardian.findFirst({
      where: { studentId, guardianId },
    })

    if (!guardianLink) {
      throw new Error('Guardian is not linked to this student')
    }

    const conversation = await this.getOrCreateConversation({
      schoolId: student.schoolId,
      studentId,
      guardianId,
      staffId,
    })

    return this.sendMessage({
      conversationId: conversation.id,
      senderId: guardianId,
      senderType: ConversationParticipantType.PARENT,
      content,
      sendNotification: true,
    })
  }

  /**
   * Teacher responds to parent message
   * Requirement 36.3
   */
  async teacherRespondToParent(
    staffId: string,
    conversationId: string,
    content: string
  ): Promise<DirectMessage> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      throw new Error(`Conversation with id ${conversationId} not found`)
    }

    if (conversation.staffId !== staffId) {
      throw new Error('Staff is not part of this conversation')
    }

    return this.sendMessage({
      conversationId,
      senderId: staffId,
      senderType: ConversationParticipantType.TEACHER,
      content,
      sendNotification: true,
    })
  }

  /**
   * School Admin sends official message to parent
   * Requirement 36.4
   */
  async schoolAdminSendOfficialMessage(
    adminStaffId: string,
    guardianId: string,
    studentId: string,
    content: string,
    subject?: string
  ): Promise<DirectMessage> {
    const staff = await prisma.staff.findUnique({
      where: { id: adminStaffId },
      select: { schoolId: true, role: true },
    })

    if (!staff) {
      throw new Error(`Staff with id ${adminStaffId} not found`)
    }

    if (staff.role !== Role.SCHOOL_ADMIN) {
      throw new Error('Only School Admins can send official messages')
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    })

    if (!student || student.schoolId !== staff.schoolId) {
      throw new Error('Student does not belong to this school')
    }

    const guardianLink = await prisma.studentGuardian.findFirst({
      where: { studentId, guardianId },
    })

    if (!guardianLink) {
      throw new Error('Guardian is not linked to this student')
    }

    const conversation = await this.getOrCreateConversation({
      schoolId: staff.schoolId,
      studentId,
      guardianId,
      staffId: adminStaffId,
      isOfficial: true,
      subject,
    })

    return this.sendMessage({
      conversationId: conversation.id,
      senderId: adminStaffId,
      senderType: ConversationParticipantType.SCHOOL_ADMIN,
      content,
      isOfficial: true,
      sendNotification: true,
    })
  }

  // ============================================
  // MESSAGE STATUS MANAGEMENT
  // ============================================

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<DirectMessage> {
    const message = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        status: DirectMessageStatus.READ,
        readAt: new Date(),
      },
    })

    return mapPrismaDirectMessageToDomain(message)
  }

  /**
   * Mark all messages in conversation as read for a participant
   */
  async markConversationAsRead(
    conversationId: string,
    readerType: ConversationParticipantType
  ): Promise<number> {
    const senderTypesToMark = readerType === ConversationParticipantType.PARENT
      ? [ConversationParticipantType.TEACHER, ConversationParticipantType.SCHOOL_ADMIN]
      : [ConversationParticipantType.PARENT]

    const result = await prisma.directMessage.updateMany({
      where: {
        conversationId,
        senderType: { in: senderTypesToMark },
        status: { not: DirectMessageStatus.READ },
      },
      data: {
        status: DirectMessageStatus.READ,
        readAt: new Date(),
      },
    })

    return result.count
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadMessageCount(
    participantId: string,
    participantType: ConversationParticipantType
  ): Promise<number> {
    if (participantType === ConversationParticipantType.PARENT) {
      const conversations = await prisma.conversation.findMany({
        where: { guardianId: participantId },
        select: { id: true },
      })

      return prisma.directMessage.count({
        where: {
          conversationId: { in: conversations.map(c => c.id) },
          senderType: { not: ConversationParticipantType.PARENT },
          status: { not: DirectMessageStatus.READ },
        },
      })
    } else {
      const conversations = await prisma.conversation.findMany({
        where: { staffId: participantId },
        select: { id: true },
      })

      return prisma.directMessage.count({
        where: {
          conversationId: { in: conversations.map(c => c.id) },
          senderType: ConversationParticipantType.PARENT,
          status: { not: DirectMessageStatus.READ },
        },
      })
    }
  }

  // ============================================
  // TEACHER LOOKUP FOR MESSAGING
  // ============================================

  /**
   * Get teachers assigned to a student's class (for "Message Teacher" button)
   * Requirement 36.1
   */
  async getTeachersForStudent(studentId: string): Promise<{
    id: string
    firstName: string
    lastName: string
    subjects: string[]
  }[]> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    })

    if (!student) {
      return []
    }

    const staffClasses = await prisma.staffClass.findMany({
      where: { classId: student.classId },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            staffSubjects: {
              include: {
                subject: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    const teachers = staffClasses
      .filter(sc => sc.staff.role === Role.TEACHER)
      .map(sc => ({
        id: sc.staff.id,
        firstName: sc.staff.firstName,
        lastName: sc.staff.lastName,
        subjects: sc.staff.staffSubjects.map(ss => ss.subject.name),
      }))

    return teachers
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  /**
   * Determine if a guardian can message a staff member
   */
  canGuardianMessageStaff(
    guardianStudentIds: string[],
    staffClassIds: string[],
    studentClassId: string,
    studentId: string
  ): boolean {
    if (!guardianStudentIds.includes(studentId)) {
      return false
    }
    return staffClassIds.includes(studentClassId)
  }

  /**
   * Determine notification channel based on guardian preferences
   */
  determineNotificationChannel(
    preferredChannel: MessageChannel,
    hasPhone: boolean,
    hasEmail: boolean,
    hasWhatsApp: boolean
  ): MessageChannel | null {
    switch (preferredChannel) {
      case MessageChannel.SMS:
        if (hasPhone) return MessageChannel.SMS
        break
      case MessageChannel.WHATSAPP:
        if (hasWhatsApp) return MessageChannel.WHATSAPP
        break
      case MessageChannel.EMAIL:
        if (hasEmail) return MessageChannel.EMAIL
        break
    }

    if (hasPhone) return MessageChannel.SMS
    if (hasWhatsApp) return MessageChannel.WHATSAPP
    if (hasEmail) return MessageChannel.EMAIL

    return null
  }

  /**
   * Format message for official school communication
   */
  formatOfficialMessage(
    schoolName: string,
    content: string,
    senderName: string
  ): string {
    return `[Official Message from ${schoolName}]\n\n${content}\n\n- ${senderName}`
  }
}

// Export singleton instance
export const messagingService = new MessagingService()
