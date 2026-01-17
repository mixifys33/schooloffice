/**
 * Attendance Message Service
 * Handles automatic absence notifications, late arrival, and early departure notifications.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { prisma } from '../lib/db'
import { messageOrchestratorService } from './message-orchestrator.service'
import { messageTemplateService } from './message-template.service'
import { contactManagementService } from './contact-management.service'
import { attendanceService } from './attendance.service'
import {
  MessageChannel,
  DeliveryStatus,
  MessageTemplateType,
  TargetType,
  AttendanceStatus,
} from '../types/enums'

// ============================================
// TYPES
// ============================================

/**
 * Result of an attendance message send operation
 */
export interface AttendanceMessageResult {
  success: boolean
  messageId?: string
  error?: string
  channel?: MessageChannel
  studentId: string
  guardianId?: string
}

/**
 * Absence notification request parameters
 * Requirement 10.1: Automatic absence notification to guardian
 */
export interface AbsenceNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  periodsAbsent: number[]
  senderId: string
  channel?: MessageChannel
}

/**
 * Late arrival notification request parameters
 * Requirement 10.2: Late arrival notification with arrival time
 */
export interface LateArrivalNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  arrivalTime: Date
  senderId: string
  channel?: MessageChannel
}

/**
 * Early departure notification request parameters
 * Requirement 10.3: Early departure notification with departure time
 */
export interface EarlyDepartureNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  departureTime: Date
  reason?: string
  senderId: string
  channel?: MessageChannel
}

/**
 * Bulk absence notification result
 */
export interface BulkAbsenceNotificationResult {
  totalStudents: number
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

/**
 * Guardian notification preferences
 * Requirement 10.5: Respect guardian notification preferences
 */
export interface GuardianNotificationPreferences {
  guardianId: string
  receiveAbsenceNotifications: boolean
  receiveLateNotifications: boolean
  receiveEarlyDepartureNotifications: boolean
  preferredChannel: MessageChannel
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string   // HH:mm format
}

/**
 * Student attendance info for message content
 * Requirement 10.4: Include student name, date, and class
 */
interface StudentAttendanceInfo {
  studentId: string
  studentName: string
  className: string
  schoolName: string
  guardianId: string
  guardianName: string
  guardianPhone?: string
  guardianEmail?: string
  preferredChannel: MessageChannel
}

// ============================================
// ATTENDANCE MESSAGE SERVICE
// ============================================

export class AttendanceMessageService {

  /**
   * Get student attendance info for message content
   * Requirement 10.4: Include student name, date, and class in all messages
   */
  private async getStudentAttendanceInfo(studentId: string): Promise<StudentAttendanceInfo | null> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        school: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) return null

    const primaryGuardianLink = student.studentGuardians[0]
    if (!primaryGuardianLink) return null

    const guardian = primaryGuardianLink.guardian
    const contacts = await contactManagementService.getStudentContacts(studentId)
    const primaryContact = contacts.primaryGuardian

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.class.name,
      schoolName: student.school.name,
      guardianId: guardian.id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      guardianPhone: primaryContact?.phone,
      guardianEmail: primaryContact?.email,
      preferredChannel: primaryContact?.preferredChannel || MessageChannel.SMS,
    }
  }

  /**
   * Get guardian notification preferences
   * Requirement 10.5: Respect guardian notification preferences if configured
   */
  async getGuardianNotificationPreferences(guardianId: string): Promise<GuardianNotificationPreferences> {
    // Check if guardian has custom preferences stored
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: {
        id: true,
        phone: true,
        email: true,
      },
    })

    // Default preferences - all notifications enabled
    const defaultPreferences: GuardianNotificationPreferences = {
      guardianId,
      receiveAbsenceNotifications: true,
      receiveLateNotifications: true,
      receiveEarlyDepartureNotifications: true,
      preferredChannel: guardian?.phone ? MessageChannel.SMS : MessageChannel.EMAIL,
    }

    // Check for stored preferences in guardian metadata or settings
    // For now, return defaults - can be extended to read from a preferences table
    return defaultPreferences
  }

  /**
   * Check if notification should be sent based on preferences
   * Requirement 10.5: Respect guardian notification preferences
   */
  private shouldSendNotification(
    preferences: GuardianNotificationPreferences,
    notificationType: 'absence' | 'late' | 'earlyDeparture'
  ): boolean {
    switch (notificationType) {
      case 'absence':
        return preferences.receiveAbsenceNotifications
      case 'late':
        return preferences.receiveLateNotifications
      case 'earlyDeparture':
        return preferences.receiveEarlyDepartureNotifications
      default:
        return true
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(preferences: GuardianNotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd
  }

  /**
   * Send automatic absence notification to guardian
   * Requirement 10.1: Automatically notify guardian within configured time window
   * Requirement 10.4: Include student name, date, and class
   */
  async sendAbsenceNotification(request: AbsenceNotificationRequest): Promise<AttendanceMessageResult> {
    const { schoolId, studentId, date, periodsAbsent, senderId, channel } = request

    // Get student info
    const studentInfo = await this.getStudentAttendanceInfo(studentId)
    if (!studentInfo) {
      return {
        success: false,
        error: 'Student not found or no primary guardian',
        studentId,
      }
    }

    // Check guardian preferences
    const preferences = await this.getGuardianNotificationPreferences(studentInfo.guardianId)
    if (!this.shouldSendNotification(preferences, 'absence')) {
      return {
        success: false,
        error: 'Guardian has disabled absence notifications',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }

    // Check quiet hours
    if (this.isWithinQuietHours(preferences)) {
      return {
        success: false,
        error: 'Notification blocked due to quiet hours',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }

    try {
      const selectedChannel = channel || preferences.preferredChannel || MessageChannel.SMS

      // Build message content with required info
      const content = this.buildAbsenceNotificationContent({
        studentName: studentInfo.studentName,
        className: studentInfo.className,
        date,
        periodsAbsent,
        schoolName: studentInfo.schoolName,
      })

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [studentInfo.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'high',
        senderId,
      })

      // Log the attendance message
      await this.logAttendanceMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: studentInfo.guardianId,
        messageType: 'ABSENCE_NOTIFICATION',
        date,
        periodsAbsent,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        channel: selectedChannel,
        studentId,
        guardianId: studentInfo.guardianId,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send absence notification',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }
  }


  /**
   * Send late arrival notification to guardian
   * Requirement 10.2: Notify guardian with arrival time
   * Requirement 10.4: Include student name, date, and class
   */
  async sendLateArrivalNotification(request: LateArrivalNotificationRequest): Promise<AttendanceMessageResult> {
    const { schoolId, studentId, date, arrivalTime, senderId, channel } = request

    // Get student info
    const studentInfo = await this.getStudentAttendanceInfo(studentId)
    if (!studentInfo) {
      return {
        success: false,
        error: 'Student not found or no primary guardian',
        studentId,
      }
    }

    // Check guardian preferences
    const preferences = await this.getGuardianNotificationPreferences(studentInfo.guardianId)
    if (!this.shouldSendNotification(preferences, 'late')) {
      return {
        success: false,
        error: 'Guardian has disabled late arrival notifications',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }

    try {
      const selectedChannel = channel || preferences.preferredChannel || MessageChannel.SMS

      // Build message content with required info
      const content = this.buildLateArrivalContent({
        studentName: studentInfo.studentName,
        className: studentInfo.className,
        date,
        arrivalTime,
        schoolName: studentInfo.schoolName,
      })

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [studentInfo.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'normal',
        senderId,
      })

      // Log the attendance message
      await this.logAttendanceMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: studentInfo.guardianId,
        messageType: 'LATE_ARRIVAL_NOTIFICATION',
        date,
        arrivalTime,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        channel: selectedChannel,
        studentId,
        guardianId: studentInfo.guardianId,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send late arrival notification',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }
  }

  /**
   * Send early departure notification to guardian
   * Requirement 10.3: Notify guardian with departure time
   * Requirement 10.4: Include student name, date, and class
   */
  async sendEarlyDepartureNotification(request: EarlyDepartureNotificationRequest): Promise<AttendanceMessageResult> {
    const { schoolId, studentId, date, departureTime, reason, senderId, channel } = request

    // Get student info
    const studentInfo = await this.getStudentAttendanceInfo(studentId)
    if (!studentInfo) {
      return {
        success: false,
        error: 'Student not found or no primary guardian',
        studentId,
      }
    }

    // Check guardian preferences
    const preferences = await this.getGuardianNotificationPreferences(studentInfo.guardianId)
    if (!this.shouldSendNotification(preferences, 'earlyDeparture')) {
      return {
        success: false,
        error: 'Guardian has disabled early departure notifications',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }

    try {
      const selectedChannel = channel || preferences.preferredChannel || MessageChannel.SMS

      // Build message content with required info
      const content = this.buildEarlyDepartureContent({
        studentName: studentInfo.studentName,
        className: studentInfo.className,
        date,
        departureTime,
        reason,
        schoolName: studentInfo.schoolName,
      })

      // Send message via orchestrator
      const result = await messageOrchestratorService.sendMessage({
        schoolId,
        targetType: TargetType.SPECIFIC_GUARDIANS,
        targetCriteria: { guardianIds: [studentInfo.guardianId] },
        customContent: content,
        channel: selectedChannel,
        priority: 'normal',
        senderId,
      })

      // Log the attendance message
      await this.logAttendanceMessage({
        schoolId,
        messageId: result.messageId,
        studentId,
        guardianId: studentInfo.guardianId,
        messageType: 'EARLY_DEPARTURE_NOTIFICATION',
        date,
        departureTime,
        reason,
        channel: selectedChannel,
        status: result.status,
        senderId,
      })

      return {
        success: result.status !== DeliveryStatus.FAILED,
        messageId: result.messageId,
        channel: selectedChannel,
        studentId,
        guardianId: studentInfo.guardianId,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send early departure notification',
        studentId,
        guardianId: studentInfo.guardianId,
      }
    }
  }


  /**
   * Process and send absence notifications for all absent students in a class
   * Requirement 10.1: Automatic absence notification
   */
  async processClassAbsenceNotifications(
    schoolId: string,
    classId: string,
    date: Date,
    senderId: string
  ): Promise<BulkAbsenceNotificationResult> {
    const result: BulkAbsenceNotificationResult = {
      totalStudents: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // Get absent students for the day
      const absentStudents = await attendanceService.getAbsentStudentsForDay(classId, date)
      result.totalStudents = absentStudents.length

      for (const { studentId, periodsAbsent } of absentStudents) {
        const sendResult = await this.sendAbsenceNotification({
          schoolId,
          studentId,
          date,
          periodsAbsent,
          senderId,
        })

        if (sendResult.success) {
          result.sent++
        } else if (sendResult.error?.includes('disabled') || sendResult.error?.includes('quiet hours')) {
          result.skipped++
        } else {
          result.failed++
          result.errors.push(`${studentId}: ${sendResult.error}`)
        }
      }

      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Bulk processing failed')
      return result
    }
  }

  /**
   * Process and send absence notifications for entire school
   * Requirement 10.1: Automatic absence notification
   */
  async processSchoolAbsenceNotifications(
    schoolId: string,
    date: Date,
    senderId: string
  ): Promise<BulkAbsenceNotificationResult> {
    const result: BulkAbsenceNotificationResult = {
      totalStudents: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // Get all classes in the school
      const classes = await prisma.class.findMany({
        where: { schoolId },
        select: { id: true },
      })

      for (const cls of classes) {
        const classResult = await this.processClassAbsenceNotifications(
          schoolId,
          cls.id,
          date,
          senderId
        )

        result.totalStudents += classResult.totalStudents
        result.sent += classResult.sent
        result.failed += classResult.failed
        result.skipped += classResult.skipped
        result.errors.push(...classResult.errors)
      }

      return result
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'School processing failed')
      return result
    }
  }

  /**
   * Build absence notification message content
   * Requirement 10.4: Include student name, date, and class
   */
  private buildAbsenceNotificationContent(params: {
    studentName: string
    className: string
    date: Date
    periodsAbsent: number[]
    schoolName: string
  }): string {
    const { studentName, className, date, periodsAbsent, schoolName } = params

    const dateStr = date.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const periodsStr = periodsAbsent.length === 1
      ? `period ${periodsAbsent[0]}`
      : `periods ${periodsAbsent.join(', ')}`

    return `Dear Parent/Guardian,

This is to inform you that ${studentName} (${className}) was absent from school on ${dateStr} during ${periodsStr}.

If you have any concerns or would like to provide a reason for the absence, please contact the school.

${schoolName}`
  }

  /**
   * Build late arrival notification message content
   * Requirement 10.2: Include arrival time
   * Requirement 10.4: Include student name, date, and class
   */
  private buildLateArrivalContent(params: {
    studentName: string
    className: string
    date: Date
    arrivalTime: Date
    schoolName: string
  }): string {
    const { studentName, className, date, arrivalTime, schoolName } = params

    const dateStr = date.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const timeStr = arrivalTime.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return `Dear Parent/Guardian,

This is to inform you that ${studentName} (${className}) arrived late to school on ${dateStr} at ${timeStr}.

Please ensure timely arrival to avoid missing important lessons.

${schoolName}`
  }

  /**
   * Build early departure notification message content
   * Requirement 10.3: Include departure time
   * Requirement 10.4: Include student name, date, and class
   */
  private buildEarlyDepartureContent(params: {
    studentName: string
    className: string
    date: Date
    departureTime: Date
    reason?: string
    schoolName: string
  }): string {
    const { studentName, className, date, departureTime, reason, schoolName } = params

    const dateStr = date.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const timeStr = departureTime.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const reasonText = reason ? `\nReason: ${reason}` : ''

    return `Dear Parent/Guardian,

This is to inform you that ${studentName} (${className}) left school early on ${dateStr} at ${timeStr}.${reasonText}

If you have any questions, please contact the school.

${schoolName}`
  }


  /**
   * Log attendance message for audit trail
   */
  private async logAttendanceMessage(params: {
    schoolId: string
    messageId: string
    studentId: string
    guardianId: string
    messageType: 'ABSENCE_NOTIFICATION' | 'LATE_ARRIVAL_NOTIFICATION' | 'EARLY_DEPARTURE_NOTIFICATION'
    date: Date
    periodsAbsent?: number[]
    arrivalTime?: Date
    departureTime?: Date
    reason?: string
    channel: MessageChannel
    status: DeliveryStatus
    senderId: string
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          schoolId: params.schoolId,
          userId: params.senderId,
          action: `attendance_message_${params.messageType.toLowerCase()}`,
          resource: 'attendance_message',
          resourceId: params.messageId,
          newValue: {
            messageType: params.messageType,
            studentId: params.studentId,
            guardianId: params.guardianId,
            date: params.date.toISOString(),
            periodsAbsent: params.periodsAbsent,
            arrivalTime: params.arrivalTime?.toISOString(),
            departureTime: params.departureTime?.toISOString(),
            reason: params.reason,
            channel: params.channel,
            status: params.status,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log attendance message:', error)
    }
  }

  /**
   * Handle attendance event from automation service
   * Called when attendance is marked
   */
  async handleAttendanceEvent(event: {
    studentId: string
    classId: string
    schoolId: string
    date: Date
    status: AttendanceStatus
    period?: number
    arrivalTime?: Date
    departureTime?: Date
    senderId: string
  }): Promise<AttendanceMessageResult> {
    const { studentId, schoolId, date, status, period, arrivalTime, departureTime, senderId } = event

    switch (status) {
      case AttendanceStatus.ABSENT:
        // For absence, we need to check if student is absent for multiple periods
        const absenceStatus = await attendanceService.checkDailyAbsence(studentId, date)
        if (absenceStatus.isAbsentForDay) {
          return this.sendAbsenceNotification({
            schoolId,
            studentId,
            date,
            periodsAbsent: absenceStatus.periodsAbsent,
            senderId,
          })
        }
        return {
          success: false,
          error: 'Student not absent for enough periods to trigger notification',
          studentId,
        }

      case AttendanceStatus.LATE:
        if (arrivalTime) {
          return this.sendLateArrivalNotification({
            schoolId,
            studentId,
            date,
            arrivalTime,
            senderId,
          })
        }
        return {
          success: false,
          error: 'Arrival time required for late notification',
          studentId,
        }

      default:
        return {
          success: false,
          error: `No notification configured for status: ${status}`,
          studentId,
        }
    }
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  /**
   * Pure function to check if absence notification should be sent
   * Used for testing
   */
  shouldSendAbsenceNotification(
    periodsAbsent: number[],
    preferences: GuardianNotificationPreferences
  ): boolean {
    return periodsAbsent.length >= 2 && preferences.receiveAbsenceNotifications
  }

  /**
   * Pure function to format date for message
   * Used for testing
   */
  formatDateForMessage(date: Date): string {
    return date.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  /**
   * Pure function to format time for message
   * Used for testing
   */
  formatTimeForMessage(time: Date): string {
    return time.toLocaleTimeString('en-UG', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Pure function to validate attendance message contains required info
   * Requirement 10.4: Include student name, date, and class
   * Used for testing
   */
  validateMessageContent(
    content: string,
    studentName: string,
    className: string,
    date: Date
  ): boolean {
    const dateStr = this.formatDateForMessage(date)
    return (
      content.includes(studentName) &&
      content.includes(className) &&
      content.includes(dateStr)
    )
  }
}

// Export singleton instance
export const attendanceMessageService = new AttendanceMessageService()
