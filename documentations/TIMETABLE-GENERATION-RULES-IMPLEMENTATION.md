# Timetable Auto-Generation - Constraint Rules Implementation

**Date**: 2026-02-14  
**Status**: ✅ **FULLY IMPLEMENTED**

## Overview

The timetable auto-generation system now fully implements all 5 constraint rules configured by the DoS user. Each toggle and configuration setting directly affects how the generator assigns subjects to time slots.

---

## How Each Configuration Affects Generation

### 9️⃣ Conflict Detection & Repair Mode

**Configuration**:

- `conflictMode.enabled` (boolean)
- `conflictMode.attemptRepair` (boolean)

**How It Works**:

- **When ENABLED**: The system tracks all constraint violations and reports them in the `conflicts` array
- **When DISABLED**: Conflicts are not tracked, generation proceeds without reporting violations
- **Repair Mode**: When enabled, the system will attempt to swap assignments to resolve conflicts (TODO: swap logic implementation)

**Impact on Generation**:

- Enabled = More detailed feedback about what went wrong
- Disabled = Faster generation, no conflict tracking overhead

---

### 1️⃣ No Teacher Double Booking

**Configuration**: `rules.noTeacherDoubleBooking` (boolean)

**How It Works**:

```typescript
// Before assigning a slot, checks:
1. Is this teacher already teaching in THIS timetable at this day+period?
2. Is this teacher teaching in ANOTHER timetable (same term) at this day+period?

// If YES to either → Skip this slot, try next one
```

**Implementation**:

- Checks `currentAssignments` array for local conflicts
- Queries database for cross-timetable conflicts (same term, different class)
- Function: `checkTeacherDoubleBooking()`

**Impact on Generation**:

- **ENABLED**: Teacher can only be in ONE place at a time (realistic)
- **DISABLED**: Teacher can be assigned to multiple classes simultaneously (unrealistic, but allows more flexibility)

**Example**:

```
Teacher: Mr. Smith
Day: Monday, Period 1

ENABLED:
✅ Can teach P.5 Math at Monday Period 1
❌ Cannot also teach P.6 Science at Monday Period 1

DISABLED:
✅ Can teach P.5 Math at Monday Period 1
✅ Can also teach P.6 Science at Monday Period 1 (unrealistic!)
```

---

### 2️⃣ No Stream Double Subject

**Configuration**: `rules.noStreamDoubleSubject` (boolean)

**How It Works**:

```typescript
// Maintains a Set of occupied slots: "day-period"
// Before assigning: Check if slot is already occupied

if (occupiedSlots.has(`${day}-${period}`)) {
  skip; // Slot already has a subject
}
```

**Implementation**:

- Uses `occupiedSlots` Set to track filled slots
- Each (Day + Period) can have exactly ONE subject
- Prevents overlapping assignments

**Impact on Generation**:

- **ENABLED**: Each slot has exactly one lesson (realistic)
- **DISABLED**: Multiple subjects can be assigned to same slot (unrealistic, causes chaos)

**Example**:

```
Class: P.5
Day: Monday, Period 2

ENABLED:
✅ Math assigned to Monday Period 2
❌ English cannot also be assigned to Monday Period 2

DISABLED:
✅ Math assigned to Monday Period 2
✅ English also assigned to Monday Period 2 (students can't attend both!)
```

---

### 3️⃣ Weekly Subject Frequency Control

**Configuration**: `rules.weeklySubjectFrequency` (boolean)

**How It Works**:

```typescript
// Uses periodsPerWeek from DoSCurriculumSubject

const targetPeriods = rules.weeklySubjectFrequency
  ? subject.periodsPerWeek // Use exact requirement
  : Math.min(subject.periodsPerWeek, totalAvailableSlots); // Use whatever fits

// Tries to assign exactly targetPeriods for each subject
```

**Implementation**:

- Reads `periodsPerWeek` from database (DoS curriculum settings)
- Attempts to assign exactly that many periods
- Stops when target is reached

**Impact on Generation**:

- **ENABLED**: Respects curriculum requirements (Math needs 5 periods → gets 5 periods)
- **DISABLED**: Assigns as many as possible, ignoring curriculum requirements

**Example**:

```
Subject: Mathematics
Curriculum Setting: periodsPerWeek = 5

ENABLED:
✅ Assigns exactly 5 periods per week
❌ Stops after 5, even if more slots available

DISABLED:
✅ Assigns as many as possible (could be 3, could be 7)
```

---

### 4️⃣ Teacher Load Limits

**Configuration**:

- `rules.teacherLoadLimits` (boolean)
- `teacherLimits.minPeriodsPerWeek` (number, default: 15)
- `teacherLimits.maxPeriodsPerWeek` (number, default: 30)
- `teacherLimits.maxPeriodsPerDay` (number, default: 6)

**How It Works**:

```typescript
// Tracks teacher workload in real-time
teacherWorkload[teacherId] = {
  totalPeriods: 0,
  periodsPerDay: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

// Before assigning:
1. Check: totalPeriods < maxPeriodsPerWeek?
2. Check: periodsToday < maxPeriodsPerDay?

// If NO → Skip this slot

// After generation:
3. Check: totalPeriods >= minPeriodsPerWeek?
// If NO → Add to conflicts
```

**Implementation**:

- Maintains `TeacherWorkload` tracking object
- Updates after each assignment
- Prevents overloading or underutilizing teachers

**Impact on Generation**:

- **ENABLED**: Balanced workload (no teacher has 32 periods while another has 6)
- **DISABLED**: Unbalanced workload (some teachers overworked, others idle)

**Example**:

```
Teacher: Mrs. Johnson
Config: min=15, max=30, maxPerDay=6

ENABLED:
✅ Assigns 15-30 periods per week
✅ Max 6 periods per day
❌ Cannot assign 7th period on Monday (maxPerDay reached)
❌ Cannot assign 31st period (maxPerWeek reached)

DISABLED:
✅ Can assign 40 periods per week (overworked!)
✅ Can assign 8 periods in one day (exhausting!)
```

---

### 5️⃣ Subject Distribution Rule

**Configuration**:

- `rules.subjectDistribution` (boolean)
- `subjectLimits.maxSameSubjectPerDay` (number, default: 2)

**How It Works**:

```typescript
// Tracks subject distribution per day
subjectDistribution[subjectId] = {
  periodsPerDay: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// Before assigning:
const subjectToday = subjectDistribution[subjectId].periodsPerDay[day];
if (subjectToday >= maxSameSubjectPerDay) {
  skip; // Too many of this subject today
}
```

**Implementation**:

- Maintains `SubjectDistribution` tracking object
- Counts how many times each subject appears per day
- Prevents clustering

**Impact on Generation**:

- **ENABLED**: Subjects spread across the week (Math Mon, Math Wed, Math Fri)
- **DISABLED**: Subjects can cluster (Math Math Math Math all on Monday)

**Example**:

```
Subject: Mathematics
Config: maxSameSubjectPerDay = 2

ENABLED:
✅ Monday: Math, Math (2 periods)
❌ Monday: Cannot add 3rd Math period
✅ Tuesday: Math, Math (2 periods)
Result: Spread across week

DISABLED:
✅ Monday: Math, Math, Math, Math (4 periods)
✅ Tuesday: Math (1 period)
Result: Clustered on Monday (students exhausted!)
```

---

## Generation Algorithm Flow

```
1. Load Data
   - Fetch timetable, subjects, teachers
   - Read periodsPerWeek from curriculum
   - Generate time slots

2. Clear Existing (if clearExisting = true)
   - Delete all entries
   - Start fresh

3. Initialize Tracking
   - occupiedSlots Set (Rule 2)
   - teacherWorkload Map (Rule 4)
   - subjectDistribution Map (Rule 5)

4. For Each Subject:
   For Each Day (1 to daysPerWeek):
     For Each Time Slot:

       ✅ Check Rule 2: Slot occupied?
       ✅ Check Rule 1: Teacher double-booked?
       ✅ Check Rule 4: Teacher load limits?
       ✅ Check Rule 5: Subject distribution?

       If ALL checks pass:
         → Assign subject to slot
         → Update tracking
         → Save to database

       If ANY check fails:
         → Skip slot
         → Try next slot
         → Log conflict (if conflict mode enabled)

5. Post-Generation Checks
   ✅ Check Rule 3: All subjects got required periods?
   ✅ Check Rule 4: All teachers meet minimum load?

6. Calculate Results
   - Score (0-100 based on fulfillment)
   - Stats (filled slots, teacher gaps, etc.)
   - Suggestions (how to improve)
   - Conflicts (what went wrong)

7. Return Result
```

---

## Configuration Impact Summary

| Configuration                    | When ENABLED                         | When DISABLED                  |
| -------------------------------- | ------------------------------------ | ------------------------------ |
| **Conflict Detection**           | Tracks violations, provides feedback | No tracking, faster generation |
| **Rule 1: No Teacher Double**    | Realistic (1 teacher = 1 place)      | Unrealistic (teacher clones)   |
| **Rule 2: No Stream Double**     | Realistic (1 slot = 1 subject)       | Chaos (overlapping subjects)   |
| **Rule 3: Weekly Frequency**     | Respects curriculum (exact periods)  | Flexible (as many as fit)      |
| **Rule 4: Teacher Limits**       | Balanced workload                    | Unbalanced (overwork/idle)     |
| **Rule 5: Subject Distribution** | Spread across week                   | Clustered (exhausting)         |

---

## Recommendations

### For Realistic Timetables:

```
✅ Enable ALL rules
✅ Set reasonable limits:
   - minPeriodsPerWeek: 15
   - maxPeriodsPerWeek: 30
   - maxPeriodsPerDay: 6
   - maxSameSubjectPerDay: 2
✅ Enable conflict detection
✅ Enable repair mode
```

### For Maximum Flexibility (Testing):

```
❌ Disable Rules 4 and 5
✅ Keep Rules 1, 2, 3 enabled
✅ Enable conflict detection (to see what's happening)
```

### For Quick Generation (Ignore Constraints):

```
❌ Disable ALL rules
❌ Disable conflict detection
⚠️ Warning: May produce unrealistic timetables
```

---

## Status

✅ **ALL 5 RULES FULLY IMPLEMENTED**  
✅ **ALL CONFIGURATIONS AFFECT GENERATION**  
✅ **CONFLICT DETECTION WORKING**  
⏳ **REPAIR MODE** (swap logic) - TODO

---

## Testing

To verify rules are working:

1. **Enable all rules** → Generate → Check conflicts array
2. **Disable Rule 1** → Generate → Should allow teacher double-booking
3. **Disable Rule 4** → Generate → Should allow unbalanced workload
4. **Set maxSameSubjectPerDay = 1** → Generate → Each subject appears max once per day
5. **Set maxPeriodsPerDay = 3** → Generate → Teachers have max 3 periods per day

---

**Version**: 2.0  
**Last Updated**: 2026-02-14  
**Implementation**: Complete
