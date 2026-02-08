/**
 * Debug SMS Sending Issues
 * This script will help identify why SMS messages are not being sent
 */

const testSMSConfiguration = () => {
  console.log('🔍 Debugging SMS Configuration...\n')

  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log('  AFRICASTALKING_API_KEY:', process.env.AFRICASTALKING_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('  AFRICASTALKING_USERNAME:', process.env.AFRICASTALKING_USERNAME || '❌ Missing')
  console.log('  AFRICASTALKING_ENVIRONMENT:', process.env.AFRICASTALKING_ENVIRONMENT || '❌ Missing')
  console.log('  AFRICASTALKING_SENDER_ID:', process.env.AFRICASTALKING_SENDER_ID || '(Not set - OK for sandbox)')
  console.log()

  // Check configuration values
  const config = {
    apiKey: process.env.AFRICASTALKING_API_KEY || '',
    username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    senderId: process.env.AFRICASTALKING_SENDER_ID,
    environment: process.env.AFRICASTALKING_ENVIRONMENT || 'sandbox',
  }

  console.log('⚙️ SMS Gateway Configuration:')
  console.log('  API Key Length:', config.apiKey.length, 'characters')
  console.log('  Username:', config.username)
  console.log('  Environment:', config.environment)
  console.log('  Sender ID:', config.senderId || '(Not set)')
  console.log()

  // Check API endpoint
  const baseUrl = config.environment === 'sandbox'
    ? 'https://api.sandbox.africastalking.com/version1'
    : 'https://api.africastalking.com/version1'
  
  console.log('🌐 API Configuration:')
  console.log('  Base URL:', baseUrl)
  console.log('  SMS Endpoint:', baseUrl + '/messaging')
  console.log()

  return config
}

const testPhoneNumberValidation = () => {
  console.log('📱 Testing Phone Number Validation...\n')

  const testNumbers = [
    '0772123456',
    '+256772123456',
    '256772123456',
    '772123456',
    '0701234567',
    '+256701234567',
  ]

  // Simple validation function (from the service)
  const validatePhoneNumber = (phone) => {
    let cleaned = phone.replace(/[\s-]/g, '')

    if (cleaned.startsWith('0')) {
      cleaned = '+256' + cleaned.substring(1)
    } else if (cleaned.startsWith('256')) {
      cleaned = '+' + cleaned
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+256' + cleaned
    }

    const ugandaRegex = /^\+256[37][0-9]{8}$/
    
    return {
      valid: ugandaRegex.test(cleaned),
      formatted: cleaned,
      error: ugandaRegex.test(cleaned) ? null : 'Invalid Uganda phone number format',
    }
  }

  testNumbers.forEach(number => {
    const result = validatePhoneNumber(number)
    console.log(`  ${number} → ${result.formatted} ${result.valid ? '✅' : '❌'}`)
    if (!result.valid) console.log(`    Error: ${result.error}`)
  })
  console.log()
}

const identifyPossibleIssues = () => {
  console.log('🔍 Possible Issues and Solutions:\n')

  const issues = [
    {
      issue: 'API Key Invalid or Expired',
      symptoms: ['401 Unauthorized', 'Invalid API Key'],
      solutions: [
        'Check if API key is correct in .env file',
        'Verify API key hasn\'t expired in Africa\'s Talking dashboard',
        'Ensure no extra spaces or characters in API key'
      ]
    },
    {
      issue: 'Sandbox vs Production Mismatch',
      symptoms: ['Invalid username', 'Account not found'],
      solutions: [
        'Verify AFRICASTALKING_ENVIRONMENT matches your account type',
        'For sandbox: username should be "sandbox"',
        'For production: username should be your actual AT username'
      ]
    },
    {
      issue: 'Invalid Phone Number Format',
      symptoms: ['Invalid phone number', 'Recipient rejected'],
      solutions: [
        'Ensure phone numbers are in +256XXXXXXXXX format',
        'Remove any spaces, dashes, or special characters',
        'Verify numbers start with valid Uganda prefixes (70, 71, 72, 73, 74, 75, 76, 77, 78, 79)'
      ]
    },
    {
      issue: 'Sender ID Issues',
      symptoms: ['InvalidSenderId', 'Sender ID not allowed'],
      solutions: [
        'For sandbox: Don\'t set AFRICASTALKING_SENDER_ID (leave empty)',
        'For production: Use approved sender ID only',
        'Check if sender ID is registered with Africa\'s Talking'
      ]
    },
    {
      issue: 'Network/Connectivity Issues',
      symptoms: ['Network error', 'Connection timeout', 'DNS resolution failed'],
      solutions: [
        'Check internet connection',
        'Verify firewall allows outbound HTTPS connections',
        'Test API endpoint accessibility'
      ]
    },
    {
      issue: 'Account Balance/Credits',
      symptoms: ['Insufficient balance', 'Account suspended'],
      solutions: [
        'Check account balance in Africa\'s Talking dashboard',
        'Top up account if balance is low',
        'Verify account is active and not suspended'
      ]
    }
  ]

  issues.forEach((item, index) => {
    console.log(`${index + 1}. ${item.issue}`)
    console.log(`   Symptoms: ${item.symptoms.join(', ')}`)
    console.log(`   Solutions:`)
    item.solutions.forEach(solution => {
      console.log(`     • ${solution}`)
    })
    console.log()
  })
}

const generateTestRequest = () => {
  console.log('🧪 Sample Test Request:\n')

  const config = testSMSConfiguration()
  
  const testData = {
    username: config.username,
    to: '+256772123456', // Test number
    message: 'Test message from SchoolOffice',
    enqueue: '0',
  }

  // Only add 'from' if we have a valid sender ID (not for sandbox)
  if (config.senderId && config.senderId.trim() !== '') {
    testData.from = config.senderId
  }

  console.log('📤 Request Data:')
  console.log(JSON.stringify(testData, null, 2))
  console.log()

  console.log('📤 cURL Command for Manual Testing:')
  const curlCommand = `curl -X POST \\
  https://api.sandbox.africastalking.com/version1/messaging \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "apiKey: ${config.apiKey}" \\
  -d "username=${config.username}&to=+256772123456&message=Test message from SchoolOffice&enqueue=0"`

  console.log(curlCommand)
  console.log()
}

const checkCommonErrors = () => {
  console.log('⚠️ Common Error Messages and Fixes:\n')

  const errors = [
    {
      error: 'Failed to send message',
      cause: 'Generic error from the frontend',
      fix: 'Check browser console and network tab for detailed error'
    },
    {
      error: 'API request failed: 401 Unauthorized',
      cause: 'Invalid or missing API key',
      fix: 'Verify AFRICASTALKING_API_KEY in .env file'
    },
    {
      error: 'API request failed: 400 Bad Request',
      cause: 'Invalid request parameters',
      fix: 'Check phone number format and message content'
    },
    {
      error: 'InvalidSenderId',
      cause: 'Sender ID not allowed for sandbox',
      fix: 'Remove AFRICASTALKING_SENDER_ID for sandbox environment'
    },
    {
      error: 'No recipients found',
      cause: 'Target criteria returned no recipients',
      fix: 'Check targeting settings and ensure students/guardians exist'
    },
    {
      error: 'Template not found',
      cause: 'Selected template doesn\'t exist',
      fix: 'Create SMS templates or use custom message'
    }
  ]

  errors.forEach(item => {
    console.log(`❌ "${item.error}"`)
    console.log(`   Cause: ${item.cause}`)
    console.log(`   Fix: ${item.fix}`)
    console.log()
  })
}

// Run all diagnostics
console.log('🚀 SMS Sending Diagnostic Tool\n')
console.log('=' .repeat(50))

testSMSConfiguration()
testPhoneNumberValidation()
identifyPossibleIssues()
generateTestRequest()
checkCommonErrors()

console.log('✅ Diagnostic Complete!')
console.log('\n💡 Next Steps:')
console.log('1. Check the browser console for detailed error messages')
console.log('2. Test the cURL command above manually')
console.log('3. Verify your Africa\'s Talking account status')
console.log('4. Check if recipients have valid phone numbers')
console.log('5. Ensure SMS templates exist if using template mode')