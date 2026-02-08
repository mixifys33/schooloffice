/**
 * Unit Tests: Super Admin Bulk Notice Endpoint
 * POST /api/super-admin/schools/bulk-notice
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.6
 * - Send notice to multiple schools
 * - Return individual results for each school
 * - Create individual audit log entries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/bulk-notice/route'
import { NextRequest } from 'next/server'
import { Role } from '@/types/enums'
import { ActionType, MessageStatus } from '@prisma/client'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    school: {
      findUnique: vi.fn(),
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

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { emailService } from '@/services/email.service'

describe('POST /api/super-admin/schools/bulk-notice', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a super admin', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user123', email: 'user@test.com', role: Role.SCHOOL_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return 400 if schoolIds is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('schoolIds')
  })

  it('should return 400 if schoolIds is empty array', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: [],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('schoolIds')
  })

  it('should return 400 if subject is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Subject is required')
  })

  it('should return 400 if message is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Message is required')
  })

  it('should return 400 if reason is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        message: 'This is a test notice',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Reason is required')
  })

  it('should successfully send notice to multiple schools and create individual audit logs', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    // Mock school lookups
    vi.mocked(prisma.school.findUnique)
      .mockResolvedValueOnce({
        id: 'school1',
        name: 'Test School 1',
        adminEmail: 'admin1@school1.com',
        isActive: true,
      } as any)
      .mockResolvedValueOnce({
        id: 'school2',
        name: 'Test School 2',
        adminEmail: 'admin2@school2.com',
        isActive: true,
      } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin@school.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(2)
    expect(data.data.succeeded).toBe(2)
    expect(data.data.failed).toBe(0)
    expect(data.data.results).toHaveLength(2)
    expect(data.data.results[0].success).toBe(true)
    expect(data.data.results[1].success).toBe(true)

    // Verify emails were sent
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2)
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin1@school1.com',
        subject: '[SchoolOffice] Important Notice',
      })
    )
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin2@school2.com',
        subject: '[SchoolOffice] Important Notice',
      })
    )

    // Verify individual audit logs were created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledTimes(2)
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin123',
        adminEmail: 'admin@test.com',
        actionType: ActionType.BULK_NOTICE,
        targetSchoolId: 'school1',
        targetSchoolName: 'Test School 1',
        reason: 'Testing bulk notice',
        result: 'success',
        errorMessage: null,
        metadata: expect.objectContaining({
          subject: 'Important Notice',
          emailSent: true,
        }),
      }),
    })
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin123',
        adminEmail: 'admin@test.com',
        actionType: ActionType.BULK_NOTICE,
        targetSchoolId: 'school2',
        targetSchoolName: 'Test School 2',
        reason: 'Testing bulk notice',
        result: 'success',
        errorMessage: null,
        metadata: expect.objectContaining({
          subject: 'Important Notice',
          emailSent: true,
        }),
      }),
    })
  })

  it('should handle school not found and create failure audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['nonexistent'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(1)
    expect(data.data.succeeded).toBe(0)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].success).toBe(false)
    expect(data.data.results[0].error).toBe('School not found')

    // Verify failure audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: ActionType.BULK_NOTICE,
        targetSchoolId: 'nonexistent',
        targetSchoolName: 'Unknown',
        result: 'failure',
        errorMessage: 'School not found',
      }),
    })

    // Verify no email was sent
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  it('should handle school without admin email and create failure audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      adminEmail: null, // No admin email
      isActive: true,
    } as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(1)
    expect(data.data.succeeded).toBe(0)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].success).toBe(false)
    expect(data.data.results[0].error).toBe('School admin email not found')

    // Verify failure audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: ActionType.BULK_NOTICE,
        targetSchoolId: 'school1',
        targetSchoolName: 'Test School 1',
        result: 'failure',
        errorMessage: 'School admin email not found',
      }),
    })

    // Verify no email was sent
    expect(emailService.sendEmail).not.toHaveBeenCalled()
  })

  it('should handle email sending failure and create failure audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      adminEmail: 'admin1@school1.com',
      isActive: true,
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: false,
      status: MessageStatus.FAILED,
      error: 'SMTP connection failed',
      recipient: 'admin1@school1.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(1)
    expect(data.data.succeeded).toBe(0)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].success).toBe(false)
    expect(data.data.results[0].error).toContain('Failed to send email')

    // Verify failure audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: ActionType.BULK_NOTICE,
        targetSchoolId: 'school1',
        targetSchoolName: 'Test School 1',
        result: 'failure',
        errorMessage: expect.stringContaining('Failed to send email'),
        metadata: expect.objectContaining({
          emailSent: false,
        }),
      }),
    })
  })

  it('should handle mixed success and failure results', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    // Mock school lookups - one success, one no email, one not found
    vi.mocked(prisma.school.findUnique)
      .mockResolvedValueOnce({
        id: 'school1',
        name: 'Test School 1',
        adminEmail: 'admin1@school1.com',
        isActive: true,
      } as any)
      .mockResolvedValueOnce({
        id: 'school2',
        name: 'Test School 2',
        adminEmail: null, // No email
        isActive: true,
      } as any)
      .mockResolvedValueOnce(null) // Not found

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin1@school1.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2', 'school3'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(3)
    expect(data.data.succeeded).toBe(1)
    expect(data.data.failed).toBe(2)
    
    // Verify results
    expect(data.data.results[0].success).toBe(true)
    expect(data.data.results[0].schoolId).toBe('school1')
    expect(data.data.results[1].success).toBe(false)
    expect(data.data.results[1].error).toBe('School admin email not found')
    expect(data.data.results[2].success).toBe(false)
    expect(data.data.results[2].error).toBe('School not found')

    // Verify only one email was sent
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)

    // Verify all three audit logs were created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledTimes(3)
  })

  it('should continue processing other schools if one fails with error', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    // Mock school lookups - first one throws error, second succeeds
    vi.mocked(prisma.school.findUnique)
      .mockRejectedValueOnce(new Error('Database error'))
      .mockResolvedValueOnce({
        id: 'school2',
        name: 'Test School 2',
        adminEmail: 'admin2@school2.com',
        isActive: true,
      } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin2@school2.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(2)
    expect(data.data.succeeded).toBe(1)
    expect(data.data.failed).toBe(1)
    
    // Verify first school failed
    expect(data.data.results[0].success).toBe(false)
    expect(data.data.results[0].error).toBe('Database error')
    
    // Verify second school succeeded
    expect(data.data.results[1].success).toBe(true)
    expect(data.data.results[1].schoolId).toBe('school2')

    // Verify second school received email
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('should include request metadata in audit logs', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      adminEmail: 'admin1@school1.com',
      isActive: true,
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin1@school1.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Browser',
      },
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        subject: 'Important Notice',
        message: 'This is a test notice',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      }),
    })
  })

  it('should include message preview in audit log metadata', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      adminEmail: 'admin1@school1.com',
      isActive: true,
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin1@school1.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const longMessage = 'A'.repeat(200) // Message longer than 100 chars

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        subject: 'Important Notice',
        message: longMessage,
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          subject: 'Important Notice',
          messagePreview: longMessage.substring(0, 100),
        }),
      }),
    })
  })

  it('should format email content with proper HTML structure', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      adminEmail: 'admin1@school1.com',
      isActive: true,
    } as any)

    vi.mocked(emailService.sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg123',
      status: MessageStatus.SENT,
      recipient: 'admin1@school1.com',
      provider: 'gmail',
      usedFallback: false,
    } as any)

    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-notice', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        subject: 'Important Notice',
        message: 'Line 1\nLine 2\nLine 3',
        reason: 'Testing bulk notice' 
      }),
    })

    const response = await POST(request)
    await response.json()

    const emailCall = vi.mocked(emailService.sendEmail).mock.calls[0][0]
    expect(emailCall.to).toBe('admin1@school1.com')
    expect(emailCall.subject).toBe('[SchoolOffice] Important Notice')
    expect(emailCall.html).toContain('<h2>Important Notice</h2>')
    expect(emailCall.html).toContain('Dear Test School 1 Administrator')
    expect(emailCall.html).toContain('Line 1<br>Line 2<br>Line 3')
    expect(emailCall.text).toContain('Important Notice')
    expect(emailCall.text).toContain('Line 1\nLine 2\nLine 3')
  })
})
