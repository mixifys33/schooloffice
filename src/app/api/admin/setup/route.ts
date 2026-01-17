/**
 * Super Admin Setup API
 * Handles first-time super admin registration
 * 
 * GET - Check if super admin exists
 * POST - Create first super admin (only works if none exists)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Check if a super admin already exists
 */
export async function GET() {
  try {
    const superAdminCount = await prisma.user.count({
      where: {
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    return NextResponse.json({
      exists: superAdminCount > 0,
      message: superAdminCount > 0 
        ? 'Super Admin already configured' 
        : 'No Super Admin found. First-time setup required.',
    })
  } catch (error) {
    console.error('Error checking super admin:', error)
    return NextResponse.json(
      { error: 'Failed to check super admin status' },
      { status: 500 }
    )
  }
}

/**
 * Create the first super admin account
 * This only works if no super admin exists yet
 */
export async function POST(request: NextRequest) {
  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
        schoolId: null,
      },
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Super Admin already exists. Registration is disabled.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, confirmPassword } = body

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Email, password, and confirm password are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Password complexity check
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, number, and special character' },
        { status: 400 }
      )
    }

    // Check if email is already in use
    // Note: Email uniqueness is compound with schoolId, so we check for any user with this email
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create super admin (User model doesn't have a name field)
    const superAdmin = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'SUPER_ADMIN',
        roles: ['SUPER_ADMIN'],
        activeRole: 'SUPER_ADMIN',
        schoolId: null,
        isActive: true,
        failedAttempts: 0,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Super Admin account created successfully',
      userId: superAdmin.id,
    })
  } catch (error) {
    console.error('Error creating super admin:', error)
    return NextResponse.json(
      { error: 'Failed to create super admin account' },
      { status: 500 }
    )
  }
}
