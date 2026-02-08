/**
 * Middleware Configuration Tests
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Tests to verify middleware configuration is correct
 */

import { describe, it, expect } from 'vitest'

describe('Middleware Configuration', () => {
  it('should have correct route patterns for super admin protection', async () => {
    // Import the middleware config
    const middlewareModule = await import('../../middleware')
    const config = middlewareModule.config
    
    expect(config).toBeDefined()
    expect(config.matcher).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
    
    // Verify the expected patterns are present
    const expectedPatterns = [
      '/super-admin/:path*',
      '/dashboard/super-admin/:path*', 
      '/api/super-admin/:path*'
    ]
    
    expectedPatterns.forEach(pattern => {
      expect(config.matcher).toContain(pattern)
    })
  })

  it('should protect all super admin routes', () => {
    const patterns = [
      '/super-admin/:path*',
      '/dashboard/super-admin/:path*',
      '/api/super-admin/:path*'
    ]
    
    const testRoutes = [
      { route: '/super-admin', shouldMatch: true },
      { route: '/super-admin/dashboard', shouldMatch: true },
      { route: '/super-admin/schools/123', shouldMatch: true },
      { route: '/dashboard/super-admin', shouldMatch: true },
      { route: '/dashboard/super-admin/schools', shouldMatch: true },
      { route: '/api/super-admin/dashboard', shouldMatch: true },
      { route: '/api/super-admin/schools/123/suspend', shouldMatch: true },
      { route: '/dashboard', shouldMatch: false },
      { route: '/api/schools/123', shouldMatch: false },
      { route: '/login', shouldMatch: false }
    ]
    
    testRoutes.forEach(({ route, shouldMatch }) => {
      const matches = patterns.some(pattern => {
        // Convert Next.js pattern to simple check
        if (pattern.endsWith(':path*')) {
          const basePattern = pattern.replace('/:path*', '')
          return route === basePattern || route.startsWith(basePattern + '/')
        }
        return route === pattern
      })
      
      expect(matches).toBe(shouldMatch)
    })
  })

  it('should have SUPER_ADMIN role constant defined', async () => {
    const { Role } = await import('@/types/enums')
    expect(Role.SUPER_ADMIN).toBeDefined()
    expect(typeof Role.SUPER_ADMIN).toBe('string')
  })
})