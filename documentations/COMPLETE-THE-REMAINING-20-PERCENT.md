# How to Complete the Remaining 20%

**Current Status**: 80% Complete  
**Remaining Work**: 8-10 hours  
**Difficulty**: Medium

---

## 🎯 Overview

The report system is 80% complete with all core backend services implemented. The remaining 20% consists of:

1. Database migration (5 minutes)
2. Additional API endpoints (2-3 hours)
3. Frontend updates (4-5 hours)
4. Testing (2-3 hours)

---

## Step 1: Database Migration (5 minutes)

### Prerequisites

- Close all terminals
- Close VS Code
- Stop the development server

### Commands

```bash
# Open fresh terminal
cd C:\Users\USER\Desktop\SchoolOffice.academy

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Verify changes
npx prisma studio
```

### Expected Output

```
✔ Generated Prisma Client
✔ The database is now in sync with your Prisma schema
```

### Verify

- Open Prisma Studio
- Check for `ReportHistory` collection
- Check for `ReportRemark` collection

---

## Step 2: Create Report History API (1 hour)

### File: `src/app/api/class-teacher/reports/history/route.ts`

```typescript
/**
 * Report History API
 * GET - Fetch report history
 * POST - Save report to history
 * DELETE - Remove report from history
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");
    const reportType = searchParams.get("reportType");

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "No staff profile found" },
        { status: 404 },
      );
    }

    // Build where clause
    const where: any = { schoolId };

    // Teachers see only their reports, admins see all
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;

    if (!isAdmin) {
      where.generatedBy = staff.id;
    }

    if (studentId) where.studentId = studentId;
    if (termId) where.termId = termId;
    if (reportType) where.reportType = reportType;

    // Fetch report history
    const reports = await prisma.reportHistory.findMany({
      where,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        class: {
          select: { name: true },
        },
        subject: {
          select: { name: true, code: true },
        },
        term: {
          select: { name: true },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: 100, // Limit to last 100 reports
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/history - GET - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch report history", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "No staff profile found" },
        { status: 404 },
      );
    }

    // Get request body
    const body = await request.json();
    const { reportData, pdfUrl, isDraft } = body;

    // Validate required fields
    if (!reportData || !reportData.student || !reportData.term) {
      return NextResponse.json(
        { error: "Invalid report data" },
        { status: 400 },
      );
    }

    // Save report to history
    const report = await prisma.reportHistory.create({
      data: {
        schoolId,
        reportType: reportData.reportType,
        classId: reportData.student.classId || reportData.class?.id,
        subjectId: reportData.subject?.id,
        termId: reportData.term.id,
        studentId: reportData.student.id,
        generatedBy: staff.id,
        pdfUrl,
        isDraft: isDraft || false,
        reportData,
      },
    });

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/history - POST - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to save report", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get report ID from query params
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    if (!reportId) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "No staff profile found" },
        { status: 404 },
      );
    }

    // Verify ownership (teachers can only delete their own reports)
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;

    const where: any = { id: reportId, schoolId };
    if (!isAdmin) {
      where.generatedBy = staff.id;
    }

    // Delete report
    await prisma.reportHistory.delete({ where });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/history - DELETE - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to delete report", details: error.message },
      { status: 500 },
    );
  }
}
```

---

## Step 3: Create Remarks API (1 hour)

### File: `src/app/api/class-teacher/reports/remarks/route.ts`

```typescript
/**
 * Report Remarks API
 * GET - Fetch remarks for student/term
 * POST - Create/update remark
 * DELETE - Remove remark
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@/types/enums";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: "Missing required parameters: studentId, termId" },
        { status: 400 },
      );
    }

    // Fetch remarks
    const remarks = await prisma.reportRemark.findMany({
      where: { schoolId, studentId, termId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ remarks });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/remarks - GET - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch remarks", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true, primaryRole: true, secondaryRoles: true },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "No staff profile found" },
        { status: 404 },
      );
    }

    // Get request body
    const body = await request.json();
    const { studentId, termId, remarkType, remarkText } = body;

    // Validate required fields
    if (!studentId || !termId || !remarkType || !remarkText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate remark type
    if (!["class_teacher", "dos", "head_teacher"].includes(remarkType)) {
      return NextResponse.json(
        { error: "Invalid remark type" },
        { status: 400 },
      );
    }

    // Verify user has permission for this remark type
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    const isDoS =
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS);

    if (remarkType === "dos" && !isDoS && !isAdmin) {
      return NextResponse.json(
        { error: "Only DoS can add DoS remarks" },
        { status: 403 },
      );
    }

    if (remarkType === "head_teacher" && !isAdmin) {
      return NextResponse.json(
        { error: "Only Head Teacher can add Head Teacher remarks" },
        { status: 403 },
      );
    }

    // Create or update remark
    const remark = await prisma.reportRemark.upsert({
      where: {
        studentId_termId_remarkType: {
          studentId,
          termId,
          remarkType,
        },
      },
      update: {
        remarkText,
        updatedAt: new Date(),
      },
      create: {
        schoolId,
        studentId,
        termId,
        remarkType,
        remarkText,
        createdBy: staff.id,
      },
    });

    return NextResponse.json({ remark });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/remarks - POST - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to save remark", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const remarkId = searchParams.get("id");

    if (!remarkId) {
      return NextResponse.json({ error: "Missing remark ID" }, { status: 400 });
    }

    // Delete remark
    await prisma.reportRemark.delete({
      where: { id: remarkId, schoolId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/remarks - DELETE - Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to delete remark", details: error.message },
      { status: 500 },
    );
  }
}
```

---

## Step 4: Update Download API (30 minutes)

### File: `src/app/api/class-teacher/reports/download/route.ts`

Update the existing file to use PDF generation:

```typescript
/**
 * Download Report API
 * POST - Download report as PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pdfGenerationService } from "@/services/pdf-generation.service";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school context found" },
        { status: 400 },
      );
    }

    // Get report data from request body
    const body = await request.json();
    const { report, isDraft } = body;

    if (!report || !report.reportType) {
      return NextResponse.json(
        { error: "Invalid report data" },
        { status: 400 },
      );
    }

    // Get school name
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    // Generate PDF
    const pdf = pdfGenerationService.generatePDF(
      report,
      school?.name || "School",
      isDraft || false,
    );

    // Convert to buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${report.student.admissionNumber}-${report.reportType}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error(
      "❌ [API] /api/class-teacher/reports/download - POST - Error:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to download report", details: error.message },
      { status: 500 },
    );
  }
}
```

---

## Step 5: Update Frontend (4-5 hours)

This is the most time-consuming part. I'll provide the complete updated page file.

### File: `src/app/(back)/dashboard/class-teacher/assessments/report/page.tsx`

Due to length, I'll create this as a separate file in the next response.

---

## Testing Checklist

### After Each Step

**After Step 1 (Database Migration)**:

- [ ] Open Prisma Studio
- [ ] Verify ReportHistory collection exists
- [ ] Verify ReportRemark collection exists

**After Step 2 (Report History API)**:

- [ ] Test GET endpoint with Postman
- [ ] Test POST endpoint with sample data
- [ ] Test DELETE endpoint

**After Step 3 (Remarks API)**:

- [ ] Test GET endpoint with Postman
- [ ] Test POST endpoint with sample data
- [ ] Test DELETE endpoint

**After Step 4 (Download API)**:

- [ ] Test PDF download
- [ ] Verify PDF formatting
- [ ] Test watermarking

**After Step 5 (Frontend)**:

- [ ] Test bulk generation UI
- [ ] Test progress tracking
- [ ] Test report history display
- [ ] Test remarks editor
- [ ] Test PDF preview

---

## Estimated Time

- Step 1: 5 minutes
- Step 2: 1 hour
- Step 3: 1 hour
- Step 4: 30 minutes
- Step 5: 4-5 hours
- Testing: 2-3 hours

**Total**: 8-10 hours

---

## Support

If you encounter any issues:

1. Check the error logs
2. Verify database connection
3. Check Prisma schema syntax
4. Review API endpoint URLs
5. Test with Postman first

---

**Ready to start? Begin with Step 1!**
