# Database Model Structures

## 1. Subject Model

```prisma
model Subject {
  id             String     @id @default(auto()) @map("_id") @db.ObjectId
  schoolId       String     @db.ObjectId
  name           String     // e.g. Mathematics
  code           String     // e.g. MTC
  educationLevel SchoolType // PRIMARY or SECONDARY
  isActive       Boolean    @default(true)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Relations
  school                    School
  classSubjects             ClassSubject[]
  staffSubjects             StaffSubject[]
  marks                     Mark[]
  timetableEntries          TimetableEntry[]
  dosCurriculumSubjects     DoSCurriculumSubject[]
  curriculumSubjects        CurriculumSubject[]
  dosApprovals              DosApproval[]
  learningEvidences         LearningEvidence[]
  teacherAssessments        TeacherAssessment[]
  subjectPeriodRequirements SubjectPeriodRequirement[]
  timetableSlots            TimetableSlot[]
  caEntries                 CAEntry[]
  examEntries               ExamEntry[]
  competencies              Competency[]
  timetablePreferences      TimetablePreference[]
  adjustmentPatterns        AdjustmentPattern[]
  reportHistory             ReportHistory[]

  @@unique([schoolId, code])
  @@index([schoolId])
  @@index([isActive])
}
```

**Key Fields:**

- `name`: Subject name (e.g., "Mathematics")
- `code`: Short code (e.g., "MTC")
- `educationLevel`: PRIMARY or SECONDARY
- `isActive`: Whether subject is currently active

---

## 2. Teacher Model

```prisma
model Teacher {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  schoolId String @db.ObjectId

  // Personal Information
  firstName   String
  lastName    String
  gender      Gender
  nationalId  String     // Unique per school
  phone       String
  email       String     // Unique per school
  dateOfBirth DateTime
  photo       String?
  address     String?

  // Employment Details
  employmentType    TeacherEmploymentType
  jobTitle          TeacherJobTitle
  department        String
  dateOfAppointment DateTime
  employmentStatus  TeacherEmploymentStatus @default(ACTIVE)

  // System Access
  userId             String?            @db.ObjectId
  hasSystemAccess    Boolean            @default(false)
  accessLevel        TeacherAccessLevel @default(NONE)
  canTakeAttendance  Boolean            @default(true)
  canEnterMarks      Boolean            @default(true)
  canViewReports     Boolean            @default(true)
  canSendMessages    Boolean            @default(false)
  forcePasswordReset Boolean            @default(true)

  // Communication Channels
  inAppMessagingEnabled Boolean @default(true)
  smsEnabled            Boolean @default(true)
  emailEnabled          Boolean @default(true)

  // Academic Assignments
  assignedSubjectIds String[] @db.ObjectId // Subject IDs
  assignedClassIds   String[] @db.ObjectId // Class IDs
  assignedStreamIds  String[] @db.ObjectId // Stream IDs
  classTeacherForIds String[] @db.ObjectId // Class IDs where designated as class teacher

  // Payroll Preparation
  salaryType          TeacherSalaryType?
  payGrade            String?
  paymentStatus       TeacherPaymentStatus?
  bankName            String?
  bankAccountNumber   String?
  bankAccountName     String?
  mobileMoneyProvider String?
  mobileMoneyPhone    String?
  mobileMoneyName     String?

  // Metadata
  createdBy String   @db.ObjectId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school             School
  documents          TeacherDocument[]
  historyEntries     TeacherHistoryEntry[]
  examinationRoles   TeacherExaminationRoleAssignment[]
  performanceMetrics TeacherPerformanceMetric[]
  assignments        Assignment[]
  permissionCodes    TeacherSmsPermissionCode[]

  @@unique([schoolId, email])
  @@unique([schoolId, nationalId])
  @@index([schoolId])
  @@index([employmentStatus])
  @@index([department])
  @@index([employmentType])
  @@index([hasSystemAccess])
}
```

**Key Fields:**

- `firstName`, `lastName`: Teacher's name
- `nationalId`: Unique identifier per school
- `email`, `phone`: Contact information
- `employmentType`: Type of employment (FULL_TIME, PART_TIME, etc.)
- `employmentStatus`: ACTIVE, SUSPENDED, TERMINATED, etc.
- `assignedSubjectIds`: Array of subject IDs teacher teaches
- `assignedClassIds`: Array of class IDs teacher teaches
- `classTeacherForIds`: Classes where teacher is the class teacher

---

## 3. Class Model

```prisma
model Class {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String   @db.ObjectId
  name      String
  level     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school                    School
  streams                   Stream[]
  students                  Student[]
  classSubjects             ClassSubject[]
  staffSubjects             StaffSubject[]
  timetableEntries          TimetableEntry[]
  feeStructures             FeeStructure[]
  attendance                Attendance[]
  staffClasses              StaffClass[]
  dosCurriculumSubjects     DoSCurriculumSubject[]
  dosTimetables             DoSTimetable[]
  dosTimetableEntries       DoSTimetableEntry[]
  promotionDecisions        DoSPromotionDecision[]
  curriculumSubjects        CurriculumSubject[]
  dosApprovals              DosApproval[]
  learningEvidences         LearningEvidence[]
  teacherAssessments        TeacherAssessment[]
  subjectPeriodRequirements SubjectPeriodRequirement[]
  timetableSlots            TimetableSlot[]
  competencies              Competency[]
  gradingSystems            GradingSystem[]
  reportHistory             ReportHistory[]
  reportCards               ReportCard[]
  reportGenerationLogs      ReportGenerationLog[]

  @@unique([schoolId, name])
  @@index([schoolId])
}
```

**Key Fields:**

- `name`: Class name (e.g., "Primary 1", "Senior 1")
- `level`: Numeric level (1, 2, 3, etc.)
- `streams`: Can have multiple streams (A, B, C, etc.)

---

## 4. CAEntry Model (Continuous Assessment)

```prisma
model CAEntry {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  schoolId String @db.ObjectId

  // Relations
  school    School
  student   Student
  studentId String  @db.ObjectId
  subject   Subject
  subjectId String  @db.ObjectId
  teacher   Staff
  teacherId String  @db.ObjectId
  term      Term
  termId    String  @db.ObjectId

  // CA Entry Details
  name     String   // e.g., "Assignment 1 - Algebra"
  type     CAType   // ASSIGNMENT, QUIZ, TEST, PROJECT, etc.
  maxScore Float
  rawScore Float
  date     DateTime

  // Curriculum Integration
  competencyId      String?
  competencyComment String?

  // Workflow
  status      MarksSubmissionStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  competencyMappings CompetencyMapping[]

  @@unique([studentId, name, type, termId, subjectId])
  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([type])
  @@index([status])
  @@index([schoolId])
}
```

**Key Fields:**

- `name`: Name of the assessment (e.g., "Assignment 1 - Algebra")
- `type`: Type of CA (ASSIGNMENT, QUIZ, TEST, PROJECT, etc.)
- `rawScore`: Score obtained by student
- `maxScore`: Maximum possible score
- `status`: DRAFT, SUBMITTED, APPROVED, REJECTED
- Multiple CA entries allowed per student per subject per term

---

## 5. ExamEntry Model

```prisma
model ExamEntry {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  schoolId String @db.ObjectId

  // Relations
  school    School
  student   Student
  studentId String  @db.ObjectId
  subject   Subject
  subjectId String  @db.ObjectId
  teacher   Staff
  teacherId String  @db.ObjectId
  term      Term
  termId    String  @db.ObjectId

  // Exam Details
  examScore Float    // Out of 100
  maxScore  Float    @default(100) // Always 100
  examDate  DateTime

  // Workflow
  status      MarksSubmissionStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([studentId, subjectId, termId])
  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([status])
  @@index([schoolId])
}
```

**Key Fields:**

- `examScore`: Score out of 100
- `maxScore`: Always 100
- `status`: DRAFT, SUBMITTED, APPROVED, REJECTED
- Only ONE exam entry per student per subject per term

---

## 6. Exam Model (Legacy)

```prisma
model Exam {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  schoolId  String    @db.ObjectId
  termId    String    @db.ObjectId
  name      String
  type      ExamType
  startDate DateTime?
  endDate   DateTime?
  isOpen    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relations
  school School
  term   Term
  marks  Mark[]

  @@index([schoolId])
  @@index([termId])
}
```

**Key Fields:**

- `name`: Exam name (e.g., "Mid-Term Exam")
- `type`: Type of exam
- `isOpen`: Whether exam is currently open for marks entry

---

## Key Relationships

### Subject ↔ Teacher

- Teachers are assigned to subjects via `Teacher.assignedSubjectIds`
- One teacher can teach multiple subjects
- One subject can be taught by multiple teachers

### Subject ↔ Class

- Subjects are linked to classes via `ClassSubject` junction table
- One class can have multiple subjects
- One subject can be taught in multiple classes

### Teacher ↔ Class

- Teachers are assigned to classes via `Teacher.assignedClassIds`
- Teachers can be class teachers via `Teacher.classTeacherForIds`
- One teacher can teach multiple classes
- One class can have multiple teachers

### CA/Exam ↔ Student/Subject/Teacher

- Each CA/Exam entry links:
  - One student
  - One subject
  - One teacher (who entered the marks)
  - One term
- Multiple CA entries per student per subject per term
- Only ONE exam entry per student per subject per term

---

## Important Notes

1. **Multi-tenancy**: All models have `schoolId` for data isolation
2. **Soft Delete**: Most models use `isActive` flag instead of hard delete
3. **Audit Trail**: Most models have `createdAt` and `updatedAt` timestamps
4. **Workflow**: CA and Exam entries have status workflow (DRAFT → SUBMITTED → APPROVED)
5. **Unique Constraints**: Prevent duplicate entries (e.g., one exam per student per subject per term)
