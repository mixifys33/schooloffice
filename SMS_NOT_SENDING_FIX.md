# SMS Not Sending - Root Cause & Fix

## 🔴 CRITICAL ISSUE FOUND

The `/api/bursar/communications/send-reminders` endpoint is **NOT actually sending SMS messages**!

### What It's Doing
✅ Creating `communicationLog` records (for audit trail)  
❌ **NOT creating `Message` records** (needed for SMS gateway)  
❌ **NOT triggering SMS gateway**

### Why SMS Aren't Being Sent

The endpoint only logs the communication but doesn't queue messages for the SMS gateway:

```typescript
// Current code - ONLY logs
await prisma.communicationLog.create({
  data: {
    // ... log data
    status: 'SENT'  // ← Misleading! Not actually sent
  }
})

// Missing - Need to create Message record
await prisma.message.create({
  data: {
    schoolId,
    studentId,
    guardianId,
    channel: 'SMS',
    content: personalizedMessage,
    status: 'QUEUED'  // ← This triggers SMS gateway
  }
})
```

---

## 🔍 Detailed Logging Added

I've added comprehensive logging to show exactly what's happening:

```
[SEND-REMINDERS] ========== Starting send reminders ==========
[SEND-REMINDERS] Session user: xxx
[SEND-REMINDERS] School ID: xxx
[SEND-REMINDERS] Request body: {...}
[SEND-REMINDERS] Processing 2 students
[SEND-REMINDERS] Message type: sms
[SEND-REMINDERS] Processing student 1/2: John Doe
[SEND-REMINDERS] Personalized message: ...
[SEND-REMINDERS] Recipient contact: 0771234567
[SEND-REMINDERS] Created communication log: xxx
[SEND-REMINDERS] ⚠️ WARNING: Message logged but NOT sent to SMS gateway
[SEND-REMINDERS] ⚠️ Need to create Message record for actual SMS sending
[SEND-REMINDERS] ========== Summary ==========
[SEND-REMINDERS] Total students: 2
[SEND-REMINDERS] Success: 2
[SEND-REMINDERS] ⚠️ IMPORTANT: Messages logged but NOT sent via SMS gateway
```

---

## ✅ THE FIX

Add Message record creation to actually send SMS:

```typescript
// After creating communication log, add this:

// Get student and guardian info
const student = await prisma.student.findUnique({
  where: { id: student.id },
  include: {
    studentGuardians: {
      where: { isPrimary: true },
      include: { guardian: true },
      take: 1
    }
  }
})

const guardian = student?.studentGuardians[0]?.guardian

if (guardian && guardian.phone) {
  // Create Message record to trigger SMS gateway
  await prisma.message.create({
    data: {
      schoolId: session.user.schoolId,
      studentId: student.id,
      guardianId: guardian.id,
      templateType: 'PAYMENT_REMINDER',
      messageType: 'AUTOMATED',
      channel: 'SMS',
      content: personalizedMessage,
      status: 'QUEUED'  // ← This triggers the SMS gateway
    }
  })
  
  console.log(`[SEND-REMINDERS] ✅ Message queued for SMS gateway`)
}
```

---

## 🔧 Complete Fixed Version

Here's the complete fixed endpoint:

```typescript
export async function POST(request: NextRequest) {
  console.log('[SEND-REMINDERS] ========== Starting send reminders ==========')
  
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { students, messageType, message } = body

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students selected' }, { status: 400 })
    }

    let successCount = 0
    const errors: string[] = []

    for (const studentData of students) {
      try {
        // Get full student with guardian info
        const student = await prisma.student.findUnique({
          where: { id: studentData.id },
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true },
              take: 1
            }
          }
        })

        if (!student) {
          errors.push(`${studentData.name}: Student not found`)
          continue
        }

        const guardian = student.studentGuardians[0]?.guardian

        if (!guardian || !guardian.phone) {
          errors.push(`${studentData.name}: No guardian phone number`)
          continue
        }

        // Personalize message
        const personalizedMessage = message
          .replace(/{parentName}/g, `${guardian.firstName} ${guardian.lastName}`)
          .replace(/{studentName}/g, `${student.firstName} ${student.lastName}`)
          .replace(/{balance}/g, new Intl.NumberFormat('en-UG', {
            style: 'currency',
            currency: 'UGX',
            minimumFractionDigits: 0,
          }).format(studentData.balance || 0))
          .replace(/{daysOverdue}/g, (studentData.daysOverdue || 0).toString())

        // 1. Create communication log (audit trail)
        await prisma.communicationLog.create({
          data: {
            schoolId: session.user.schoolId,
            messageId: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: session.user.id,
            senderRole: session.user.role === 'BURSAR' ? 'ACCOUNTANT' : (session.user.role || 'ACCOUNTANT'),
            channel: 'SMS',
            recipientId: student.id,
            recipientType: 'STUDENT',
            recipientContact: guardian.phone,
            content: personalizedMessage,
            status: 'SENT',
            metadata: {
              type: 'PAYMENT_REMINDER',
              recipientName: `${guardian.firstName} ${guardian.lastName}`,
              balance: studentData.balance,
              daysOverdue: studentData.daysOverdue
            }
          }
        })

        // 2. Create Message record (triggers SMS gateway)
        await prisma.message.create({
          data: {
            schoolId: session.user.schoolId,
            studentId: student.id,
            guardianId: guardian.id,
            templateType: 'PAYMENT_REMINDER',
            messageType: 'AUTOMATED',
            channel: 'SMS',
            content: personalizedMessage,
            status: 'QUEUED'
          }
        })

        console.log(`[SEND-REMINDERS] ✅ Message queued for ${guardian.phone}`)
        successCount++

      } catch (error) {
        console.error(`[SEND-REMINDERS] Error:`, error)
        errors.push(`${studentData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`[SEND-REMINDERS] Success: ${successCount}, Errors: ${errors.length}`)

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully queued ${successCount} SMS messages`
    })

  } catch (error) {
    console.error('[SEND-REMINDERS] FATAL ERROR:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
```

---

## 📋 Testing Steps

### 1. Check Current Logs
Run the endpoint and check your terminal. You should see:
```
[SEND-REMINDERS] ⚠️ WARNING: Message logged but NOT sent to SMS gateway
```

### 2. Apply the Fix
Replace the endpoint code with the fixed version above.

### 3. Test Again
- Select students with outstanding fees
- Click "Send Reminders"
- Check terminal for:
```
[SEND-REMINDERS] ✅ Message queued for 0771234567
```

### 4. Verify in Database
```javascript
// Check Message table
db.Message.find({ 
  status: "QUEUED",
  templateType: "PAYMENT_REMINDER"
}).sort({ createdAt: -1 }).limit(10)

// Should see new messages with status QUEUED
```

### 5. Check SMS Gateway
The SMS gateway worker should pick up QUEUED messages and send them.

---

## 🎯 Summary

**Problem:** Endpoint only logs communications, doesn't send SMS  
**Root Cause:** Missing `Message` record creation  
**Solution:** Create both `communicationLog` (audit) and `Message` (SMS queue)  
**Status:** Logging added, fix documented  

**Next Step:** Apply the complete fixed version to actually send SMS!

---

**Date:** February 2026  
**Priority:** 🔴 CRITICAL - No SMS being sent  
**Impact:** All payment reminders failing silently
