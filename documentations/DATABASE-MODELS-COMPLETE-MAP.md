# Complete Database Models Map - Prisma Schema

> **Generated**: 2026-02-10  
> **Total Models**: 100+ models across 15 major domains

---

## 📊 Model Categories Overview

### 1. **Core System** (7 models)

- School
- User
- RolePermission
- SystemLock
- PasswordReset
- AuditLog
- AuthAuditLog

### 2. **Academic Structure** (8 models)

- AcademicYear
- Term
- Class
- Stream
- Subject
- ClassSubject
- GradingSystem
- GradeRange

### 3. **People** (8 models)

- Student
- Guardian
- StudentGuardian
- Staff
- StaffSubject
- StaffClass
- Teacher (legacy)
- StaffResponsibility

### 4. **Staff Dashboard** (7 models)

- TeacherAlert
- LearningEvidence
- TeacherAssessment
- TeacherAssessmentResult
- StaffHistoryEntry
- StaffDocument
- StaffTask

### 5. **Attendance & Timetable** (2 models)

- Attendance
- TimetableEntry

### 6. **Examinations & Marks** (4 models)

- Exam
- Mark
- Result
- PublishedReportCard

### 7. **Finance System** (20 models)

- FeeStructure
- FeeItem
- StudentAccount
- DiscountRule
- StudentDiscount
- PenaltyRule
- StudentPenalty
- Invoice
- InvoiceItem
- Payment
- PaymentAllocation
- Receipt
- FinanceAuditLog
- FinanceNotificationLog
- FinanceSettings
- StudentMilestoneStatus
- SmsLog

### 8. **Messaging System** (8 models)

- Message
- MessageTemplate
- SecureLink
- OTPVerification
- CustomSMSTemplate
- SMSAutomationRule
- SMSCreditProtection
- SMSAuditLog

### 9. **Guardian Management** (3 models)

- GuardianDocument
- GuardianPortalAccess
- GuardianAuditLog

### 10. **Discipline** (1 model)

- DisciplineCase

### 11. **Documents** (1 model)

- StudentDocument

### 12. **DoS (Director of Studies) Module** (15 models)

- DoSCurriculumSubject
- DoSAssessmentPlan
- DoSContinuousAssessment
- DoSExam
- DoSExamResult
- DoSFinalScore
- DoSTimetable
- DoSTimetableEntry
- DoSPromotionDecision
- DoSReportCard
- DosApproval
- CurriculumSubject
- AssessmentPlan
- CAResult

### 13. **Class Teacher Marks Management** (2 models)

- CAEntry
- ExamEntry

### 14. **New Curriculum Report Cards** (2 models)

- ReportCardTemplate
- NewCurriculumReportCard

### 15. **Competency System** (3 models)

- Competency
- CompetencyProgress
- CompetencyAuditTrail

### 16. **Timetable Generation System** (12 models)

- SchoolTimeStructure
- SubjectPeriodRequirement
- TeacherConstraint
- RoomConstraint
- TimetableDraft
- TimetableSlot
- TimetableVersion
- TimetableConflictLog
- TimetableGenerationSettings
- Room
- TimetablePreference
- AdjustmentPattern

### 17. **Super Admin Hub** (4 models)

- HubAlert
- SchoolAlert
- Announcement
- SupportRequest

### 18. **Teacher SMS Permissions** (1 model)

- TeacherSmsPermissionCode

---

## 🔗 Key Relationships Map

### **School** (Central Hub)

```
School
├── Users (1:N)
├── Students (1:N)
├── Staff (1:N)
├── Teachers (1:N)
├── AcademicYears (1:N)
│   └── Terms (1:N)
├── Classes (1:N)
│   ├── Streams (1:N)
│   └── ClassSubjects (1:N)
├── Subjects (1:N)
├── GradingSystems (1:N)
│   └── GradeRanges (1:N)
├── Exams (1:N)
├── FeeStructures (1:N)
├── Messages (1:N)
├── MessageTemplates (1:N)
├── DoSCurriculumSubjects (1:N)
├── DoSTimetables (1:N)
├── ReportCardTemplates (1:N)
├── Competencies (1:N)
└── TimetableGenerationSettings (1:1)
```

### **Student** (Academic & Financial)

```
Student
├── Class (N:1)
├── Stream (N:1)
├── StudentGuardians (1:N)
│   └── Guardian (N:1)
├── Attendance (1:N)
├── Marks (1:N)
├── Results (1:N)
├── Payments (1:N)
├── StudentAccount (1:N per term)
├── CAEntries (1:N)
├── ExamEntries (1:N)
├── DoSReportCards (1:N)
├── NewCurriculumReportCards (1:N)
├── CompetencyProgress (1:N)
└── Messages (1:N)
```

### **Staff** (Teaching & Administration)

```
Staff
├── User (1:1)
├── StaffSubjects (1:N)
│   ├── Subject (N:1)
│   └── Class (N:1)
├── StaffClasses (1:N)
├── Marks (1:N entered)
├── TimetableEntries (1:N)
├── TeacherAlerts (1:N)
├── LearningEvidences (1:N)
├── TeacherAssessments (1:N)
├── CAEntries (1:N)
├── ExamEntries (1:N)
├── DoSTimetableEntries (1:N)
└── StaffTasks (1:N)
```

### **Term** (Academic Period)

```
Term
├── AcademicYear (N:1)
├── Exams (1:N)
├── Results (1:N)
├── Payments (1:N)
├── FeeStructures (1:N)
├── StudentAccounts (1:N)
├── DoSAssessmentPlans (1:N)
├── DoSTimetables (1:N)
├── CAEntries (1:N)
├── ExamEntries (1:N)
├── GradingSystems (1:N)
└── NewCurriculumReportCards (1:N)
```

### **Guardian** (Communication & Finance)

```
Guardian
├── StudentGuardians (1:N)
│   └── Student (N:1)
├── Messages (1:N)
├── SecureLinks (1:N)
├── OTPVerifications (1:N)
├── GuardianDocuments (1:N)
├── GuardianPortalAccess (1:1)
├── GuardianAuditLog (1:N)
└── SmsLogs (1:N)
```

### **GradingSystem** (Assessment Grading)

```
GradingSystem
├── School (N:1)
├── Class (N:1) [optional - class-specific]
├── Term (N:1) [optional - term-specific]
├── GradeRanges (1:N)
└── Category: FINAL | EXAM_ONLY | CA_ONLY
```

### **DoSTimetable** (Timetable Management)

```
DoSTimetable
├── School (N:1)
├── Class (N:1)
├── Term (N:1)
├── DoSTimetableEntries (1:N)
│   ├── DoSCurriculumSubject (N:1)
│   └── Staff (N:1)
└── Status: DRAFT | APPROVED | LOCKED
```

### **CAEntry & ExamEntry** (Class Teacher Marks)

```
CAEntry
├── Student (N:1)
├── Subject (N:1)
├── Teacher (N:1)
├── Term (N:1)
└── Status: DRAFT | SUBMITTED | APPROVED

ExamEntry
├── Student (N:1)
├── Subject (N:1)
├── Teacher (N:1)
├── Term (N:1)
└── Status: DRAFT | SUBMITTED | APPROVED
```

### **Competency** (New Curriculum)

```
Competency
├── School (N:1)
├── Class (N:1)
├── Subject (N:1)
├── CompetencyProgress (1:N)
│   └── Student (N:1)
└── CompetencyAuditTrail (1:N)
```

### **Finance Flow**

```
FeeStructure (per class/term)
├── FeeItems (1:N)
└── Invoices (1:N)
    ├── InvoiceItems (1:N)
    └── PaymentAllocations (1:N)
        └── Payment (N:1)
            └── Receipt (N:1)

StudentAccount (per student/term)
├── StudentDiscounts (1:N)
│   └── DiscountRule (N:1)
├── StudentPenalties (1:N)
│   └── PenaltyRule (N:1)
└── StudentMilestoneStatus (1:N)
```

---

## 📋 Enums Reference

### **Core Enums**

- **Role**: SUPER_ADMIN, SCHOOL_ADMIN, DEPUTY, TEACHER, ACCOUNTANT, STUDENT, PARENT, DOS
- **StaffRole**: CLASS_TEACHER, DOS, HOSTEL_STAFF, SUPPORT_STAFF, BURSAR
- **Gender**: MALE, FEMALE
- **StudentStatus**: ACTIVE, TRANSFERRED, GRADUATED, SUSPENDED
- **StaffStatus**: ACTIVE, INACTIVE
- **SchoolType**: PRIMARY, SECONDARY, BOTH

### **Academic Enums**

- **ExamType**: BOT, MID, EOT, CA
- **AssessmentType**: TEST, ASSIGNMENT, PROJECT, PRACTICAL, QUIZ
- **GradingCategory**: FINAL, EXAM_ONLY, CA_ONLY
- **PromotionStatus**: PROMOTED, REPEAT, RETAKE, PENDING
- **ReportCardStatus**: DRAFT, APPROVED, PUBLISHED, LOCKED

### **Finance Enums**

- **FeeCategory**: TUITION, BOARDING, TRANSPORT, MEALS, UNIFORM, BOOKS, EXAMINATION, ACTIVITY, OTHER
- **StudentType**: DAY, BOARDING
- **PaymentMethod**: CASH, MOBILE_MONEY, BANK
- **InvoiceStatus**: DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED
- **DiscountType**: PERCENTAGE, FIXED_AMOUNT
- **DiscountStatus**: PENDING, APPROVED, REJECTED
- **StudentAccountStatus**: OK, WARNING, CRITICAL

### **Communication Enums**

- **MessageChannel**: SMS, EMAIL
- **MessageStatus**: QUEUED, SENT, DELIVERED, FAILED, READ
- **MessageType**: AUTOMATED, MANUAL
- **RelationshipType**: FATHER, MOTHER, GUARDIAN, UNCLE, AUNT, GRANDPARENT, SPONSOR, OTHER
- **GuardianStatus**: ACTIVE, INACTIVE, BLOCKED, RESTRICTED

### **Staff Dashboard Enums**

- **TeacherAlertType**: CA_PENDING_SUBMISSION, EVIDENCE_NOT_UPLOADED, ASSESSMENT_DEADLINE_APPROACHING, MISSING_MARKS, TIMETABLE_CHANGE
- **EvidenceType**: ASSIGNMENT, PROJECT, PRACTICAL_WORK, OBSERVATIONAL_NOTE, PORTFOLIO, OTHER
- **ResponsibilityType**: CLASS_TEACHING, SUBJECT_TEACHING, CLASS_TEACHER_DUTY, DUTY_TEACHER, BOARDING_MASTER, DEPARTMENT_HEAD
- **TaskType**: SUBMIT_MARKS, SUBMIT_REPORT, COMPLETE_ATTENDANCE, REVIEW_MARKS, GENERATE_REPORTS
- **TaskStatus**: PENDING, COMPLETED, OVERDUE

---

## 🎯 Critical Relationships

### **Data Atomicity Principle**

Each data type has ONE authoritative source:

1. **Student Financial Data**: `StudentAccount` (per term)
2. **CA Marks**: `CAEntry` (per student, per subject, per term)
3. **Exam Marks**: `ExamEntry` (per student, per subject, per term)
4. **Grading**: `GradingSystem` → `GradeRange`
5. **Timetable**: `DoSTimetable` → `DoSTimetableEntry`
6. **Competencies**: `Competency` → `CompetencyProgress`

### **Cascade Deletion Rules**

- School deletion → Cascades to ALL school data
- Term deletion → Blocked if has CAEntry, ExamEntry, or Payments
- Class deletion → Cascades to ClassSubjects, StaffSubjects
- Student deletion → Cascades to Marks, Attendance, Payments
- Staff deletion → Cascades to StaffSubjects, TimetableEntries

### **Unique Constraints**

- `School.code` - Immutable tenant identifier
- `Student.[schoolId, admissionNumber]` - Unique per school
- `Staff.[schoolId, employeeNumber]` - Unique per school
- `StudentAccount.[studentId, termId]` - One account per student per term
- `CAEntry.[studentId, name, type, termId, subjectId]` - One CA entry per student per assessment
- `ExamEntry.[studentId, termId, subjectId]` - One exam entry per student per subject per term

---

## 📊 Model Count by Domain

| Domain                 | Model Count | Key Models                                        |
| ---------------------- | ----------- | ------------------------------------------------- |
| **Finance**            | 20          | StudentAccount, Payment, Invoice, Receipt         |
| **DoS Module**         | 15          | DoSTimetable, CAEntry, ExamEntry, DoSReportCard   |
| **Timetable System**   | 12          | TimetableDraft, TimetableSlot, Room               |
| **Academic Structure** | 8           | Class, Subject, Term, GradingSystem               |
| **Staff Dashboard**    | 7           | TeacherAlert, LearningEvidence, TeacherAssessment |
| **Messaging**          | 8           | Message, MessageTemplate, SMSAutomationRule       |
| **Core System**        | 7           | School, User, RolePermission                      |
| **People**             | 8           | Student, Guardian, Staff                          |
| **Examinations**       | 4           | Exam, Mark, Result                                |
| **Competency**         | 3           | Competency, CompetencyProgress                    |
| **Others**             | 8+          | Attendance, DisciplineCase, Documents             |

**Total**: 100+ models

---

## 🔍 Quick Lookup

### Find Models by Feature

**Grading System**:

- `GradingSystem` - Main grading configuration
- `GradeRange` - Individual grade definitions (A, B+, B, etc.)

**CA & Exam Marks**:

- `CAEntry` - Continuous Assessment entries
- `ExamEntry` - Exam entries
- `CAResult` - CA results (DoS module)
- `DoSExamResult` - Exam results (DoS module)

**Timetable**:

- `DoSTimetable` - DoS timetable management
- `DoSTimetableEntry` - Individual timetable slots
- `TimetableDraft` - Auto-generated timetable drafts
- `TimetableSlot` - Generated timetable slots

**Report Cards**:

- `Result` - Legacy report cards
- `DoSReportCard` - DoS report cards
- `NewCurriculumReportCard` - New curriculum report cards
- `ReportCardTemplate` - Report card templates

**Finance**:

- `StudentAccount` - Student financial account (per term)
- `Payment` - Payment records
- `Invoice` - Fee invoices
- `Receipt` - Payment receipts
- `FeeStructure` - Fee configuration

**Competencies**:

- `Competency` - Competency definitions
- `CompetencyProgress` - Student competency progress
- `CompetencyAuditTrail` - Competency change history

---

**Version**: v1.0  
**Last Updated**: 2026-02-10  
**Schema Lines**: 4975
