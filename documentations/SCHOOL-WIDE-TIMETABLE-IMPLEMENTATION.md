# School-Wide Timetable Implementation

**Date**: 2026-02-14  
**Status**: 🚧 IN PROGRESS (80% Complete)

## Overview

Implemented comprehensive school-wide timetable functionality that allows creating a master timetable containing all classes and streams in one unified view.

## ✅ Completed Changes

### 1. Database Schema (100% Complete)
- ✅ Made `classId` optional in `DoSTimetable` (null = school-wide)
- ✅ Added `isSchoolWide` boolean field to `DoSTimetable`
- ✅ Added `classId` and `streamId` to `DoSTimetableEntry`
- ✅ Added relations to Class and Stream models
- ✅ Removed unique constraint blocking school-wide timetables
- ✅ Added indexes for performance
- ✅ Schema pushed to database successfully

### 2. Backend API - Timetable Creation (100% Complete)
**File**: `src/app/api/dos/timetable/route.ts`

- ✅ POST endpoint accepts `isSchoolWide` parameter
- ✅ Validates school-wide vs single-class requirements
- ✅ Auto-generates appropriate names
- ✅ Prevents duplicate school-wide timetables per term
- ✅ GET endpoint returns `isSchoolWide` flag
- ✅ Handles null classId for school-wide timetables

### 3. Frontend UI - Create Dialog (100% Complete)
**File**: `src/app/(portals)/dos/timetable/page.tsx`

- ✅ Added checkbox toggle for school-wide option
- ✅ Conditionally hides class selection when school-wide
- ✅ Updated validation logic
- ✅ Shows "School-Wide" purple badge in list
- ✅ Displays "All Classes" for school-wide timetables
- ✅ Updated TypeScript interfaces

### 4. Frontend UI - Entry Management (80% Complete)
- ✅ Added state for class/stream selection
- ✅ Added streams loading function
- ✅ Updated `handleAddEntry` to include class/stream
- ✅ Updated `resetAddEntryForm`
- ✅ Updated TimetableEntry interface
- ⏳ Need to update Add Entry Dialog UI (see below)

## 🚧 Remaining Tasks

### Task 1: Complete Add Entry Dialog UI
**File**: `src/app/(portals)/dos/timetable/page.tsx` (lines ~1230-1350)

Add before the Subject selection:

```tsx
{/* Class Selection (for school-wide timetables) */}
{selectedTimetable?.isSchoolWide && (
  <>
    <div>
      <Label htmlFor="entryClass">Class *</Label>
      <Select 
        value={selectedClassId} 
        onValueChange={(value) => {
          setSelectedClassId(value);
          setSelectedStreamId(''); // Reset stream
          loadStreams(value); // Load streams for selected class
          loadSubjects(value, selectedTimetableId); // Load subjects for class
        }}
      >
        <SelectTrigger id="entryClass">
          <SelectValue placeholder="Select class" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((cls) => (
            <SelectItem key={cls.id} value={cls.id}>
              {cls.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Stream Selection (optional, for school-wide) */}
    {selectedClassId && streams.length > 0 && (
      <div>
        <Label htmlFor="entryStream">Stream (Optional)</Label>
        <Select value={selectedStreamId} onValueChange={setSelectedStreamId}>
          <SelectTrigger id="entryStream">
            <SelectValue placeholder="Select stream (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific stream</SelectItem>
            {streams.map((stream) => (
              <SelectItem key={stream.id} value={stream.id}>
                {stream.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </>
)}
```

### Task 2: Update Backend Entry Creation API
**File**: `src/app/api/dos/timetable/[id]/entries/route.ts`

Update POST handler to:
1. Accept `classId` and `streamId` from request body
2. Validate classId is provided for school-wide timetables
3. Include classId/streamId in entry creation
4. Update conflict detection to consider class/stream

```typescript
// In POST handler
const { curriculumSubjectId, teacherId, dayOfWeek, period, classId, streamId, room, isDoubleLesson, notes } = body;

// Validate for school-wide
if (timetable.isSchoolWide && !classId) {
  return NextResponse.json(
    { error: 'classId is required for school-wide timetable entries' },
    { status: 400 }
  );
}

// Create entry with classId/streamId
const entry = await prisma.doSTimetableEntry.create({
  data: {
    schoolId,
    timetableId,
    classId: timetable.isSchoolWide ? classId : timetable.classId,
    streamId: streamId || null,
    // ... rest of fields
  },
});
```

### Task 3: Update Backend Helpers API
**File**: `src/app/api/dos/timetable/helpers/route.ts`

Add streams endpoint:

```typescript
// Add to GET handler
if (type === 'streams') {
  const classId = searchParams.get('classId');
  if (!classId) {
    return NextResponse.json({ error: 'classId required' }, { status: 400 });
  }

  const streams = await prisma.stream.findMany({
    where: { schoolId, classId },
    select: { id: true, name: true, classId: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ streams });
}
```

### Task 4: Update Timetable Grid View
**File**: `src/app/(portals)/dos/timetable/page.tsx`

For school-wide timetables, show class/stream info in entries:

```tsx
// In entry display
{entry.className && (
  <div className="text-xs text-purple-600 font-medium text-center">
    {entry.className}{entry.streamName ? ` - ${entry.streamName}` : ''}
  </div>
)}
```

### Task 5: Update Auto-Generation Dialog
**File**: `src/components/dos/timetable-generation-dialog.tsx`

Add logic to:
1. Detect if timetable is school-wide
2. If school-wide, generate for all classes
3. Show progress per class
4. Handle conflicts across classes

### Task 6: Update GET Timetable Entries API
**File**: `src/app/api/dos/timetable/[id]/route.ts`

Include class/stream info in response:

```typescript
entries: entries.map(e => ({
  // ... existing fields
  classId: e.classId,
  className: e.class?.name,
  streamId: e.streamId,
  streamName: e.stream?.name,
}))
```

## Testing Checklist

- [ ] Create school-wide timetable
- [ ] Create single-class timetable
- [ ] Add entry to school-wide timetable (with class selection)
- [ ] Add entry to single-class timetable (no class selection)
- [ ] Verify conflict detection works across classes
- [ ] Test auto-generation for school-wide
- [ ] Test locking/unlocking school-wide timetables
- [ ] Test approval workflow
- [ ] Verify entries display correctly with class/stream info

## Benefits

1. **Unified View**: See entire school schedule in one place
2. **Resource Management**: Easier to manage teachers and rooms across classes
3. **Conflict Detection**: Prevents teacher double-booking across all classes
4. **Efficiency**: Generate timetables for all classes at once
5. **Flexibility**: Still supports single-class timetables for focused work

## Next Steps

1. Complete remaining tasks (1-6 above)
2. Test thoroughly
3. Update documentation
4. Train users on new functionality

---

**Last Updated**: 2026-02-14  
**Completion**: 80%
