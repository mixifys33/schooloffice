/**
 * Direct Gmail SMTP test to verify email delivery
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailDirect() {
  console.log('🔍 Testing Gmail SMTP Direct Delivery\n');
  
  // Create transporter
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
    // Test connection
    console.log('1️⃣ Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified\n');
    
    // Send test email to yourself
    console.log('2️⃣ Sending test email...');
    const testEmail = {
      from: `"SchoolOffice Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'SchoolOffice Password Reset Test - ' + new Date().toLocaleTimeString(),
      html: `
        <h2>Password Reset Test</h2>
        <p>This is a test email from SchoolOffice forgot password system.</p>
        <div style="font-size: 24px; font-weight: bold; color: #1a56db; background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          Test Code: 123456
        </div>
        <p><strong>Time sent:</strong> ${new Date().toISOString()}</p>
        <p><strong>From:</strong> ${process.env.SMTP_USER}</p>
        <p><strong>To:</strong> ${process.env.SMTP_USER}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          If you received this email, Gmail SMTP is working correctly.
          Check your spam folder if you don't see forgot password emails.
        </p>
      `,
      text: `
SchoolOffice Password Reset Test

This is a test email from SchoolOffice forgot password system.
Test Code: 123456
Time sent: ${new Date().toISOString()}

If you received this email, Gmail SMTP is working correctly.
Check your spam folder if you don't see forgot password emails.
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Check your Gmail inbox for the test email');
    console.log('📧 Subject:', testEmail.subject);
    console.log('');
    console.log('💡 If you received this test email but not the forgot password emails:');
    console.log('   - The forgot password system is working correctly');
    console.log('   - Gmail might be filtering forgot password emails differently');
    console.log('   - Check spam folder for forgot password emails');
    console.log('   - Try using a different email address for testing');
    
  } catch (error) {
    console.error('❌ Gmail SMTP test failed:', error.message);
    console.log('');
    console.log('💡 Possible solutions:');
    console.log('   1. Regenerate Gmail App Password');
    console.log('   2. Check 2-Step Verification is enabled');
    console.log('   3. Verify SMTP_USER and SMTP_PASS in .env file');
  }
}

testGmailDirect().catch(console.error);