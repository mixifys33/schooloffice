/**
 * SMS Sending Service with Template Integration
 * Handles SMS sending with proper template rendering, validation, and audit logging
 */
import { prisma } from '@/lib/db'
import { smsTemplateService } from './sms-template.service'
import { smsGateway } from './sms-gateway.service'
import {   
  SMSTemplateKey, 
  SMSTemplateRenderData
} from '@/types/sms-templates'

export interface SMSSendWithTemplateRequest {
  schoolId: string
  templateKey: SMSTemplateKey
  recipients: Array<{
    phone: string
    data: SMSTemplateRenderData
    studentId?: string
    guardianId?: string
  }>
  sentBy: string
  sentByRole: string
  triggerType: 'manual' | 'automatic'
  customContent?: string // Override template content
}

export interface SMSSendResult {
  success: boolean
  totalRecipients: number
  sentCount: number
  failedCount: number
  totalCost: number
  errors: string[]
  auditLogId?: string
}

export interface StudentWithGuardian {
  id: string
  firstName: string
  lastName: string
  className?: string
  currentBalance?: number
  attendancePercentage?: number
  position?: number
  guardian?: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
}

export class SMSSendingService {
  
  /**
   * Send SMS using template with proper validation and audit
   */
  async sendWithTemplate(request: SMSSendWithTemplateRequest): Promise<SMSSendResult> {
    const {
      schoolId,
      templateKey,
      recipients,
      sentBy,
      sentByRole,
      triggerType,
      customContent
    } = request

    // Get effective template content
    const templateContent = customContent || await smsTemplateService.getEffectiveTemplate(schoolId, templateKey)
    
    if (!templateContent) {
      throw new Error(`No template found for ${templateKey}`)
    }

    // Check permissions
    if (!smsTemplateService.hasPermission(sentByRole, templateKey)) {
      throw new Error(`Insufficient permissions to send ${templateKey} messages`)
    }

    // Validate template
    const validation = smsTemplateService.validateTemplate(templateKey, templateContent)
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
    }

    // Check credit limits
    const estimatedCost = validation.costEstimate.estimatedCost * recipients.length
    const creditCheck = await smsTemplateService.checkCreditLimits(
      schoolId,
      templateKey,
      recipients.length,
      estimatedCost
    )

    if (!creditCheck.allowed) {
      throw new Error(creditCheck.reason || 'SMS sending not allowed')
    }

    // Send messages
    const results: Array<{ success: boolean; phone: string; error?: string; cost: number }> = []
    let totalCost = 0
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      try {
        // Render template with recipient data
        const renderedContent = smsTemplateService.renderTemplate(templateContent, recipient.data)
        
        // Calculate cost for this message
        const messageCost = smsTemplateService.calculateCost(renderedContent)
        
        // Send SMS
        const sendResult = await smsGateway.sendSMS({
          to: recipient.phone,
          message: renderedContent
        })

        if (sendResult.success) {
          sentCount++
          totalCost += messageCost.estimatedCost
          results.push({
            success: true,
            phone: recipient.phone,
            cost: messageCost.estimatedCost
          })
        } else {
          failedCount++
          errors.push(`Failed to send to ${recipient.phone}: ${sendResult.error}`)
          results.push({
            success: false,
            phone: recipient.phone,
            error: sendResult.error,
            cost: 0
          })
        }
      } catch (error) {
        failedCount++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error sending to ${recipient.phone}: ${errorMsg}`)
        results.push({
          success: false,
          phone: recipient.phone,
          error: errorMsg,
          cost: 0
        })
      }
    }

    // Log the SMS sending for audit
    await smsTemplateService.logSMSSend(
      schoolId,
      templateKey,
      sentBy,
      sentByRole,
      recipients.length,
      totalCost,
      {
        triggerType,
        content: templateContent,
        recipients: recipients.map(r => r.phone)
      }
    )

    return {
      success: sentCount > 0,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      totalCost,
      errors
    }
  }

  /**
   * Send fees balance reminders to students with outstanding balances
   */
  async sendFeesReminders(
    schoolId: string,
    sentBy: string,
    sentByRole: string,
    options: {
      minimumBalance?: number
      classIds?: string[]
      studentIds?: string[]
    } = {}
  ): Promise<SMSSendResult> {
    // Get students with outstanding balances
    const students = await this.getStudentsWithBalances(schoolId, options)
    
    if (students.length === 0) {
      return {
        success: false,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        totalCost: 0,
        errors: ['No students with outstanding balances found']
      }
    }

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    })

    // Prepare recipients with template data
    const recipients = students
      .filter(student => student.guardian?.phone)
      .map(student => ({
        phone: student.guardian!.phone,
        studentId: student.id,
        guardianId: student.guardian!.id,
        data: {
          PARENT_NAME: `${student.guardian!.firstName} ${student.guardian!.lastName}`,
          STUDENT_NAME: `${student.firstName} ${student.lastName}`,
          BALANCE: student.currentBalance?.toLocaleString() || '0',
          SCHOOL_NAME: school?.name || 'School'
        }
      }))

    return this.sendWithTemplate({
      schoolId,
      templateKey: SMSTemplateKey.FEES_BALANCE,
      recipients,
      sentBy,
      sentByRole,
      triggerType: 'manual'
    })
  }

  /**
   * Send attendance alerts for absent students
   */
  async sendAttendanceAlerts(
    schoolId: string,
    sentBy: string,
    sentByRole: string,
    options: {
      date?: Date
      classIds?: string[]
    } = {}
  ): Promise<SMSSendResult> {
    const targetDate = options.date || new Date()
    
    // Get absent students for the date
    const absentStudents = await this.getAbsentStudents(schoolId, targetDate, options.classIds)
    
    if (absentStudents.length === 0) {
      return {
        success: false,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        totalCost: 0,
        errors: ['No absent students found for the specified date']
      }
    }

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, phone: true }
    })

    // Prepare recipients with template data
    const recipients = absentStudents
      .filter(student => student.guardian?.phone)
      .map(student => ({
        phone: student.guardian!.phone!,
        studentId: student.id,
        guardianId: student.guardian!.id,
        data: {
          PARENT_NAME: `${student.guardian!.firstName} ${student.guardian!.lastName}`,
          STUDENT_NAME: `${student.firstName} ${student.lastName}`,
          DATE: targetDate.toLocaleDateString(),
          SCHOOL_NAME: school?.name || 'School',
          CONTACT: school?.phone || 'school office'
        }
      }))

    // Use a custom template for attendance alerts since it's not in the 5 core templates
    const customContent = 'Dear {PARENT_NAME}, {STUDENT_NAME} was absent from school on {DATE}. Please contact {SCHOOL_NAME} if this was due to illness or emergency. {CONTACT}'

    return this.sendWithTemplate({
      schoolId,
      templateKey: SMSTemplateKey.ANNOUNCEMENT, // Use announcement template as fallback
      recipients,
      sentBy,
      sentByRole,
      triggerType: 'manual',
      customContent
    })
  }

  /**
   * Send report ready notifications
   */
  async sendReportReadyNotifications(
    schoolId: string,
    termId: string,
    sentBy: string,
    sentByRole: string,
    options: {
      classIds?: string[]
      studentIds?: string[]
    } = {}
  ): Promise<SMSSendResult> {
    // Get students with completed reports
    const students = await this.getStudentsWithReports(schoolId, termId, options)
    
    if (students.length === 0) {
      return {
        success: false,
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        totalCost: 0,
        errors: ['No students with completed reports found']
      }
    }

    // Get term info
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { name: true }
    })

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    })

    // Prepare recipients with template data
    const recipients = students
      .filter(student => student.guardian?.phone)
      .map(student => ({
        phone: student.guardian!.phone,
        studentId: student.id,
        guardianId: student.guardian!.id,
        data: {
          STUDENT_NAME: `${student.firstName} ${student.lastName}`,
          TERM: term?.name || 'Current Term',
          POSITION: student.position?.toString() || 'N/A',
          SCHOOL_NAME: school?.name || 'School'
        }
      }))

    return this.sendWithTemplate({
      schoolId,
      templateKey: SMSTemplateKey.REPORT_READY,
      recipients,
      sentBy,
      sentByRole,
      triggerType: 'manual'
    })
  }

  /**
   * Get students with outstanding balances
   */
  private async getStudentsWithBalances(
    schoolId: string,
    options: {
      minimumBalance?: number
      classIds?: string[]
      studentIds?: string[]
    }
  ): Promise<StudentWithGuardian[]> {
    // Get current active term for the school
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: schoolId,
          isActive: true,
        },
      },
      orderBy: {
        startDate: 'desc', // Get the latest active term
      },
    });

    if (!currentTerm) {
      console.warn(`No active term found for schoolId: ${schoolId}. Cannot send fee reminders.`);
      return [];
    }

    interface StudentWhereInput {
      schoolId: string
      status: 'ACTIVE'
      classId?: { in: string[] }
      id?: { in: string[] }
    }

    const where: StudentWhereInput = {
      schoolId,
      status: 'ACTIVE',
    };

    if (options.classIds?.length) {
      where.classId = { in: options.classIds };
    }

    if (options.studentIds?.length) {
      where.id = { in: options.studentIds };
    }

    // Fetch students and their associated student accounts for the current term
    const students = (await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        studentGuardians: {
          where: {
            // Only include guardians who are financially responsible and receive finance messages
            isFinanciallyResponsible: true,
            receivesFinanceMessages: true,
          },
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        studentAccounts: {
          where: {
            termId: currentTerm.id,
          },
        },
      },
    })) as unknown as Array<{
      id: string
      firstName: string
      lastName: string
      class: { name: string } | null
      studentGuardians: Array<{
        isFinanciallyResponsible: boolean
        guardian: {
          id: string
          firstName: string
          lastName: string
          phone: string | null
        }
      }>
      studentAccounts: Array<{
        balance: number
      }>
    }>;

    const studentsToRemind: StudentWithGuardian[] = [];

    for (const student of students) {
      // Ensure student has at least one guardian to send to
      if (!student.studentGuardians || student.studentGuardians.length === 0) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - No financially responsible guardian found.`);
        continue;
      }

      // Find the relevant student account for the current term
      const studentAccount = student.studentAccounts[0]; // Assuming only one account per student per term

      if (!studentAccount) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - No student account found for the current term.`);
        continue;
      }

      // Check balance from StudentAccount
      const currentBalance = studentAccount.balance;
      const minimumBalance = options.minimumBalance || 0;

      if (currentBalance <= minimumBalance) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - Balance (${currentBalance}) is zero or negative.`);
        continue;
      }

      // Select the primary financially responsible guardian
      const primaryGuardian = student.studentGuardians.find((sg) => sg.isFinanciallyResponsible)?.guardian;

      if (!primaryGuardian || !primaryGuardian.phone) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - Financially responsible guardian has no phone.`);
        continue;
      }

      studentsToRemind.push({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.class?.name || 'N/A',
        currentBalance: currentBalance,
        guardian: {
          id: primaryGuardian.id,
          firstName: primaryGuardian.firstName,
          lastName: primaryGuardian.lastName,
          phone: primaryGuardian.phone!,
        },
      });
    }

    return studentsToRemind;
  }

  /**
   * Get absent students for a specific date
   */
  private async getAbsentStudents(
    schoolId: string,
    date: Date,
    classIds?: string[]
  ): Promise<StudentWithGuardian[]> {
    const where: Record<string, unknown> = {
      schoolId,
      status: 'ACTIVE'
    }

    if (classIds?.length) {
      where.classId = { in: classIds }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        studentGuardians: {
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        },
        attendance: {
          where: {
            date: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
            }
          },
          select: {
            status: true
          }
        }
      }
    })

    // Filter for absent students
    return students
      .filter(student => {
        const todayAttendance = student.attendance[0]
        return !todayAttendance || todayAttendance.status === 'ABSENT'
      })
      .map(student => {
        const primaryGuardian = student.studentGuardians[0]?.guardian
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          className: student.class?.name,
          guardian: primaryGuardian ? {
            id: primaryGuardian.id,
            firstName: primaryGuardian.firstName,
            lastName: primaryGuardian.lastName,
            phone: primaryGuardian.phone || ''
          } : undefined
        }
      })
      .filter(student => student.guardian && student.guardian.phone)
  }

  /**
   * Get students with completed reports
   */
  private async getStudentsWithReports(
    schoolId: string,
    termId: string,
    options: {
      classIds?: string[]
      studentIds?: string[]
    }
  ): Promise<StudentWithGuardian[]> {
    const where: Record<string, unknown> = {
      schoolId,
      status: 'ACTIVE'
    }

    if (options.classIds?.length) {
      where.classId = { in: options.classIds }
    }

    if (options.studentIds?.length) {
      where.id = { in: options.studentIds }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        studentGuardians: {
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        }
        // Add report/results relation when available
      }
    })

    // For now, return all students as having reports ready
    // In a real implementation, you'd check for completed reports/results
    return students
      .map(student => {
        const primaryGuardian = student.studentGuardians[0]?.guardian
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          className: student.class?.name,
          position: Math.floor(Math.random() * 30) + 1, // Mock position
          guardian: primaryGuardian ? {
            id: primaryGuardian.id,
            firstName: primaryGuardian.firstName,
            lastName: primaryGuardian.lastName,
            phone: primaryGuardian.phone || ''
          } : undefined
        }
      })
      .filter(student => student.guardian && student.guardian.phone)
  }

}

// Export singleton instance
export const smsSendingService = new SMSSendingService()