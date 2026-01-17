/**
 * Announcement Service
 * Handles announcements with targeting (role, class, school-wide) and delivery
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
import { prisma } from '@/lib/db'
import {
  Announcement,
  CreateAnnouncementInput,
} from '@/types'
import { Role, MessageTemplateType, MessageChannel } from '@/types/enums'

/**
 * Map Prisma Announcement to domain Announcement type
 */
function mapPrismaAnnouncementToDomain(prismaAnnouncement: {
  id: string
  schoolId: string
  title: string
  content: string
  targetRoles: string[]
  targetClasses: string[]
  isSchoolWide: boolean
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): Announcement {
  return {
    id: prismaAnnouncement.id,
    schoolId: prismaAnnouncement.schoolId,
    title: prismaAnnouncement.title,
    content: prismaAnnouncement.content,
    targetRoles: prismaAnnouncement.targetRoles as Role[],
    targetClasses: prismaAnnouncement.targetClasses,
    isSchoolWide: prismaAnnouncement.isSchoolWide,
    publishedAt: prismaAnnouncement.publishedAt ?? undefined,
    createdAt: prismaAnnouncement.createdAt,
    updatedAt: prismaAnnouncement.updatedAt,
  }
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  announcementId: string
  totalRecipients: number
  inAppDelivered: number
  smsQueued: number
  errors: string[]
}

/**
 * User notification record
 */
export interface UserNotification {
  id: string
  userId: string
  announcementId: string
  isRead: boolean
  readAt?: Date
  createdAt: Date
}

/**
 * Announcement filter options
 */
export interface AnnouncementFilterOptions {
  startDate?: Date
  endDate?: Date
  isPublished?: boolean
  targetRole?: Role
  targetClassId?: string
}

export class AnnouncementService {
  /**
   * Create a new announcement
   * Requirement 11.1: Allow targeting by role, class, or school-wide
   */
  async createAnnouncement(data: CreateAnnouncementInput): Promise<Announcement> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Validate target classes if provided
    if (data.targetClasses && data.targetClasses.length > 0) {
      const classes = await prisma.class.findMany({
        where: {
          id: { in: data.targetClasses },
          schoolId: data.schoolId,
        },
      })

      if (classes.length !== data.targetClasses.length) {
        throw new Error('One or more target classes not found or do not belong to this school')
      }
    }

    // Create the announcement
    const announcement = await prisma.announcement.create({
      data: {
        schoolId: data.schoolId,
        title: data.title,
        content: data.content,
        targetRoles: data.targetRoles || [],
        targetClasses: data.targetClasses || [],
        isSchoolWide: data.isSchoolWide ?? false,
      },
    })

    return mapPrismaAnnouncementToDomain(announcement)
  }

  /**
   * Get an announcement by ID
   */
  async getAnnouncementById(id: string): Promise<Announcement | null> {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    })

    if (!announcement) {
      return null
    }

    return mapPrismaAnnouncementToDomain(announcement)
  }

  /**
   * Get all announcements for a school
   */
  async getAnnouncementsBySchool(
    schoolId: string,
    options?: AnnouncementFilterOptions
  ): Promise<Announcement[]> {
    const whereClause: Record<string, unknown> = { schoolId }

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {}
      if (options.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = options.endDate
      }
    }

    if (options?.isPublished !== undefined) {
      if (options.isPublished) {
        whereClause.publishedAt = { not: null }
      } else {
        whereClause.publishedAt = null
      }
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }

  /**
   * Get announcements relevant to a specific user based on their role and class associations
   * Requirement 11.4: Display only notifications relevant to their role and associations
   */
  async getAnnouncementsForUser(
    userId: string,
    role: Role,
    classIds?: string[]
  ): Promise<Announcement[]> {
    // Get user's school
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    })

    if (!user) {
      return []
    }

    // Build query to find relevant announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId: user.schoolId,
        publishedAt: { not: null },
        OR: [
          // School-wide announcements
          { isSchoolWide: true },
          // Role-targeted announcements
          { targetRoles: { has: role } },
          // Class-targeted announcements (if user has class associations)
          ...(classIds && classIds.length > 0
            ? [{ targetClasses: { hasSome: classIds } }]
            : []),
        ],
      },
      orderBy: { publishedAt: 'desc' },
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }

  /**
   * Check if an announcement is relevant to a user
   * Pure function for testing
   */
  isAnnouncementRelevantToUser(
    announcement: Announcement,
    userRole: Role,
    userClassIds: string[]
  ): boolean {
    // School-wide announcements are relevant to everyone
    if (announcement.isSchoolWide) {
      return true
    }

    // Check if user's role is in target roles
    if (announcement.targetRoles.includes(userRole)) {
      return true
    }

    // Check if any of user's classes are in target classes
    if (userClassIds.some(classId => announcement.targetClasses.includes(classId))) {
      return true
    }

    return false
  }

  /**
   * Publish an announcement and optionally deliver via SMS
   * Requirement 11.2: Deliver via in-app notification and optionally SMS
   */
  async publishAnnouncement(
    id: string,
    sendSms: boolean = false
  ): Promise<NotificationDeliveryResult> {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        school: true,
      },
    })

    if (!announcement) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    if (announcement.publishedAt) {
      throw new Error('Announcement is already published')
    }

    // Update announcement as published
    await prisma.announcement.update({
      where: { id },
      data: { publishedAt: new Date() },
    })

    const result: NotificationDeliveryResult = {
      announcementId: id,
      totalRecipients: 0,
      inAppDelivered: 0,
      smsQueued: 0,
      errors: [],
    }

    // Get recipients based on targeting
    const recipients = await this.getAnnouncementRecipients(announcement)
    result.totalRecipients = recipients.length
    result.inAppDelivered = recipients.length // In-app is immediate

    // Send SMS if requested
    if (sendSms && recipients.length > 0) {
      try {
        const smsResult = await this.sendAnnouncementSms(announcement, recipients)
        result.smsQueued = smsResult.queued
        result.errors.push(...smsResult.errors)
      } catch (error) {
        result.errors.push(`SMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return result
  }

  /**
   * Get recipients for an announcement based on targeting
   */
  private async getAnnouncementRecipients(announcement: {
    schoolId: string
    targetRoles: string[]
    targetClasses: string[]
    isSchoolWide: boolean
  }): Promise<{ userId: string; role: Role; studentId?: string }[]> {
    const recipients: { userId: string; role: Role; studentId?: string }[] = []

    if (announcement.isSchoolWide) {
      // Get all active users in the school
      const users = await prisma.user.findMany({
        where: {
          schoolId: announcement.schoolId,
          isActive: true,
        },
        select: { id: true, role: true },
      })

      for (const user of users) {
        recipients.push({ userId: user.id, role: user.role as Role })
      }
    } else {
      // Get users by role
      if (announcement.targetRoles.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            schoolId: announcement.schoolId,
            isActive: true,
            role: { in: announcement.targetRoles as Role[] },
          },
          select: { id: true, role: true },
        })

        for (const user of users) {
          if (!recipients.find(r => r.userId === user.id)) {
            recipients.push({ userId: user.id, role: user.role as Role })
          }
        }
      }

      // Get students/parents by class
      if (announcement.targetClasses.length > 0) {
        const students = await prisma.student.findMany({
          where: {
            schoolId: announcement.schoolId,
            classId: { in: announcement.targetClasses },
            status: 'ACTIVE',
          },
          select: { id: true },
        })

        for (const student of students) {
          recipients.push({ userId: student.id, role: Role.STUDENT, studentId: student.id })
        }
      }
    }

    return recipients
  }

  /**
   * Send announcement via SMS to guardians
   * Requirement 11.2: Optionally SMS
   */
  private async sendAnnouncementSms(
    announcement: {
      id: string
      schoolId: string
      title: string
      content: string
      targetClasses: string[]
      isSchoolWide: boolean
    },
    recipients: { userId: string; role: Role; studentId?: string }[]
  ): Promise<{ queued: number; errors: string[] }> {
    const { communicationService } = await import('./communication.service')
    
    let queued = 0
    const errors: string[] = []

    // Get students to notify their guardians
    const studentIds = recipients
      .filter(r => r.studentId)
      .map(r => r.studentId as string)

    // If school-wide or targeting classes, get all students
    if (announcement.isSchoolWide || announcement.targetClasses.length > 0) {
      const students = await prisma.student.findMany({
        where: {
          schoolId: announcement.schoolId,
          ...(announcement.targetClasses.length > 0 && {
            classId: { in: announcement.targetClasses },
          }),
          status: 'ACTIVE',
        },
        select: { id: true },
      })

      for (const student of students) {
        if (!studentIds.includes(student.id)) {
          studentIds.push(student.id)
        }
      }
    }

    // Send messages to guardians
    for (const studentId of studentIds) {
      try {
        await communicationService.sendMessage({
          studentId,
          templateType: MessageTemplateType.GENERAL_ANNOUNCEMENT,
          data: {
            title: announcement.title,
            content: announcement.content,
          },
          priority: 'normal',
        })
        queued++
      } catch (error) {
        errors.push(`Failed to queue SMS for student ${studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { queued, errors }
  }

  /**
   * Update an announcement (only if not published)
   */
  async updateAnnouncement(
    id: string,
    data: Partial<CreateAnnouncementInput>
  ): Promise<Announcement> {
    const existing = await prisma.announcement.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    if (existing.publishedAt) {
      throw new Error('Cannot update a published announcement')
    }

    // Validate target classes if provided
    if (data.targetClasses && data.targetClasses.length > 0) {
      const classes = await prisma.class.findMany({
        where: {
          id: { in: data.targetClasses },
          schoolId: existing.schoolId,
        },
      })

      if (classes.length !== data.targetClasses.length) {
        throw new Error('One or more target classes not found or do not belong to this school')
      }
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.targetRoles !== undefined && { targetRoles: data.targetRoles }),
        ...(data.targetClasses !== undefined && { targetClasses: data.targetClasses }),
        ...(data.isSchoolWide !== undefined && { isSchoolWide: data.isSchoolWide }),
      },
    })

    return mapPrismaAnnouncementToDomain(updated)
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    const existing = await prisma.announcement.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    await prisma.announcement.delete({
      where: { id },
    })
  }

  /**
   * Get published announcements count by school
   */
  async getPublishedAnnouncementsCount(schoolId: string): Promise<number> {
    return prisma.announcement.count({
      where: {
        schoolId,
        publishedAt: { not: null },
      },
    })
  }

  /**
   * Get draft announcements for a school
   */
  async getDraftAnnouncements(schoolId: string): Promise<Announcement[]> {
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        publishedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }

  /**
   * Get recent announcements for a school (last 30 days)
   */
  async getRecentAnnouncements(schoolId: string, limit: number = 10): Promise<Announcement[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        publishedAt: {
          not: null,
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }


  /**
   * Get announcements by target role
   */
  async getAnnouncementsByRole(
    schoolId: string,
    role: Role
  ): Promise<Announcement[]> {
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        publishedAt: { not: null },
        OR: [
          { isSchoolWide: true },
          { targetRoles: { has: role } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }

  /**
   * Get announcements by target class
   */
  async getAnnouncementsByClass(
    schoolId: string,
    classId: string
  ): Promise<Announcement[]> {
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        publishedAt: { not: null },
        OR: [
          { isSchoolWide: true },
          { targetClasses: { has: classId } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    })

    return announcements.map(mapPrismaAnnouncementToDomain)
  }

  /**
   * Check if a user can view an announcement
   * Pure function for testing
   */
  canUserViewAnnouncement(
    announcement: Announcement,
    userRole: Role,
    userClassIds: string[],
    userSchoolId: string
  ): boolean {
    // Must be from the same school
    if (announcement.schoolId !== userSchoolId) {
      return false
    }

    // Must be published
    if (!announcement.publishedAt) {
      return false
    }

    return this.isAnnouncementRelevantToUser(announcement, userRole, userClassIds)
  }

  /**
   * Get unread announcement count for a user
   * This is a placeholder - in a full implementation, we'd track read status per user
   */
  async getUnreadAnnouncementCount(
    userId: string,
    role: Role,
    classIds?: string[]
  ): Promise<number> {
    const announcements = await this.getAnnouncementsForUser(userId, role, classIds)
    // In a full implementation, we'd filter by read status
    // For now, return total count of recent announcements (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return announcements.filter(a => 
      a.publishedAt && a.publishedAt >= sevenDaysAgo
    ).length
  }

  /**
   * Format announcement for SMS delivery
   * Keeps message concise for SMS character limits
   */
  formatAnnouncementForSms(title: string, content: string, maxLength: number = 160): string {
    const prefix = `[Announcement] ${title}: `
    const availableLength = maxLength - prefix.length
    
    if (content.length <= availableLength) {
      return `${prefix}${content}`
    }
    
    return `${prefix}${content.substring(0, availableLength - 3)}...`
  }

  /**
   * Validate announcement targeting
   * Ensures at least one targeting option is set
   */
  validateAnnouncementTargeting(data: CreateAnnouncementInput): { isValid: boolean; error?: string } {
    const hasRoleTargeting = data.targetRoles && data.targetRoles.length > 0
    const hasClassTargeting = data.targetClasses && data.targetClasses.length > 0
    const isSchoolWide = data.isSchoolWide === true

    if (!hasRoleTargeting && !hasClassTargeting && !isSchoolWide) {
      return {
        isValid: false,
        error: 'Announcement must target at least one role, class, or be school-wide',
      }
    }

    return { isValid: true }
  }
}

// Export singleton instance
export const announcementService = new AnnouncementService()
