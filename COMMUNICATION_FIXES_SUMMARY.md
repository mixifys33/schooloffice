# Communication System User Guide

## 📱 Overview

This guide helps you understand and use the school's communication system for sending messages to parents and guardians. The system is designed to be simple, reliable, and secure.

---

## 🎯 What You Can Do

The communication system allows authorized staff to:

- Send payment reminders to parents/guardians
- Send important notifications about students
- Track message delivery status
- View communication history
- Manage message templates

---

## 🔐 Who Can Use This System

Access is restricted based on your role:
### 2. Prisma Validation Error - Missing channel field

**Error Message:**
```
Argument `channel` is missing.
```

**Root Cause:**
The `Message` model requires these fields:
- `channel` (MessageChannel: SMS or EMAIL) - **REQUIRED**
- `studentId` (String) - **REQUIRED**
- `guardianId` (String) - **REQUIRED**
- `templateType` (String) - **REQUIRED**
- `messageType` (MessageType) - defaults to AUTOMATED
- `content` (String) - **REQUIRED**
- `status` (MessageStatus) - defaults to QUEUED

The code was using incorrect field names:
- ❌ `recipientType` → ✅ Use `studentId` and `guardianId`
- ❌ `recipientId` → ✅ Use proper relations
- ❌ `phoneNumber` → ✅ Not in schema
- ❌ `sentBy` → ✅ Not in schema
- ❌ `PENDING` → ✅ Use `QUEUED`

**Solution:**
Fixed the message.create call:

```typescript
await prisma.message.create({
  data: {
    schoolId: session.user.schoolId,
    studentId: student.id,           // ✅ Required
    guardianId: primaryGuardian.id,  // ✅ Required
    templateType: 'PAYMENT_REMINDER',
    messageType: 'AUTOMATED',
    channel: 'SMS',                   // ✅ Required - was missing!
    content: '...',
    status: 'QUEUED'                  // ✅ Changed from PENDING
  }
})
```

**Files Modified:**
- `src/app/api/bursar/send-reminders/route.ts` (Lines 147-159)

---

### 3. Removed Email Options from Communications Page

**Reason:**
- Not all parents have email addresses
- All parents have phone numbers
- SMS is more reliable

**Changes:**
- Removed "Email Only" option
- Removed "Both SMS & Email" option
- Kept only "SMS Only"
- Added helper text

**Files Modified:**
- `src/app/(back)/dashboard/bursar/communications/reminders/page.tsx`

---

## Message Model Schema Reference

```prisma
model Message {
  id           String         @id @default(auto()) @map("_id") @db.ObjectId
  schoolId     String         @db.ObjectId
  studentId    String         @db.ObjectId      // ← REQUIRED
  guardianId   String         @db.ObjectId      // ← REQUIRED
  templateType String                           // ← REQUIRED
  messageType  MessageType    @default(AUTOMATED)
  channel      MessageChannel                   // ← REQUIRED (SMS or EMAIL)
  content      String                           // ← REQUIRED
  shortUrl     String?
  status       MessageStatus  @default(QUEUED)  // ← Use QUEUED not PENDING
  cost         Float?
  sentAt       DateTime?
  deliveredAt  DateTime?
  readAt       DateTime?
  retryCount   Int            @default(0)
  errorMessage String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

enum MessageChannel {
  SMS
  EMAIL
}

enum MessageStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  READ
}

enum MessageType {
  AUTOMATED
  MANUAL
}
```

---

## Testing Checklist

### Test 1: Send Payment Reminders (Old Endpoint)
- [ ] Navigate to `/dashboard/communications`
- [ ] Select students
- [ ] Click send
- [ ] ✅ No "channel is missing" error
- [ ] ✅ Messages created with channel='SMS'
- [ ] ✅ Messages have correct studentId and guardianId

### Test 2: Send Payment Reminders (New Endpoint)
- [ ] Navigate to `/dashboard/bursar/communications/reminders`
- [ ] Select students
- [ ] Click "Send to X"
- [ ] ✅ No "senderRole" error
- [ ] ✅ No "channel" error
- [ ] ✅ Messages sent successfully

### Test 3: Verify Database
```sql
-- Check messages have required fields
db.Message.find({
  channel: { $exists: true },
  studentId: { $exists: true },
  guardianId: { $exists: true }
})

-- Check communication logs have valid roles
db.CommunicationLog.find({
  senderRole: { $in: ['ACCOUNTANT', 'TEACHER', 'SCHOOL_ADMIN'] }
})
```

---

## Summary of All Fixes

| Issue | File | Fix |
|-------|------|-----|
| Invalid senderRole | send-reminders/route.ts | Map BURSAR → ACCOUNTANT |
| Invalid senderRole | send-notifications/route.ts | Map BURSAR → ACCOUNTANT |
| Missing channel | bursar/send-reminders/route.ts | Add channel: 'SMS' |
| Wrong field names | bursar/send-reminders/route.ts | Use studentId, guardianId |
| Wrong status | bursar/send-reminders/route.ts | Use QUEUED not PENDING |
| Email options | reminders/page.tsx | Remove email options |

---

**Status**: ✅ All 3 issues fixed
**Date**: February 2026
**Version**: 2.0
