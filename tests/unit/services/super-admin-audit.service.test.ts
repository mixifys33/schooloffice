/**
 * Super Admin Audit Service Unit Tests
 * Tests for super admin audit logging service
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  SuperAdminAuditService,
  SuperAdminAuditImmutabilityError,
} from '@/services/super-admin-audit.service'
import { prisma } from '@/lib/db'
import { ActionType } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    superAdminAuditLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('SuperAdminAuditService', () => {
  let auditService: SuperAdminAuditService

  beforeEach(() => {
    auditService = new SuperAdminAuditService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logAction', () => {
    it('should create audit log entry with all required fields (Requirement 9.1)', async () => {
      // Arrange
      const mockAuditLog = {
        id: 'audit-123',
        timestamp: new Date(),
        adminId: 'admin-456',
        adminEmail: 'admin@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-789',
        targetSchoolName: 'Test School',
        reason: 'Non-payment',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { previousStatus: 'active' },
      }

      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue(mockAuditLog)

      // Act
      const result = await auditService.logAction({
        adminId: 'admin-456',
        adminEmail: 'admin@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-789',
        targetSchoolName: 'Test School',
        reason: 'Non-payment',
        result: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { previousStatus: 'active' },
      })

      // Assert
      expect(result).toEqual(mockAuditLog)
      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 'admin-456',
          adminEmail: 'admin@example.com',
          actionType: ActionType.SUSPEND,
          targetSchoolId: 'school-789',
          targetSchoolName: 'Test School',
          reason: 'Non-payment',
          result: 'success',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: { previousStatus: 'active' },
        }),
      })
    })

    it('should create audit log entry with failure result', async () => {
      // Arrange
      const mockAuditLog = {
        id: 'audit-124',
        timestamp: new Date(),
        adminId: 'admin-456',
        adminEmail: 'admin@example.com',
        actionType: ActionType.REACTIVATE,
        targetSchoolId: 'school-789',
        targetSchoolName: 'Test School',
        reason: 'Restore access',
        result: 'failure',
        errorMessage: 'School not found',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue(mockAuditLog)

      // Act
      const result = await auditService.logAction({
        adminId: 'admin-456',
        adminEmail: 'admin@example.com',
        actionType: ActionType.REACTIVATE,
        targetSchoolId: 'school-789',
        targetSchoolName: 'Test School',
        reason: 'Restore access',
        result: 'failure',
        errorMessage: 'School not found',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      // Assert
      expect(result.result).toBe('failure')
      expect(result.errorMessage).toBe('School not found')
    })
  })

  describe('Immutability Enforcement (Requirement 9.2)', () => {
    it('should throw error when attempting to update audit log', async () => {
      // Act & Assert
      await expect(
        auditService.updateAuditLog('audit-123', { reason: 'Updated reason' })
      ).rejects.toThrow(SuperAdminAuditImmutabilityError)
    })

    it('should throw error when attempting to delete audit log', async () => {
      // Act & Assert
      await expect(auditService.deleteAuditLog('audit-123')).rejects.toThrow(
        SuperAdminAuditImmutabilityError
      )
    })

    it('should throw error when attempting to bulk delete audit logs', async () => {
      // Act & Assert
      await expect(auditService.deleteAuditLogs({})).rejects.toThrow(
        SuperAdminAuditImmutabilityError
      )
    })

    it('should verify immutability is enforced', () => {
      // Act
      const result = auditService.verifyImmutability()

      // Assert
      expect(result.isImmutable).toBe(true)
      expect(result.message).toContain('immutable')
    })
  })

  describe('getSchoolAuditLog (Requirement 9.3)', () => {
    it('should retrieve audit logs for a specific school', async () => {
      // Arrange
      const schoolId = 'school-789'
      const mockLogs = [
        {
          id: 'audit-1',
          timestamp: new Date('2024-01-15'),
          adminId: 'admin-1',
          adminEmail: 'admin1@example.com',
          actionType: ActionType.SUSPEND,
          targetSchoolId: schoolId,
          targetSchoolName: 'Test School',
          reason: 'Non-payment',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
        {
          id: 'audit-2',
          timestamp: new Date('2024-01-10'),
          adminId: 'admin-2',
          adminEmail: 'admin2@example.com',
          actionType: ActionType.REACTIVATE,
          targetSchoolId: schoolId,
          targetSchoolName: 'Test School',
          reason: 'Payment received',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
      ]

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(mockLogs)

      // Act
      const result = await auditService.getSchoolAuditLog(schoolId, 50, 0)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].targetSchoolId).toBe(schoolId)
      expect(result[1].targetSchoolId).toBe(schoolId)
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: { targetSchoolId: schoolId },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should support pagination for school audit logs', async () => {
      // Arrange
      const schoolId = 'school-789'
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getSchoolAuditLog(schoolId, 20, 40)

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: { targetSchoolId: schoolId },
        orderBy: { timestamp: 'desc' },
        take: 20,
        skip: 40,
      })
    })
  })

  describe('getGlobalAuditLog (Requirement 9.4)', () => {
    it('should retrieve all audit logs without filters', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'audit-1',
          timestamp: new Date(),
          adminId: 'admin-1',
          adminEmail: 'admin1@example.com',
          actionType: ActionType.SUSPEND,
          targetSchoolId: 'school-1',
          targetSchoolName: 'School 1',
          reason: 'Test',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
      ]

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(mockLogs)

      // Act
      const result = await auditService.getGlobalAuditLog({}, 100, 0)

      // Assert
      expect(result).toHaveLength(1)
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should filter by admin ID', async () => {
      // Arrange
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getGlobalAuditLog({ adminId: 'admin-123' }, 100, 0)

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: { adminId: 'admin-123' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should filter by action type', async () => {
      // Arrange
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getGlobalAuditLog({ actionType: ActionType.SUSPEND }, 100, 0)

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: { actionType: ActionType.SUSPEND },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should filter by result status', async () => {
      // Arrange
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getGlobalAuditLog({ result: 'failure' }, 100, 0)

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: { result: 'failure' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should filter by date range', async () => {
      // Arrange
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getGlobalAuditLog({ dateFrom, dateTo }, 100, 0)

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should combine multiple filters', async () => {
      // Arrange
      const dateFrom = new Date('2024-01-01')
      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue([])

      // Act
      await auditService.getGlobalAuditLog(
        {
          adminId: 'admin-123',
          actionType: ActionType.SUSPEND,
          result: 'success',
          dateFrom,
        },
        100,
        0
      )

      // Assert
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          adminId: 'admin-123',
          actionType: ActionType.SUSPEND,
          result: 'success',
          timestamp: {
            gte: dateFrom,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      })
    })
  })

  describe('Display Requirements (Requirement 9.5)', () => {
    it('should include super admin name (email) in audit log', async () => {
      // Arrange
      const mockLog = {
        id: 'audit-1',
        timestamp: new Date(),
        adminId: 'admin-1',
        adminEmail: 'john.doe@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Non-payment',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.findUnique).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.getAuditLogById('audit-1')

      // Assert
      expect(result?.adminEmail).toBe('john.doe@example.com')
    })

    it('should include action description (actionType) in audit log', async () => {
      // Arrange
      const mockLog = {
        id: 'audit-1',
        timestamp: new Date(),
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        actionType: ActionType.REACTIVATE,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Payment received',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.findUnique).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.getAuditLogById('audit-1')

      // Assert
      expect(result?.actionType).toBe(ActionType.REACTIVATE)
    })

    it('should include timestamp in audit log', async () => {
      // Arrange
      const timestamp = new Date('2024-01-15T10:30:00Z')
      const mockLog = {
        id: 'audit-1',
        timestamp,
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Test',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.findUnique).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.getAuditLogById('audit-1')

      // Assert
      expect(result?.timestamp).toEqual(timestamp)
    })

    it('should include reason in audit log', async () => {
      // Arrange
      const mockLog = {
        id: 'audit-1',
        timestamp: new Date(),
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Repeated policy violations',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.findUnique).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.getAuditLogById('audit-1')

      // Assert
      expect(result?.reason).toBe('Repeated policy violations')
    })
  })

  describe('Convenience Methods', () => {
    it('should log suspend action', async () => {
      // Arrange
      const mockLog = {
        id: 'audit-1',
        timestamp: new Date(),
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        actionType: ActionType.SUSPEND,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Non-payment',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.logSuspendAction({
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        schoolId: 'school-1',
        schoolName: 'Test School',
        reason: 'Non-payment',
        result: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      // Assert
      expect(result.actionType).toBe(ActionType.SUSPEND)
    })

    it('should log reactivate action', async () => {
      // Arrange
      const mockLog = {
        id: 'audit-1',
        timestamp: new Date(),
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        actionType: ActionType.REACTIVATE,
        targetSchoolId: 'school-1',
        targetSchoolName: 'Test School',
        reason: 'Payment received',
        result: 'success',
        errorMessage: null,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      }

      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue(mockLog)

      // Act
      const result = await auditService.logReactivateAction({
        adminId: 'admin-1',
        adminEmail: 'admin@example.com',
        schoolId: 'school-1',
        schoolName: 'Test School',
        reason: 'Payment received',
        result: 'success',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      // Assert
      expect(result.actionType).toBe(ActionType.REACTIVATE)
    })

    it('should get failed actions', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'audit-1',
          timestamp: new Date(),
          adminId: 'admin-1',
          adminEmail: 'admin@example.com',
          actionType: ActionType.SUSPEND,
          targetSchoolId: 'school-1',
          targetSchoolName: 'Test School',
          reason: 'Test',
          result: 'failure',
          errorMessage: 'School not found',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
      ]

      vi.mocked(prisma.superAdminAuditLog.findMany).mockResolvedValue(mockLogs)

      // Act
      const result = await auditService.getFailedActions()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].result).toBe('failure')
      expect(prisma.superAdminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            result: 'failure',
          }),
        })
      )
    })
  })

  describe('countAuditLogs', () => {
    it('should count audit logs with filters', async () => {
      // Arrange
      vi.mocked(prisma.superAdminAuditLog.count).mockResolvedValue(42)

      // Act
      const result = await auditService.countAuditLogs({
        adminId: 'admin-123',
        actionType: ActionType.SUSPEND,
      })

      // Assert
      expect(result).toBe(42)
      expect(prisma.superAdminAuditLog.count).toHaveBeenCalledWith({
        where: {
          adminId: 'admin-123',
          actionType: ActionType.SUSPEND,
        },
      })
    })
  })
})
