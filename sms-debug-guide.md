# SMS Authentication Debug Guide

## 🔍 Current Issue

**Error**: `401 Unauthorized - The supplied authentication is invalid`
**Cause**: Invalid or missing Africa's Talking API credentials

## 🔧 Required Environment Variables

Add these to your `.env` file:

```env
# Africa's Talking SMS Configuration
AFRICASTALKING_API_KEY=your_actual_api_key_here
AFRICASTALKING_USERNAME=your_username_here
AFRICASTALKING_SENDER_ID=your_sender_id_here
AFRICASTALKING_ENVIRONMENT=sandbox  # or 'production'
```

## 📋 Steps to Fix

### 1. Get Your Credentials

1. Go to [Africa's Talking Dashboard](https://account.africastalking.com/)
2. Login to your account
3. Navigate to **SMS** → **API Keys**
4. Copy your **API Key** and **Username**

### 2. Update Environment Variables

```env
# Replace with your actual credentials
AFRICASTALKING_API_KEY=atsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_SENDER_ID=YourApp  # Optional, for custom sender ID
AFRICASTALKING_ENVIRONMENT=sandbox  # Use 'production' for live
```

### 3. Restart Your Application

After updating the environment variables, restart your Next.js application:

```bash
npm run dev
# or
yarn dev
```

## 🧪 Test Your Configuration

### Check Environment Variables

Add this temporary debug code to see what's loaded:

```javascript
console.log("SMS Config Check:");
console.log("API Key exists:", !!process.env.AFRICASTALKING_API_KEY);
console.log("Username:", process.env.AFRICASTALKING_USERNAME);
console.log("Environment:", process.env.AFRICASTALKING_ENVIRONMENT);
```

### Test SMS Sending

Try registering a staff member again and check the logs for:

```
[SMS GATEWAY INIT] AFRICASTALKING_API_KEY exists: true
[SMS GATEWAY INIT] AFRICASTALKING_USERNAME: your_username
```

## 🚨 Common Issues

### 1. Missing API Key

**Error**: `AFRICASTALKING_API_KEY exists: false`
**Fix**: Add the API key to your `.env` file

### 2. Wrong Username

**Error**: `401 Unauthorized`
**Fix**: Use the exact username from your Africa's Talking dashboard

### 3. Sandbox vs Production

**Error**: API calls failing
**Fix**: Make sure `AFRICASTALKING_ENVIRONMENT` matches your account type

### 4. Invalid Phone Number

**Error**: `402 Invalid Phone Number`
**Fix**: Use proper Uganda format: `+256772123456` or `0772123456`

## ✅ Success Indicators

When working correctly, you should see:

```
📱 Sending SMS credentials to 0761019885
✅ SMS credentials sent successfully
📊 Credential sending results: SMS: ✅, Email: ✅
```

## 🔐 Security Notes

- Never commit your actual API keys to version control
- Use different API keys for development and production
- Keep your `.env` file in `.gitignore`
- Consider using environment-specific configuration files

## 📞 Support

If issues persist:

1. Check Africa's Talking account balance
2. Verify account is active and verified
3. Contact Africa's Talking support
4. Check their API documentation for updates
