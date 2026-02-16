import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/ca/reject
 * Reject all CA entries with the same name and type
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: "School context required" }, { status: 400 });
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role;
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { primaryRole: true, secondaryRoles: true },
    });

    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
    );

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: "Director of Studies access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { caEntryId, classId, subjectId, reason } = body;

    if (!caEntryId || !classId || !subjectId) {
      return NextResponse.json(
        { error: "caEntryId, classId, and subjectId are required" },
        { status: 400 }
      );
    }

    // Check if subject is locked
    const dosApproval = await prisma.dosApproval.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    if (dosApproval?.locked) {
      return NextResponse.json(
        { error: "Subject is locked. Cannot reject entries." },
        { status: 400 }
      );
    }

    // Get the sample CA entry to identify the group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id: caEntryId },
      select: { name: true, type: true, termId: true, subjectId: true },
    });

    if (!sampleEntry) {
      return NextResponse.json(
        { error: "CA entry not found" },
        { status: 404 }
      );
    }

    // Update all CA entries with the same name, type, term, and subject
    const result = await prisma.cAEntry.updateMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      data: {
        status: "REJECTED",
        approvedAt: null,
        approvedBy: null,
      },
    });

    // Update DosApproval to set caApproved to false
    if (dosApproval) {
      await prisma.dosApproval.update({
        where: { id: dosApproval.id },
        data: { caApproved: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: `CA entry rejected${reason ? `: ${reason}` : ""}`,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/ca/reject - Error:", error);
    return NextResponse.json(
      { error: "Failed to reject CA entry" },
      { status: 500 }
    );
  }
}
