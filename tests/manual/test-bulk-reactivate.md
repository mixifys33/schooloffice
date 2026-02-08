# Manual Test: Bulk Reactivate Endpoint

## Endpoint

`POST /api/super-admin/schools/bulk-reactivate`

## Requirements Validated

- 3.2: Process multiple schools with reactivate action
- 3.3: Return individual results for each school
- 3.4: Create individual audit log entries
- 3.6: Log each action individually in the audit trail

## Test Scenarios

### 1. Successful Bulk Reactivation

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "schoolIds": ["school1", "school2", "school3"],
  "reason": "Reactivating schools after payment received"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Bulk reactivate completed: 3 succeeded, 0 failed",
  "data": {
    "total": 3,
    "succeeded": 3,
    "failed": 0,
    "results": [
      {
        "schoolId": "school1",
        "schoolName": "Test School 1",
        "success": true
      },
      {
        "schoolId": "school2",
        "schoolName": "Test School 2",
        "success": true
      },
      {
        "schoolId": "school3",
        "schoolName": "Test School 3",
        "success": true
      }
    ]
  }
}
```

**Verification:**

- Each school's `isActive` field should be set to `true`
- Three individual audit log entries should be created with:
  - `actionType`: "BULK_REACTIVATE"
  - `result`: "success"
  - `reason`: "Reactivating schools after payment received"
  - `metadata.previousStatus`: "suspended"

### 2. Mixed Results (Some Success, Some Failure)

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "schoolIds": ["suspended-school", "active-school", "nonexistent-school"],
  "reason": "Testing mixed results"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Bulk reactivate completed: 1 succeeded, 2 failed",
  "data": {
    "total": 3,
    "succeeded": 1,
    "failed": 2,
    "results": [
      {
        "schoolId": "suspended-school",
        "schoolName": "Suspended School",
        "success": true
      },
      {
        "schoolId": "active-school",
        "schoolName": "Active School",
        "success": false,
        "error": "School is already active"
      },
      {
        "schoolId": "nonexistent-school",
        "schoolName": "Unknown",
        "success": false,
        "error": "School not found"
      }
    ]
  }
}
```

**Verification:**

- Only the suspended school should be reactivated
- Three audit log entries should be created:
  - One with `result`: "success"
  - Two with `result`: "failure" and appropriate error messages

### 3. Authentication Failure

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Content-Type: application/json

{
  "schoolIds": ["school1"],
  "reason": "Testing without auth"
}
```

**Expected Response:**

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**Status Code:** 401

### 4. Authorization Failure (Non-Super Admin)

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <school-admin-token>
Content-Type: application/json

{
  "schoolIds": ["school1"],
  "reason": "Testing with wrong role"
}
```

**Expected Response:**

```json
{
  "error": "Forbidden",
  "message": "Super Admin access required"
}
```

**Status Code:** 403

### 5. Validation Errors

#### Missing schoolIds

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "reason": "Testing without schoolIds"
}
```

**Expected Response:**

```json
{
  "error": "Bad Request",
  "message": "schoolIds array is required and must not be empty"
}
```

**Status Code:** 400

#### Empty schoolIds Array

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "schoolIds": [],
  "reason": "Testing with empty array"
}
```

**Expected Response:**

```json
{
  "error": "Bad Request",
  "message": "schoolIds array is required and must not be empty"
}
```

**Status Code:** 400

#### Missing Reason

**Request:**

```json
POST /api/super-admin/schools/bulk-reactivate
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "schoolIds": ["school1"]
}
```

**Expected Response:**

```json
{
  "error": "Bad Request",
  "message": "Reason is required for this action"
}
```

**Status Code:** 400

## Database Verification Queries

### Check School Status

```javascript
// After successful reactivation
const school = await prisma.school.findUnique({
  where: { id: "school1" },
  select: { id: true, name: true, isActive: true },
});
// Expected: isActive = true
```

### Check Audit Logs

```javascript
// Verify individual audit logs were created
const auditLogs = await prisma.superAdminAuditLog.findMany({
  where: {
    actionType: "BULK_REACTIVATE",
    targetSchoolId: { in: ["school1", "school2", "school3"] },
  },
  orderBy: { timestamp: "desc" },
});
// Expected: 3 audit log entries (one per school)
```

### Verify Audit Log Contents

```javascript
const auditLog = await prisma.superAdminAuditLog.findFirst({
  where: {
    actionType: "BULK_REACTIVATE",
    targetSchoolId: "school1",
  },
});

// Expected fields:
// - timestamp: Date
// - adminId: string
// - adminEmail: string
// - actionType: 'BULK_REACTIVATE'
// - targetSchoolId: 'school1'
// - targetSchoolName: 'Test School 1'
// - reason: 'Reactivating schools after payment received'
// - result: 'success'
// - errorMessage: null
// - ipAddress: string
// - userAgent: string
// - metadata: { previousStatus: 'suspended', timestamp: string }
```

## Performance Considerations

- The endpoint processes schools sequentially (not in parallel)
- Each school operation includes:
  1. Database lookup (findUnique)
  2. Status validation
  3. Database update (if valid)
  4. Audit log creation
- For large batches (100+ schools), consider implementing batch processing or pagination
- Current implementation is suitable for typical use cases (5-20 schools per request)

## Error Handling

The endpoint implements robust error handling:

- Individual school failures don't stop processing of other schools
- Each failure is logged with specific error message
- Audit logs are created even for failures
- If audit log creation fails, error is logged but doesn't affect response
- Database errors are caught and returned with appropriate error messages

## Security Features

1. **Authentication**: Requires valid session
2. **Authorization**: Requires SUPER_ADMIN role
3. **Audit Trail**: All actions logged with:
   - Admin ID and email
   - IP address
   - User agent
   - Timestamp
   - Reason for action
4. **Input Validation**: Validates all required fields
5. **Error Messages**: Provides clear feedback without exposing sensitive data
