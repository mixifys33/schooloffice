/**
 * Teacher Communication Service
 * Handles communication channel configuration and message validation for teachers.
 * Requirements: 5.1-5.8
 * 
 * Core principle: Teachers have restricted communication capabilities.
 * - SMS and WhatsApp are disabled by default
 * - Teachers can only message recipients within their academic assignment scope
 * - Bulk messages, fee messages, and announcements are restricted
 */
import { prisma } from '@/lib/db'
import {
  ChannelConfig,
  DEFAULT_CHANNEL_CONFIG,
  MESSAGE_TYPE_RESTRICTIONS,
  TeacherEmploymentStatus,
  INACTIVE_STATUSES,
} from '@/types/teacher'
import { auditService, AuditAction, AuditResource } from './audit.service'

/**
 * Validation error for communication operations
 */
export class CommunicationValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message)
    this.name = 'CommunicationValidationError'
  }
}

/**
 * Message types that teachers can send
 */
export type TeacherMessageType = 'individual' | 'bulk' | 'fee' | 'announcement'

/**
 * Recipient types for teacher messaging
 */
export type RecipientType = 'student' | 'class' | 'parent'

/**
 * Result of channel configuration update
 */
export interface ChannelConfigResult {
  success: boolean
  teacherId: string
  channelConfig: ChannelConfig
  message: string
}

/**
 * Result of recipient validation
 */
export interface RecipientValidationResult {
  valid: boolean
  reason: string
  recipientId: string
  recipientType: RecipientType
}


/**
 * Result of message type validation
 */
export interface MessageTypeValidationResult {
  allowed: boolean
  reason: string
  messageType: TeacherMessageType
  requiresApproval?: boolean
}

/**
 * Result of channel validation
 */
export interface ChannelValidationResult {
  enabled: boolean
  reason: string
  channel: keyof ChannelConfig
}

export class TeacherCommunicationService {
  /**
   * Configure communication channels for a teacher
   * Requirements 5.1, 5.2: Channel configuration with SMS/WhatsApp disabled by default
   * 
   * @param teacherId - The teacher's ID
   * @param schoolId - The school's ID for tenant isolation
   * @param channels - The channel configuration to apply
   * @param configuredBy - The user making the change
   */
  async configureChannels(
    teacherId: string,
    schoolId: string,
    channels: Partial<ChannelConfig>,
    configuredBy: string
  ): Promise<ChannelConfigResult> {
    // Verify teacher exists and belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        id: true,
        employmentStatus: true,
        hasSystemAccess: true,
        inAppMessagingEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      },
    })

    if (!teacher) {
      throw new CommunicationValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check if teacher is active
    if (INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)) {
      throw new CommunicationValidationError(
        'Cannot configure channels for inactive teacher',
        'employmentStatus',
        'TEACHER_INACTIVE'
      )
    }

    // Build previous config for audit
    const previousConfig: ChannelConfig = {
      inAppMessaging: teacher.inAppMessagingEnabled,
      sms: teacher.smsEnabled,
      whatsapp: teacher.whatsappEnabled,
      email: teacher.emailEnabled,
    }

    // Merge with existing config (only update provided fields)
    const newConfig: ChannelConfig = {
      inAppMessaging: channels.inAppMessaging ?? previousConfig.inAppMessaging,
      sms: channels.sms ?? previousConfig.sms,
      whatsapp: channels.whatsapp ?? previousConfig.whatsapp,
      email: channels.email ?? previousConfig.email,
    }

    // Update teacher channel configuration
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        inAppMessagingEnabled: newConfig.inAppMessaging,
        smsEnabled: newConfig.sms,
        whatsappEnabled: newConfig.whatsapp,
        emailEnabled: newConfig.email,
      },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: configuredBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { channelConfig: previousConfig },
      newValue: { channelConfig: newConfig },
    })

    return {
      success: true,
      teacherId,
      channelConfig: newConfig,
      message: 'Channel configuration updated successfully',
    }
  }

  /**
   * Get default channel configuration for new teachers
   * Requirement 5.2: SMS and WhatsApp disabled by default
   */
  getDefaultChannelConfig(): ChannelConfig {
    return { ...DEFAULT_CHANNEL_CONFIG }
  }

  /**
   * Get current channel configuration for a teacher
   */
  async getChannelConfig(
    teacherId: string,
    schoolId: string
  ): Promise<ChannelConfig | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        inAppMessagingEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        emailEnabled: true,
      },
    })

    if (!teacher) {
      return null
    }

    return {
      inAppMessaging: teacher.inAppMessagingEnabled,
      sms: teacher.smsEnabled,
      whatsapp: teacher.whatsappEnabled,
      email: teacher.emailEnabled,
    }
  }


  /**
   * Validate if a recipient is within the teacher's assignment scope
   * Requirements 5.3, 5.4, 5.5: Restrict recipients to assigned students/classes/parents
   * 
   * @param teacherId - The teacher's ID
   * @param schoolId - The school's ID for tenant isolation
   * @param recipientId - The recipient's ID (student, class, or parent/guardian)
   * @param recipientType - The type of recipient
   */
  async validateRecipient(
    teacherId: string,
    schoolId: string,
    recipientId: string,
    recipientType: RecipientType
  ): Promise<RecipientValidationResult> {
    // Get teacher with assignments
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        id: true,
        employmentStatus: true,
        hasSystemAccess: true,
        canSendMessages: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher) {
      return {
        valid: false,
        reason: 'Teacher not found',
        recipientId,
        recipientType,
      }
    }

    // Check if teacher is active
    if (INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return {
        valid: false,
        reason: 'Teacher is inactive and cannot send messages',
        recipientId,
        recipientType,
      }
    }

    // Check if teacher has system access
    if (!teacher.hasSystemAccess) {
      return {
        valid: false,
        reason: 'Teacher does not have system access',
        recipientId,
        recipientType,
      }
    }

    // Check if teacher has messaging permission
    if (!teacher.canSendMessages) {
      return {
        valid: false,
        reason: 'Teacher does not have messaging permission',
        recipientId,
        recipientType,
      }
    }

    // Validate based on recipient type
    switch (recipientType) {
      case 'student':
        return this.validateStudentRecipient(teacher, recipientId, schoolId)
      case 'class':
        return this.validateClassRecipient(teacher, recipientId)
      case 'parent':
        return this.validateParentRecipient(teacher, recipientId, schoolId)
      default:
        return {
          valid: false,
          reason: `Unknown recipient type: ${recipientType}`,
          recipientId,
          recipientType,
        }
    }
  }

  /**
   * Validate student recipient - must be in teacher's assigned classes
   * Requirement 5.3: Restrict recipients to assigned students only
   */
  private async validateStudentRecipient(
    teacher: { assignedClassIds: string[] },
    studentId: string,
    schoolId: string
  ): Promise<RecipientValidationResult> {
    // If teacher has no class assignments, they can't message any students
    if (teacher.assignedClassIds.length === 0) {
      return {
        valid: false,
        reason: 'Teacher has no class assignments',
        recipientId: studentId,
        recipientType: 'student',
      }
    }

    // Get student's class
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: {
        id: true,
        classId: true,
      },
    })

    if (!student) {
      return {
        valid: false,
        reason: 'Student not found',
        recipientId: studentId,
        recipientType: 'student',
      }
    }

    // Check if student's class is in teacher's assigned classes
    if (!student.classId || !teacher.assignedClassIds.includes(student.classId)) {
      return {
        valid: false,
        reason: 'Student is not in any of teacher\'s assigned classes',
        recipientId: studentId,
        recipientType: 'student',
      }
    }

    return {
      valid: true,
      reason: 'Student is in teacher\'s assigned class',
      recipientId: studentId,
      recipientType: 'student',
    }
  }

  /**
   * Validate class recipient - must be in teacher's assigned classes
   * Requirement 5.4: Restrict recipients to assigned classes only
   */
  private validateClassRecipient(
    teacher: { assignedClassIds: string[] },
    classId: string
  ): RecipientValidationResult {
    // If teacher has no class assignments, they can't message any classes
    if (teacher.assignedClassIds.length === 0) {
      return {
        valid: false,
        reason: 'Teacher has no class assignments',
        recipientId: classId,
        recipientType: 'class',
      }
    }

    // Check if class is in teacher's assigned classes
    if (!teacher.assignedClassIds.includes(classId)) {
      return {
        valid: false,
        reason: 'Class is not in teacher\'s assigned classes',
        recipientId: classId,
        recipientType: 'class',
      }
    }

    return {
      valid: true,
      reason: 'Class is in teacher\'s assigned classes',
      recipientId: classId,
      recipientType: 'class',
    }
  }


  /**
   * Validate parent recipient - parent's student must be in teacher's assigned classes
   * Requirement 5.5: Restrict recipients to parents of assigned students only
   */
  private async validateParentRecipient(
    teacher: { assignedClassIds: string[] },
    guardianId: string,
    schoolId: string
  ): Promise<RecipientValidationResult> {
    // If teacher has no class assignments, they can't message any parents
    if (teacher.assignedClassIds.length === 0) {
      return {
        valid: false,
        reason: 'Teacher has no class assignments',
        recipientId: guardianId,
        recipientType: 'parent',
      }
    }

    // Get guardian's students
    const guardian = await prisma.guardian.findFirst({
      where: {
        id: guardianId,
        schoolId,
      },
      select: {
        id: true,
        studentGuardians: {
          select: {
            student: {
              select: {
                id: true,
                classId: true,
              },
            },
          },
        },
      },
    })

    if (!guardian) {
      return {
        valid: false,
        reason: 'Guardian not found',
        recipientId: guardianId,
        recipientType: 'parent',
      }
    }

    // Check if any of the guardian's students are in teacher's assigned classes
    const hasAssignedStudent = guardian.studentGuardians.some(
      (sg) => sg.student.classId && teacher.assignedClassIds.includes(sg.student.classId)
    )

    if (!hasAssignedStudent) {
      return {
        valid: false,
        reason: 'Guardian has no students in teacher\'s assigned classes',
        recipientId: guardianId,
        recipientType: 'parent',
      }
    }

    return {
      valid: true,
      reason: 'Guardian has student(s) in teacher\'s assigned class',
      recipientId: guardianId,
      recipientType: 'parent',
    }
  }

  /**
   * Validate if a message type is allowed for teachers
   * Requirements 5.6, 5.7, 5.8: Restrict bulk, fee, and announcement messages
   * 
   * @param messageType - The type of message being sent
   * @param hasAnnouncementApproval - Whether the teacher has explicit approval for announcements
   */
  validateMessageType(
    messageType: TeacherMessageType,
    hasAnnouncementApproval: boolean = false
  ): MessageTypeValidationResult {
    const restriction = MESSAGE_TYPE_RESTRICTIONS[messageType]

    if (!restriction) {
      return {
        allowed: false,
        reason: `Unknown message type: ${messageType}`,
        messageType,
      }
    }

    // Check if message type is allowed
    if (!restriction.allowed) {
      // Special case for announcements - can be allowed with explicit approval
      if (messageType === 'announcement' && 'requiresExplicitApproval' in restriction) {
        if (hasAnnouncementApproval) {
          return {
            allowed: true,
            reason: 'Announcement allowed with explicit approval',
            messageType,
            requiresApproval: true,
          }
        }
        return {
          allowed: false,
          reason: 'Teachers cannot send announcements without explicit approval',
          messageType,
          requiresApproval: true,
        }
      }

      // Bulk messages - Requirement 5.6
      if (messageType === 'bulk') {
        return {
          allowed: false,
          reason: 'Teachers cannot send bulk messages',
          messageType,
        }
      }

      // Fee messages - Requirement 5.7
      if (messageType === 'fee') {
        return {
          allowed: false,
          reason: 'Teachers cannot send fee-related messages',
          messageType,
        }
      }

      return {
        allowed: false,
        reason: `Message type '${messageType}' is not allowed for teachers`,
        messageType,
      }
    }

    return {
      allowed: true,
      reason: 'Message type is allowed',
      messageType,
    }
  }

  /**
   * Validate if a communication channel is enabled for a teacher
   * 
   * @param teacherId - The teacher's ID
   * @param schoolId - The school's ID for tenant isolation
   * @param channel - The channel to validate
   */
  async validateChannel(
    teacherId: string,
    schoolId: string,
    channel: keyof ChannelConfig
  ): Promise<ChannelValidationResult> {
    const channelConfig = await this.getChannelConfig(teacherId, schoolId)

    if (!channelConfig) {
      return {
        enabled: false,
        reason: 'Teacher not found',
        channel,
      }
    }

    const isEnabled = channelConfig[channel]

    if (!isEnabled) {
      return {
        enabled: false,
        reason: `${channel} channel is disabled for this teacher`,
        channel,
      }
    }

    return {
      enabled: true,
      reason: `${channel} channel is enabled`,
      channel,
    }
  }


  /**
   * Comprehensive validation for sending a message
   * Combines recipient, message type, and channel validation
   */
  async validateMessageSend(
    teacherId: string,
    schoolId: string,
    recipientId: string,
    recipientType: RecipientType,
    messageType: TeacherMessageType,
    channel: keyof ChannelConfig,
    hasAnnouncementApproval: boolean = false
  ): Promise<{
    valid: boolean
    errors: string[]
    recipientValidation: RecipientValidationResult
    messageTypeValidation: MessageTypeValidationResult
    channelValidation: ChannelValidationResult
  }> {
    const errors: string[] = []

    // Validate recipient
    const recipientValidation = await this.validateRecipient(
      teacherId,
      schoolId,
      recipientId,
      recipientType
    )
    if (!recipientValidation.valid) {
      errors.push(recipientValidation.reason)
    }

    // Validate message type
    const messageTypeValidation = this.validateMessageType(messageType, hasAnnouncementApproval)
    if (!messageTypeValidation.allowed) {
      errors.push(messageTypeValidation.reason)
    }

    // Validate channel
    const channelValidation = await this.validateChannel(teacherId, schoolId, channel)
    if (!channelValidation.enabled) {
      errors.push(channelValidation.reason)
    }

    return {
      valid: errors.length === 0,
      errors,
      recipientValidation,
      messageTypeValidation,
      channelValidation,
    }
  }

  /**
   * Get all students that a teacher can message
   * Based on their class assignments
   */
  async getMessageableStudents(
    teacherId: string,
    schoolId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; classId: string }>> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        assignedClassIds: true,
        hasSystemAccess: true,
        canSendMessages: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      return []
    }

    // Check if teacher can send messages
    if (
      !teacher.hasSystemAccess ||
      !teacher.canSendMessages ||
      INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)
    ) {
      return []
    }

    if (teacher.assignedClassIds.length === 0) {
      return []
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId: { in: teacher.assignedClassIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classId: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      classId: s.classId || '',
    }))
  }

  /**
   * Get all guardians that a teacher can message
   * Based on their class assignments (parents of students in assigned classes)
   */
  async getMessageableGuardians(
    teacherId: string,
    schoolId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; studentIds: string[] }>> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        assignedClassIds: true,
        hasSystemAccess: true,
        canSendMessages: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      return []
    }

    // Check if teacher can send messages
    if (
      !teacher.hasSystemAccess ||
      !teacher.canSendMessages ||
      INACTIVE_STATUSES.includes(teacher.employmentStatus as TeacherEmploymentStatus)
    ) {
      return []
    }

    if (teacher.assignedClassIds.length === 0) {
      return []
    }

    // Get students in assigned classes
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId: { in: teacher.assignedClassIds },
      },
      select: {
        id: true,
        studentGuardians: {
          select: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    // Build guardian map with their student IDs
    const guardianMap = new Map<
      string,
      { id: string; firstName: string; lastName: string; studentIds: string[] }
    >()

    for (const student of students) {
      for (const sg of student.studentGuardians) {
        const guardian = sg.guardian
        if (guardianMap.has(guardian.id)) {
          guardianMap.get(guardian.id)!.studentIds.push(student.id)
        } else {
          guardianMap.set(guardian.id, {
            id: guardian.id,
            firstName: guardian.firstName,
            lastName: guardian.lastName,
            studentIds: [student.id],
          })
        }
      }
    }

    return Array.from(guardianMap.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    )
  }


  /**
   * Enable SMS channel for a teacher (admin action)
   * Requirement 5.1: Allow configuration of SMS channel
   */
  async enableSmsChannel(
    teacherId: string,
    schoolId: string,
    enabledBy: string
  ): Promise<ChannelConfigResult> {
    return this.configureChannels(teacherId, schoolId, { sms: true }, enabledBy)
  }

  /**
   * Disable SMS channel for a teacher (admin action)
   */
  async disableSmsChannel(
    teacherId: string,
    schoolId: string,
    disabledBy: string
  ): Promise<ChannelConfigResult> {
    return this.configureChannels(teacherId, schoolId, { sms: false }, disabledBy)
  }

  /**
   * Enable WhatsApp channel for a teacher (admin action)
   * Requirement 5.1: Allow configuration of WhatsApp channel
   */
  async enableWhatsAppChannel(
    teacherId: string,
    schoolId: string,
    enabledBy: string
  ): Promise<ChannelConfigResult> {
    return this.configureChannels(teacherId, schoolId, { whatsapp: true }, enabledBy)
  }

  /**
   * Disable WhatsApp channel for a teacher (admin action)
   */
  async disableWhatsAppChannel(
    teacherId: string,
    schoolId: string,
    disabledBy: string
  ): Promise<ChannelConfigResult> {
    return this.configureChannels(teacherId, schoolId, { whatsapp: false }, disabledBy)
  }
}

// Export singleton instance
export const teacherCommunicationService = new TeacherCommunicationService()
