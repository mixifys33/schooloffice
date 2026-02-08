import { getEmailService } from '@/services/email.service'

export async function testEmailSending() {
  console.log('🔧 [TEST] Testing email service...')
  
  try {
    const emailService = getEmailService()
    
    console.log('🔧 [TEST] Testing connection...')
    const connectionTest = await emailService.testConnection()
    console.log('🔧 [TEST] Connection test result:', connectionTest)
    
    if (!connectionTest.gmail) {
      console.log('❌ [TEST] Gmail connection failed')
      return { success: false, error: 'Gmail connection failed', details: connectionTest }
    }
    
    console.log('✅ [TEST] Gmail connection successful')
    console.log('🔧 [TEST] Attempting to send test email...')
    
    const testResult = await emailService.sendPasswordReset(
      'test@example.com',
      'Test User',
      '123456',
      undefined,
      1 // 1 minute expiry for test
    )
    
    console.log('🔧 [TEST] Email send result:', testResult)
    
    return {
      success: testResult.success,
      error: testResult.error,
      details: testResult
    }
    
  } catch (error) {
    console.error('❌ [TEST] Email test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }
  }
}