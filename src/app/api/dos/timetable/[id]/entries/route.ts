import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * POST /api/dos/timetable/[id]/entries
 * Add or update a timetable entry
 * 
 * Body:
 * - curriculumSubjectId: string (required)
 * - teacherId: string (required)
 * - dayOfWeek: number (1-7, required)
 * - period: number (required)
 * - room?: string
 * - isDoubleLesson?: boolean
 * - notes?: string
 * 
 * Conflict Detection:
 * 1. Teacher double-booking (same teacher, same time)
 * 2. Room double-booking (same room, same time)
 * 3. Slot already occupied (same timetable, same time)
 * 4. Subject period limit exceeded (periodsPerWeek)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timetableId } = await params;
    
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
    const {
      curriculumSubjectId,
      teacherId,
      dayOfWeek,
      period,
      classId, // NEW: For school-wide timetables
      streamId, // NEW: For school-wide timetables
      room,
      isDoubleLesson = false,
      notes,
    } = body;

    console.log('🔧 [Timetable Entry] Adding entry:', {
      timetableId,
      curriculumSubjectId,
      teacherId,
      dayOfWeek,
      period,
      classId, // NEW
      streamId, // NEW
      room,
      isDoubleLesson,
    });

    // Validate required fields
    if (!curriculumSubjectId || !teacherId || !dayOfWeek || !period) {
      console.log('❌ [Timetable Entry] Missing required fields');
      return NextResponse.json(
        { error: 'curriculumSubjectId, teacherId, dayOfWeek, and period are required' },
        { status: 400 }
      );
    }

    // Validate dayOfWeek (1-7)
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      console.log('❌ [Timetable Entry] Invalid dayOfWeek:', dayOfWeek);
      return NextResponse.json(
        { error: 'dayOfWeek must be between 1 (Monday) and 7 (Sunday)' },
        { status: 400 }
      );
    }

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: { schoolId: true, isLocked: true, classId: true, termId: true, isSchoolWide: true },
    });

    if (!timetable) {
      console.log('❌ [Timetable Entry] Timetable not found:', timetableId);
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      console.log('❌ [Timetable Entry] School context mismatch');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // For school-wide timetables, classId is required
    if (timetable.isSchoolWide && !classId) {
      console.log('❌ [Timetable Entry] classId required for school-wide timetable');
      return NextResponse.json(
        { error: 'classId is required for school-wide timetables' },
        { status: 400 }
      );
    }

    // Prevent editing locked timetables
    if (timetable.isLocked) {
      console.log('❌ [Timetable Entry] Timetable is locked');
      return NextResponse.json(
        { error: 'Cannot edit locked timetable' },
        { status: 400 }
      );
    }

    console.log('✅ [Timetable Entry] Timetable validated, checking conflicts...');

    // ========================================
    // CONFLICT DETECTION
    // ========================================

    const conflicts: string[] = [];

    // 1. Check if slot is already occupied in this timetable
    const slotConflict = await prisma.doSTimetableEntry.findFirst({
      where: {
        timetableId,
        dayOfWeek,
        period,
        // For school-wide timetables, check same class and stream
        ...(timetable.isSchoolWide && {
          classId: classId || null,
          streamId: streamId || null,
        }),
      },
      include: {
        curriculumSubject: {
          include: { subject: { select: { name: true } } },
        },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    if (slotConflict) {
      conflicts.push(
        `Slot already occupied by ${slotConflict.curriculumSubject.subject.name} ` +
        `(${slotConflict.teacher.firstName} ${slotConflict.teacher.lastName})`
      );
    }

    // 2. Check teacher double-booking (same teacher, same time, different timetable)
    const teacherConflict = await prisma.doSTimetableEntry.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        period,
        timetable: {
          schoolId,
          termId: timetable.termId,
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

    // 3. Check room double-booking (same room, same time, different timetable)
    if (room) {
      const roomConflict = await prisma.doSTimetableEntry.findFirst({
        where: {
          room,
          dayOfWeek,
          period,
          timetable: {
            schoolId,
            termId: timetable.termId,
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

    // 4. Check subject period limit (periodsPerWeek)
    const curriculumSubject = await prisma.doSCurriculumSubject.findUnique({
      where: { id: curriculumSubjectId },
      include: { subject: { select: { name: true } } },
    });

    if (!curriculumSubject) {
      return NextResponse.json(
        { error: 'Curriculum subject not found' },
        { status: 404 }
      );
    }

    const existingPeriods = await prisma.doSTimetableEntry.count({
      where: {
        timetableId,
        curriculumSubjectId,
      },
    });

    if (existingPeriods >= curriculumSubject.periodsPerWeek) {
      conflicts.push(
        `${curriculumSubject.subject.name} already has ${existingPeriods} periods ` +
        `(max: ${curriculumSubject.periodsPerWeek} per week)`
      );
    }

    // Return conflicts if any
    if (conflicts.length > 0) {
      console.log('❌ [Timetable Entry] Conflicts detected:', conflicts);
      return NextResponse.json(
        {
          error: 'Conflicts detected',
          conflicts,
        },
        { status: 409 }
      );
    }

    console.log('✅ [Timetable Entry] No conflicts detected, creating entry...');

    // ========================================
    // CREATE ENTRY
    // ========================================

    const entry = await prisma.doSTimetableEntry.create({
      data: {
        timetableId,
        schoolId: timetable.schoolId, // Add schoolId from timetable
        curriculumSubjectId,
        teacherId,
        dayOfWeek,
        period,
        classId: classId || null, // NEW: For school-wide timetables
        streamId: streamId || null, // NEW: For school-wide timetables
        room,
        isDoubleLesson,
        notes,
      },
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
            teacherCode: true,
          },
        },
        class: { // NEW: Include class info for school-wide
          select: { id: true, name: true },
        },
        stream: { // NEW: Include stream info for school-wide
          select: { id: true, name: true },
        },
      },
    });

    console.log('✅ [Timetable Entry] Entry created successfully:', {
      id: entry.id,
      subject: entry.curriculumSubject.subject.code,
      teacher: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
    });

    return NextResponse.json({
      entry: {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        classId: entry.classId, // NEW
        className: entry.class?.name, // NEW
        streamId: entry.streamId, // NEW
        streamName: entry.stream?.name, // NEW
        subjectId: entry.curriculumSubject.subjectId,
        subjectName: entry.curriculumSubject.subject.name,
        subjectCode: entry.curriculumSubject.subject.code,
        teacherId: entry.teacherId,
        teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
        teacherCode: entry.teacher.teacherCode,
        teacherEmployeeNumber: entry.teacher.employeeNumber,
        room: entry.room,
        isDoubleLesson: entry.isDoubleLesson,
        notes: entry.notes,
      },
      message: 'Entry added successfully',
    });
  } catch (error) {
    console.error('❌ [Timetable Entry] Error adding entry:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
