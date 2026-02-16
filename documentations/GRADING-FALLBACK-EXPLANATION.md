# Grading System Fallback Behavior

## Overview

The grading system now supports automatic fallback to FINAL grading when specific category grading systems (CA_ONLY or EXAM_ONLY) don't exist.

---

## Fallback Logic

### Priority Order for CA Grading

```
1. CA_ONLY grading system (Most Specific)
   ├─ Class + Term specific
   ├─ Class specific
   ├─ Term specific
   └─ School-wide

2. FINAL grading system (Fallback)
   ├─ Class + Term specific
   ├─ Class specific
   ├─ Term specific
   └─ School-wide

3. No grading (No grades displayed)
```

### Priority Order for Exam Grading

```
1. EXAM_ONLY grading system (Most Specific)
   ├─ Class + Term specific
   ├─ Class specific
   ├─ Term specific
   └─ School-wide

2. FINAL grading system (Fallback)
   ├─ Class + Term specific
   ├─ Class specific
   ├─ Term specific
   └─ School-wide

3. No grading (No grades displayed)
```

---

## Scenarios

### Scenario 1: All Grading Systems Exist ✅

**Setup**:

- FINAL grading: A (80-100), B (70-79), C (60-69), D (50-59), F (0-49)
- CA_ONLY grading: A (85-100), B (75-84), C (65-74), D (55-64), F (0-54)
- EXAM_ONLY grading: A (80-100), B (70-79), C (60-69), D (50-59), F (0-49)

**Result**:

```
CA Score: 80/100 (80%)
Uses: CA_ONLY grading
Grade: B (75-84 range)

Exam Score: 80/100 (80%)
Uses: EXAM_ONLY grading
Grade: A (80-100 range)
```

---

### Scenario 2: Only FINAL Grading Exists ✅ (Fallback)

**Setup**:

- FINAL grading: A (80-100), B (70-79), C (60-69), D (50-59), F (0-49)
- CA_ONLY grading: ❌ Not created
- EXAM_ONLY grading: ❌ Not created

**Result**:

```
CA Score: 80/100 (80%)
Uses: FINAL grading (fallback)
Grade: A (80-100 range)

Exam Score: 80/100 (80%)
Uses: FINAL grading (fallback)
Grade: A (80-100 range)
```

**Console Log**:

```
⚠️ No CA_ONLY grading system found, falling back to FINAL
⚠️ No EXAM_ONLY grading system found, falling back to FINAL
```

---

### Scenario 3: Only CA_ONLY Exists, No FINAL ⚠️

**Setup**:

- FINAL grading: ❌ Not created
- CA_ONLY grading: A (85-100), B (75-84), C (65-74), D (55-64), F (0-54)
- EXAM_ONLY grading: ❌ Not created

**Result**:

```
CA Score: 80/100 (80%)
Uses: CA_ONLY grading
Grade: B (75-84 range)

Exam Score: 80/100 (80%)
Uses: No grading system found
Grade: null (not displayed)
```

**Console Log**:

```
⚠️ No EXAM_ONLY grading system found, falling back to FINAL
⚠️ No FINAL grading system found either
```

---

### Scenario 4: No Grading Systems Exist ❌

**Setup**:

- FINAL grading: ❌ Not created
- CA_ONLY grading: ❌ Not created
- EXAM_ONLY grading: ❌ Not created

**Result**:

```
CA Score: 80/100 (80%)
Uses: No grading system found
Grade: null (not displayed)

Exam Score: 80/100 (80%)
Uses: No grading system found
Grade: null (not displayed)
```

**Console Log**:

```
⚠️ No CA_ONLY grading system found, falling back to FINAL
⚠️ No FINAL grading system found either
⚠️ No EXAM_ONLY grading system found, falling back to FINAL
⚠️ No FINAL grading system found either
```

---

## Code Implementation

### Updated `getGradingSystem()` Function

```typescript
export async function getGradingSystem(
  schoolId: string,
  category: GradingCategory = "FINAL",
  classId?: string | null,
  termId?: string | null,
) {
  // Try to find the specific category first
  let gradingSystem = await prisma.gradingSystem.findFirst({
    where: {
      schoolId,
      category, // CA_ONLY or EXAM_ONLY
      OR: [
        { classId, termId },
        { classId, termId: null },
        { classId: null, termId },
        { classId: null, termId: null },
      ],
    },
    include: { grades: { orderBy: { minScore: "desc" } } },
    orderBy: [{ classId: "desc" }, { termId: "desc" }, { isDefault: "desc" }],
  });

  // If no specific category found and not already FINAL, fallback to FINAL
  if (!gradingSystem && category !== "FINAL") {
    console.log(
      `⚠️ No ${category} grading system found, falling back to FINAL`,
    );

    gradingSystem = await prisma.gradingSystem.findFirst({
      where: {
        schoolId,
        category: "FINAL", // Fallback to FINAL
        OR: [
          { classId, termId },
          { classId, termId: null },
          { classId: null, termId },
          { classId: null, termId: null },
        ],
      },
      include: { grades: { orderBy: { minScore: "desc" } } },
      orderBy: [{ classId: "desc" }, { termId: "desc" }, { isDefault: "desc" }],
    });
  }

  return gradingSystem;
}
```

### CA API Usage

```typescript
// Fetch CA grading system with fallback
const gradingSystem = await getGradingSystem(
  schoolId,
  "CA_ONLY", // Try CA_ONLY first
  classId,
  currentTerm.id,
);
// If CA_ONLY not found, automatically tries FINAL
```

### Exam API Usage

```typescript
// Fetch EXAM grading system with fallback
const gradingSystem = await getGradingSystem(
  schoolId,
  "EXAM_ONLY", // Try EXAM_ONLY first
  classId,
  currentTerm.id,
);
// If EXAM_ONLY not found, automatically tries FINAL
```

---

## Recommendations

### For Schools Starting Out

**Option 1: Simple Setup (Recommended)**

```
Create only FINAL grading system
- Used for CA, Exam, and Final grades
- Easiest to manage
- Consistent grading across all assessments
```

**Option 2: Separate Grading**

```
Create all three categories:
- CA_ONLY: Easier grading (e.g., A starts at 85%)
- EXAM_ONLY: Standard grading (e.g., A starts at 80%)
- FINAL: Combined grading (e.g., A starts at 80%)
```

### For Schools with Existing Systems

**Migration Path**:

```
1. Create FINAL grading first (fallback for everything)
2. Gradually add CA_ONLY and EXAM_ONLY as needed
3. Test with one class before rolling out school-wide
```

---

## Benefits of Fallback System

✅ **Flexibility**: Schools can start with one grading system
✅ **No Errors**: System always tries to find a grading system
✅ **Gradual Adoption**: Can add specific categories over time
✅ **Consistency**: FINAL grading ensures all assessments have grades
✅ **User-Friendly**: Teachers don't need to worry about missing grading systems

---

## User Experience

### Teacher View

**With Fallback**:

```
CA Score: 80/100
Grade: A (using FINAL grading)
Note: "Using school-wide grading"
```

**Without Fallback** (Old Behavior):

```
CA Score: 80/100
Grade: - (no grade displayed)
Note: "No grading system configured"
```

---

## Summary

**Grading System Lookup Order**:

1. Try specific category (CA_ONLY or EXAM_ONLY)
2. If not found, try FINAL category
3. If still not found, no grade displayed

**Key Points**:

- FINAL grading acts as universal fallback
- Schools can use one grading system for everything
- Or create specific grading for different assessment types
- System logs fallback usage for debugging
- No errors if grading systems are missing

---

**Version**: 2.0  
**Date**: 2026-02-09  
**Status**: Implemented with Fallback Support
