/**
 * Queue Monitor Service
 * Real-time monitoring and control of message queues
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7
 */
  
import { prisma } from '@/lib/db'
import {
  QueueStatus,
  QueuedMessage,
  QueueFilters,
  CancelResult,
  RetryResult,
  MessageChannel,
  QueueHealthStatus,
  QueuedMessageStatus,
  MessagePriority,
} from '@/types/communication-hub'
import { MessageStatus } from '@/types/enums'

export class QueueMonitorService {
  /**
   * Get current status of all message queues
   * Requirements: 7.1, 7.2
   */
  async getQueueStatus(): Promise<QueueStatus[]> {
    const channels = [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL]
    const queueStatuses: QueueStatus[] = []

    for (const channel of channels) {
      // Get queued and processing messages for this channel
      const queuedMessages = await prisma.message.findMany({
        where: {
          channel,
          status: { in: [MessageStatus.QUEUED, MessageStatus.SENT] },
        },
        orderBy: { createdAt: 'asc' },
      })

      // Calculate queue metrics
      const messageCount = queuedMessages.length
      const oldestMessage = queuedMessages[0]
      const oldestMessageAge = oldestMessage 
        ? Math.floor((Date.now() - oldestMessage.createdAt.getTime()) / 1000)
        : 0

      // Calculate processing rate (messages processed in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const recentlyProcessed = await prisma.message.count({
        where: {
          channel,
          status: { in: [MessageStatus.DELIVERED, MessageStatus.FAILED] },
          updatedAt: { gte: fiveMinutesAgo },
        },
      })
      const processingRate = recentlyProcessed // messages per 5 minutes

      // Determine health status
      const health = this.determineQueueHealth(oldestMessageAge, processingRate, messageCount)

      // Check if queue is paused (we'll implement this with a simple flag system)
      const isPaused = await this.isQueuePaused(channel)

      queueStatuses.push({
        channel,
        messageCount,
        oldestMessageAge,
        processingRate,
        health,
        isPaused,
      })
    }

    return queueStatuses
  }

  /**
   * Get queued messages with filtering
   * Requirements: 7.7
   */
  async getQueuedMessages(filters: QueueFilters): Promise<QueuedMessage[]> {
    const where: any = {
      status: { in: [MessageStatus.QUEUED, MessageStatus.SENT] },
    }

    if (filters.channel) {
      where.channel = filters.channel
    }

    if (filters.schoolId) {
      where.schoolId = filters.schoolId
    }

    // For priority filtering, we'll need to check if the message is critical
    // This would typically be stored in metadata or determined by template type
    if (filters.priority) {
      // For now, we'll use a simple heuristic based on template type
      if (filters.priority === MessagePriority.CRITICAL) {
        where.templateType = { in: ['EMERGENCY', 'DISCIPLINE_NOTICE'] }
      }
    }

    if (filters.status) {
      const statusMap = {
        [QueuedMessageStatus.PENDING]: MessageStatus.QUEUED,
        [QueuedMessageStatus.PROCESSING]: MessageStatus.SENT,
        [QueuedMessageStatus.FAILED]: MessageStatus.FAILED,
      }
      where.status = statusMap[filters.status]
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        school: { select: { name: true } },
        student: { 
          include: { 
            studentGuardians: { 
              where: { isPrimary: true },
              include: { guardian: { select: { phone: true, email: true, whatsappNumber: true } } }
            }
          }
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to prevent large responses
    })

    return messages.map(msg => {
      const guardian = msg.student.studentGuardians[0]?.guardian
      const recipient = this.getRecipientContact(msg.channel as MessageChannel, guardian)
      
      return {
        id: msg.id,
        schoolId: msg.schoolId,
        schoolName: msg.school.name,
        channel: msg.channel as MessageChannel,
        recipient,
        status: this.mapMessageStatusToQueuedStatus(msg.status as MessageStatus),
        priority: this.determinePriority(msg.templateType),
        createdAt: msg.createdAt,
        attempts: msg.retryCount,
        lastError: msg.errorMessage || undefined,
      }
    })
  }

  /**
   * Pause a specific queue channel
   * Requirements: 7.4
   */
  async pauseQueue(channel: MessageChannel): Promise<void> {
    // Store queue pause state in a simple key-value store or database
    // For now, we'll use a simple in-memory approach or database flag
    await this.setQueuePauseState(channel, true)
  }

  /**
   * Resume a specific queue channel
   * Requirements: 7.4
   */
  async resumeQueue(channel: MessageChannel): Promise<void> {
    await this.setQueuePauseState(channel, false)
  }

  /**
   * Cancel specific messages in queue
   * Requirements: 7.3
   */
  async cancelMessages(messageIds: string[]): Promise<CancelResult> {
    let canceledCount = 0
    const failedIds: string[] = []

    for (const messageId of messageIds) {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        })

        if (!message) {
          failedIds.push(messageId)
          continue
        }

        // Only cancel messages that are still queued or being sent
        if (message.status === MessageStatus.QUEUED || message.status === MessageStatus.SENT) {
          await prisma.message.update({
            where: { id: messageId },
            data: {
              status: MessageStatus.FAILED,
              errorMessage: 'Message cancelled by administrator',
              updatedAt: new Date(),
            },
          })
          canceledCount++
        } else {
          failedIds.push(messageId)
        }
      } catch (error) {
        failedIds.push(messageId)
      }
    }

    return {
      success: failedIds.length === 0,
      canceledCount,
      failedIds,
    }
  }

  /**
   * Retry failed messages
   * Requirements: 7.5
   */
  async retryFailedMessages(messageIds: string[]): Promise<RetryResult> {
    let retriedCount = 0
    const failedIds: string[] = []

    for (const messageId of messageIds) {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
        })

        if (!message) {
          failedIds.push(messageId)
          continue
        }

        // Only retry failed messages
        if (message.status === MessageStatus.FAILED) {
          await prisma.message.update({
            where: { id: messageId },
            data: {
              status: MessageStatus.QUEUED,
              errorMessage: null,
              retryCount: { increment: 1 },
              updatedAt: new Date(),
            },
          })
          retriedCount++
        } else {
          failedIds.push(messageId)
        }
      } catch (error) {
        failedIds.push(messageId)
      }
    }

    return {
      success: failedIds.length === 0,
      retriedCount,
      failedIds,
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Determine queue health based on metrics
   * Requirements: 7.2, 7.6
   */
  private determineQueueHealth(
    oldestMessageAge: number,
    processingRate: number,
    messageCount: number
  ): QueueHealthStatus {
    // Queue is stuck if oldest message is older than 30 minutes (1800 seconds)
    if (oldestMessageAge > 1800) {
      return QueueHealthStatus.STUCK
    }

    // Queue is slow if processing rate is very low and there are many messages
    if (processingRate < 1 && messageCount > 50) {
      return QueueHealthStatus.SLOW
    }

    return QueueHealthStatus.HEALTHY
  }

  /**
   * Check if a queue is paused
   */
  private async isQueuePaused(channel: MessageChannel): Promise<boolean> {
    // For now, we'll implement a simple check
    // In a full implementation, this would check a queue_pause_state table or Redis
    try {
      const pauseRecord = await prisma.communicationLog.findFirst({
        where: {
          channel,
          content: `QUEUE_PAUSED_${channel}`,
          status: 'QUEUED',
        },
        orderBy: { createdAt: 'desc' },
      })
      return !!pauseRecord
    } catch {
      return false
    }
  }

  /**
   * Set queue pause state
   */
  private async setQueuePauseState(channel: MessageChannel, isPaused: boolean): Promise<void> {
    // For now, we'll implement a simple state management
    // In a full implementation, this would use Redis or a dedicated queue_state table
    if (isPaused) {
      // Create a pause marker
      await prisma.communicationLog.create({
        data: {
          schoolId: 'system',
          messageId: `queue_pause_${channel}_${Date.now()}`,
          senderId: 'system',
          senderRole: 'SUPER_ADMIN',
          channel,
          recipientId: 'system',
          recipientType: 'STAFF',
          recipientContact: 'system',
          content: `QUEUE_PAUSED_${channel}`,
          status: 'QUEUED',
        },
      })
    } else {
      // Remove pause markers
      await prisma.communicationLog.deleteMany({
        where: {
          channel,
          content: `QUEUE_PAUSED_${channel}`,
          status: 'QUEUED',
        },
      })
    }
  }

  /**
   * Map MessageStatus to QueuedMessageStatus
   */
  private mapMessageStatusToQueuedStatus(status: MessageStatus): QueuedMessageStatus {
    switch (status) {
      case MessageStatus.QUEUED:
        return QueuedMessageStatus.PENDING
      case MessageStatus.SENT:
        return QueuedMessageStatus.PROCESSING
      case MessageStatus.FAILED:
        return QueuedMessageStatus.FAILED
      default:
        return QueuedMessageStatus.PENDING
    }
  }

  /**
   * Determine message priority based on template type
   */
  private determinePriority(templateType: string): MessagePriority {
    const criticalTypes = ['EMERGENCY', 'DISCIPLINE_NOTICE']
    const highTypes = ['ATTENDANCE_ALERT', 'FEES_REMINDER']
    
    if (criticalTypes.includes(templateType)) {
      return MessagePriority.CRITICAL
    }
    if (highTypes.includes(templateType)) {
      return MessagePriority.HIGH
    }
    return MessagePriority.NORMAL
  }

  /**
   * Get recipient contact based on channel
   */
  private getRecipientContact(
    channel: MessageChannel, 
    guardian?: { phone: string | null; email: string | null; whatsappNumber: string | null } | null
  ): string {
    if (!guardian) return 'Unknown'
    
    switch (channel) {
      case MessageChannel.SMS:
        return guardian.phone || 'No phone'
      case MessageChannel.WHATSAPP:
        return guardian.whatsappNumber || guardian.phone || 'No WhatsApp'
      case MessageChannel.EMAIL:
        return guardian.email || 'No email'
      default:
        return 'Unknown'
    }
  }
}

// Export singleton instance
export const queueMonitorService = new QueueMonitorService()