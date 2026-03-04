# SMS Reminder Button Fix - Bugfix Design

## Overview

The "Send Reminders" button in the admin dashboard's financial summary section creates Message records in the database with status='QUEUED' but never sends actual SMS notifications through Africa's Talking. The root cause is that the `/api/bursar/send-reminders` endpoint directly creates Message records using `prisma.message.create()` instead of calling the `smsSendingService.sendFeesReminders()` method that handles actual SMS transmission.

The fix involves replacing the manual Message record creation with a direct call to the SMS sending service, which will send SMS through Africa's Talking without creating database records (per user requirement to avoid database bloat and privacy concerns). The service already handles template rendering, cost calculation, and audit logging, so we simply need to invoke it correctly.

## Glossary

- **Bug_Condition (C)**: The condition where the `/api/bursar/send-reminders` endpoint is called with valid student IDs
- **Property (P)**: SMS messages should be sent through Africa's Talking gateway and delivery results returned to the user
- **Preservation**: Existing validation logic, student filtering, and the separate `/api/sms/send-fee-reminders` endpoint must remain unchanged
- **smsSendingService.sendFeesReminders()**: The service method in `src/services/sms-sending.service.ts` that handles SMS transmission through Africa's Talking, template rendering, and audit logging
- **Message Record**: Database records in the Message table that store SMS content and status - these should NOT be created for this fix

## Bug Details

### Fault Condition

The bug manifests when the "Send Reminders" button is clicked in the financial summary component. The `/api/bursar/send-reminders` endpoint receives valid student IDs, validates them, calculates balances, but then creates Message records with `prisma.message.create()` instead of calling the SMS sending service to transmit messages through Africa's Talking.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { studentIds: string[] }
  OUTPUT: boolean

  RETURN input.studentIds IS Array
         AND input.studentIds.length > 0
         AND validStudentsExist(input.studentIds)
         AND currentTermExists()
         AND endpointCalled = '/api/bursar/send-reminders'
END FUNCTION
```

### Examples

- **Example 1**: Admin clicks "Send Reminders" for 5 students with outstanding balances → System creates 5 Message records with status='QUEUED' → No SMS sent → User sees "Successfully queued 5 payment reminders" but guardians receive nothing
- **Example 2**: Admin clicks "Send Reminders" for 1 student → System creates 1 Message record → No SMS sent → Database fills with unsent messages
- **Example 3**: Admin clicks "Send Reminders" for students with no guardian phone → System correctly skips them and logs errors → But for valid students, still creates Message records without sending SMS
- **Edge Case**: Admin clicks "Send Reminders" for students already paid → System correctly skips them (balance <= 0) → This logic should be preserved

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Student validation logic (active students, valid school ID, guardian phone numbers)
- Balance calculation logic (fee structures, payments, expected fees)
- Skipping students with zero or negative balances
- Error handling for students without guardian phone numbers
- The separate `/api/sms/send-fee-reminders` endpoint must continue to work exactly as before
- Financial summary component display of unpaid students
- SMS sending service's template rendering, cost calculation, and audit logging

**Scope:**
All inputs that do NOT involve the `/api/bursar/send-reminders` endpoint should be completely unaffected by this fix. This includes:

- The `/api/sms/send-fee-reminders` endpoint (different endpoint, should continue working)
- Direct calls to `smsSendingService.sendFeesReminders()` from other parts of the codebase
- Financial summary component's display logic
- Any other SMS sending functionality in the application

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Wrong Implementation Pattern**: The endpoint was implemented to manually create Message records using `prisma.message.create()` with status='QUEUED', mimicking a queue-based architecture, but there is no background worker to process these queued messages.

2. **Missing Service Call**: The endpoint never calls `smsSendingService.sendFeesReminders()`, which is the correct method that handles SMS transmission through Africa's Talking.

3. **Copy-Paste Error**: The implementation appears to have been copied from a different pattern (possibly an older queue-based approach) rather than following the established pattern in `/api/sms/send-fee-reminders/route.ts`.

4. **Duplicate Logic**: The endpoint reimplements student fetching, balance calculation, and message content generation that already exists in the SMS sending service, leading to code duplication and the bug.

## Correctness Properties

Property 1: Fault Condition - SMS Messages Sent Through Gateway

_For any_ request to `/api/bursar/send-reminders` with valid student IDs, the fixed endpoint SHALL call `smsSendingService.sendFeesReminders()` to send actual SMS messages through Africa's Talking and return accurate delivery results (sent count, failed count, errors) to the user.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Validation and Filtering Logic

_For any_ request to `/api/bursar/send-reminders`, the fixed endpoint SHALL continue to validate student IDs, check for active students, verify guardian phone numbers, calculate balances, and skip students with zero or negative balances exactly as the original code does, preserving all existing business logic.

**Validates: Requirements 3.1, 3.2**

Property 3: Preservation - Other Endpoints Unaffected

_For any_ request to `/api/sms/send-fee-reminders` or other SMS-related endpoints, the system SHALL continue to function exactly as before, with no changes to their behavior or the SMS sending service's internal logic.

**Validates: Requirements 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `src/app/api/bursar/send-reminders/route.ts`

**Function**: `POST` handler

**Specific Changes**:

1. **Import SMS Sending Service**: Add import statement at the top of the file

   ```typescript
   import { smsSendingService } from "@/services/sms-sending.service";
   ```

2. **Remove Manual Message Creation Loop**: Delete the entire loop that creates Message records (lines ~120-175) including:
   - The `for (const student of students)` loop
   - Balance calculation inside the loop
   - `prisma.message.create()` calls
   - Manual error tracking with `errors` array

3. **Call SMS Sending Service**: Replace the removed loop with a single call to the service

   ```typescript
   const sendResult = await smsSendingService.sendFeesReminders(
     session.user.schoolId,
     session.user.id,
     session.user.role as string,
     { studentIds },
   );
   ```

4. **Return Service Results**: Update the response to use the service's return values

   ```typescript
   return NextResponse.json({
     success: sendResult.success,
     sent: sendResult.sentCount,
     failed: sendResult.failedCount,
     total: sendResult.totalRecipients,
     errors: sendResult.errors,
     message: `Successfully sent ${sendResult.sentCount} payment reminder${sendResult.sentCount !== 1 ? "s" : ""}`,
   });
   ```

5. **Remove Unnecessary Code**: Delete the following sections that are now handled by the service:
   - Academic year and term fetching (service handles this internally)
   - Fee structure fetching (service handles this internally)
   - Individual student balance calculation (service handles this internally)
   - `sentCount` and `errors` array tracking (service returns these)

**Note**: The user explicitly requested that Message records should NOT be created in the database. The `smsSendingService.sendFeesReminders()` method will send SMS directly through Africa's Talking without creating Message records, only creating audit logs for tracking purposes.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (Message records created but no SMS sent), then verify the fix works correctly (SMS sent through gateway) and preserves existing behavior (validation logic unchanged).

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the endpoint creates Message records but never sends SMS.

**Test Plan**: Write tests that call the `/api/bursar/send-reminders` endpoint with valid student IDs, then check:

1. Message records are created in the database with status='QUEUED'
2. No actual SMS is sent through Africa's Talking (mock the gateway and verify it's never called)
3. The response indicates success despite no SMS being sent

Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:

1. **Message Creation Test**: Call endpoint with 3 valid students → Verify 3 Message records created with status='QUEUED' → Verify SMS gateway never called (will pass on unfixed code, confirming the bug)
2. **No SMS Sent Test**: Call endpoint with valid students → Mock Africa's Talking gateway → Verify gateway mock never invoked (will pass on unfixed code, confirming the bug)
3. **False Success Response Test**: Call endpoint → Verify response says "Successfully queued N reminders" → Verify no actual SMS sent (will pass on unfixed code, confirming the bug)
4. **Database Bloat Test**: Call endpoint multiple times → Verify Message table grows with QUEUED records → Verify none transition to SENT status (will pass on unfixed code, confirming the bug)

**Expected Counterexamples**:

- Message records created but SMS gateway never invoked
- Response indicates success but no SMS transmission occurs
- Database fills with QUEUED messages that never get processed
- Possible causes: missing service call, wrong implementation pattern, no background worker

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (valid student IDs), the fixed function sends actual SMS through Africa's Talking.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := POST_fixed('/api/bursar/send-reminders', input)
  ASSERT smsSendingService.sendFeesReminders WAS called
  ASSERT result.sent > 0 OR result.errors.length > 0
  ASSERT NO Message records created in database
END FOR
```

**Test Cases**:

1. **SMS Gateway Invoked**: Call fixed endpoint with valid students → Verify `smsSendingService.sendFeesReminders()` is called with correct parameters
2. **Accurate Results Returned**: Call fixed endpoint → Verify response contains actual sent/failed counts from the service
3. **No Database Records**: Call fixed endpoint → Verify NO Message records are created in the database
4. **Audit Log Created**: Call fixed endpoint → Verify audit log is created by the service (not Message records)

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, or for behaviors unrelated to SMS sending, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT POST_original('/api/bursar/send-reminders', input) = POST_fixed('/api/bursar/send-reminders', input)
END FOR

FOR ALL other_endpoints DO
  ASSERT behavior_original(other_endpoints) = behavior_fixed(other_endpoints)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual tests might miss.

**Test Plan**: Observe behavior on UNFIXED code first for validation logic and error handling, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Invalid Student IDs**: Observe that unfixed code returns 404 for non-existent students → Write test to verify fixed code does the same
2. **Missing Student IDs**: Observe that unfixed code returns 400 for empty array → Write test to verify fixed code does the same
3. **Unauthorized Access**: Observe that unfixed code returns 401 for no session → Write test to verify fixed code does the same
4. **No Guardian Phone**: Observe that unfixed code skips students without guardian phones → Write test to verify fixed code does the same
5. **Zero Balance Students**: Observe that unfixed code skips students with balance <= 0 → Write test to verify fixed code does the same
6. **Other Endpoints**: Verify `/api/sms/send-fee-reminders` continues to work exactly as before
7. **Financial Summary Display**: Verify the financial summary component continues to display unpaid students correctly

### Unit Tests

- Test endpoint with valid student IDs returns success response with accurate counts
- Test endpoint with invalid student IDs returns 404 error
- Test endpoint with empty student IDs array returns 400 error
- Test endpoint without authentication returns 401 error
- Test endpoint skips students without guardian phone numbers
- Test endpoint skips students with zero or negative balances
- Test endpoint calls `smsSendingService.sendFeesReminders()` with correct parameters
- Test endpoint does NOT create Message records in database

### Property-Based Tests

- Generate random sets of student IDs and verify SMS service is called for valid ones
- Generate random student data (with/without phones, with/without balances) and verify correct filtering
- Generate random authentication states and verify authorization logic preserved
- Test that all validation errors from original code are preserved in fixed code

### Integration Tests

- Test full flow: Click "Send Reminders" button → Verify SMS sent through Africa's Talking → Verify accurate results displayed to user
- Test with mix of valid/invalid students → Verify correct students get SMS, invalid ones logged as errors
- Test with students already paid → Verify they are skipped and no SMS sent
- Test that `/api/sms/send-fee-reminders` endpoint continues to work independently
- Test that financial summary component displays correct unpaid student list after sending reminders
