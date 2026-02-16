# Priority Schema Fixes - Start Here

> **Status**: Ready to Apply  
> **Approach**: Fix in 3 phases (Critical → Important → Optional)

---

## 🎯 Strategy

Instead of fixing all 78 models at once, we'll do it in **3 phases**:

1. **Phase 1**: Critical models (10 models) - Fix these FIRST
2. **Phase 2**: Important models (20 models) - Fix these SECOND
3. **Phase 3**: Remaining models (48 models) - Fix these LAST

After each phase:

- Run `npx prisma format`
- Run `npx prisma db push`
- Run `node migrate-add-schoolid.js`
- Test your app

---

## 🔴 PHASE 1: Critical Models (Fix These FIRST!)

These are the most important models that affect core functionality:

### 1. Guardian

```prisma
model Guardian {
  id                 String           @id @default(auto()) @map("_id") @db.ObjectId
  schoolId           String           @db.ObjectId  // ← ADD THIS
  firstName          String
  // ... rest of fields

  // Relations
  school             School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  studentGuardians   StudentGuardian[]
  // ... rest of relations

  @@index([phone])
  @@index([email])
  @@index([status])
  @@index([schoolId])  // ← ADD THIS
}
```

### 2. Term

```prisma
model Term {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId       String   @db.ObjectId  // ← ADD THIS
  academicYearId String   @db.ObjectId
  // ... rest of fields

  // Relations
  school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([academicYearId, name])
  @@index([academicYearId])
  @@index([schoolId])  // ← ADD THIS
}
```

### 3. Stream

```prisma
model Stream {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId  // ← ADD THIS
  classId   String   @db.ObjectId
  // ... rest of fields

  // Relations
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([classId, name])
  @@index([classId])
  @@index([schoolId])  // ← ADD THIS
}
```

### 4. Mark

```prisma
model Mark {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId  // ← ADD THIS
  examId    String   @db.ObjectId
  // ... rest of fields

  // Relations
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  exam      Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([examId, studentId, subjectId])
  @@index([examId])
  @@index([studentId])
  @@index([subjectId])
  @@index([enteredBy])
  @@index([schoolId])  // ← ADD THIS
}
```

### 5. Result

```prisma
model Result {
  id                 String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId           String   @db.ObjectId  // ← ADD THIS
  studentId          String   @db.ObjectId
  // ... rest of fields

  // Relations
  school             School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student            Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([studentId, termId])
  @@index([studentId])
  @@index([termId])
  @@index([schoolId])  // ← ADD THIS
}
```

### 6. Attendance

```prisma
model Attendance {
  id         String           @id @default(auto()) @map("_id") @db.ObjectId
  schoolId   String           @db.ObjectId  // ← ADD THIS
  studentId  String           @db.ObjectId
  // ... rest of fields

  // Relations
  school     School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student    Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([studentId, date, period])
  @@index([studentId])
  @@index([classId])
  @@index([date])
  @@index([recordedBy])
  @@index([schoolId])  // ← ADD THIS
}
```

### 7. CAEntry

```prisma
model CAEntry {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId    String   @db.ObjectId  // ← ADD THIS
  studentId   String   @db.ObjectId
  // ... rest of fields

  // Relations
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([studentId, name, type, termId, subjectId])
  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([status])
  @@index([schoolId])  // ← ADD THIS
}
```

### 8. ExamEntry

```prisma
model ExamEntry {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId    String   @db.ObjectId  // ← ADD THIS
  studentId   String   @db.ObjectId
  // ... rest of fields

  // Relations
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@unique([studentId, termId, subjectId])
  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([status])
  @@index([schoolId])  // ← ADD THIS
}
```

### 9. DisciplineCase

```prisma
model DisciplineCase {
  id                 String           @id @default(auto()) @map("_id") @db.ObjectId
  schoolId           String           @db.ObjectId  // ← ADD THIS
  studentId          String           @db.ObjectId
  // ... rest of fields

  // Relations
  school             School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student            Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@index([studentId])
  @@index([reportedBy])
  @@index([incidentDate])
  @@index([schoolId])  // ← ADD THIS
}
```

### 10. StudentDocument

```prisma
model StudentDocument {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId   String   @db.ObjectId  // ← ADD THIS
  studentId  String   @db.ObjectId
  // ... rest of fields

  // Relations
  school     School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  // ... rest of relations

  @@index([studentId])
  @@index([schoolId])  // ← ADD THIS
}
```

### Update School Model (Phase 1)

```prisma
model School {
  // ... existing fields

  // Relations - ADD THESE 10
  guardians        Guardian[]
  terms            Term[]
  streams          Stream[]
  marks            Mark[]
  results          Result[]
  attendances      Attendance[]
  caEntries        CAEntry[]
  examEntries      ExamEntry[]
  disciplineCases  DisciplineCase[]
  studentDocuments StudentDocument[]

  // ... rest of existing relations
}
```

---

## 🟡 PHASE 2: Important Models (Fix After Phase 1)

### Relation Models (8 models):

- ClassSubject
- StaffSubject
- StaffClass
- StudentGuardian
- GradeRange
- FeeItem
- InvoiceItem
- PaymentAllocation

### Guardian Models (3 models):

- GuardianDocument
- GuardianPortalAccess
- GuardianAuditLog

### Staff Models (3 models):

- StaffResponsibility
- StaffHistoryEntry
- StaffDocument

### Assessment Models (6 models):

- TeacherAlert
- LearningEvidence
- TeacherAssessment
- TeacherAssessmentResult
- AssessmentPlan
- ContinuousAssessment

**Same pattern**: Add `schoolId` field, add School relation, add index

---

## 🟢 PHASE 3: Remaining Models (Fix Last)

All other models from the error list (48 models total)

---

## 📋 Execution Checklist

### Phase 1 (Critical - 10 models):

- [ ] Update Guardian model
- [ ] Update Term model
- [ ] Update Stream model
- [ ] Update Mark model
- [ ] Update Result model
- [ ] Update Attendance model
- [ ] Update CAEntry model
- [ ] Update ExamEntry model
- [ ] Update DisciplineCase model
- [ ] Update StudentDocument model
- [ ] Update School model (add 10 relations)
- [ ] Run `npx prisma format`
- [ ] Run `npx prisma validate`
- [ ] Run `npx prisma db push`
- [ ] Run `node migrate-add-schoolid.js`
- [ ] Test app (students, CA/Exam entry, attendance)

### Phase 2 (Important - 20 models):

- [ ] Update all relation models
- [ ] Update all guardian models
- [ ] Update all staff models
- [ ] Update all assessment models
- [ ] Update School model (add 20 relations)
- [ ] Run `npx prisma format`
- [ ] Run `npx prisma db push`
- [ ] Run `node migrate-add-schoolid.js`
- [ ] Test app (guardians, staff, assessments)

### Phase 3 (Remaining - 48 models):

- [ ] Update all remaining models
- [ ] Update School model (add remaining relations)
- [ ] Run `npx prisma format`
- [ ] Run `npx prisma db push`
- [ ] Run `node migrate-add-schoolid.js`
- [ ] Test app (all features)
- [ ] Run `node check-data-integrity.js` (final check)

---

## ⏱️ Time Estimate

- **Phase 1**: 20-30 minutes (10 models)
- **Phase 2**: 30-40 minutes (20 models)
- **Phase 3**: 60-90 minutes (48 models)
- **Total**: 2-3 hours

---

## 💡 Tips

1. **Copy-paste carefully** - One typo can break everything
2. **Test after each phase** - Don't wait until the end
3. **Use VS Code** - Prisma extension helps with syntax
4. **Keep backup** - Git commit before each phase
5. **Take breaks** - This is tedious work!

---

**Start with Phase 1 now!** These 10 models are the most critical for your app to function properly.
