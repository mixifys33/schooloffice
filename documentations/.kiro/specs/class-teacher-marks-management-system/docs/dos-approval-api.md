# DoS Approval API Documentation

## Overview

The DoS (Department of Studies) Approval API provides endpoints for approving and rejecting marks submissions in the Teacher Marks Management System. This API implements the approval workflow required by the new curriculum, ensuring proper authorization, audit logging, and marks locking mechanisms.

## Requirements Fulfilled

- **28.1**: Implement POST /api/dos/marks/approve for approving submissions
- **28.2**: Implement POST /api/dos/marks/reject for rejecting submissions
- **28.3**: Add approval workflow with proper authorization
- **28.4**: Implement marks locking after approval
- **28.5**: Add audit logging for all approval actions

## API Endpoints

### 1. Approve Marks Submissions

**Endpoint**: `POST /api/dos/marks/approve`

**Description**: Approves CA or Exam entries and locks them from further teacher editing.

**Authorization**: Requires DoS, School Admin, or Deputy role.

**Request Body**:

```typescript
{
  entryType: 'CA' | 'EXAM',           // Type of entries to approve
  entryIds: string[],                 // Array of entry IDs to approve
  classId: string,                    // Class ID for verification
  subjectId: string,                  // Subject ID for verification
  termId?: string,                    // Optional - uses current term if not provided
  comments?: string                   // Optional approval comments (max 500 chars)
}
```

**Response**:

```typescript
{
  success: true,
  message: string,                    // Success message
  approvedEntries: Array<{
    type: string,                     // 'CA' or 'EXAM'
    id: string,                       // Entry ID
    studentName: string               // Student name for reference
  }>,
  errors?: string[],                  // Any errors that occurred
  approvedBy: string,                 // Name of approver
  approvedAt: string                  // ISO timestamp
}
```

**Status Codes**:

- `200`: Success - entries approved
- `400`: Bad request - validation failed
- `401`: Unauthorized - authentication required
- `403`: Forbidden - insufficient permissions
- `404`: Not found - class/subject/entries not found
- `500`: Internal server error

### 2. Reject Marks Submissions

**Endpoint**: `POST /api/dos/marks/reject`

**Description**: Rejects CA or Exam entries and optionally returns them to draft status for teacher editing.

**Authorization**: Requires DoS, School Admin, or Deputy role.

**Request Body**:

```typescript
{
  entryType: 'CA' | 'EXAM',           // Type of entries to reject
  entryIds: string[],                 // Array of entry IDs to reject
  classId: string,                    // Class ID for verification
  subjectId: string,                  // Subject ID for verification
  termId?: string,                    // Optional - uses current term if not provided
  rejectionReason: string,            // Required rejection reason (max 500 chars)
  returnToDraft?: boolean             // Whether to return to draft status (default: true)
}
```

**Response**:

```typescript
{
  success: true,
  message: string,                    // Success message
  rejectedEntries: Array<{
    type: string,                     // 'CA' or 'EXAM'
    id: string,                       // Entry ID
    studentName: string               // Student name for reference
  }>,
  errors?: string[],                  // Any errors that occurred
  rejectedBy: string,                 // Name of rejector
  rejectedAt: string,                 // ISO timestamp
  rejectionReason: string,            // Rejection reason
  returnedToDraft: boolean            // Whether entries were returned to draft
}
```

**Status Codes**:

- `200`: Success - entries rejected
- `400`: Bad request - validation failed
- `401`: Unauthorized - authentication required
- `403`: Forbidden - insufficient permissions
- `404`: Not found - class/subject/entries not found
- `500`: Internal server error

## Authentication & Authorization

### Required Roles

- `DOS` (Department of Studies)
- `SCHOOL_ADMIN` (School Administrator)
- `DEPUTY` (Deputy Head)

### Authentication Method

- Uses NextAuth.js session-based authentication
- Requires valid session token
- Validates user role and school context

### Authorization Logic

```typescript
const hasDoSAccess =
  userRole === Role.DOS ||
  userRole === StaffRole.DOS ||
  session.user.roles.includes(Role.DOS) ||
  session.user.roles.includes(StaffRole.DOS) ||
  userRole === Role.SCHOOL_ADMIN ||
  userRole === Role.DEPUTY;
```

## Workflow States

### Marks Submission Status Flow

```
DRAFT → SUBMITTED → APPROVED/REJECTED
  ↑                      ↓
  └── (if returnToDraft) ←┘
```

**Status Transitions**:

- `DRAFT`: Teacher can edit marks
- `SUBMITTED`: Teacher cannot edit, DoS can approve/reject
- `APPROVED`: Locked from all editing, included in reports
- `REJECTED`: Can be returned to DRAFT for teacher editing

## Audit Logging

### Audit Trail Features

- Complete audit log for all approval/rejection actions
- Tracks who performed the action and when
- Stores approval/rejection reasons and comments
- Maintains metadata about the marks entries
- Links to student, subject, class, and term for full context

### Audit Log Structure

```typescript
{
  id: string,
  schoolId: string,
  entryType: 'CA' | 'EXAM',
  entryId: string,
  studentId: string,
  subjectId: string,
  classId: string,
  termId: string,
  action: 'APPROVED' | 'REJECTED',
  performedBy: string,              // Staff ID
  performedAt: Date,
  comments?: string,
  metadata: {
    // Entry-specific data (scores, names, etc.)
    approverName: string,
    previousStatus: string,
    newStatus: string,
    // ... additional context
  }
}
```

## Data Validation

### Request Validation (Zod Schemas)

**Approval Request**:

- `entryType`: Must be 'CA' or 'EXAM'
- `entryIds`: Array of non-empty strings, minimum 1 entry
- `classId`: Non-empty string
- `subjectId`: Non-empty string
- `termId`: Optional string
- `comments`: Optional string, max 500 characters

**Rejection Request**:

- Same as approval, plus:
- `rejectionReason`: Required string, max 500 characters
- `returnToDraft`: Optional boolean, defaults to true

### Business Logic Validation

- Verifies entries exist and are in correct status (SUBMITTED for approval)
- Ensures entries belong to specified class and subject
- Validates user has access to the school context
- Checks that students belong to the specified class

## Error Handling

### Error Response Format

```typescript
{
  error: string,                      // Error type
  details: string                     // Detailed error message
}
```

### Common Error Scenarios

1. **Authentication Errors**: Missing or invalid session
2. **Authorization Errors**: Insufficient role permissions
3. **Validation Errors**: Invalid request data
4. **Not Found Errors**: Missing entries, class, or subject
5. **Business Logic Errors**: Entries in wrong status, access violations
6. **Database Errors**: Transaction failures, constraint violations

## Transaction Safety

### Database Transactions

- All approval/rejection operations use Prisma transactions
- Ensures atomicity - either all entries are processed or none
- Maintains data consistency during batch operations
- Automatic rollback on any failure

### Batch Processing

- Processes multiple entries in a single transaction
- Continues processing valid entries even if some fail
- Returns both successful operations and errors
- Provides detailed feedback for each entry

## Security Features

### Input Sanitization

- All inputs validated with Zod schemas
- SQL injection prevention through Prisma ORM
- XSS prevention through proper data handling

### Access Control

- School-scoped data access (users can only access their school's data)
- Role-based authorization for DoS functions
- Entry ownership validation (entries must belong to specified class/subject)

### Audit Trail

- Complete logging of all approval actions
- Immutable audit records for compliance
- Detailed metadata for investigation and reporting

## Integration Points

### Database Models

- `CAEntry`: CA marks entries
- `ExamEntry`: Exam marks entries
- `MarksAuditLog`: Audit trail records
- `Staff`: User performing actions
- `Student`, `Class`, `Subject`, `Term`: Related entities

### Related APIs

- Teacher marks entry APIs (`/api/teacher/marks/*`)
- Marks retrieval APIs for reports
- DoS dashboard APIs for approval queues

## Usage Examples

### Approve CA Entries

```javascript
const response = await fetch("/api/dos/marks/approve", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <token>",
  },
  body: JSON.stringify({
    entryType: "CA",
    entryIds: ["ca-entry-1", "ca-entry-2"],
    classId: "class-123",
    subjectId: "subject-456",
    comments: "Approved after review",
  }),
});
```

### Reject Exam Entry

```javascript
const response = await fetch("/api/dos/marks/reject", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <token>",
  },
  body: JSON.stringify({
    entryType: "EXAM",
    entryIds: ["exam-entry-1"],
    classId: "class-123",
    subjectId: "subject-456",
    rejectionReason: "Scores appear incorrect, please review",
    returnToDraft: true,
  }),
});
```

## Testing

### Test Coverage

- Authentication and authorization validation
- Request validation with various invalid inputs
- Successful approval and rejection workflows
- Error handling for missing entries and invalid states
- Transaction rollback on failures
- Audit logging verification

### Test Files

- `tests/dos-approval-api-test.js`: API endpoint tests
- Unit tests for validation schemas
- Integration tests for database operations
- End-to-end tests for complete workflows

## Performance Considerations

### Optimization Features

- Indexed database queries for fast lookups
- Batch processing to minimize database round trips
- Efficient transaction handling
- Proper error handling to prevent resource leaks

### Scalability

- Supports batch operations for multiple entries
- Efficient querying with proper indexes
- Minimal memory footprint for large datasets
- Graceful handling of concurrent operations

## Compliance & Audit

### Curriculum Compliance

- Implements required approval workflow for new curriculum
- Maintains separation between teacher entry and DoS approval
- Provides complete audit trail for inspections
- Supports three-tier reporting system

### Data Integrity

- Ensures marks cannot be modified after approval
- Maintains referential integrity across related entities
- Provides rollback capability through rejection workflow
- Preserves historical data for compliance reporting
