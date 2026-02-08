/**
 * Super Admin Schools List API Tests
 * Tests for GET /api/super-admin/schools
 * 
 * Requirements: 2.1, 2.3, 11.6
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
    schoolSubscription: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}))

import { GET, invalidateSchoolsListCache } from '@/app/api/super-admin/schools/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

describe('Super Admin Schools List API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the cache before each test to prevent interference
    invalidateSchoolsListCache()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
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

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should return paginated school list with default parameters (50 per page)', async () => {
      const mockSchools = Array.from({ length: 50 }, (_, i) => ({
        id: `school-${i}`,
        name: `School ${i}`,
        email: `school${i}@test.com`,
        licenseType: 'FREE_PILOT',
        isActive: true,
        healthMetrics: {
          healthScore: 80,
          mrr: 500,
          lastAdminLogin: new Date('2024-01-15'),
          studentCount: 100,
          teacherCount: 10,
        },
        alerts: [],
      }))

      vi.mocked(prisma.school.count).mockResolvedValue(100)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.schools).toHaveLength(50)
      expect(data.data.pagination).toEqual({
        page: 1,
        pageSize: 50,
        totalSchools: 100,
        totalPages: 2,
      })
    })

    it('should handle custom pagination parameters', async () => {
      vi.mocked(prisma.school.count).mockResolvedValue(100)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?page=3&pageSize=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination).toEqual({
        page: 3,
        pageSize: 20,
        totalSchools: 100,
        totalPages: 5,
      })

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page 3 - 1) * 20
          take: 20,
        })
      )
    })

    it('should validate pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?page=0&pageSize=200')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toContain('Invalid pagination parameters')
    })
  })

  describe('Search Functionality - Requirement 2.1', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should search by school name', async () => {
      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?search=Test%20School')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'Test School', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should search by admin email', async () => {
      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?search=admin@test.com')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'admin@test.com', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should search by school ID', async () => {
      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?search=school-123')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { id: { contains: 'school-123', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })
  })

  describe('Filter Functionality - Requirement 2.3', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)

      vi.mocked(prisma.school.count).mockResolvedValue(0)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])
    })

    it('should filter by plan (license type)', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?plan=PREMIUM,BASIC')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { licenseType: { in: ['PREMIUM', 'BASIC'] } },
            ]),
          }),
        })
      )
    })

    it('should filter by health score range', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?healthMin=50&healthMax=79')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            healthMetrics: expect.objectContaining({
              healthScore: {
                gte: 50,
                lte: 79,
              },
            }),
          }),
        })
      )
    })

    it('should filter by payment status (current)', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?paymentStatus=current')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                healthMetrics: {
                  paymentDisciplineScore: { gte: 15 },
                },
              },
            ]),
          }),
        })
      )
    })

    it('should filter by payment status (overdue)', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?paymentStatus=overdue')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              {
                healthMetrics: {
                  paymentDisciplineScore: { lt: 10 },
                },
              },
            ]),
          }),
        })
      )
    })

    it('should filter by activity status (active within 7 days)', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?activityStatus=active_7d')
      await GET(request)

      const callArgs = vi.mocked(prisma.school.findMany).mock.calls[0][0]
      expect(callArgs.where.OR).toBeDefined()
      expect(callArgs.where.OR[0].healthMetrics.lastAdminLogin.gte).toBeInstanceOf(Date)
    })

    it('should filter by alert types', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools?alertTypes=LOW_SMS,PAYMENT_OVERDUE')
      await GET(request)

      expect(prisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            alerts: {
              some: {
                isActive: true,
                type: { in: ['LOW_SMS', 'PAYMENT_OVERDUE'] },
              },
            },
          }),
        })
      )
    })

    it('should stack multiple filters together', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/super-admin/schools?plan=PREMIUM&healthMin=80&paymentStatus=current'
      )
      await GET(request)

      const callArgs = vi.mocked(prisma.school.findMany).mock.calls[0][0]
      
      // Should have AND condition combining multiple filters
      expect(callArgs.where.AND).toBeDefined()
      expect(callArgs.where.healthMetrics).toBeDefined()
    })
  })

  describe('School Data Mapping', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'super-admin-1',
          email: 'super@admin.com',
          role: Role.SUPER_ADMIN,
        },
      } as any)
    })

    it('should map school data correctly with all fields', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School',
          email: 'school@test.com',
          licenseType: 'PREMIUM',
          isActive: true,
          healthMetrics: {
            healthScore: 85,
            mrr: 1000,
            lastAdminLogin: new Date('2024-01-15'),
            studentCount: 200,
            teacherCount: 20,
          },
          alerts: [
            {
              type: 'LOW_SMS',
              severity: 'WARNING',
              title: 'Low SMS Balance',
            },
          ],
        },
      ]

      const mockAdminUsers = [
        {
          schoolId: 'school-1',
          email: 'admin@test.com',
        },
      ]

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockAdminUsers as any)

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools[0]).toMatchObject({
        id: 'school-1',
        name: 'Test School',
        adminEmail: 'admin@test.com',
        healthScore: 85,
        plan: 'PREMIUM',
        mrr: 1000,
        studentCount: 200,
        teacherCount: 20,
        isActive: true,
      })
      expect(data.data.schools[0].alertFlags).toHaveLength(1)
      expect(data.data.schools[0].alertFlags[0]).toMatchObject({
        type: 'LOW_SMS',
        severity: 'WARNING',
        title: 'Low SMS Balance',
      })
    })

    it('should handle schools with no health metrics', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'New School',
          email: 'new@test.com',
          licenseType: 'FREE_PILOT',
          isActive: true,
          healthMetrics: null,
          alerts: [],
        },
      ]

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
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
          email: 'test@test.com',
          licenseType: 'FREE_PILOT',
          isActive: true,
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

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue(mockSubscriptions as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools[0].plan).toBe('FULL')
    })

    it('should fallback to school email when no admin user exists', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School',
          email: 'school@test.com',
          licenseType: 'FREE_PILOT',
          isActive: true,
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

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.schools[0].adminEmail).toBe('school@test.com')
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

    it('should cache results for 1 minute', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School',
          email: 'test@test.com',
          licenseType: 'FREE_PILOT',
          isActive: true,
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

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/schools')
      await GET(request1)

      expect(prisma.school.findMany).toHaveBeenCalledTimes(1)

      // Second request with same parameters should use cache
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/schools')
      await GET(request2)

      // Should still be called only once (cached)
      expect(prisma.school.findMany).toHaveBeenCalledTimes(1)
    })

    it('should use different cache keys for different filters', async () => {
      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue([])
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      // First request with filter
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/schools?plan=PREMIUM')
      await GET(request1)

      expect(prisma.school.findMany).toHaveBeenCalledTimes(1)

      // Second request with different filter should not use cache
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/schools?plan=BASIC')
      await GET(request2)

      expect(prisma.school.findMany).toHaveBeenCalledTimes(2)
    })

    it('should invalidate cache when requested', async () => {
      const mockSchools = [
        {
          id: 'school-1',
          name: 'Test School',
          email: 'test@test.com',
          licenseType: 'FREE_PILOT',
          isActive: true,
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

      vi.mocked(prisma.school.count).mockResolvedValue(1)
      vi.mocked(prisma.school.findMany).mockResolvedValue(mockSchools as any)
      vi.mocked(prisma.schoolSubscription.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/super-admin/schools')
      await GET(request1)

      expect(prisma.school.findMany).toHaveBeenCalledTimes(1)

      // Invalidate cache
      invalidateSchoolsListCache()

      // Second request should query database again
      const request2 = new NextRequest('http://localhost:3000/api/super-admin/schools')
      await GET(request2)

      expect(prisma.school.findMany).toHaveBeenCalledTimes(2)
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

      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to load schools list')
    })
  })
})
