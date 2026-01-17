/**
 * Role Switch API Endpoint
 * Requirements: 3.4, 3.5, 3.6, 7.3
 * - Allow role selection without re-authentication
 * - Validate user has the claimed role
 * - Update session with new active role and permissions
 * - Log role switch events
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { authService } from '@/services/auth.service'
import { Role } from '@/types/enums'

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { role } = body

    // Validate role is provided
    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Validate role is a valid Role enum value
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get IP address and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Switch role using auth service
    // Requirements: 3.4, 3.5, 3.6
    const result = await authService.switchRole(
      session.user.id,
      role as Role,
      session.user.schoolId,
      ipAddress,
      userAgent
    )

    if (!result.success) {
      // Return appropriate error
      if (result.error === 'INVALID_CREDENTIALS') {
        return NextResponse.json(
          { error: 'You do not have access to this role' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to switch role' },
        { status: 400 }
      )
    }

    // Return success with new role info
    return NextResponse.json({
      success: true,
      activeRole: result.user?.activeRole,
      dashboardPath: result.dashboardPath,
    })
  } catch (error) {
    console.error('Role switch error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
