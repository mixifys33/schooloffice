import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { prisma } from '@/lib/db'

/**
 * POST /api/staff/onboarding/check-user
 * Check if a user with the given email or phone already exists
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
    }

    // Only school admins can check users
    if (session.user.role !== Role.SCHOOL_ADMIN && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'You do not have permission to check users' }, { status: 403 })
    }

    if (!session.user.schoolId && session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: 'School information is required' }, { status: 400 })
    }

    const body = await request.json()
    const { email, phone } = body

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    const schoolId = session.user.schoolId!

    // Check if user exists with this email or phone
    const existingUser = await prisma.user.findFirst({
      where: {
        schoolId,
        OR: [
          email ? { email: email.trim() } : {},
          phone ? { phone: phone.trim() } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      }
    })

    if (existingUser) {
      // Check which field(s) match
      const emailExists = existingUser.email === email?.trim()
      const phoneExists = existingUser.phone === phone?.trim()

      // Get user's display name and role
      const staffInfo = existingUser.staff?.[0]
      const displayName = staffInfo 
        ? `${staffInfo.firstName} ${staffInfo.lastName}`
        : existingUser.email

      return NextResponse.json({
        exists: true,
        emailExists,
        phoneExists,
        existingUser: {
          name: displayName,
          role: staffInfo?.role || existingUser.role,
          email: existingUser.email,
          phone: existingUser.phone,
        }
      })
    }

    return NextResponse.json({
      exists: false,
      emailExists: false,
      phoneExists: false,
    })
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: 'Failed to check user existence' },
      { status: 500 }
    )
  }
}