import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * POST /api/dos/timetable/archive-old
 * Archive all old period-based timetables (bulk operation)
 * 
 * Requirements: 13.5
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

    console.log('🔧 [Timetable Archive] Bulk archiving old timetables for school:', schoolId);

    // Find all old period-based timetables (isTimeBased = false)
    const oldTimetables = await prisma.doSTimetable.findMany({
      where: {
        schoolId,
        isTimeBased: false,
        isArchived: false,
      },
      select: {
        id: true,
        timetableName: true,
      },
    });

    if (oldTimetables.length === 0) {
      console.log('⚠️ [Timetable Archive] No old timetables found to archive');
      return NextResponse.json({
        message: 'No old timetables found to archive',
        archivedCount: 0,
      });
    }

    console.log(`📊 [Timetable Archive] Found ${oldTimetables.length} old timetables to archive`);

    // Archive all old timetables
    const result = await prisma.doSTimetable.updateMany({
      where: {
        schoolId,
        isTimeBased: false,
        isArchived: false,
      },
      data: {
        isArchived: true,
      },
    });

    console.log(`✅ [Timetable Archive] Archived ${result.count} old timetables`);

    return NextResponse.json({
      message: `Successfully archived ${result.count} old timetable${result.count !== 1 ? 's' : ''}`,
      archivedCount: result.count,
      timetables: oldTimetables.map(t => ({
        id: t.id,
        name: t.timetableName,
      })),
    });
  } catch (error) {
    console.error('❌ [Timetable Archive] Error bulk archiving timetables:', error);
    return NextResponse.json(
      { 
        error: 'Failed to archive old timetables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
