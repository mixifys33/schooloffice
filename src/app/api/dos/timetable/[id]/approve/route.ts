import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * POST /api/dos/timetable/[id]/approve
 * Approve a timetable (DoS approval)
 * 
 * Body:
 * - notes?: string (approval notes)
 * 
 * Rules:
 * - Only DoS can approve
 * - Cannot approve locked timetables
 * - Sets dosApproved = true, dosApprovedBy, dosApprovedAt
 * - Changes status to APPROVED
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
    const { notes } = body;

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: {
        schoolId: true,
        isLocked: true,
        dosApproved: true,
        status: true,
        timetableName: true,
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

    // Prevent approving locked timetables
    if (timetable.isLocked) {
      return NextResponse.json(
        { error: 'Cannot approve locked timetable' },
        { status: 400 }
      );
    }

    // Check if already approved
    if (timetable.dosApproved) {
      return NextResponse.json(
        { error: 'Timetable is already approved' },
        { status: 400 }
      );
    }

    // Approve timetable
    const updated = await prisma.doSTimetable.update({
      where: { id: timetableId },
      data: {
        dosApproved: true,
        dosApprovedBy: staffId || session.user.id,
        dosApprovedAt: new Date(),
        status: 'APPROVED',
      },
      include: {
        class: { select: { name: true } },
        term: { select: { name: true } },
      },
    });

    return NextResponse.json({
      timetable: {
        id: updated.id,
        timetableName: updated.timetableName,
        className: updated.class.name,
        termName: updated.term.name,
        status: updated.status,
        dosApproved: updated.dosApproved,
        dosApprovedAt: updated.dosApprovedAt,
      },
      message: `Timetable "${updated.timetableName}" approved successfully`,
    });
  } catch (error) {
    console.error('[API] Error approving timetable:', error);
    return NextResponse.json(
      { error: 'Failed to approve timetable' },
      { status: 500 }
    );
  }
}
