# Class Details Page - CA/Exam Scores & Curriculum Fix

**Date**: 2026-02-10  
**Status**: ✅ **FIXED**

---

## Issues Fixed

### 1. CA and Exam Scores Showing 0/20 and 0/80 ✅

**Problem**: Student roster was showing "0/20" for CA and "0/80" for Exam instead of real averages.

**Root Cause**: The API was using the old `Mark` model with exam types instead of the new `CAEntry` and `ExamEntry` models.

**Solution**: Updated the calculation to use the correct models:

**Before**:

```typescript
// Used old Mark model with exam.type === 'CA' or 'EXAM'
const studentMarks = await prisma.mark.findMany({
  where: {
    studentId: student.id,
    exam: { termId: currentTerm.id },
  },
  include: { exam: { select: { type: true } } },
});
```

**After**:

```typescript
// Use new CAEntry model
const caEntries = await prisma.cAEntry.findMany({
  where: {
    studentId: student.id,
    termId: currentTerm.id,
    status: "SUBMITTED",
  },
  select: { rawScore: true, maxScore: true },
});

// Use new ExamEntry model
const examEntries = await prisma.examEntry.findMany({
  where: {
    studentId: student.id,
    termId: currentTerm.id,
    status: "SUBMITTED",
  },
  select: { examScore: true, maxScore: true },
});
```

**Calculation Logic**:

**CA Score (out of 20)**:

1. Get all CA entries for student in current term
2. Calculate percentage for each entry: `(rawScore / maxScore) * 100`
3. Calculate average percentage across all entries
4. Convert to out of 20: `(average / 100) * 20`

**Exam Score (out of 80)**:

1. Get all Exam entries for student in current term
2. Calculate percentage for each entry: `(examScore / maxScore) * 100`
3. Calculate average percentage across all entries
4. Convert to out of 80: `(average / 100) * 80`

**Final Score (out of 100)**:

```typescript
finalScore = caScore + examScore; // Total out of 100
```

---

### 2. Curriculum Section Showing Generic Subjects ✅

**Problem**: Curriculum section was showing generic subjects (Mathematics, Chemistry, Biology, English Language) instead of actual subjects assigned to teachers for this specific class.

**Root Cause**: The API was using `ClassSubject` which shows all subjects configured for the class, not the subjects actually assigned to teachers.

**Solution**: Changed to use `StaffSubject` which shows subjects assigned to specific teachers for this class.

**Before**:

```typescript
// Used ClassSubject - shows all configured subjects
const classSubjects = await prisma.classSubject.findMany({
  where: { classId },
  include: {
    subject: { select: { id: true, name: true } },
  },
});
```

**After**:

```typescript
// Use StaffSubject - shows subjects assigned to teachers
const staffSubjects = await prisma.staffSubject.findMany({
  where: { classId },
  include: {
    subject: { select: { id: true, name: true, code: true } },
    staff: { select: { firstName: true, lastName: true } },
  },
});
```

**Now Shows**:

- ✅ Only subjects that have teachers assigned
- ✅ Subject name and code
- ✅ Teacher name for each subject
- ✅ Real data from database

---

## Expected Results

### Student Roster

**Before**:

```
David Atwine    SO-S-1010    0%    0/20    0/80
Hope Kato       SO-S-1015    0%    0/20    0/80
Ruth Asiimwe    SO-S-1020    0%    0/20    0/80
```

**After** (with real data):

```
David Atwine    SO-S-1010    0%    15/20   64/80
Hope Kato       SO-S-1015    0%    18/20   72/80
Ruth Asiimwe    SO-S-1020    0%    12/20   58/80
```

### Curriculum Section

**Before**:

```
Mathematics (Mathematics)     in progress
Chemistry (Chemistry)         in progress
Biology (Biology)             in progress
English Language (English)    in progress
```

**After** (with real data):

```
Mathematics (MTH)             Teacher: John Doe        in progress
Physics (PHY)                 Teacher: Jane Smith      in progress
Chemistry (CHM)               Teacher: Bob Wilson      in progress
Biology (BIO)                 Teacher: Alice Brown     in progress
```

---

## How It Works

### CA Score Calculation

1. **Fetch CA Entries**:

   ```typescript
   const caEntries = await prisma.cAEntry.findMany({
     where: {
       studentId: student.id,
       termId: currentTerm.id,
       status: "SUBMITTED",
     },
   });
   ```

2. **Calculate Percentages**:

   ```typescript
   const caPercentages = caEntries.map(
     (entry) => (entry.rawScore / entry.maxScore) * 100,
   );
   ```

3. **Calculate Average**:

   ```typescript
   const caAverage =
     caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length;
   ```

4. **Convert to out of 20**:
   ```typescript
   caScore = Math.round((caAverage / 100) * 20);
   ```

### Exam Score Calculation

1. **Fetch Exam Entries**:

   ```typescript
   const examEntries = await prisma.examEntry.findMany({
     where: {
       studentId: student.id,
       termId: currentTerm.id,
       status: "SUBMITTED",
     },
   });
   ```

2. **Calculate Percentages**:

   ```typescript
   const examPercentages = examEntries.map(
     (entry) => (entry.examScore / entry.maxScore) * 100,
   );
   ```

3. **Calculate Average**:

   ```typescript
   const examAverage =
     examPercentages.reduce((sum, p) => sum + p, 0) / examPercentages.length;
   ```

4. **Convert to out of 80**:
   ```typescript
   examScore = Math.round((examAverage / 100) * 80);
   ```

### Final Score

```typescript
finalScore = caScore + examScore; // Total out of 100
performance = finalScore; // Overall performance
```

---

## Testing

### Test CA Scores

1. Navigate to Class Teacher → My Class
2. Check Student Roster
3. Verify CA (20%) column shows real scores (e.g., 15/20, 18/20)
4. Verify scores match CA entries in database

### Test Exam Scores

1. Navigate to Class Teacher → My Class
2. Check Student Roster
3. Verify Exam (80%) column shows real scores (e.g., 64/80, 72/80)
4. Verify scores match Exam entries in database

### Test Curriculum

1. Navigate to Class Teacher → My Class
2. Check Curriculum section
3. Verify only subjects with assigned teachers are shown
4. Verify teacher names are displayed
5. Verify subject codes are shown

---

## Database Requirements

### Required Data

**For CA Scores to Show**:

- CAEntry records with `status: 'SUBMITTED'`
- Linked to student, term, and subject
- Must have `rawScore` and `maxScore`

**For Exam Scores to Show**:

- ExamEntry records with `status: 'SUBMITTED'`
- Linked to student, term, and subject
- Must have `examScore` and `maxScore`

**For Curriculum to Show**:

- StaffSubject records linking staff to subjects and classes
- Subject records with name and code
- Staff records with firstName and lastName

---

## Status

✅ **CA Score Calculation** - Fixed, using CAEntry model  
✅ **Exam Score Calculation** - Fixed, using ExamEntry model  
✅ **Final Score Calculation** - Fixed, CA + Exam  
✅ **Curriculum Display** - Fixed, using StaffSubject model  
✅ **Teacher Names** - Fixed, showing real teacher names  
✅ **Subject Codes** - Fixed, showing real subject codes

---

**File Updated**: `src/app/api/class-teacher/class-details/route.ts`  
**Lines Changed**: ~50 lines  
**Testing**: Ready for testing with real data
