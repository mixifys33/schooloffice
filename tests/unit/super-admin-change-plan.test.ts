/**
 * Unit Tests for Change School Plan Endpoint
 * Tests Requirements: 7.3, 7.7, 7.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/[id]/change-plan/route'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'
import { ActionType, LicenseType, PaymentTier } from '@prisma/client'

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
    schoolSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    sMSCreditAllocation: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
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

describe('POST /api/super-admin/schools/[id]/change-plan', () => {
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
    licenseType: LicenseType.FREE_PILOT,
  }

  const mockSubscription = {
    id: 'sub123',
    schoolId: mockSchoolId,
    paymentTier: PaymentTier.HALF,
    paymentAmount: 500000,
    studentCount: 100,
    isActive: true,
    accessExpiresAt: new Date('2024-12-31'),
    lastPaymentDate: new Date('2024-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/super-admin/schools/school123/change-plan', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
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

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
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
      const request = createMockRequest({ licenseType: LicenseType.PREMIUM })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('Reason is required for this action')
    })

    it('should return 400 if reason is empty string', async () => {
      const request = createMockRequest({ reason: '   ', licenseType: LicenseType.PREMIUM })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
    })

    it('should return 400 if licenseType is invalid', async () => {
      const request = createMockRequest({ reason: 'Test reason', licenseType: 'INVALID_TYPE' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('Invalid license type')
    })

    it('should return 400 if paymentTier is invalid', async () => {
      const request = createMockRequest({ reason: 'Test reason', paymentTier: 'INVALID_TIER' })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Bad Request')
      expect(data.message).toBe('Invalid payment tier')
    })
  })

  describe('School Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
    })

    it('should return 404 if school does not exist', async () => {
      vi.mocked(prisma.school.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
      const response = await POST(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not Found')
      expect(data.message).toBe('School not found')
    })
  })

  describe('Successful Plan Change - License Type Only', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.school.update).mockResolvedValue({ ...mockSchool, licenseType: LicenseType.PREMIUM } as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce({ ...mockSchool, licenseType: LicenseType.PREMIUM } as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should change license type successfully', async () => {
      const request = createMockRequest({ 
        reason: 'Upgrade to premium', 
        licenseType: LicenseType.PREMIUM 
      })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('School plan changed successfully')
      expect(data.data.schoolId).toBe(mockSchoolId)
      expect(data.data.schoolName).toBe('Test School')
    })

    it('should update school license type', async () => {
      const request = createMockRequest({ 
        reason: 'Upgrade to premium', 
        licenseType: LicenseType.PREMIUM 
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: mockSchoolId },
        data: {
          licenseType: LicenseType.PREMIUM,
          updatedAt: expect.any(Date),
        },
      })
    })
  })

  describe('Successful Plan Change - Payment Tier with Subscription', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.sMSCreditAllocation.findUnique).mockResolvedValue({
        id: 'alloc123',
        schoolId: mockSchoolId,
        paymentTier: PaymentTier.HALF,
        studentCount: 100,
        creditsAllocated: 450,
        creditsUsed: 100,
        creditsRemaining: 350,
        accessExpiresAt: new Date('2024-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      vi.mocked(prisma.sMSCreditAllocation.update).mockResolvedValue({} as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue({
        ...mockSubscription,
        paymentTier: PaymentTier.FULL,
      } as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should update existing subscription to FULL tier', async () => {
      const request = createMockRequest({ 
        reason: 'Full payment received', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should update subscription with correct data', async () => {
      const request = createMockRequest({ 
        reason: 'Full payment received', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.schoolSubscription.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          paymentTier: PaymentTier.FULL,
          paymentAmount: 1000000,
          studentCount: 100,
          isActive: true,
          lastPaymentDate: expect.any(Date),
        }),
      })
    })

    it('should update SMS credit allocation for FULL tier', async () => {
      const request = createMockRequest({ 
        reason: 'Full payment received', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      // FULL tier: 9x student count = 900 credits
      expect(prisma.sMSCreditAllocation.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          paymentTier: PaymentTier.FULL,
          studentCount: 100,
          creditsAllocated: 900,
          creditsRemaining: 800, // 350 + (900 - 450)
        }),
      })
    })

    it('should set accessExpiresAt to null for FULL tier', async () => {
      const request = createMockRequest({ 
        reason: 'Full payment received', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.schoolSubscription.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          accessExpiresAt: null,
        }),
      })
    })

    it('should set accessExpiresAt for HALF tier', async () => {
      const request = createMockRequest({ 
        reason: 'Half payment received', 
        paymentTier: PaymentTier.HALF,
        paymentAmount: 500000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.schoolSubscription.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          accessExpiresAt: expect.any(Date),
        }),
      })
    })

    it('should calculate correct SMS credits for HALF tier', async () => {
      const request = createMockRequest({ 
        reason: 'Half payment received', 
        paymentTier: PaymentTier.HALF,
        paymentAmount: 500000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      // HALF tier: 4.5x student count = 450 credits
      expect(prisma.sMSCreditAllocation.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          creditsAllocated: 450,
        }),
      })
    })

    it('should calculate correct SMS credits for QUARTER tier', async () => {
      const request = createMockRequest({ 
        reason: 'Quarter payment received', 
        paymentTier: PaymentTier.QUARTER,
        paymentAmount: 250000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      // QUARTER tier: 2.25x student count = 225 credits
      expect(prisma.sMSCreditAllocation.update).toHaveBeenCalledWith({
        where: { schoolId: mockSchoolId },
        data: expect.objectContaining({
          creditsAllocated: 225,
        }),
      })
    })
  })

  describe('Successful Plan Change - Create New Subscription', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValueOnce(null)
      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.create).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.sMSCreditAllocation.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.sMSCreditAllocation.create).mockResolvedValue({} as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValueOnce({
        ...mockSubscription,
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
      } as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should create new subscription if none exists', async () => {
      const request = createMockRequest({ 
        reason: 'Initial subscription', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.schoolSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockSchoolId,
          paymentTier: PaymentTier.FULL,
          paymentAmount: 1000000,
          studentCount: 100,
        }),
      })
    })

    it('should create new SMS credit allocation if none exists', async () => {
      const request = createMockRequest({ 
        reason: 'Initial subscription', 
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.sMSCreditAllocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: mockSchoolId,
          paymentTier: PaymentTier.FULL,
          studentCount: 100,
          creditsAllocated: 900,
          creditsUsed: 0,
          creditsRemaining: 900,
        }),
      })
    })
  })

  describe('Audit Logging', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should create audit log entry with correct data', async () => {
      const request = createMockRequest({ 
        reason: 'Upgrade to premium', 
        licenseType: LicenseType.PREMIUM 
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: {
          timestamp: expect.any(Date),
          adminId: 'admin123',
          adminEmail: 'admin@example.com',
          actionType: ActionType.CHANGE_PLAN,
          targetSchoolId: mockSchoolId,
          targetSchoolName: 'Test School',
          reason: 'Upgrade to premium',
          result: 'success',
          errorMessage: null,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          metadata: expect.objectContaining({
            previousValues: expect.any(Object),
            newValues: expect.any(Object),
            timestamp: expect.any(String),
          }),
        },
      })
    })

    it('should include previous and new values in metadata', async () => {
      const request = createMockRequest({ 
        reason: 'Plan change', 
        licenseType: LicenseType.PREMIUM,
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            previousValues: {
              licenseType: LicenseType.FREE_PILOT,
              paymentTier: PaymentTier.HALF,
              paymentAmount: 500000,
              studentCount: 100,
            },
            newValues: {
              licenseType: LicenseType.PREMIUM,
              paymentTier: PaymentTier.FULL,
              paymentAmount: 1000000,
              studentCount: 100,
            },
            timestamp: expect.any(String),
          },
        }),
      })
    })

    it('should invalidate dashboard cache', async () => {
      const request = createMockRequest({ 
        reason: 'Plan change', 
        licenseType: LicenseType.PREMIUM 
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(invalidateDashboardCache).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
    })

    it('should return 500 if school update fails', async () => {
      vi.mocked(prisma.school.update).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.message).toBe('Failed to change school plan')
    })

    it('should create failure audit log on error', async () => {
      vi.mocked(prisma.school.update).mockRejectedValue(new Error('Database error'))
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: 'failure',
            errorMessage: 'Database error',
          }),
        })
      )
    })

    it('should continue even if cache invalidation fails', async () => {
      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(invalidateDashboardCache).mockImplementation(() => {
        throw new Error('Cache error')
      })
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

      const request = createMockRequest({ reason: 'Test reason', licenseType: LicenseType.PREMIUM })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Requirements Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSuperAdminSession as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(prisma.schoolSubscription.findUnique).mockResolvedValue(mockSubscription as any)
      vi.mocked(prisma.school.update).mockResolvedValue(mockSchool as any)
      vi.mocked(prisma.school.findUnique).mockResolvedValueOnce(mockSchool as any)
      vi.mocked(invalidateDashboardCache).mockReturnValue(undefined)
      vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)
    })

    it('should implement plan change action (Requirement 7.3)', async () => {
      const request = createMockRequest({ 
        reason: 'Plan upgrade', 
        licenseType: LicenseType.PREMIUM 
      })
      const response = await POST(request, { params: { id: mockSchoolId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should update subscription plan and billing (Requirement 7.3)', async () => {
      const request = createMockRequest({ 
        reason: 'Plan upgrade', 
        licenseType: LicenseType.PREMIUM,
        paymentTier: PaymentTier.FULL,
        paymentAmount: 1000000,
        studentCount: 100,
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.school.update).toHaveBeenCalled()
    })

    it('should create audit log entry (Requirement 7.7, 7.8)', async () => {
      const request = createMockRequest({ 
        reason: 'Plan upgrade', 
        licenseType: LicenseType.PREMIUM 
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: ActionType.CHANGE_PLAN,
            result: 'success',
            timestamp: expect.any(Date),
          }),
        })
      )
    })

    it('should invalidate caches (Requirement 7.8)', async () => {
      const request = createMockRequest({ 
        reason: 'Plan upgrade', 
        licenseType: LicenseType.PREMIUM 
      })
      await POST(request, { params: { id: mockSchoolId } })

      expect(invalidateDashboardCache).toHaveBeenCalled()
    })
  })
})
