/**
 * Template Renderer Service
 * Handles template variable replacement with actual student/guardian data
 * Ensures messages look professional and contain real information
 */

import { prisma } from '@/lib/db'
import { MessageTemplateType, MessageChannel, RecipientType } from '@/types/enums'
import { Recipient } from '@/types/entities'

export interface TemplateRenderData {
  studentName?: string
  studentId?: string
  balance?: string
  date?: string
  periods?: string
  className?: string
  average?: string
  position?: string
  description?: string
  link?: string
  content?: string
  schoolName?: string
  guardianName?: string
  amount?: string
  dueDate?: string
}

export interface RenderResult {
  success: boolean
  content?: string
  error?: string
}

export class TemplateRendererService {
  /**
   * Render template with actual data for a specific recipient
   */
  async renderTemplateForRecipient(
    templateContent: string,
    templateType: MessageTemplateType,
    recipient: Recipient,
    schoolId: string,
    additionalData?: Record<string, any>
  ): Promise<RenderResult> {
    try {
      // Get school information
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
      })

      if (!school) {
        return { success: false, error: 'School not found' }
      }

      // Prepare base data
      const renderData: TemplateRenderData = {
        schoolName: school.name,
        guardianName: recipient.name,
        date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY format
        ...additionalData
      }

      // Get student-specific data if recipient is a guardian
      if (recipient.type === RecipientType.GUARDIAN && recipient.studentId) {
        const studentData = await this.getStudentData(recipient.studentId, templateType)
        Object.assign(renderData, studentData)
      }

      // Render the template
      let content = templateContent

      // Replace all variables
      for (const [key, value] of Object.entries(renderData)) {
        if (value !== undefined && value !== null) {
          const regex = new RegExp(`{{${key}}}`, 'g')
          content = content.replace(regex, String(value))
        }
      }

      // Remove any unreplaced placeholders to avoid showing {{variable}} to users
      content = content.replace(/{{[^}]+}}/g, '[info not available]')

      return { success: true, content: content.trim() }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Template rendering failed' 
      }
    }
  }

  /**
   * Get student-specific data based on template type
   */
  private async getStudentData(studentId: string, templateType: MessageTemplateType): Promise<Partial<TemplateRenderData>> {
    const data: Partial<TemplateRenderData> = {}

    try {
      // Get basic student info
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          stream: true,
        }
      })

      if (!student) return data

      data.studentName = `${student.firstName} ${student.lastName}`
      data.studentId = student.admissionNumber || student.id
      data.className = student.class?.name || 'Unknown Class'

      // Get template-specific data
      switch (templateType) {
        case MessageTemplateType.FEES_REMINDER:
          const feeData = await this.getFeeData(studentId)
          Object.assign(data, feeData)
          break

        case MessageTemplateType.ATTENDANCE_ALERT:
          const attendanceData = await this.getAttendanceData(studentId)
          Object.assign(data, attendanceData)
          break

        case MessageTemplateType.REPORT_READY:
          const reportData = await this.getReportData(studentId)
          Object.assign(data, reportData)
          break

        case MessageTemplateType.MID_TERM_PROGRESS:
        case MessageTemplateType.TERM_SUMMARY:
          const academicData = await this.getAcademicData(studentId)
          Object.assign(data, academicData)
          break
      }

      return data
    } catch (error) {
      console.error('Error getting student data:', error)
      return data
    }
  }

  /**
   * Get fee-related data for the student
   */
  private async getFeeData(studentId: string): Promise<Partial<TemplateRenderData>> {
    try {
      // Get outstanding balance
      const feeRecords = await prisma.feeRecord.findMany({
        where: {
          studentId,
          isPaid: false
        },
        select: {
          amount: true,
          dueDate: true
        }
      })

      const totalBalance = feeRecords.reduce((sum: number, record: any) => sum + record.amount, 0)
      const nextDueDate = feeRecords
        .map((r: any) => r.dueDate)
        .filter(Boolean)
        .sort((a: any, b: any) => a!.getTime() - b!.getTime())[0]

      return {
        balance: `${totalBalance.toLocaleString()}`,
        amount: `${totalBalance.toLocaleString()}`,
        dueDate: nextDueDate ? nextDueDate.toLocaleDateString('en-GB') : 'Not set'
      }
    } catch (error) {
      return {
        balance: 'Contact school',
        amount: 'Contact school',
        dueDate: 'Contact school'
      }
    }
  }

  /**
   * Get attendance data for the student
   */
  private async getAttendanceData(studentId: string): Promise<Partial<TemplateRenderData>> {
    try {
      // Get today's attendance
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const attendance = await prisma.attendance.findFirst({
        where: {
          studentId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        include: {
          period: true
        }
      })

      return {
        date: today.toLocaleDateString('en-GB'),
        periods: attendance?.period?.name || 'All day'
      }
    } catch (error) {
      return {
        date: new Date().toLocaleDateString('en-GB'),
        periods: 'All day'
      }
    }
  }

  /**
   * Get report data for the student
   */
  private async getReportData(studentId: string): Promise<Partial<TemplateRenderData>> {
    try {
      // This would typically generate a secure link to the report
      // For now, we'll use a placeholder
      return {
        link: 'Visit school office for report'
      }
    } catch (error) {
      return {
        link: 'Visit school office for report'
      }
    }
  }

  /**
   * Get academic performance data
   */
  private async getAcademicData(studentId: string): Promise<Partial<TemplateRenderData>> {
    try {
      // Get latest marks/results
      const marks = await prisma.mark.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { value: true }
      })

      if (marks.length === 0) {
        return {
          average: 'Not available',
          position: 'Not available'
        }
      }

      const average = marks.reduce((sum: number, mark: any) => sum + mark.value, 0) / marks.length
      
      return {
        average: Math.round(average).toString(),
        position: 'Contact school' // Position calculation would be more complex
      }
    } catch (error) {
      return {
        average: 'Not available',
        position: 'Not available'
      }
    }
  }

  /**
   * Validate that a template has been properly rendered (no unreplaced variables)
   */
  validateRenderedTemplate(content: string): { isValid: boolean; unreplacedVariables: string[] } {
    const unreplacedMatches = content.match(/{{[^}]+}}/g)
    const unreplacedVariables = unreplacedMatches || []
    
    return {
      isValid: unreplacedVariables.length === 0,
      unreplacedVariables: unreplacedVariables.map(v => v.replace(/[{}]/g, ''))
    }
  }
}

export const templateRendererService = new TemplateRendererService()