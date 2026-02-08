/**
 * Super Admin Middleware Tests
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Tests the middleware protection for super admin routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { middleware } from '../../middleware'
import { Role } from '@/types/enums'

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn()
}))

const mockGetToken = vi.mocked(getToken)

describe('Super Admin Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Route Protection', () => {
    it('should allow access to non-super-admin routes without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      
      const response = await middleware(request)
      
      expect(response).toBeDefined()
      // Should pass through without authentication check
      expect(mockGetToken).not.toHaveBeenCalled()
    })

    it('should redirect unauthenticated users from super-admin UI routes to login', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('callbackUrl')
    })

    it('should return 401 for unauthenticated API requests', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Authentication required')
    })

    it('should redirect non-super-admin users from UI routes to access denied', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: Role.SCHOOL_ADMIN,
        activeRole: Role.SCHOOL_ADMIN
      })
      
      const request = new NextRequest('http://localhost:3000/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/dashboard/access-denied')
    })

    it('should return 403 for non-super-admin API requests', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: Role.SCHOOL_ADMIN,
        activeRole: Role.SCHOOL_ADMIN
      })
      
      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
      expect(body.message).toBe('Super Admin access required')
      expect(body.code).toBe('SUPER_ADMIN_REQUIRED')
    })

    it('should allow super admin users to access protected routes', async () => {
      mockGetToken.mockResolvedValue({
        id: 'superadmin123',
        email: 'superadmin@example.com',
        role: Role.SUPER_ADMIN,
        activeRole: Role.SUPER_ADMIN
      })
      
      const request = new NextRequest('http://localhost:3000/super-admin/dashboard')
      
      const response = await middleware(request)
      
      // Should pass through (NextResponse.next())
      expect(response.status).toBe(200)
    })

    it('should allow users with activeRole SUPER_ADMIN to access protected routes', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: Role.SCHOOL_ADMIN,
        activeRole: Role.SUPER_ADMIN
      })
      
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      
      const response = await middleware(request)
      
      // Should pass through (NextResponse.next())
      expect(response.status).toBe(200)
    })
  })

  describe('Authentication Failure Logging', () => {
    it('should log authentication failures with proper details', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      mockGetToken.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/super-admin/dashboard', {
        headers: {
          'user-agent': 'test-browser',
          'x-forwarded-for': '192.168.1.1'
        }
      })
      
      await middleware(request)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Super Admin authentication failure:',
        expect.objectContaining({
          timestamp: expect.any(String),
          path: '/super-admin/dashboard',
          ip: '192.168.1.1',
          userAgent: 'test-browser',
          reason: 'No authentication token'
        })
      )
    })

    it('should log insufficient permissions with user details', async () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      mockGetToken.mockResolvedValue({
        id: 'user123',
        email: 'user@example.com',
        role: Role.TEACHER,
        activeRole: Role.TEACHER
      })
      
      const request = new NextRequest('http://localhost:3000/api/super-admin/schools')
      
      await middleware(request)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Super Admin authentication failure:',
        expect.objectContaining({
          userId: 'user123',
          email: 'user@example.com',
          reason: 'Insufficient permissions - not SUPER_ADMIN'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle JWT token errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')
      mockGetToken.mockRejectedValue(new Error('JWT verification failed'))
      
      const request = new NextRequest('http://localhost:3000/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Middleware authentication error:',
        expect.any(Error)
      )
      
      // Should redirect to login on error
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should return 500 for API routes when authentication errors occur', async () => {
      mockGetToken.mockRejectedValue(new Error('JWT verification failed'))
      
      const request = new NextRequest('http://localhost:3000/api/super-admin/dashboard')
      
      const response = await middleware(request)
      
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal Server Error')
      expect(body.message).toBe('Authentication failed')
    })
  })

  describe('Route Matching', () => {
    const protectedRoutes = [
      '/super-admin',
      '/super-admin/dashboard',
      '/super-admin/schools/123',
      '/dashboard/super-admin',
      '/dashboard/super-admin/schools',
      '/api/super-admin/dashboard',
      '/api/super-admin/schools/123/suspend'
    ]

    const unprotectedRoutes = [
      '/dashboard',
      '/login',
      '/api/auth/signin',
      '/api/schools/123',
      '/teacher/dashboard'
    ]

    protectedRoutes.forEach(route => {
      it(`should protect route: ${route}`, async () => {
        mockGetToken.mockResolvedValue(null)
        
        const request = new NextRequest(`http://localhost:3000${route}`)
        
        const response = await middleware(request)
        
        // Should require authentication
        expect(response.status).toBeGreaterThanOrEqual(300)
        expect(mockGetToken).toHaveBeenCalled()
      })
    })

    unprotectedRoutes.forEach(route => {
      it(`should not protect route: ${route}`, async () => {
        const request = new NextRequest(`http://localhost:3000${route}`)
        
        const response = await middleware(request)
        
        // Should pass through without authentication check
        expect(mockGetToken).not.toHaveBeenCalled()
      })
    })
  })
})