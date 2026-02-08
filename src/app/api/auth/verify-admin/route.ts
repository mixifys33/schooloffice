import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { formatApiError } from '@/lib/error-messages'

/**
 * POST /api/auth/verify-admin
 * Verify admin credentials for sensitive operations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
    }

    // Only school admins can perform verification
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'You do not have permission to perform this action' }, { status: 403 })
    }

    const body = await request.json()
    const { identifier, password } = body

    if (!identifier || !password) {
      return NextResponse.json({ 
        error: 'Please provide your email/phone/username and password for verification' 
      }, { status: 400 })
    }

    // Find the user by identifier (email, phone, or username)
    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { phone: identifier }, // Phone numbers don't need case-insensitive matching
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid credentials. Please check your information and try again.' 
      }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ 
        error: 'Your account is inactive. Please contact support.' 
      }, { status: 401 })
    }

    if (!user.passwordHash) {
      return NextResponse.json({ 
        error: 'Password verification failed. Please contact support.' 
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json({ 
        error: 'Invalid password. Please check your password and try again.' 
      }, { status: 401 })
    }

    // Verification successful
    return NextResponse.json({ 
      success: true, 
      message: 'Admin credentials verified successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Error verifying admin credentials:', error)
    const apiError = formatApiError(error)
    return NextResponse.json(apiError, { status: 500 })
  }
}