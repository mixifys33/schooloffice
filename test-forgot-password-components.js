/**
 * Test script to verify forgot password components and services
 * This tests the components without requiring a running server
 */

console.log('🧪 Testing Forgot Password Components and Services...\n');

// Test 1: Check if the main page component exists and is valid
console.log('1️⃣ Checking forgot password page component...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const pagePath = path.join(__dirname, 'src/app/(Auth)/forgot-password/page.tsx');
  if (fs.existsSync(pagePath)) {
    const content = fs.readFileSync(pagePath, 'utf8');
    
    // Check for key features
    const hasSteps = content.includes("type Step = 'identify' | 'method' | 'verify' | 'reset' | 'success'");
    const hasPasswordStrength = content.includes('passwordStrength');
    const hasTouch = content.includes('touchFriendly');
    const hasProgressBar = content.includes('getStepProgress');
    const hasSMSSupport = content.includes("'sms'");
    
    console.log('   ✅ Page component exists');
    console.log('   ✅ Multi-step flow:', hasSteps ? 'Yes' : 'No');
    console.log('   ✅ Password strength:', hasPasswordStrength ? 'Yes' : 'No');
    console.log('   ✅ Touch-friendly:', hasTouch ? 'Yes' : 'No');
    console.log('   ✅ Progress bar:', hasProgressBar ? 'Yes' : 'No');
    console.log('   ✅ SMS support:', hasSMSSupport ? 'Yes' : 'No');
  } else {
    console.log('   ❌ Page component not found');
  }
} catch (error) {
  console.log('   ❌ Error checking page component:', error.message);
}

// Test 2: Check API route
console.log('\n2️⃣ Checking API route...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const apiPath = path.join(__dirname, 'src/app/api/auth/forgot-password/send-code/route.ts');
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    const hasEmailService = content.includes('emailService');
    const hasSMSService = content.includes('smsGateway');
    const hasSMSMethod = content.includes("method === 'sms'");
    const hasDebugInfo = content.includes('debugInfo');
    const hasMasking = content.includes('maskEmail');
    
    console.log('   ✅ API route exists');
    console.log('   ✅ Email service:', hasEmailService ? 'Yes' : 'No');
    console.log('   ✅ SMS service:', hasSMSService ? 'Yes' : 'No');
    console.log('   ✅ SMS method support:', hasSMSMethod ? 'Yes' : 'No');
    console.log('   ✅ Debug info:', hasDebugInfo ? 'Yes' : 'No');
    console.log('   ✅ Contact masking:', hasMasking ? 'Yes' : 'No');
  } else {
    console.log('   ❌ API route not found');
  }
} catch (error) {
  console.log('   ❌ Error checking API route:', error.message);
}

// Test 3: Check UI components
console.log('\n3️⃣ Checking UI components...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const components = [
    'src/components/ui/form-field.tsx',
    'src/components/ui/button.tsx',
    'src/components/ui/toast.tsx',
    'src/components/ui/input.tsx',
    'src/components/ui/label.tsx'
  ];
  
  components.forEach(comp => {
    const compPath = path.join(__dirname, comp);
    if (fs.existsSync(compPath)) {
      console.log(`   ✅ ${comp.split('/').pop()} exists`);
    } else {
      console.log(`   ❌ ${comp.split('/').pop()} missing`);
    }
  });
} catch (error) {
  console.log('   ❌ Error checking UI components:', error.message);
}

// Test 4: Check services
console.log('\n4️⃣ Checking services...');
try {
  const fs = require('fs');
  const path = require('path');
  
  const services = [
    'src/services/email.service.ts',
    'src/services/sms-gateway.service.ts',
    'src/lib/password-reset-store.ts'
  ];
  
  services.forEach(service => {
    const servicePath = path.join(__dirname, service);
    if (fs.existsSync(servicePath)) {
      console.log(`   ✅ ${service.split('/').pop()} exists`);
    } else {
      console.log(`   ❌ ${service.split('/').pop()} missing`);
    }
  });
} catch (error) {
  console.log('   ❌ Error checking services:', error.message);
}

// Test 5: Check environment variables
console.log('\n5️⃣ Checking environment configuration...');
try {
  require('dotenv').config();
  
  const emailConfig = {
    'SMTP_USER': !!process.env.SMTP_USER,
    'SMTP_PASS': !!process.env.SMTP_PASS,
    'SMTP_HOST': !!process.env.SMTP_HOST,
    'EMAIL_FROM': !!process.env.EMAIL_FROM,
    'EMAIL_ACTIVE_PROVIDER': !!process.env.EMAIL_ACTIVE_PROVIDER
  };
  
  const smsConfig = {
    'AFRICASTALKING_API_KEY': !!process.env.AFRICASTALKING_API_KEY,
    'AFRICASTALKING_USERNAME': !!process.env.AFRICASTALKING_USERNAME,
    'AFRICASTALKING_ENVIRONMENT': !!process.env.AFRICASTALKING_ENVIRONMENT
  };
  
  console.log('   📧 Email Configuration:');
  Object.entries(emailConfig).forEach(([key, value]) => {
    console.log(`      ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  });
  
  console.log('   📱 SMS Configuration:');
  Object.entries(smsConfig).forEach(([key, value]) => {
    console.log(`      ${key}: ${value ? '✅ Set' : '❌ Missing'}`);
  });
} catch (error) {
  console.log('   ❌ Error checking environment:', error.message);
}

console.log('\n📋 Component Test Summary:');
console.log('   - All core components should exist');
console.log('   - API routes should be properly configured');
console.log('   - Services should be available');
console.log('   - Environment variables should be set');

console.log('\n🚀 To test the full flow:');
console.log('   1. Start the development server: npm run dev');
console.log('   2. Visit: http://localhost:3000/forgot-password');
console.log('   3. Test with school code: VALLEY');
console.log('   4. Test with identifier: admin@valley.com');
console.log('   5. Check server console for verification codes');

console.log('\n✅ Component verification complete!');