# Schema Updates Summary

## Changes Made to Support Subject Combinations and Teacher Assignments

### 1. New Enum Added

```prisma
enum LevelType {
  O_LEVEL
  A_LEVEL
}
```

This enum distinguishes between O-Level (Ordinary Level) and A-Level (Advanced Level) education.

---

### 2. Class Model Updates

**Added Fields:**

- `levelType LevelType?` - Optional field to specify if class is O_LEVEL or A_LEVEL

**Added Relations:**

- `teacherAssignments TeacherAssignment[]` - Links to teacher assignments

---

### 3. Subject Model Updates

**Added Fields:**

- `levelType LevelType?` - Optional field to specify if subject is for O_LEVEL or A_LEVEL

**Added Relations:**

- `teacherAssignments TeacherAssignment[]` - Links to teacher assignments
- `studentSubjects StudentSubject[]` - Links to student subject selections
- `combinationSubjects CombinationSubject[]` - Links to subject combinations

---

### 4. ClassSubject Model Updates

**Added Fields:**

- `isCompulsory Boolean @default(true)` - Whether subject is compulsory for all students
- `minRequired Int?` - Minimum number required (for O-Level S3/S4 electives)

---

### 5. Student Model Updates

**Added Fields:**

- `combinationId String? @db.ObjectId` - Links to subject combination (for A-Level students)

**Added Relations:**

- `combination Combination?` - The subject combination chosen by student
- `studentSubjects StudentSubject[]` - Individual subject selections

**Added Index:**

- `@@index([combinationId])`

---

### 6. Teacher Model Updates

**Added Relations:**

- `teacherAssignments TeacherAssignment[]` - Subject-Class assignments

---

### 7. School Model Updates

**Added Relations:**

- `combinations Combination[]`
- `studentSubjects StudentSubject[]`
- `combinationSubjects CombinationSubject[]`
- `teacherAssignments TeacherAssignment[]`

---

## New Models Added

### 1. Combination Model

Represents subject combinations for A-Level students (e.g., PCM, BCM, MEG).

```prisma
model Combination {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId
  name      String   // e.g., "PCM", "BCM", "MEG"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school              School
  combinationSubjects CombinationSubject[]
  students            Student[]

  @@unique([schoolId, name])
  @@index([schoolId])
}
```

**Purpose:** Define standard subject combinations that A-Level students can choose from.

---

### 2. CombinationSubject Model

Junction table linking combinations to subjects.

```prisma
model CombinationSubject {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId      String   @db.ObjectId
  combinationId String   @db.ObjectId
  subjectId     String   @db.ObjectId
  createdAt     DateTime @default(now())

  // Relations
  school      School
  combination Combination
  subject     Subject

  @@unique([combinationId, subjectId])
  @@index([combinationId])
  @@index([subjectId])
  @@index([schoolId])
}
```

**Purpose:** Define which subjects belong to each combination.

---

### 3. StudentSubject Model

Tracks individual subject selections for students.

```prisma
model StudentSubject {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId
  studentId String   @db.ObjectId
  subjectId String   @db.ObjectId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school  School
  student Student
  subject Subject

  @@unique([studentId, subjectId])
  @@index([studentId])
  @@index([subjectId])
  @@index([schoolId])
}
```

**Purpose:** Track which subjects each student is taking (especially important for elective subjects).

---

### 4. TeacherAssignment Model

Tracks which teacher teaches which subject in which class.

```prisma
model TeacherAssignment {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId
  teacherId String   @db.ObjectId
  classId   String   @db.ObjectId
  subjectId String   @db.ObjectId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school  School
  teacher Teacher
  class   Class
  subject Subject

  @@unique([teacherId, classId, subjectId])
  @@index([teacherId])
  @@index([classId])
  @@index([subjectId])
  @@index([schoolId])
}
```

**Purpose:** Explicitly track teacher-subject-class assignments with proper relational structure.

---

## Use Cases

### O-Level (S1-S4)

- **S1-S2**: All subjects are compulsory
- **S3-S4**: Students choose elective subjects
  - Use `ClassSubject.isCompulsory = false` for electives
  - Use `ClassSubject.minRequired` to specify minimum electives needed
  - Use `StudentSubject` to track which electives each student chose

### A-Level (S5-S6)

- Students choose a subject combination (PCM, BCM, MEG, etc.)
- Use `Combination` model to define available combinations
- Use `CombinationSubject` to define subjects in each combination
- Link students to combinations via `Student.combinationId`
- Use `StudentSubject` for additional subject selections

### Teacher Assignments

- Use `TeacherAssignment` to explicitly track:
  - Which teacher teaches which subject
  - In which class
  - Replaces the array-based `Teacher.assignedSubjectIds` and `Teacher.assignedClassIds` with proper relational structure

---

## Migration Steps

After updating the schema, run:

```bash
npx prisma generate
npx prisma db push
```

Or if you want to create a migration:

```bash
npx prisma migrate dev --name add_subject_combinations_and_teacher_assignments
```

---

## Notes

1. All new fields are **optional** (nullable) to maintain backward compatibility
2. Existing data will not be affected
3. The new models provide more flexibility for:
   - Subject selection (O-Level electives, A-Level combinations)
   - Teacher assignment tracking
   - Student-subject relationships
4. All models include `schoolId` for multi-tenancy support
5. Proper indexes are added for query performance
