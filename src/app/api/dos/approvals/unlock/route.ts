import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/unlock
 * Unlock subject to allow changes
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
    const { classId, subjectId, reason } = body;

    if (!classId || !subjectId || !reason) {
      return NextResponse.json(
        { error: "classId, subjectId, and reason are required" },
        { status: 400 }
      );
    }

    // Get DosApproval record
    const dosApproval = await prisma.dosApproval.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    if (!dosApproval) {
      return NextResponse.json(
        { error: "Approval record not found" },
        { status: 404 }
      );
    }

    if (!dosApproval.locked) {
      return NextResponse.json(
        { error: "Subject is not locked" },
        { status: 400 }
      );
    }

    // Unlock the subject
    const updatedApproval = await prisma.dosApproval.update({
      where: { id: dosApproval.id },
      data: {
        locked: false,
        lockedBy: session.user.id,
        lockedAt: null,
      },
    });

    // TODO: Log unlock reason in audit trail

    return NextResponse.json({
      success: true,
      message: `Subject unlocked: ${reason}`,
      dosApproval: {
        locked: updatedApproval.locked,
        lockedBy: updatedApproval.lockedBy,
        lockedAt: updatedApproval.lockedAt,
      },
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/unlock - Error:", error);
    return NextResponse.json(
      { error: "Failed to unlock subject" },
      { status: 500 }
    );
  }
}
