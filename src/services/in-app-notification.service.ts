/**
 * In-App Notification Service
 * Handles creation, retrieval, and management of in-app notifications
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { prisma } from '../lib/db'
import {
  InAppNotification,
  CreateNotificationParams,
  NotificationOptions,
  NotificationList,
} from '../types/entities'
import { NotificationType, NotificationPriority } from '../types/enums'

export class InAppNotificationService {
  /**
   * Create a new in-app notification
   * Requirement 4.1: System creates notifications for alerts, reminders, and task-related messages
   */
  async createNotification(params: CreateNotificationParams): Promise<InAppNotification> {
    const notification = await prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        schoolId: params.schoolId,
        type: params.type,
        title: params.title,
        content: params.content,
        priority: params.priority || NotificationPriority.NORMAL,
        actionUrl: params.actionUrl,
        metadata: params.metadata,
      },
    })

    return {
      id: notification.id,
      userId: notification.userId,
      schoolId: notification.schoolId,
      type: notification.type as NotificationType,
      title: notification.title,
      content: notification.content,
      priority: notification.priority as NotificationPriority,
      isRead: notification.isRead,
      readAt: notification.readAt,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata as Record<string, unknown> | undefined,
      createdAt: notification.createdAt,
    }
  }

  /**
   * Get notifications for a user with pagination and filtering
   * Requirements 4.2, 4.5: Display notifications with unread count and priority sorting
   */
  async getNotifications(
    userId: string,
    options: NotificationOptions = {}
  ): Promise<NotificationList> {
    const {
      limit = 20,
      offset = 0,
      unreadOnly = false,
      type,
    } = options

    // Build where clause
    const where: any = { userId }
    
    if (unreadOnly) {
      where.isRead = false
    }
    
    if (type) {
      where.type = type
    }

    // Get notifications with priority sorting (high priority first, then by creation date)
    const notifications = await prisma.inAppNotification.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // HIGH -> NORMAL -> LOW
        { createdAt: 'desc' }, // Most recent first
      ],
      take: limit,
      skip: offset,
    })

    // Get total count
    const total = await prisma.inAppNotification.count({ where })

    // Get unread count
    const unreadCount = await prisma.inAppNotification.count({
      where: { userId, isRead: false },
    })

    return {
      notifications: notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        schoolId: notification.schoolId,
        type: notification.type as NotificationType,
        title: notification.title,
        content: notification.content,
        priority: notification.priority as NotificationPriority,
        isRead: notification.isRead,
        readAt: notification.readAt,
        actionUrl: notification.actionUrl,
        metadata: notification.metadata as Record<string, unknown> | undefined,
        createdAt: notification.createdAt,
      })),
      total,
      unreadCount,
    }
  }

  /**
   * Mark a single notification as read
   * Requirement 4.4: Support marking notifications as read individually
   */
  async markAsRead(notificationId: string): Promise<void> {
    await prisma.inAppNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Mark all notifications as read for a user
   * Requirement 4.4: Support marking notifications as read in bulk
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.inAppNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return result.count
  }

  /**
   * Get unread notification count for a user
   * Requirement 4.2: Display unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.inAppNotification.count({
      where: {
        userId,
        isRead: false,
      },
    })
  }

  /**
   * Delete a notification
   * Optional functionality for cleanup
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.inAppNotification.delete({
      where: { id: notificationId },
    })
  }

  /**
   * Create a high-priority notification
   * Requirement 4.5: High-priority notifications appear prominently
   */
  async createHighPriorityNotification(
    params: Omit<CreateNotificationParams, 'priority'>
  ): Promise<InAppNotification> {
    return this.createNotification({
      ...params,
      priority: NotificationPriority.HIGH,
    })
  }

  /**
   * Create an alert notification
   * Convenience method for creating alert-type notifications
   */
  async createAlert(
    userId: string,
    schoolId: string,
    title: string,
    content: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<InAppNotification> {
    return this.createNotification({
      userId,
      schoolId,
      type: NotificationType.ALERT,
      title,
      content,
      priority: NotificationPriority.HIGH,
      actionUrl,
      metadata,
    })
  }

  /**
   * Create a reminder notification
   * Convenience method for creating reminder-type notifications
   */
  async createReminder(
    userId: string,
    schoolId: string,
    title: string,
    content: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<InAppNotification> {
    return this.createNotification({
      userId,
      schoolId,
      type: NotificationType.REMINDER,
      title,
      content,
      priority: NotificationPriority.NORMAL,
      actionUrl,
      metadata,
    })
  }

  /**
   * Create a task notification
   * Convenience method for creating task-type notifications
   */
  async createTask(
    userId: string,
    schoolId: string,
    title: string,
    content: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<InAppNotification> {
    return this.createNotification({
      userId,
      schoolId,
      type: NotificationType.TASK,
      title,
      content,
      priority: NotificationPriority.NORMAL,
      actionUrl,
      metadata,
    })
  }

  /**
   * Get notifications by type for a user
   * Helper method for filtering by notification type
   */
  async getNotificationsByType(
    userId: string,
    type: NotificationType,
    limit = 10
  ): Promise<InAppNotification[]> {
    const result = await this.getNotifications(userId, { type, limit })
    return result.notifications
  }

  /**
   * Get recent notifications for a user
   * Helper method for getting the most recent notifications
   */
  async getRecentNotifications(
    userId: string,
    limit = 5
  ): Promise<InAppNotification[]> {
    const result = await this.getNotifications(userId, { limit })
    return result.notifications
  }

  /**
   * Get notifications sorted by priority
   * Requirement 4.5: High priority notifications appear first, sorted by priority then creation date
   */
  async getNotificationsByPriority(
    userId: string,
    limit = 20
  ): Promise<InAppNotification[]> {
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: [
        { priority: 'desc' }, // HIGH -> NORMAL -> LOW
        { createdAt: 'desc' }, // Most recent first within same priority
      ],
      take: limit,
    })

    return notifications.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      schoolId: notification.schoolId,
      type: notification.type as NotificationType,
      title: notification.title,
      content: notification.content,
      priority: notification.priority as NotificationPriority,
      isRead: notification.isRead,
      readAt: notification.readAt,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata as Record<string, unknown> | undefined,
      createdAt: notification.createdAt,
    }))
  }

  /**
   * Get high priority notifications only
   * Helper method for getting only high priority notifications
   */
  async getHighPriorityNotifications(
    userId: string,
    limit = 10
  ): Promise<InAppNotification[]> {
    const notifications = await prisma.inAppNotification.findMany({
      where: {
        userId,
        priority: NotificationPriority.HIGH,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return notifications.map(notification => ({
      id: notification.id,
      userId: notification.userId,
      schoolId: notification.schoolId,
      type: notification.type as NotificationType,
      title: notification.title,
      content: notification.content,
      priority: notification.priority as NotificationPriority,
      isRead: notification.isRead,
      readAt: notification.readAt,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata as Record<string, unknown> | undefined,
      createdAt: notification.createdAt,
    }))
  }

  /**
   * Get notification summary with counts by priority
   * Helper method for dashboard display
   */
  async getNotificationSummary(userId: string): Promise<{
    total: number
    unread: number
    byPriority: {
      high: number
      normal: number
      low: number
    }
  }> {
    const [total, unread, highCount, normalCount, lowCount] = await Promise.all([
      prisma.inAppNotification.count({ where: { userId } }),
      prisma.inAppNotification.count({ where: { userId, isRead: false } }),
      prisma.inAppNotification.count({
        where: { userId, priority: NotificationPriority.HIGH },
      }),
      prisma.inAppNotification.count({
        where: { userId, priority: NotificationPriority.NORMAL },
      }),
      prisma.inAppNotification.count({
        where: { userId, priority: NotificationPriority.LOW },
      }),
    ])

    return {
      total,
      unread,
      byPriority: {
        high: highCount,
        normal: normalCount,
        low: lowCount,
      },
    }
  }
}

// Export singleton instance
export const inAppNotificationService = new InAppNotificationService()