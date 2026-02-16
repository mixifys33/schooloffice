# Time-Based Timetable Implementation Plan

## Overview

Transform the timetable system from period-based (1, 2, 3...) to time-based (08:00-08:45, 08:45-09:30) with automatic slot generation and teacher unique codes.

## Phase 1: Database Schema Updates ✅

### 1.1 Create TimetableConfiguration Model

```prisma
model TimetableConfiguration {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId              String   @unique @db.ObjectId
  startTime             String   // "08:00"
  endTime               String   // "16:00"
  periodDurationMinutes Int      // 45
  specialPeriods        Json     // Array of {name, startTime, endTime, daysOfWeek[]}
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

### 1.2 Update DoSTimetableEntry Model

Add time-based fields:

- `startTime String?` - "08:00"
- `endTime String?` - "08:45"
- `isSpecialPeriod Boolean @default(false)`
- `specialPeriodName String?`

### 1.3 Staff Model (Already has teacherCode ✅)

- `teacherCode String?` - Already exists!

## Phase 2: Backend APIs

### 2.1 Configuration API

- `GET /api/dos/timetable/config` - Fetch configuration
- `POST /api/dos/timetable/config` - Save configuration
- `POST /api/dos/timetable/config/generate-slots` - Generate time slots

### 2.2 Teacher Code API

- `POST /api/dos/teachers/generate-codes` - Generate codes for all teachers
- `GET /api/dos/teachers/codes` - List all teacher codes

### 2.3 Enhanced Helpers API

- Update `/api/dos/timetable/helpers` to include teacher codes
- Filter subjects by DoSCurriculumSubject assignments

## Phase 3: Frontend Components

### 3.1 Configuration Page

- `/dos/timetable/config` - Configuration form
- Time pickers for start/end times
- Period duration input
- Special periods management (add/edit/delete)
- Validation and preview

### 3.2 Enhanced Timetable Grid

- Replace period numbers with time ranges
- Show teacher codes instead of full names
- Visual distinction for special periods
- Disable special period slots for assignment

### 3.3 Teacher Code Management

- Bulk generate codes button
- View/edit teacher codes
- Code uniqueness validation

## Phase 4: Migration & Compatibility

### 4.1 Data Migration

- Generate teacher codes for existing teachers
- Create default configuration for existing schools
- Mark old timetables as "legacy" (period-based)

### 4.2 Backward Compatibility

- Support both period-based and time-based timetables
- Show appropriate UI based on timetable type
- Migration wizard for converting old timetables

## Implementation Order

1. ✅ Schema updates (TimetableConfiguration, DoSTimetableEntry fields)
2. ✅ Configuration API endpoints
3. ✅ Configuration UI page
4. ✅ Time slot generation logic
5. ✅ Teacher code generation
6. ✅ Enhanced timetable grid display
7. ✅ Subject filtering by DoSCurriculumSubject
8. ✅ Migration scripts
9. ✅ Testing & validation

## Key Features

### Automatic Time Slot Generation

- Calculate available time (school hours - special periods)
- Divide by period duration
- Round UP for fractional results
- Insert special periods at configured times
- Mark special periods as non-assignable

### Teacher Unique Codes

- 5-character alphanumeric codes (e.g., "T1A2B")
- Unique within school
- Auto-generated on teacher creation
- Bulk generation for existing teachers

### Time-Based Display

- Format: "08:00-08:45" or "08:00-08:45 AM"
- Special periods: "Assembly (08:00-08:30)"
- Subject slots: Subject code (top) + Teacher code (bottom)

### Subject Filtering

- Only show subjects assigned to class via DoSCurriculumSubject
- Display periodsPerWeek limit
- Disable subjects that reached their limit
- Prevent wrong subject assignments

## Success Criteria

- ✅ DoS can configure school-wide timetable rules
- ✅ System automatically generates time slots
- ✅ Teachers have unique 5-character codes
- ✅ Timetable displays actual times instead of period numbers
- ✅ Only class-assigned subjects appear in dropdown
- ✅ Special periods are visually distinct and non-assignable
- ✅ Existing timetables continue to work (backward compatible)

## Timeline

- Phase 1 (Schema): 30 minutes
- Phase 2 (Backend): 1 hour
- Phase 3 (Frontend): 2 hours
- Phase 4 (Migration): 30 minutes
- Testing: 1 hour

**Total: ~5 hours**

---

**Status**: Ready to implement
**Priority**: High
**Complexity**: Medium-High
