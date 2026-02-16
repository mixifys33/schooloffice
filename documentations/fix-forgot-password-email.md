# Fix for Forgot Password Email Issues

## Problem Summary

The forgot password system is not sending emails because:

1. Database connection issues preventing user lookup
2. Email service not being called due to failed user validation
3. No fallback logging for debugging

## Solutions

### 1. Fix Database Connection

Check your MongoDB connection string in `.env`:

```env
DATABASE_URL="mongodb+srv://schooloffice_acedmy:jl7doyh6aoABCK9j@schooloffice.jshbhxm.mongodb.net/schooloffice?retryWrites=true&w=majority"
```

The connection might be failing due to network issues. Test it with:

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.school.count().then(count => console.log('Schools:', count)).catch(err => console.error('DB Error:', err.message)).finally(() => prisma.$disconnect())"
```

### 2. Enhanced Email Service with Better Error Handling

The current email service needs better error handling and logging. Here's an improved version:

```typescript
// In src/app/api/auth/forgot-password/send-code/route.ts
// Add better logging and fallback behavior

if (method === "email" && user.email) {
  maskedContact = maskEmail(user.email);

  try {
    const { emailService } = await import("@/services/email.service");

    console.log(`[Password Reset] Attempting to send email to ${user.email}`);

    const emailResult = await emailService.sendPasswordReset(
      user.email,
      "", // recipientName - we don't have it here
      code,
      undefined, // branding
      15, // expiryMinutes
    );

    console.log(`[Password Reset] Email result:`, emailResult);

    if (emailResult.success) {
      console.log(
        `✅ [Password Reset] Email sent successfully to ${maskEmail(user.email)} via ${emailResult.provider}${emailResult.usedFallback ? " (fallback)" : ""}`,
      );
      sendSuccess = true;
    } else {
      console.error(
        "❌ [Password Reset] Email send failed:",
        emailResult.error,
      );
      // IMPORTANT: Log the code to console as fallback for testing
      console.log(
        `🔧 [Password Reset] FALLBACK - Email code for ${user.email}: ${code}`,
      );
    }
  } catch (emailError) {
    console.error("❌ [Password Reset] Failed to send email:", emailError);
    // IMPORTANT: Log code to console as fallback for testing
    console.log(
      `🔧 [Password Reset] FALLBACK - Email code for ${user.email}: ${code}`,
    );
  }
}
```

### 3. Create Test Data

Since there are no schools/users in the database, create test data:

```javascript
// create-test-data.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create test school
    const school = await prisma.school.upsert({
      where: { code: "TESTSCHOOL" },
      update: {},
      create: {
        name: "Test School",
        code: "TESTSCHOOL",
        isActive: true,
        licenseType: "BASIC",
      },
    });

    console.log("✅ Test school created:", school.code);

    // Create test user
    const passwordHash = await bcrypt.hash("Test@123456", 12);

    const user = await prisma.user.upsert({
      where: { email: "test@example.com" },
      update: {},
      create: {
        email: "test@example.com",
        passwordHash,
        schoolId: school.id,
        role: "TEACHER",
        roles: ["TEACHER"],
        activeRole: "TEACHER",
        isActive: true,
        status: "ACTIVE",
      },
    });

    console.log("✅ Test user created:", user.email);
    console.log("\n🧪 Test credentials:");
    console.log("School Code: TESTSCHOOL");
    console.log("Email: test@example.com");
    console.log("Password: Test@123456");
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
```

### 4. Immediate Fix - Add Console Logging

Add this to your `send-code/route.ts` to see codes in console:

```typescript
// After generating the code, always log it for testing
console.log(`🔧 [DEBUG] Password reset code for ${identifier}: ${code}`);
```

### 5. Test the Fix

1. Run the test data creation script:

   ```bash
   node create-test-data.js
   ```

2. Use the forgot password form with:
   - School Code: `TESTSCHOOL`
   - Email: `test@example.com`

3. Check the server console for the verification code

### 6. Gmail App Password Verification

Your Gmail credentials look correct, but verify:

1. 2-Step Verification is enabled on p4147176@gmail.com
2. App Password `ujep lxid ptve ivst` is still valid
3. Try generating a new App Password if needed

## Quick Test Command

Run this to test email sending directly:

```bash
node test-email.js
```

This should send a test email to verify Gmail SMTP is working.
