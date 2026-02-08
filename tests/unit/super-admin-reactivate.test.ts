/**
 * Unit Tests for Reactivate School Endpoint
 * Tests Requirements: 7.2, 7.7, 7.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/[id]/reactivate/route'
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
      update: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/app/api/super-admin/dashboard/route', () => ({
  invalidateDashboardCache: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { invalidateDashboardCache } from '@/app/api/super-admin/dashboard/route'

describe('POST /api/super-admin/schools/[id]/reactivate', () => {
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

  const mockActiveSchool = {
    id: mockSchoolId,
    name: 'Test School',
    isActive: true,
  }

  const mockSuspendedSchool = {
    id: mockSchoolId,
    name: 'Test School',
    isActive: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reactivate', {
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

    it('should return 409 if school is already active', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockActiveSchool as any)

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Conflict')
      expect(data.message).toBe('School is already active')
    })
  })

  describe('Successful Reactivation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSuspendedSchool as any)
      vi.mocked(prisma.school.update).mockResolvedValue({} as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should reactivate school successfully', async () => {
      const request = createMockRequest({ reason: 'Payment received' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('School reactivated successfully')
      expect(data.data.schoolId).toBe(mockSchoolId)
      expect(data.data.schoolName).toBe('Test School')
      expect(data.data.previousStatus).toBe('suspended')
      expect(data.data.newStatus).toBe('active')
    })

    it('should update school isActive to true', async () => {
      const request = createMockRequest({ reason: 'Payment received' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: mockSchoolId },
        data: {
          isActive: true,
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should invalidate dashboard cache', async () => {
      const request = createMockRequest({ reason: 'Payment received' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(invalidateDashboardCache).toHaveBeenCalled()
    })

    it('should create audit log entry with correct data', async () => {
      const request = createMockRequest({ reason: 'Payment received' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: {
          timestamp: expect.any(Date),
          adminId: 'admin123',
          adminEmail: 'admin@example.com',
          actionType: ActionType.REACTIVATE,
          targetSchoolId: mockSchoolId,
          targetSchoolName: 'Test School',
          reason: 'Payment received',
          result: 'success',
          errorMessage: null,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          metadata: {
            previousStatus: 'suspended',
            timestamp: expect.any(String),
          },
        },
      })
    })

    it('should trim whitespace from reason', async () => {
      const request = createMockRequest({ reason: '  Payment received  ' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Payment received',
          }),
        })
      )
    })

    it('should capture IP address from x-forwarded-for header', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reactivate', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      })

      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.1',
          }),
        })
      )
    })

    it('should capture user agent from header', async () => {
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reactivate', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Test reason' }),
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      })

      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAgent: 'Mozilla/5.0',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSuspendedSchool as any)
    })

    it('should continue and succeed even if cache invalidation fails', async () => {
      vi.mocked(prisma.school.update).mockResolvedValue({} as any)
      vi.mocked(invalidateDashboardCache).mockImplementation(() => {
        throw new Error('Cache error')
      })
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 500 if school update fails', async () => {
      vi.mocked(prisma.school.update).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to reactivate school')
    })

    it('should create failure audit log on error', async () => {
      vi.mocked(prisma.school.update).mockRejectedValue(new Error('Database error'))
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test reason' })
      await POST(request, { params: { id: mockSchoolId } })

      // Should be called once for the error
      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: 'failure',
            errorMessage: 'Database error',
          }),
        })
      )
    })

    it('should handle audit log creation failure gracefully', async () => {
      vi.mocked(prisma.school.update).mockResolvedValue({} as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockRejectedValue(
        new Error('Audit log error')
      )

      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })

      // Should return 500 because audit log creation is critical
      expect(response.status).toBe(500)
    })
  })

  describe('Requirements Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSuspendedSchool as any)
      vi.mocked(prisma.school.update).mockResolvedValue({} as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should implement reactivate action with confirmation and reason (Requirement 7.2)', async () => {
      const request = createMockRequest({ reason: 'Payment received' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Payment received',
          }),
        })
      )
    })

    it('should update school status to active (Requirement 7.2)', async () => {
      const request = createMockRequest({ reason: 'Test reason' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('should restore school access (Requirement 7.2)', async () => {
      const request = createMockRequest({ reason: 'Test reason' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      // School access is restored by setting isActive to true
      expect(response.status).toBe(200)
      expect(data.data.newStatus).toBe('active')
      expect(prisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('should create audit log entry (Requirement 7.7, 7.8)', async () => {
      const request = createMockRequest({ reason: 'Test reason' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: ActionType.REACTIVATE,
            result: 'success',
            timestamp: expect.any(Date),
          }),
        })
      )
    })

    it('should invalidate caches (Requirement 7.8)', async () => {
      const request = createMockRequest({ reason: 'Test reason' })
      await POST(request, { params: { id: mockSchoolId } })

      expect(invalidateDashboardCache).toHaveBeenCalled()
    })
  })
})
