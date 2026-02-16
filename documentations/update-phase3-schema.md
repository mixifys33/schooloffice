# Phase 3 Schema Updates - Implementation Guide

## Models to Update (25 models)

### 1. SecureLink

**Location**: Line ~2392
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 2. LoginAttempt

**Location**: Line ~2540
**Add after `id` field**:

```prisma
schoolId String? @db.ObjectId
```

**Add in Relations section**:

```prisma
school School? @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 3. ShortUrlClick

**Location**: Line ~2605
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 4. BulkMessageItem

**Location**: Line ~2655
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 5. DirectMessage

**Location**: Line ~2895
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 6. AutomationExecution

**Location**: Line ~3174
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 7. AnnouncementDelivery

**Location**: Line ~3633
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 8. TimetableSlot

**Location**: Line ~3504
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 9. TimetableConflict

**Location**: Line ~3544
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 10. TeacherDocument

**Location**: Line ~4100
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 11. TeacherHistoryEntry

**Location**: Line ~4119
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 12. TeacherExaminationRoleAssignment

**Location**: Line ~4139
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 13. AssignmentSubmission

**Location**: Line ~4405
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 14. DoSAssessmentPlan

**Location**: Line ~4591
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 15. DoSContinuousAssessment

**Location**: Line ~4624
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 16. DoSExam

**Location**: Line ~4652
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 17. DoSExamResult

**Location**: Line ~4686
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 18. DoSFinalScore

**Location**: Line ~4713
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 19. DoSTimetableEntry

**Location**: Line ~4969
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 20. DosApproval

**Location**: Line ~5059
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 21. CAResult

**Location**: Line ~5258
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 22. CompetencyProgress

**Location**: Line ~5457
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 23. CompetencyMapping

**Location**: Line ~5489
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 24. CompetencyAuditTrail

**Location**: Line ~5513
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

### 25. PDFAccess

**Location**: Line ~5835
**Add after `id` field**:

```prisma
schoolId String @db.ObjectId
```

**Add in Relations section**:

```prisma
school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
```

**Add in Indexes section**:

```prisma
@@index([schoolId])
```

---

## School Model Relations to Add

**Location**: After Phase 2 relations in School model (~line 420)

```prisma
// Phase 3 Multi-Tenancy Relations
secureLinks                       SecureLink[]
loginAttempts                     LoginAttempt[]
shortUrlClicks                    ShortUrlClick[]
bulkMessageItems                  BulkMessageItem[]
directMessages                    DirectMessage[]
automationExecutions              AutomationExecution[]
announcementDeliveries            AnnouncementDelivery[]
timetableSlots                    TimetableSlot[]
timetableConflicts                TimetableConflict[]
teacherDocuments                  TeacherDocument[]
teacherHistoryEntries             TeacherHistoryEntry[]
teacherExaminationRoleAssignments TeacherExaminationRoleAssignment[]
assignmentSubmissions             AssignmentSubmission[]
doSAssessmentPlans                DoSAssessmentPlan[]
doSContinuousAssessments          DoSContinuousAssessment[]
doSExams                          DoSExam[]
doSExamResults                    DoSExamResult[]
doSFinalScores                    DoSFinalScore[]
doSTimetableEntries               DoSTimetableEntry[]
dosApprovals                      DosApproval[]
caResults                         CAResult[]
competencyProgresses              CompetencyProgress[]
competencyMappings                CompetencyMapping[]
competencyAuditTrails             CompetencyAuditTrail[]
pdfAccesses                       PDFAccess[]
```

---

## Execution Steps

1. Update all 25 models in schema (add schoolId field, School relation, index)
2. Update School model with 25 new relations
3. Run `npx prisma format`
4. Run `npx prisma validate`
5. Run `npx prisma db push`
6. Create and run `populate-phase3-raw.js`
7. Verify data migration
8. Create `PHASE-3-COMPLETE-SUMMARY.md`
