# DoS Approval System - Complete Analysis

**Date**: 2026-02-09  
**Status**: 🔍 **ANALYSIS COMPLETE** - Ready for Implementation

---

## 📋 Schema Analysis

### DosApproval Model (Separate Approval Tracking)

```prisma
model DosApproval {
  id           String    @id @default(auto()) @map("_id") @db.ObjectId
  classId      String    @db.ObjectId
  subjectId    String    @db.ObjectId
  caApproved   Boolean   @default(false)
  examApproved Boolean   @default(false)
  locked       Boolean   @default(false)
  lockedBy     String    @db.ObjectId
  lockedAt     DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  class   Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([classId, subjectId])
  @@index([classId])
  @@index([subjectId])
  @@index([locked])
}
```

**Key Features**:

- ✅ **Separate approval tracking** - Independent from CAEntry/ExamEntry
- ✅ **Class + Subject level** - One approval record per class-subject combination
- ✅ **Dual approval flags** - `caApproved` and `examApproved` (independent)
- ✅ **Lock mechanism** - `locked` flag prevents further changes
- ✅ **Audit trail** - `lockedBy` and `lockedAt` track who locked and when
- ✅ **Unique constraint** - One approval record per class-subject pair

---

### CAEntry Model (Individual Student Records)

```prisma
model CAEntry {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId   String   @db.ObjectId
  subjectId   String   @db.ObjectId
  teacherId   String   @db.ObjectId
  termId      String   @db.ObjectId

  name        String   // e.g., "Assignment 1 - Algebra"
  type        CAType   // ASSIGNMENT or TEST
  maxScore    Float
  rawScore    Float
  date        DateTime

  // Workflow
  status      MarksSubmissionStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?

  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([status])
}
```

**Key Features**:

- ✅ **Individual student records** - One record per student per CA entry
- ✅ **Status workflow** - DRAFT → SUBMITTED → APPROVED → REJECTED
- ✅ **Approval tracking** - `approvedAt` and `approvedBy` fields
- ✅ **Multiple CA entries** - Multiple assignments/tests per subject per term

---

### ExamEntry Model (Individual Student Records)

```prisma
model ExamEntry {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  studentId   String   @db.ObjectId
  subjectId   String   @db.ObjectId
  teacherId   String   @db.ObjectId
  termId      String   @db.ObjectId

  examScore   Float    // Out of 100
  maxScore    Float    @default(100)
  examDate    DateTime

  // Workflow
  status      MarksSubmissionStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt  DateTime?
  approvedBy  String?

  @@unique([studentId, subjectId, termId])
  @@index([studentId])
  @@index([subjectId])
  @@index([teacherId])
  @@index([termId])
  @@index([status])
}
```

**Key Features**:

- ✅ **Individual student records** - One record per student per subject per term
- ✅ **Status workflow** - DRAFT → SUBMITTED → APPROVED → REJECTED
- ✅ **Approval tracking** - `approvedAt` and `approvedBy` fields
- ✅ **Unique constraint** - One exam per student per subject per term

---

### MarksSubmissionStatus Enum

```prisma
enum MarksSubmissionStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}
```

---

## 🔄 Approval Workflow

### Two-Level Approval System

**Level 1: Individual Entry Approval** (CAEntry/ExamEntry)

- Teacher submits marks → `status: SUBMITTED`
- DoS reviews and approves → `status: APPROVED`, `approvedAt`, `approvedBy`
- DoS can reject → `status: REJECTED`

**Level 2: Subject-Level Approval** (DosApproval)

- After all CA entries approved → DoS sets `caApproved: true`
- After all exam entries approved → DoS sets `examApproved: true`
- DoS can lock subject → `locked: true`, `lockedBy`, `lockedAt`

---

## 🎯 DoS Approvals Page Requirements

### Page URL

`/dashboard/dos/curriculum/approvals`

### Core Features Needed

**1. Class & Subject Selection**

- ✅ Dropdown to select class
- ✅ Dropdown to select subject (filtered by class)
- ✅ Show current term automatically

**2. CA Approval Section**

- ✅ List all CA entries for selected class-subject
- ✅ Show entry name, type, student count, submission status
- ✅ Show individual student scores (expandable)
- ✅ Approve/Reject individual CA entries
- ✅ Bulk approve all CA entries
- ✅ Set `caApproved: true` in DosApproval after all approved

**3. Exam Approval Section**

- ✅ List all exam entries for selected class-subject
- ✅ Show student count, submission status
- ✅ Show individual student scores (expandable)
- ✅ Approve/Reject individual exam entries
- ✅ Bulk approve all exam entries
- ✅ Set `examApproved: true` in DosApproval after all approved

**4. Lock Mechanism**

- ✅ Lock button (only enabled when both CA and Exam approved)
- ✅ Lock confirmation dialog
- ✅ Set `locked: true`, `lockedBy`, `lockedAt` in DosApproval
- ✅ Prevent further changes when locked
- ✅ Unlock button (with confirmation and reason)

**5. Status Display**

- ✅ Show approval status badges (Pending, Approved, Rejected, Locked)
- ✅ Show submission counts (e.g., "25/30 students submitted")
- ✅ Show approval progress (e.g., "20/25 CA entries approved")
- ✅ Show lock status with timestamp and user

**6. Filters & Search**

- ✅ Filter by status (All, Pending, Approved, Rejected)
- ✅ Search by student name/admission number
- ✅ Filter by CA type (Assignment, Test)

**7. Audit Trail**

- ✅ Show who submitted (teacher name)
- ✅ Show when submitted (timestamp)
- ✅ Show who approved (DoS name)
- ✅ Show when approved (timestamp)
- ✅ Show who locked (DoS name)
- ✅ Show when locked (timestamp)

---

## 🔧 API Endpoints Needed

### 1. GET `/api/dos/approvals`

**Purpose**: Fetch approval data for class-subject

**Query Params**:

- `classId` (required)
- `subjectId` (required)
- `termId` (optional, defaults to current term)

**Response**:

```typescript
{
  dosApproval: {
    id: string,
    caApproved: boolean,
    examApproved: boolean,
    locked: boolean,
    lockedBy: string,
    lockedAt: string,
  },
  caEntries: [
    {
      id: string,
      name: string,
      type: 'ASSIGNMENT' | 'TEST',
      status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED',
      submittedAt: string,
      approvedAt: string,
      approvedBy: string,
      studentCount: number,
      students: [
        {
          studentId: string,
          studentName: string,
          admissionNumber: string,
          rawScore: number,
          maxScore: number,
        }
      ]
    }
  ],
  examEntries: [
    {
      studentId: string,
      studentName: string,
      admissionNumber: string,
      examScore: number,
      maxScore: number,
      status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED',
      submittedAt: string,
      approvedAt: string,
      approvedBy: string,
    }
  ],
  stats: {
    totalCAEntries: number,
    approvedCAEntries: number,
    totalExamEntries: number,
    approvedExamEntries: number,
  }
}
```

---

### 2. POST `/api/dos/approvals/ca/approve`

**Purpose**: Approve individual CA entry (all students in that entry)

**Body**:

```typescript
{
  caEntryId: string,
  classId: string,
  subjectId: string,
}
```

**Response**:

```typescript
{
  success: true,
  message: "CA entry approved successfully",
  updatedCount: number,
}
```

---

### 3. POST `/api/dos/approvals/ca/reject`

**Purpose**: Reject individual CA entry

**Body**:

```typescript
{
  caEntryId: string,
  reason: string,
}
```

---

### 4. POST `/api/dos/approvals/ca/bulk-approve`

**Purpose**: Approve all CA entries for class-subject

**Body**:

```typescript
{
  classId: string,
  subjectId: string,
  termId: string,
}
```

---

### 5. POST `/api/dos/approvals/exam/approve`

**Purpose**: Approve all exam entries for class-subject

**Body**:

```typescript
{
  classId: string,
  subjectId: string,
  termId: string,
}
```

---

### 6. POST `/api/dos/approvals/exam/reject`

**Purpose**: Reject individual exam entry

**Body**:

```typescript
{
  examEntryId: string,
  reason: string,
}
```

---

### 7. POST `/api/dos/approvals/lock`

**Purpose**: Lock subject (prevent further changes)

**Body**:

```typescript
{
  classId: string,
  subjectId: string,
}
```

**Response**:

```typescript
{
  success: true,
  message: "Subject locked successfully",
  dosApproval: {
    locked: true,
    lockedBy: string,
    lockedAt: string,
  }
}
```

---

### 8. POST `/api/dos/approvals/unlock`

**Purpose**: Unlock subject (allow changes)

**Body**:

```typescript
{
  classId: string,
  subjectId: string,
  reason: string,
}
```

---

## 🎨 UI/UX Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ DoS Approvals - CA & Exam Results                           │
├─────────────────────────────────────────────────────────────┤
│ [Class Dropdown] [Subject Dropdown] [Term: Term 1 2026]    │
├─────────────────────────────────────────────────────────────┤
│ Status: [🟢 CA Approved] [🟢 Exam Approved] [🔒 Locked]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─── CA Approvals ────────────────────────────────────────┐ │
│ │ [Bulk Approve All] [Filter: All ▼] [Search...]         │ │
│ │                                                          │ │
│ │ Assignment 1 - Algebra                                  │ │
│ │ Status: SUBMITTED | 25/30 students | Submitted: Jan 15 │ │
│ │ [Approve] [Reject] [View Students ▼]                   │ │
│ │                                                          │ │
│ │ Test 1 - Geometry                                       │ │
│ │ Status: APPROVED | 30/30 students | Approved: Jan 20   │ │
│ │ ✅ Approved by John Doe                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Exam Approvals ──────────────────────────────────────┐ │
│ │ [Bulk Approve All] [Filter: All ▼] [Search...]         │ │
│ │                                                          │ │
│ │ End of Term Exam                                        │ │
│ │ Status: SUBMITTED | 30/30 students | Submitted: Feb 1  │ │
│ │ [Approve] [Reject] [View Students ▼]                   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Lock Subject] (enabled when both CA & Exam approved)       │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

### Backend APIs

- [ ] GET `/api/dos/approvals` - Fetch approval data
- [ ] POST `/api/dos/approvals/ca/approve` - Approve CA entry
- [ ] POST `/api/dos/approvals/ca/reject` - Reject CA entry
- [ ] POST `/api/dos/approvals/ca/bulk-approve` - Bulk approve CA
- [ ] POST `/api/dos/approvals/exam/approve` - Approve exam entries
- [ ] POST `/api/dos/approvals/exam/reject` - Reject exam entry
- [ ] POST `/api/dos/approvals/lock` - Lock subject
- [ ] POST `/api/dos/approvals/unlock` - Unlock subject

### Frontend Page

- [ ] Create `/dashboard/dos/curriculum/approvals/page.tsx`
- [ ] Class & Subject selection dropdowns
- [ ] CA Approvals section with list and actions
- [ ] Exam Approvals section with list and actions
- [ ] Lock/Unlock mechanism
- [ ] Status badges and progress indicators
- [ ] Filters and search
- [ ] Audit trail display
- [ ] Confirmation dialogs
- [ ] Success/error messages
- [ ] Mobile-responsive design

### Database Operations

- [ ] Create DosApproval record if not exists
- [ ] Update CAEntry status to APPROVED
- [ ] Update ExamEntry status to APPROVED
- [ ] Set approvedAt and approvedBy fields
- [ ] Update DosApproval caApproved/examApproved flags
- [ ] Lock/unlock DosApproval record

---

## 🔐 Security & Validation

**Role Verification**:

- ✅ Only DoS users can approve/reject/lock
- ✅ Check user role: SCHOOL_ADMIN, DEPUTY, or StaffRole.DOS

**Validation Rules**:

- ✅ Cannot approve DRAFT entries (must be SUBMITTED first)
- ✅ Cannot lock if CA or Exam not fully approved
- ✅ Cannot modify locked subjects (unless unlocked)
- ✅ Unlock requires reason (audit trail)

**Audit Trail**:

- ✅ Track who approved (approvedBy field)
- ✅ Track when approved (approvedAt field)
- ✅ Track who locked (lockedBy field)
- ✅ Track when locked (lockedAt field)

---

## 📊 Status Indicators

**CA/Exam Entry Status**:

- 🟡 **DRAFT** - Not submitted yet
- 🔵 **SUBMITTED** - Awaiting approval
- 🟢 **APPROVED** - Approved by DoS
- 🔴 **REJECTED** - Rejected by DoS

**DosApproval Status**:

- 🟡 **Pending** - Not all entries approved
- 🟢 **CA Approved** - All CA entries approved
- 🟢 **Exam Approved** - All exam entries approved
- 🔒 **Locked** - Subject locked, no changes allowed

---

## 🚀 Next Steps

1. **Create Backend APIs** (8 endpoints)
2. **Create Frontend Page** (DoS Approvals UI)
3. **Test Approval Workflow** (DRAFT → SUBMITTED → APPROVED)
4. **Test Lock Mechanism** (Lock → Unlock)
5. **Test Bulk Operations** (Bulk approve CA/Exam)
6. **Test Validation** (Cannot approve DRAFT, cannot modify locked)

---

**Status**: ✅ **ANALYSIS COMPLETE** - Ready for implementation
