# CA Grading System - How It Works

## Overview

The CA (Continuous Assessment) grading system automatically calculates letter grades based on student scores using configurable grading scales.

---

## Step-by-Step Process

### Step 1: DoS Creates CA Grading System

**Location**: `/dashboard/dos/grading`

The Director of Studies creates a grading system with category `CA_ONLY`:

```
Grading System: "Primary CA Grading"
Category: CA_ONLY
Class: P.5 (optional - can be school-wide)
Term: Term 1 (optional - can be all terms)

Grade Ranges:
┌────────┬───────────┬────────┬─────────┬──────────────┐
│ Grade  │ Min Score │ Max    │ Points  │ Remarks      │
├────────┼───────────┼────────┼─────────┼──────────────┤
│ A      │ 80        │ 100    │ 4.0     │ Excellent    │
│ B      │ 70        │ 79     │ 3.0     │ Very Good    │
│ C      │ 60        │ 69     │ 2.0     │ Good         │
│ D      │ 50        │ 59     │ 1.0     │ Pass         │
│ F      │ 0         │ 49     │ 0.0     │ Fail         │
└────────┴───────────┴────────┴─────────┴──────────────┘
```

---

### Step 2: Teacher Enters CA Scores

**Location**: `/dashboard/class-teacher/assessments/ca`

Teacher enters scores for a CA assessment:

```
CA Entry: "Midterm Test"
Max Score: 20
Type: TEST

Students:
┌─────────────────┬───────┬──────────┐
│ Student Name    │ Score │ Max      │
├─────────────────┼───────┼──────────┤
│ John Doe        │ 18    │ 20       │
│ Jane Smith      │ 15    │ 20       │
│ Bob Johnson     │ 12    │ 20       │
│ Alice Williams  │ 8     │ 20       │
└─────────────────┴───────┴──────────┘
```

---

### Step 3: System Calculates Grades Automatically

**Backend Process** (`/api/class-teacher/assessments/ca`):

```typescript
// 1. Fetch CA_ONLY grading system
const gradingSystem = await prisma.gradingSystem.findFirst({
  where: {
    schoolId,
    category: "CA_ONLY",
    // Prioritizes: class+term > class > term > school-wide
  },
  include: { grades: { orderBy: { minScore: "desc" } } },
});

// 2. For each student score:
studentScores.forEach((studentScore) => {
  if (studentScore.score !== null) {
    // Convert to percentage
    const percentage = (studentScore.score / studentScore.maxScore) * 100;
    // Example: (18/20) * 100 = 90%

    // Find matching grade range
    const gradeResult = calculateGradeSync(percentage, gradingSystem.grades);
    // 90% falls in 80-100 range → Grade A

    if (gradeResult) {
      studentScore.grade = gradeResult.grade; // "A"
    }
  }
});
```

---

### Step 4: Grades Displayed to Teacher

**Result**:

```
CA Entry: "Midterm Test"

Students with Calculated Grades:
┌─────────────────┬───────┬──────────┬───────┬─────────┬──────────────┐
│ Student Name    │ Score │ Max      │ %     │ Grade   │ Remarks      │
├─────────────────┼───────┼──────────┼───────┼─────────┼──────────────┤
│ John Doe        │ 18    │ 20       │ 90%   │ A       │ Excellent    │
│ Jane Smith      │ 15    │ 20       │ 75%   │ B       │ Very Good    │
│ Bob Johnson     │ 12    │ 20       │ 60%   │ C       │ Good         │
│ Alice Williams  │ 8     │ 20       │ 40%   │ F       │ Fail         │
└─────────────────┴───────┴──────────┴───────┴─────────┴──────────────┘
```

---

## Grading System Priority

When multiple grading systems exist, the system uses this priority:

```
1. Class-specific + Term-specific (Most Specific)
   Example: P.5 + Term 1 CA Grading

2. Class-specific, Any Term
   Example: P.5 CA Grading (all terms)

3. Term-specific, Any Class
   Example: Term 1 CA Grading (all classes)

4. School-wide (Fallback)
   Example: School CA Grading (all classes, all terms)
```

**Example Scenario**:

```
Available Grading Systems:
- "School CA Grading" (school-wide)
- "P.5 CA Grading" (class-specific)
- "Term 1 CA Grading" (term-specific)
- "P.5 Term 1 CA Grading" (class+term specific)

For P.5 student in Term 1:
✅ Uses: "P.5 Term 1 CA Grading" (most specific)
```

---

## Grade Calculation Logic

**Function**: `calculateGradeSync()` in `src/lib/grading.ts`

```typescript
export function calculateGradeSync(
  score: number, // Percentage (0-100)
  grades: Array<GradeRange>, // Sorted by minScore desc
): GradeResult | null {
  // Find first grade range where score fits
  const gradeRange = grades.find(
    (g) => score >= g.minScore && score <= g.maxScore,
  );

  if (!gradeRange) return null;

  return {
    grade: gradeRange.grade, // "A"
    points: gradeRange.points, // 4.0
    remarks: gradeRange.remarks, // "Excellent"
    minScore: gradeRange.minScore, // 80
    maxScore: gradeRange.maxScore, // 100
  };
}
```

**Example**:

```
Input: score = 85%
Grades: [
  { grade: "A", minScore: 80, maxScore: 100 },
  { grade: "B", minScore: 70, maxScore: 79 },
  ...
]

Process:
1. Check A: 85 >= 80 AND 85 <= 100 ✅ MATCH
2. Return: { grade: "A", points: 4.0, remarks: "Excellent" }
```

---

## API Response Format

**GET `/api/class-teacher/assessments/ca`**:

```json
{
  "class": { "id": "...", "name": "P.5" },
  "subject": { "id": "...", "name": "Mathematics" },
  "caEntries": [
    {
      "id": "...",
      "name": "Midterm Test",
      "maxScore": 20,
      "studentScores": [
        {
          "studentId": "...",
          "studentName": "John Doe",
          "admissionNumber": "2024001",
          "score": 18,
          "maxScore": 20,
          "grade": "A", // ← Automatically calculated
          "isDraft": false
        }
      ]
    }
  ]
}
```

---

## Frontend Display (To Be Implemented)

**Current**: Only scores are displayed
**Next Step**: Display grades alongside scores

```tsx
// In CA assessment table
<td>{studentScore.score}/{studentScore.maxScore}</td>
<td>
  {studentScore.grade && (
    <Badge variant="outline" className="font-mono">
      {studentScore.grade}
    </Badge>
  )}
</td>
```

---

## Benefits

✅ **Automatic**: No manual grade calculation needed
✅ **Consistent**: Same grading scale applied to all students
✅ **Flexible**: Different scales for different classes/terms
✅ **Real-time**: Grades update immediately when scores change
✅ **Accurate**: No human error in grade assignment

---

## Configuration Options

### 1. School-Wide CA Grading

```
Use Case: Same grading for all classes
Setup: Create grading system with no class/term selection
Example: "School CA Grading"
```

### 2. Class-Specific CA Grading

```
Use Case: Different grading for different levels
Setup: Create grading system for specific class
Example: "Primary CA Grading" (P.1-P.7)
         "Secondary CA Grading" (S.1-S.6)
```

### 3. Term-Specific CA Grading

```
Use Case: Different grading per term
Setup: Create grading system for specific term
Example: "Term 1 CA Grading" (easier)
         "Term 3 CA Grading" (harder)
```

### 4. Class+Term Specific CA Grading

```
Use Case: Maximum flexibility
Setup: Create grading system for specific class and term
Example: "P.7 Term 3 CA Grading" (exam preparation)
```

---

## Summary

**CA Grading Flow**:

1. DoS creates CA_ONLY grading system
2. Teacher enters CA scores
3. System converts scores to percentages
4. System finds matching grade range
5. Grade displayed automatically

**Key Points**:

- Grades are calculated in real-time
- No manual intervention needed
- Supports multiple grading scales
- Prioritizes most specific grading system
- Works for any CA assessment type (TEST, ASSIGNMENT)

---

**Version**: 1.0  
**Date**: 2026-02-09  
**Status**: Backend Complete, Frontend Display Pending
