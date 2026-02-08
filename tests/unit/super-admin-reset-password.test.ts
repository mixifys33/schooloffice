/**
 * Unit Tests for Super Admin Reset Password Endpoint
 * Tests Requirements: 7.4, 7.7, 7.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/[id]/reset-password/route'
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
      findFirst: vi.fn(),
    },
    superAdminAuditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/services/email.service', () => ({
  emailService: {
    sendEmail: vi.fn(),
  },
}))

vi.mock('@/lib/password-reset-store', () => ({
  storeResetToken: vi.fn(),
}))

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: () => 'mock-reset-token-123',
    })),
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { emailService } from '@/services/email.service'
import { storeResetToken } from '@/lib/password-reset-store'

describe('POST /api/super-admin/schools/[id]/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not SUPER_ADMIN', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'user123',
        email: 'admin@school.com',
        role: Role.SCHOOL_ADMIN,
        roles: [Role.SCHOOL_ADMIN],
        activeRole: Role.SCHOOL_ADMIN,
        schoolId: 'school123',
      },
      expires: '2024-12-31',
    })

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return 400 if reason is not provided', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'super@admin.com',
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      expires: '2024-12-31',
    })

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Reason is required')
  })

  it('should return 404 if school not found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'super@admin.com',
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      expires: '2024-12-31',
    })

    vi.mocked(prisma.school.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('School not found')
  })

  it('should return 404 if no active school admin found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'super@admin.com',
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      expires: '2024-12-31',
    })

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school123',
      name: 'Test School',
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toContain('No active school admin found')
  })

  it('should successfully generate reset token, send email, and create audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'super@admin.com',
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      expires: '2024-12-31',
    })

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school123',
      name: 'Test School',
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'admin123',
      email: 'admin@testschool.com',
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: 'SENT' as any,
      recipient: 'admin@testschool.com',
      provider: 'gmail',
      usedFallback: false,
    })

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Password reset link sent successfully')
    expect(data.data.adminEmail).toBe('admin@testschool.com')

    // Verify reset token was stored
    expect(storeResetToken).toHaveBeenCalledWith(
      'mock-reset-token-123',
      expect.objectContaining({
        userId: 'admin123',
      })
    )

    // Verify email was sent
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@testschool.com',
        subject: expect.stringContaining('Password Reset'),
      })
    )

    // Verify audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'superadmin123',
        adminEmail: 'super@admin.com',
        actionType: ActionType.RESET_PASSWORD,
        targetSchoolId: 'school123',
        targetSchoolName: 'Test School',
        reason: 'Admin forgot password',
        result: 'success',
      }),
    })
  })

  it('should create audit log with failure result if email fails', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: 'superadmin123',
        email: 'super@admin.com',
        role: Role.SUPER_ADMIN,
        roles: [Role.SUPER_ADMIN],
        activeRole: Role.SUPER_ADMIN,
      },
      expires: '2024-12-31',
    })

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school123',
      name: 'Test School',
    } as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'admin123',
      email: 'admin@testschool.com',
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: false,
      status: 'FAILED' as any,
      error: 'SMTP connection failed',
      recipient: 'admin@testschool.com',
      provider: 'gmail',
      usedFallback: false,
    })

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/school123/reset-password', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Admin forgot password' }),
    })

    const response = await POST(request, { params: { id: 'school123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Email Failed')

    // Verify audit log was created with failure result
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        result: 'failure',
        errorMessage: expect.stringContaining('Failed to send reset email'),
      }),
    })
  })
})
