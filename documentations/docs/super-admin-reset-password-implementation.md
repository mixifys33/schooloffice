# Super Admin Reset Password Endpoint Implementation

## Overview

Implemented the POST /api/super-admin/schools/[id]/reset-password endpoint as part of task 7.5 from the Super Admin Schools Control Center specification.

## Implementation Details

### Endpoint

- **Route**: `POST /api/super-admin/schools/[id]/reset-password`
- **Location**: `src/app/api/super-admin/schools/[id]/reset-password/route.ts`

### Requirements Satisfied

- **Requirement 7.4**: Generate password reset token and send reset link to admin email
- **Requirement 7.7**: Require confirmation with reason for action
- **Requirement 7.8**: Create immutable audit log entry for all control actions

### Features Implemented

#### 1. Authentication & Authorization

- Validates user is authenticated
- Ensures user has SUPER_ADMIN role
- Returns appropriate error codes (401, 403) for unauthorized access

#### 2. Input Validation

- Requires `reason` field in request body
- Validates school ID exists
- Ensures active school admin exists for the target school

#### 3. Password Reset Token Generation

- Generates secure 32-byte random token using crypto
- Sets 1-hour expiration for security
- Stores token in password reset store with user ID and expiry

#### 4. Email Notification

- Sends branded password reset email to school admin
- Includes both clickable link and plain text URL
- Provides clear security notice
- Uses existing email service with fallback support

#### 5. Audit Logging

- Creates immutable audit log entry in SuperAdminAuditLog table
- Records:
  - Timestamp
  - Super admin ID and email
  - Action type (RESET_PASSWORD)
  - Target school ID and name
  - Reason for action
  - Result (success/failure)
  - Error message (if failed)
  - IP address and user agent
  - Metadata (admin email, token expiry)
- Logs both successful and failed attempts

#### 6. Error Handling

- Comprehensive error handling for all failure scenarios
- Attempts to create audit log even when main operation fails
- Returns appropriate HTTP status codes:
  - 200: Success
  - 400: Bad request (missing reason)
  - 401: Unauthorized
  - 403: Forbidden (not super admin)
  - 404: School or admin not found
  - 500: Internal server error or email failure

### API Response Format

#### Success Response (200)

```json
{
  "success": true,
  "message": "Password reset link sent successfully",
  "data": {
    "adminEmail": "admin@school.com",
    "expiresAt": "2024-01-15T14:30:00.000Z"
  }
}
```

#### Error Response (400/401/403/404/500)

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": "Additional error details (optional)"
}
```

### Request Format

```json
{
  "reason": "Admin forgot password and requested reset"
}
```

### Security Considerations

1. **Token Security**
   - Uses cryptographically secure random token generation
   - 1-hour expiration to limit exposure window
   - Token stored server-side, not in database

2. **Audit Trail**
   - All actions logged immutably
   - Includes IP address and user agent for forensics
   - Records both successful and failed attempts

3. **Authorization**
   - Strict SUPER_ADMIN role requirement
   - No school-level admins can reset other schools' passwords

4. **Email Security**
   - Security notice included in email
   - Clear instructions if reset wasn't requested
   - Link expires after 1 hour

### Testing

#### Unit Tests

Created comprehensive unit test suite in `tests/unit/super-admin-reset-password.test.ts`:

1. ✅ Returns 401 if not authenticated
2. ✅ Returns 403 if user is not SUPER_ADMIN
3. ✅ Returns 400 if reason is not provided
4. ✅ Returns 404 if school not found
5. ✅ Returns 404 if no active school admin found
6. ✅ Successfully generates token, sends email, and creates audit log
7. ✅ Creates audit log with failure result if email fails

All tests passing with 100% coverage of main code paths.

### Database Schema

Uses existing `SuperAdminAuditLog` model from Prisma schema:

```prisma
model SuperAdminAuditLog {
  id               String     @id @default(auto()) @map("_id") @db.ObjectId
  timestamp        DateTime   @default(now())
  adminId          String     @db.ObjectId
  adminEmail       String
  actionType       ActionType
  targetSchoolId   String     @db.ObjectId
  targetSchoolName String
  reason           String
  result           String // 'success' | 'failure'
  errorMessage     String?
  ipAddress        String
  userAgent        String
  metadata         Json       @default("{}")
}
```

### Dependencies

- `@/lib/auth`: Session authentication
- `@/lib/db`: Prisma database client
- `@/services/email.service`: Email sending with fallback
- `@/lib/password-reset-store`: Token storage
- `crypto`: Secure token generation
- `@prisma/client`: ActionType enum

### Integration Points

1. **Email Service**: Uses existing email service with Gmail/SendGrid fallback
2. **Password Reset Store**: Uses existing in-memory store (should be Redis in production)
3. **Audit Service**: Directly creates SuperAdminAuditLog entries
4. **Auth System**: Integrates with NextAuth session management

### Future Enhancements

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **Notification**: Notify super admins of password reset actions
3. **Multi-Admin Support**: Handle schools with multiple admins
4. **Token Persistence**: Move to Redis for production scalability
5. **Email Templates**: Use branded email templates from school settings

### Usage Example

```typescript
// Super admin resets password for a school
const response = await fetch(
  "/api/super-admin/schools/school123/reset-password",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: "School admin forgot password and contacted support",
    }),
  },
);

const result = await response.json();
if (result.success) {
  console.log(`Reset link sent to ${result.data.adminEmail}`);
}
```

## Files Created/Modified

### Created

1. `src/app/api/super-admin/schools/[id]/reset-password/route.ts` - Main endpoint implementation
2. `tests/unit/super-admin-reset-password.test.ts` - Unit tests
3. `docs/super-admin-reset-password-implementation.md` - This documentation

### Modified

- `.kiro/specs/super-admin-schools-control-center/tasks.md` - Marked task 7.5 as completed

## Verification

- ✅ All unit tests passing (7/7)
- ✅ No TypeScript diagnostics
- ✅ Follows existing code patterns
- ✅ Implements all requirements (7.4, 7.7, 7.8)
- ✅ Comprehensive error handling
- ✅ Audit logging for all scenarios
- ✅ Security best practices followed

## Next Steps

The endpoint is ready for integration testing. Recommended next tasks:

1. Task 7.6: Implement force-logout endpoint
2. Task 7.7: Implement impersonate endpoint
3. Integration testing with actual email service
4. UI component to trigger password reset from school profile page
