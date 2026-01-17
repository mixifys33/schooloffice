/**
 * Context Validation API Route
 * Validates and manages session context
 * Requirements: 18.4, 18.6
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { contextManagementService } from '@/services/context-management.service'

/**
 * GET /api/auth/context
 * Get current session context and validate it
 * Requirements: 18.4 - Persist context across page refreshes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use session ID from cookie or generate one
    const sessionId = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      session.user.id

    // Validate context
    const validation = await contextManagementService.validateContext(sessionId)

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          reason: validation.reason,
          shouldRedirectToLogin: validation.shouldRedirectToLogin,
        },
        { status: 403 }
      )
    }

    // Get context display info
    const contextInfo = contextManagementService.getContextDisplayInfo(sessionId)

    return NextResponse.json({
      valid: true,
      context: {
        schoolName: session.user.schoolName || contextInfo?.schoolName,
        schoolCode: session.user.schoolCode,
        activeRole: session.user.activeRole || contextInfo?.activeRole,
        termInfo: contextInfo?.termInfo,
      },
    })
  } catch (error) {
    console.error('Context validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate context' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/context
 * Initialize or update session context
 * Requirements: 18.1, 18.2
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, role } = body

    // Use session ID from cookie or generate one
    const sessionId = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      session.user.id

    if (action === 'initialize') {
      // Initialize context after login
      const context = await contextManagementService.initializeContext(
        sessionId,
        session.user.id,
        session.user.schoolId || null,
        session.user.activeRole
      )

      return NextResponse.json({
        success: true,
        context: context ? {
          schoolName: context.schoolName,
          schoolCode: context.schoolCode,
          activeRole: context.activeRole,
          termInfo: context.academicYear,
        } : null,
      })
    }

    if (action === 'switchRole' && role) {
      // Switch role within current school context
      // Requirements: 18.2 - Role switch maintains school context
      try {
        const context = await contextManagementService.switchRoleContext(sessionId, role)

        return NextResponse.json({
          success: true,
          context: {
            schoolName: context.schoolName,
            schoolCode: context.schoolCode,
            activeRole: context.activeRole,
            termInfo: context.academicYear,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to switch role'
        return NextResponse.json(
          { error: message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Context update error:', error)
    return NextResponse.json(
      { error: 'Failed to update context' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/context
 * Invalidate session context (logout)
 * Requirements: 18.6
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Use session ID from cookie or generate one
    const sessionId = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value ||
                      session.user.id

    await contextManagementService.invalidateContext(sessionId, 'MANUAL_LOGOUT')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Context invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate context' },
      { status: 500 }
    )
  }
}
