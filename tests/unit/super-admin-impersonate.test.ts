/**
 * Unit Tests: Super Admin Impersonate Endpoint
 * POST /api/super-admin/schools/[id]/impersonate
 * 
 * Requirements: 7.6, 7.7, 7.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/[id]/impersonate/route'
import { NextRequest } from 'next/server'
import { Role, AuthEventType } from '@/types/enums'
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
      findFirst: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/services/super-admin-restriction.service', () => ({
  superAdminRestrictionService: {
    startImpersonation: vi.fn(),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { superAdminRestrictionService } from '@/services/super-admin-restriction.service'

describe('POST /api/super-admin/schools/[id]/impersonate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.message).toBe('Authentication required')
  })

  it('should return 403 if user is not a super admin', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'user123',
        email: 'admin@school.com',
        role: Role.SCHOOL_ADMIN,
        schoolId: 'school123',
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
    expect(data.message).toBe('Super Admin access required')
  })

  it('should return 400 if reason is not provided', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('Reason is required for this action')
  })

  it('should return 404 if school is not found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('School not found')
  })

  it('should return 404 if no active school admin is found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('No active school admin found for this school')
  })

  it('should successfully start impersonation session and create audit log', async () => {
    const mockSession = {
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    }

    const mockSchool = {
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    }

    const mockSchoolAdmin = {
      id: 'admin123',
      email: 'admin@testschool.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    const mockImpersonationSession = {
      id: 'imp_123456',
      superAdminId: 'superadmin123',
      targetSchoolId: 'school123',
      targetSchoolCode: 'TEST001',
      targetSchoolName: 'Test School',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T10:30:00Z'),
      isReadOnly: true,
      actions: [],
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockSchoolAdmin as any)
    vi.mocked(superAdminRestrictionService.startImpersonation).mockResolvedValue(mockImpersonationSession)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Impersonation session started')
    expect(data.data.sessionId).toBe('imp_123456')
    expect(data.data.schoolId).toBe('school123')
    expect(data.data.schoolName).toBe('Test School')
    expect(data.data.schoolAdminEmail).toBe('admin@testschool.com')
    expect(data.data.isReadOnly).toBe(true)
    expect(data.data.redirectUrl).toContain('impersonate=imp_123456')

    // Verify impersonation session was started
    expect(superAdminRestrictionService.startImpersonation).toHaveBeenCalledWith(
      'superadmin123',
      'school123',
      30 * 60 * 1000, // 30 minutes in ms
      true // isReadOnly
    )

    // Verify audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'superadmin123',
        adminEmail: 'superadmin@platform.com',
        actionType: ActionType.IMPERSONATE,
        targetSchoolId: 'school123',
        targetSchoolName: 'Test School',
        reason: 'Testing impersonation',
        result: 'success',
        errorMessage: null,
        metadata: expect.objectContaining({
          sessionId: 'imp_123456',
          schoolAdminId: 'admin123',
          schoolAdminEmail: 'admin@testschool.com',
          isReadOnly: true,
        }),
      }),
    })
  })

  it('should respect custom duration and read-only settings', async () => {
    const mockSession = {
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    }

    const mockSchool = {
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    }

    const mockSchoolAdmin = {
      id: 'admin123',
      email: 'admin@testschool.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    const mockImpersonationSession = {
      id: 'imp_123456',
      superAdminId: 'superadmin123',
      targetSchoolId: 'school123',
      targetSchoolCode: 'TEST001',
      targetSchoolName: 'Test School',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T11:00:00Z'),
      isReadOnly: false,
      actions: [],
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockSchoolAdmin as any)
    vi.mocked(superAdminRestrictionService.startImpersonation).mockResolvedValue(mockImpersonationSession)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ 
        reason: 'Testing impersonation',
        durationMinutes: 60,
        isReadOnly: false,
      }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isReadOnly).toBe(false)
    expect(data.data.durationMinutes).toBe(60)

    // Verify impersonation session was started with custom settings
    expect(superAdminRestrictionService.startImpersonation).toHaveBeenCalledWith(
      'superadmin123',
      'school123',
      60 * 60 * 1000, // 60 minutes in ms
      false // isReadOnly
    )
  })

  it('should enforce maximum duration of 120 minutes', async () => {
    const mockSession = {
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    }

    const mockSchool = {
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    }

    const mockSchoolAdmin = {
      id: 'admin123',
      email: 'admin@testschool.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    const mockImpersonationSession = {
      id: 'imp_123456',
      superAdminId: 'superadmin123',
      targetSchoolId: 'school123',
      targetSchoolCode: 'TEST001',
      targetSchoolName: 'Test School',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T12:00:00Z'),
      isReadOnly: true,
      actions: [],
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockSchoolAdmin as any)
    vi.mocked(superAdminRestrictionService.startImpersonation).mockResolvedValue(mockImpersonationSession)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ 
        reason: 'Testing impersonation',
        durationMinutes: 180, // Request 3 hours
      }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.durationMinutes).toBe(120) // Should be capped at 120 minutes

    // Verify impersonation session was started with max duration
    expect(superAdminRestrictionService.startImpersonation).toHaveBeenCalledWith(
      'superadmin123',
      'school123',
      120 * 60 * 1000, // 120 minutes in ms (max)
      true
    )
  })

  it('should handle impersonation service failure and create failure audit log', async () => {
    const mockSession = {
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    }

    const mockSchool = {
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    }

    const mockSchoolAdmin = {
      id: 'admin123',
      email: 'admin@testschool.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockSchoolAdmin as any)
    vi.mocked(superAdminRestrictionService.startImpersonation).mockRejectedValue(
      new Error('Impersonation service unavailable')
    )
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(data.message).toBe('Failed to start impersonation session')

    // Verify failure audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'superadmin123',
        actionType: ActionType.IMPERSONATE,
        targetSchoolId: 'school123',
        result: 'failure',
        errorMessage: 'Impersonation service unavailable',
      }),
    })
  })

  it('should include IP address and user agent in audit log', async () => {
    const mockSession = {
      user: {
        id: 'superadmin123',
        email: 'superadmin@platform.com',
        role: Role.SUPER_ADMIN,
        schoolId: null,
      },
    }

    const mockSchool = {
      id: 'school123',
      name: 'Test School',
      code: 'TEST001',
      status: 'ACTIVE',
    }

    const mockSchoolAdmin = {
      id: 'admin123',
      email: 'admin@testschool.com',
      firstName: 'John',
      lastName: 'Doe',
    }

    const mockImpersonationSession = {
      id: 'imp_123456',
      superAdminId: 'superadmin123',
      targetSchoolId: 'school123',
      targetSchoolCode: 'TEST001',
      targetSchoolName: 'Test School',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      expiresAt: new Date('2024-01-01T10:30:00Z'),
      isReadOnly: true,
      actions: [],
    }

    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.school.findUnique).mockResolvedValue(mockSchool as any)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockSchoolAdmin as any)
    vi.mocked(superAdminRestrictionService.startImpersonation).mockResolvedValue(mockImpersonationSession)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/impersonate', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 Test Browser',
      },
      body: JSON.stringify({ reason: 'Testing impersonation' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })

    expect(response.status).toBe(200)

    // Verify audit log includes IP and user agent
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }),
    })
  })
})
