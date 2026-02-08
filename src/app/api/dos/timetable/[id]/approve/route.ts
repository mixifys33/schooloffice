import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TimetableStatus } from '@/types/timetable';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can approve timetables'
      }, { status: 403 });
    }

    const timetableId = params.id;
    const body = await request.json();
    const { approvalNotes, overrideCriticalConflicts } = body;

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 });
    }

    // Get the timetable to verify it belongs to the user's school
    const timetable = await prisma.timetableDraft.findUnique({
      where: { id: timetableId },
      include: {
        school: true,
        conflicts: true
      }
    });

    if (!timetable || timetable.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Timetable not found or unauthorized' }, { status: 404 });
    }

    // Check for critical conflicts if not overriding
    if (!overrideCriticalConflicts) {
      const criticalConflicts = timetable.conflicts?.filter(
        conflict => conflict.severity === 'CRITICAL'
      ).length || 0;

      if (criticalConflicts > 0) {
        return NextResponse.json({
          error: 'Cannot approve timetable with critical conflicts. Resolve conflicts first or use override option.',
          criticalConflicts
        }, { status: 400 });
      }
    }

    // Update timetable status to APPROVED
    const updatedTimetable = await prisma.timetableDraft.update({
      where: { id: timetableId },
      data: {
        status: TimetableStatus.APPROVED,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || null
      },
      include: {
        slots: {
          include: {
            class: true,
            subject: true,
            teacher: true
          }
        },
        conflicts: true
      }
    });

    // Log the approval action
    await prisma.auditLog.create({
      data: {
        schoolId: timetable.schoolId,
        userId: session.user.id,
        action: 'TIMETABLE_APPROVED',
        entityType: 'TIMETABLE_DRAFT',
        entityId: timetableId,
        details: {
          action: 'APPROVED',
          approvedBy: session.user.id,
          approvalNotes: approvalNotes
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      timetable: updatedTimetable,
      message: 'Timetable approved successfully'
    });
  } catch (error) {
    console.error('Timetable approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can manage timetables'
      }, { status: 403 });
    }

    const timetableId = params.id;
    const body = await request.json();
    const { action, reason } = body;

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    // Get the timetable to verify it belongs to the user's school
    const timetable = await prisma.timetableDraft.findUnique({
      where: { id: timetableId },
      include: { school: true }
    });

    if (!timetable || timetable.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Timetable not found or unauthorized' }, { status: 404 });
    }

    let updatedTimetable;

    switch (action) {
      case 'reject':
        updatedTimetable = await prisma.timetableDraft.update({
          where: { id: timetableId },
          data: {
            status: TimetableStatus.DRAFT,
            approvedBy: null,
            approvedAt: null,
            approvalNotes: null
          }
        });
        break;

      case 'request_changes':
        updatedTimetable = await prisma.timetableDraft.update({
          where: { id: timetableId },
          data: {
            status: TimetableStatus.REVIEWED,
            reviewNotes: reason || 'Changes requested by DoS',
            reviewedBy: session.user.id,
            reviewedAt: new Date()
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      timetable: updatedTimetable,
      message: `Timetable ${action} successfully`
    });
  } catch (error) {
    console.error('Timetable action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}