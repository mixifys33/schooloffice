/**
 * Message Log Service
 * 
 * Provides immutable audit trail for all communications.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { prisma } from '../lib/db'
import {
  CommunicationLog,
  MessageLogEntry,
  MessageLogQuery,
  MessageLogResult,
  DeliveryProof,
  StatusHistoryEntry,
} from '../types/entities'
import {
  MessageLogFilters,
  PaginatedMessageLogs,
  MessageLogEntry as HubMessageLogEntry,
} from '../types/communication-hub'
import { DeliveryStatus } from '../types/enums'
import type { IMessageLogService } from '../types/services'

export class MessageLogService implements IMessageLogService {
  /**
   * Log a message with immutable record creation
   * Requirement 12.1: Record sender, channel, date/time, recipients, and delivery status
   * Requirement 12.4: Message log is immutable—records cannot be deleted or modified after creation
   */
  async logMessage(entry: MessageLogEntry): Promise<CommunicationLog> {
    // Create initial status history entry
    const initialStatusHistory: StatusHistoryEntry[] = [
      {
        status: entry.status,
        reason: entry.statusReason,
        timestamp: new Date(),
      },
    ]

    const logEntry = await prisma.communicationLog.create({
      data: {
        schoolId: entry.schoolId,
        messageId: entry.messageId,
        senderId: entry.senderId,
        senderRole: entry.senderRole,
        channel: entry.channel,
        recipientId: entry.recipientId,
        recipientType: entry.recipientType,
        recipientContact: entry.recipientContact,
        content: entry.content,
        templateId: entry.templateId,
        status: entry.status,
        statusReason: entry.statusReason,
        cost: entry.cost,
        externalMessageId: entry.externalMessageId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
        statusHistory: JSON.stringify(initialStatusHistory),
      },
    })

    return this.mapPrismaToEntity(logEntry)
  }

  /**
   * Get a specific message log by messageId
   */
  async getMessageLog(messageId: string): Promise<CommunicationLog | null> {
    const logEntry = await prisma.communicationLog.findUnique({
      where: { messageId },
    })

    if (!logEntry) {
      return null
    }

    return this.mapPrismaToEntity(logEntry)
  }

  /**
   * Query message logs with filters
   * Requirement 12.3: Support filtering by date range, channel, sender, and recipient
   */
  async queryMessageLogs(params: MessageLogQuery): Promise<MessageLogResult> {
    const {
      schoolId,
      dateFrom,
      dateTo,
      channel,
      status,
      senderId,
      recipientId,
      limit = 50,
      offset = 0,
    } = params

    // Build where clause
    const where: any = {
      schoolId,
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = dateFrom
      }
      if (dateTo) {
        where.createdAt.lte = dateTo
      }
    }

    if (channel) {
      where.channel = channel
    }

    if (status) {
      where.status = status
    }

    if (senderId) {
      where.senderId = senderId
    }

    if (recipientId) {
      where.recipientId = recipientId
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.communicationLog.count({ where }),
    ])

    return {
      logs: logs.map(log => this.mapPrismaToEntity(log)),
      total,
    }
  }

  /**
   * Update message status with immutable status history
   * Requirement 12.4: Status updates are appended to history rather than overwriting
   */
  async updateMessageStatus(
    messageId: string,
    status: DeliveryStatus,
    reason?: string
  ): Promise<void> {
    // Get current log entry
    const currentLog = await prisma.communicationLog.findUnique({
      where: { messageId },
    })

    if (!currentLog) {
      throw new Error(`Message log not found for messageId: ${messageId}`)
    }

    // Parse existing status history
    const existingHistory: StatusHistoryEntry[] = currentLog.statusHistory
      ? JSON.parse(currentLog.statusHistory as string)
      : []

    // Append new status to history (immutable append)
    const newStatusEntry: StatusHistoryEntry = {
      status,
      reason,
      timestamp: new Date(),
    }

    const updatedHistory = [...existingHistory, newStatusEntry]

    // Update the log with new status and appended history
    await prisma.communicationLog.update({
      where: { messageId },
      data: {
        status,
        statusReason: reason,
        statusHistory: JSON.stringify(updatedHistory),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Generate delivery proof document
   * Requirement 12.5: Generate proof document with all delivery attempts
   */
  async getDeliveryProof(messageId: string): Promise<DeliveryProof> {
    const logEntry = await prisma.communicationLog.findUnique({
      where: { messageId },
    })

    if (!logEntry) {
      throw new Error(`Message log not found for messageId: ${messageId}`)
    }

    const statusHistory: StatusHistoryEntry[] = logEntry.statusHistory
      ? JSON.parse(logEntry.statusHistory as string)
      : []

    return {
      messageId: logEntry.messageId,
      channel: logEntry.channel,
      recipientContact: logEntry.recipientContact,
      content: logEntry.content,
      statusHistory,
      finalStatus: logEntry.status,
      createdAt: logEntry.createdAt,
      generatedAt: new Date(),
    }
  }

  /**
   * Generate formatted delivery proof document as HTML
   * Requirement 12.5: Include timestamps and status history
   */
  async generateDeliveryProofDocument(messageId: string): Promise<string> {
    const proof = await this.getDeliveryProof(messageId)
    
    const statusHistoryHtml = proof.statusHistory
      .map(entry => `
        <tr>
          <td>${entry.status}</td>
          <td>${entry.reason || 'N/A'}</td>
          <td>${entry.timestamp.toISOString()}</td>
        </tr>
      `)
      .join('')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Message Delivery Proof - ${messageId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
            .content { margin: 20px 0; }
            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status-${proof.finalStatus.toLowerCase()} { 
              color: ${proof.finalStatus === 'DELIVERED' ? 'green' : proof.finalStatus === 'FAILED' ? 'red' : 'orange'}; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Message Delivery Proof</h1>
            <p><strong>Generated:</strong> ${proof.generatedAt.toISOString()}</p>
            <p><strong>Message ID:</strong> ${proof.messageId}</p>
          </div>
          
          <div class="content">
            <h2>Message Details</h2>
            <table>
              <tr><th>Channel</th><td>${proof.channel}</td></tr>
              <tr><th>Recipient Contact</th><td>${proof.recipientContact}</td></tr>
              <tr><th>Content</th><td>${proof.content}</td></tr>
              <tr><th>Final Status</th><td class="status-${proof.finalStatus.toLowerCase()}">${proof.finalStatus}</td></tr>
              <tr><th>Created At</th><td>${proof.createdAt.toISOString()}</td></tr>
            </table>

            <h2>Delivery Attempts History</h2>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${statusHistoryHtml}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><em>This document serves as proof of message delivery attempts and their outcomes.</em></p>
            <p><em>Generated by SchoolOffice Communication System on ${proof.generatedAt.toISOString()}</em></p>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate delivery proof as PDF buffer
   * Requirement 12.5: Generate proof document with all delivery attempts
   */
  async generateDeliveryProofPDF(messageId: string): Promise<Buffer> {
    // For now, return the HTML as buffer. In a real implementation,
    // you would use a library like puppeteer to convert HTML to PDF
    const htmlContent = await this.generateDeliveryProofDocument(messageId)
    return Buffer.from(htmlContent, 'utf-8')
  }

  /**
   * Export message logs to buffer (CSV format)
   * Requirement 12.5: Provide proof of delivery attempts and outcomes
   */
  async exportMessageLogs(params: MessageLogQuery): Promise<Buffer> {
    const result = await this.queryMessageLogs({
      ...params,
      limit: 10000, // Large limit for export
      offset: 0,
    })

    // Create CSV content
    const headers = [
      'Message ID',
      'School ID',
      'Sender ID',
      'Sender Role',
      'Channel',
      'Recipient ID',
      'Recipient Type',
      'Recipient Contact',
      'Content',
      'Status',
      'Status Reason',
      'Cost',
      'External Message ID',
      'Created At',
      'Updated At',
    ]

    const csvRows = [
      headers.join(','),
      ...result.logs.map(log => [
        log.messageId,
        log.schoolId,
        log.senderId,
        log.senderRole,
        log.channel,
        log.recipientId,
        log.recipientType,
        `"${log.recipientContact}"`,
        `"${log.content.replace(/"/g, '""')}"`, // Escape quotes in content
        log.status,
        log.statusReason || '',
        log.cost || '',
        log.externalMessageId || '',
        log.createdAt.toISOString(),
        log.updatedAt.toISOString(),
      ].join(',')),
    ]

    return Buffer.from(csvRows.join('\n'), 'utf-8')
  }

  // ============================================
  // COMMUNICATION HUB EXTENSIONS
  // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
  // ============================================

  /**
   * Get unified message logs across all channels for Communication Hub
   * Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7: Unified view, filtering, search, pagination
   */
  async getUnifiedMessageLogs(filters: MessageLogFilters): Promise<PaginatedMessageLogs> {
    const {
      schoolId,
      dateRange,
      channel,
      status,
      searchQuery,
    } = filters

    // Build where clause
    const where: any = {}

    // School filter - if provided, filter by specific school, otherwise get all schools
    if (schoolId) {
      where.schoolId = schoolId
    }

    // Date range filter
    if (dateRange) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    // Channel filter
    if (channel) {
      where.channel = channel
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Search by recipient phone/email
    if (searchQuery) {
      where.OR = [
        {
          recipientContact: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    // Default pagination
    const page = 1
    const pageSize = 50
    const offset = (page - 1) * pageSize

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: offset,
      }),
      prisma.communicationLog.count({ where }),
    ])

    // Map to Hub format
    const hubLogs: HubMessageLogEntry[] = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      schoolId: log.schoolId,
      schoolName: log.school?.name || 'Unknown School',
      recipient: log.recipientContact,
      channel: log.channel as any, // Cast to MessageChannel enum
      content: log.content,
      templateType: log.templateId || undefined,
      status: log.status,
      deliveredAt: log.status === 'DELIVERED' ? log.updatedAt : undefined,
      errorMessage: log.status === 'FAILED' ? log.statusReason : undefined,
    }))

    const totalPages = Math.ceil(total / pageSize)

    return {
      data: hubLogs,
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  /**
   * Get paginated message logs with advanced filtering and search
   * Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7: Unified view, filtering, search, pagination
   */
  async getPaginatedMessageLogs(
    filters: MessageLogFilters,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedMessageLogs> {
    const {
      schoolId,
      dateRange,
      channel,
      status,
      searchQuery,
    } = filters

    // Build where clause
    const where: any = {}

    // School filter - if provided, filter by specific school, otherwise get all schools
    if (schoolId) {
      where.schoolId = schoolId
    }

    // Date range filter
    if (dateRange) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    // Channel filter
    if (channel) {
      where.channel = channel
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Search by recipient phone/email or content
    if (searchQuery) {
      where.OR = [
        {
          recipientContact: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    const offset = (page - 1) * pageSize

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: offset,
      }),
      prisma.communicationLog.count({ where }),
    ])

    // Map to Hub format
    const hubLogs: HubMessageLogEntry[] = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      schoolId: log.schoolId,
      schoolName: log.school?.name || 'Unknown School',
      recipient: log.recipientContact,
      channel: log.channel as any, // Cast to MessageChannel enum
      content: log.content,
      templateType: log.templateId || undefined,
      status: log.status,
      deliveredAt: log.status === 'DELIVERED' ? log.updatedAt : undefined,
      errorMessage: log.status === 'FAILED' ? log.statusReason : undefined,
    }))

    const totalPages = Math.ceil(total / pageSize)

    return {
      data: hubLogs,
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  /**
   * Search message logs by recipient contact (phone/email)
   * Requirements 3.3, 3.5: Search by recipient phone/email
   */
  async searchMessageLogsByRecipient(
    searchQuery: string,
    schoolId?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedMessageLogs> {
    const filters: MessageLogFilters = {
      searchQuery,
      schoolId,
    }

    return this.getPaginatedMessageLogs(filters, page, pageSize)
  }

  /**
   * Export filtered message logs to CSV for Communication Hub
   * Requirements 3.4: Export functionality for filtered logs
   */
  async exportFilteredMessageLogs(filters: MessageLogFilters): Promise<Buffer> {
    const {
      schoolId,
      dateRange,
      channel,
      status,
      searchQuery,
    } = filters

    // Build where clause (same as getPaginatedMessageLogs)
    const where: any = {}

    if (schoolId) {
      where.schoolId = schoolId
    }

    if (dateRange) {
      where.createdAt = {}
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end
      }
    }

    if (channel) {
      where.channel = channel
    }

    if (status) {
      where.status = status
    }

    if (searchQuery) {
      where.OR = [
        {
          recipientContact: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
      ]
    }

    // Get all matching logs (no pagination for export)
    const logs = await prisma.communicationLog.findMany({
      where,
      include: {
        school: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Reasonable limit for export
    })

    // Create CSV content with Hub-specific headers
    const headers = [
      'ID',
      'Timestamp',
      'School ID',
      'School Name',
      'Recipient',
      'Channel',
      'Content',
      'Template Type',
      'Status',
      'Delivered At',
      'Error Message',
    ]

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.createdAt.toISOString(),
        log.schoolId,
        `"${log.school?.name || 'Unknown School'}"`,
        `"${log.recipientContact}"`,
        log.channel,
        `"${log.content.replace(/"/g, '""')}"`, // Escape quotes in content
        log.templateId || '',
        log.status,
        log.status === 'DELIVERED' ? log.updatedAt.toISOString() : '',
        log.status === 'FAILED' ? `"${(log.statusReason || '').replace(/"/g, '""')}"` : '',
      ].join(',')),
    ]

    return Buffer.from(csvRows.join('\n'), 'utf-8')
  }

  /**
   * Map Prisma model to entity interface
   */
  private mapPrismaToEntity(prismaLog: any): CommunicationLog {
    const statusHistory: StatusHistoryEntry[] = prismaLog.statusHistory
      ? JSON.parse(prismaLog.statusHistory)
      : []

    const fallbackAttempts = prismaLog.fallbackAttempts
      ? JSON.parse(prismaLog.fallbackAttempts)
      : undefined

    const metadata = prismaLog.metadata
      ? JSON.parse(prismaLog.metadata)
      : undefined

    return {
      id: prismaLog.id,
      schoolId: prismaLog.schoolId,
      messageId: prismaLog.messageId,
      senderId: prismaLog.senderId,
      senderRole: prismaLog.senderRole,
      channel: prismaLog.channel,
      recipientId: prismaLog.recipientId,
      recipientType: prismaLog.recipientType,
      recipientContact: prismaLog.recipientContact,
      content: prismaLog.content,
      templateId: prismaLog.templateId,
      status: prismaLog.status,
      statusReason: prismaLog.statusReason,
      cost: prismaLog.cost,
      externalMessageId: prismaLog.externalMessageId,
      fallbackAttempts,
      metadata,
      statusHistory,
      createdAt: prismaLog.createdAt,
      updatedAt: prismaLog.updatedAt,
    }
  }
}

// Export singleton instance
export const messageLogService = new MessageLogService()