/**
 * Forgot Password - Send Verification Code
 * Step 2: Send verification code via email or SMS
 * Security: Always returns success to prevent user enumeration
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { storeVerificationCode } from '@/lib/password-reset-store'

export async function POST(request: NextRequest) {
  try {
    const { schoolCode, identifier, method } = await request.json()

    if (!schoolCode || !identifier || !method) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        message: 'If an account exists, a verification code has been sent.'
      })
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: identifier.toLowerCase() },
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
        message: 'If an account exists, a verification code has been sent.'
      })
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store code using shared store
    const codeKey = `${schoolCode}:${identifier}`.toLowerCase()
    storeVerificationCode(codeKey, { code, expires, userId: user.id })

    let maskedContact = ''
    let sendSuccess = false

    if (method === 'email' && user.email) {
      maskedContact = maskEmail(user.email)
      
      // Send email using email service (Gmail primary, SendGrid fallback)
      try {
        const { emailService } = await import('@/services/email.service')
        
        const emailResult = await emailService.sendPasswordReset(
          user.email,
          '', // recipientName - we don't have it here
          code,
          undefined, // branding
          15 // expiryMinutes
        )
        
        if (emailResult.success) {
          console.log(`[Password Reset] Email sent to ${maskEmail(user.email)} via ${emailResult.provider}${emailResult.usedFallback ? ' (fallback)' : ''}`)
          sendSuccess = true
        } else {
          console.error('Email send failed:', emailResult.error)
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Log code to console as fallback for testing
        console.log(`[Password Reset] FALLBACK - Email code for ${user.email}: ${code}`)
      }
    } else if (method === 'phone' && user.phone) {
      maskedContact = maskPhone(user.phone)
      
      // Send SMS using Africa's Talking
      try {
        const { smsGateway } = await import('@/services/sms-gateway.service')
        
        const smsResult = await smsGateway.sendSMS({
          to: user.phone,
          message: `Your SchoolOffice password reset code is: ${code}. This code expires in 15 minutes. Do not share this code with anyone.`
        })
        
        if (smsResult.success) {
          console.log(`[Password Reset] SMS sent to ${maskPhone(user.phone)}`)
          sendSuccess = true
        } else {
          console.error('SMS send failed:', smsResult.error)
        }
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError)
      }
    }

    return NextResponse.json({
      success: true,
      maskedContact,
      sent: sendSuccess,
      message: 'Verification code sent'
    })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists, a verification code has been sent.'
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
