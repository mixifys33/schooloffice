# School-Wide Timetable Integration - COMPLETE

**Date**: 2026-02-14  
**Status**: ✅ **FULLY INTEGRATED**

## Summary

Successfully integrated the school-wide timetable grid component into the main timetable page. The system now supports both single-class and school-wide timetables with a hierarchical grid layout.

## What Was Implemented

### 1. Frontend Integration (Main Page)

**File**: `src/app/(portals)/dos/timetable/page.tsx`

**Changes**:

- ✅ Imported `SchoolWideTimetableGrid` component
- ✅ Added `classesWithStreams` state for hierarchical class-stream data
- ✅ Created `loadClassesWithStreams()` function to fetch all classes with their streams
- ✅ Updated `useEffect` to load classes with streams when school-wide timetable is selected
- ✅ Updated `openAddEntryDialog()` to accept `classId` and `streamId` parameters
- ✅ Added conditional rendering: school-wide grid vs regular grid
- ✅ Updated Add Entry Dialog to show class/stream selection for school-wide timetables

**Key Features**:

```typescript
// Conditional grid rendering
{selectedTimetable.isSchoolWide ? (
  <SchoolWideTimetableGrid
    classes={classesWithStreams}
    timeSlots={timeSlots}
    entries={entries}
    isLocked={selectedTimetable.isLocked}
    onAddEntry={(day, period, classId, streamId) => {
      openAddEntryDialog(day, period, classId, streamId);
    }}
    onDeleteEntry={handleDeleteEntry}
  />
) : (
  /* Regular single-class grid */
)}
```

### 2. Backend API Updates

**File**: `src/app/api/dos/timetable/[id]/entries/route.ts`

**Changes**:

- ✅ Added `classId` and `streamId` parameters to POST request body
- ✅ Added validation: classId required for school-wide timetables
- ✅ Updated conflict detection to check same class/stream for school-wide
- ✅ Updated entry creation to include classId and streamId
- ✅ Added class and stream relations to response

**Key Features**:

```typescript
// School-wide validation
if (timetable.isSchoolWide && !classId) {
  return NextResponse.json(
    { error: "classId is required for school-wide timetables" },
    { status: 400 },
  );
}

// Conflict detection for school-wide
const slotConflict = await prisma.doSTimetableEntry.findFirst({
  where: {
    timetableId,
    dayOfWeek,
    period,
    ...(timetable.isSchoolWide && {
      classId: classId || null,
      streamId: streamId || null,
    }),
  },
});
```

**File**: `src/app/api/dos/timetable/helpers/route.ts`

**Changes**:

- ✅ Added `streams` endpoint type
- ✅ Fetches streams for a specific class
- ✅ Returns empty array if classId is null or 'null'

**Key Features**:

```typescript
// Fetch streams for a class
if (type === "streams") {
  const streams = await prisma.stream.findMany({
    where: { classId },
    select: { id: true, name: true, classId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ streams, total: streams.length });
}
```

### 3. Grid Component (Already Complete)

**File**: `src/components/dos/school-wide-timetable-grid.tsx`

**Features**:

- ✅ Hierarchical layout: Time → Classes → Streams → Days
- ✅ Classes sorted by level (P1, P2... S1, S2...)
- ✅ Multiple streams per class
- ✅ Click empty slots to add entries
- ✅ Hover tooltips with full details
- ✅ Delete button for each entry
- ✅ Color-coded headers
- ✅ Responsive design

## User Workflow

### Creating a School-Wide Timetable

1. Click "Create Timetable" button
2. Check "School-Wide Timetable" checkbox
3. Select term (class selection hidden for school-wide)
4. Click "Create Timetable"
5. System creates timetable with `isSchoolWide: true` and `classId: null`

### Adding Entries to School-Wide Timetable

1. Select school-wide timetable from list (shows purple "School-Wide" badge)
2. Grid displays with hierarchical layout:
   - Row 1: Time slots (08:00-08:40, 08:40-09:20...)
   - Row 2: Classes (P.1, P.2, P.3... sorted by level)
   - Row 3: Streams (A, B, C... under each class)
   - Column 1: Days (Monday-Friday)
3. Click empty slot in specific class-stream column
4. Dialog opens with:
   - Class selection (pre-filled from clicked slot)
   - Stream selection (optional, pre-filled if clicked stream slot)
   - Subject selection (loaded for selected class)
   - Teacher selection
   - Room, notes, etc.
5. Click "Add Entry"
6. Entry appears in grid with subject code, teacher code, room

### Viewing School-Wide Timetable

- Grid shows all classes horizontally
- Each class has multiple stream columns
- Entries displayed with:
  - Subject code (blue, bold)
  - Teacher code (gray, small)
  - Room (gray, smaller)
  - Delete button (if not locked)
- Hover over entry to see full details
- Legend at bottom explains colors

## Technical Details

### Data Flow

```
1. User selects school-wide timetable
   ↓
2. Frontend loads classes with streams
   ↓
3. Frontend renders SchoolWideTimetableGrid
   ↓
4. User clicks empty slot (day, period, classId, streamId)
   ↓
5. Dialog opens with class/stream pre-selected
   ↓
6. User selects subject, teacher, etc.
   ↓
7. Frontend calls POST /api/dos/timetable/[id]/entries
   with classId and streamId
   ↓
8. Backend validates and creates entry
   ↓
9. Frontend refreshes entries
   ↓
10. Grid updates with new entry
```

### Database Schema

```prisma
model DoSTimetable {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  classId      String?  @db.ObjectId  // null for school-wide
  isSchoolWide Boolean  @default(false)
  // ... other fields
}

model DoSTimetableEntry {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  classId   String?  @db.ObjectId  // For school-wide entries
  streamId  String?  @db.ObjectId  // For school-wide entries
  class     Class?   @relation(fields: [classId], references: [id])
  stream    Stream?  @relation(fields: [streamId], references: [id])
  // ... other fields
}
```

### API Endpoints

**POST /api/dos/timetable** - Create timetable

- Body: `{ isSchoolWide: true, termId: string }`
- Returns: Timetable with `classId: null`

**GET /api/dos/timetable/[id]** - Get timetable with entries

- Returns: Entries with classId, className, streamId, streamName

**POST /api/dos/timetable/[id]/entries** - Add entry

- Body: `{ classId, streamId, curriculumSubjectId, teacherId, dayOfWeek, period, ... }`
- Validates: classId required for school-wide
- Returns: Entry with class and stream info

**GET /api/dos/timetable/helpers?type=streams&classId=xxx** - Get streams

- Returns: `{ streams: [{ id, name, classId }] }`

## Testing Checklist

- ✅ Create school-wide timetable
- ✅ Grid displays with hierarchical layout
- ✅ Classes sorted by level (P1, P2... S1, S2...)
- ✅ Streams displayed under each class
- ✅ Click empty slot opens dialog
- ✅ Class pre-selected in dialog
- ✅ Stream pre-selected in dialog (if clicked stream slot)
- ✅ Subjects loaded for selected class
- ✅ Add entry saves with classId and streamId
- ✅ Entry appears in correct grid cell
- ✅ Hover tooltip shows full details
- ✅ Delete entry removes from grid
- ✅ Locked timetable prevents editing
- ✅ Regular single-class timetable still works

## Next Steps (Future Enhancements)

1. **Bulk Operations**: Add multiple entries at once
2. **Copy Entries**: Copy entries between classes/streams
3. **Template System**: Save and reuse timetable patterns
4. **Conflict Highlighting**: Visual indicators for conflicts
5. **Teacher Workload View**: Show teacher's schedule across all classes
6. **Room Utilization View**: Show room usage across all classes
7. **PDF Export**: Print-ready school-wide timetable
8. **Drag-Drop**: Move entries between slots
9. **Auto-Fill**: Suggest optimal slots based on constraints
10. **Analytics**: Utilization rates, free periods, etc.

## Files Modified

1. `src/app/(portals)/dos/timetable/page.tsx` - Main page integration
2. `src/app/api/dos/timetable/[id]/entries/route.ts` - Entry creation with classId/streamId
3. `src/app/api/dos/timetable/helpers/route.ts` - Added streams endpoint
4. `src/components/dos/school-wide-timetable-grid.tsx` - Grid component (already complete)

## Status

✅ **PRODUCTION-READY** - All features implemented and integrated

The school-wide timetable feature is now fully functional and ready for use!
