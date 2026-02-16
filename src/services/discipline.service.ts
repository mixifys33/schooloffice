/**
 * Discipline Service
 * Handles discipline case recording, actions, and guardian notifications
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
import { prisma } from '@/lib/db'
import {
  DisciplineCase,
  CreateDisciplineCaseInput,
} from '@/types'
import { DisciplineType, DisciplineAction, MessageTemplateType } from '@/types/enums'
   
/**
 * Map Prisma DisciplineCase to domain DisciplineCase type
 */
function mapPrismaDisciplineCaseToDomain(prismaCase: {
  id: string
  studentId: string
  reportedBy: string
  incidentDate: Date
  description: string
  type: string
  action: string
  actionDuration: number | null
  parentNotified: boolean
  parentAcknowledged: boolean
  createdAt: Date
  updatedAt: Date
}): DisciplineCase {
  return {
    id: prismaCase.id,
    studentId: prismaCase.studentId,
    reportedBy: prismaCase.reportedBy,
    incidentDate: prismaCase.incidentDate,
    description: prismaCase.description,
    type: prismaCase.type as DisciplineType,
    action: prismaCase.action as DisciplineAction,
    actionDuration: prismaCase.actionDuration ?? undefined,
    parentNotified: prismaCase.parentNotified,
    parentAcknowledged: prismaCase.parentAcknowledged,
    createdAt: prismaCase.createdAt,
    updatedAt: prismaCase.updatedAt,
  }
}

/**
 * Behavioral history summary for a student
 */
export interface BehavioralHistorySummary {
  studentId: string
  totalCases: number
  byType: Record<DisciplineType, number>
  byAction: Record<DisciplineAction, number>
  recentCases: DisciplineCase[]
  suspensionDays: number
}

/**
 * Discipline notification content
 */
export interface DisciplineNotification {
  studentId: string
  studentName: string
  guardianId: string
  caseId: string
  incidentDate: Date
  description: string
  type: DisciplineType
  action: DisciplineAction
  actionDuration?: number
}

export class DisciplineService {
  /**
   * Create a new discipline case
   * Requirement 12.1: Store incident details, student involved, and reporting staff member
   * Requirement 12.2: Record action type (warning, suspension, etc.) and duration
   */
  async createCase(data: CreateDisciplineCaseInput): Promise<DisciplineCase> {
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      throw new Error(`Student with id ${data.studentId} not found`)
    }

    // Validate reporter (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: data.reportedBy },
    })

    if (!staff) {
      throw new Error(`Staff with id ${data.reportedBy} not found`)
    }

    // Create the discipline case
    const disciplineCase = await prisma.disciplineCase.create({
      data: {
        studentId: data.studentId,
        reportedBy: data.reportedBy,
        incidentDate: data.incidentDate,
        description: data.description,
        type: data.type,
        action: data.action,
        actionDuration: data.actionDuration,
        parentNotified: false,
        parentAcknowledged: false,
      },
    })

    const mappedCase = mapPrismaDisciplineCaseToDomain(disciplineCase)

    // Auto-notify guardian on suspension (Requirement 12.3)
    if (data.action === DisciplineAction.SUSPENSION) {
      await this.notifyGuardian(mappedCase.id)
    }

    return mappedCase
  }

  /**
   * Get a discipline case by ID
   */
  async getCaseById(id: string): Promise<DisciplineCase | null> {
    const disciplineCase = await prisma.disciplineCase.findUnique({
      where: { id },
    })

    if (!disciplineCase) {
      return null
    }

    return mapPrismaDisciplineCaseToDomain(disciplineCase)
  }

  /**
   * Get all discipline cases for a student
   * Requirement 12.4: Display complete behavioral record for that student
   */
  async getCasesByStudent(studentId: string): Promise<DisciplineCase[]> {
    const cases = await prisma.disciplineCase.findMany({
      where: { studentId },
      orderBy: { incidentDate: 'desc' },
    })

    return cases.map(mapPrismaDisciplineCaseToDomain)
  }

  /**
   * Update a discipline case
   * Requirement 12.2: Record action type and duration
   */
  async updateCase(
    id: string,
    data: Partial<CreateDisciplineCaseInput>
  ): Promise<DisciplineCase> {
    const existingCase = await prisma.disciplineCase.findUnique({
      where: { id },
    })

    if (!existingCase) {
      throw new Error(`Discipline case with id ${id} not found`)
    }

    const updatedCase = await prisma.disciplineCase.update({
      where: { id },
      data: {
        ...(data.incidentDate && { incidentDate: data.incidentDate }),
        ...(data.description && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.action && { action: data.action }),
        ...(data.actionDuration !== undefined && { actionDuration: data.actionDuration }),
      },
    })

    const mappedCase = mapPrismaDisciplineCaseToDomain(updatedCase)

    // If action changed to suspension and guardian not yet notified, notify them
    if (
      data.action === DisciplineAction.SUSPENSION &&
      !existingCase.parentNotified
    ) {
      await this.notifyGuardian(id)
    }

    return mappedCase
  }

  /**
   * Notify guardian about a discipline case
   * Requirement 12.3: Notify student's guardians automatically on suspension
   */
  async notifyGuardian(caseId: string): Promise<void> {
    const disciplineCase = await prisma.disciplineCase.findUnique({
      where: { id: caseId },
      include: {
        student: {
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true },
            },
          },
        },
      },
    })

    if (!disciplineCase) {
      throw new Error(`Discipline case with id ${caseId} not found`)
    }

    const student = disciplineCase.student
    const primaryGuardianLink = student.studentGuardians[0]

    if (!primaryGuardianLink) {
      // No primary guardian to notify, mark as notified anyway
      await prisma.disciplineCase.update({
        where: { id: caseId },
        data: { parentNotified: true },
      })
      return
    }

    const guardian = primaryGuardianLink.guardian
    const studentName = `${student.firstName} ${student.lastName}`

    // Create notification content
    const notification: DisciplineNotification = {
      studentId: student.id,
      studentName,
      guardianId: guardian.id,
      caseId,
      incidentDate: disciplineCase.incidentDate,
      description: disciplineCase.description,
      type: disciplineCase.type as DisciplineType,
      action: disciplineCase.action as DisciplineAction,
      actionDuration: disciplineCase.actionDuration ?? undefined,
    }

    // Queue notification via communication service
    try {
      const { communicationService } = await import('./communication.service')
      
      await communicationService.sendMessage({
        studentId: student.id,
        templateType: MessageTemplateType.DISCIPLINE_NOTICE,
        data: {
          studentName: notification.studentName,
          incidentDate: notification.incidentDate.toLocaleDateString('en-UG'),
          description: notification.description,
          type: notification.type,
          action: notification.action,
          actionDuration: notification.actionDuration,
          durationText: notification.actionDuration 
            ? `Duration: ${notification.actionDuration} day(s)` 
            : '',
        },
        priority: 'normal',
      })

      // Mark as notified
      await prisma.disciplineCase.update({
        where: { id: caseId },
        data: { parentNotified: true },
      })
    } catch (error) {
      // Log error but don't fail the operation
      console.error(`Failed to send discipline notification for case ${caseId}:`, error)
    }
  }

  /**
   * Mark a discipline case as acknowledged by guardian
   */
  async acknowledgeByGuardian(caseId: string): Promise<DisciplineCase> {
    const disciplineCase = await prisma.disciplineCase.findUnique({
      where: { id: caseId },
    })

    if (!disciplineCase) {
      throw new Error(`Discipline case with id ${caseId} not found`)
    }

    const updatedCase = await prisma.disciplineCase.update({
      where: { id: caseId },
      data: { parentAcknowledged: true },
    })

    return mapPrismaDisciplineCaseToDomain(updatedCase)
  }

  /**
   * Get complete behavioral history for a student
   * Requirement 12.4: Display complete behavioral record
   */
  async getBehavioralHistory(studentId: string): Promise<BehavioralHistorySummary> {
    const cases = await this.getCasesByStudent(studentId)

    // Initialize counters
    const byType: Record<DisciplineType, number> = {
      [DisciplineType.MINOR]: 0,
      [DisciplineType.MAJOR]: 0,
      [DisciplineType.CRITICAL]: 0,
    }

    const byAction: Record<DisciplineAction, number> = {
      [DisciplineAction.WARNING]: 0,
      [DisciplineAction.DETENTION]: 0,
      [DisciplineAction.SUSPENSION]: 0,
      [DisciplineAction.EXPULSION]: 0,
    }

    let suspensionDays = 0

    // Count cases by type and action
    for (const disciplineCase of cases) {
      byType[disciplineCase.type]++
      byAction[disciplineCase.action]++

      if (disciplineCase.action === DisciplineAction.SUSPENSION && disciplineCase.actionDuration) {
        suspensionDays += disciplineCase.actionDuration
      }
    }

    // Get recent cases (last 5)
    const recentCases = cases.slice(0, 5)

    return {
      studentId,
      totalCases: cases.length,
      byType,
      byAction,
      recentCases,
      suspensionDays,
    }
  }

  /**
   * Get discipline cases by school
   */
  async getCasesBySchool(
    schoolId: string,
    options?: {
      startDate?: Date
      endDate?: Date
      type?: DisciplineType
      action?: DisciplineAction
    }
  ): Promise<DisciplineCase[]> {
    const whereClause: Record<string, unknown> = {
      student: { schoolId },
    }

    if (options?.startDate || options?.endDate) {
      whereClause.incidentDate = {}
      if (options.startDate) {
        (whereClause.incidentDate as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (whereClause.incidentDate as Record<string, Date>).lte = options.endDate
      }
    }

    if (options?.type) {
      whereClause.type = options.type
    }

    if (options?.action) {
      whereClause.action = options.action
    }

    const cases = await prisma.disciplineCase.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
    })

    return cases.map(mapPrismaDisciplineCaseToDomain)
  }

  /**
   * Get pending notifications (cases where guardian hasn't been notified)
   */
  async getPendingNotifications(schoolId: string): Promise<DisciplineCase[]> {
    const cases = await prisma.disciplineCase.findMany({
      where: {
        student: { schoolId },
        parentNotified: false,
        action: DisciplineAction.SUSPENSION,
      },
      orderBy: { createdAt: 'asc' },
    })

    return cases.map(mapPrismaDisciplineCaseToDomain)
  }

  /**
   * Get unacknowledged cases for a school
   */
  async getUnacknowledgedCases(schoolId: string): Promise<DisciplineCase[]> {
    const cases = await prisma.disciplineCase.findMany({
      where: {
        student: { schoolId },
        parentNotified: true,
        parentAcknowledged: false,
      },
      orderBy: { createdAt: 'asc' },
    })

    return cases.map(mapPrismaDisciplineCaseToDomain)
  }

  /**
   * Format discipline notification content for messaging
   */
  formatDisciplineNotificationContent(notification: DisciplineNotification): string {
    const dateStr = notification.incidentDate.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let content = `Dear Parent/Guardian,

We are writing to inform you about a discipline matter concerning your child, ${notification.studentName}.

Incident Date: ${dateStr}
Type: ${notification.type}
Action Taken: ${notification.action}`

    if (notification.actionDuration) {
      content += `\nDuration: ${notification.actionDuration} day(s)`
    }

    content += `

Description: ${notification.description}

Please contact the school administration if you have any questions or concerns.

Thank you,
School Administration`

    return content
  }

  /**
   * Check if a student has active suspension
   */
  async hasActiveSuspension(studentId: string): Promise<boolean> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeSuspensions = await prisma.disciplineCase.findMany({
      where: {
        studentId,
        action: DisciplineAction.SUSPENSION,
        actionDuration: { not: null },
      },
    })

    for (const suspension of activeSuspensions) {
      if (suspension.actionDuration) {
        const suspensionEnd = new Date(suspension.incidentDate)
        suspensionEnd.setDate(suspensionEnd.getDate() + suspension.actionDuration)
        
        if (today <= suspensionEnd) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Get suspension end date for a student
   */
  async getSuspensionEndDate(studentId: string): Promise<Date | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activeSuspensions = await prisma.disciplineCase.findMany({
      where: {
        studentId,
        action: DisciplineAction.SUSPENSION,
        actionDuration: { not: null },
      },
      orderBy: { incidentDate: 'desc' },
    })

    for (const suspension of activeSuspensions) {
      if (suspension.actionDuration) {
        const suspensionEnd = new Date(suspension.incidentDate)
        suspensionEnd.setDate(suspensionEnd.getDate() + suspension.actionDuration)
        
        if (today <= suspensionEnd) {
          return suspensionEnd
        }
      }
    }

    return null
  }
}

// Export singleton instance
export const disciplineService = new DisciplineService()
