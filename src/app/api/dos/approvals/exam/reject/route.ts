import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/exam/reject
 * Reject individual exam entry
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
    const { examEntryId, classId, subjectId, reason } = body;

    if (!examEntryId || !classId || !subjectId) {
      return NextResponse.json(
        { error: "examEntryId, classId, and subjectId are required" },
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

    // Update the exam entry
    const examEntry = await prisma.examEntry.update({
      where: { id: examEntryId },
      data: {
        status: "REJECTED",
        approvedAt: null,
        approvedBy: null,
      },
    });

    // Update DosApproval to set examApproved to false
    if (dosApproval) {
      await prisma.dosApproval.update({
        where: { id: dosApproval.id },
        data: { examApproved: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Exam entry rejected${reason ? `: ${reason}` : ""}`,
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/exam/reject - Error:", error);
    return NextResponse.json(
      { error: "Failed to reject exam entry" },
      { status: 500 }
    );
  }
}
