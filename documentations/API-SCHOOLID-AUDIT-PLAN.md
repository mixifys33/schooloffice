# API SchoolId Filtering Audit & Implementation Plan

**Date**: 2026-02-10  
**Status**: 🔄 IN PROGRESS

---

## 🎯 Objective

Ensure all API endpoints properly filter by schoolId to maintain multi-tenancy data isolation.

---

## 📋 Strategy

### Phase 1: Critical APIs (Phase 1-3 Models) - HIGH PRIORITY

Focus on APIs for the 55 models we just updated with schoolId.

### Phase 2: Existing Multi-Tenant APIs - MEDIUM PRIORITY

Review APIs that already have schoolId filtering.

### Phase 3: Create Validation Middleware - HIGH PRIORITY

Centralized schoolId validation and injection.

### Phase 4: Testing - CRITICAL

Test multi-school scenarios.

---

## 🔴 Phase 1: Critical APIs to Update

### Phase 1 Models (10 models)

1. **Guardian APIs** (`/api/guardians/*`)
   - ✅ Already has schoolId filtering (checked)
2. **Term APIs** (`/api/terms/*`, `/api/settings/terms/*`)
   - ⚠️ Need to verify schoolId filtering
3. **Stream APIs** (`/api/streams/*`)
   - ⚠️ Need to verify schoolId filtering
4. **Mark APIs** (`/api/inspection/marks/*`)
   - ⚠️ Need to verify schoolId filtering
5. **Result APIs** (`/api/dos/results/*`, `/api/student/results/*`)
   - ⚠️ Need to verify schoolId filtering
6. **Attendance APIs** (`/api/attendance/*`, `/api/teacher/attendance/*`)
   - ⚠️ Need to verify schoolId filtering
7. **CAEntry APIs** (`/api/class-teacher/assessments/ca/*`)
   - ⚠️ Need to verify schoolId filtering
8. **ExamEntry APIs** (`/api/class-teacher/assessments/exam/*`)
   - ⚠️ Need to verify schoolId filtering
9. **DisciplineCase APIs** (if exists)
   - ⚠️ Need to find and verify
10. **StudentDocument APIs** (if exists)
    - ⚠️ Need to find and verify

### Phase 2 Models (20 models)

11. **ClassSubject APIs** (`/api/classes/*/subjects/*`)
12. **StaffSubject APIs** (`/api/staff/*/assignments/*`)
13. **StaffClass APIs** (`/api/staff/*/assignments/*`)
14. **StudentGuardian APIs** (`/api/students/*/guardians/*`)
15. **GradeRange APIs** (`/api/dos/grading-systems/*/grades/*`)
16. **FeeItem APIs** (`/api/fees/*`)
17. **InvoiceItem APIs** (`/api/finance/invoices/*`)
18. **PaymentAllocation APIs** (`/api/finance/payments/*`)
19. **GuardianDocument APIs** (`/api/guardians/*/documents/*`)
20. **GuardianPortalAccess APIs** (if exists)
21. **GuardianAuditLog APIs** (if exists)
22. **StaffResponsibility APIs** (if exists)
23. **StaffHistoryEntry APIs** (if exists)
24. **StaffDocument APIs** (`/api/staff/*/documents/*`)
25. **TeacherAlert APIs** (`/api/teacher/alerts/*`)
26. **LearningEvidence APIs** (`/api/teacher/evidence/*`)
27. **TeacherAssessment APIs** (`/api/teacher/assessments/*`)
28. **TeacherAssessmentResult APIs** (`/api/teacher/assessments/*`)
29. **AssessmentPlan APIs** (DoS assessment plans)
30. **ContinuousAssessment APIs** (DoS continuous assessments)

### Phase 3 Models (25 models)

31. **SecureLink APIs** (if exists)
32. **LoginAttempt APIs** (if exists)
33. **ShortUrlClick APIs** (if exists)
34. **BulkMessageItem APIs** (`/api/communication/bulk/*`)
35. **DirectMessage APIs** (if exists)
36. **AutomationExecution APIs** (`/api/automation/*`)
37. **AnnouncementDelivery APIs** (`/api/announcements/*`)
38. **TimetableSlot APIs** (`/api/dos/timetable/*`)
39. **TimetableConflict APIs** (`/api/dos/timetable/*`)
40. **TeacherDocument APIs** (`/api/teachers/*/documents/*`)
41. **TeacherHistoryEntry APIs** (`/api/teachers/*/history/*`)
42. **TeacherExaminationRoleAssignment APIs** (if exists)
43. **AssignmentSubmission APIs** (`/api/teacher/assignments/*`)
44. **DoSAssessmentPlan APIs** (`/api/dos/assessments/*`)
45. **DoSContinuousAssessment APIs** (`/api/dos/assessments/*`)
46. **DoSExam APIs** (`/api/dos/exams/*`)
47. **DoSExamResult APIs** (`/api/dos/exams/*`)
48. **DoSFinalScore APIs** (`/api/dos/results/*`)
49. **DoSTimetableEntry APIs** (`/api/dos/timetable/*`)
50. **DosApproval APIs** (`/api/dos/approvals/*`)
51. **CAResult APIs** (if exists)
52. **CompetencyProgress APIs** (`/api/teacher/competencies/*`)
53. **CompetencyMapping APIs** (`/api/teacher/competencies/*`)
54. **CompetencyAuditTrail APIs** (`/api/teacher/competencies/*`)
55. **PDFAccess APIs** (if exists)

---

## 🛡️ Phase 3: Validation Middleware

### Create Middleware Files

1. **`src/middleware/schoolId.ts`** - SchoolId validation and injection
2. **`src/middleware/multiTenancy.ts`** - Multi-tenancy enforcement
3. **`src/lib/api-helpers.ts`** - Helper functions for schoolId filtering

### Middleware Features

```typescript
// Auto-inject schoolId from session
export async function withSchoolId(handler) {
  return async (req, context) => {
    const session = await getServerSession(authOptions);
    const schoolId = session?.user?.schoolId;

    if (!schoolId) {
      return NextResponse.json(
        { error: "School context required" },
        { status: 403 },
      );
    }

    // Inject schoolId into request
    req.schoolId = schoolId;

    return handler(req, context);
  };
}

// Validate schoolId in query params
export function validateSchoolIdAccess(resourceSchoolId, sessionSchoolId) {
  if (resourceSchoolId !== sessionSchoolId) {
    throw new Error("Access denied: Resource belongs to different school");
  }
}
```

---

## 🧪 Phase 4: Testing Strategy

### Test Scenarios

1. **Single School Access** ✅
   - User can only access their school's data
2. **Cross-School Access Prevention** ⚠️
   - User cannot access another school's data
3. **Super Admin Access** ⚠️
   - Super admin can access any school's data
4. **API Response Filtering** ⚠️
   - All list endpoints filter by schoolId
5. **Create/Update Operations** ⚠️
   - New records automatically get schoolId
6. **Delete Operations** ⚠️
   - Can only delete records from own school

### Test Script

```javascript
// test-multi-tenancy.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testMultiTenancy() {
  // 1. Verify all Phase 1-3 models have schoolId
  // 2. Test API endpoints with different schoolIds
  // 3. Verify cross-school access is blocked
  // 4. Test super admin access
}
```

---

## 📊 Progress Tracking

### Phase 1: Critical APIs

- [ ] Guardian APIs
- [ ] Term APIs
- [ ] Stream APIs
- [ ] Mark APIs
- [ ] Result APIs
- [ ] Attendance APIs
- [ ] CAEntry APIs
- [ ] ExamEntry APIs
- [ ] DisciplineCase APIs
- [ ] StudentDocument APIs

### Phase 2: Important APIs

- [ ] ClassSubject APIs
- [ ] StaffSubject APIs
- [ ] (18 more...)

### Phase 3: Remaining APIs

- [ ] SecureLink APIs
- [ ] LoginAttempt APIs
- [ ] (23 more...)

### Middleware

- [ ] Create schoolId middleware
- [ ] Create multiTenancy middleware
- [ ] Create API helper functions
- [ ] Update all critical endpoints

### Testing

- [ ] Write test script
- [ ] Test single school access
- [ ] Test cross-school prevention
- [ ] Test super admin access
- [ ] Test all CRUD operations

---

## 🚀 Execution Plan

### Step 1: Sample Critical APIs (Today)

Pick 5 most critical APIs and update them as examples:

1. `/api/students/*` - Student management
2. `/api/class-teacher/assessments/ca/*` - CA entry
3. `/api/class-teacher/assessments/exam/*` - Exam entry
4. `/api/guardians/*` - Guardian management
5. `/api/dos/timetable/*` - DoS timetable

### Step 2: Create Middleware (Today)

Build reusable middleware for all APIs.

### Step 3: Systematic Update (Tomorrow)

Update remaining APIs using middleware.

### Step 4: Testing (Tomorrow)

Comprehensive multi-tenancy testing.

---

## 📝 Notes

- **Priority**: Focus on APIs that handle Phase 1-3 models first
- **Approach**: Create middleware first, then apply systematically
- **Testing**: Test after each batch of updates
- **Documentation**: Update API docs with schoolId requirements

---

**Status**: Ready to start with Step 1 - Sample Critical APIs
