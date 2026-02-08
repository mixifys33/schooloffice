/**
 * Super Admin School Detail API Tests
 * Tests for GET /api/super-admin/schools/[id]
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'
import { AlertType, AlertSeverity, ActionType } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    school: {
      findUnique: vi.fn(),
    },
    schoolSubscription: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/services/super-admin-audit.service', () => ({
  superAdminAuditService: {
    getSchoolAuditLog: vi.fn(),
  },
}))

import { GET, invalidateSchoolDetailCache, invalidateAllSchoolDetailCaches } from '@/app/api/super-admin/schools/[id]/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { superAdminAuditService } from '@/services/super-admin-audit.service'

describe('Super Admin School Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all caches before each test
    invalidateAllSchoolDetailCaches()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/test-school-id')
      const response = await GET(request, { params: { id: 'test-school-id' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a super admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'admin@school.com',
          role: Role.SCHOOL_ADMIN,
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/test-school-id')
      const response = await GET(request, { params: { id: 'test-school-id' } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('School Detail Retrieval', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should return 404 if school does not exist', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/non-existent-id')
      const response = await GET(request, { params: { id: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not Found')
      expect(data.message).toBe('School not found')
    })

    it('should return complete school detail with all sections - Requirement 6.2, 6.4, 6.5, 6.6, 6.7, 6.8', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@testschool.com',
        phone: '+1234567890',
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: {
          healthScore: 85,
          activityScore: 25,
          dataCompletenessScore: 18,
          smsEngagementScore: 16,
          paymentDisciplineScore: 20,
          growthScore: 6,
          lastAdminLogin: new Date('2024-01-15T10:00:00Z'),
          studentCount: 150,
          teacherCount: 15,
          classCount: 10,
          smsBalance: 500,
          smsSentThisMonth: 200,
          lastPaymentDate: new Date('2024-01-01T00:00:00Z'),
          lastPaymentAmount: 1000,
          nextBillingDate: new Date('2024-02-01T00:00:00Z'),
          mrr: 1000,
          totalRevenue: 12000,
          calculatedAt: new Date('2024-01-15T00:00:00Z'),
        },
        alerts: [
          {
            id: 'alert-1',
            type: AlertType.LOW_SMS,
            severity: AlertSeverity.WARNING,
            title: 'Low SMS Balance',
            message: 'SMS balance is below 100 messages',
            daysSinceCondition: 2,
            conditionStartedAt: new Date('2024-01-13T00:00:00Z'),
          },
        ],
      }

      const mockSubscription = {
        paymentTier: 'FULL',
        billingCycle: 'MONTHLY',
      }

      const mockAdminUser = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@testschool.com',
      }

      const mockAuditLogs = [
        {
          id: 'audit-1',
          timestamp: new Date('2024-01-14T12:00:00Z'),
          adminId: 'super-admin-1',
          adminEmail: 'super@admin.com',
          actionType: ActionType.RESET_PASSWORD,
          targetSchoolId: 'school-1',
          targetSchoolName: 'Test School',
          reason: 'Admin requested password reset',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
      ]

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser as any)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue(mockAuditLogs as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Requirement 6.2: Header section
      expect(data.data).toMatchObject({
        id: 'school-1',
        name: 'Test School',
        healthScore: 85,
        plan: 'FULL',
        status: 'active',
      })
      expect(data.data.lastActivity).toBeTruthy()

      // Requirement 6.4: Core information
      expect(data.data.coreInfo).toMatchObject({
        adminName: 'John Doe',
        adminEmail: 'john.doe@testschool.com',
        phone: '+1234567890',
        currentPlan: 'FULL',
      })
      expect(data.data.coreInfo.registrationDate).toBeTruthy()
      expect(data.data.coreInfo.planDetails).toMatchObject({
        tier: 'FULL',
        billingCycle: 'MONTHLY',
      })

      // Requirement 6.5: Usage metrics
      expect(data.data.usageMetrics).toMatchObject({
        studentCount: 150,
        teacherCount: 15,
        classCount: 10,
        smsSentThisMonth: 200,
        smsBalance: 500,
      })

      // Requirement 6.6: Financial metrics
      expect(data.data.financialMetrics).toMatchObject({
        mrr: 1000,
        totalRevenue: 12000,
        lastPaymentAmount: 1000,
      })
      expect(data.data.financialMetrics.lastPaymentDate).toBeTruthy()
      expect(data.data.financialMetrics.nextBillingDate).toBeTruthy()

      // Requirement 6.7: Activity timeline
      expect(data.data.activityTimeline).toBeInstanceOf(Array)
      expect(data.data.activityTimeline.length).toBeGreaterThan(0)
      // Timeline should be in reverse chronological order
      if (data.data.activityTimeline.length > 1) {
        const firstTimestamp = new Date(data.data.activityTimeline[0].timestamp).getTime()
        const secondTimestamp = new Date(data.data.activityTimeline[1].timestamp).getTime()
        expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp)
      }

      // Requirement 6.8: Alert flags
      expect(data.data.alertFlags).toHaveLength(1)
      expect(data.data.alertFlags[0]).toMatchObject({
        id: 'alert-1',
        type: AlertType.LOW_SMS,
        severity: AlertSeverity.WARNING,
        title: 'Low SMS Balance',
        message: 'SMS balance is below 100 messages',
        daysSinceCondition: 2,
      })

      // Requirement 6.8: Recent audit logs
      expect(data.data.recentAuditLogs).toHaveLength(1)
      expect(data.data.recentAuditLogs[0]).toMatchObject({
        id: 'audit-1',
        adminEmail: 'super@admin.com',
        actionType: ActionType.RESET_PASSWORD,
        reason: 'Admin requested password reset',
        result: 'success',
      })
    })

    it('should handle school with no health metrics', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'New School',
        email: 'contact@newschool.com',
        phone: null,
        licenseType: 'FREE_PILOT',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toMatchObject({
        id: 'school-1',
        name: 'New School',
        healthScore: 0,
        plan: 'FREE_PILOT',
        status: 'active',
        lastActivity: null,
      })

      expect(data.data.usageMetrics).toMatchObject({
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
        smsSentThisMonth: 0,
        smsBalance: 0,
      })

      expect(data.data.financialMetrics).toMatchObject({
        mrr: 0,
        totalRevenue: 0,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        nextBillingDate: null,
      })
    })

    it('should handle suspended school correctly', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Suspended School',
        email: 'contact@suspended.com',
        phone: null,
        licenseType: 'PREMIUM',
        isActive: false, // Suspended
        createdAt: new Date('2023-01-01'),
        healthMetrics: {
          healthScore: 30,
          activityScore: 0,
          dataCompletenessScore: 10,
          smsEngagementScore: 5,
          paymentDisciplineScore: 0,
          growthScore: 0,
          lastAdminLogin: new Date('2023-12-01'),
          studentCount: 50,
          teacherCount: 5,
          classCount: 3,
          smsBalance: 0,
          smsSentThisMonth: 0,
          lastPaymentDate: new Date('2023-11-01'),
          lastPaymentAmount: 500,
          nextBillingDate: new Date('2024-01-01'),
          mrr: 500,
          totalRevenue: 6000,
          calculatedAt: new Date('2024-01-15'),
        },
        alerts: [
          {
            id: 'alert-1',
            type: AlertType.CRITICAL_HEALTH,
            severity: AlertSeverity.CRITICAL,
            title: 'Critical Health Score',
            message: 'Health score is below 50',
            daysSinceCondition: 30,
            conditionStartedAt: new Date('2023-12-15'),
          },
          {
            id: 'alert-2',
            type: AlertType.INACTIVE_ADMIN,
            severity: AlertSeverity.CRITICAL,
            title: 'Inactive Admin',
            message: 'No admin login for 14+ days',
            daysSinceCondition: 45,
            conditionStartedAt: new Date('2023-12-01'),
          },
        ],
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.status).toBe('suspended')
      expect(data.data.healthScore).toBe(30)
      expect(data.data.alertFlags).toHaveLength(2)
    })

    it('should use subscription payment tier over license type when available', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: null,
        licenseType: 'FREE_PILOT',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      const mockSubscription = {
        paymentTier: 'FULL',
        billingCycle: 'ANNUAL',
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.plan).toBe('FULL')
      expect(data.data.coreInfo.currentPlan).toBe('FULL')
      expect(data.data.coreInfo.planDetails.tier).toBe('FULL')
      expect(data.data.coreInfo.planDetails.billingCycle).toBe('ANNUAL')
    })

    it('should include admin information when available', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: '+1234567890',
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      const mockAdminUser = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser as any)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.coreInfo.adminName).toBe('Jane Smith')
      expect(data.data.coreInfo.adminEmail).toBe('jane.smith@test.com')
    })

    it('should handle admin with only first name', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: null,
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      const mockAdminUser = {
        firstName: 'John',
        lastName: null,
        email: 'john@test.com',
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdminUser as any)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.coreInfo.adminName).toBe('John')
    })

    it('should build activity timeline from multiple sources - Requirement 6.7', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: null,
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: {
          healthScore: 85,
          activityScore: 25,
          dataCompletenessScore: 18,
          smsEngagementScore: 16,
          paymentDisciplineScore: 20,
          growthScore: 6,
          lastAdminLogin: new Date('2024-01-15T10:00:00Z'),
          studentCount: 150,
          teacherCount: 15,
          classCount: 10,
          smsBalance: 500,
          smsSentThisMonth: 200,
          lastPaymentDate: new Date('2024-01-10T00:00:00Z'),
          lastPaymentAmount: 1000,
          nextBillingDate: new Date('2024-02-01T00:00:00Z'),
          mrr: 1000,
          totalRevenue: 12000,
          calculatedAt: new Date('2024-01-15T00:00:00Z'),
        },
        alerts: [],
      }

      const mockAuditLogs = [
        {
          id: 'audit-1',
          timestamp: new Date('2024-01-14T12:00:00Z'),
          adminId: 'super-admin-1',
          adminEmail: 'super@admin.com',
          actionType: ActionType.RESET_PASSWORD,
          targetSchoolId: 'school-1',
          targetSchoolName: 'Test School',
          reason: 'Admin requested password reset',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
        {
          id: 'audit-2',
          timestamp: new Date('2024-01-12T09:00:00Z'),
          adminId: 'super-admin-1',
          adminEmail: 'super@admin.com',
          actionType: ActionType.CHANGE_PLAN,
          targetSchoolId: 'school-1',
          targetSchoolName: 'Test School',
          reason: 'Upgraded to premium plan',
          result: 'success',
          errorMessage: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: {},
        },
      ]

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue(mockAuditLogs as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Should have events from audit logs, admin login, and payment
      expect(data.data.activityTimeline.length).toBeGreaterThanOrEqual(3)
      
      // Verify timeline is sorted in reverse chronological order (most recent first)
      const timestamps = data.data.activityTimeline.map((event: any) => 
        new Date(event.timestamp).getTime()
      )
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1])
      }

      // Verify event types are present
      const eventTypes = data.data.activityTimeline.map((event: any) => event.eventType)
      expect(eventTypes).toContain('ADMIN_LOGIN')
      expect(eventTypes).toContain('PAYMENT_RECEIVED')
      expect(eventTypes).toContain(ActionType.RESET_PASSWORD)
      expect(eventTypes).toContain(ActionType.CHANGE_PLAN)
    })
  })

  describe('Caching', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should cache school detail data with 30-second TTL', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: null,
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      // First request - should hit database
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      await GET(request1, { params: { id: 'school-1' } })

      expect(prisma.school.findUnique).toHaveBeenCalledTimes(1)

      // Second request - should use cache
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      await GET(request2, { params: { id: 'school-1' } })

      // Should still be 1 call (cached)
      expect(prisma.school.findUnique).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache when requested', async () => {
      const mockSchool = {
        id: 'school-1',
        name: 'Test School',
        email: 'contact@test.com',
        phone: null,
        licenseType: 'PREMIUM',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        healthMetrics: null,
        alerts: [],
      }

      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      vi.mocked(superAdminAuditService.getSchoolAuditLog).mockResolvedValue([])

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      await GET(request1, { params: { id: 'school-1' } })

      expect(prisma.school.findUnique).toHaveBeenCalledTimes(1)

      // Invalidate cache
      invalidateSchoolDetailCache('school-1')

      // Second request - should hit database again
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      await GET(request2, { params: { id: 'school-1' } })

      expect(prisma.school.findUnique).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.school.findUnique).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school-1')
      const response = await GET(request, { params: { id: 'school-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to load school detail')
    })

    it('should handle missing school ID parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/')
      const response = await GET(request, { params: { id: '' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('School ID is required')
    })
  })
})
