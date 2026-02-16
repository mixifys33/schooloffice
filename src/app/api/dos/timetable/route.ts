import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * GET /api/dos/timetable
 * Fetch all timetables for the school
 * 
 * Returns:
 * - List of timetables with status, entry counts, conflicts
 * - Grouped by term and class
 * - Includes approval status and lock status
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const status = searchParams.get('status');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    console.log('🔍 [Timetable List] Query params:', { termId, classId, status, includeArchived });
    console.log('🔍 [Timetable List] SchoolId:', schoolId);
    console.log('🔍 [Timetable List] Fetching timetables:', { termId, classId, status, includeArchived });

    // Build where clause
    const where: any = { schoolId };
    if (termId) where.termId = termId;
    if (classId) where.classId = classId;
    if (status) where.status = status;
    
    // Filter out archived timetables by default
    if (!includeArchived) {
      where.isArchived = false;
    }

    console.log('🔍 [Timetable List] Where clause:', JSON.stringify(where, null, 2));
    console.log('🔍 [Timetable List] About to query database with where clause above...');

    // Fetch timetables with relations (optimized with select)
    const timetables = await prisma.doSTimetable.findMany({
      where,
      select: {
        id: true,
        timetableName: true,
        classId: true,
        termId: true,
        status: true,
        dosApproved: true,
        dosApprovedAt: true,
        isLocked: true,
        isTimeBased: true,
        isArchived: true,
        isSchoolWide: true, // NEW: Include school-wide flag
        weekCount: true,
        createdAt: true,
        updatedAt: true,
        class: { 
          select: { 
            id: true, 
            name: true 
          } 
        },
        term: { 
          select: { 
            id: true, 
            name: true, 
            startDate: true, 
            endDate: true 
          } 
        },
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [
        { term: { startDate: 'desc' } },
        { class: { name: 'asc' } },
      ],
    });

    // Count old period-based timetables (for migration notice)
    const oldTimetablesCount = await prisma.doSTimetable.count({
      where: {
        schoolId,
        isTimeBased: false,
        isArchived: false,
      },
    });

    console.log('📊 [Timetable List] Found:', {
      total: timetables.length,
      oldTimetables: oldTimetablesCount,
      timetableIds: timetables.map(t => t.id),
      timetableNames: timetables.map(t => t.timetableName),
    });

    // Format response
    const formattedTimetables = timetables.map((tt) => ({
      id: tt.id,
      timetableName: tt.timetableName,
      classId: tt.classId,
      className: tt.class?.name || 'All Classes',
      termId: tt.termId,
      termName: tt.term.name,
      termDates: {
        start: tt.term.startDate,
        end: tt.term.endDate,
      },
      status: tt.status,
      dosApproved: tt.dosApproved,
      dosApprovedAt: tt.dosApprovedAt,
      isLocked: tt.isLocked,
      isTimeBased: tt.isTimeBased,
      isArchived: tt.isArchived,
      isSchoolWide: tt.isSchoolWide || false, // NEW: Include school-wide flag
      weekCount: tt.weekCount,
      entryCount: tt._count.entries,
      createdAt: tt.createdAt,
      updatedAt: tt.updatedAt,
    }));

    return NextResponse.json({
      timetables: formattedTimetables,
      total: formattedTimetables.length,
      oldTimetablesCount, // For migration notice
    });
  } catch (error) {
    console.error('❌ [Timetable List] Error fetching timetables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timetables' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dos/timetable
 * Create a new timetable
 * 
 * Body:
 * - classId: string (required)
 * - termId: string (required)
 * - timetableName: string (optional, auto-generated if not provided)
 * - weekCount: number (default: 1)
 */
export async function POST(request: NextRequest) {
  try {
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
    let staffId: string | null = null;
    
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { id: true, primaryRole: true, secondaryRoles: true },
      });

      if (!staff) {
        return NextResponse.json(
          { error: 'Staff profile not found' },
          { status: 404 }
        );
      }

      staffId = staff.id;
      isDoS = staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS);
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { classId, termId, timetableName, weekCount = 1, isSchoolWide = false } = body;

    // Validate required fields
    if (!termId) {
      return NextResponse.json(
        { error: 'termId is required' },
        { status: 400 }
      );
    }

    // For non-school-wide timetables, classId is required
    if (!isSchoolWide && !classId) {
      return NextResponse.json(
        { error: 'classId is required for single-class timetables' },
        { status: 400 }
      );
    }

    // Check if timetable already exists
    if (!isSchoolWide) {
      const existing = await prisma.doSTimetable.findFirst({
        where: {
          schoolId,
          classId,
          termId,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Timetable already exists for this class and term' },
          { status: 400 }
        );
      }
    } else {
      // Check if school-wide timetable already exists for this term
      const existing = await prisma.doSTimetable.findFirst({
        where: {
          schoolId,
          termId,
          isSchoolWide: true,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'School-wide timetable already exists for this term' },
          { status: 400 }
        );
      }
    }

    // Get term info for auto-naming
    const termInfo = await prisma.term.findUnique({ 
      where: { id: termId }, 
      select: { name: true } 
    });

    if (!termInfo) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      );
    }

    // Auto-generate name based on type
    let finalName: string;
    if (timetableName) {
      finalName = timetableName;
    } else if (isSchoolWide) {
      finalName = `School Master Timetable - ${termInfo.name}`;
    } else {
      const classInfo = await prisma.class.findUnique({ 
        where: { id: classId }, 
        select: { name: true } 
      });
      if (!classInfo) {
        return NextResponse.json(
          { error: 'Class not found' },
          { status: 404 }
        );
      }
      finalName = `${classInfo.name} - ${termInfo.name}`;
    }

    console.log('🔧 [Timetable Create] Creating new timetable:', {
      name: finalName,
      classId: classId || 'N/A (school-wide)',
      termId,
      weekCount,
      isSchoolWide,
    });

    // Create timetable (mark as time-based by default)
    const timetable = await prisma.doSTimetable.create({
      data: {
        schoolId,
        classId: isSchoolWide ? null : classId, // null for school-wide
        termId,
        timetableName: finalName,
        weekCount,
        status: 'DRAFT',
        isTimeBased: true,
        isArchived: false,
        isSchoolWide, // NEW: Mark as school-wide
        createdBy: staffId || session.user.id,
      },
      include: {
        class: classId ? { select: { name: true } } : false,
        term: { select: { name: true } },
        _count: { select: { entries: true } },
      },
    });

    console.log('✅ [Timetable Create] Timetable created successfully:', timetable.id);

    return NextResponse.json({
      timetable: {
        id: timetable.id,
        timetableName: timetable.timetableName,
        classId: timetable.classId,
        className: timetable.class?.name || 'All Classes',
        termId: timetable.termId,
        termName: timetable.term.name,
        status: timetable.status,
        dosApproved: timetable.dosApproved,
        isLocked: timetable.isLocked,
        isSchoolWide: timetable.isSchoolWide,
        weekCount: timetable.weekCount,
        entryCount: timetable._count.entries,
        createdAt: timetable.createdAt,
      },
      message: `${isSchoolWide ? 'School-wide' : 'Class'} timetable created successfully`,
    });
  } catch (error) {
    console.error('[API] Error creating timetable:', error);
    return NextResponse.json(
      { error: 'Failed to create timetable' },
      { status: 500 }
    );
  }
}
