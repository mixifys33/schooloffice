/**
 * Test script to verify Gmail SMTP configuration
 */
const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config();

async function testGmailConnection() {
  console.log('Testing Gmail SMTP configuration...');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS configured:', !!process.env.SMTP_PASS);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_SERVICE:', process.env.SMTP_SERVICE);

  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ Gmail SMTP connection successful!');
    
    // Test sending an email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'SchoolOffice'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'Test Email - Password Reset System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify the Gmail SMTP configuration for the password reset system.</p>
        <p>If you receive this email, the configuration is working correctly.</p>
        <p>Test code: <strong>123456</strong></p>
      `,
      text: 'This is a test email to verify the Gmail SMTP configuration. Test code: 123456'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Gmail SMTP test failed:');
    console.error(error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication failed. Please check:');
      console.log('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.log('2. Enable 2-Step Verification on your Google account');
      console.log('3. Generate an App Password at: https://myaccount.google.com/apppasswords');
      console.log('4. Use the App Password in SMTP_PASS environment variable');
    }
  }
}

testGmailConnection();