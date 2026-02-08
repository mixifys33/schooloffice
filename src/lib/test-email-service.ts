import { getEmailService } from '@/services/email.service'

async function testEmailService() {
  try {
    console.log('🔧 Testing email service...')
    
    const emailService = getEmailService()
    
    console.log('🔧 Email service config:')
    console.log('   Active provider:', emailService.getActiveProvider())
    console.log('   From email:', emailService.config.fromEmail)
    console.log('   From name:', emailService.config.fromName)
    console.log('   Gmail user:', emailService.config.gmail.user)
    console.log('   Gmail pass configured:', !!emailService.config.gmail.pass)
    
    // Test connection
    console.log('🔧 Testing connection...')
    const connectionTest = await emailService.testConnection()
    console.log('🔧 Connection test result:', connectionTest)
    
    if (!connectionTest.gmail) {
      console.log('❌ Gmail connection failed')
      return
    }
    
    console.log('✅ Gmail connection successful')
    
    // Test sending email
    console.log('🔧 Testing email sending...')
    const result = await emailService.sendPasswordReset(
      'test@example.com',
      'Test User',
      '123456',
      undefined,
      1
    )
    
    console.log('🔧 Email send result:', result)
    
    if (result.success) {
      console.log('✅ Email sent successfully!')
      console.log('   Message ID:', result.messageId)
      console.log('   Provider:', result.provider)
    } else {
      console.log('❌ Email sending failed:', result.error)
    }
    
  } catch (error) {
    console.error('❌ Email service test failed:', error)
  }
}

testEmailService()