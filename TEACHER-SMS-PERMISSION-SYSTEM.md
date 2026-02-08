# Teacher SMS Permission System

## Overview
This system implements a permission-based approach for teachers to send SMS messages to parents, requiring administrator approval through time-limited permission codes.

## Features

### For Administrators
- **Generate Permission Codes**: Create 6-digit numeric codes that expire after a configurable time period (default: 5 hours)
- **Assign Codes**: Optionally assign codes to specific teachers or make them available to any teacher
- **Monitor Usage**: View active codes, recently generated codes, and usage history
- **Flexible Expiration**: Set custom expiration times (1-24 hours)

### For Teachers
- **Code Validation**: Enter permission codes to gain temporary SMS sending privileges
- **Time-Limited Access**: Codes expire automatically after the configured time period
- **Single-Use**: Each code can only be used once for security
- **Clear Feedback**: Immediate validation results with expiration information

## Technical Implementation

### Database Schema
```prisma
model TeacherSMSPermission {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  code            String   @unique // 6-digit numeric code
  schoolId        String   @db.ObjectId
  adminId         String   @db.ObjectId
  teacherId       String?  @db.ObjectId // Optional: assign to specific teacher
  usedByTeacherId String?  @db.ObjectId // Track who used the code
  expiresAt       DateTime // Expiration timestamp
  usedAt          DateTime? // When the code was used
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([schoolId])
  @@index([adminId])
  @@index([teacherId])
  @@index([code])
  @@index([expiresAt])
  @@index([usedAt])
}
```

### API Endpoints

#### Admin Endpoints
- `POST /api/admin/sms-permission` - Generate new permission code
- `GET /api/admin/sms-permission` - Get active and recent codes

#### Teacher Endpoints
- `POST /api/teacher/sms-permission/validate` - Validate permission code
- `POST /api/sms/send` - Send SMS (modified to require permission code for teachers)

### Components

#### Admin Components
- `AdminSMSPermissionManager` - Main admin interface for code management
- Displays active codes, generation form, and usage history

#### Teacher Components
- `PermissionCodeInput` - Input form for entering permission codes
- `SMSPermissionWrapper` - Wrapper component that manages permission state
- `TeacherSMSSendingPage` - Example implementation showing the complete flow

## Security Features

1. **Time-Based Expiration**: Codes automatically expire after configured time
2. **Single-Use**: Each code can only be validated and used once
3. **Teacher Assignment**: Optional restriction to specific teachers
4. **Audit Trail**: All code generation and usage logged in audit system
5. **Tenant Isolation**: Codes are scoped to specific schools
6. **Rate Limiting**: Built-in protection against brute force attempts

## Usage Workflow

### Admin Workflow
1. Navigate to SMS Permission Management page
2. Select teacher (optional) and expiration time
3. Generate permission code
4. Share code securely with teacher
5. Monitor code usage and expiration

### Teacher Workflow
1. Attempt to access SMS sending feature
2. Enter provided 6-digit permission code
3. System validates code and grants temporary access
4. Send SMS messages within the permission period
5. Code expires automatically after time limit

## Configuration Options

### Expiration Times
- 1 hour (for urgent communications)
- 2-4 hours (short sessions)
- 5 hours (default recommended)
- 8-24 hours (extended sessions)

### Assignment Options
- **Any Teacher**: Code available to all teachers in school
- **Specific Teacher**: Code restricted to one teacher

## Error Handling

### Common Error Scenarios
- **Invalid Code**: Code doesn't exist or format incorrect
- **Expired Code**: Code past expiration time
- **Already Used**: Code has been used previously
- **Wrong Teacher**: Code assigned to different teacher
- **Unauthorized**: User lacks required permissions

### User Feedback
Clear error messages guide users to resolve issues:
- "Invalid permission code"
- "Permission code has expired"
- "Permission code has already been used"
- "Permission code is not assigned to this teacher"

## Maintenance

### Cleanup Process
- Automatic cleanup removes codes older than 30 days
- Can be run manually via cleanup job
- Preserves audit trail while managing database size

### Monitoring
- Admin dashboard shows active code count
- Usage statistics available in audit logs
- Expiration notifications (future enhancement)

## Integration Points

### With Existing SMS System
- Modifies existing `/api/sms/send` endpoint
- Adds permission code requirement for teachers
- Maintains existing functionality for admins

### With Audit System
- Logs all code generation events
- Tracks code usage with timestamps
- Maintains user attribution for security

## Future Enhancements

1. **Email Notifications**: Notify admins when codes are about to expire
2. **Bulk Generation**: Generate multiple codes at once
3. **Usage Analytics**: Detailed reporting on code usage patterns
4. **Mobile App Integration**: Native mobile support for code entry
5. **QR Code Support**: Alternative code entry method
6. **Auto-Renewal**: Option for automatic code renewal for trusted teachers

## Testing

### Test Scenarios
1. Code generation with various expiration times
2. Code validation with valid/invalid codes
3. Teacher assignment restrictions
4. Expiration behavior testing
5. Concurrent usage prevention
6. Audit log verification

### Security Testing
1. Brute force protection
2. Code format validation
3. Tenant isolation verification
4. Permission escalation prevention