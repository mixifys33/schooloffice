# Teacher Class Assignment Issue - Fix Required

## Problem

When creating a new teacher through the Admin section:

1. ✅ The form DOES collect class assignment data (`classTeacherFor` field)
2. ❌ The API does NOT create `StaffResponsibility` records with the class assignment
3. ❌ Result: Teachers are created but have no `CLASS_TEACHING` responsibility
4. ❌ Impact: Performance page shows "No class assigned" error

## Current Flow

### Frontend (`/dashboard/teachers/new`)

```typescript
// Form collects:
academicRoles: {
  assignedSubjects: string[],      // ✅ Collected
  assignedClasses: string[],       // ✅ Collected
  assignedStreams: string[],       // ✅ Collected
  classTeacherFor: string[],       // ✅ Collected (class IDs)
  examinationRoles: string[],      // ✅ Collected
}
```

### API (`/api/teachers` POST)

```typescript
// Currently:
const { examinationRoles, ...teacherData } = body; // ❌ Removes examinationRoles
const teacher = await teacherManagementService.createTeacher(
  schoolId,
  teacherData,
  userId,
);
// ❌ Does NOT create StaffResponsibility records
// ❌ Does NOT create StaffSubject records
```

## Required Fix

### 1. Update Teacher Creation API

File: `src/app/api/teachers/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // ... existing code ...

  const body = await request.json();
  const {
    sendLoginInvite,
    grantSystemAccess,
    accessLevel,
    permissions,
    channelConfig,
    examinationRoles,
    // Extract academic assignments
    assignedSubjects,
    assignedClasses,
    classTeacherFor, // ✅ Extract this
    ...teacherData
  } = body;

  // Create teacher
  const teacher = await teacherManagementService.createTeacher(
    schoolId,
    teacherData,
    userId,
  );

  // ✅ NEW: Create StaffResponsibility for class teacher assignments
  if (classTeacherFor && classTeacherFor.length > 0) {
    for (const classId of classTeacherFor) {
      await prisma.staffResponsibility.create({
        data: {
          schoolId,
          staffId: teacher.id,
          type: "CLASS_TEACHING",
          details: { classId },
          assignedBy: userId,
        },
      });
    }
  }

  // ✅ NEW: Create StaffSubject for subject assignments
  if (assignedSubjects && assignedSubjects.length > 0) {
    for (const subjectAssignment of assignedSubjects) {
      // subjectAssignment format: { subjectId, classId }
      await prisma.staffSubject.create({
        data: {
          schoolId,
          staffId: teacher.id,
          subjectId: subjectAssignment.subjectId,
          classId: subjectAssignment.classId,
        },
      });
    }
  }

  // ... rest of existing code ...
}
```

### 2. Update Bulk Upload

File: `src/components/teachers/teacher-bulk-upload.tsx`

Ensure bulk upload also creates `StaffResponsibility` records when `classTeacherFor` is specified in the CSV.

## Testing

After fix:

1. Create a new teacher via Admin → Teachers → Add New
2. Fill in all steps including "Academic Roles"
3. Assign the teacher as class teacher for a specific class
4. Submit the form
5. Login as that teacher
6. Navigate to Performance page
7. ✅ Should show class data instead of "No class assigned"

## Database Schema Reference

```prisma
model StaffResponsibility {
  id         String             @id @default(auto()) @map("_id") @db.ObjectId
  schoolId   String             @db.ObjectId
  staffId    String             @db.ObjectId
  type       ResponsibilityType  // CLASS_TEACHING | SUBJECT_TEACHING
  details    Json                // { classId: string }
  assignedAt DateTime           @default(now())
  assignedBy String             @db.ObjectId
}

enum ResponsibilityType {
  CLASS_TEACHING
  SUBJECT_TEACHING
}
```

## Priority

**HIGH** - This affects all newly created teachers and prevents them from using the Performance page.

## Workaround (Temporary)

Use the script to manually assign teachers:

```bash
node check-class-teacher-assignment.js
node assign-class-teacher.js <staffId> <classId>
```
