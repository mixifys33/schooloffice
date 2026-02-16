# Phase 3 Multi-Tenancy Fix - Models to Update

**Date**: 2026-02-10  
**Status**: ✅ COMPLETE

---

## 📋 Models to Update (25 models)

### Communication Models (7):

1. ✅ SecureLink
2. ✅ LoginAttempt
3. ✅ ShortUrlClick
4. ✅ BulkMessageItem
5. ✅ DirectMessage
6. ✅ AutomationExecution
7. ✅ AnnouncementDelivery

### Timetable Models (2):

8. ✅ TimetableSlot
9. ✅ TimetableConflict

### Teacher Models (3):

10. ✅ TeacherDocument
11. ✅ TeacherHistoryEntry
12. ✅ TeacherExaminationRoleAssignment

### Assignment Models (1):

13. ✅ AssignmentSubmission

### DoS Models (6):

14. ✅ DoSAssessmentPlan
15. ✅ DoSContinuousAssessment
16. ✅ DoSExam
17. ✅ DoSExamResult
18. ✅ DoSFinalScore
19. ✅ DoSTimetableEntry
20. ✅ DosApproval

### Assessment Models (1):

21. ✅ CAResult

### Competency Models (3):

22. ✅ CompetencyProgress
23. ✅ CompetencyMapping
24. ✅ CompetencyAuditTrail

### PDF Models (1):

25. ✅ PDFAccess

---

## 🚫 Excluded Models (Global System Models)

These models are intentionally excluded as they are global/system-level:

1. School (the parent model itself)
2. RolePermission (global permissions)
3. SystemSettings (global settings)
4. HubTemplate (global templates)
5. HubTemplateVersion (global template versions)
6. HubAlertSettings (global alert settings)
7. HubScheduledReport (global reports)
8. HubAuditLog (global audit logs)
9. SuperAdminAuditLog (super admin logs)

---

## 📝 Pattern to Follow

For each model:

```prisma
model ModelName {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId  // ← ADD THIS (after id)
  // ... rest of fields

  // Relations
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)  // ← ADD THIS
  // ... rest of relations

  // Indexes
  @@index([schoolId])  // ← ADD THIS
  // ... rest of indexes
}
```

And update School model:

```prisma
model School {
  // ... existing fields and relations

  // Phase 3 Multi-Tenancy Relations
  secureLinks                  SecureLink[]
  loginAttempts                LoginAttempt[]
  shortUrlClicks               ShortUrlClick[]
  bulkMessageItems             BulkMessageItem[]
  directMessages               DirectMessage[]
  automationExecutions         AutomationExecution[]
  announcementDeliveries       AnnouncementDelivery[]
  timetableSlots               TimetableSlot[]
  timetableConflicts           TimetableConflict[]
  teacherDocuments             TeacherDocument[]
  teacherHistoryEntries        TeacherHistoryEntry[]
  teacherExaminationRoleAssignments TeacherExaminationRoleAssignment[]
  assignmentSubmissions        AssignmentSubmission[]
  doSAssessmentPlans           DoSAssessmentPlan[]
  doSContinuousAssessments     DoSContinuousAssessment[]
  doSExams                     DoSExam[]
  doSExamResults               DoSExamResult[]
  doSFinalScores               DoSFinalScore[]
  doSTimetableEntries          DoSTimetableEntry[]
  dosApprovals                 DosApproval[]
  caResults                    CAResult[]
  competencyProgresses         CompetencyProgress[]
  competencyMappings           CompetencyMapping[]
  competencyAuditTrails        CompetencyAuditTrail[]
  pdfAccesses                  PDFAccess[]
}
```

---

## ⏱️ Execution Steps

1. ✅ Update all 25 models in schema
2. ✅ Update School model with 25 new relations
3. ✅ Run `npx prisma format`
4. ✅ Run `npx prisma validate`
5. ✅ Run `npx prisma db push`
6. ✅ Create `populate-phase3-raw.js`
7. ✅ Run `node populate-phase3-raw.js`
8. ✅ Verify data migration
9. ✅ Create `PHASE-3-COMPLETE-SUMMARY.md`

---

**Status**: ✅ COMPLETE - All Phase 3 models updated successfully!
