import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * POST /api/dos/timetable/[id]/archive
 * Archive a timetable (mark as read-only)
 * 
 * Requirements: 13.5, 13.7
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

    console.log('🔧 [Timetable Archive] Archiving timetable:', timetableId);

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: { schoolId: true, isArchived: true, timetableName: true },
    });

    if (!timetable) {
      console.log('❌ [Timetable Archive] Timetable not found');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      console.log('❌ [Timetable Archive] School context mismatch');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Check if already archived
    if (timetable.isArchived) {
      console.log('⚠️ [Timetable Archive] Timetable already archived');
      return NextResponse.json(
        { error: 'Timetable is already archived' },
        { status: 400 }
      );
    }

    // Archive timetable
    await prisma.doSTimetable.update({
      where: { id: timetableId },
      data: { isArchived: true },
    });

    console.log('✅ [Timetable Archive] Timetable archived successfully:', timetable.timetableName);

    return NextResponse.json({
      message: 'Timetable archived successfully',
      timetableId,
    });
  } catch (error) {
    console.error('❌ [Timetable Archive] Error archiving timetable:', error);
    return NextResponse.json(
      { 
        error: 'Failed to archive timetable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dos/timetable/[id]/archive
 * Unarchive a timetable (restore from archive)
 */
export async function DELETE(
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

    console.log('🔧 [Timetable Archive] Unarchiving timetable:', timetableId);

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: { schoolId: true, isArchived: true, timetableName: true },
    });

    if (!timetable) {
      console.log('❌ [Timetable Archive] Timetable not found');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      console.log('❌ [Timetable Archive] School context mismatch');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Check if not archived
    if (!timetable.isArchived) {
      console.log('⚠️ [Timetable Archive] Timetable is not archived');
      return NextResponse.json(
        { error: 'Timetable is not archived' },
        { status: 400 }
      );
    }

    // Unarchive timetable
    await prisma.doSTimetable.update({
      where: { id: timetableId },
      data: { isArchived: false },
    });

    console.log('✅ [Timetable Archive] Timetable unarchived successfully:', timetable.timetableName);

    return NextResponse.json({
      message: 'Timetable unarchived successfully',
      timetableId,
    });
  } catch (error) {
    console.error('❌ [Timetable Archive] Error unarchiving timetable:', error);
    return NextResponse.json(
      { 
        error: 'Failed to unarchive timetable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
