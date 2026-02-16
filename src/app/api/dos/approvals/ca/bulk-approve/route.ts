import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/ca/bulk-approve
 * Approve all CA entries for a class-subject-term
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
    const { classId, subjectId, termId } = body;

    if (!classId || !subjectId || !termId) {
      return NextResponse.json(
        { error: "classId, subjectId, and termId are required" },
        { status: 400 }
      );
    }

    // Check if subject is locked
    const dosApproval = await prisma.dosApproval.findUnique({
      where: { classId_subjectId: { classId, subjectId } },
    });

    if (dosApproval?.locked) {
      return NextResponse.json(
        { error: "Subject is locked. Cannot approve entries." },
        { status: 400 }
      );
    }

    // Update all SUBMITTED CA entries for this class-subject-term
    const result = await prisma.cAEntry.updateMany({
      where: {
        termId,
        subjectId,
        student: { classId },
        status: "SUBMITTED",
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    // Update DosApproval to set caApproved to true
    if (dosApproval) {
      await prisma.dosApproval.update({
        where: { id: dosApproval.id },
        data: { caApproved: true },
      });
    } else {
      // Create DosApproval if it doesn't exist
      await prisma.dosApproval.create({
        data: {
          classId,
          subjectId,
          caApproved: true,
          lockedBy: session.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "All CA entries approved successfully",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/ca/bulk-approve - Error:", error);
    return NextResponse.json(
      { error: "Failed to bulk approve CA entries" },
      { status: 500 }
    );
  }
}
