/**
 * Enhanced Announcement Service
 * 
 * Handles announcements with targeting, scheduling, pinning, and delivery tracking.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { prisma } from '@/lib/db'
import {
  EnhancedAnnouncement,
  CreateEnhancedAnnouncementInput,
  AnnouncementDelivery,
  Recipient,
  TargetCriteria,
} from '@/types/entities'
import { 
  MessageChannel, 
  DeliveryStatus, 
  RecipientType,
  TargetType,
} from '@/types/enums'
import type { IEnhancedAnnouncementService } from '@/types/services'
import { targetingService } from './targeting.service'
import { messageLogService } from './message-log.service'
import { v4 as uuidv4 } from 'uuid'

/**
 * Announcement delivery result for tracking
 */
export interface AnnouncementDeliveryResult {
  announcementId: string
  totalRecipients: number
  deliveriesCreated: number
  errors: string[]
}

/**
 * Announcement filter options
 */
export interface EnhancedAnnouncementFilterOptions {
  startDate?: Date
  endDate?: Date
  isPublished?: boolean
  isPinned?: boolean
  includeExpired?: boolean
}

/**
 * Map Prisma EnhancedAnnouncement to domain type
 */
function mapPrismaToEntity(prismaAnnouncement: {
  id: string
  schoolId: string
  title: string
  content: string
  targetType: string
  targetCriteria: unknown
  channels: string[]
  isPinned: boolean
  pinnedUntil: Date | null
  scheduledAt: Date | null
  publishedAt: Date | null
  expiresAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}): EnhancedAnnouncement {
  return {
    id: prismaAnnouncement.id,
    schoolId: prismaAnnouncement.schoolId,
    title: prismaAnnouncement.title,
    content: prismaAnnouncement.content,
    targetType: prismaAnnouncement.targetType,
    targetCriteria: prismaAnnouncement.targetCriteria as TargetCriteria,
    channels: prismaAnnouncement.channels as MessageChannel[],
    isPinned: prismaAnnouncement.isPinned,
    pinnedUntil: prismaAnnouncement.pinnedUntil ?? undefined,
    scheduledAt: prismaAnnouncement.scheduledAt ?? undefined,
    publishedAt: prismaAnnouncement.publishedAt ?? undefined,
    expiresAt: prismaAnnouncement.expiresAt ?? undefined,
    createdBy: prismaAnnouncement.createdBy,
    createdAt: prismaAnnouncement.createdAt,
    updatedAt: prismaAnnouncement.updatedAt,
  }
}

/**
 * Map Prisma AnnouncementDelivery to domain type
 */
function mapDeliveryToEntity(prismaDelivery: {
  id: string
  announcementId: string
  recipientId: string
  recipientType: string
  channel: string
  status: string
  deliveredAt: Date | null
  readAt: Date | null
  createdAt: Date
}): AnnouncementDelivery {
  return {
    id: prismaDelivery.id,
    announcementId: prismaDelivery.announcementId,
    recipientId: prismaDelivery.recipientId,
    recipientType: prismaDelivery.recipientType as RecipientType,
    channel: prismaDelivery.channel as MessageChannel,
    status: prismaDelivery.status as DeliveryStatus,
    deliveredAt: prismaDelivery.deliveredAt ?? undefined,
    readAt: prismaDelivery.readAt ?? undefined,
    createdAt: prismaDelivery.createdAt,
  }
}

export class EnhancedAnnouncementService implements IEnhancedAnnouncementService {
  /**
   * Create a new enhanced announcement
   * Requirement 6.1: Allow setting target audience, channels, and schedule
   */
  async createAnnouncement(data: CreateEnhancedAnnouncementInput): Promise<EnhancedAnnouncement> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Validate targeting criteria
    const validationResult = await this.validateTargeting(data.schoolId, data.targetType, data.targetCriteria)
    if (!validationResult.isValid) {
      throw new Error(`Invalid targeting: ${validationResult.error}`)
    }

    // Validate channels
    if (!data.channels || data.channels.length === 0) {
      throw new Error('At least one channel must be specified')
    }

    // Create the announcement
    const announcement = await prisma.enhancedAnnouncement.create({
      data: {
        schoolId: data.schoolId,
        title: data.title,
        content: data.content,
        targetType: data.targetType,
        targetCriteria: data.targetCriteria as object,
        channels: data.channels,
        isPinned: data.isPinned ?? false,
        pinnedUntil: data.pinnedUntil,
        scheduledAt: data.scheduledAt,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
      },
    })

    return mapPrismaToEntity(announcement)
  }

  /**
   * Get an announcement by ID
   */
  async getAnnouncementById(id: string): Promise<EnhancedAnnouncement | null> {
    const announcement = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!announcement) {
      return null
    }

    return mapPrismaToEntity(announcement)
  }

  /**
   * Get all announcements for a school
   */
  async getAnnouncementsBySchool(
    schoolId: string,
    options?: EnhancedAnnouncementFilterOptions
  ): Promise<EnhancedAnnouncement[]> {
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

    if (options?.isPinned !== undefined) {
      whereClause.isPinned = options.isPinned
    }

    if (!options?.includeExpired) {
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ]
    }

    const announcements = await prisma.enhancedAnnouncement.findMany({
      where: whereClause,
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return announcements.map(mapPrismaToEntity)
  }

  /**
   * Update an announcement (only if not published)
   */
  async updateAnnouncement(
    id: string,
    data: Partial<CreateEnhancedAnnouncementInput>
  ): Promise<EnhancedAnnouncement> {
    const existing = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    if (existing.publishedAt) {
      throw new Error('Cannot update a published announcement')
    }

    // Validate targeting if being updated
    if (data.targetType || data.targetCriteria) {
      const targetType = data.targetType || existing.targetType
      const targetCriteria = data.targetCriteria || (existing.targetCriteria as TargetCriteria)
      const validationResult = await this.validateTargeting(existing.schoolId, targetType, targetCriteria)
      if (!validationResult.isValid) {
        throw new Error(`Invalid targeting: ${validationResult.error}`)
      }
    }

    const updated = await prisma.enhancedAnnouncement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.targetType && { targetType: data.targetType }),
        ...(data.targetCriteria && { targetCriteria: data.targetCriteria as object }),
        ...(data.channels && { channels: data.channels }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.pinnedUntil !== undefined && { pinnedUntil: data.pinnedUntil }),
        ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      },
    })

    return mapPrismaToEntity(updated)
  }

  /**
   * Publish an announcement and create delivery records
   * Requirement 6.4: Support immediate delivery
   * Requirement 6.5: Log all delivery attempts
   */
  async publishAnnouncement(id: string): Promise<EnhancedAnnouncement> {
    const announcement = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!announcement) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    if (announcement.publishedAt) {
      throw new Error('Announcement is already published')
    }

    // Update announcement as published
    const published = await prisma.enhancedAnnouncement.update({
      where: { id },
      data: { publishedAt: new Date() },
    })

    // Create delivery records for all recipients
    await this.createDeliveryRecords(published)

    return mapPrismaToEntity(published)
  }

  /**
   * Pin an announcement
   * Requirement 6.3: Support pinning functionality
   */
  async pinAnnouncement(id: string, pinnedUntil?: Date): Promise<EnhancedAnnouncement> {
    const announcement = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!announcement) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    const updated = await prisma.enhancedAnnouncement.update({
      where: { id },
      data: {
        isPinned: true,
        pinnedUntil: pinnedUntil || null,
      },
    })

    return mapPrismaToEntity(updated)
  }

  /**
   * Unpin an announcement
   * Requirement 6.3: Support pinning functionality
   */
  async unpinAnnouncement(id: string): Promise<EnhancedAnnouncement> {
    const announcement = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!announcement) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    const updated = await prisma.enhancedAnnouncement.update({
      where: { id },
      data: {
        isPinned: false,
        pinnedUntil: null,
      },
    })

    return mapPrismaToEntity(updated)
  }

  /**
   * Schedule an announcement for future delivery
   * Requirement 6.2: Support scheduled delivery
   */
  async scheduleAnnouncement(id: string, scheduledAt: Date): Promise<EnhancedAnnouncement> {
    const announcement = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!announcement) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    if (announcement.publishedAt) {
      throw new Error('Cannot schedule an already published announcement')
    }

    if (scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future')
    }

    const updated = await prisma.enhancedAnnouncement.update({
      where: { id },
      data: { scheduledAt },
    })

    return mapPrismaToEntity(updated)
  }

  /**
   * Process scheduled announcements that are due
   * Requirement 6.2: Send at the specified date and time
   */
  async processScheduledAnnouncements(): Promise<void> {
    const now = new Date()

    // Find all scheduled announcements that are due
    const dueAnnouncements = await prisma.enhancedAnnouncement.findMany({
      where: {
        scheduledAt: { lte: now },
        publishedAt: null,
      },
    })

    for (const announcement of dueAnnouncements) {
      try {
        await this.publishAnnouncement(announcement.id)
      } catch (error) {
        console.error(`Failed to publish scheduled announcement ${announcement.id}:`, error)
      }
    }
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    const existing = await prisma.enhancedAnnouncement.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error(`Announcement with id ${id} not found`)
    }

    await prisma.enhancedAnnouncement.delete({
      where: { id },
    })
  }

  /**
   * Get pinned announcements for a school
   */
  async getPinnedAnnouncements(schoolId: string): Promise<EnhancedAnnouncement[]> {
    const now = new Date()

    const announcements = await prisma.enhancedAnnouncement.findMany({
      where: {
        schoolId,
        isPinned: true,
        publishedAt: { not: null },
        OR: [
          { pinnedUntil: null },
          { pinnedUntil: { gt: now } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
    })

    return announcements.map(mapPrismaToEntity)
  }

  /**
   * Get draft announcements for a school
   */
  async getDraftAnnouncements(schoolId: string): Promise<EnhancedAnnouncement[]> {
    const announcements = await prisma.enhancedAnnouncement.findMany({
      where: {
        schoolId,
        publishedAt: null,
        scheduledAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    return announcements.map(mapPrismaToEntity)
  }

  /**
   * Get scheduled announcements for a school
   */
  async getScheduledAnnouncements(schoolId: string): Promise<EnhancedAnnouncement[]> {
    const announcements = await prisma.enhancedAnnouncement.findMany({
      where: {
        schoolId,
        publishedAt: null,
        scheduledAt: { not: null },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return announcements.map(mapPrismaToEntity)
  }

  // ============================================
  // DELIVERY TRACKING - Requirement 6.5
  // ============================================

  /**
   * Create delivery records for all recipients
   * Requirement 6.5: Log all delivery attempts
   */
  private async createDeliveryRecords(announcement: {
    id: string
    schoolId: string
    targetType: string
    targetCriteria: unknown
    channels: string[]
    title: string
    content: string
    createdBy: string
  }): Promise<AnnouncementDeliveryResult> {
    const result: AnnouncementDeliveryResult = {
      announcementId: announcement.id,
      totalRecipients: 0,
      deliveriesCreated: 0,
      errors: [],
    }

    try {
      // Resolve recipients using targeting service
      const recipients = await targetingService.resolveRecipients({
        schoolId: announcement.schoolId,
        targetType: announcement.targetType as TargetType,
        criteria: announcement.targetCriteria as TargetCriteria,
      })

      result.totalRecipients = recipients.length

      // Create delivery records for each recipient and channel
      for (const recipient of recipients) {
        for (const channel of announcement.channels) {
          try {
            await this.createDeliveryRecord(
              announcement.id,
              recipient,
              channel as MessageChannel
            )
            result.deliveriesCreated++

            // Log the delivery attempt
            await this.logDeliveryAttempt(
              announcement,
              recipient,
              channel as MessageChannel
            )
          } catch (error) {
            result.errors.push(
              `Failed to create delivery for recipient ${recipient.id} on ${channel}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }
    } catch (error) {
      result.errors.push(
        `Failed to resolve recipients: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return result
  }

  /**
   * Create a single delivery record
   */
  private async createDeliveryRecord(
    announcementId: string,
    recipient: Recipient,
    channel: MessageChannel
  ): Promise<AnnouncementDelivery> {
    const delivery = await prisma.announcementDelivery.create({
      data: {
        announcementId,
        recipientId: recipient.id,
        recipientType: recipient.type,
        channel,
        status: DeliveryStatus.QUEUED,
      },
    })

    return mapDeliveryToEntity(delivery)
  }

  /**
   * Log delivery attempt to message log
   * Requirement 6.5: Log all delivery attempts
   */
  private async logDeliveryAttempt(
    announcement: {
      id: string
      schoolId: string
      title: string
      content: string
      createdBy: string
    },
    recipient: Recipient,
    channel: MessageChannel
  ): Promise<void> {
    const messageId = uuidv4()
    const recipientContact = this.getRecipientContact(recipient, channel)

    if (!recipientContact) {
      return // Skip logging if no contact available for channel
    }

    try {
      await messageLogService.logMessage({
        schoolId: announcement.schoolId,
        messageId,
        senderId: announcement.createdBy,
        senderRole: 'SCHOOL_ADMIN', // Default role for announcements
        channel,
        recipientId: recipient.id,
        recipientType: recipient.type,
        recipientContact,
        content: `[Announcement] ${announcement.title}: ${announcement.content}`,
        status: DeliveryStatus.QUEUED,
        metadata: {
          announcementId: announcement.id,
          type: 'ANNOUNCEMENT',
        },
      })
    } catch (error) {
      console.error('Failed to log delivery attempt:', error)
    }
  }

  /**
   * Get recipient contact for a specific channel
   */
  private getRecipientContact(recipient: Recipient, channel: MessageChannel): string | null {
    switch (channel) {
      case MessageChannel.SMS:
        return recipient.phone || null
      case MessageChannel.WHATSAPP:
        return recipient.whatsappNumber || recipient.phone || null
      case MessageChannel.EMAIL:
        return recipient.email || null
      default:
        return null
    }
  }

  /**
   * Get delivery records for an announcement
   * Requirement 6.5: Track delivery status per recipient
   */
  async getDeliveryRecords(announcementId: string): Promise<AnnouncementDelivery[]> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'desc' },
    })

    return deliveries.map(mapDeliveryToEntity)
  }

  /**
   * Update delivery status
   * Requirement 6.5: Track delivery status per recipient
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    deliveredAt?: Date
  ): Promise<AnnouncementDelivery> {
    const delivery = await prisma.announcementDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        ...(deliveredAt && { deliveredAt }),
      },
    })

    return mapDeliveryToEntity(delivery)
  }

  /**
   * Mark delivery as read
   * Requirement 6.5: Track read status where available
   */
  async markDeliveryAsRead(deliveryId: string): Promise<AnnouncementDelivery> {
    const delivery = await prisma.announcementDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.READ,
        readAt: new Date(),
      },
    })

    return mapDeliveryToEntity(delivery)
  }

  /**
   * Get delivery statistics for an announcement
   */
  async getDeliveryStats(announcementId: string): Promise<{
    total: number
    queued: number
    sent: number
    delivered: number
    read: number
    failed: number
  }> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: { announcementId },
      select: { status: true },
    })

    const stats = {
      total: deliveries.length,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    }

    for (const delivery of deliveries) {
      switch (delivery.status) {
        case DeliveryStatus.QUEUED:
        case DeliveryStatus.SENDING:
          stats.queued++
          break
        case DeliveryStatus.SENT:
          stats.sent++
          break
        case DeliveryStatus.DELIVERED:
          stats.delivered++
          break
        case DeliveryStatus.READ:
          stats.read++
          break
        case DeliveryStatus.FAILED:
        case DeliveryStatus.BOUNCED:
          stats.failed++
          break
      }
    }

    return stats
  }

  /**
   * Get deliveries by recipient
   */
  async getDeliveriesByRecipient(recipientId: string): Promise<AnnouncementDelivery[]> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
    })

    return deliveries.map(mapDeliveryToEntity)
  }

  /**
   * Get unread deliveries for a recipient
   */
  async getUnreadDeliveries(recipientId: string): Promise<AnnouncementDelivery[]> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: {
        recipientId,
        readAt: null,
        status: { not: DeliveryStatus.FAILED },
      },
      orderBy: { createdAt: 'desc' },
    })

    return deliveries.map(mapDeliveryToEntity)
  }

  /**
   * Get unread count for a recipient
   * Requirement 6.5: Track read status where available
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    return prisma.announcementDelivery.count({
      where: {
        recipientId,
        readAt: null,
        status: { not: DeliveryStatus.FAILED },
      },
    })
  }

  /**
   * Mark all deliveries as read for a recipient
   * Requirement 6.5: Track read status where available
   */
  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await prisma.announcementDelivery.updateMany({
      where: {
        recipientId,
        readAt: null,
        status: { not: DeliveryStatus.FAILED },
      },
      data: {
        status: DeliveryStatus.READ,
        readAt: new Date(),
      },
    })

    return result.count
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(deliveryId: string): Promise<AnnouncementDelivery | null> {
    const delivery = await prisma.announcementDelivery.findUnique({
      where: { id: deliveryId },
    })

    if (!delivery) {
      return null
    }

    return mapDeliveryToEntity(delivery)
  }

  /**
   * Get deliveries by status for an announcement
   * Requirement 6.5: Track delivery status per recipient
   */
  async getDeliveriesByStatus(
    announcementId: string,
    status: DeliveryStatus
  ): Promise<AnnouncementDelivery[]> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: {
        announcementId,
        status,
      },
      orderBy: { createdAt: 'desc' },
    })

    return deliveries.map(mapDeliveryToEntity)
  }

  /**
   * Get failed deliveries for an announcement
   * Requirement 6.5: Track delivery status per recipient
   */
  async getFailedDeliveries(announcementId: string): Promise<AnnouncementDelivery[]> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: {
        announcementId,
        status: { in: [DeliveryStatus.FAILED, DeliveryStatus.BOUNCED] },
      },
      orderBy: { createdAt: 'desc' },
    })

    return deliveries.map(mapDeliveryToEntity)
  }

  /**
   * Retry failed deliveries for an announcement
   * Requirement 6.5: Track delivery status per recipient
   */
  async retryFailedDeliveries(announcementId: string): Promise<{
    retried: number
    errors: string[]
  }> {
    const failedDeliveries = await this.getFailedDeliveries(announcementId)
    const result = { retried: 0, errors: [] as string[] }

    for (const delivery of failedDeliveries) {
      try {
        await prisma.announcementDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.QUEUED,
          },
        })
        result.retried++
      } catch (error) {
        result.errors.push(
          `Failed to retry delivery ${delivery.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return result
  }

  /**
   * Get delivery summary by channel for an announcement
   * Requirement 6.5: Track delivery status per recipient
   */
  async getDeliverySummaryByChannel(announcementId: string): Promise<{
    [channel: string]: {
      total: number
      queued: number
      sent: number
      delivered: number
      read: number
      failed: number
    }
  }> {
    const deliveries = await prisma.announcementDelivery.findMany({
      where: { announcementId },
      select: { channel: true, status: true },
    })

    const summary: {
      [channel: string]: {
        total: number
        queued: number
        sent: number
        delivered: number
        read: number
        failed: number
      }
    } = {}

    for (const delivery of deliveries) {
      if (!summary[delivery.channel]) {
        summary[delivery.channel] = {
          total: 0,
          queued: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        }
      }

      summary[delivery.channel].total++

      switch (delivery.status) {
        case DeliveryStatus.QUEUED:
        case DeliveryStatus.SENDING:
          summary[delivery.channel].queued++
          break
        case DeliveryStatus.SENT:
          summary[delivery.channel].sent++
          break
        case DeliveryStatus.DELIVERED:
          summary[delivery.channel].delivered++
          break
        case DeliveryStatus.READ:
          summary[delivery.channel].read++
          break
        case DeliveryStatus.FAILED:
        case DeliveryStatus.BOUNCED:
          summary[delivery.channel].failed++
          break
      }
    }

    return summary
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate targeting criteria
   */
  private async validateTargeting(
    schoolId: string,
    targetType: string,
    targetCriteria: TargetCriteria
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const validation = await targetingService.validateTargeting({
        schoolId,
        targetType: targetType as TargetType,
        criteria: targetCriteria,
      })

      if (!validation.isValid) {
        return {
          isValid: false,
          error: validation.errors?.join(', ') || 'Invalid targeting criteria',
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Targeting validation failed',
      }
    }
  }

  /**
   * Check if announcement has expired
   */
  isExpired(announcement: EnhancedAnnouncement): boolean {
    if (!announcement.expiresAt) {
      return false
    }
    return announcement.expiresAt < new Date()
  }

  /**
   * Check if announcement is currently pinned
   */
  isCurrentlyPinned(announcement: EnhancedAnnouncement): boolean {
    if (!announcement.isPinned) {
      return false
    }
    if (!announcement.pinnedUntil) {
      return true
    }
    return announcement.pinnedUntil > new Date()
  }
}

// Export singleton instance
export const enhancedAnnouncementService = new EnhancedAnnouncementService()
