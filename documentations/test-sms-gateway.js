/**
 * Test SMS Gateway functionality
 */
require('dotenv').config();

async function testSMSGateway() {
  console.log('🔍 Testing SMS Gateway (Africa\'s Talking)\n');
  
  // Check environment variables
  console.log('1️⃣ Checking SMS configuration...');
  console.log('   AFRICASTALKING_API_KEY:', process.env.AFRICASTALKING_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('   AFRICASTALKING_USERNAME:', process.env.AFRICASTALKING_USERNAME);
  console.log('   AFRICASTALKING_SENDER_ID:', process.env.AFRICASTALKING_SENDER_ID || 'Not set (OK for sandbox)');
  console.log('   AFRICASTALKING_ENVIRONMENT:', process.env.AFRICASTALKING_ENVIRONMENT);
  console.log('');
  
  if (!process.env.AFRICASTALKING_API_KEY) {
    console.error('❌ AFRICASTALKING_API_KEY is not set in .env file');
    return;
  }
  
  // Test direct API call
  console.log('2️⃣ Testing direct Africa\'s Talking API...');
  
  const testPhone = '+256761819885'; // Use the phone from your logs
  const testMessage = 'Test SMS from SchoolOffice. Your verification code is: 123456';
  
  const apiUrl = process.env.AFRICASTALKING_ENVIRONMENT === 'sandbox' 
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';
    
  const requestData = {
    username: process.env.AFRICASTALKING_USERNAME,
    to: testPhone,
    message: testMessage,
    enqueue: '0' // Send immediately for testing
  };
  
  // Don't include 'from' for sandbox as it causes InvalidSenderId error
  if (process.env.AFRICASTALKING_ENVIRONMENT !== 'sandbox' && process.env.AFRICASTALKING_SENDER_ID) {
    requestData.from = process.env.AFRICASTALKING_SENDER_ID;
  }
  
  console.log('   API URL:', apiUrl);
  console.log('   Phone:', testPhone);
  console.log('   Message length:', testMessage.length);
  console.log('   Request data:', { ...requestData, message: testMessage.substring(0, 50) + '...' });
  console.log('');
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': process.env.AFRICASTALKING_API_KEY,
      },
      body: new URLSearchParams(requestData).toString(),
    });
    
    const responseText = await response.text();
    console.log('   Response status:', response.status);
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('   Response body:', responseText);
    console.log('');
    
    if (!response.ok) {
      console.error('❌ API request failed');
      console.log('💡 Common issues:');
      console.log('   - Invalid API key');
      console.log('   - Invalid phone number format');
      console.log('   - Sender ID not allowed in sandbox');
      console.log('   - Account not activated');
      return;
    }
    
    try {
      const data = JSON.parse(responseText);
      console.log('✅ API request successful');
      console.log('📱 SMS Response:', JSON.stringify(data, null, 2));
      
      if (data.SMSMessageData && data.SMSMessageData.Recipients) {
        const recipient = data.SMSMessageData.Recipients[0];
        if (recipient) {
          console.log('');
          console.log('📊 SMS Details:');
          console.log('   Status Code:', recipient.statusCode);
          console.log('   Status:', recipient.status);
          console.log('   Message ID:', recipient.messageId);
          console.log('   Cost:', recipient.cost);
          console.log('   Number:', recipient.number);
          
          if (recipient.statusCode === 101) {
            console.log('✅ SMS sent successfully!');
            console.log('📱 Check your phone for the test SMS');
          } else {
            console.log('❌ SMS failed to send');
            console.log('   Error:', recipient.status);
          }
        }
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse response JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('');
    console.log('💡 Check:');
    console.log('   - Internet connection');
    console.log('   - API endpoint URL');
    console.log('   - Firewall settings');
  }
  
  console.log('');
  console.log('📋 SMS Testing Notes:');
  console.log('   - Sandbox mode: SMS won\'t be delivered to real phones');
  console.log('   - Sandbox shows success but doesn\'t send actual SMS');
  console.log('   - For real SMS delivery, switch to production mode');
  console.log('   - Production requires account verification and credits');
}

testSMSGateway().catch(console.error);