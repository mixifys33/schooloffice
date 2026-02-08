/**
 * Unit Tests: Super Admin Bulk Reactivate Endpoint
 * POST /api/super-admin/schools/bulk-reactivate
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.6
 * - Process multiple schools with reactivate action
 * - Return individual results for each school
 * - Create individual audit log entries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/super-admin/schools/bulk-reactivate/route'
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

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

describe('POST /api/super-admin/schools/bulk-reactivate', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        reason: 'Testing bulk reactivate' 
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

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        reason: 'Testing bulk reactivate' 
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

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Testing bulk reactivate' }),
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

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ schoolIds: [], reason: 'Testing bulk reactivate' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('schoolIds')
  })

  it('should return 400 if reason is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ schoolIds: ['school1', 'school2'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Reason is required')
  })

  it('should successfully reactivate multiple schools and create individual audit logs', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    // Mock school lookups - both schools are suspended
    vi.mocked(prisma.school.findUnique)
      .mockResolvedValueOnce({
        id: 'school1',
        name: 'Test School 1',
        isActive: false,
      } as any)
      .mockResolvedValueOnce({
        id: 'school2',
        name: 'Test School 2',
        isActive: false,
      } as any)

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        reason: 'Testing bulk reactivate' 
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

    // Verify schools were reactivated
    expect(prisma.school.update).toHaveBeenCalledTimes(2)
    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school1' },
      data: {
        isActive: true,
        updatedAt: expect.any(Date),
      },
    })
    expect(prisma.school.update).toHaveBeenCalledWith({
      where: { id: 'school2' },
      data: {
        isActive: true,
        updatedAt: expect.any(Date),
      },
    })

    // Verify individual audit logs were created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledTimes(2)
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin123',
        adminEmail: 'admin@test.com',
        actionType: ActionType.BULK_REACTIVATE,
        targetSchoolId: 'school1',
        targetSchoolName: 'Test School 1',
        reason: 'Testing bulk reactivate',
        result: 'success',
        errorMessage: null,
      }),
    })
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: 'admin123',
        adminEmail: 'admin@test.com',
        actionType: ActionType.BULK_REACTIVATE,
        targetSchoolId: 'school2',
        targetSchoolName: 'Test School 2',
        reason: 'Testing bulk reactivate',
        result: 'success',
        errorMessage: null,
      }),
    })
  })

  it('should handle school not found and create failure audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['nonexistent'],
        reason: 'Testing bulk reactivate' 
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
        actionType: ActionType.BULK_REACTIVATE,
        targetSchoolId: 'nonexistent',
        targetSchoolName: 'Unknown',
        result: 'failure',
        errorMessage: 'School not found',
      }),
    })
  })

  it('should handle already active school and create failure audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      isActive: true, // Already active
    } as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        reason: 'Testing bulk reactivate' 
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
    expect(data.data.results[0].error).toBe('School is already active')

    // Verify school was not updated
    expect(prisma.school.update).not.toHaveBeenCalled()

    // Verify failure audit log was created
    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: ActionType.BULK_REACTIVATE,
        targetSchoolId: 'school1',
        targetSchoolName: 'Test School 1',
        result: 'failure',
        errorMessage: 'School is already active',
      }),
    })
  })

  it('should handle mixed success and failure results', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    // Mock school lookups - one suspended (success), one already active, one not found
    vi.mocked(prisma.school.findUnique)
      .mockResolvedValueOnce({
        id: 'school1',
        name: 'Test School 1',
        isActive: false, // Suspended - can reactivate
      } as any)
      .mockResolvedValueOnce({
        id: 'school2',
        name: 'Test School 2',
        isActive: true, // Already active
      } as any)
      .mockResolvedValueOnce(null) // Not found

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2', 'school3'],
        reason: 'Testing bulk reactivate' 
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
    expect(data.data.results[1].error).toBe('School is already active')
    expect(data.data.results[2].success).toBe(false)
    expect(data.data.results[2].error).toBe('School not found')

    // Verify only one school was updated
    expect(prisma.school.update).toHaveBeenCalledTimes(1)

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
        isActive: false,
      } as any)

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1', 'school2'],
        reason: 'Testing bulk reactivate' 
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

    // Verify second school was updated
    expect(prisma.school.update).toHaveBeenCalledTimes(1)
  })

  it('should include request metadata in audit logs', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      isActive: false,
    } as any)

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Browser',
      },
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        reason: 'Testing bulk reactivate' 
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

  it('should trim reason before storing in audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      isActive: false,
    } as any)

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        reason: '  Testing bulk reactivate  ' 
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: 'Testing bulk reactivate', // Trimmed
      }),
    })
  })

  it('should include metadata with previous status in audit log', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin123', email: 'admin@test.com', role: Role.SUPER_ADMIN },
    } as any)

    vi.mocked(prisma.school.findUnique).mockResolvedValue({
      id: 'school1',
      name: 'Test School 1',
      isActive: false,
    } as any)

    vi.mocked(prisma.school.update).mockResolvedValue({} as any)
    vi.mocked(prisma.superAdminAuditLog.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/super-admin/schools/bulk-reactivate', {
      method: 'POST',
      body: JSON.stringify({ 
        schoolIds: ['school1'],
        reason: 'Testing bulk reactivate' 
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(prisma.superAdminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          previousStatus: 'suspended',
          timestamp: expect.any(String),
        }),
      }),
    })
  })
})
