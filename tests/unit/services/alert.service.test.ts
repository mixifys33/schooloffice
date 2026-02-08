/**
 * Alert Service Unit Tests
 * Tests for alert checking service
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AlertService } from '@/services/alert.service'
import { prisma } from '@/lib/db'
import { AlertType, AlertSeverity } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    schoolHealthMetrics: {
      findUnique: vi.fn(),
    },
    school: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    schoolAlert: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

describe('AlertService', () => {
  let alertService: AlertService

  beforeEach(() => {
    alertService = new AlertService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkLowSmsBalance', () => {
    it('should create alert when SMS balance is below 100', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        smsBalance: 50,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkLowSmsBalance(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.LOW_SMS)
      expect(result?.severity).toBe(AlertSeverity.WARNING)
      expect(result?.title).toBe('Low SMS Balance')
      expect(result?.message).toContain('50 messages remaining')
    })

    it('should not create alert when SMS balance is 100 or above', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkLowSmsBalance(schoolId)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when metrics not found', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue(null)

      // Act
      const result = await alertService.checkLowSmsBalance(schoolId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('checkInactiveAdmin', () => {
    it('should create alert when no admin login for 14+ days', async () => {
      // Arrange
      const schoolId = 'school-123'
      const lastLogin = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        lastAdminLogin: lastLogin,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkInactiveAdmin(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.INACTIVE_ADMIN)
      expect(result?.severity).toBe(AlertSeverity.CRITICAL)
      expect(result?.title).toBe('Inactive Admin')
      expect(result?.message).toContain('20 days')
    })

    it('should not create alert when admin logged in within 14 days', async () => {
      // Arrange
      const schoolId = 'school-123'
      const lastLogin = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        lastAdminLogin: lastLogin,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkInactiveAdmin(schoolId)

      // Assert
      expect(result).toBeNull()
    })

    it('should create critical alert when no login data available', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        lastAdminLogin: null,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkInactiveAdmin(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.INACTIVE_ADMIN)
      expect(result?.severity).toBe(AlertSeverity.CRITICAL)
    })
  })

  describe('checkPaymentOverdue', () => {
    it('should create alert when payment is overdue by more than 7 days', async () => {
      // Arrange
      const schoolId = 'school-123'
      const nextBillingDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        nextBillingDate,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkPaymentOverdue(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.PAYMENT_OVERDUE)
      expect(result?.severity).toBe(AlertSeverity.CRITICAL)
      expect(result?.title).toBe('Payment Overdue')
      expect(result?.message).toContain('10 days overdue')
    })

    it('should not create alert when payment is within 7 days of due date', async () => {
      // Arrange
      const schoolId = 'school-123'
      const nextBillingDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        nextBillingDate,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkPaymentOverdue(schoolId)

      // Assert
      expect(result).toBeNull()
    })

    it('should not create alert when billing date is in the future', async () => {
      // Arrange
      const schoolId = 'school-123'
      const nextBillingDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        nextBillingDate,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkPaymentOverdue(schoolId)

      // Assert
      expect(result).toBeNull()
    })

    it('should return null when no billing date is set', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        nextBillingDate: null,
        smsBalance: 150,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkPaymentOverdue(schoolId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('checkCriticalHealth', () => {
    it('should create alert when health score is below 50', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        healthScore: 35,
        activityScore: 15,
        dataCompletenessScore: 10,
        smsEngagementScore: 5,
        paymentDisciplineScore: 0,
        growthScore: 5,
        smsBalance: 150,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkCriticalHealth(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.CRITICAL_HEALTH)
      expect(result?.severity).toBe(AlertSeverity.CRITICAL)
      expect(result?.title).toBe('Critical Health Score')
      expect(result?.message).toContain('35/100')
    })

    it('should not create alert when health score is 50 or above', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        smsBalance: 150,
        lastAdminLogin: new Date(),
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      const result = await alertService.checkCriticalHealth(schoolId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('checkDecliningEnrollment', () => {
    it('should create alert when student count has decreased', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        studentCount: 120, // Previous count
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        smsBalance: 150,
        lastAdminLogin: new Date(),
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Test School',
        code: 'TEST001',
        schoolType: 'PRIMARY',
        registrationNumber: null,
        ownership: 'PRIVATE',
        country: 'Uganda',
        district: null,
        address: null,
        phone: null,
        email: null,
        logo: null,
        licenseType: 'FREE_PILOT',
        features: {},
        smsBudgetPerTerm: 0,
        isActive: true,
        termsAcceptedAt: null,
        dataAcknowledgedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        students: Array(100).fill({ id: 'student-id' }), // Current count: 100
      })

      // Act
      const result = await alertService.checkDecliningEnrollment(schoolId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.shouldAlert).toBe(true)
      expect(result?.type).toBe(AlertType.DECLINING_ENROLLMENT)
      expect(result?.severity).toBe(AlertSeverity.WARNING)
      expect(result?.title).toBe('Declining Enrollment')
      expect(result?.message).toContain('20 students')
      expect(result?.message).toContain('17%')
    })

    it('should not create alert when student count has increased', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        studentCount: 80, // Previous count
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        smsBalance: 150,
        lastAdminLogin: new Date(),
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: new Date(),
        lastPaymentAmount: 1000,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mrr: 1000,
        totalRevenue: 5000,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      vi.mocked(prisma.school.findUnique).mockResolvedValue({
        id: schoolId,
        name: 'Test School',
        code: 'TEST001',
        schoolType: 'PRIMARY',
        registrationNumber: null,
        ownership: 'PRIVATE',
        country: 'Uganda',
        district: null,
        address: null,
        phone: null,
        email: null,
        logo: null,
        licenseType: 'FREE_PILOT',
        features: {},
        smsBudgetPerTerm: 0,
        isActive: true,
        termsAcceptedAt: null,
        dataAcknowledgedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        students: Array(100).fill({ id: 'student-id' }), // Current count: 100
      })

      // Act
      const result = await alertService.checkDecliningEnrollment(schoolId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('getSchoolAlerts', () => {
    it('should return all active alerts for a school', async () => {
      // Arrange
      const schoolId = 'school-123'
      const mockAlerts = [
        {
          id: 'alert-1',
          schoolId,
          type: AlertType.LOW_SMS,
          severity: AlertSeverity.WARNING,
          title: 'Low SMS Balance',
          message: 'SMS balance is low',
          conditionStartedAt: new Date(),
          daysSinceCondition: 2,
          isActive: true,
          acknowledgedAt: null,
          acknowledgedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'alert-2',
          schoolId,
          type: AlertType.CRITICAL_HEALTH,
          severity: AlertSeverity.CRITICAL,
          title: 'Critical Health Score',
          message: 'Health score is critical',
          conditionStartedAt: new Date(),
          daysSinceCondition: 5,
          isActive: true,
          acknowledgedAt: null,
          acknowledgedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValue(mockAlerts)

      // Act
      const result = await alertService.getSchoolAlerts(schoolId)

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe(AlertType.LOW_SMS)
      expect(result[1].type).toBe(AlertType.CRITICAL_HEALTH)
    })

    it('should return empty array when no alerts exist', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValue([])

      // Act
      const result = await alertService.getSchoolAlerts(schoolId)

      // Assert
      expect(result).toHaveLength(0)
    })
  })

  describe('acknowledgeAlert', () => {
    it('should update alert with acknowledgment details', async () => {
      // Arrange
      const alertId = 'alert-123'
      const adminId = 'admin-456'
      vi.mocked(prisma.schoolAlert.update).mockResolvedValue({
        id: alertId,
        schoolId: 'school-123',
        type: AlertType.LOW_SMS,
        severity: AlertSeverity.WARNING,
        title: 'Low SMS Balance',
        message: 'SMS balance is low',
        conditionStartedAt: new Date(),
        daysSinceCondition: 2,
        isActive: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Act
      await alertService.acknowledgeAlert(alertId, adminId)

      // Assert
      expect(prisma.schoolAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: {
          acknowledgedAt: expect.any(Date),
          acknowledgedBy: adminId,
          updatedAt: expect.any(Date),
        },
      })
    })
  })

  describe('getAlertCountByType', () => {
    it('should return count of alerts by type', async () => {
      // Arrange
      const mockGroupedAlerts = [
        {
          type: AlertType.LOW_SMS,
          _count: { id: 5 },
        },
        {
          type: AlertType.CRITICAL_HEALTH,
          _count: { id: 3 },
        },
      ]

      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue(mockGroupedAlerts as any)

      // Act
      const result = await alertService.getAlertCountByType()

      // Assert
      expect(result[AlertType.LOW_SMS]).toBe(5)
      expect(result[AlertType.CRITICAL_HEALTH]).toBe(3)
      expect(result[AlertType.INACTIVE_ADMIN]).toBe(0)
      expect(result[AlertType.PAYMENT_OVERDUE]).toBe(0)
      expect(result[AlertType.DECLINING_ENROLLMENT]).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing school data gracefully', async () => {
      // Arrange
      const schoolId = 'non-existent-school'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue(null)

      // Act & Assert - should not throw
      const lowSmsResult = await alertService.checkLowSmsBalance(schoolId)
      expect(lowSmsResult).toBeNull()
    })

    it('should handle null values in metrics', async () => {
      // Arrange
      const schoolId = 'school-123'
      vi.mocked(prisma.schoolHealthMetrics.findUnique).mockResolvedValue({
        id: 'metrics-1',
        schoolId,
        healthScore: 75,
        activityScore: 30,
        dataCompletenessScore: 20,
        smsEngagementScore: 15,
        paymentDisciplineScore: 20,
        growthScore: 10,
        smsBalance: 150,
        lastAdminLogin: null,
        studentCount: 100,
        teacherCount: 10,
        classCount: 5,
        smsSentThisMonth: 200,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        nextBillingDate: null,
        mrr: 0,
        totalRevenue: 0,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      })

      // Act & Assert - should handle null values
      const inactiveResult = await alertService.checkInactiveAdmin(schoolId)
      expect(inactiveResult).not.toBeNull() // Should create alert for no login data

      const paymentResult = await alertService.checkPaymentOverdue(schoolId)
      expect(paymentResult).toBeNull() // Should not create alert when no billing date
    })
  })
})
