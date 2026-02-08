import { NextRequest, NextResponse } from 'next/server'
import { testEmailSending } from '@/lib/test-email'

export async function GET() {
  try {
    console.log('🔧 [EMAIL TEST] Starting email test...')
    const result = await testEmailSending()
    
    console.log('🔧 [EMAIL TEST] Test completed:', result)
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Email test successful' : 'Email test failed',
      error: result.error,
      details: result.details
    })
  } catch (error) {
    console.error('❌ [EMAIL TEST] API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}