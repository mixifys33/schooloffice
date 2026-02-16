import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * DELETE /api/dos/timetable/[id]/entries/[entryId]
 * Delete a timetable entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: timetableId, entryId } = await params;
    
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

    // Fetch entry with timetable
    const entry = await prisma.doSTimetableEntry.findUnique({
      where: { id: entryId },
      include: {
        timetable: { select: { schoolId: true, isLocked: true } },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Verify timetable ID matches
    if (entry.timetableId !== timetableId) {
      return NextResponse.json(
        { error: 'Entry does not belong to this timetable' },
        { status: 400 }
      );
    }

    // Verify school context
    if (entry.timetable.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Prevent editing locked timetables
    if (entry.timetable.isLocked) {
      return NextResponse.json(
        { error: 'Cannot edit locked timetable' },
        { status: 400 }
      );
    }

    // Delete entry
    await prisma.doSTimetableEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dos/timetable/[id]/entries/[entryId]
 * Update a timetable entry
 * 
 * Body:
 * - teacherId?: string
 * - room?: string
 * - isDoubleLesson?: boolean
 * - notes?: string
 * 
 * Note: Cannot change dayOfWeek, period, or curriculumSubjectId (delete and recreate instead)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id: timetableId, entryId } = await params;
    
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
    const { teacherId, room, isDoubleLesson, notes } = body;

    // Fetch entry with timetable
    const entry = await prisma.doSTimetableEntry.findUnique({
      where: { id: entryId },
      include: {
        timetable: { select: { schoolId: true, isLocked: true, termId: true } },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Verify timetable ID matches
    if (entry.timetableId !== timetableId) {
      return NextResponse.json(
        { error: 'Entry does not belong to this timetable' },
        { status: 400 }
      );
    }

    // Verify school context
    if (entry.timetable.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Prevent editing locked timetables
    if (entry.timetable.isLocked) {
      return NextResponse.json(
        { error: 'Cannot edit locked timetable' },
        { status: 400 }
      );
    }

    // ========================================
    // CONFLICT DETECTION (if teacher or room changed)
    // ========================================

    const conflicts: string[] = [];

    // Check teacher conflict if teacher changed
    if (teacherId && teacherId !== entry.teacherId) {
      const teacherConflict = await prisma.doSTimetableEntry.findFirst({
        where: {
          teacherId,
          dayOfWeek: entry.dayOfWeek,
          period: entry.period,
          timetable: {
            schoolId,
            termId: entry.timetable.termId,
            id: { not: timetableId },
          },
        },
        include: {
          timetable: {
            include: { class: { select: { name: true } } },
          },
          curriculumSubject: {
            include: { subject: { select: { name: true } } },
          },
        },
      });

      if (teacherConflict) {
        conflicts.push(
          `Teacher is already teaching ${teacherConflict.curriculumSubject.subject.name} ` +
          `in ${teacherConflict.timetable.class.name} at this time`
        );
      }
    }

    // Check room conflict if room changed
    if (room && room !== entry.room) {
      const roomConflict = await prisma.doSTimetableEntry.findFirst({
        where: {
          room,
          dayOfWeek: entry.dayOfWeek,
          period: entry.period,
          timetable: {
            schoolId,
            termId: entry.timetable.termId,
            id: { not: timetableId },
          },
        },
        include: {
          timetable: {
            include: { class: { select: { name: true } } },
          },
          curriculumSubject: {
            include: { subject: { select: { name: true } } },
          },
        },
      });

      if (roomConflict) {
        conflicts.push(
          `Room ${room} is already occupied by ${roomConflict.curriculumSubject.subject.name} ` +
          `(${roomConflict.timetable.class.name}) at this time`
        );
      }
    }

    // Return conflicts if any
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Conflicts detected',
          conflicts,
        },
        { status: 409 }
      );
    }

    // ========================================
    // UPDATE ENTRY
    // ========================================

    const updateData: any = {};
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (room !== undefined) updateData.room = room;
    if (isDoubleLesson !== undefined) updateData.isDoubleLesson = isDoubleLesson;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.doSTimetableEntry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        curriculumSubject: {
          include: { subject: { select: { name: true, code: true } } },
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
    });

    return NextResponse.json({
      entry: {
        id: updated.id,
        dayOfWeek: updated.dayOfWeek,
        period: updated.period,
        subjectId: updated.curriculumSubject.subjectId,
        subjectName: updated.curriculumSubject.subject.name,
        subjectCode: updated.curriculumSubject.subject.code,
        teacherId: updated.teacherId,
        teacherName: `${updated.teacher.firstName} ${updated.teacher.lastName}`,
        teacherEmployeeNumber: updated.teacher.employeeNumber,
        room: updated.room,
        isDoubleLesson: updated.isDoubleLesson,
        notes: updated.notes,
      },
      message: 'Entry updated successfully',
    });
  } catch (error) {
    console.error('[API] Error updating entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}
