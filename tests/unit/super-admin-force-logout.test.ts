/**
 * Unit Tests for Force Logout Endpoint
 * Tests Requirements: 7.5, 7.7, 7.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/[id]/force-logout/route'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    school: {
      findUnique: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/services/context-management.service', () => ({
  contextManagementService: {
    clearAllSchoolContexts: vi.fn(),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { contextManagementService } from '@/services/context-management.service'

describe('POST /api/super-admin/schools/[id]/force-logout', () => {
  const mockSchoolId = 'school123'
  const mockSuperAdminSession = {
    user: {
      id: 'admin123',
      email: 'admin@example.com',
      role: Role.SUPER_ADMIN,
      roles: [Role.SUPER_ADMIN],
      activeRole: Role.SUPER_ADMIN,
    },
    expires: '2024-12-31',
  }

  const mockSchool = {
    id: mockSchoolId,
    name: 'Test School',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/super-admin/schools/school123/force-logout', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toBe('Authentication required')
    })

    it('should return 403 if user is not a super admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: 'user123',
          email: 'user@example.com',
          role: Role.SCHOOL_ADMIN,
          roles: [Role.SCHOOL_ADMIN],
          activeRole: Role.SCHOOL_ADMIN,
          schoolId: 'school123',
        },
        expires: '2024-12-31',
      } as any)

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
      expect(data.message).toBe('Super Admin access required')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
    })

    it('should return 400 if reason is missing', async () => {
      const request = createMockRequest({})
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('Reason is required for this action')
    })

    it('should return 400 if reason is empty string', async () => {
      const request = createMockRequest({ reason: '   ' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
    })

    it('should return 400 if reason is not a string', async () => {
      const request = createMockRequest({ reason: 123 })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
    })
  })

  describe('School Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
    })

    it('should return 404 if school does not exist', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not Found')
      expect(data.message).toBe('School not found')
    })
  })

  describe('Successful Force Logout', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.user.count).mockResolvedValue(25)
      vi.mocked(contextManagementService.clearAllSchoolContexts).mockResolvedValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should successfully force logout all school users', async () => {
      const request = createMockRequest({ reason: 'Security audit' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('All school users have been logged out successfully')
      expect(data.data.schoolId).toBe(mockSchoolId)
      expect(data.data.schoolName).toBe('Test School')
      expect(data.data.usersAffected).toBe(25)
    })

    it('should invalidate all school contexts', async () => {
      const request = createMockRequest({ reason: 'Security audit' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(contextManagementService.clearAllSchoolContexts).toHaveBeenCalledWith(
        mockSchoolId,
        'SECURITY_CONCERN'
      )
    })

    it('should create audit log entry with correct data', async () => {
      const reason = 'Security audit'
      const request = createMockRequest({ reason })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: mockSuperAdminSession.user.id,
          adminEmail: mockSuperAdminSession.user.email,
          actionType: ActionType.FORCE_LOGOUT,
          targetSchoolId: mockSchoolId,
          targetSchoolName: mockSchool.name,
          reason: reason,
          result: 'success',
          errorMessage: null,
          metadata: expect.objectContaining({
            activeUsersCount: 25,
          }),
        }),
      })
    })

    it('should trim whitespace from reason', async () => {
      const request = createMockRequest({ reason: '  Security audit  ' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'Security audit',
        }),
      })
    })

    it('should handle zero active users', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0)

      const request = createMockRequest({ reason: 'Test' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.usersAffected).toBe(0)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.user.count).mockResolvedValue(10)
    })

    it('should continue and succeed even if context clearing fails', async () => {
      vi.mocked(contextManagementService.clearAllSchoolContexts).mockRejectedValue(
        new Error('Context service error')
      )
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      // Should still succeed and create audit log
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.superAdminAuditLog.create).toHaveBeenCalled()
    })

    it('should return 500 and create failure audit log on database error', async () => {
      const dbError = new Error('Database connection failed')
      vi.mocked(prisma.user.count).mockRejectedValue(dbError)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to force logout school users')

      // Should create failure audit log
      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          result: 'failure',
          errorMessage: 'Database connection failed',
        }),
      })
    })

    it('should handle audit log creation failure gracefully', async () => {
      vi.mocked(contextManagementService.clearAllSchoolContexts).mockResolvedValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockRejectedValue(
        new Error('Audit log error')
      )

      const request = createMockRequest({ reason: 'Test' })
      const response = await POST(request, { params: { id: mockSchoolId } })

      expect(response.status).toBe(500)
    })
  })
})
