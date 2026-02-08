import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { storeVerificationCode } from '@/lib/password-reset-store'
import { testEmailSending } from '@/lib/test-email'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [FORGOT PASSWORD DEBUG] Debug endpoint called')
    const body = await request.json()
    console.log('🔧 [FORGOT PASSWORD DEBUG] Request body:', body)
    
    const { schoolCode, identifier } = body
    
    if (!schoolCode || !identifier) {
      return NextResponse.json(
        { error: 'School code and identifier are required' },
        { status: 400 }
      )
    }
    
    // Debug 1: Test database connection
    console.log('🔧 [FORGOT PASSWORD DEBUG] Testing database connection...')
    try {
      await prisma.$connect()
      console.log('✅ [FORGOT PASSWORD DEBUG] Database connected successfully')
    } catch (dbError) {
      console.error('❌ [FORGOT PASSWORD DEBUG] Database connection failed:', dbError)
      return NextResponse.json({
        success: false,
        step: 'database',
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      })
    }
    
    // Debug 2: Find school
    console.log('🔧 [FORGOT PASSWORD DEBUG] Finding school with code:', schoolCode)
    const school = await prisma.school.findUnique({
      where: { code: schoolCode.trim().toUpperCase() },
      select: { id: true, name: true, code: true }
    })
    
    if (!school) {
      console.log('❌ [FORGOT PASSWORD DEBUG] School not found:', schoolCode)
      return NextResponse.json({
        success: false,
        step: 'school',
        error: 'School not found',
        searchedCode: schoolCode.trim().toUpperCase()
      })
    }
    console.log('✅ [FORGOT PASSWORD DEBUG] School found:', school)
    
    // Debug 3: Find user
    console.log('🔧 [FORGOT PASSWORD DEBUG] Searching for user with identifier:', identifier)
    const user = await prisma.user.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { email: { equals: identifier.toLowerCase(), mode: 'insensitive' } },
          { phone: identifier },
          { username: { equals: identifier.toLowerCase(), mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        username: true,
        firstName: true,
        lastName: true,
      }
    })
    
    if (!user) {
      console.log('❌ [FORGOT PASSWORD DEBUG] User not found for identifier:', identifier)
      return NextResponse.json({
        success: false,
        step: 'user',
        error: 'User not found',
        school: { code: school.code, name: school.name },
        searchedIdentifier: identifier
      })
    }
    console.log('✅ [FORGOT PASSWORD DEBUG] User found:', user)
    
    // Debug 4: Generate code
    console.log('🔧 [FORGOT PASSWORD DEBUG] Generating verification code...')
    const code = crypto.randomInt(100000, 999999).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000)
    const codeKey = `${schoolCode}:${identifier}`.toLowerCase()
    
    console.log('✅ [FORGOT PASSWORD DEBUG] Code generated:', { 
      code, 
      key: codeKey, 
      expires: expires.toISOString() 
    })
    
    // Debug 5: Store code
    try {
      console.log('🔧 [FORGOT PASSWORD DEBUG] Storing verification code...')
      storeVerificationCode(codeKey, { code, expires, userId: user.id })
      console.log('✅ [FORGOT PASSWORD DEBUG] Code stored successfully')
    } catch (storeError) {
      console.error('❌ [FORGOT PASSWORD DEBUG] Code storage failed:', storeError)
      return NextResponse.json({
        success: false,
        step: 'store',
        error: 'Failed to store verification code',
        details: storeError instanceof Error ? storeError.message : 'Unknown error'
      })
    }
    
    // Debug 6: Test email sending
    console.log('🔧 [FORGOT PASSWORD DEBUG] Testing email sending...')
    const emailTestResult = await testEmailSending()
    console.log('🔧 [FORGOT PASSWORD DEBUG] Email test result:', emailTestResult)
    
    if (!emailTestResult.success) {
      console.log('❌ [FORGOT PASSWORD DEBUG] Email test failed')
      return NextResponse.json({
        success: false,
        step: 'email',
        error: 'Email service not working',
        details: emailTestResult
      })
    }
    
    console.log('✅ [FORGOT PASSWORD DEBUG] All debug steps completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Debug completed successfully',
      debugInfo: {
        school: { code: school.code, name: school.name },
        user: { 
          id: user.id,
          email: user.email,
          phone: user.phone,
          username: user.username,
          name: `${user.firstName} ${user.lastName}`
        },
        code: {
          value: code,
          key: codeKey,
          expires: expires.toISOString()
        },
        emailTest: emailTestResult
      }
    })
    
  } catch (error) {
    console.error('❌ [FORGOT PASSWORD DEBUG] API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}