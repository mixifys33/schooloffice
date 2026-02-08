/**
 * Forgot Password - Initiate Recovery
 * Step 1: Validate school code and identifier, return available recovery methods
 * Security: Always returns success to prevent user enumeration
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { schoolCode, identifier } = await request.json()

    if (!schoolCode || !identifier) {
      return NextResponse.json(
        { error: 'School code and identifier are required' },
        { status: 400 }
      )
    }

    // Find school
    const school = await prisma.school.findUnique({
      where: { code: schoolCode.trim().toUpperCase() },
      select: { id: true }
    })

    if (!school) {
      // Return generic success to prevent enumeration
      return NextResponse.json({ 
        success: true,
        methods: ['email', 'phone', 'admin']
      })
    }

    // Find user by email, phone, or username
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: identifier.toLowerCase() }, // Remove case-insensitive mode for MongoDB
          { phone: identifier },
          { username: identifier.toLowerCase() },
        ],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
      }
    })

    if (!user) {
      // Return generic success to prevent enumeration
      return NextResponse.json({ 
        success: true,
        methods: ['email', 'phone', 'admin']
      })
    }

    // Mask email and phone for display
    const maskedEmail = user.email ? maskEmail(user.email) : null
    const maskedPhone = user.phone ? maskPhone(user.phone) : null

    return NextResponse.json({
      success: true,
      methods: ['email', 'phone', 'admin'],
      maskedEmail,
      maskedPhone,
    })
  } catch (error) {
    console.error('Forgot password initiate error:', error)
    // Return generic success even on error to prevent enumeration
    return NextResponse.json({ 
      success: true,
      methods: ['email', 'phone', 'admin']
    })
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 6) return '***'
  return `${'*'.repeat(cleaned.length - 4)}${cleaned.slice(-4)}`
}
