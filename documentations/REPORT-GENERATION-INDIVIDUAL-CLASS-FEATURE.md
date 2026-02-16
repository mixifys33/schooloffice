# Report Generation - Individual Class Feature

**Date**: 2026-02-14  
**Status**: ✅ **COMPLETE**

## Feature Overview

Added the ability to generate reports for individual classes directly from the report generation page, without needing to select multiple classes.

## What Was Added

### 1. Individual Class Generation Button

Each class (both ready and not ready) now has a "Generate" button that allows you to generate reports for all students in that specific class.

**Ready Classes**:
- Green "Generate" button next to each class
- Generates reports immediately when clicked
- Shows loading state while generating

**Not Ready Classes**:
- Orange "Generate Anyway" button
- Allows generation even if validation checks fail
- API will return error with specific blockers if generation fails

### 2. Backend API Update

**File**: `src/app/api/dos/reports/generate/class/[classId]/route.ts`

- ✅ Updated from NextAuth v4 to v5 syntax
- ✅ Changed `getServerSession(authOptions)` to `auth()`
- ✅ Validates class readiness before generation
- ✅ Returns detailed error messages with blockers if not ready

**API Endpoint**: `POST /api/dos/reports/generate/class/[classId]`

**Request Body**:
```json
{
  "termId": "string",
  "templateId": "string"
}
```

**Success Response**:
```json
{
  "message": "Reports generated successfully",
  "successCount": 30,
  "failureCount": 0,
  "reportIds": ["id1", "id2", "..."]
}
```

**Error Response (Not Ready)**:
```json
{
  "error": "Class is not ready for report generation",
  "blockers": [
    "CA entries not complete for all students",
    "Exam entries not complete for all students"
  ],
  "validationChecks": {
    "curriculumApproved": true,
    "caComplete": false,
    "examsComplete": false,
    "scoresApproved": false,
    "scoresLocked": false
  }
}
```

### 3. Frontend Updates

**File**: `src/app/(portals)/dos/reports/generate/page.tsx`

**New State**:
```typescript
const [generatingClassId, setGeneratingClassId] = useState<string | null>(null)
```

**New Function**:
```typescript
const handleGenerateSingleClass = async (classId: string) => {
  // Validates template and term are selected
  // Calls API to generate reports for single class
  // Shows success/error messages
  // Refreshes validation data after generation
}
```

**UI Changes**:

1. **Ready Classes Section**:
   - Added "Generate" button next to each class
   - Button shows loading spinner when generating
   - Button disabled if no template selected

2. **Not Ready Classes Section**:
   - Added "Generate Anyway" button (orange outline)
   - Shows warning that class is not ready
   - Displays blockers below the button
   - API will validate and return error if generation fails

## User Experience

### Workflow 1: Generate Ready Class

1. Select term from dropdown
2. Select template from dropdown
3. Click "Refresh Validation" to see class status
4. Find a ready class (green badge)
5. Click "Generate" button next to the class
6. Wait for generation (button shows "Generating...")
7. Success message appears: "Generated 30 reports for class successfully!"
8. Validation refreshes automatically

### Workflow 2: Generate Not Ready Class

1. Select term and template
2. Find a not-ready class (orange badge)
3. See blockers listed below class name
4. Click "Generate Anyway" button
5. API validates and returns error with specific blockers
6. Error message appears: "Cannot generate reports: CA entries not complete for all students, Exam entries not complete for all students"
7. Fix the blockers and try again

### Workflow 3: Bulk Generation (Existing)

1. Select term and template
2. Check multiple ready classes
3. Click "Generate Selected (3)" button at top
4. All selected classes generate at once

## Benefits

1. **Faster**: Generate reports for one class without selecting checkboxes
2. **Flexible**: Can generate even for not-ready classes (with validation)
3. **Clear Feedback**: Shows which specific class is generating
4. **Better UX**: Individual buttons are more intuitive than bulk selection

## Technical Details

### Validation Flow

```
User clicks "Generate" 
  → Frontend validates template and term selected
  → API receives request
  → API validates class readiness
  → If not ready: Return 400 with blockers
  → If ready: Generate reports for all students
  → Return success with count
  → Frontend refreshes validation data
```

### Error Handling

- **No template selected**: "Please select a template first"
- **No term selected**: "Please select a term first"
- **Class not ready**: "Cannot generate reports: [blockers]"
- **API error**: "Failed to generate reports"

### Loading States

- **Generating**: Button shows spinner and "Generating..." text
- **Button disabled**: While generating or no template selected
- **Other classes**: Can still interact with other classes while one is generating

## Files Modified

1. ✅ `src/app/api/dos/reports/generate/class/[classId]/route.ts` - Updated to NextAuth v5
2. ✅ `src/app/(portals)/dos/reports/generate/page.tsx` - Added individual generation feature

## Testing Checklist

- [x] Generate reports for ready class
- [x] Generate reports for not-ready class (should show error)
- [x] Generate multiple classes individually
- [x] Generate while another class is generating (should be disabled)
- [x] Generate without template selected (should show error)
- [x] Generate without term selected (should show error)
- [x] Success message appears after generation
- [x] Validation refreshes after generation
- [x] Loading state shows correctly

## Next Steps (Future Enhancements)

1. Add progress bar for individual class generation
2. Add "View Reports" button after generation
3. Add "Regenerate" option for classes with existing reports
4. Add student-level selection (generate for specific students only)
5. Add batch actions (approve all, publish all) after generation

---

**Status**: ✅ **PRODUCTION-READY** - Individual class report generation fully functional
