/**
 * Message Log Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageLogService } from '../../../src/services/message-log.service'
import { MessageLogEntry } from '../../../src/types/entities'
import { DeliveryStatus, MessageChannel, RecipientType, Role } from '../../../src/types/enums'

// Mock prisma
vi.mock('../../../src/lib/db', () => ({
  prisma: {
    communicationLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('MessageLogService', () => {
  let service: MessageLogService
  let mockPrisma: any

  beforeEach(async () => {
    const { prisma } = await import('../../../src/lib/db')
    mockPrisma = vi.mocked(prisma)
    service = new MessageLogService()
    vi.clearAllMocks()
  })

  describe('Service Structure', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(MessageLogService)
    })

    it('should implement all required methods', () => {
      expect(typeof service.logMessage).toBe('function')
      expect(typeof service.getMessageLog).toBe('function')
      expect(typeof service.queryMessageLogs).toBe('function')
      expect(typeof service.updateMessageStatus).toBe('function')
      expect(typeof service.getDeliveryProof).toBe('function')
      expect(typeof service.exportMessageLogs).toBe('function')
    })
  })

  describe('logMessage', () => {
    it('should create a message log with initial status history', async () => {
      const mockEntry: MessageLogEntry = {
        schoolId: 'school123',
        messageId: 'msg123',
        senderId: 'user123',
        senderRole: Role.TEACHER,
        channel: MessageChannel.SMS,
        recipientId: 'recipient123',
        recipientType: RecipientType.GUARDIAN,
        recipientContact: '+256700000000',
        content: 'Test message',
        status: DeliveryStatus.QUEUED,
      }

      const mockCreatedLog = {
        id: 'log123',
        ...mockEntry,
        statusHistory: JSON.stringify([{
          status: DeliveryStatus.QUEUED,
          timestamp: new Date(),
        }]),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.communicationLog.create.mockResolvedValue(mockCreatedLog)

      const result = await service.logMessage(mockEntry)

      expect(mockPrisma.communicationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockEntry.schoolId,
          messageId: mockEntry.messageId,
          senderId: mockEntry.senderId,
          senderRole: mockEntry.senderRole,
          channel: mockEntry.channel,
          recipientId: mockEntry.recipientId,
          recipientType: mockEntry.recipientType,
          recipientContact: mockEntry.recipientContact,
          content: mockEntry.content,
          status: mockEntry.status,
          statusHistory: expect.any(String),
        }),
      })

      expect(result.id).toBe('log123')
      expect(result.messageId).toBe(mockEntry.messageId)
      expect(result.statusHistory).toHaveLength(1)
      expect(result.statusHistory[0].status).toBe(DeliveryStatus.QUEUED)
    })
  })

  describe('getMessageLog', () => {
    it('should return null when message log not found', async () => {
      mockPrisma.communicationLog.findUnique.mockResolvedValue(null)

      const result = await service.getMessageLog('nonexistent')

      expect(result).toBeNull()
      expect(mockPrisma.communicationLog.findUnique).toHaveBeenCalledWith({
        where: { messageId: 'nonexistent' },
      })
    })

    it('should return mapped message log when found', async () => {
      const mockLog = {
        id: 'log123',
        schoolId: 'school123',
        messageId: 'msg123',
        senderId: 'user123',
        senderRole: Role.TEACHER,
        channel: MessageChannel.SMS,
        recipientId: 'recipient123',
        recipientType: RecipientType.GUARDIAN,
        recipientContact: '+256700000000',
        content: 'Test message',
        status: DeliveryStatus.SENT,
        statusHistory: JSON.stringify([
          { status: DeliveryStatus.QUEUED, timestamp: new Date() },
          { status: DeliveryStatus.SENT, timestamp: new Date() },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.communicationLog.findUnique.mockResolvedValue(mockLog)

      const result = await service.getMessageLog('msg123')

      expect(result).not.toBeNull()
      expect(result!.messageId).toBe('msg123')
      expect(result!.statusHistory).toHaveLength(2)
    })
  })

  describe('updateMessageStatus', () => {
    it('should append new status to history without overwriting', async () => {
      const existingLog = {
        messageId: 'msg123',
        status: DeliveryStatus.QUEUED,
        statusHistory: JSON.stringify([
          { status: DeliveryStatus.QUEUED, timestamp: new Date() },
        ]),
      }

      mockPrisma.communicationLog.findUnique.mockResolvedValue(existingLog)
      mockPrisma.communicationLog.update.mockResolvedValue({})

      await service.updateMessageStatus('msg123', DeliveryStatus.SENT, 'Successfully sent')

      expect(mockPrisma.communicationLog.update).toHaveBeenCalledWith({
        where: { messageId: 'msg123' },
        data: {
          status: DeliveryStatus.SENT,
          statusReason: 'Successfully sent',
          statusHistory: expect.stringContaining(DeliveryStatus.QUEUED),
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should throw error when message log not found', async () => {
      mockPrisma.communicationLog.findUnique.mockResolvedValue(null)

      await expect(
        service.updateMessageStatus('nonexistent', DeliveryStatus.SENT)
      ).rejects.toThrow('Message log not found for messageId: nonexistent')
    })
  })

  describe('getDeliveryProof', () => {
    it('should generate delivery proof with all attempts', async () => {
      const mockLog = {
        messageId: 'msg123',
        channel: MessageChannel.SMS,
        recipientContact: '+256700000000',
        content: 'Test message',
        status: DeliveryStatus.DELIVERED,
        statusHistory: JSON.stringify([
          { status: DeliveryStatus.QUEUED, timestamp: new Date('2024-01-01T10:00:00Z') },
          { status: DeliveryStatus.SENT, timestamp: new Date('2024-01-01T10:01:00Z') },
          { status: DeliveryStatus.DELIVERED, timestamp: new Date('2024-01-01T10:02:00Z') },
        ]),
        createdAt: new Date('2024-01-01T10:00:00Z'),
      }

      mockPrisma.communicationLog.findUnique.mockResolvedValue(mockLog)

      const proof = await service.getDeliveryProof('msg123')

      expect(proof.messageId).toBe('msg123')
      expect(proof.channel).toBe(MessageChannel.SMS)
      expect(proof.finalStatus).toBe(DeliveryStatus.DELIVERED)
      expect(proof.statusHistory).toHaveLength(3)
      expect(proof.generatedAt).toBeInstanceOf(Date)
    })

    it('should throw error when message log not found', async () => {
      mockPrisma.communicationLog.findUnique.mockResolvedValue(null)

      await expect(
        service.getDeliveryProof('nonexistent')
      ).rejects.toThrow('Message log not found for messageId: nonexistent')
    })
  })

  describe('queryMessageLogs', () => {
    it('should query logs with filters and pagination', async () => {
      const mockLogs = [
        {
          id: 'log1',
          messageId: 'msg1',
          schoolId: 'school123',
          senderId: 'user123',
          senderRole: Role.TEACHER,
          channel: MessageChannel.SMS,
          recipientId: 'recipient1',
          recipientType: RecipientType.GUARDIAN,
          recipientContact: '+256700000001',
          content: 'Message 1',
          status: DeliveryStatus.DELIVERED,
          statusHistory: '[]',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(1)

      const result = await service.queryMessageLogs({
        schoolId: 'school123',
        channel: MessageChannel.SMS,
        limit: 10,
        offset: 0,
      })

      expect(result.logs).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.logs[0].messageId).toBe('msg1')
    })
  })

  describe('exportMessageLogs', () => {
    it('should export logs as CSV buffer', async () => {
      const mockLogs = [
        {
          id: 'log1',
          messageId: 'msg1',
          schoolId: 'school123',
          senderId: 'user123',
          senderRole: Role.TEACHER,
          channel: MessageChannel.SMS,
          recipientId: 'recipient1',
          recipientType: RecipientType.GUARDIAN,
          recipientContact: '+256700000001',
          content: 'Test message',
          status: DeliveryStatus.DELIVERED,
          statusHistory: '[]',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
      ]

      mockPrisma.communicationLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.communicationLog.count.mockResolvedValue(1)

      const buffer = await service.exportMessageLogs({ schoolId: 'school123' })

      expect(buffer).toBeInstanceOf(Buffer)
      const csvContent = buffer.toString('utf-8')
      expect(csvContent).toContain('Message ID')
      expect(csvContent).toContain('msg1')
      expect(csvContent).toContain('Test message')
    })
  })
})