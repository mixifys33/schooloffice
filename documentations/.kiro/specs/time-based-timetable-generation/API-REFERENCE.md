# API Reference: Time-Based Timetable System

**Version**: 1.0  
**Date**: 2026-02-13  
**Base URL**: `/api/dos/timetable`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Configuration Endpoints](#configuration-endpoints)
3. [Timetable Endpoints](#timetable-endpoints)
4. [Entry Endpoints](#entry-endpoints)
5. [Teacher Code Endpoints](#teacher-code-endpoints)
6. [Helper Endpoints](#helper-endpoints)
7. [Archive Endpoints](#archive-endpoints)
8. [Error Codes](#error-codes)
9. [Data Models](#data-models)

---

## Authentication

All endpoints require authentication via NextAuth session.

**Required Roles**:

- `SCHOOL_ADMIN`
- `DEPUTY`
- Staff with `DOS` (Director of Studies) role

**Headers**:

```http
Cookie: next-auth.session-token=<session-token>
```

**Unauthorized Response** (401):

```json
{
  "error": "Unauthorized"
}
```

**Forbidden Response** (403):

```json
{
  "error": "Director of Studies access required"
}
```

---

## Configuration Endpoints

### GET /api/dos/timetable/config

Fetch the school's timetable configuration.

**Request**:

```http
GET /api/dos/timetable/config HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "id": "675d70b9fd1c15f57d0ad1f2",
  "schoolId": "675d70b9fd1c15f57d0ad1f1",
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": [
    {
      "name": "Break",
      "startTime": "10:30",
      "endTime": "10:45",
      "daysOfWeek": [1, 2, 3, 4, 5]
    },
    {
      "name": "Lunch",
      "startTime": "13:00",
      "endTime": "14:00",
      "daysOfWeek": [1, 2, 3, 4, 5]
    }
  ],
  "createdAt": "2026-02-13T10:00:00.000Z",
  "updatedAt": "2026-02-13T10:00:00.000Z"
}
```

**Response** (404 - No Configuration):

```json
{
  "error": "Configuration not found"
}
```

---

### POST /api/dos/timetable/config

Create or update the school's timetable configuration.

**Request**:

```http
POST /api/dos/timetable/config HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": [
    {
      "name": "Break",
      "startTime": "10:30",
      "endTime": "10:45",
      "daysOfWeek": [1, 2, 3, 4, 5]
    }
  ]
}
```

**Request Body Schema**:

```typescript
{
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string; // Format: "HH:MM" (24-hour)
  periodDurationMinutes: number; // Min: 15, Max: 120
  specialPeriods: Array<{
    name: string; // e.g., "Break", "Lunch", "Assembly"
    startTime: string; // Format: "HH:MM"
    endTime: string; // Format: "HH:MM"
    daysOfWeek: number[]; // 1=Mon, 2=Tue, ..., 7=Sun
  }>;
}
```

**Validation Rules**:

- `startTime` must be before `endTime`
- `periodDurationMinutes` must be >= 15
- Special period times must be within school hours
- Special periods must not overlap
- All times must be in "HH:MM" format

**Response** (200):

```json
{
  "message": "Configuration saved successfully",
  "config": {
    "id": "...",
    "schoolId": "...",
    "startTime": "08:00",
    "endTime": "16:00",
    "periodDurationMinutes": 40,
    "specialPeriods": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response** (400 - Validation Error):

```json
{
  "error": "Validation failed",
  "details": "Start time must be before end time"
}
```

**Possible Validation Errors**:

- "Start time must be before end time"
- "Period duration must be at least 15 minutes"
- "Special period times must be within school hours (08:00 to 16:00)"
- "Special periods cannot overlap with each other"
- "Invalid time format. Use HH:MM"

---

### POST /api/dos/timetable/config/generate-slots

Generate a preview of time slots based on configuration (without saving).

**Request**:

```http
POST /api/dos/timetable/config/generate-slots HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": []
}
```

**Response** (200):

```json
{
  "slots": [
    {
      "startTime": "08:00",
      "endTime": "08:40",
      "isSpecialPeriod": false,
      "period": 1
    },
    {
      "startTime": "08:40",
      "endTime": "09:20",
      "isSpecialPeriod": false,
      "period": 2
    },
    {
      "startTime": "10:30",
      "endTime": "10:45",
      "isSpecialPeriod": true,
      "specialPeriodName": "Break"
    }
  ],
  "totalSlots": 13,
  "teachingSlots": 12,
  "specialPeriodSlots": 1,
  "totalMinutes": 480,
  "availableMinutes": 465,
  "specialPeriodMinutes": 15
}
```

---

## Timetable Endpoints

### GET /api/dos/timetable

List all timetables for the school with optional filtering.

**Request**:

```http
GET /api/dos/timetable?termId=abc123&classId=def456&status=DRAFT&includeArchived=false HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Query Parameters**:

- `termId` (optional): Filter by term ID
- `classId` (optional): Filter by class ID
- `status` (optional): Filter by status (DRAFT, APPROVED, PUBLISHED)
- `includeArchived` (optional): Include archived timetables (default: false)

**Response** (200):

```json
{
  "timetables": [
    {
      "id": "tt123",
      "timetableName": "P.7 Science - Term 1 2026",
      "classId": "class123",
      "className": "P.7 Science",
      "termId": "term123",
      "termName": "Term 1 2026",
      "status": "DRAFT",
      "dosApproved": false,
      "isLocked": false,
      "isTimeBased": true,
      "isArchived": false,
      "entryCount": 35,
      "createdAt": "2026-02-13T10:00:00.000Z",
      "updatedAt": "2026-02-13T10:00:00.000Z"
    }
  ],
  "oldTimetablesCount": 5
}
```

---

### POST /api/dos/timetable

Create a new timetable.

**Request**:

```http
POST /api/dos/timetable HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "classId": "class123",
  "termId": "term123"
}
```

**Request Body Schema**:

```typescript
{
  classId: string; // Required
  termId: string; // Required
}
```

**Validation Rules**:

- Class must exist and belong to school
- Term must exist and belong to school
- Only one timetable per class per term (unique constraint)

**Response** (200):

```json
{
  "message": "Timetable created successfully",
  "timetable": {
    "id": "tt123",
    "timetableName": "P.7 Science - Term 1 2026",
    "classId": "class123",
    "termId": "term123",
    "status": "DRAFT",
    "isTimeBased": true,
    "isArchived": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response** (400 - Duplicate):

```json
{
  "error": "A timetable already exists for this class and term"
}
```

---

### GET /api/dos/timetable/[id]

Fetch a specific timetable with all entries.

**Request**:

```http
GET /api/dos/timetable/tt123 HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "id": "tt123",
  "timetableName": "P.7 Science - Term 1 2026",
  "classId": "class123",
  "className": "P.7 Science",
  "termId": "term123",
  "termName": "Term 1 2026",
  "status": "DRAFT",
  "dosApproved": false,
  "isLocked": false,
  "isTimeBased": true,
  "isArchived": false,
  "entries": [
    {
      "id": "entry123",
      "dayOfWeek": 1,
      "period": 1,
      "startTime": "08:00",
      "endTime": "08:40",
      "subjectId": "subj123",
      "subjectName": "Mathematics",
      "subjectCode": "MATH",
      "teacherId": "teacher123",
      "teacherName": "John Doe",
      "teacherCode": "JD001",
      "room": "Room 101",
      "isDoubleLesson": false,
      "isSpecialPeriod": false,
      "notes": null
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Response** (404):

```json
{
  "error": "Timetable not found"
}
```

---

### DELETE /api/dos/timetable/[id]

Delete a timetable.

**Request**:

```http
DELETE /api/dos/timetable/tt123 HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Validation Rules**:

- Cannot delete locked timetables
- Cannot delete approved timetables (must unapprove first)

**Response** (200):

```json
{
  "message": "Timetable deleted successfully",
  "timetableId": "tt123"
}
```

**Response** (400 - Locked):

```json
{
  "error": "Cannot delete locked timetable"
}
```

---

### PATCH /api/dos/timetable/[id]

Update timetable metadata (name, lock status).

**Request**:

```http
PATCH /api/dos/timetable/tt123 HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "timetableName": "P.7 Science - Term 1 2026 (Updated)",
  "isLocked": true
}
```

**Request Body Schema**:

```typescript
{
  timetableName?: string;  // Optional
  isLocked?: boolean;      // Optional
}
```

**Response** (200):

```json
{
  "message": "Timetable updated successfully",
  "timetable": {
    "id": "tt123",
    "timetableName": "P.7 Science - Term 1 2026 (Updated)",
    "isLocked": true,
    "updatedAt": "..."
  }
}
```

---

## Entry Endpoints

### POST /api/dos/timetable/[id]/entries

Add a new entry to the timetable.

**Request**:

```http
POST /api/dos/timetable/tt123/entries HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "curriculumSubjectId": "currsub123",
  "teacherId": "teacher123",
  "dayOfWeek": 1,
  "period": 1,
  "startTime": "08:00",
  "endTime": "08:40",
  "room": "Room 101",
  "isDoubleLesson": false,
  "notes": "Optional notes"
}
```

**Request Body Schema**:

```typescript
{
  curriculumSubjectId: string;  // Required - DoSCurriculumSubject ID
  teacherId: string;            // Required - Staff ID
  dayOfWeek: number;            // Required - 1=Mon, 2=Tue, ..., 7=Sun
  period: number;               // Required - Period number (legacy)
  startTime: string;            // Required - Format: "HH:MM"
  endTime: string;              // Required - Format: "HH:MM"
  room?: string;                // Optional
  isDoubleLesson?: boolean;     // Optional - Default: false
  notes?: string;               // Optional
}
```

**Validation Rules**:

- Timetable must not be locked
- dayOfWeek must be 1-7
- Subject must be assigned to class (via DoSCurriculumSubject)
- Teacher must exist and be active
- All required fields must be provided

**Conflict Detection** (4 dimensions):

1. Slot occupancy - slot not already occupied in same timetable
2. Teacher double-booking - teacher not teaching another class at same time
3. Room double-booking - room not occupied by another class at same time
4. Subject period limit - subject not exceeded periodsPerWeek limit

**Response** (200 - Success):

```json
{
  "message": "Entry added successfully",
  "entry": {
    "id": "entry123",
    "dayOfWeek": 1,
    "period": 1,
    "startTime": "08:00",
    "endTime": "08:40",
    "subjectName": "Mathematics",
    "teacherName": "John Doe",
    "room": "Room 101",
    "createdAt": "..."
  }
}
```

**Response** (409 - Conflicts):

```json
{
  "error": "Conflicts detected",
  "conflicts": [
    "Slot already occupied by Mathematics (John Doe)",
    "Teacher is already teaching Science in P.6 at this time",
    "Room Lab-1 is already occupied by Chemistry (P.7) at this time",
    "English already has 5 periods (max: 5 per week)"
  ]
}
```

**Response** (400 - Validation Error):

```json
{
  "error": "Validation failed",
  "details": "Invalid dayOfWeek: 8. Must be 1-7"
}
```

---

### DELETE /api/dos/timetable/[id]/entries/[entryId]

Delete an entry from the timetable.

**Request**:

```http
DELETE /api/dos/timetable/tt123/entries/entry123 HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Validation Rules**:

- Timetable must not be locked
- Entry must belong to the specified timetable

**Response** (200):

```json
{
  "message": "Entry deleted successfully",
  "entryId": "entry123"
}
```

**Response** (400 - Locked):

```json
{
  "error": "Cannot delete entry from locked timetable"
}
```

---

### PATCH /api/dos/timetable/[id]/entries/[entryId]

Update an existing entry.

**Request**:

```http
PATCH /api/dos/timetable/tt123/entries/entry123 HTTP/1.1
Host: example.com
Content-Type: application/json
Cookie: next-auth.session-token=<token>

{
  "teacherId": "teacher456",
  "room": "Room 202",
  "notes": "Updated notes"
}
```

**Request Body Schema**:

```typescript
{
  teacherId?: string;       // Optional
  room?: string;            // Optional
  notes?: string;           // Optional
  isDoubleLesson?: boolean; // Optional
}
```

**Note**: Cannot change subject, day, or time. Delete and recreate entry instead.

**Conflict Detection**:

- Teacher double-booking check (if teacherId changed)
- Room double-booking check (if room changed)

**Response** (200):

```json
{
  "message": "Entry updated successfully",
  "entry": {
    "id": "entry123",
    "teacherId": "teacher456",
    "room": "Room 202",
    "notes": "Updated notes",
    "updatedAt": "..."
  }
}
```

**Response** (409 - Conflicts):

```json
{
  "error": "Conflicts detected",
  "conflicts": ["Teacher is already teaching Science in P.6 at this time"]
}
```

---

## Teacher Code Endpoints

### POST /api/dos/teachers/generate-codes

Generate teacher codes for all teachers without codes (bulk operation).

**Request**:

```http
POST /api/dos/teachers/generate-codes HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "message": "Teacher codes generated successfully",
  "generated": 45,
  "skipped": 5,
  "failed": 0,
  "details": {
    "totalTeachers": 50,
    "withCodes": 5,
    "withoutCodes": 45,
    "generatedCodes": [
      { "teacherId": "t1", "teacherCode": "JD001", "teacherName": "John Doe" },
      { "teacherId": "t2", "teacherCode": "JS002", "teacherName": "Jane Smith" }
    ]
  }
}
```

**Response** (400 - No Teachers):

```json
{
  "error": "No teachers found without codes"
}
```

---

### POST /api/dos/teachers/[id]/generate-code

Generate a teacher code for a specific teacher.

**Request**:

```http
POST /api/dos/teachers/teacher123/generate-code HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "message": "Teacher code generated successfully",
  "teacherId": "teacher123",
  "teacherCode": "JD001",
  "teacherName": "John Doe"
}
```

**Response** (400 - Already Has Code):

```json
{
  "error": "Teacher already has a code: JD001"
}
```

**Response** (404):

```json
{
  "error": "Teacher not found"
}
```

---

## Helper Endpoints

### GET /api/dos/timetable/helpers

Fetch helper data for timetable creation (classes, terms, subjects, teachers).

**Request**:

```http
GET /api/dos/timetable/helpers?type=teachers&page=1&limit=50&search=john HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Query Parameters**:

- `type` (required): Data type to fetch
  - `classes` - All classes
  - `terms` - All terms
  - `subjects` - Subjects for a class (requires `classId`)
  - `teachers` - All teachers (supports pagination and search)
- `classId` (required for subjects): Class ID
- `timetableId` (optional for subjects): Timetable ID (for usage tracking)
- `page` (optional for teachers): Page number (default: 1)
- `limit` (optional for teachers): Items per page (default: 50)
- `search` (optional for teachers/subjects): Search query

---

#### Fetch Classes

**Request**:

```http
GET /api/dos/timetable/helpers?type=classes HTTP/1.1
```

**Response** (200):

```json
{
  "classes": [
    {
      "id": "class123",
      "name": "P.7 Science",
      "level": "PRIMARY",
      "stream": "Science"
    }
  ]
}
```

---

#### Fetch Terms

**Request**:

```http
GET /api/dos/timetable/helpers?type=terms HTTP/1.1
```

**Response** (200):

```json
{
  "terms": [
    {
      "id": "term123",
      "name": "Term 1 2026",
      "startDate": "2026-01-31",
      "endDate": "2026-05-30"
    }
  ]
}
```

---

#### Fetch Subjects (for a class)

**Request**:

```http
GET /api/dos/timetable/helpers?type=subjects&classId=class123&timetableId=tt123 HTTP/1.1
```

**Response** (200):

```json
{
  "subjects": [
    {
      "id": "currsub123",
      "subjectId": "subj123",
      "subjectName": "Mathematics",
      "subjectCode": "MATH",
      "periodsPerWeek": 5,
      "usageCount": 3,
      "isAtLimit": false
    },
    {
      "id": "currsub456",
      "subjectId": "subj456",
      "subjectName": "English",
      "subjectCode": "ENG",
      "periodsPerWeek": 5,
      "usageCount": 5,
      "isAtLimit": true
    }
  ],
  "total": 12
}
```

**Fields**:

- `usageCount`: Number of periods already assigned in the timetable
- `isAtLimit`: True if usageCount >= periodsPerWeek

---

#### Fetch Teachers (with pagination and search)

**Request**:

```http
GET /api/dos/timetable/helpers?type=teachers&page=1&limit=50&search=john HTTP/1.1
```

**Response** (200):

```json
{
  "teachers": [
    {
      "id": "teacher123",
      "firstName": "John",
      "lastName": "Doe",
      "employeeNumber": "EMP001",
      "teacherCode": "JD001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Search Behavior**:

- Searches across: firstName, lastName, employeeNumber, teacherCode
- Case-insensitive
- Partial match

---

## Archive Endpoints

### POST /api/dos/timetable/[id]/archive

Archive a timetable (mark as read-only).

**Request**:

```http
POST /api/dos/timetable/tt123/archive HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "message": "Timetable archived successfully",
  "timetableId": "tt123"
}
```

**Response** (400 - Already Archived):

```json
{
  "error": "Timetable is already archived"
}
```

---

### DELETE /api/dos/timetable/[id]/archive

Unarchive a timetable (restore from archive).

**Request**:

```http
DELETE /api/dos/timetable/tt123/archive HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "message": "Timetable unarchived successfully",
  "timetableId": "tt123"
}
```

**Response** (400 - Not Archived):

```json
{
  "error": "Timetable is not archived"
}
```

---

### POST /api/dos/timetable/archive-old

Archive all old period-based timetables (bulk operation).

**Request**:

```http
POST /api/dos/timetable/archive-old HTTP/1.1
Host: example.com
Cookie: next-auth.session-token=<token>
```

**Response** (200):

```json
{
  "message": "Old timetables archived successfully",
  "archivedCount": 15
}
```

**Response** (400 - No Old Timetables):

```json
{
  "error": "No old timetables found to archive"
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning               | Description                       |
| ---- | --------------------- | --------------------------------- |
| 200  | OK                    | Request successful                |
| 400  | Bad Request           | Validation error or invalid input |
| 401  | Unauthorized          | Not authenticated                 |
| 403  | Forbidden             | Not authorized (not DoS)          |
| 404  | Not Found             | Resource not found                |
| 409  | Conflict              | Scheduling conflict detected      |
| 500  | Internal Server Error | Server error                      |

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)",
  "conflicts": ["Conflict 1", "Conflict 2"] // Only for 409 responses
}
```

### Common Error Messages

**Authentication Errors**:

- "Unauthorized" (401)
- "Director of Studies access required" (403)
- "School context required" (400)

**Validation Errors**:

- "Start time must be before end time" (400)
- "Period duration must be at least 15 minutes" (400)
- "Invalid dayOfWeek: X. Must be 1-7" (400)
- "Missing required fields" (400)
- "Invalid time format. Use HH:MM" (400)

**Conflict Errors** (409):

- "Slot already occupied by [Subject] ([Teacher])"
- "Teacher is already teaching [Subject] in [Class] at this time"
- "Room [Room] is already occupied by [Subject] ([Class]) at this time"
- "[Subject] already has X periods (max: Y per week)"

**Resource Errors**:

- "Timetable not found" (404)
- "Configuration not found" (404)
- "Teacher not found" (404)
- "Cannot delete locked timetable" (400)
- "Timetable is already archived" (400)

---

## Data Models

### TimetableConfiguration

```typescript
interface TimetableConfiguration {
  id: string;
  schoolId: string;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  periodDurationMinutes: number;
  specialPeriods: SpecialPeriod[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### SpecialPeriod

```typescript
interface SpecialPeriod {
  name: string; // e.g., "Break", "Lunch", "Assembly"
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  daysOfWeek: number[]; // 1=Monday, 2=Tuesday, ..., 7=Sunday
}
```

### TimeSlot

```typescript
interface TimeSlot {
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  isSpecialPeriod: boolean;
  specialPeriodName?: string; // Only if isSpecialPeriod = true
  period?: number; // Period number (1, 2, 3, ...)
}
```

### Timetable

```typescript
interface Timetable {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  termId: string;
  termName: string;
  timetableName: string;
  weekCount: number;
  status: "DRAFT" | "APPROVED" | "PUBLISHED";
  dosApproved: boolean;
  dosApprovedBy?: string;
  dosApprovedAt?: string; // ISO 8601
  isLocked: boolean;
  isTimeBased: boolean; // true = time-based, false = period-based (legacy)
  isArchived: boolean; // true = archived (read-only)
  createdBy: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  entries?: TimetableEntry[]; // Only included in GET /api/dos/timetable/[id]
  entryCount?: number; // Only included in GET /api/dos/timetable
}
```

### TimetableEntry

```typescript
interface TimetableEntry {
  id: string;
  timetableId: string;
  curriculumSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  dayOfWeek: number; // 1=Monday, 2=Tuesday, ..., 7=Sunday
  period: number; // Period number (legacy)
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  room?: string;
  isDoubleLesson: boolean;
  isSpecialPeriod: boolean;
  specialPeriodName?: string;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### SubjectInfo

```typescript
interface SubjectInfo {
  id: string; // DoSCurriculumSubject ID
  subjectId: string; // Subject ID
  subjectName: string;
  subjectCode: string;
  periodsPerWeek: number;
  usageCount: number; // Number of periods already assigned
  isAtLimit: boolean; // true if usageCount >= periodsPerWeek
}
```

### TeacherInfo

```typescript
interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  teacherCode: string;
}
```

### ClassInfo

```typescript
interface ClassInfo {
  id: string;
  name: string;
  level: string;
  stream?: string;
}
```

### TermInfo

```typescript
interface TermInfo {
  id: string;
  name: string;
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string; // Format: "YYYY-MM-DD"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. Future versions may include:

- 100 requests per minute per user
- 1000 requests per hour per school

---

## Versioning

API version is not currently included in the URL. Future versions may use:

- `/api/v1/dos/timetable`
- `/api/v2/dos/timetable`

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial release
- Configuration management endpoints
- Timetable CRUD endpoints
- Entry management with 4-dimensional conflict detection
- Teacher code generation endpoints
- Helper endpoints with pagination and search
- Archive endpoints for migration support

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-13  
**Maintained By**: Development Team
