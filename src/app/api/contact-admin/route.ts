/**
 * Contact Admin API Route
 * Handles requests from users who need help accessing their accounts
 * Now stores requests in database for admin review
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Map frontend issue types to database enum
const issueTypeMap: Record<string, string> = {
  'account_access': 'ACCOUNT_ACCESS',
  'password_reset': 'PASSWORD_RESET',
  'technical': 'TECHNICAL_ISSUE',
  'billing': 'BILLING_INQUIRY',
  'general': 'GENERAL_INQUIRY',
  'other': 'OTHER',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schoolCode, name, email, phone, issue, message } = body

    // Validate required fields
    if (!schoolCode || !name || !email || !issue || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find the school by code
    const school = await prisma.school.findUnique({
      where: { code: schoolCode.trim().toUpperCase() },
      select: {
        id: true,
        name: true,
      }
    })

    if (!school) {
      // Don't reveal if school exists or not for security
      // Still return success to prevent enumeration
      return NextResponse.json({ success: true })
    }

    // Map issue type to enum value
    const issueType = issueTypeMap[issue] || 'OTHER'

    // Store the support request in database
    await prisma.supportRequest.create({
      data: {
        schoolId: school.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        issueType: issueType as any,
        message: message.trim(),
        status: 'PENDING',
        priority: issue === 'account_access' || issue === 'password_reset' ? 2 : 1,
      }
    })

    // Log for monitoring
    console.log('Support request stored:', {
      schoolId: school.id,
      schoolName: school.name,
      issueType,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact admin error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
