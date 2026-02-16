# Auto-Generate Timetable - Implementation TODO

## Current Status

✅ **Frontend**: `TimetableGenerationDialog` component exists and is ready
✅ **Time Configuration**: Working (07:00-18:00, 45 min periods, special periods)
✅ **Manual Entry**: Working (can add entries manually)
❌ **Backend API**: `/api/dos/timetable/[id]/generate` - NEEDS IMPLEMENTATION

## What the Auto-Generate Feature Does

The auto-generate feature automatically fills the timetable by:

1. **Loading Configuration**:
   - Time slots from school configuration
   - Subjects for the class (with periodsPerWeek limits)
   - Available teachers
   - Existing entries (if preserveExisting = true)

2. **Constraint Checking**:
   - Teacher not double-booked
   - Room not double-booked
   - Subject period limits respected
   - Special periods avoided

3. **Optimization** (based on weights):
   - Minimize teacher gaps (0.8 weight)
   - Avoid heavy subjects in afternoon (0.7 weight)
   - Balance workload across days (0.6 weight)
   - Distribute subjects evenly (0.5 weight)

4. **Output**:
   - Entries generated count
   - Quality score (0-100)
   - Conflicts detected
   - Suggestions for improvement
   - Statistics (filled slots, empty slots, teacher gaps, etc.)

## API Endpoint Needed

**POST** `/api/dos/timetable/[id]/generate`

### Request Body:

```typescript
{
  config: {
    periodsPerDay: number,
    periodDuration: number,
    startTime: string,
    daysPerWeek: number,
    breaks: Array<{
      afterPeriod: number,
      duration: number,
      name: string
    }>,
    weights: {
      teacherGaps: number,        // 0-1
      heavySubjectsAfternoon: number,  // 0-1
      workloadBalance: number,    // 0-1
      subjectDistribution: number // 0-1
    }
  },
  preserveExisting: boolean,  // Keep manually added entries
  clearExisting: boolean      // Remove all entries first
}
```

### Response:

```typescript
{
  result: {
    entriesGenerated: number,
    entriesSaved: number,
    score: number,  // 0-100
    conflicts: Array<{
      type: string,
      message: string,
      slot: { day: number, period: number }
    }>,
    suggestions: string[],
    stats: {
      totalSlots: number,
      filledSlots: number,
      emptySlots: number,
      teacherGaps: number,
      heavyAfternoon: number
    }
  }
}
```

## Implementation Steps

### 1. Create API Route

File: `src/app/api/dos/timetable/[id]/generate/route.ts`

### 2. Create Generation Service

File: `src/services/timetable-generation.service.ts`

Functions needed:

- `generateTimetable()` - Main generation logic
- `loadTimetableData()` - Load subjects, teachers, time slots
- `assignSubjectsToSlots()` - Core assignment algorithm
- `checkConstraints()` - Validate no conflicts
- `calculateScore()` - Quality scoring
- `optimizeAssignments()` - Apply optimization weights
- `generateSuggestions()` - Provide improvement tips

### 3. Algorithm Approach

**Simple Greedy Algorithm** (for MVP):

1. Get all subjects with their periodsPerWeek requirements
2. For each subject, assign to random available slots
3. Check constraints after each assignment
4. If conflict, try different slot
5. Continue until all subjects assigned or no more slots

**Advanced Algorithm** (future):

- Genetic algorithm
- Simulated annealing
- Constraint satisfaction problem (CSP) solver

## Complexity Estimate

- **Simple Implementation**: 4-6 hours
- **With Optimization**: 8-12 hours
- **Full Featured**: 16-24 hours

## Current Priority

Given that manual entry is working, the auto-generate feature is a **nice-to-have enhancement** rather than a blocker.

**Recommendation**: Implement a simple version that:

1. Assigns subjects to slots randomly
2. Checks basic constraints (no double-booking)
3. Returns results without complex optimization
4. Can be enhanced later with better algorithms

## Files to Create

1. `src/app/api/dos/timetable/[id]/generate/route.ts` - API endpoint
2. `src/services/timetable-generation.service.ts` - Generation logic
3. `src/lib/timetable-algorithms.ts` - Assignment algorithms (optional)

## Testing Checklist

- [ ] Generate for empty timetable
- [ ] Generate with preserveExisting = true
- [ ] Generate with clearExisting = true
- [ ] Handle conflicts gracefully
- [ ] Return meaningful suggestions
- [ ] Calculate accurate statistics
- [ ] Respect subject period limits
- [ ] Avoid teacher double-booking
- [ ] Avoid room double-booking
- [ ] Skip special periods

---

**Status**: Ready for implementation
**Priority**: Medium (manual entry works, this is enhancement)
**Estimated Time**: 4-6 hours for MVP
