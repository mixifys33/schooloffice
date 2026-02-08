/**
 * Super Admin Dashboard API Tests
 * Tests for GET /api/super-admin/dashboard
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    school: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    schoolHealthMetrics: {
      aggregate: vi.fn(),
    },
    schoolAlert: {
      findMany: vi.fn(),
    },
    schoolSubscription: {
      findMany: vi.fn(),
    },
  },
}))

import { GET, invalidateDashboardCache } from '@/app/api/super-admin/dashboard/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

describe('Super Admin Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the cache before each test to prevent interference
    invalidateDashboardCache()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
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
          role: Role.SCHOOL_ADMIN,
        },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('Global Statistics', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
      
      // Reset all mocks
      vi.mocked(prisma.school.count).mockReset()
      vi.mocked(prisma.school.findMany).mockReset()
      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockReset()
      vi.mocked(prisma.schoolAlert.findMany).mockReset()
      vi.mocked(prisma.schoolSubscription.findMany).mockReset()
    })

    it('should calculate global statistics correctly', async () => {
      // Mock database responses
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // Total schools
        .mockResolvedValueOnce(85) // Active schools
        .mockResolvedValueOnce(15) // Suspended schools
        .mockResolvedValueOnce(100) // For school list total count

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValue({
        _sum: {
          totalRevenue: 50000,
        },
      } as any)

      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValue([
        { schoolId: 'school-1' },
        { schoolId: 'school-2' },
        { schoolId: 'school-3' },
      ] as any)

      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.globalStats).toEqual({
        totalSchools: 100,
        activeSchools: 85,
        suspendedSchools: 15,
        totalRevenue: 50000,
        schoolsFlagged: 3,
      })
    })

    it('should handle zero revenue correctly', async () => {
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(10) // Total schools
        .mockResolvedValueOnce(10) // Active schools
        .mockResolvedValueOnce(0) // Suspended schools
        .mockResolvedValueOnce(10) // For school list total count

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValue({
        _sum: {
          totalRevenue: null,
        },
      } as any)

      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValue([])
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.globalStats.totalRevenue).toBe(0)
    })
  })

  describe('School List', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)

      // Reset all mocks
      vi.mocked(prisma.school.count).mockReset()
      vi.mocked(prisma.school.findMany).mockReset()
      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockReset()
      vi.mocked(prisma.schoolAlert.findMany).mockReset()
      vi.mocked(prisma.schoolSubscription.findMany).mockReset()

      // Mock global stats (called first in parallel)
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(100) // Total schools for stats
        .mockResolvedValueOnce(85) // Active schools for stats
        .mockResolvedValueOnce(15) // Suspended schools for stats

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValue({
        _sum: { totalRevenue: 50000 },
      } as any)

      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValueOnce([])
    })

    it('should return paginated school list with default parameters', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School 1',
          licenseType: 'FREE_PILOT',
          healthMetrics: {
            healthScore: 85,
            mrr: 500,
            lastAdminLogin: new Date('2024-01-15'),
            studentCount: 100,
            teacherCount: 10,
          },
          alerts: [
            {
              type: 'LOW_SMS',
              severity: 'WARNING',
              title: 'Low SMS Balance',
            },
          ],
        },
        {
          id: 'school-2',
          name: 'Test School 2',
          licenseType: 'PREMIUM',
          healthMetrics: {
            healthScore: 92,
            mrr: 1000,
            lastAdminLogin: new Date('2024-01-16'),
            studentCount: 200,
            teacherCount: 20,
          },
          alerts: [],
        },
      ]

      vi.mocked(prisma.school.count).mockResolvedValueOnce(2) // For school list total count
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools).toHaveLength(2)
      expect(data.data.schools[0]).toMatchObject({
        id: 'school-1',
        name: 'Test School 1',
        healthScore: 85,
        plan: 'FREE_PILOT',
        mrr: 500,
        studentCount: 100,
        teacherCount: 10,
      })
      expect(data.data.schools[0].alertFlags).toHaveLength(1)
      expect(data.data.schools[1].alertFlags).toHaveLength(0)
    })

    it('should handle pagination parameters correctly', async () => {
      vi.mocked(prisma.school.count).mockResolvedValueOnce(100) // For school list total count
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard?page=2&pageSize=25')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination).toEqual({
        page: 2,
        pageSize: 25,
        totalSchools: 100,
        totalPages: 4,
      })

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25, // (page 2 - 1) * 25
          take: 25,
        })
      )
    })

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard?page=0&pageSize=200')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toContain('Invalid pagination parameters')
    })

    it('should handle schools with no health metrics', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'New School',
          licenseType: 'FREE_PILOT',
          healthMetrics: null,
          alerts: [],
        },
      ]

      vi.mocked(prisma.school.count).mockResolvedValueOnce(1) // For school list total count
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools[0]).toMatchObject({
        id: 'school-1',
        name: 'New School',
        healthScore: 0,
        mrr: 0,
        lastActivity: null,
        studentCount: 0,
        teacherCount: 0,
      })
    })

    it('should use subscription payment tier when available', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School',
          licenseType: 'FREE_PILOT',
          healthMetrics: {
            healthScore: 85,
            mrr: 500,
            lastAdminLogin: new Date('2024-01-15'),
            studentCount: 100,
            teacherCount: 10,
          },
          alerts: [],
        },
      ]

      const mockSubscriptions = [
        {
          schoolId: 'school-1',
          paymentTier: 'FULL',
        },
      ]

      vi.mocked(prisma.school.count).mockResolvedValueOnce(1) // For school list total count
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue(mockSubscriptions as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools[0].plan).toBe('FULL')
    })
  })

  describe('Performance Requirements', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should handle large school counts efficiently', async () => {
      // Mock 1000 schools
      vi.mocked(prisma.school.count)
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(950)
        .mockResolvedValueOnce(50)

      vi.mocked(prisma.schoolHealthMetrics.aggregate).mockResolvedValue({
        _sum: { totalRevenue: 500000 },
      } as any)

      vi.mocked(prisma.schoolAlert.findMany).mockResolvedValue([])

      // Mock 50 schools per page
      const mockSchools = Array.from({ length: 50 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
        licenseType: 'FREE_PILOT',
        healthMetrics: {
          healthScore: 80,
          mrr: 500,
          lastAdminLogin: new Date(),
          studentCount: 100,
          teacherCount: 10,
        },
        alerts: [],
      }))

      vi.mocked(prisma.school.count).mockResolvedValueOnce(1000)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools).toHaveLength(50)
      expect(data.data.pagination.totalSchools).toBe(1000)
      expect(data.data.pagination.totalPages).toBe(20)
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
      vi.mocked(prisma.school.count).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to load dashboard data')
    })
  })
})
