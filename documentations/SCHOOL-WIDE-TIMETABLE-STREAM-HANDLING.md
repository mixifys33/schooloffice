# School-Wide Timetable - Stream Handling Update

**Date**: 2026-02-14  
**Status**: ✅ **UPDATED**

## Summary

Updated the school-wide timetable grid to properly handle classes with and without streams. The grid now shows actual registered streams for each class, and displays "No Stream" for classes without streams.

## Changes Made

### 1. Column Structure Logic

**File**: `src/components/dos/school-wide-timetable-grid.tsx`

**Before**:
```typescript
// Classes without streams showed empty string ''
if (cls.streams.length === 0) {
  cols.push({
    classId: cls.id,
    className: cls.name,
    streamId: null,
    streamName: '', // Empty string
  });
}
```

**After**:
```typescript
// Classes without streams now show "No Stream"
if (cls.streams.length === 0) {
  cols.push({
    classId: cls.id,
    className: cls.name,
    streamId: null,
    streamName: 'No Stream', // Clear label
  });
}
```

### 2. Stream Row Display

**Before**:
```typescript
// Showed '-' for empty streams
<th className="border border-gray-300 p-2 font-medium text-yellow-900">
  {col.streamName || '-'}
</th>
```

**After**:
```typescript
// Shows "No Stream" in gray italic for classes without streams
<th
  className={`border border-gray-300 p-2 font-medium ${
    col.streamName === 'No Stream' 
      ? 'text-gray-400 italic'  // Gray italic for "No Stream"
      : 'text-yellow-900'        // Normal color for actual streams
  }`}
>
  {col.streamName}
</th>
```

### 3. Entry Matching Logic

**Before**:
```typescript
// Simple null check
const getEntry = (day, period, classId, streamId) => {
  return entries.find(
    (e) =>
      e.dayOfWeek === day &&
      e.period === period &&
      e.classId === classId &&
      (streamId ? e.streamId === streamId : !e.streamId)
  );
};
```

**After**:
```typescript
// Handles "No Stream" label properly
const getEntry = (day, period, classId, streamId) => {
  return entries.find(
    (e) =>
      e.dayOfWeek === day &&
      e.period === period &&
      e.classId === classId &&
      // Handle "No Stream" case: both should be null/undefined
      (streamId === null || streamId === 'No Stream' 
        ? (!e.streamId || e.streamId === null)
        : e.streamId === streamId)
  );
};
```

### 4. Click Handler

**Before**:
```typescript
onClick={() => {
  if (!isLocked && !entry) {
    onAddEntry(day, slot.slotNumber, col.classId, col.streamId || undefined);
  }
}}
```

**After**:
```typescript
onClick={() => {
  if (!isLocked && !entry) {
    const isNoStream = col.streamName === 'No Stream';
    // Pass undefined for streamId if "No Stream"
    onAddEntry(day, slot.slotNumber, col.classId, isNoStream ? undefined : col.streamId || undefined);
  }
}}
```

### 5. Tooltip Display

**Before**:
```typescript
<p className="text-xs text-gray-500">
  {entry.className} {entry.streamName ? `- ${entry.streamName}` : ''}
</p>
```

**After**:
```typescript
<p className="text-xs text-gray-500">
  {entry.className} {entry.streamName ? `- ${entry.streamName}` : '(No Stream)'}
</p>
```

## Visual Examples

### Grid Layout

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│   Time   │  08:00-08:40  │  08:40-09:20  │  09:20-10:00  │ ...        │
├──────────┼─────────────────────────────────────────────────────────────┤
│  Class   │     P.1       │     P.2       │     P.3       │     S.1    │
├──────────┼─────────────────────────────────────────────────────────────┤
│  Stream  │  No Stream    │   A   │   B   │  No Stream    │   A   │ B │
├──────────┼─────────────────────────────────────────────────────────────┤
│  Monday  │               │       │       │               │       │   │
│  Tuesday │               │       │       │               │       │   │
│  ...     │               │       │       │               │       │   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### Example Scenarios

**Scenario 1: Class with NO streams (e.g., P.1)**
- Class Row: Shows "P.1"
- Stream Row: Shows "No Stream" (gray, italic)
- Columns: 1 column for P.1
- Click behavior: Opens dialog with P.1 selected, no stream selection

**Scenario 2: Class with streams (e.g., P.2 has streams A, B)**
- Class Row: Shows "P.2" (spans 2 columns)
- Stream Row: Shows "A" and "B" (2 separate columns)
- Columns: 2 columns for P.2 (one for A, one for B)
- Click behavior: Opens dialog with P.2 and stream (A or B) pre-selected

**Scenario 3: Mixed classes**
```
Classes:  P.1 (no streams) | P.2 (A, B) | P.3 (no streams) | S.1 (A, B, C)
Columns:        1           |     2      |        1         |       3
Total columns: 7
```

## User Experience

### Creating Entries

1. **For classes WITHOUT streams**:
   - Click slot under "No Stream" column
   - Dialog opens with class pre-selected
   - Stream selection hidden (not applicable)
   - Entry saved with `streamId: null`

2. **For classes WITH streams**:
   - Click slot under specific stream (A, B, C, etc.)
   - Dialog opens with class AND stream pre-selected
   - Stream selection shows all streams for that class
   - Entry saved with specific `streamId`

### Visual Indicators

- **"No Stream"**: Gray, italic text to indicate absence of streams
- **Actual streams**: Normal yellow text for registered streams
- **Hover tooltip**: Shows "(No Stream)" for entries without streams

## Database Behavior

### Entry Storage

```typescript
// Class without streams
{
  classId: "class123",
  streamId: null,  // No stream
  // ... other fields
}

// Class with stream
{
  classId: "class123",
  streamId: "stream456",  // Specific stream
  // ... other fields
}
```

### Query Matching

```typescript
// Find entry for class without stream
WHERE classId = "class123" AND streamId IS NULL

// Find entry for class with stream
WHERE classId = "class123" AND streamId = "stream456"
```

## Benefits

1. **Clear Communication**: "No Stream" explicitly shows classes without streams
2. **Consistent Layout**: All classes shown, regardless of stream status
3. **Proper Data Handling**: Null streamId correctly represents no stream
4. **User-Friendly**: Visual distinction between classes with/without streams
5. **Accurate Representation**: Shows actual registered streams from database

## Testing Checklist

- ✅ Class with no streams shows "No Stream" in gray italic
- ✅ Class with streams shows actual stream names
- ✅ Click "No Stream" slot opens dialog without stream selection
- ✅ Click stream slot opens dialog with stream pre-selected
- ✅ Entry saved with null streamId for "No Stream"
- ✅ Entry saved with actual streamId for specific stream
- ✅ Entries display in correct columns
- ✅ Tooltip shows "(No Stream)" for entries without streams
- ✅ Tooltip shows stream name for entries with streams
- ✅ Grid layout adjusts based on number of streams per class

## Files Modified

1. `src/components/dos/school-wide-timetable-grid.tsx` - Updated stream handling logic

## Status

✅ **COMPLETE** - School-wide timetable now properly handles classes with and without streams!
