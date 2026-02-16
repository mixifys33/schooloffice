# Access Control Implementation - Task 7.2

## Overview

This document describes the implementation of access control after DoS approval for the Teacher Marks Management System. The implementation ensures that approved marks are locked from teacher editing while providing DoS override capabilities with proper audit logging.

## Requirements Fulfilled

- **28.3**: Prevent teacher editing of approved marks
- **28.5**: Allow DoS override with proper logging
- **28.6**: Maintain read access for approved marks
- **28.6**: Add proper error messages for locked marks

## Implementation Components

### 1. Access Control Utilities (`src/lib/marks-access-control.ts`)

A centralized utility module that provides:

- **Permission Checking**: Functions to verify DoS override permissions and teacher permissions
- **Entry Validation**: Functions to check if marks entries are locked (approved)
- **Error Generation**: Standardized error messages for access control violations
- **Audit Metadata**: Helper functions for creating audit log entries

#### Key Functions

```typescript
// Check if user has DoS override permissions
hasDoSOverridePermission(session: UserSession): boolean

// Check if marks entry is locked (approved)
isMarksEntryLocked(status: string): boolean

// Validate marks entry access for teachers
validateMarksEntryAccess(entryStatus: string, userSession: UserSession, entryType: 'CA' | 'EXAM'): ErrorObject | null

// Generate standardized error messages
getLockedMarksErrorMessage(entryType: 'CA' | 'EXAM'): ErrorObject
```

### 2. DoS Override API (`src/app/api/dos/marks/override/route.ts`)

A new API endpoint that allows DoS users to override approved marks locks:

**Endpoint**: `POST /api/dos/marks/override`

**Features**:

- Validates DoS permissions (DOS, SCHOOL_ADMIN, DEPUTY roles)
- Reverts approved marks to DRAFT or SUBMITTED status
- Creates comprehensive audit log entries
- Supports both CA and Exam entries
- Requires detailed override reason (minimum 10 characters)

**Request Format**:

```json
{
  "entryType": "CA" | "EXAM",
  "entryIds": ["entry-id-1", "entry-id-2"],
  "reason": "Detailed reason for override",
  "newStatus": "DRAFT" | "SUBMITTED"
}
```

**Response Format**:

```json
{
  "success": true,
  "message": "Successfully overridden 2 CA entries",
  "overriddenEntries": [
    {
      "type": "CA",
      "id": "entry-id-1",
      "studentName": "John Doe",
      "previousStatus": "APPROVED"
    }
  ],
  "overriddenBy": "Jane Smith (DoS)",
  "overriddenAt": "2024-01-15T10:30:00Z",
  "reason": "Correction needed due to calculation error",
  "newStatus": "DRAFT"
}
```

### 3. Enhanced Teacher API Endpoints

Updated existing teacher marks API endpoints to use the centralized access control:

#### CA Entry Endpoints

- `PUT /api/teacher/marks/ca-entry/[id]` - Update CA entry
- `DELETE /api/teacher/marks/ca-entry/[id]` - Delete CA entry

#### Exam Entry Endpoints

- `PUT /api/teacher/marks/exam-entry/[id]` - Update exam entry
- `DELETE /api/teacher/marks/exam-entry/[id]` - Delete exam entry

#### Batch Save Endpoint

- `POST /api/teacher/marks/batch-save` - Batch save with approval checks

**Access Control Logic**:

1. Check if entry status is 'APPROVED'
2. If approved and user is regular teacher → Block with error message
3. If approved and user has DoS permissions → Allow but suggest using override endpoint
4. If not approved → Allow normal operation

### 4. Audit Logging Enhancement

Enhanced audit logging for all override operations:

**Audit Log Fields**:

- `action`: 'OVERRIDE' for DoS override operations
- `comments`: Includes override reason with "DoS Override:" prefix
- `metadata`: Comprehensive data including:
  - Previous and new status
  - Override reason
  - Overriding user information
  - Entry-specific data (scores, dates, etc.)

**Example Audit Log Entry**:

```json
{
  "entryType": "CA",
  "entryId": "ca-entry-123",
  "action": "OVERRIDE",
  "performedBy": "dos-staff-456",
  "performedAt": "2024-01-15T10:30:00Z",
  "comments": "DoS Override: Correction needed due to calculation error",
  "metadata": {
    "caEntryName": "Assignment 1 - Algebra",
    "caType": "ASSIGNMENT",
    "rawScore": 85,
    "maxScore": 100,
    "previousStatus": "APPROVED",
    "newStatus": "DRAFT",
    "overrideReason": "Correction needed due to calculation error",
    "overrideBy": "Jane Smith"
  }
}
```

## Error Messages

### Teacher Attempting to Edit Approved Marks

**CA Entry**:

```json
{
  "error": "CA entry is locked",
  "details": "Cannot edit CA entries that have been approved by DoS. Contact DoS for override if changes are needed."
}
```

**Exam Entry**:

```json
{
  "error": "Exam entry is locked",
  "details": "Cannot edit Exam entries that have been approved by DoS. Contact DoS for override if changes are needed."
}
```

### DoS User Editing Approved Marks (Suggestion)

```json
{
  "error": "CA entry is approved",
  "details": "This CA entry has been approved. Use the DoS override functionality to unlock it for editing."
}
```

### Batch Save with Approved Entries

```json
{
  "error": "Batch save failed",
  "details": "CA entry \"Assignment 1\" for student student-123: Cannot create duplicate of approved CA entry. Contact DoS for override."
}
```

## Security Considerations

### Role-Based Access Control

**DoS Override Permissions**:

- `Role.DOS` - Department of Studies
- `StaffRole.DOS` - DoS staff role
- `Role.SCHOOL_ADMIN` - School administrators
- `Role.DEPUTY` - Deputy administrators

**Teacher Permissions**:

- `Role.TEACHER` - Regular teachers
- `Role.SCHOOL_ADMIN` - School administrators (can also act as teachers)
- `Role.DEPUTY` - Deputy administrators (can also act as teachers)

### Audit Trail Requirements

All override operations must:

1. Log the complete action with timestamps
2. Include the reason for override (minimum 10 characters)
3. Record the performing user's information
4. Capture before/after state of the entry
5. Link to the specific student, subject, class, and term

### Data Integrity

- Override operations use database transactions
- Approval timestamps and approver information are cleared on override
- Entry status is properly updated to allow teacher editing
- All related audit logs maintain referential integrity

## Testing

### Test Coverage

The implementation includes comprehensive tests for:

1. **Teacher Access Control**: Verify teachers cannot edit approved marks
2. **DoS Override Functionality**: Verify DoS can override with proper logging
3. **Batch Operations**: Verify batch save respects approval status
4. **Error Messages**: Verify proper error messages are returned
5. **Audit Logging**: Verify complete audit trail is maintained

### Test Execution

Run the access control tests:

```bash
node .kiro/specs/class-teacher-marks-management-system/tests/access-control-test.js
```

## Usage Examples

### DoS Override Workflow

1. **Teacher Reports Issue**: Teacher contacts DoS about needing to modify approved marks
2. **DoS Reviews Request**: DoS evaluates the need for modification
3. **DoS Performs Override**: DoS uses override API with detailed reason
4. **Teacher Makes Changes**: Teacher can now edit the unlocked entries
5. **Resubmission**: Teacher resubmits for approval after changes

### API Usage

**Override Approved CA Entries**:

```javascript
const response = await fetch("/api/dos/marks/override", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entryType: "CA",
    entryIds: ["ca-entry-123", "ca-entry-456"],
    reason: "Student grade appeal approved - calculation error found",
    newStatus: "DRAFT",
  }),
});
```

**Override Approved Exam Entry**:

```javascript
const response = await fetch("/api/dos/marks/override", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    entryType: "EXAM",
    entryIds: ["exam-entry-789"],
    reason: "Exam paper re-evaluation completed",
    newStatus: "SUBMITTED",
  }),
});
```

## Compliance and Audit

### Regulatory Compliance

The implementation ensures:

- Complete audit trail for all mark modifications
- Clear separation of teacher and administrative permissions
- Documented reasons for all overrides
- Immutable audit log entries

### Inspection Readiness

For school inspections, the system provides:

- Full history of mark approvals and overrides
- Clear documentation of who made what changes when
- Justification for all administrative overrides
- Compliance with academic integrity requirements

## Future Enhancements

Potential future improvements:

1. **Notification System**: Notify teachers when their marks are overridden
2. **Approval Workflow**: Multi-step approval process for sensitive overrides
3. **Bulk Override**: Override multiple entries across different subjects/classes
4. **Override Templates**: Pre-defined override reasons for common scenarios
5. **Reporting Dashboard**: Visual reports of override patterns and trends

---

**Implementation Status**: ✅ Complete  
**Requirements Fulfilled**: 28.3, 28.5, 28.6  
**Last Updated**: January 2024
