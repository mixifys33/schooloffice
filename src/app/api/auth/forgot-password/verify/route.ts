/**
 * Forgot Password - Verify Code
 * Step 3: Verify the code and return a reset token
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { 
  getVerificationCode, 
  deleteVerificationCode, 
  storeResetToken 
} from '@/lib/password-reset-store'

export async function POST(request: NextRequest) {
  try {
    const { schoolCode, identifier, code } = await request.json()

    if (!schoolCode || !identifier || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const codeKey = `${schoolCode}:${identifier}`.toLowerCase()
    const storedData = getVerificationCode(codeKey)

    console.log('[Password Reset Verify] Key:', codeKey)
    console.log('[Password Reset Verify] Stored data exists:', !!storedData)
    console.log('[Password Reset Verify] Submitted code:', code)
    if (storedData) {
      console.log('[Password Reset Verify] Stored code:', storedData.code)
      console.log('[Password Reset Verify] Code match:', storedData.code === code)
    }

    // Check if code exists and is valid
    if (!storedData) {
      console.log('[Password Reset Verify] FAILED: No stored data found for key')
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    // Check if code matches
    if (storedData.code !== code) {
      console.log('[Password Reset Verify] FAILED: Code mismatch')
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      )
    }

    // Code is valid - generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store reset token
    storeResetToken(resetToken, {
      userId: storedData.userId,
      expires: tokenExpires
    })

    // Delete used verification code
    deleteVerificationCode(codeKey)

    return NextResponse.json({
      success: true,
      token: resetToken
    })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
