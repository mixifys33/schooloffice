/**
 * Fallback Service Tests
 * 
 * Unit tests for the Fallback Service functionality.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FallbackService } from '../../../src/services/fallback.service'
import { MessageChannel, MessageType } from '../../../src/types/enums'
import type { FallbackParams } from '../../../src/types/entities'

// Mock prisma
vi.mock('../../../src/lib/db', () => ({
  prisma: {
    fallbackConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    communicationLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    guardian: {
      findUnique: vi.fn(),
    },
    staff: {
      findUnique: vi.fn(),
    },
  },
}))

describe('FallbackService', () => {
  let fallbackService: FallbackService

  beforeEach(() => {
    fallbackService = new FallbackService()
    vi.clearAllMocks()
  })

  describe('determineFallbackChain', () => {
    it('should create fallback chain for SMS primary channel', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.SMS,
        recipientHasEmail: true,
        recipientHasPhone: true,
        messageType: MessageType.GENERAL,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([
        MessageChannel.SMS,
        MessageChannel.EMAIL,
      ])
    })

    it('should create fallback chain for SMS primary channel', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.SMS,
        recipientHasEmail: true,
        recipientHasPhone: true,
        messageType: MessageType.GENERAL,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([
        MessageChannel.SMS,
        MessageChannel.EMAIL,
      ])
    })

    it('should create fallback chain for Email primary channel', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.EMAIL,
        recipientHasEmail: true,
        recipientHasPhone: true,
        messageType: MessageType.GENERAL,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([
        MessageChannel.EMAIL,
        MessageChannel.SMS,
      ])
    })

    it('should prioritize SMS for emergency messages', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.EMAIL,
        recipientHasEmail: true,
        recipientHasPhone: true,
        messageType: MessageType.EMERGENCY,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([
        MessageChannel.SMS,
        MessageChannel.EMAIL,
      ])
    })

    it('should only include available channels', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.SMS,
        recipientHasEmail: false,
        recipientHasPhone: true,
        messageType: MessageType.GENERAL,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([MessageChannel.SMS])
    })

    it('should handle case where recipient has no capabilities', () => {
      const params: FallbackParams = {
        primaryChannel: MessageChannel.SMS,
        recipientHasEmail: false,
        recipientHasPhone: false,
        messageType: MessageType.GENERAL,
      }

      const chain = fallbackService.determineFallbackChain(params)

      expect(chain).toEqual([MessageChannel.SMS])
    })
  })

  describe('createDefaultFallbackConfig', () => {
    it('should create default fallback configuration', async () => {
      const mockConfig = {
        id: 'config-id',
        schoolId: 'school-123',
        enabled: true,
        fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
        maxAttempts: 3,
        retryDelayMinutes: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('../../../src/lib/db')
      vi.mocked(prisma.fallbackConfig.create).mockResolvedValue(mockConfig)

      const result = await fallbackService.createDefaultFallbackConfig('school-123')

      expect(result).toEqual(mockConfig)
      expect(prisma.fallbackConfig.create).toHaveBeenCalledWith({
        data: {
          schoolId: 'school-123',
          enabled: true,
          fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
          maxAttempts: 3,
          retryDelayMinutes: 5,
        },
      })
    })
  })

  describe('getFallbackConfig', () => {
    it('should return fallback configuration when it exists', async () => {
      const mockConfig = {
        id: 'config-id',
        schoolId: 'school-123',
        enabled: true,
        fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP],
        maxAttempts: 2,
        retryDelayMinutes: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('../../../src/lib/db')
      vi.mocked(prisma.fallbackConfig.findUnique).mockResolvedValue(mockConfig)

      const result = await fallbackService.getFallbackConfig('school-123')

      expect(result).toEqual(mockConfig)
      expect(prisma.fallbackConfig.findUnique).toHaveBeenCalledWith({
        where: { schoolId: 'school-123' },
      })
    })

    it('should return null when configuration does not exist', async () => {
      const { prisma } = await import('../../../src/lib/db')
      vi.mocked(prisma.fallbackConfig.findUnique).mockResolvedValue(null)

      const result = await fallbackService.getFallbackConfig('school-123')

      expect(result).toBeNull()
    })
  })

  describe('updateFallbackConfig', () => {
    it('should update existing fallback configuration', async () => {
      const mockUpdatedConfig = {
        id: 'config-id',
        schoolId: 'school-123',
        enabled: false,
        fallbackOrder: [MessageChannel.EMAIL],
        maxAttempts: 1,
        retryDelayMinutes: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('../../../src/lib/db')
      vi.mocked(prisma.fallbackConfig.upsert).mockResolvedValue(mockUpdatedConfig)

      const updateData = {
        enabled: false,
        fallbackOrder: [MessageChannel.EMAIL],
        maxAttempts: 1,
        retryDelayMinutes: 15,
      }

      const result = await fallbackService.updateFallbackConfig('school-123', updateData)

      expect(result).toEqual(mockUpdatedConfig)
      expect(prisma.fallbackConfig.upsert).toHaveBeenCalledWith({
        where: { schoolId: 'school-123' },
        update: {
          enabled: false,
          fallbackOrder: [MessageChannel.EMAIL],
          maxAttempts: 1,
          retryDelayMinutes: 15,
          updatedAt: expect.any(Date),
        },
        create: {
          schoolId: 'school-123',
          enabled: false,
          fallbackOrder: [MessageChannel.EMAIL],
          maxAttempts: 1,
          retryDelayMinutes: 15,
        },
      })
    })

    it('should create new configuration with defaults when updating non-existent config', async () => {
      const mockNewConfig = {
        id: 'new-config-id',
        schoolId: 'school-456',
        enabled: true,
        fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
        maxAttempts: 3,
        retryDelayMinutes: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const { prisma } = await import('../../../src/lib/db')
      vi.mocked(prisma.fallbackConfig.upsert).mockResolvedValue(mockNewConfig)

      const result = await fallbackService.updateFallbackConfig('school-456', {})

      expect(result).toEqual(mockNewConfig)
      expect(prisma.fallbackConfig.upsert).toHaveBeenCalledWith({
        where: { schoolId: 'school-456' },
        update: {
          enabled: undefined,
          fallbackOrder: undefined,
          maxAttempts: undefined,
          retryDelayMinutes: undefined,
          updatedAt: expect.any(Date),
        },
        create: {
          schoolId: 'school-456',
          enabled: true,
          fallbackOrder: [MessageChannel.SMS, MessageChannel.WHATSAPP, MessageChannel.EMAIL],
          maxAttempts: 3,
          retryDelayMinutes: 5,
        },
      })
    })
  })
})