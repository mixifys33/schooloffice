/**
 * Communication Service
 * Handles SMS and Email messaging with limits and fallback
 * Requirements: 5.3-5.8, 19.1, 19.2, 19.3, 19.4, 19.5, 26.1, 26.2, 26.3, 26.4, 26.5
 * Requirements: 29.1, 29.2, 29.3, 29.4, 29.5 (Bulk Messaging)
 * 
 * FOCUS: SMS as primary, Email as fallback. No WhatsApp complexity.
 */
import { prisma } from '@/lib/db'
import {
  Message,
  SendMessageParams,
  MessageResult,
  MessageTemplate,
  BulkMessageJob,
  BulkMessageItem,
  BulkMessageProgress,
} from '@/types'
import { MessageChannel, MessageStatus, PilotType, MessageTemplateType, BulkMessageJobStatus } from '@/types/enums'
import {
  emailGateway,
  EmailSendResult,
  EmailAttachment,
  SchoolBranding,
  generateBrandedEmailTemplate,
  generatePlainTextEmail,
} from './email-gateway.service'
import { teacherCommunicationService, TeacherMessageType, RecipientType } from './teacher-communication.service'

// SMS limits per pilot type (Requirement 19.1)
const SMS_LIMITS: Record<PilotType, number> = {
  [PilotType.FREE]: 2,
  [PilotType.PAID]: 20,
}

// Retry configuration (Requirement 26.1, 26.5)
const MAX_SMS_RETRIES = 2
const RETRY_INTERVALS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000] // 5min, 15min, 30min

/**
 * Map Prisma Message to domain Message type
 */
function mapPrismaMessageToDomain(prismaMessage: {
  id: string
  schoolId: string
  studentId: string
  guardianId: string
  templateType: string
  channel: string
  content: string
  shortUrl: string | null
  status: string
  cost: number | null
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  retryCount: number
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}): Message {
  return {
    id: prismaMessage.id,
    schoolId: prismaMessage.schoolId,
    studentId: prismaMessage.studentId,
    guardianId: prismaMessage.guardianId,
    templateType: prismaMessage.templateType as MessageTemplateType,
    channel: prismaMessage.channel as MessageChannel,
    content: prismaMessage.content,
    shortUrl: prismaMessage.shortUrl ?? undefined,
    status: prismaMessage.status as MessageStatus,
    cost: prismaMessage.cost ?? undefined,
    sentAt: prismaMessage.sentAt ?? undefined,
    deliveredAt: prismaMessage.deliveredAt ?? undefined,
    readAt: prismaMessage.readAt ?? undefined,
    retryCount: prismaMessage.retryCount,
    errorMessage: prismaMessage.errorMessage ?? undefined,
    createdAt: prismaMessage.createdAt,
    updatedAt: prismaMessage.updatedAt,
  }
}

/**
 * Channel determination result
 */
export interface ChannelDetermination {
  channel: MessageChannel
  reason: string
  smsLimitReached: boolean
}

/**
 * Message send attempt result
 */
export interface SendAttemptResult {
  success: boolean
  channel: MessageChannel
  messageId?: string
  error?: string
  shouldRetry: boolean
  nextChannel?: MessageChannel
}

/**
 * Fallback chain result
 */
export interface FallbackChainResult {
  finalChannel: MessageChannel
  attempts: {
    channel: MessageChannel
    success: boolean
    error?: string
  }[]
  allFailed: boolean
}

/**
 * Retry state for tracking message delivery attempts
 */
export interface RetryState {
  messageId: string
  currentChannel: MessageChannel
  retryCount: number
  lastError?: string
  attempts: {
    channel: MessageChannel
    timestamp: Date
    success: boolean
    error?: string
  }[]
}


export class CommunicationService {
  /**
   * Check if school has exceeded quota limits
   * Requirements: 4.1, 4.2, 4.3, 4.7
   */
  async checkSchoolQuotas(
    schoolId: string,
    priority: 'normal' | 'critical' = 'normal',
    messagingConfig?: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get messaging config if not provided
    if (!messagingConfig) {
      messagingConfig = await prisma.schoolMessagingConfig.findUnique({
        where: { schoolId },
      })
    }

    // If no config exists, allow messages (no limits set)
    if (!messagingConfig) {
      return { allowed: true }
    }

    // Critical messages can bypass quotas if emergency override is enabled
    if (priority === 'critical' && messagingConfig.emergencyOverride) {
      return { allowed: true }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Check daily limits for each channel
    const dailyChecks = await Promise.all([
      this.checkChannelQuota(schoolId, MessageChannel.SMS, todayStart, messagingConfig.smsLimitDaily),
      this.checkChannelQuota(schoolId, MessageChannel.EMAIL, todayStart, messagingConfig.emailLimitDaily),
    ])

    // Check monthly limits for each channel
    const monthlyChecks = await Promise.all([
      this.checkChannelQuota(schoolId, MessageChannel.SMS, monthStart, messagingConfig.smsLimitMonthly),
      this.checkChannelQuota(schoolId, MessageChannel.EMAIL, monthStart, messagingConfig.emailLimitMonthly),
    ])

    // Find any exceeded limits
    const exceededDaily = dailyChecks.find(check => !check.allowed)
    const exceededMonthly = monthlyChecks.find(check => !check.allowed)

    if (exceededDaily) {
      return {
        allowed: false,
        reason: `Daily ${exceededDaily.channel} quota exceeded (${exceededDaily.sent}/${exceededDaily.limit})`,
      }
    }

    if (exceededMonthly) {
      return {
        allowed: false,
        reason: `Monthly ${exceededMonthly.channel} quota exceeded (${exceededMonthly.sent}/${exceededMonthly.limit})`,
      }
    }

    return { allowed: true }
  }

  /**
   * Check quota for a specific channel and time period
   */
  private async checkChannelQuota(
    schoolId: string,
    channel: MessageChannel,
    since: Date,
    limit: number | null
  ): Promise<{ allowed: boolean; channel: string; sent: number; limit: number | null }> {
    // If no limit is set, allow unlimited
    if (limit === null || limit === undefined) {
      return { allowed: true, channel, sent: 0, limit }
    }

    // Count messages sent in the period
    const sent = await prisma.communicationLog.count({
      where: {
        schoolId,
        channel,
        createdAt: { gte: since },
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
    })

    return {
      allowed: sent < limit,
      channel,
      sent,
      limit,
    }
  }

  // ============================================
  // SMS LIMIT MANAGEMENT
  // ============================================

  /**
   * Get SMS limit for a pilot type
   * Requirement 19.1: FREE = 2, PAID = 20 per term
   */
  getSmsLimit(pilotType: PilotType): number {
    return SMS_LIMITS[pilotType]
  }

  /**
   * Check if student has reached SMS limit
   * Requirement 19.2: Check sms_sent_count against sms_limit_per_term
   */
  async hasReachedSmsLimit(studentId: string): Promise<boolean> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { smsSentCount: true, smsLimitPerTerm: true },
    })

    if (!student) return true // Fail safe: don't send if student not found
    return student.smsSentCount >= student.smsLimitPerTerm
  }

  /**
   * Increment SMS sent count for a student
   */
  async incrementSmsSentCount(studentId: string): Promise<void> {
    await prisma.student.update({
      where: { id: studentId },
      data: { smsSentCount: { increment: 1 } },
    })
  }

  /**
   * Reset SMS sent count for all students (term end)
   * Requirement 19.5: Reset sms_sent_count to zero for all students
   */
  async resetTermSmsCounters(schoolId: string): Promise<number> {
    const result = await prisma.student.updateMany({
      where: { schoolId },
      data: { smsSentCount: 0 },
    })

    return result.count
  }

  // ============================================
  // CHANNEL DETERMINATION
  // ============================================

  /**
   * Determine which channel to use for a student
   * Requirement 19.2, 19.3: Check SMS limit, fallback to WhatsApp/Email
   */
  async determineChannel(
    studentId: string,
    preferredChannel?: MessageChannel
  ): Promise<ChannelDetermination> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        smsSentCount: true,
        smsLimitPerTerm: true,
        pilotType: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      return {
        channel: MessageChannel.EMAIL,
        reason: 'Student not found',
        smsLimitReached: false,
      }
    }

    const smsLimitReached = student.smsSentCount >= student.smsLimitPerTerm
    const guardian = student.studentGuardians[0]?.guardian

    // If SMS limit reached, fallback to Email
    if (smsLimitReached) {
      return {
        channel: MessageChannel.EMAIL,
        reason: 'SMS limit reached, using Email',
        smsLimitReached: true,
      }
    }

    // Use preferred channel or default to SMS
    if (preferredChannel) {
      return {
        channel: preferredChannel,
        reason: 'Using preferred channel',
        smsLimitReached: false,
      }
    }

    // Default to guardian's preferred channel or SMS
    const guardianPreferred = guardian?.preferredChannel
    return {
      channel: guardianPreferred || MessageChannel.SMS,
      reason: guardianPreferred ? 'Using guardian preferred channel' : 'Default to SMS',
      smsLimitReached: false,
    }
  }

  /**
   * Pure function for channel determination (for testing)
   */
  determineChannelPure(
    smsSentCount: number,
    smsLimit: number,
    hasWhatsApp: boolean,
    hasEmail: boolean
  ): { channel: MessageChannel; smsLimitReached: boolean } {
    const smsLimitReached = smsSentCount >= smsLimit

    if (smsLimitReached) {
      if (hasWhatsApp) {
        return { channel: MessageChannel.WHATSAPP, smsLimitReached: true }
      }
      if (hasEmail) {
        return { channel: MessageChannel.EMAIL, smsLimitReached: true }
      }
      // No fallback available, still return EMAIL as last resort
      return { channel: MessageChannel.EMAIL, smsLimitReached: true }
    }

    return { channel: MessageChannel.SMS, smsLimitReached: false }
  }

  // ============================================
  // WHATSAPP INTEGRATION
  // ============================================



  /**
   * Update WhatsApp message read status
   * Requirement 25.3: Track read receipts where available
   */
  async updateWhatsAppReadStatus(
    messageId: string,
    readAt: Date
  ): Promise<void> {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.READ,
        readAt,
      },
    })
  }

  /**
   * Get WhatsApp delivery report for a school
   * Requirement 25.3: Track read receipts where available
   */
  async getWhatsAppDeliveryReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number
    sent: number
    delivered: number
    read: number
    failed: number
    readRate: number
  }> {
    const messages = await prisma.message.findMany({
      where: {
        schoolId,
        channel: MessageChannel.WHATSAPP,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    let sent = 0
    let delivered = 0
    let read = 0
    let failed = 0

    for (const msg of messages) {
      switch (msg.status) {
        case MessageStatus.SENT:
          sent++
          break
        case MessageStatus.DELIVERED:
          delivered++
          break
        case MessageStatus.READ:
          read++
          break
        case MessageStatus.FAILED:
          failed++
          break
      }
    }

    const total = messages.length
    const readRate = total > 0 ? (read / total) * 100 : 0

    return {
      total,
      sent,
      delivered,
      read,
      failed,
      readRate,
    }
  }


  // ============================================
  // EMAIL INTEGRATION
  // ============================================

  /**
   * Send email to a guardian
   * Requirement 22.2: Send formatted emails with attachments
   */
  async sendEmail(
    recipient: string,
    subject: string,
    html: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailSendResult> {
    return emailGateway.sendEmail({
      to: recipient,
      subject,
      html,
      attachments,
    })
  }

  /**
   * Send branded email with school branding
   * Requirement 22.2: Include school branding
   */
  async sendBrandedEmail(
    recipient: string,
    subject: string,
    content: string,
    branding: SchoolBranding
  ): Promise<EmailSendResult> {
    return emailGateway.sendBrandedEmail(recipient, subject, content, branding)
  }

  /**
   * Send email with report card PDF attachment
   * Requirement 22.2: Include PDF attachments
   */
  async sendEmailWithReportCard(
    recipient: string,
    subject: string,
    content: string,
    pdfBuffer: Buffer,
    studentName: string,
    branding?: SchoolBranding
  ): Promise<EmailSendResult> {
    const filename = `Report_Card_${studentName.replace(/\s+/g, '_')}.pdf`
    return emailGateway.sendEmailWithPDF(
      recipient,
      subject,
      content,
      pdfBuffer,
      filename,
      branding
    )
  }

  /**
   * Send email notification to a student's guardian
   * Combines student lookup with email sending
   */
  async sendEmailToGuardian(
    studentId: string,
    subject: string,
    content: string,
    attachment?: Buffer
  ): Promise<MessageResult> {
    // Get student and guardian info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: 'Student not found',
      }
    }

    const guardian = student.studentGuardians[0]?.guardian
    if (!guardian) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: 'No primary guardian found',
      }
    }

    if (!guardian.email) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: 'No email address available for guardian',
      }
    }

    // Build school branding from school data
    const branding: SchoolBranding = {
      schoolName: student.school.name,
      schoolLogo: student.school.logo ?? undefined,
      address: student.school.address ?? undefined,
      phone: student.school.phone ?? undefined,
      email: student.school.email ?? undefined,
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        guardianId: guardian.id,
        templateType: MessageTemplateType.GENERAL_ANNOUNCEMENT,
        channel: MessageChannel.EMAIL,
        content,
        status: MessageStatus.QUEUED,
      },
    })

    // Send via email gateway
    let result: EmailSendResult

    if (attachment) {
      result = await emailGateway.sendEmailWithPDF(
        guardian.email,
        subject,
        content,
        attachment,
        'attachment.pdf',
        branding
      )
    } else {
      result = await emailGateway.sendBrandedEmail(
        guardian.email,
        subject,
        content,
        branding
      )
    }

    // Update message status based on result
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      },
    })

    return {
      messageId: message.id,
      channel: MessageChannel.EMAIL,
      status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
      error: result.error,
    }
  }

  /**
   * Get email delivery report for a school
   */
  async getEmailDeliveryReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }> {
    const messages = await prisma.message.findMany({
      where: {
        schoolId,
        channel: MessageChannel.EMAIL,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    let sent = 0
    let delivered = 0
    let failed = 0

    for (const msg of messages) {
      switch (msg.status) {
        case MessageStatus.SENT:
          sent++
          break
        case MessageStatus.DELIVERED:
        case MessageStatus.READ:
          delivered++
          break
        case MessageStatus.FAILED:
          failed++
          break
      }
    }

    const total = messages.length
    const deliveryRate = total > 0 ? ((sent + delivered) / total) * 100 : 0

    return {
      total,
      sent,
      delivered,
      failed,
      deliveryRate,
    }
  }

  /**
   * Get school branding for email templates
   */
  async getSchoolBranding(schoolId: string): Promise<SchoolBranding | null> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      return null
    }

    return {
      schoolName: school.name,
      schoolLogo: school.logo ?? undefined,
      address: school.address ?? undefined,
      phone: school.phone ?? undefined,
      email: school.email ?? undefined,
    }
  }

  // ============================================
  // MESSAGE SENDING WITH RETRY AND FALLBACK
  // ============================================

  /**
   * Execute fallback chain for message delivery
   * Requirement 26.1, 26.2, 26.3, 26.4: Retry SMS, then WhatsApp, then Email
   */
  executeFallbackChain(
    smsResult: { success: boolean; error?: string },
    whatsappResult: { success: boolean; error?: string },
    emailResult: { success: boolean; error?: string }
  ): FallbackChainResult {
    const attempts: { channel: MessageChannel; success: boolean; error?: string }[] = []

    // Try SMS first
    attempts.push({
      channel: MessageChannel.SMS,
      success: smsResult.success,
      error: smsResult.error,
    })

    if (smsResult.success) {
      return {
        finalChannel: MessageChannel.SMS,
        attempts,
        allFailed: false,
      }
    }

    // Fallback to WhatsApp
    attempts.push({
      channel: MessageChannel.WHATSAPP,
      success: whatsappResult.success,
      error: whatsappResult.error,
    })

    if (whatsappResult.success) {
      return {
        finalChannel: MessageChannel.WHATSAPP,
        attempts,
        allFailed: false,
      }
    }

    // Fallback to Email
    attempts.push({
      channel: MessageChannel.EMAIL,
      success: emailResult.success,
      error: emailResult.error,
    })

    if (emailResult.success) {
      return {
        finalChannel: MessageChannel.EMAIL,
        attempts,
        allFailed: false,
      }
    }

    // All channels failed
    return {
      finalChannel: MessageChannel.EMAIL,
      attempts,
      allFailed: true,
    }
  }

  /**
   * Determine if retry should be attempted
   * Requirement 26.1: Retry up to 2 times
   */
  shouldRetry(retryCount: number): boolean {
    return retryCount < MAX_SMS_RETRIES
  }

  /**
   * Get next retry interval
   * Requirement 26.5: Exponential backoff (5min, 15min, 30min)
   */
  getRetryInterval(retryCount: number): number {
    return RETRY_INTERVALS_MS[Math.min(retryCount, RETRY_INTERVALS_MS.length - 1)]
  }

  /**
   * Get next fallback channel
   * Updated to SMS -> Email (removed WhatsApp)
   */
  getNextFallbackChannel(currentChannel: MessageChannel): MessageChannel | null {
    switch (currentChannel) {
      case MessageChannel.SMS:
        return MessageChannel.EMAIL
      case MessageChannel.EMAIL:
        return null // No more fallbacks
      default:
        return null
    }
  }

  /**
   * Validate teacher message sending
   * Requirements 5.3-5.8: Validate teacher can send message to recipient
   * - Restrict recipients to assigned students/classes/parents
   * - Prevent bulk messages, fee messages, and announcements
   * 
   * @param senderId - The ID of the sender (teacher)
   * @param schoolId - The school ID for tenant isolation
   * @param recipientId - The recipient ID (student, class, or guardian)
   * @param recipientType - The type of recipient
   * @param messageType - The type of message being sent
   * @param channel - The communication channel
   * @returns Validation result with errors if any
   */
  async validateTeacherMessage(
    senderId: string,
    schoolId: string,
    recipientId: string,
    recipientType: RecipientType,
    messageType: TeacherMessageType,
    channel: keyof typeof MessageChannel
  ): Promise<{
    valid: boolean
    errors: string[]
  }> {
    // Check if sender is a teacher
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: senderId,
        schoolId,
      },
    })

    // If not a teacher, skip teacher-specific validation
    if (!teacher) {
      return { valid: true, errors: [] }
    }

    // Map MessageChannel to ChannelConfig key
    const channelKey = channel.toLowerCase() as 'sms' | 'whatsapp' | 'email' | 'inAppMessaging'
    const channelConfigKey = channelKey === 'sms' ? 'sms' 
      : channelKey === 'whatsapp' ? 'whatsapp'
      : channelKey === 'email' ? 'email'
      : 'inAppMessaging'

    // Use teacher communication service for comprehensive validation
    const validation = await teacherCommunicationService.validateMessageSend(
      senderId,
      schoolId,
      recipientId,
      recipientType,
      messageType,
      channelConfigKey
    )

    return {
      valid: validation.valid,
      errors: validation.errors,
    }
  }

  /**
   * Send message with tier-aware logic
   * Requirement 5.3-5.8: Validate teacher message restrictions
   * Requirement 19.2, 19.3, 19.4: Check limits, fallback on failure
   * Requirement 9.5: Include arrears in parent notifications
   * Requirements 2.7, 2.8: Check school pause status before sending
   */
  async sendMessage(params: SendMessageParams): Promise<MessageResult> {
    const { studentId, templateType, data, priority } = params

    // Get student and guardian info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: 'Student not found',
      }
    }

    // Check if school messaging is paused (Requirements 2.7, 2.8)
    const messagingConfig = await prisma.schoolMessagingConfig.findUnique({
      where: { schoolId: student.schoolId },
    })

    if (messagingConfig?.isPaused) {
      // Allow critical messages to bypass pause unless explicitly blocked
      if (priority !== 'critical' || !messagingConfig.emergencyOverride) {
        return {
          messageId: '',
          channel: MessageChannel.EMAIL,
          status: MessageStatus.FAILED,
          error: `School messaging is paused: ${messagingConfig.pauseReason || 'No reason provided'}`,
        }
      }
    }

    // Check quota limits before sending (Requirements 4.1, 4.2, 4.3, 4.7)
    const quotaCheck = await this.checkSchoolQuotas(student.schoolId, priority, messagingConfig)
    if (!quotaCheck.allowed) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: quotaCheck.reason,
      }
    }

    const guardian = student.studentGuardians[0]?.guardian
    if (!guardian) {
      return {
        messageId: '',
        channel: MessageChannel.EMAIL,
        status: MessageStatus.FAILED,
        error: 'No primary guardian found',
      }
    }

    // Determine channel
    const channelDetermination = await this.determineChannel(studentId)
    let channel = channelDetermination.channel

    // For critical messages, bypass SMS limit (Requirement 32.1)
    if (priority === 'critical' && channelDetermination.smsLimitReached) {
      channel = MessageChannel.SMS
    }

    // Get current term for arrears lookup
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: student.schoolId,
          isActive: true,
        },
      },
      orderBy: { startDate: 'desc' },
    })

    // Enrich data with arrears information (Requirement 9.5)
    let enrichedData = data
    if (currentTerm) {
      enrichedData = await this.enrichWithArrearsData(
        studentId,
        currentTerm.id,
        templateType,
        data
      )
    }

    // Get template content
    const content = await this.renderTemplate(templateType, enrichedData, student.schoolId)

    // Create message record
    const message = await prisma.message.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        guardianId: guardian.id,
        templateType,
        channel,
        content,
        status: MessageStatus.QUEUED,
      },
    })

    // If using SMS and not at limit, increment counter
    if (channel === MessageChannel.SMS && !channelDetermination.smsLimitReached) {
      await this.incrementSmsSentCount(studentId)
    }

    return {
      messageId: message.id,
      channel,
      status: MessageStatus.QUEUED,
    }
  }

  /**
   * Send message from a teacher with full validation
   * Requirements 5.3-5.8: Validate teacher message restrictions
   * - Restrict recipients to assigned students/classes/parents
   * - Prevent bulk messages, fee messages, and announcements
   * - Validate channel is enabled for teacher
   * 
   * @param teacherId - The teacher's ID
   * @param schoolId - The school ID for tenant isolation
   * @param recipientId - The recipient ID (student or guardian)
   * @param recipientType - The type of recipient ('student' or 'parent')
   * @param content - The message content
   * @param channel - The communication channel to use
   * @returns Message result with status
   */
  async sendTeacherMessage(
    teacherId: string,
    schoolId: string,
    recipientId: string,
    recipientType: 'student' | 'parent',
    content: string,
    channel: MessageChannel = MessageChannel.EMAIL
  ): Promise<MessageResult> {
    // Validate teacher can send this message
    const channelKey = channel === MessageChannel.SMS ? 'sms'
      : channel === MessageChannel.EMAIL ? 'email'
      : 'inAppMessaging'

    const validation = await teacherCommunicationService.validateMessageSend(
      teacherId,
      schoolId,
      recipientId,
      recipientType,
      'individual', // Teachers can only send individual messages
      channelKey
    )

    if (!validation.valid) {
      return {
        messageId: '',
        channel,
        status: MessageStatus.FAILED,
        error: `Teacher message validation failed: ${validation.errors.join('; ')}`,
      }
    }

    // Get recipient details based on type
    let studentId: string
    let guardianId: string

    if (recipientType === 'student') {
      // Get student and their primary guardian
      const student = await prisma.student.findFirst({
        where: {
          id: recipientId,
          schoolId,
        },
        include: {
          studentGuardians: {
            where: { isPrimary: true },
            include: { guardian: true },
          },
        },
      })

      if (!student) {
        return {
          messageId: '',
          channel,
          status: MessageStatus.FAILED,
          error: 'Student not found',
        }
      }

      const guardian = student.studentGuardians[0]?.guardian
      if (!guardian) {
        return {
          messageId: '',
          channel,
          status: MessageStatus.FAILED,
          error: 'No primary guardian found for student',
        }
      }

      studentId = student.id
      guardianId = guardian.id
    } else {
      // recipientType === 'parent'
      // Get guardian and find a linked student
      const guardian = await prisma.guardian.findFirst({
        where: {
          id: recipientId,
          schoolId,
        },
        include: {
          studentGuardians: {
            include: { student: true },
            take: 1,
          },
        },
      })

      if (!guardian) {
        return {
          messageId: '',
          channel,
          status: MessageStatus.FAILED,
          error: 'Guardian not found',
        }
      }

      const linkedStudent = guardian.studentGuardians[0]?.student
      if (!linkedStudent) {
        return {
          messageId: '',
          channel,
          status: MessageStatus.FAILED,
          error: 'No linked student found for guardian',
        }
      }

      studentId = linkedStudent.id
      guardianId = guardian.id
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        schoolId,
        studentId,
        guardianId,
        templateType: MessageTemplateType.GENERAL_ANNOUNCEMENT,
        channel,
        content,
        status: MessageStatus.QUEUED,
      },
    })

    // Message sent successfully - no performance tracking needed
    // Teachers just need to know message was sent

    return {
      messageId: message.id,
      channel,
      status: MessageStatus.QUEUED,
    }
  }

  /**
   * Render template with data
   */
  async renderTemplate(
    templateType: MessageTemplateType,
    data: Record<string, unknown>,
    schoolId: string
  ): Promise<string> {
    // Try to get custom template
    const template = await prisma.messageTemplate.findFirst({
      where: {
        schoolId,
        type: templateType,
        isActive: true,
      },
    })

    let content = template?.content || this.getDefaultTemplate(templateType)

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    return content
  }

  /**
   * Get default template for a message type
   */
  private getDefaultTemplate(templateType: MessageTemplateType): string {
    const templates: Record<MessageTemplateType, string> = {
      [MessageTemplateType.TERM_START]: 'Dear Parent, Term has started. {{studentName}} is enrolled in {{className}}.{{arrearsMessage}}',
      [MessageTemplateType.ATTENDANCE_ALERT]: '{{studentName}} absent {{date}}. Confirm safety.{{arrearsMessage}}',
      [MessageTemplateType.FEES_REMINDER]: '{{studentName}} owes UGX {{balance}}. Pay ASAP to avoid suspension.',
      [MessageTemplateType.MID_TERM_PROGRESS]: 'Dear Parent, {{studentName}} mid-term progress: Average {{average}}%.{{arrearsMessage}}',
      [MessageTemplateType.REPORT_READY]: 'Dear Parent, {{studentName}} report card is ready. View: {{link}}{{arrearsMessage}}',
      [MessageTemplateType.TERM_SUMMARY]: 'Dear Parent, {{studentName}} term summary: Position {{position}}, Average {{average}}%.{{arrearsMessage}}',
      [MessageTemplateType.DISCIPLINE_NOTICE]: 'Dear Parent, {{studentName}} discipline notice: {{description}}.{{arrearsMessage}}',
      [MessageTemplateType.GENERAL_ANNOUNCEMENT]: '{{content}}',
    }

    return templates[templateType] || '{{content}}'
  }

  /**
   * Format arrears message for inclusion in notifications
   * Requirement 9.5: Include arrears in parent notifications
   */
  formatArrearsForNotification(hasArrears: boolean, balance: number): string {
    if (!hasArrears || balance <= 0) {
      return ''
    }
    return ` Outstanding fees: UGX ${balance.toLocaleString()}.`
  }

  /**
   * Check if arrears should be included in notification
   * Pure function for testing
   */
  shouldIncludeArrears(
    templateType: MessageTemplateType,
    hasArrears: boolean,
    balance: number
  ): boolean {
    // Don't include arrears in fees reminder (already has balance info)
    // or general announcements
    const excludedTypes = [
      MessageTemplateType.FEES_REMINDER,
      MessageTemplateType.GENERAL_ANNOUNCEMENT,
    ]
    
    if (excludedTypes.includes(templateType)) {
      return false
    }
    
    return hasArrears && balance > 0
  }

  /**
   * Enrich message data with arrears information
   * Requirement 9.5: Include arrears in parent notifications
   */
  async enrichWithArrearsData(
    studentId: string,
    termId: string,
    templateType: MessageTemplateType,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Import finance service to get arrears data
    const { financeService } = await import('./finance.service')
    
    const arrearsData = await financeService.getArrearsForNotification(studentId, termId)
    
    const enrichedData = { ...data }
    
    if (this.shouldIncludeArrears(templateType, arrearsData.hasArrears, arrearsData.balance)) {
      enrichedData.arrearsMessage = this.formatArrearsForNotification(
        arrearsData.hasArrears,
        arrearsData.balance
      )
      enrichedData.hasArrears = arrearsData.hasArrears
      enrichedData.arrearsBalance = arrearsData.balance
      enrichedData.formattedArrearsBalance = arrearsData.formattedBalance
    } else {
      enrichedData.arrearsMessage = ''
    }
    
    return enrichedData
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    error?: string
  ): Promise<void> {
    const updateData: {
      status: MessageStatus
      errorMessage?: string
      sentAt?: Date
      deliveredAt?: Date
      readAt?: Date
    } = { status }

    if (error) {
      updateData.errorMessage = error
    }

    if (status === MessageStatus.SENT) {
      updateData.sentAt = new Date()
    } else if (status === MessageStatus.DELIVERED) {
      updateData.deliveredAt = new Date()
    } else if (status === MessageStatus.READ) {
      updateData.readAt = new Date()
    }

    await prisma.message.update({
      where: { id: messageId },
      data: updateData,
    })
  }

  /**
   * Get messages for a student
   */
  async getStudentMessages(studentId: string): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    })

    return messages.map(mapPrismaMessageToDomain)
  }

  // ============================================
  // RETRY AND FALLBACK EXECUTION
  // ============================================

  /**
   * Process message with retry and fallback logic
   * Requirement 26.1, 26.2, 26.3, 26.4, 26.5
   */
  async processMessageWithRetry(
    messageId: string,
    sendFn: (channel: MessageChannel) => Promise<{ success: boolean; error?: string }>
  ): Promise<{
    success: boolean
    finalChannel: MessageChannel
    attempts: { channel: MessageChannel; success: boolean; error?: string }[]
    flaggedForManualFollowup: boolean
  }> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return {
        success: false,
        finalChannel: MessageChannel.EMAIL,
        attempts: [],
        flaggedForManualFollowup: true,
      }
    }

    const attempts: { channel: MessageChannel; success: boolean; error?: string }[] = []
    let currentChannel = message.channel as MessageChannel
    let retryCount = message.retryCount

    // Try current channel with retries
    while (retryCount <= MAX_SMS_RETRIES) {
      const result = await sendFn(currentChannel)
      attempts.push({
        channel: currentChannel,
        success: result.success,
        error: result.error,
      })

      if (result.success) {
        await this.updateMessageStatus(messageId, MessageStatus.SENT)
        return {
          success: true,
          finalChannel: currentChannel,
          attempts,
          flaggedForManualFollowup: false,
        }
      }

      // Update retry count
      retryCount++
      await prisma.message.update({
        where: { id: messageId },
        data: { retryCount, errorMessage: result.error },
      })

      // If we've exhausted retries for this channel, try fallback
      if (retryCount > MAX_SMS_RETRIES) {
        const nextChannel = this.getNextFallbackChannel(currentChannel)
        if (nextChannel) {
          currentChannel = nextChannel
          retryCount = 0 // Reset retry count for new channel
          await prisma.message.update({
            where: { id: messageId },
            data: { channel: nextChannel, retryCount: 0 },
          })
        } else {
          // All channels exhausted
          break
        }
      }
    }

    // All channels failed - flag for manual follow-up
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.FAILED,
        errorMessage: 'All delivery channels failed - flagged for manual follow-up',
      },
    })

    return {
      success: false,
      finalChannel: currentChannel,
      attempts,
      flaggedForManualFollowup: true,
    }
  }

  /**
   * Execute retry with exponential backoff
   * Requirement 26.5: Exponential backoff (5min, 15min, 30min)
   */
  async executeRetryWithBackoff(
    messageId: string,
    retryCount: number,
    sendFn: () => Promise<{ success: boolean; error?: string }>
  ): Promise<{ success: boolean; error?: string; nextRetryAt?: Date }> {
    const result = await sendFn()

    if (result.success) {
      return { success: true }
    }

    if (this.shouldRetry(retryCount)) {
      const interval = this.getRetryInterval(retryCount)
      const nextRetryAt = new Date(Date.now() + interval)
      
      return {
        success: false,
        error: result.error,
        nextRetryAt,
      }
    }

    return {
      success: false,
      error: result.error,
    }
  }

  /**
   * Log delivery attempt for audit
   * Requirement 26.4: Log all attempts
   */
  async logDeliveryAttempt(
    messageId: string,
    channel: MessageChannel,
    success: boolean,
    error?: string
  ): Promise<void> {
    // This would typically write to an audit log table
    // For now, we update the message record
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (message) {
      const attemptLog = {
        channel,
        success,
        error,
        timestamp: new Date().toISOString(),
      }

      // Store attempt in error message field as JSON for now
      // In production, this would go to a separate audit table
      const existingLog = message.errorMessage 
        ? (message.errorMessage.startsWith('[') ? JSON.parse(message.errorMessage) : [])
        : []
      
      existingLog.push(attemptLog)

      await prisma.message.update({
        where: { id: messageId },
        data: {
          errorMessage: JSON.stringify(existingLog),
          retryCount: message.retryCount + 1,
        },
      })
    }
  }

  /**
   * Get messages that need retry
   */
  async getMessagesForRetry(schoolId: string): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: {
        schoolId,
        status: MessageStatus.FAILED,
        retryCount: { lt: MAX_SMS_RETRIES },
      },
      orderBy: { createdAt: 'asc' },
    })

    return messages.map(mapPrismaMessageToDomain)
  }

  /**
   * Flag student for manual follow-up
   * Requirement 26.4: Flag student for manual follow-up when all channels fail
   */
  async flagForManualFollowup(
    studentId: string,
    messageId: string,
    reason: string
  ): Promise<void> {
    // Update message with manual follow-up flag
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: MessageStatus.FAILED,
        errorMessage: `MANUAL_FOLLOWUP_REQUIRED: ${reason}`,
      },
    })

    // In a full implementation, this would also:
    // 1. Create a task/ticket for admin review
    // 2. Send notification to school admin
    // 3. Add to a follow-up queue
  }

  /**
   * Get students flagged for manual follow-up
   */
  async getStudentsFlaggedForFollowup(schoolId: string): Promise<{
    studentId: string
    messageId: string
    reason: string
    createdAt: Date
  }[]> {
    const messages = await prisma.message.findMany({
      where: {
        schoolId,
        errorMessage: { startsWith: 'MANUAL_FOLLOWUP_REQUIRED:' },
      },
      select: {
        id: true,
        studentId: true,
        errorMessage: true,
        createdAt: true,
      },
    })

    return messages.map(m => ({
      studentId: m.studentId,
      messageId: m.id,
      reason: m.errorMessage?.replace('MANUAL_FOLLOWUP_REQUIRED: ', '') || 'Unknown',
      createdAt: m.createdAt,
    }))
  }

  /**
   * Get delivery report for a school
   */
  async getDeliveryReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number
    sent: number
    delivered: number
    failed: number
    read: number
    byChannel: Record<MessageChannel, number>
  }> {
    const messages = await prisma.message.findMany({
      where: {
        schoolId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const byChannel: Record<MessageChannel, number> = {
      [MessageChannel.SMS]: 0,
      [MessageChannel.WHATSAPP]: 0,
      [MessageChannel.EMAIL]: 0,
    }

    let sent = 0
    let delivered = 0
    let failed = 0
    let read = 0

    for (const msg of messages) {
      byChannel[msg.channel as MessageChannel]++

      switch (msg.status) {
        case MessageStatus.SENT:
          sent++
          break
        case MessageStatus.DELIVERED:
          delivered++
          break
        case MessageStatus.FAILED:
          failed++
          break
        case MessageStatus.READ:
          read++
          break
      }
    }

    return {
      total: messages.length,
      sent,
      delivered,
      failed,
      read,
      byChannel,
    }
  }

  // ============================================
  // BULK MESSAGING QUEUE
  // Requirements: 29.1, 29.2, 29.3, 29.4, 29.5
  // ============================================

  /**
   * Batch size for processing bulk messages
   * Requirement 29.2: Process in batches of 100
   */
  private readonly BATCH_SIZE = 100

  /**
   * Rate limit delay between batches (ms)
   * Requirement 29.2: Rate limiting to respect API limits
   */
  private readonly BATCH_DELAY_MS = 1000

  /**
   * Maximum batch failures before alerting
   * Requirement 29.4: Alert administrators after 3 failures
   */
  private readonly MAX_BATCH_FAILURES = 3

  /**
   * Queue bulk messages for asynchronous processing
   * Requirement 29.1: Queue messages for asynchronous processing
   * @param schoolId - The school ID for the bulk job
   * @param messages - Array of message parameters to queue
   * @returns Job ID for tracking progress
   */
  async queueBulkMessages(
    schoolId: string,
    messages: SendMessageParams[]
  ): Promise<string> {
    // Create the bulk message job
    const job = await prisma.bulkMessageJob.create({
      data: {
        schoolId,
        totalMessages: messages.length,
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        status: BulkMessageJobStatus.PENDING,
        estimatedCompletion: this.calculateEstimatedCompletion(messages.length),
      },
    })

    // Create individual message items
    const itemsData = messages.map((msg) => ({
      jobId: job.id,
      studentId: msg.studentId,
      templateType: msg.templateType,
      data: msg.data as Record<string, unknown>,
      priority: msg.priority,
      status: MessageStatus.QUEUED,
    }))

    // Insert items in batches to avoid memory issues
    for (let i = 0; i < itemsData.length; i += this.BATCH_SIZE) {
      const batch = itemsData.slice(i, i + this.BATCH_SIZE)
      await prisma.bulkMessageItem.createMany({
        data: batch,
      })
    }

    return job.id
  }

  /**
   * Calculate estimated completion time based on message count
   * Requirement 29.5: Display estimated completion time
   */
  calculateEstimatedCompletion(messageCount: number): Date {
    // Estimate: 100 messages per second with batch delays
    const batchCount = Math.ceil(messageCount / this.BATCH_SIZE)
    const processingTimeMs = (messageCount * 100) + (batchCount * this.BATCH_DELAY_MS)
    return new Date(Date.now() + processingTimeMs)
  }

  /**
   * Get bulk message job status
   * Requirement 29.3: Track progress and status
   */
  async getBulkMessageStatus(jobId: string): Promise<BulkMessageProgress | null> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return null
    }

    const pendingCount = job.totalMessages - job.processedCount
    const progressPercentage = job.totalMessages > 0
      ? Math.round((job.processedCount / job.totalMessages) * 100)
      : 0

    return {
      jobId: job.id,
      totalMessages: job.totalMessages,
      processedCount: job.processedCount,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      pendingCount,
      status: job.status as BulkMessageJobStatus,
      estimatedCompletion: job.estimatedCompletion ?? undefined,
      progressPercentage,
    }
  }

  /**
   * Process a bulk message job
   * Requirement 29.2: Process in batches of 100 with rate limiting
   * Requirement 29.3: Log progress and update status in real-time
   * Requirement 29.4: Retry failed batches and alert after 3 failures
   */
  async processBulkMessageJob(jobId: string): Promise<{
    success: boolean
    processedCount: number
    sentCount: number
    failedCount: number
    error?: string
  }> {
    // Get the job
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return {
        success: false,
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        error: 'Job not found',
      }
    }

    // Update job status to processing
    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: BulkMessageJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    })

    let processedCount = 0
    let sentCount = 0
    let failedCount = 0
    let consecutiveFailures = 0

    try {
      // Process items in batches
      let hasMoreItems = true
      
      while (hasMoreItems) {
        // Get next batch of pending items
        const items = await prisma.bulkMessageItem.findMany({
          where: {
            jobId,
            status: MessageStatus.QUEUED,
          },
          take: this.BATCH_SIZE,
          orderBy: { createdAt: 'asc' },
        })

        if (items.length === 0) {
          hasMoreItems = false
          break
        }

        // Process batch
        const batchResult = await this.processBatch(items)
        
        processedCount += batchResult.processedCount
        sentCount += batchResult.sentCount
        failedCount += batchResult.failedCount

        // Update job progress in real-time (Requirement 29.3)
        await prisma.bulkMessageJob.update({
          where: { id: jobId },
          data: {
            processedCount,
            sentCount,
            failedCount,
            estimatedCompletion: this.calculateEstimatedCompletion(
              job.totalMessages - processedCount
            ),
          },
        })

        // Track consecutive failures for alerting (Requirement 29.4)
        if (batchResult.failedCount === batchResult.processedCount) {
          consecutiveFailures++
          if (consecutiveFailures >= this.MAX_BATCH_FAILURES) {
            // Alert administrators
            await this.alertBulkJobFailure(jobId, 'Multiple consecutive batch failures')
          }
        } else {
          consecutiveFailures = 0
        }

        // Rate limiting delay between batches (Requirement 29.2)
        if (items.length === this.BATCH_SIZE) {
          await this.delay(this.BATCH_DELAY_MS)
        }
      }

      // Mark job as completed
      await prisma.bulkMessageJob.update({
        where: { id: jobId },
        data: {
          status: BulkMessageJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      })

      return {
        success: true,
        processedCount,
        sentCount,
        failedCount,
      }
    } catch (error) {
      // Mark job as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await prisma.bulkMessageJob.update({
        where: { id: jobId },
        data: {
          status: BulkMessageJobStatus.FAILED,
          errorMessage,
          completedAt: new Date(),
        },
      })

      // Alert administrators (Requirement 29.4)
      await this.alertBulkJobFailure(jobId, errorMessage)

      return {
        success: false,
        processedCount,
        sentCount,
        failedCount,
        error: errorMessage,
      }
    }
  }

  /**
   * Process a batch of message items
   * Requirement 29.2: Process in batches
   */
  private async processBatch(
    items: {
      id: string
      studentId: string
      templateType: string
      data: unknown
      priority: string
    }[]
  ): Promise<{
    processedCount: number
    sentCount: number
    failedCount: number
  }> {
    let sentCount = 0
    let failedCount = 0

    for (const item of items) {
      try {
        // Send the message
        const result = await this.sendMessage({
          studentId: item.studentId,
          templateType: item.templateType as MessageTemplateType,
          data: item.data as Record<string, unknown>,
          priority: item.priority as 'normal' | 'critical',
        })

        // Update item status
        if (result.status === MessageStatus.QUEUED || result.status === MessageStatus.SENT) {
          sentCount++
          await prisma.bulkMessageItem.update({
            where: { id: item.id },
            data: {
              status: MessageStatus.SENT,
              messageId: result.messageId,
              processedAt: new Date(),
            },
          })
        } else {
          failedCount++
          await prisma.bulkMessageItem.update({
            where: { id: item.id },
            data: {
              status: MessageStatus.FAILED,
              errorMessage: result.error,
              processedAt: new Date(),
            },
          })
        }
      } catch (error) {
        failedCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        await prisma.bulkMessageItem.update({
          where: { id: item.id },
          data: {
            status: MessageStatus.FAILED,
            errorMessage,
            processedAt: new Date(),
          },
        })
      }
    }

    return {
      processedCount: items.length,
      sentCount,
      failedCount,
    }
  }

  /**
   * Retry a failed batch
   * Requirement 29.4: Retry failed batches
   */
  async retryFailedBatch(jobId: string): Promise<{
    retriedCount: number
    sentCount: number
    failedCount: number
  }> {
    // Get failed items for this job
    const failedItems = await prisma.bulkMessageItem.findMany({
      where: {
        jobId,
        status: MessageStatus.FAILED,
      },
      take: this.BATCH_SIZE,
    })

    if (failedItems.length === 0) {
      return {
        retriedCount: 0,
        sentCount: 0,
        failedCount: 0,
      }
    }

    // Reset status to queued for retry
    await prisma.bulkMessageItem.updateMany({
      where: {
        id: { in: failedItems.map(i => i.id) },
      },
      data: {
        status: MessageStatus.QUEUED,
        errorMessage: null,
        processedAt: null,
      },
    })

    // Process the batch
    const result = await this.processBatch(failedItems)

    // Update job counts
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    })

    if (job) {
      await prisma.bulkMessageJob.update({
        where: { id: jobId },
        data: {
          sentCount: job.sentCount + result.sentCount,
          failedCount: job.failedCount - result.sentCount, // Reduce failed count by successful retries
        },
      })
    }

    return {
      retriedCount: failedItems.length,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    }
  }

  /**
   * Alert administrators about bulk job failure
   * Requirement 29.4: Alert administrators after 3 failures
   */
  private async alertBulkJobFailure(jobId: string, reason: string): Promise<void> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
      include: {
        items: {
          where: { status: MessageStatus.FAILED },
          take: 5, // Include sample of failed items
        },
      },
    })

    if (!job) return

    // In a full implementation, this would:
    // 1. Send notification to school admin
    // 2. Create an alert/ticket in the system
    // 3. Log to monitoring system
    
    console.error(`[BULK_MESSAGE_ALERT] Job ${jobId} failed: ${reason}`, {
      schoolId: job.schoolId,
      totalMessages: job.totalMessages,
      processedCount: job.processedCount,
      failedCount: job.failedCount,
      sampleFailures: job.items.map(i => ({
        studentId: i.studentId,
        error: i.errorMessage,
      })),
    })
  }

  /**
   * Cancel a bulk message job
   */
  async cancelBulkMessageJob(jobId: string): Promise<boolean> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    })

    if (!job || job.status === BulkMessageJobStatus.COMPLETED) {
      return false
    }

    // Update job status
    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: BulkMessageJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    })

    // Cancel pending items
    await prisma.bulkMessageItem.updateMany({
      where: {
        jobId,
        status: MessageStatus.QUEUED,
      },
      data: {
        status: MessageStatus.FAILED,
        errorMessage: 'Job cancelled',
      },
    })

    return true
  }

  /**
   * Get all bulk message jobs for a school
   */
  async getBulkMessageJobs(
    schoolId: string,
    options?: {
      status?: BulkMessageJobStatus
      limit?: number
      offset?: number
    }
  ): Promise<BulkMessageJob[]> {
    const jobs = await prisma.bulkMessageJob.findMany({
      where: {
        schoolId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    })

    return jobs.map(job => ({
      id: job.id,
      schoolId: job.schoolId,
      totalMessages: job.totalMessages,
      processedCount: job.processedCount,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      status: job.status as BulkMessageJobStatus,
      errorMessage: job.errorMessage ?? undefined,
      estimatedCompletion: job.estimatedCompletion ?? undefined,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }))
  }

  /**
   * Get failed items for a bulk message job
   */
  async getFailedBulkMessageItems(
    jobId: string,
    limit: number = 100
  ): Promise<BulkMessageItem[]> {
    const items = await prisma.bulkMessageItem.findMany({
      where: {
        jobId,
        status: MessageStatus.FAILED,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })

    return items.map(item => ({
      id: item.id,
      jobId: item.jobId,
      studentId: item.studentId,
      templateType: item.templateType as MessageTemplateType,
      data: item.data as Record<string, unknown>,
      priority: item.priority as 'normal' | 'critical',
      status: item.status as MessageStatus,
      messageId: item.messageId ?? undefined,
      errorMessage: item.errorMessage ?? undefined,
      processedAt: item.processedAt ?? undefined,
      createdAt: item.createdAt,
    }))
  }

  /**
   * Utility function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const communicationService = new CommunicationService()
