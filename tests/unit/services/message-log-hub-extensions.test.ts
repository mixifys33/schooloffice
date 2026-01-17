/**
 * Message Log Service Communication Hub Extensions Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageLogService } from '../../../src/services/message-log.service'
import { MessageLogFilters } from '../../../src/types/communication-hub'
import { MessageChannel } from '../../../src/types/enums'

// Mock prisma
vi.mock('../../../src/lib/db', () => ({
  prisma: {
    communicationLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('MessageLogService - Communication Hub Extensions', () => {
  let service: MessageLogService
  let mockPrisma: any

  beforeEach(async () => {
    const { prisma } = await import('../../../src/lib/db')
    mockPrisma = vi.mocked(prisma)
    service = new MessageLogService()
    vi.clearAllMocks()
  })

  describe('getPaginatedMessageLogs', () => {
    it('should return paginated logs with Hub format', async () => {
      const mockLogs = [
        {
          id: 'log1',
          messageId: 'msg1',
          schoolId: 'school123',
          recipientContact: '+256700000001',
          channel: 'SMS',
          content: 'Test message',
          templateId: 'template1',
          status: 'DELIVERED',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:02:00Z'),
          school: { name: 'Test School' },
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(1)

      const filters: MessageLogFilters = {
        schoolId: 'school123',
        channel: MessageChannel.SMS,
      }

      const result = await service.getPaginatedMessageLogs(filters, 1, 50)

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.totalPages).toBe(1)
      
      const logEntry = result.data[0]
      expect(logEntry.id).toBe('log1')
      expect(logEntry.schoolName).toBe('Test School')
      expect(logEntry.recipient).toBe('+256700000001')
      expect(logEntry.channel).toBe('SMS')
      expect(logEntry.deliveredAt).toEqual(new Date('2024-01-01T10:02:00Z'))
    })

    it('should handle search query filtering', async () => {
      const mockLogs = [
        {
          id: 'log1',
          messageId: 'msg1',
          schoolId: 'school123',
          recipientContact: 'test@example.com',
          channel: 'EMAIL',
          content: 'Test email message',
          templateId: null,
          status: 'SENT',
          createdAt: new Date(),
          updatedAt: new Date(),
          school: { name: 'Test School' },
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(1)

      const filters: MessageLogFilters = {
        searchQuery: 'test@example.com',
      }

      await service.getPaginatedMessageLogs(filters)

      expect(mockPrisma.communicationLog.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              recipientContact: {
                contains: 'test@example.com',
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: 'test@example.com',
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should handle date range filtering', async () => {
      const mockLogs = []
      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(0)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const filters: MessageLogFilters = {
        dateRange: {
          start: startDate,
          end: endDate,
        },
      }

      await service.getPaginatedMessageLogs(filters)

      expect(mockPrisma.communicationLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })
  })

  describe('exportFilteredMessageLogs', () => {
    it('should export filtered logs as CSV', async () => {
      const mockLogs = [
        {
          id: 'log1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          schoolId: 'school123',
          recipientContact: '+256700000001',
          channel: 'SMS',
          content: 'Test message',
          templateId: 'template1',
          status: 'DELIVERED',
          updatedAt: new Date('2024-01-01T10:02:00Z'),
          school: { name: 'Test School' },
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)

      const filters: MessageLogFilters = {
        schoolId: 'school123',
      }

      const buffer = await service.exportFilteredMessageLogs(filters)

      expect(buffer).toBeInstanceOf(Buffer)
      const csvContent = buffer.toString('utf-8')
      
      // Check headers
      expect(csvContent).toContain('ID,Timestamp,School ID,School Name,Recipient,Channel,Content,Template Type,Status,Delivered At,Error Message')
      
      // Check data
      expect(csvContent).toContain('log1')
      expect(csvContent).toContain('Test School')
      expect(csvContent).toContain('+256700000001')
      expect(csvContent).toContain('Test message')
      expect(csvContent).toContain('DELIVERED')
    })

    it('should handle failed messages in export', async () => {
      const mockLogs = [
        {
          id: 'log1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          schoolId: 'school123',
          recipientContact: '+256700000001',
          channel: 'SMS',
          content: 'Test message',
          templateId: null,
          status: 'FAILED',
          statusReason: 'Network error',
          updatedAt: new Date('2024-01-01T10:02:00Z'),
          school: { name: 'Test School' },
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)

      const filters: MessageLogFilters = {
        status: 'FAILED',
      }

      const buffer = await service.exportFilteredMessageLogs(filters)
      const csvContent = buffer.toString('utf-8')
      
      expect(csvContent).toContain('FAILED')
      expect(csvContent).toContain('Network error')
    })
  })

  describe('searchMessageLogsByRecipient', () => {
    it('should search by recipient contact', async () => {
      const mockLogs = [
        {
          id: 'log1',
          messageId: 'msg1',
          schoolId: 'school123',
          recipientContact: '+256700000001',
          channel: 'SMS',
          content: 'Test message',
          templateId: null,
          status: 'SENT',
          createdAt: new Date(),
          updatedAt: new Date(),
          school: { name: 'Test School' },
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(1)

      const result = await service.searchMessageLogsByRecipient('+256700000001', 'school123')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].recipient).toBe('+256700000001')
      
      expect(mockPrisma.communicationLog.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school123',
          OR: [
            {
              recipientContact: {
                contains: '+256700000001',
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: '+256700000001',
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })
  })
})