import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/verify-identity
 * Verify user identity for forced password reset
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, phone, name, role, schoolId, currentPassword } = body

    // Validate required fields
    if (!email || !name || !currentPassword) {
      return NextResponse.json(
        { error: 'Email, name, and current password are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        passwordHash: true,
        school: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      )
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Verify email matches
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match our records' },
        { status: 400 }
      )
    }

    // Verify school matches (if provided)
    if (schoolId && user.school?.id !== schoolId) {
      return NextResponse.json(
        { error: 'School information does not match our records' },
        { status: 400 }
      )
    }

    // For phone verification, we'll be more lenient since it might not be set
    if (phone && user.phone && user.phone !== phone) {
      return NextResponse.json(
        { error: 'Phone number does not match our records' },
        { status: 400 }
      )
    }

    // Identity verified successfully
    return NextResponse.json({
      success: true,
      message: 'Identity verified successfully',
    })

  } catch (error) {
    console.error('Error verifying identity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}