# Communication System Errors - Quick Fix Guide

## Issue 1: Page Stuck Loading ✅ FIXED

**Problem:**
`/dashboard/sms/templates/manage` page shows "Loading SMS templates..." forever

**Root Cause:**

```typescript
const [loading, setLoading] = useState(true); // ← Never set to false!
```

**Fix Applied:**
Changed initial loading state to `false` since the page doesn't fetch data:

```typescript
const [loading, setLoading] = useState(false);
```

**File Modified:**

- `src/app/(back)/dashboard/sms/templates/manage/page.tsx` (Line 56)

---

## Issue 2: Template Not Found

**Error:**

```
[BULK DEBUG] Template not found: default-FEES_REMINDER
```

**Root Cause:**
The system is trying to use a template ID `default-FEES_REMINDER` that doesn't exist in the database.

**Temporary Solution:**
Use custom content instead of template ID when sending bulk messages.

**Proper Solution:**
Create the missing template in the database:

```sql
db.MessageTemplate.insertOne({
  _id: ObjectId(),
  schoolId: "YOUR_SCHOOL_ID",
  type: "FEES_REMINDER",
  name: "Fee Payment Reminder",
  content: "Dear {parentName}, this is a reminder that {studentName} has an outstanding fee balance of {balance}. Please make payment at your earliest convenience. Thank you.",
  category: "FEES",
  isActive: true,
  isDefault: true,
  placeholders: ["parentName", "studentName", "balance"],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Alternative Fix:**
Update the code to handle missing templates gracefully:

```typescript
if (!template) {
  // Use default content instead of failing
  templateContent =
    "Dear Parent, this is a reminder about outstanding fees. Please contact the school office.";
  console.warn(
    `Template ${params.templateId} not found, using default content`,
  );
}
```

---

## Issue 3: Send Error - "Failed to send message"

**Error:**

```
Send error: "Failed to send message"
at onSendError (src/app/(back)/dashboard/communications/page.tsx:357:45)
```

**Possible Causes:**

### A. Missing Template (Most Likely)

The bulk send is failing because template `default-FEES_REMINDER` doesn't exist.

**Fix:** Create the template or use custom content.

### B. SMS Gateway Configuration

```
[SMS GATEWAY INIT] AFRICASTALKING_SENDER_ID: undefined
```

The sender ID is not configured, which might cause sends to fail.

**Fix:** Set environment variable:

```env
AFRICASTALKING_SENDER_ID=YourSchoolName
```

### C. Invalid Recipients

Recipients might not have valid phone numbers.

**Fix:** Add validation before sending:

```typescript
const validRecipients = recipients.filter(
  (r) => r.phone && /^[0-9]{10,}$/.test(r.phone),
);
```

---

## Quick Fixes to Apply

### 1. Fix Loading State ✅ DONE

```typescript
// src/app/(back)/dashboard/sms/templates/manage/page.tsx
const [loading, setLoading] = useState(false);
```

### 2. Add Default Template Fallback

```typescript
// src/services/message-orchestrator.service.ts
if (!template) {
  console.warn(
    `[BULK DEBUG] Template not found: ${params.templateId}, using default`,
  );
  templateContent =
    params.customMessage ||
    "Dear Parent, please contact the school office for important information.";
  templateType = "GENERAL";
}
```

### 3. Add Sender ID to .env

```env
AFRICASTALKING_SENDER_ID=SchoolOffice
```

### 4. Better Error Handling

```typescript
// src/app/(back)/dashboard/communications/page.tsx
onSendError={(error) => {
  console.error('Send error:', error)
  // Show user-friendly error
  toast.error(typeof error === 'string' ? error : 'Failed to send message. Please try again.')
}}
```

---

## Testing Checklist

### Test 1: Page Loading

- [ ] Navigate to `/dashboard/sms/templates/manage`
- [ ] ✅ Page loads immediately (no infinite loading)
- [ ] ✅ Shows template management UI

### Test 2: Bulk Send with Custom Content

- [ ] Go to communications page
- [ ] Select "Fee Defaulters" target
- [ ] Use custom message (not template)
- [ ] Click send
- [ ] ✅ Messages queue successfully

### Test 3: Bulk Send with Template

- [ ] Create template in database first
- [ ] Select template from dropdown
- [ ] Click send
- [ ] ✅ Messages use template content

### Test 4: Error Handling

- [ ] Try sending without recipients
- [ ] ✅ Shows clear error message
- [ ] Try sending with invalid template
- [ ] ✅ Falls back to default or shows error

---

## Database Queries

### Check Existing Templates

```javascript
db.MessageTemplate.find({ schoolId: "YOUR_SCHOOL_ID" });
```

### Create Default Fee Reminder Template

```javascript
db.MessageTemplate.insertOne({
  schoolId: "6991bad3be51462507efc102",
  type: "FEES_REMINDER",
  name: "Fee Payment Reminder",
  content:
    "Dear {parentName}, {studentName} has an outstanding balance of {balance}. Please make payment. Thank you.",
  category: "FEES",
  isActive: true,
  isDefault: true,
  placeholders: ["parentName", "studentName", "balance"],
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### Check Message Queue

```javascript
db.Message.find({
  status: "QUEUED",
  createdAt: { $gte: new Date(Date.now() - 3600000) },
}).sort({ createdAt: -1 });
```

---

## Environment Variables Checklist

```env
# Required for SMS
AFRICASTALKING_API_KEY=your_api_key_here
AFRICASTALKING_USERNAME=sandbox  # or your username
AFRICASTALKING_SENDER_ID=SchoolOffice  # ← ADD THIS
AFRICASTALKING_ENVIRONMENT=sandbox  # or production
```

---

## Files Modified

1. ✅ `src/app/(back)/dashboard/sms/templates/manage/page.tsx` - Fixed loading state

## Files to Modify (Optional)

2. `src/services/message-orchestrator.service.ts` - Add template fallback
3. `.env` - Add AFRICASTALKING_SENDER_ID
4. `src/app/(back)/dashboard/communications/page.tsx` - Better error handling

---

**Status**: 1/3 issues fixed, 2 require configuration
**Priority**: High - Affects bulk messaging functionality
**Date**: February 2026
