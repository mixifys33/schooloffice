# Prisma Schema Fix - Stream Relation

## Error

```
Unknown field `stream` for include statement on model `Class`
```

## Root Cause

The attendance API was trying to include `stream` (singular) but the `Class` model has `streams` (plural) - a one-to-many relation.

## Schema Structure

### Class Model

```prisma
model Class {
  id        String   @id
  schoolId  String   @db.ObjectId
  name      String

  // Relations
  streams   Stream[]  // ✅ One-to-many (plural)
  students  Student[]
  // ... other relations
}
```

### Stream Model

```prisma
model Stream {
  id       String @id
  classId  String @db.ObjectId
  name     String

  // Relations
  class    Class  @relation(fields: [classId], references: [id])
}
```

## Fix Applied

### 1. Updated Include Statement

**File**: `src/app/api/class-teacher/attendance/route.ts`

```typescript
// Before (❌ Wrong):
include: {
  stream: true,  // Doesn't exist
  students: { ... }
}

// After (✅ Correct):
include: {
  streams: true,  // Correct plural form
  students: { ... }
}
```

### 2. Updated Stream Name Access

```typescript
// Before (❌ Wrong):
streamName: assignedClass.stream?.name || null;

// After (✅ Correct):
streamName: assignedClass.streams?.[0]?.name || null;
```

## Explanation

Since `streams` is an array (one-to-many relation), we need to:

1. Use `streams` (plural) in the include
2. Access the first stream with `streams?.[0]` (optional chaining for safety)

This handles cases where:

- Class has no streams: `streams` is empty array → `streamName` is `null`
- Class has one stream: `streams[0]` → `streamName` is the stream name
- Class has multiple streams: `streams[0]` → `streamName` is the first stream name

## Status

✅ **FIXED** - Attendance API now correctly queries the Class-Stream relation

---

**Fixed**: 2026-02-12  
**File**: src/app/api/class-teacher/attendance/route.ts  
**Changes**: 2 (include statement + stream name access)
