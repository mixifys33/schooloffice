/**
 * Unit tests for Business Intelligence API
 * Tests Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'
import { AlertType, PaymentTier, LicenseType } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolHealthMetrics: {
      aggregate: vi.fn(),
      count: vi.fn()
    },
    school: {
      count: vi.fn(),
      groupBy: vi.fn()
    },
    schoolSubscription: {
      groupBy: vi.fn()
    },
    schoolAlert: {
      groupBy: vi.fn()
    }
  }
}))

import { GET, invalidateBusinessIntelligenceCache } from '@/app/api/super-admin/business-intelligence/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

describe('Business Intelligence API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear cache before each test
    invalidateBusinessIntelligenceCache()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not a super admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'admin@school.com',
          role: Role.SCHOOL_ADMIN
        }
      } as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('Business Intelligence Calculations', () => {
    beforeEach(() => {
      // Mock successful authentication
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'superadmin@platform.com',
          role: Role.SUPER_ADMIN
        }
      } as any)
    })

    it('should calculate total MRR across active schools', async () => {
      // Mock data
      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValueOnce({
        _sum: { mrr: 50000 }
      } as any)

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValueOnce({
        _avg: { healthScore: 75 }
      } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // current total
        .mockResolvedValueOnce(5) // churned schools
        .mockResolvedValueOnce(95) // active schools
        .mockResolvedValueOnce(100) // total schools

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValueOnce({
        _sum: { totalRevenue: 500000 }
      } as any)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10) // critical
        .mockResolvedValueOnce(30) // at risk
        .mockResolvedValueOnce(60) // healthy

      vi.mocked(prisma.school.groupBy).mockResolvedValue([
        { licenseType: LicenseType.FREE_PILOT, _count: { licenseType: 20 } },
        { licenseType: LicenseType.BASIC, _count: { licenseType: 50 } },
        { licenseType: LicenseType.PREMIUM, _count: { licenseType: 30 } }
      ] as any)

      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([
        { paymentTier: PaymentTier.FULL, _count: { paymentTier: 60 } },
        { paymentTier: PaymentTier.HALF, _count: { paymentTier: 25 } },
        { paymentTier: PaymentTier.QUARTER, _count: { paymentTier: 10 } },
        { paymentTier: PaymentTier.NONE, _count: { paymentTier: 5 } }
      ] as any)

      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([
        { type: AlertType.LOW_SMS, _count: { type: 15 } },
        { type: AlertType.INACTIVE_ADMIN, _count: { type: 8 } },
        { type: AlertType.PAYMENT_OVERDUE, _count: { type: 12 } },
        { type: AlertType.CRITICAL_HEALTH, _count: { type: 10 } },
        { type: AlertType.DECLINING_ENROLLMENT, _count: { type: 5 } }
      ] as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.totalMRR).toBe(50000)
    })

    it('should calculate average health score correctly', async () => {
      // Mock data
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 72.5 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.averageHealthScore).toBe(72.5)
    })

    it('should calculate churn rate correctly', async () => {
      // Mock data: 5 churned out of 105 total = 4.76% churn rate
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      // Note: Due to Promise.all execution, the order of prisma.school.count() calls is:
      // 1. calculateChurnRate - current total (no filter)
      // 2. calculateRevenuePerSchool - active schools (isActive: true) - starts immediately in Promise.all
      // 3. totalActiveSchools (isActive: true) - starts immediately in Promise.all
      // 4. totalSchools (no filter) - starts immediately in Promise.all
      // 5. calculateChurnRate - churned schools (isActive: false) - happens after 1st call completes
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // 1st: calculateChurnRate - current total
        .mockResolvedValueOnce(95)  // 2nd: calculateRevenuePerSchool - active schools
        .mockResolvedValueOnce(95)  // 3rd: totalActiveSchools
        .mockResolvedValueOnce(100) // 4th: totalSchools
        .mockResolvedValueOnce(5)   // 5th: calculateChurnRate - churned schools

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10) // critical
        .mockResolvedValueOnce(30) // at risk
        .mockResolvedValueOnce(60) // healthy

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      // Churn rate = (5 / 105) * 100 = 4.76%
      expect(data.data.churnRate).toBeCloseTo(4.76, 1)
    })

    it('should calculate revenue per school correctly', async () => {
      // Mock data: 500000 total revenue / 95 active schools = 5263.16 per school
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      // Note: Due to Promise.all execution, the order of prisma.school.count() calls is:
      // 1. calculateChurnRate - current total (no filter)
      // 2. calculateRevenuePerSchool - active schools (isActive: true) - starts immediately in Promise.all
      // 3. totalActiveSchools (isActive: true) - starts immediately in Promise.all
      // 4. totalSchools (no filter) - starts immediately in Promise.all
      // 5. calculateChurnRate - churned schools (isActive: false) - happens after 1st call completes
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // 1st: calculateChurnRate - current total
        .mockResolvedValueOnce(95)  // 2nd: calculateRevenuePerSchool - active schools
        .mockResolvedValueOnce(95)  // 3rd: totalActiveSchools
        .mockResolvedValueOnce(100) // 4th: totalSchools
        .mockResolvedValueOnce(5)   // 5th: calculateChurnRate - churned schools

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10) // critical
        .mockResolvedValueOnce(30) // at risk
        .mockResolvedValueOnce(60) // healthy

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.revenuePerSchool).toBeCloseTo(5263.16, 1)
    })

    it('should calculate health score distribution correctly', async () => {
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(15) // critical (0-49)
        .mockResolvedValueOnce(35) // at risk (50-79)
        .mockResolvedValueOnce(50) // healthy (80-100)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.healthScoreDistribution).toEqual({
        critical: 15,
        atRisk: 35,
        healthy: 50
      })
    })

    it('should calculate plan distribution correctly', async () => {
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([
        { licenseType: LicenseType.FREE_PILOT, _count: { licenseType: 20 } },
        { licenseType: LicenseType.BASIC, _count: { licenseType: 50 } },
        { licenseType: LicenseType.PREMIUM, _count: { licenseType: 30 } }
      ] as any)

      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([
        { paymentTier: PaymentTier.FULL, _count: { paymentTier: 60 } },
        { paymentTier: PaymentTier.HALF, _count: { paymentTier: 25 } }
      ] as any)

      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.planDistribution).toEqual({
        FREE_PILOT: 20,
        BASIC: 50,
        PREMIUM: 30,
        FULL: 60,
        HALF: 25
      })
    })

    it('should calculate alert distribution correctly', async () => {
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])

      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([
        { type: AlertType.LOW_SMS, _count: { type: 15 } },
        { type: AlertType.INACTIVE_ADMIN, _count: { type: 8 } },
        { type: AlertType.PAYMENT_OVERDUE, _count: { type: 12 } }
      ] as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.alertDistribution).toEqual({
        LOW_SMS: 15,
        INACTIVE_ADMIN: 8,
        PAYMENT_OVERDUE: 12
      })
    })

    it('should handle zero active schools gracefully', async () => {
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: null } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: null } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(0) // current total (for churn calculation)
        .mockResolvedValueOnce(0) // churned schools (for churn calculation)

      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { totalRevenue: null } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(0) // zero active schools (for revenue per school)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(0) // active schools (for final count)
        .mockResolvedValueOnce(0) // total schools (for final count)

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.revenuePerSchool).toBe(0)
      expect(data.data.churnRate).toBe(0)
    })

    it('should cache results for 5 minutes', async () => {
      // Setup mocks for first request
      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { mrr: 50000 } } as any)
        .mockResolvedValueOnce({ _avg: { healthScore: 75 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // current total (for churn calculation)
        .mockResolvedValueOnce(5) // churned schools (for churn calculation)

      vi.mocked(prisma.schoolHealthMetrics.aggregate)
        .mockResolvedValueOnce({ _sum: { totalRevenue: 500000 } } as any)

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(95) // active schools (for revenue per school)

      vi.mocked(prisma.schoolHealthMetrics.count)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)

      vi.mocked(prisma.school.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.groupBy).mockResolvedValue([])
      vi.mocked(prisma.schoolAlert.groupBy).mockResolvedValue([])

      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(95) // active schools (for final count)
        .mockResolvedValueOnce(100) // total schools (for final count)

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response1 = await GET(request1)
      expect(response1.status).toBe(200)

      // Clear mock call history but keep the cache
      vi.clearAllMocks()

      // Second request should use cache (no new database calls)
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response2 = await GET(request2)
      expect(response2.status).toBe(200)

      // Verify database was not called for the second request
      expect(vi.mocked(prisma.schoolHealthMetrics.aggregate)).not.toHaveBeenCalled()
      expect(vi.mocked(prisma.school.count)).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'superadmin@platform.com',
          role: Role.SUPER_ADMIN
        }
      } as any)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/super-admin/business-intelligence')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to calculate business intelligence metrics')
    })
  })
})
