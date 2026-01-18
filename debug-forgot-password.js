/**
 * Debug script for forgot password email issue
 * This will help identify where the email sending is failing
 */
require('dotenv').config();

async function debugForgotPassword() {
  console.log('🔍 Debugging Forgot Password Email Issue\n');
  
  // Test 1: Check environment variables
  console.log('1️⃣ Checking environment variables...');
  console.log('   SMTP_USER:', process.env.SMTP_USER);
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Not set');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST);
  console.log('   SMTP_PORT:', process.env.SMTP_PORT);
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('   EMAIL_ACTIVE_PROVIDER:', process.env.EMAIL_ACTIVE_PROVIDER);
  console.log('');

  // Test 2: Test direct email sending
  console.log('2️⃣ Testing direct email sending with nodemailer...');
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('   ✅ SMTP connection verified\n');
  } catch (error) {
    console.log('   ❌ SMTP connection failed:', error.message);
    return;
  }

  // Test 3: Send actual test email
  console.log('3️⃣ Sending test password reset email...');
  try {
    const testCode = '123456';
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER,
      subject: 'Password Reset Test',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your password reset code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a56db; background-color: #f3f4f6; padding: 15px 25px; border-radius: 8px; display: inline-block; margin: 20px 0;">
          ${testCode}
        </div>
        <p>This is a test email from the debug script.</p>
      `,
      text: `Your password reset code is: ${testCode}`
    });
    
    console.log('   ✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to send test email:', error.message);
    return;
  }

  // Test 4: Check if server is running
  console.log('4️⃣ Checking if Next.js server is running...');
  try {
    const response = await fetch('http://localhost:3000/api/auth/forgot-password/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolCode: 'TEST', identifier: 'test@test.com' })
    });
    console.log('   ✅ Server is running');
    console.log('   Response status:', response.status);
    console.log('');
  } catch (error) {
    console.log('   ❌ Server is not running or not accessible');
    console.log('   Please start the server with: npm run dev');
    return;
  }

  console.log('✅ All basic checks passed!');
  console.log('');
  console.log('📋 Next steps to test the actual forgot password flow:');
  console.log('1. Make sure you have a valid user in the database');
  console.log('2. Use the forgot password form in the UI');
  console.log('3. Check the server console logs for email sending details');
  console.log('4. Check your email inbox (including spam folder)');
}

debugForgotPassword().catch(console.error);