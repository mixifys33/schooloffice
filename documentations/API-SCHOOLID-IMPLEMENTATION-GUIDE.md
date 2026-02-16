# API SchoolId Implementation Guide

**Date**: 2026-02-10  
**Status**: 📋 GUIDE

---

## 🎯 Current State Analysis

### Good News ✅

Many APIs already have multi-tenancy support through:

1. **Session-based schoolId extraction**: `session.user.schoolId`
2. **Tenant Isolation Service**: `tenantIsolationService.scopeQuery()`
3. **Where clause filtering**: `where: { schoolId }`

### What's Missing ⚠️

1. **Inconsistent patterns**: Different APIs use different approaches
2. **No centralized middleware**: Each API implements its own validation
3. **Guardian/StudentGuardian**: Not using new schoolId fields from Phase 1-2
4. **No super admin support**: Can't access multiple schools
5. **Manual validation**: Repetitive code in every endpoint

---

## 🛠️ New Approach

### Use Our New Middleware

Instead of manual schoolId handling, use the new middleware:

```typescript
import {
  getSchoolIdFromSession,
  validateSchoolAccess,
  withSchoolId,
} from "@/middleware/schoolId";

import {
  findManyWithSchoolId,
  createWithSchoolId,
  updateWithSchoolId,
  deleteWithSchoolId,
} from "@/lib/api-helpers";
```

---

## 📝 Migration Patterns

### Pattern 1: Simple GET (List)

**Before**:

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  const schoolId = session.user.schoolId;

  const students = await prisma.student.findMany({
    where: { schoolId },
  });

  return NextResponse.json(students);
}
```

**After**:

```typescript
import { findManyWithSchoolId } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await findManyWithSchoolId(prisma.student, {
    where: {}, // Additional filters
    include: { class: true },
  });

  return NextResponse.json(students);
}
```

### Pattern 2: GET by ID (Single Resource)

**Before**:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const schoolId = session.user.schoolId;

  const student = await prisma.student.findUnique({
    where: { id: params.id },
  });

  if (student.schoolId !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(student);
}
```

**After**:

```typescript
import { findUniqueWithSchoolId } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const student = await findUniqueWithSchoolId(prisma.student, {
      where: { id: params.id },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
```

### Pattern 3: POST (Create)

**Before**:

```typescript
export async function POST(request: NextRequest) {
  const session = await auth();
  const schoolId = session.user.schoolId;
  const body = await request.json();

  const student = await prisma.student.create({
    data: {
      ...body,
      schoolId,
    },
  });

  return NextResponse.json(student, { status: 201 });
}
```

**After**:

```typescript
import { createWithSchoolId } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const student = await createWithSchoolId(prisma.student, body);

  return NextResponse.json(student, { status: 201 });
}
```

### Pattern 4: PATCH/PUT (Update)

**Before**:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const schoolId = session.user.schoolId;
  const body = await request.json();

  // Check ownership
  const existing = await prisma.student.findUnique({
    where: { id: params.id },
  });

  if (existing.schoolId !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const student = await prisma.student.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(student);
}
```

**After**:

```typescript
import { updateWithSchoolId } from "@/lib/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const student = await updateWithSchoolId(prisma.student, {
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(student);
  } catch (error) {
    if (error.message === "Resource not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
```

### Pattern 5: DELETE

**Before**:

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const schoolId = session.user.schoolId;

  // Check ownership
  const existing = await prisma.student.findUnique({
    where: { id: params.id },
  });

  if (existing.schoolId !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.student.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
```

**After**:

```typescript
import { deleteWithSchoolId } from "@/lib/api-helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteWithSchoolId(prisma.student, {
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message === "Resource not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error.message.includes("Access denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
```

### Pattern 6: Using Middleware Wrapper

**Simplest Approach**:

```typescript
import { withSchoolId } from "@/middleware/schoolId";
import { prisma } from "@/lib/api-helpers";

export const GET = withSchoolId(async (req, { params, schoolId }) => {
  // schoolId is automatically injected and validated

  const students = await prisma.student.findMany({
    where: { schoolId },
  });

  return NextResponse.json(students);
});
```

---

## 🎯 Priority APIs to Update

### Immediate (Today)

1. ✅ `/api/guardians/*` - Already has schoolId, verify filtering
2. ⚠️ `/api/class-teacher/assessments/ca/*` - Add schoolId filtering
3. ⚠️ `/api/class-teacher/assessments/exam/*` - Add schoolId filtering
4. ⚠️ `/api/dos/timetable/*` - Add schoolId filtering
5. ⚠️ `/api/terms/*` - Add schoolId filtering

### High Priority (This Week)

6. `/api/students/*` - Update to use new helpers
7. `/api/staff/*` - Update to use new helpers
8. `/api/teachers/*` - Update to use new helpers
9. `/api/classes/*` - Update to use new helpers
10. `/api/subjects/*` - Update to use new helpers

### Medium Priority (Next Week)

11. `/api/attendance/*`
12. `/api/fees/*`
13. `/api/finance/*`
14. `/api/reports/*`
15. `/api/communication/*`

---

## ✅ Benefits of New Approach

1. **Consistency**: All APIs use same pattern
2. **Less Code**: Middleware handles validation
3. **Super Admin Support**: Automatically handles super admin access
4. **Type Safety**: TypeScript types for all helpers
5. **Error Handling**: Consistent error messages
6. **Maintainability**: Update once, applies everywhere
7. **Testing**: Easier to test with centralized logic

---

## 🚀 Next Steps

1. **Create middleware** ✅ DONE
2. **Create helpers** ✅ DONE
3. **Update 5 critical APIs** ⏳ IN PROGRESS
4. **Test thoroughly** ⏳ PENDING
5. **Document changes** ⏳ PENDING
6. **Roll out to all APIs** ⏳ PENDING

---

## 📝 Notes

- **Backward Compatibility**: Existing `tenantIsolationService` can coexist with new middleware
- **Gradual Migration**: Update APIs one by one, no need to update all at once
- **Testing**: Test each updated API before moving to next
- **Documentation**: Update API docs as we go

---

**Status**: Ready to update critical APIs
