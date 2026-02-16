# Subject Bulk Upload Implementation

**Date**: 2026-02-10  
**Status**: ✅ **COMPONENT CREATED** - API and Page Integration Pending

## What Was Created

### 1. Bulk Upload Component

**File**: `src/components/subjects/subject-bulk-upload.tsx`

**Features**:

- ✅ CSV file upload with drag-and-drop
- ✅ Template download (with sample data)
- ✅ CSV parsing and validation
- ✅ Preview table with validation status
- ✅ Bulk creation with progress indicator
- ✅ Success/error reporting
- ✅ Mobile-responsive design

**Validation Rules**:

- Subject name is required
- Subject code is required
- Code must be 10 characters or less
- Duplicate codes are prevented

## Next Steps

### 2. Create Bulk Upload API

**File**: `src/app/api/subjects/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { Role } from "@/types/enums";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    const userRole = session.user.role as Role;

    if (!schoolId || !canWrite(userRole, "subject")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { subjects } = await request.json();

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const subject of subjects) {
      try {
        // Check for duplicate code
        const existing = await prisma.subject.findFirst({
          where: { schoolId, code: subject.code },
        });

        if (existing) {
          errors.push(`${subject.code}: Already exists`);
          failed++;
          continue;
        }

        await prisma.subject.create({
          data: {
            schoolId,
            name: subject.name,
            code: subject.code,
          },
        });
        created++;
      } catch (error) {
        errors.push(
          `${subject.code}: ${error instanceof Error ? error.message : "Failed"}`,
        );
        failed++;
      }
    }

    return NextResponse.json({ created, failed, errors });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 3. Update Subjects Page

**File**: `src/app/(back)/dashboard/subjects/page.tsx`

Add these imports:

```typescript
import { SubjectBulkUpload } from "@/components/subjects/subject-bulk-upload";
```

Add state for bulk upload mode:

```typescript
const [showBulkUpload, setShowBulkUpload] = useState(false);
```

Add bulk upload button in header:

```typescript
<div className="flex items-center gap-2">
  <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
    <Upload className="h-4 w-4" />
    Bulk Upload
  </Button>
  <Button onClick={() => handleOpenDialog()} className="gap-2">
    <Plus className="h-4 w-4" />
    Add Subject
  </Button>
</div>
```

Add bulk upload dialog:

```typescript
{showBulkUpload && (
  <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4">
    <div className="max-w-4xl w-full">
      <SubjectBulkUpload
        onUploadComplete={(result) => {
          if (result.success > 0) {
            showToast('success', `${result.success} subjects created`)
            fetchSubjects()
          }
          setShowBulkUpload(false)
        }}
        onCancel={() => setShowBulkUpload(false)}
      />
    </div>
  </div>
)}
```

## CSV Template Format

```csv
Subject Name,Subject Code
Mathematics,MATH
English Language,ENG
Science,SCI
Social Studies,SST
```

## User Workflow

1. Click "Bulk Upload" button
2. Download template (optional)
3. Fill in CSV with subject data
4. Upload CSV file (drag-drop or select)
5. Review parsed data with validation
6. Click "Upload X Subjects"
7. View success/error summary
8. Upload more or close

## Features Delivered

- ✅ CSV template download
- ✅ Drag-and-drop file upload
- ✅ Real-time validation
- ✅ Preview before upload
- ✅ Bulk creation
- ✅ Error handling
- ✅ Success reporting
- ✅ Mobile-responsive

## Status

**Component**: ✅ Created  
**API**: ⏳ Needs to be created  
**Page Integration**: ⏳ Needs to be updated

Once the API and page integration are complete, the bulk upload feature will be fully functional.
