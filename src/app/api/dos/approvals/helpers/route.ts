import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * GET /api/dos/approvals/helpers
 * Fetch classes and subjects for dropdowns
 */
export async function GET(request: NextRequest) {
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

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: { schoolId, isCurrent: true },
        isCurrent: true,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        level: true,
      },
      orderBy: { level: "asc" },
    });

    // Get all subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      currentTerm,
      classes,
      subjects,
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals/helpers - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch helper data" },
      { status: 500 }
    );
  }
}
