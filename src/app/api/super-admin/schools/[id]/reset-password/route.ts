/**
 * Super Admin - Reset School Admin Password
 * POST /api/super-admin/schools/[id]/reset-password
 * 
 * Requirements: 7.4, 7.7, 7.8
 * - Generate password reset token
 * - Send reset link to admin email
 * - Create audit log entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { emailService } from '@/services/email.service'
import { storeResetToken } from '@/lib/password-reset-store'
import crypto from 'crypto'

/**
 * POST /api/super-admin/schools/[id]/reset-password
 * Reset school admin password
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate and authorize
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const { id: schoolId } = await params
    const { reason } = await request.json()

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Get school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    // Find the school admin user
    const schoolAdmin = await prisma.user.findFirst({
      where: {
        schoolId: schoolId,
        role: Role.SCHOOL_ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    })

    if (!schoolAdmin) {
      return NextResponse.json(
        { error: 'Not Found', message: 'No active school admin found for this school' },
        { status: 404 }
      )
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date()
    tokenExpiry.setHours(tokenExpiry.getHours() + 1) // Token expires in 1 hour

    // Store reset token
    storeResetToken(resetToken, {
      userId: schoolAdmin.id,
      expires: tokenExpiry,
    })

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Send password reset email
    let emailSent = false
    let emailError: string | undefined

    try {
      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
      
      // Generate reset email
      const emailResult = await emailService.sendEmail({
        to: schoolAdmin.email,
        subject: 'Password Reset Request - SchoolOffice',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>A password reset has been requested for your school admin account at <strong>${school.name}</strong>.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a56db; color: var(--white-pure); text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p style="color: var(--chart-red); margin-top: 20px;">
            <strong>Security Notice:</strong> If you didn't request this password reset, please contact support immediately.
          </p>
        `,
        text: `
Password Reset Request

Hello,

A password reset has been requested for your school admin account at ${school.name}.

Use this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

SECURITY NOTICE: If you didn't request this password reset, please contact support immediately.
        `.trim(),
      })

      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
      }
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      emailError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Create audit log entry
    const auditResult = emailSent ? 'success' : 'failure'
    const auditErrorMessage = emailSent ? null : `Failed to send reset email: ${emailError}`

    await prisma.superAdminAuditLog.create({
      data: {
        timestamp: new Date(),
        adminId: session.user.id,
        adminEmail: session.user.email,
        actionType: ActionType.RESET_PASSWORD,
        targetSchoolId: schoolId,
        targetSchoolName: school.name,
        reason: reason.trim(),
        result: auditResult,
        errorMessage: auditErrorMessage,
        ipAddress,
        userAgent,
        metadata: {
          adminEmail: schoolAdmin.email,
          tokenExpiry: tokenExpiry.toISOString(),
        },
      },
    })

    // Return response based on email result
    if (!emailSent) {
      return NextResponse.json(
        {
          error: 'Email Failed',
          message: 'Password reset token generated but failed to send email',
          details: emailError,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent successfully',
      data: {
        adminEmail: schoolAdmin.email,
        expiresAt: tokenExpiry.toISOString(),
      },
    })

  } catch (error) {
    console.error('Reset password error:', error)
    
    // Try to log the error in audit log
    try {
      const session = await auth()
      if (session?.user) {
        const ipAddress = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        await prisma.superAdminAuditLog.create({
          data: {
            timestamp: new Date(),
            adminId: session.user.id,
            adminEmail: session.user.email,
            actionType: ActionType.RESET_PASSWORD,
            targetSchoolId: params.id,
            targetSchoolName: 'Unknown',
            reason: 'System error during password reset',
            result: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            ipAddress,
            userAgent,
            metadata: {},
          },
        })
      }
    } catch (auditError) {
      console.error('Failed to create audit log for error:', auditError)
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to reset password',
      },
      { status: 500 }
    )
  }
}
