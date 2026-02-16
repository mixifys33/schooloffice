import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * GET /api/dos/timetable/[id]
 * Fetch a single timetable with all entries
 * 
 * Returns:
 * - Timetable details
 * - All entries with teacher, subject, room info
 * - Conflict analysis
 * - Teacher workload summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    
    let isDoS = false;
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true },
      });

      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Fetch timetable with all relations
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, startDate: true, endDate: true } },
        entries: {
          include: {
            curriculumSubject: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
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
            { dayOfWeek: 'asc' },
            { period: 'asc' },
          ],
        },
      },
    });

    if (!timetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Format entries
    const formattedEntries = timetable.entries.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      subjectId: entry.curriculumSubject.subjectId,
      subjectName: entry.curriculumSubject.subject.name,
      subjectCode: entry.curriculumSubject.subject.code,
      teacherId: entry.teacherId,
      teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
      teacherEmployeeNumber: entry.teacher.employeeNumber,
      room: entry.room,
      isDoubleLesson: entry.isDoubleLesson,
      notes: entry.notes,
    }));

    // Calculate teacher workload
    const teacherWorkload = new Map<string, number>();
    timetable.entries.forEach((entry) => {
      const count = teacherWorkload.get(entry.teacherId) || 0;
      teacherWorkload.set(entry.teacherId, count + 1);
    });

    const workloadSummary = Array.from(teacherWorkload.entries()).map(([teacherId, periods]) => {
      const teacher = timetable.entries.find((e) => e.teacherId === teacherId)?.teacher;
      return {
        teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        periods,
      };
    });

    return NextResponse.json({
      timetable: {
        id: timetable.id,
        timetableName: timetable.timetableName,
        classId: timetable.classId,
        className: timetable.class?.name || 'All Classes', // Handle null for school-wide
        termId: timetable.termId,
        termName: timetable.term.name,
        termDates: {
          start: timetable.term.startDate,
          end: timetable.term.endDate,
        },
        status: timetable.status,
        dosApproved: timetable.dosApproved,
        dosApprovedAt: timetable.dosApprovedAt,
        isLocked: timetable.isLocked,
        isSchoolWide: timetable.isSchoolWide || false, // Include school-wide flag
        weekCount: timetable.weekCount,
        createdAt: timetable.createdAt,
        updatedAt: timetable.updatedAt,
      },
      entries: formattedEntries,
      workloadSummary,
      canEdit: !timetable.isLocked,
    });
  } catch (error) {
    console.error('[API] Error fetching timetable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dos/timetable/[id]
 * Delete a timetable and all its entries
 * 
 * Rules:
 * - Cannot delete locked timetables
 * - Cascades to all entries
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    
    let isDoS = false;
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true },
      });

      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id },
      select: { schoolId: true, isLocked: true, timetableName: true },
    });

    if (!timetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of locked timetables
    if (timetable.isLocked) {
      return NextResponse.json(
        { error: 'Cannot delete locked timetable. Unlock it first.' },
        { status: 400 }
      );
    }

    // Delete timetable (entries cascade automatically)
    await prisma.doSTimetable.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `Timetable "${timetable.timetableName}" deleted successfully`,
    });
  } catch (error) {
    console.error('[API] Error deleting timetable:', error);
    return NextResponse.json(
      { error: 'Failed to delete timetable' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dos/timetable/[id]
 * Update timetable metadata (name, status, lock)
 * 
 * Body:
 * - timetableName?: string
 * - isLocked?: boolean
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    
    let isDoS = false;
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true },
      });

      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { timetableName, isLocked } = body;

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id },
      select: { schoolId: true },
    });

    if (!timetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (timetableName !== undefined) updateData.timetableName = timetableName;
    if (isLocked !== undefined) updateData.isLocked = isLocked;

    // Update timetable
    const updated = await prisma.doSTimetable.update({
      where: { id },
      data: updateData,
      include: {
        class: { select: { name: true } },
        term: { select: { name: true } },
      },
    });

    return NextResponse.json({
      timetable: {
        id: updated.id,
        timetableName: updated.timetableName,
        className: updated.class?.name || 'All Classes', // Handle null for school-wide
        termName: updated.term.name,
        status: updated.status,
        dosApproved: updated.dosApproved,
        isLocked: updated.isLocked,
        isSchoolWide: updated.isSchoolWide || false, // Include school-wide flag
      },
      message: 'Timetable updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to update timetable' },
      { status: 500 }
    );
  }
}
