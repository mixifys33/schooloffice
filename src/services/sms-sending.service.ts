/**
 * SMS Sending Service with Template Integration
 * Handles SMS sending with proper template rendering, validation, and audit logging
 */
import { prisma } from '@/lib/db'
import { smsTemplateService, BUILT_IN_SMS_TEMPLATES } from './sms-template.service'
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
    
    console.log('[SMS DEBUG] Template content:', templateContent)
    console.log('[SMS DEBUG] Template key:', templateKey)
    console.log('[SMS DEBUG] Custom content provided:', !!customContent)
    
    if (!templateContent) {
      throw new Error(`No template found for ${templateKey}`)
    }

    // Check permissions
    if (!smsTemplateService.hasPermission(sentByRole, templateKey)) {
      throw new Error(`Insufficient permissions to send ${templateKey} messages`)
    }

    // Validate template
    const validation = smsTemplateService.validateTemplate(templateKey, templateContent)
    console.log('[SMS DEBUG] Validation result:', validation)
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
          PARENT_NAME: `${student.guardian!.firstName || 'Parent'} ${student.guardian!.lastName || 'Guardian'}`.trim(),
          STUDENT_NAME: `${student.firstName} ${student.lastName}`,
          BALANCE: student.currentBalance?.toLocaleString() || '0',
          SCHOOL_NAME: school?.name || 'School'
        }
      }))

    // Use the default built-in template directly to ensure all required variables are present
    const templateContent = BUILT_IN_SMS_TEMPLATES[SMSTemplateKey.FEES_BALANCE].defaultContent

    return this.sendWithTemplate({
      schoolId,
      templateKey: SMSTemplateKey.FEES_BALANCE,
      recipients,
      sentBy,
      sentByRole,
      triggerType: 'manual',
      customContent: templateContent
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
    const today = new Date()
    const currentYear = new Date().getFullYear()
    
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: schoolId,
        isCurrent: true,
      },
    });

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      console.warn(`No academic year found for schoolId: ${schoolId}. Cannot send fee reminders.`);
      return [];
    }

    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAcademicYear.id },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      console.warn(`No term found for schoolId: ${schoolId}. Cannot send fee reminders.`);
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

    // Fetch students with payments and guardians
    const students = await prisma.student.findMany({
      where,
      include: {
        class: { select: { name: true } },
        payments: {
          where: {
            termId: currentTerm.id,
            status: 'CONFIRMED'
          }
        },
        studentGuardians: {
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
      },
    });

    // Get fee structures for the term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        isActive: true
      }
    })

    const studentsToRemind: StudentWithGuardian[] = [];

    for (const student of students) {
      // Ensure student has at least one guardian to send to
      if (!student.studentGuardians || student.studentGuardians.length === 0) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - No guardian found.`);
        continue;
      }

      // Find fee structure for this student's class
      const feeStructure = feeStructures.find(fs => 
        fs.classId === student.classId && 
        fs.studentType === 'DAY'
      )

      const expectedFee = feeStructure?.totalAmount || 0
      const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const currentBalance = expectedFee - paidAmount

      // Check balance
      const minimumBalance = options.minimumBalance || 0;

      if (currentBalance <= minimumBalance) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - Balance (${currentBalance}) is zero or negative.`);
        continue;
      }

      // Select guardian with priority:
      // 1. Financially responsible guardian who receives finance messages
      // 2. Financially responsible guardian (even if not set to receive messages)
      // 3. Primary guardian
      // 4. Any guardian with a phone number
      let selectedGuardian = student.studentGuardians.find(
        (sg) => sg.isFinanciallyResponsible && sg.receivesFinanceMessages
      )?.guardian;

      if (!selectedGuardian) {
        selectedGuardian = student.studentGuardians.find(
          (sg) => sg.isFinanciallyResponsible
        )?.guardian;
      }

      if (!selectedGuardian) {
        selectedGuardian = student.studentGuardians.find(
          (sg) => sg.isPrimary
        )?.guardian;
      }

      if (!selectedGuardian) {
        selectedGuardian = student.studentGuardians[0]?.guardian;
      }

      if (!selectedGuardian || !selectedGuardian.phone) {
        console.log(`Skipping SMS for ${student.firstName} ${student.lastName} (ID: ${student.id}) - No guardian with phone number found.`);
        continue;
      }

      studentsToRemind.push({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.class?.name || 'N/A',
        currentBalance: currentBalance,
        guardian: {
          id: selectedGuardian.id,
          firstName: selectedGuardian.firstName,
          lastName: selectedGuardian.lastName,
          phone: selectedGuardian.phone!,
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