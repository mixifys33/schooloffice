import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/lock
 * Lock subject to prevent further changes
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
    const { classId, subjectId } = body;

    if (!classId || !subjectId) {
      return NextResponse.json(
        { error: "classId and subjectId are required" },
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

    // Validate that both CA and Exam are approved
    if (!dosApproval.caApproved || !dosApproval.examApproved) {
      return NextResponse.json(
        { error: "Cannot lock subject. Both CA and Exam must be approved first." },
        { status: 400 }
      );
    }

    // Lock the subject
    const updatedApproval = await prisma.dosApproval.update({
      where: { id: dosApproval.id },
      data: {
        locked: true,
        lockedBy: session.user.id,
        lockedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subject locked successfully",
      dosApproval: {
        locked: updatedApproval.locked,
        lockedBy: updatedApproval.lockedBy,
        lockedAt: updatedApproval.lockedAt,
      },
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/lock - Error:", error);
    return NextResponse.json(
      { error: "Failed to lock subject" },
      { status: 500 }
    );
  }
}
