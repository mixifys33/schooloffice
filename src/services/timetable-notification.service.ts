/**
 * TIMETABLE NOTIFICATION SERVICE
 * 
 * Handles all notifications related to timetable changes:
 * - Teacher notifications for new/updated timetables
 * - Student/Parent notifications for schedule changes
 * - DoS notifications for conflicts and approvals
 * - SMS and Email integration
 * 
 * NOTIFICATION TRIGGERS:
 * - Timetable published
 * - Schedule conflicts detected
 * - Teacher workload changes
 * - Room assignments updated
 * - Emergency schedule changes
 */

import { prisma } from '@/lib/db'
import { TimetableDraft, TimetableConflict, TeacherWorkloadAnalysis } from '@/types/timetable'

interface NotificationRecipient {
  id: string
  name: string
  phone?: string
  email?: string
  role: string
  preferredChannel: 'SMS' | 'EMAIL' | 'BOTH'
}

interface TimetableNotificationData {
  type: TimetableNotificationType
  timetable: TimetableDraft
  school: {
    id: string
    name: string
  }
  term: {
    id: string
    name: string
    academicYear: string
  }
  triggeredBy: {
    id: string
    name: string
    role: string
  }
  metadata?: any
}

enum TimetableNotificationType {
  TIMETABLE_PUBLISHED = 'TIMETABLE_PUBLISHED',
  TIMETABLE_UPDATED = 'TIMETABLE_UPDATED',
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  WORKLOAD_ALERT = 'WORKLOAD_ALERT',
  ROOM_CHANGE = 'ROOM_CHANGE',
  EMERGENCY_CHANGE = 'EMERGENCY_CHANGE',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  GENERATION_COMPLETE = 'GENERATION_COMPLETE'
}

export class TimetableNotificationService {
  /**
   * Notify teachers about new/updated timetable
   */
  async notifyTeachersOfNewTimetable(timetableId: string, triggeredBy: string): Promise<void> {
    const timetable = await this.getTimetableWithDetails(timetableId)
    const teachers = await this.getAffectedTeachers(timetableId)
    
    const notificationData: TimetableNotificationData = {
      type: TimetableNotificationType.TIMETABLE_PUBLISHED,
      timetable,
      school: await this.getSchoolInfo(timetable.schoolId),
      term: await this.getTermInfo(timetable.termId),
      triggeredBy: await this.getUserInfo(triggeredBy)
    }

    for (const teacher of teachers) {
      await this.sendTeacherTimetableNotification(teacher, notificationData)
    }

    // Log notification activity
    await this.logNotificationActivity({
      type: TimetableNotificationType.TIMETABLE_PUBLISHED,
      timetableId,
      recipientCount: teachers.length,
      triggeredBy,
      timestamp: new Date()
    })
  }

  /**
   * Notify about schedule conflicts
   */
  async notifyConflictDetected(
    timetableId: string, 
    conflicts: TimetableConflict[], 
    triggeredBy: string
  ): Promise<void> {
    const timetable = await this.getTimetableWithDetails(timetableId)
    const dosUsers = await this.getDoSUsers(timetable.schoolId)
    
    const criticalConflicts = conflicts.filter(c => c.severity === 'CRITICAL')
    
    if (criticalConflicts.length === 0) return

    const notificationData: TimetableNotificationData = {
      type: TimetableNotificationType.SCHEDULE_CONFLICT,
      timetable,
      school: await this.getSchoolInfo(timetable.schoolId),
      term: await this.getTermInfo(timetable.termId),
      triggeredBy: await this.getUserInfo(triggeredBy),
      metadata: {
        totalConflicts: conflicts.length,
        criticalConflicts: criticalConflicts.length,
        conflicts: criticalConflicts.slice(0, 5) // First 5 critical conflicts
      }
    }

    for (const dosUser of dosUsers) {
      await this.sendConflictNotification(dosUser, notificationData)
    }
  }

  /**
   * Notify about teacher workload issues
   */
  async notifyWorkloadAlert(
    timetableId: string,
    workloadAnalysis: TeacherWorkloadAnalysis[],
    triggeredBy: string
  ): Promise<void> {
    const overloadedTeachers = workloadAnalysis.filter(w => 
      w.workloadRating === 'OVERLOADED' || w.workloadRating === 'CRITICAL'
    )

    if (overloadedTeachers.length === 0) return

    const timetable = await this.getTimetableWithDetails(timetableId)
    const dosUsers = await this.getDoSUsers(timetable.schoolId)

    const notificationData: TimetableNotificationData = {
      type: TimetableNotificationType.WORKLOAD_ALERT,
      timetable,
      school: await this.getSchoolInfo(timetable.schoolId),
      term: await this.getTermInfo(timetable.termId),
      triggeredBy: await this.getUserInfo(triggeredBy),
      metadata: {
        overloadedCount: overloadedTeachers.length,
        overloadedTeachers: overloadedTeachers.map(t => ({
          name: t.teacherName,
          totalPeriods: t.totalPeriods,
          rating: t.workloadRating
        }))
      }
    }

    for (const dosUser of dosUsers) {
      await this.sendWorkloadAlertNotification(dosUser, notificationData)
    }
  }

  /**
   * Send emergency schedule change notifications
   */
  async notifyEmergencyChange(
    timetableId: string,
    changeDetails: {
      affectedClasses: string[]
      affectedTeachers: string[]
      changeReason: string
      effectiveDate: Date
    },
    triggeredBy: string
  ): Promise<void> {
    const timetable = await this.getTimetableWithDetails(timetableId)
    
    // Notify affected teachers
    const teachers = await this.getTeachersByIds(changeDetails.affectedTeachers)
    
    // Notify parents of affected classes
    const parents = await this.getParentsByClasses(changeDetails.affectedClasses)

    const notificationData: TimetableNotificationData = {
      type: TimetableNotificationType.EMERGENCY_CHANGE,
      timetable,
      school: await this.getSchoolInfo(timetable.schoolId),
      term: await this.getTermInfo(timetable.termId),
      triggeredBy: await this.getUserInfo(triggeredBy),
      metadata: changeDetails
    }

    // Send to teachers
    for (const teacher of teachers) {
      await this.sendEmergencyChangeNotification(teacher, notificationData, 'TEACHER')
    }

    // Send to parents
    for (const parent of parents) {
      await this.sendEmergencyChangeNotification(parent, notificationData, 'PARENT')
    }
  }

  /**
   * Send individual teacher timetable notification
   */
  private async sendTeacherTimetableNotification(
    teacher: NotificationRecipient,
    data: TimetableNotificationData
  ): Promise<void> {
    const message = this.generateTeacherTimetableMessage(teacher, data)
    
    if (teacher.preferredChannel === 'SMS' || teacher.preferredChannel === 'BOTH') {
      if (teacher.phone) {
        await this.sendSMS(teacher.phone, message.sms)
      }
    }

    if (teacher.preferredChannel === 'EMAIL' || teacher.preferredChannel === 'BOTH') {
      if (teacher.email) {
        await this.sendEmail(teacher.email, message.email.subject, message.email.body)
      }
    }
  }

  /**
   * Send conflict notification to DoS
   */
  private async sendConflictNotification(
    dosUser: NotificationRecipient,
    data: TimetableNotificationData
  ): Promise<void> {
    const message = this.generateConflictMessage(data)
    
    // Always send critical conflict notifications via both channels
    if (dosUser.phone) {
      await this.sendSMS(dosUser.phone, message.sms)
    }
    
    if (dosUser.email) {
      await this.sendEmail(dosUser.email, message.email.subject, message.email.body)
    }
  }

  /**
   * Send workload alert notification
   */
  private async sendWorkloadAlertNotification(
    dosUser: NotificationRecipient,
    data: TimetableNotificationData
  ): Promise<void> {
    const message = this.generateWorkloadAlertMessage(data)
    
    if (dosUser.email) {
      await this.sendEmail(dosUser.email, message.email.subject, message.email.body)
    }
  }

  /**
   * Send emergency change notification
   */
  private async sendEmergencyChangeNotification(
    recipient: NotificationRecipient,
    data: TimetableNotificationData,
    recipientType: 'TEACHER' | 'PARENT'
  ): Promise<void> {
    const message = this.generateEmergencyChangeMessage(data, recipientType)
    
    // Emergency notifications always go via SMS for immediate delivery
    if (recipient.phone) {
      await this.sendSMS(recipient.phone, message.sms)
    }
    
    if (recipient.email) {
      await this.sendEmail(recipient.email, message.email.subject, message.email.body)
    }
  }

  /**
   * Generate teacher timetable notification message
   */
  private generateTeacherTimetableMessage(
    teacher: NotificationRecipient,
    data: TimetableNotificationData
  ): { sms: string; email: { subject: string; body: string } } {
    const sms = `
Dear ${teacher.name},

Your new timetable for ${data.term.name} ${data.term.academicYear} has been published.

Please check your updated schedule and report any conflicts to the DoS immediately.

Download: [Link will be provided]

${data.school.name}
    `.trim()

    const emailSubject = `New Timetable Published - ${data.term.name} ${data.term.academicYear}`
    
    const emailBody = `
Dear ${teacher.name},

Your new timetable for ${data.term.name} ${data.term.academicYear} has been published by ${data.triggeredBy.name}.

Key Details:
- Timetable Version: ${data.timetable.version}
- Status: ${data.timetable.status}
- Published: ${data.timetable.publishedAt?.toLocaleDateString()}

Please:
1. Review your updated schedule carefully
2. Check for any conflicts with your availability
3. Report any issues to the Director of Studies immediately
4. Download your personal timetable copy from the teacher portal

If you have any questions or concerns about your schedule, please contact the DoS office.

Best regards,
${data.school.name}
Director of Studies Office

---
This is an automated notification from the SchoolOffice Timetable System.
    `.trim()

    return {
      sms,
      email: { subject: emailSubject, body: emailBody }
    }
  }

  /**
   * Generate conflict notification message
   */
  private generateConflictMessage(data: TimetableNotificationData): { sms: string; email: { subject: string; body: string } } {
    const { metadata } = data
    
    const sms = `
URGENT: Timetable conflicts detected!

${metadata.criticalConflicts} critical conflicts found in ${data.term.name} timetable.

Immediate DoS attention required.

${data.school.name}
    `.trim()

    const emailSubject = `URGENT: Critical Timetable Conflicts Detected - ${data.term.name}`
    
    const emailBody = `
URGENT ATTENTION REQUIRED

Critical conflicts have been detected in the ${data.term.name} ${data.term.academicYear} timetable.

Conflict Summary:
- Total Conflicts: ${metadata.totalConflicts}
- Critical Conflicts: ${metadata.criticalConflicts}
- Timetable Version: ${data.timetable.version}

Critical Conflicts:
${metadata.conflicts.map((conflict: any, index: number) => 
  `${index + 1}. ${conflict.description}`
).join('\n')}

IMMEDIATE ACTION REQUIRED:
1. Review all critical conflicts in the DoS dashboard
2. Resolve conflicts before timetable approval
3. Regenerate timetable if necessary

Access the conflict resolution interface immediately to address these issues.

${data.school.name}
Director of Studies Office

---
This is an automated alert from the SchoolOffice Timetable System.
    `.trim()

    return {
      sms,
      email: { subject: emailSubject, body: emailBody }
    }
  }

  /**
   * Generate workload alert message
   */
  private generateWorkloadAlertMessage(data: TimetableNotificationData): { email: { subject: string; body: string } } {
    const { metadata } = data
    
    const emailSubject = `Teacher Workload Alert - ${data.term.name}`
    
    const emailBody = `
Teacher Workload Alert

The following teachers have been identified with excessive workload in the ${data.term.name} ${data.term.academicYear} timetable:

Overloaded Teachers:
${metadata.overloadedTeachers.map((teacher: any) => 
  `- ${teacher.name}: ${teacher.totalPeriods} periods/week (${teacher.rating})`
).join('\n')}

RECOMMENDED ACTIONS:
1. Review teacher workload distribution
2. Consider redistributing lessons to other qualified teachers
3. Adjust maximum periods per teacher if necessary
4. Monitor teacher wellbeing and performance

Please address these workload concerns to ensure optimal teaching quality and teacher satisfaction.

${data.school.name}
Director of Studies Office

---
This is an automated alert from the SchoolOffice Timetable System.
    `.trim()

    return {
      email: { subject: emailSubject, body: emailBody }
    }
  }

  /**
   * Generate emergency change message
   */
  private generateEmergencyChangeMessage(
    data: TimetableNotificationData,
    recipientType: 'TEACHER' | 'PARENT'
  ): { sms: string; email: { subject: string; body: string } } {
    const { metadata } = data
    
    const sms = recipientType === 'TEACHER' 
      ? `URGENT: Schedule change effective ${metadata.effectiveDate.toLocaleDateString()}. Reason: ${metadata.changeReason}. Check updated timetable immediately. ${data.school.name}`
      : `URGENT: Your child's class schedule has changed effective ${metadata.effectiveDate.toLocaleDateString()}. Reason: ${metadata.changeReason}. ${data.school.name}`

    const emailSubject = `URGENT: Emergency Schedule Change - ${data.term.name}`
    
    const emailBody = recipientType === 'TEACHER'
      ? `
URGENT: Emergency Schedule Change

An emergency change has been made to the ${data.term.name} ${data.term.academicYear} timetable.

Change Details:
- Effective Date: ${metadata.effectiveDate.toLocaleDateString()}
- Reason: ${metadata.changeReason}
- Affected Classes: ${metadata.affectedClasses.join(', ')}

IMMEDIATE ACTION REQUIRED:
1. Check your updated timetable immediately
2. Adjust your personal schedule accordingly
3. Inform your students of any changes
4. Contact DoS if you have any conflicts

We apologize for any inconvenience caused by this emergency change.

${data.school.name}
Director of Studies Office
      `.trim()
      : `
URGENT: Emergency Schedule Change

An emergency change has been made to your child's class schedule.

Change Details:
- Effective Date: ${metadata.effectiveDate.toLocaleDateString()}
- Reason: ${metadata.changeReason}
- Affected Classes: ${metadata.affectedClasses.join(', ')}

Please ensure your child is aware of the schedule changes and arrives at the correct times and locations.

If you have any questions, please contact the school office.

${data.school.name}
      `.trim()

    return {
      sms,
      email: { subject: emailSubject, body: emailBody }
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    try {
      // This would integrate with your existing SMS service
      // For now, just log the SMS
      console.log(`SMS to ${phone}: ${message}`)
      
      // In production, this would call your SMS service:
      // await smsService.sendSMS(phone, message)
    } catch (error) {
      console.error('Failed to send SMS:', error)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(email: string, subject: string, body: string): Promise<void> {
    try {
      // This would integrate with your existing email service
      // For now, just log the email
      console.log(`Email to ${email}: ${subject}`)
      console.log(body)
      
      // In production, this would call your email service:
      // await emailService.sendEmail(email, subject, body)
    } catch (error) {
      console.error('Failed to send email:', error)
    }
  }

  /**
   * Log notification activity for audit
   */
  private async logNotificationActivity(activity: {
    type: TimetableNotificationType
    timetableId: string
    recipientCount: number
    triggeredBy: string
    timestamp: Date
  }): Promise<void> {
    try {
      // This would log to your audit system
      console.log('Notification Activity:', activity)
      
      // In production:
      // await auditService.logActivity({
      //   action: 'TIMETABLE_NOTIFICATION',
      //   details: activity
      // })
    } catch (error) {
      console.error('Failed to log notification activity:', error)
    }
  }

  // Helper methods (would be implemented with actual database queries)
  private async getTimetableWithDetails(timetableId: string): Promise<TimetableDraft> {
    // This would fetch timetable with all details
    return {} as TimetableDraft
  }

  private async getAffectedTeachers(timetableId: string): Promise<NotificationRecipient[]> {
    // This would fetch all teachers with slots in this timetable
    return []
  }

  private async getDoSUsers(schoolId: string): Promise<NotificationRecipient[]> {
    // This would fetch all DoS users for the school
    return []
  }

  private async getTeachersByIds(teacherIds: string[]): Promise<NotificationRecipient[]> {
    // This would fetch teachers by their IDs
    return []
  }

  private async getParentsByClasses(classIds: string[]): Promise<NotificationRecipient[]> {
    // This would fetch parents of students in the specified classes
    return []
  }

  private async getSchoolInfo(schoolId: string): Promise<{ id: string; name: string }> {
    // This would fetch school information
    return { id: schoolId, name: 'School Name' }
  }

  private async getTermInfo(termId: string): Promise<{ id: string; name: string; academicYear: string }> {
    // This would fetch term information
    return { id: termId, name: 'Term 1', academicYear: '2024' }
  }

  private async getUserInfo(userId: string): Promise<{ id: string; name: string; role: string }> {
    // This would fetch user information
    return { id: userId, name: 'User Name', role: 'DOS' }
  }
}

export const timetableNotificationService = new TimetableNotificationService()