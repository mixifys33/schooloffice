import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, StaffRole } from "@prisma/client";

/**
 * GET /api/dos/approvals
 * Fetch approval data for a class-subject combination
 * 
 * Query Params:
 * - classId (required)
 * - subjectId (required)
 * - termId (optional, defaults to current term)
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    let termId = searchParams.get("termId");

    if (!classId || !subjectId) {
      return NextResponse.json(
        { error: "classId and subjectId are required" },
        { status: 400 }
      );
    }

    // Get current term if not provided
    if (!termId) {
      const currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isCurrent: true },
          isCurrent: true,
        },
        select: { id: true },
      });

      if (!currentTerm) {
        return NextResponse.json(
          { error: "No active term found" },
          { status: 404 }
        );
      }

      termId = currentTerm.id;
    }

    // Get or create DosApproval record
    let dosApproval = await prisma.dosApproval.findUnique({
      where: {
        classId_subjectId: { classId, subjectId },
      },
    });

    if (!dosApproval) {
      // Create DosApproval record if it doesn't exist
      dosApproval = await prisma.dosApproval.create({
        data: {
          classId,
          subjectId,
          lockedBy: session.user.id,
        },
      });
    }

    // Get all CA entries for this class-subject-term
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        subject: { id: subjectId, schoolId },
        termId,
        student: { classId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: [
        { name: "asc" },
        { type: "asc" },
        { date: "desc" },
      ],
    });

    // Group CA entries by name and type
    const caEntriesGrouped = caEntries.reduce((acc, entry) => {
      const key = `${entry.name}-${entry.type}`;
      if (!acc[key]) {
        acc[key] = {
          id: entry.id, // Use first entry ID as representative
          name: entry.name,
          type: entry.type,
          status: entry.status,
          submittedAt: entry.submittedAt,
          approvedAt: entry.approvedAt,
          approvedBy: entry.approvedBy,
          teacher: entry.teacher,
          students: [],
        };
      }
      acc[key].students.push({
        studentId: entry.student.id,
        studentName: `${entry.student.firstName} ${entry.student.lastName}`,
        admissionNumber: entry.student.admissionNumber,
        rawScore: entry.rawScore,
        maxScore: entry.maxScore,
        entryId: entry.id,
      });
      return acc;
    }, {} as Record<string, any>);

    const caEntriesList = Object.values(caEntriesGrouped).map((group: any) => ({
      ...group,
      studentCount: group.students.length,
    }));

    // Get all exam entries for this class-subject-term
    const examEntries = await prisma.examEntry.findMany({
      where: {
        subject: { id: subjectId, schoolId },
        termId,
        student: { classId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
      orderBy: [
        { student: { firstName: "asc" } },
      ],
    });

    const examEntriesList = examEntries.map((entry) => ({
      id: entry.id,
      studentId: entry.student.id,
      studentName: `${entry.student.firstName} ${entry.student.lastName}`,
      admissionNumber: entry.student.admissionNumber,
      examScore: entry.examScore,
      maxScore: entry.maxScore,
      status: entry.status,
      submittedAt: entry.submittedAt,
      approvedAt: entry.approvedAt,
      approvedBy: entry.approvedBy,
      teacher: entry.teacher,
    }));

    // Calculate stats
    const totalCAEntries = caEntriesList.length;
    const approvedCAEntries = caEntriesList.filter(
      (entry) => entry.status === "APPROVED"
    ).length;
    const totalExamEntries = examEntriesList.length;
    const approvedExamEntries = examEntriesList.filter(
      (entry) => entry.status === "APPROVED"
    ).length;

    return NextResponse.json({
      dosApproval: {
        id: dosApproval.id,
        caApproved: dosApproval.caApproved,
        examApproved: dosApproval.examApproved,
        locked: dosApproval.locked,
        lockedBy: dosApproval.lockedBy,
        lockedAt: dosApproval.lockedAt,
      },
      caEntries: caEntriesList,
      examEntries: examEntriesList,
      stats: {
        totalCAEntries,
        approvedCAEntries,
        totalExamEntries,
        approvedExamEntries,
      },
    });
  } catch (error) {
    console.error("❌ [API] /api/dos/approvals - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval data" },
      { status: 500 }
    );
  }
}
