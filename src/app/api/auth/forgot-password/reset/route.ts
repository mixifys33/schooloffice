/**
 * Forgot Password - Reset Password
 * Step 4: Reset the password using the reset token
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getResetToken, deleteResetToken } from '@/lib/password-reset-store'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must include uppercase, lowercase, and number' },
        { status: 400 }
      )
    }

    // Get token data
    const tokenData = getResetToken(token)

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update user password
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      }
    })

    // Delete used token
    deleteResetToken(token)

    // Log password reset (without sensitive data)
    console.log(`[Password Reset] User ${tokenData.userId} password reset successfully`)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
