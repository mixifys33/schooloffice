/**
 * Forgot Password - Send Verification Code
 * Step 2: Send verification code via email or SMS
 * Security: Always returns success to prevent user enumeration
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { storeVerificationCode } from '@/lib/password-reset-store'
import { emailService } from '@/services/email.service' // Changed from dynamic import to static import
import { smsGateway } from '@/services/sms-gateway.service' // Add static import for SMS

export async function POST(request: NextRequest) {
  console.log('🔧 [FORGOT PASSWORD SEND CODE] Route called with method:', request.method)
  try {
    const { schoolCode, identifier, method } = await request.json()
    console.log('🔧 [FORGOT PASSWORD SEND CODE] Received data:', { schoolCode, identifier, method })

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

    // Find user - search both User table and Staff table
    let user = await prisma.user.findFirst({
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

    // If not found in User table, check Staff table and find corresponding User
    if (!user) {
      const staff = await prisma.staff.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { email: identifier.toLowerCase() },
            { phone: identifier },
          ],
          status: 'ACTIVE',
        },
        select: {
          userId: true,
          email: true,
          phone: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              isActive: true,
            }
          }
        }
      })

      if (staff && staff.user && staff.user.isActive) {
        user = {
          id: staff.user.id,
          email: staff.user.email || staff.email, // Use staff email if user email is null
          phone: staff.user.phone || staff.phone, // Use staff phone if user phone is null
        }
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Found via Staff table:`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Staff email: ${staff.email}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Staff phone: ${staff.phone}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - User email: ${staff.user.email}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - User phone: ${staff.user.phone}`)
      }
    }

    // If still not found, check Teacher table (for teachers without system access)
    if (!user) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          schoolId: school.id,
          OR: [
            { email: identifier.toLowerCase() },
            { phone: identifier },
          ],
          employmentStatus: 'ACTIVE',
        },
        select: {
          id: true,
          userId: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          hasSystemAccess: true,
        }
      })

      if (teacher) {
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Found in Teacher table:`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Teacher ID: ${teacher.id}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Teacher email: ${teacher.email}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Teacher phone: ${teacher.phone}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - Has system access: ${teacher.hasSystemAccess}`)
        console.log(`🔧 [FORGOT PASSWORD DEBUG] - User ID: ${teacher.userId || 'NULL'}`)

        if (!teacher.hasSystemAccess || !teacher.userId) {
          // Teacher exists but has no system access - return helpful error
          console.log(`🔧 [FORGOT PASSWORD DEBUG] - Teacher found but has no system access`)
          return NextResponse.json({
            success: false,
            error: 'NO_SYSTEM_ACCESS',
            message: `Your account (${teacher.firstName} ${teacher.lastName}) exists as a record-only teacher without system access. Please contact your school administrator to grant you system access before you can reset your password.`
          }, { status: 403 })
        }

        // Teacher has system access and userId, use it
        if (teacher.userId) {
          const teacherUser = await prisma.user.findUnique({
            where: { id: teacher.userId },
            select: {
              id: true,
              email: true,
              phone: true,
              isActive: true,
            }
          })

          if (teacherUser && teacherUser.isActive) {
            user = {
              id: teacherUser.id,
              email: teacherUser.email || teacher.email,
              phone: teacherUser.phone || teacher.phone,
            }
            console.log(`🔧 [FORGOT PASSWORD DEBUG] - Using Teacher's linked User account`)
          }
        }
      }
    }

    console.log(`🔧 [FORGOT PASSWORD DEBUG] User lookup result:`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] - School: ${schoolCode} (ID: ${school.id})`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] - Identifier searched: ${identifier}`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] - User found: ${!!user}`)
    if (user) {
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - User ID: ${user.id}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - User email: ${user.email || 'N/A'}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - User phone: ${user.phone || 'N/A'}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Method requested: ${method}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Can send email: ${method === 'email' && !!user.email}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Can send SMS: ${(method === 'phone' || method === 'sms') && !!user.phone}`)
    } else {
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - No user found with identifier: ${identifier}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Searched by: email, phone, username`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - School ID: ${school.id}`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Active users only: true`)
      console.log(`🔧 [FORGOT PASSWORD DEBUG] - Returning generic success for security`)
    }

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

    // ALWAYS log the code for debugging/testing purposes
    console.log(`🔧 [FORGOT PASSWORD DEBUG] Code for ${identifier} (${schoolCode}): ${code}`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] Code expires at: ${expires.toISOString()}`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] User ID: ${user.id}`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] User email: ${user.email || 'N/A'}`)
    console.log(`🔧 [FORGOT PASSWORD DEBUG] User phone: ${user.phone || 'N/A'}`)

    let maskedContact = ''
    let sendSuccess = false
    let sendError = ''

    if (method === 'email' && user.email) {
      maskedContact = maskEmail(user.email)
      
      try {
        console.log(`🔧 [Password Reset] Using statically imported email service`)
        console.log(`🔧 [Password Reset] Attempting to send email to ${user.email}`)
        console.log(`🔧 [Password Reset] Using code: ${code}`)
        console.log(`🔧 [Password Reset] Active provider: ${emailService.getActiveProvider()}`)
        
        // Test email connection first
        console.log(`🔧 [Password Reset] Testing email connection...`)
        const testResult = await emailService.testConnection()
        console.log(`🔧 [Password Reset] Connection test result:`, testResult)
        
        // Check if email service is properly configured
        if (!testResult.gmail && !testResult.sendgrid) {
          console.error('❌ [Password Reset] Email service not configured properly:', testResult.errors)
          sendError = 'Email service not configured properly: ' + testResult.errors.join(', ')
        } else {
          const emailResult = await emailService.sendPasswordReset(
            user.email,
            '', // recipientName - we don't have it here
            code,
            undefined, // branding
            15 // expiryMinutes
          )
          
          console.log(`🔧 [Password Reset] Email result:`, {
            success: emailResult.success,
            provider: emailResult.provider,
            usedFallback: emailResult.usedFallback,
            error: emailResult.error,
            messageId: emailResult.messageId
          })
          
          if (emailResult.success) {
            console.log(`✅ [Password Reset] Email sent successfully to ${maskEmail(user.email)} via ${emailResult.provider}${emailResult.usedFallback ? ' (fallback)' : ''}`)
            console.log(`✅ [Password Reset] Message ID: ${emailResult.messageId}`)
            sendSuccess = true
          } else {
            console.error('❌ [Password Reset] Email send failed:', emailResult.error)
            sendError = emailResult.error || 'Unknown email sending error'
            console.log(`🔧 [Password Reset] FALLBACK - Check console for code above`)
          }
        }
      } catch (emailError) {
        console.error('❌ [Password Reset] Failed to send email:', emailError)
        console.error('❌ [Password Reset] Error stack:', emailError instanceof Error ? emailError.stack : 'No stack trace')
        sendError = emailError instanceof Error ? emailError.message : 'Email service error'
        console.log(`🔧 [Password Reset] FALLBACK - Check console for code above`)
      }
    } else if ((method === 'phone' || method === 'sms') && user.phone) {
      maskedContact = maskPhone(user.phone)
      
      // Use statically imported SMS gateway
      try {
        console.log(`🔧 [Password Reset SMS] ==================== SMS SEND ATTEMPT ====================`)
        console.log(`🔧 [Password Reset SMS] Attempting to send SMS to ${user.phone}`)
        console.log(`🔧 [Password Reset SMS] SMS Gateway initialized:`, !!smsGateway)
        console.log(`🔧 [Password Reset SMS] SMS Gateway config check - API key present:`, !!(process.env.AFRICASTALKING_API_KEY || '').trim())
        console.log(`🔧 [Password Reset SMS] SMS Gateway config check - Username:`, process.env.AFRICASTALKING_USERNAME)
        console.log(`🔧 [Password Reset SMS] Environment:`, process.env.AFRICASTALKING_ENVIRONMENT)
        console.log(`🔧 [Password Reset SMS] User phone:`, user.phone)
        console.log(`🔧 [Password Reset SMS] Code to send:`, code)
        console.log(`🔧 [Password Reset SMS] Message length:`, `Your SchoolOffice password reset code is: ${code}. This code expires in 15 minutes. Do not share this code with anywhere.`.length)
        
        const smsMessage = `Your SchoolOffice password reset code is: ${code}. This code expires in 15 minutes. Do not share this code with anywhere.`
        
        console.log(`🔧 [Password Reset SMS] About to call smsGateway.sendSMS...`)
        const smsResult = await smsGateway.sendSMS({
          to: user.phone,
          message: smsMessage
        })
        
        console.log(`🔧 [Password Reset SMS] SMS Gateway returned result:`, JSON.stringify(smsResult, null, 2))
        console.log(`🔧 [Password Reset SMS] SMS success:`, smsResult.success)
        console.log(`🔧 [Password Reset SMS] SMS messageId:`, smsResult.messageId)
        console.log(`🔧 [Password Reset SMS] SMS error:`, smsResult.error)
        console.log(`🔧 [Password Reset SMS] SMS status:`, smsResult.status)
        console.log(`🔧 [Password Reset SMS] SMS recipient:`, smsResult.recipient)
        
        if (smsResult.success) {
          console.log(`✅ [Password Reset] SMS sent successfully to ${maskPhone(user.phone)}`)
          console.log(`✅ [Password Reset] SMS Message ID: ${smsResult.messageId}`)
          
          // Check if we're in sandbox mode
          if (process.env.AFRICASTALKING_ENVIRONMENT === 'sandbox') {
            console.log(`⚠️ [Password Reset] SMS sent in SANDBOX mode - no actual SMS delivered`)
            console.log(`🔧 [Password Reset] SANDBOX CODE for ${user.phone}: ${code}`)
            console.log(`🔧 [Password Reset] Check Africa's Talking sandbox dashboard for message`)
            sendError = 'SMS sent in sandbox mode - no actual SMS delivered. Check server logs for code.'
          }
          
          sendSuccess = true
        } else {
          console.error('❌ [Password Reset] SMS send failed:', smsResult.error)
          console.error('❌ [Password Reset] SMS status:', smsResult.status)
          sendError = smsResult.error || 'SMS sending failed'
        }
        
        console.log(`🔧 [Password Reset SMS] ==================== SMS SEND COMPLETE ====================`)
      } catch (smsError) {
        console.error('❌ [Password Reset] Failed to send SMS - Exception thrown:', smsError)
        console.error('❌ [Password Reset] SMS Error stack:', smsError instanceof Error ? smsError.stack : 'No stack trace')
        sendError = smsError instanceof Error ? smsError.message : 'SMS service error'
      }
    }

    console.log(`🔧 [FORGOT PASSWORD SEND CODE] Final result:`, { 
      success: true, 
      maskedContact, 
      sent: sendSuccess, 
      message: 'Verification code sent',
      sendError
    })
    
    // Prepare debug info for development
    const debugInfo = process.env.NODE_ENV === 'development' ? {
      email: user?.email || '',
      verificationCode: code,
      sendResult: { success: sendSuccess, error: sendError },
      error: sendError || undefined
    } : undefined
    
    return NextResponse.json({
      success: true,
      maskedContact,
      sent: sendSuccess,
      message: 'Verification code sent',
      debugInfo,
      ...(sendError && { error: sendError }) // Include error details for debugging
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
