import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * POST /api/dos/approvals/ca/approve
 * Approve all CA entries with the same name and type
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
      select: { id: true, primaryRole: true, secondaryRoles: true },
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
    const { caEntryId, classId, subjectId } = body;

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
        { error: "Subject is locked. Cannot approve entries." },
        { status: 400 }
      );
    }

    // Get the sample CA entry to identify the group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id: caEntryId },
      select: { name: true, type: true, termId: true, subjectId: true, status: true },
    });

    if (!sampleEntry) {
      return NextResponse.json(
        { error: "CA entry not found" },
        { status: 404 }
      );
    }

    // Validate status
    if (sampleEntry.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Can only approve SUBMITTED entries" },
        { status: 400 }
      );
    }

    // Update all CA entries with the same name, type, term, and subject
    const result = await prisma.cAEntry.updateMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
        status: "SUBMITTED",
      },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    // Check if all CA entries are now approved
    const allCAEntries = await prisma.cAEntry.findMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
        student: { classId },
      },
      select: { status: true },
    });

    const allApproved = allCAEntries.every((entry) => entry.status === "APPROVED");

    // Update DosApproval if all CA entries are approved
    if (allApproved && dosApproval) {
      await prisma.dosApproval.update({
        where: { id: dosApproval.id },
        data: { caApproved: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "CA entry approved successfully",
      updatedCount: result.count,
      allCAApproved: allApproved,
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/ca/approve - Error:", error);
    return NextResponse.json(
      { error: "Failed to approve CA entry" },
      { status: 500 }
    );
  }
}
