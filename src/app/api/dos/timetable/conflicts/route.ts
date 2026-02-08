import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TimetableConflict, ConflictSeverity } from '@/types/timetable';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId') || session.user.schoolId;
    const termId = searchParams.get('termId');
    const timetableId = searchParams.get('timetableId');
    const severity = searchParams.get('severity'); // Filter by severity

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Build query based on parameters
    const whereClause: any = { schoolId };
    
    if (termId) {
      whereClause.timetable = { termId };
    }
    
    if (timetableId) {
      whereClause.timetableId = timetableId;
    }
    
    if (severity) {
      whereClause.severity = severity;
    }

    // Get conflicts
    const conflicts = await prisma.timetableConflict.findMany({
      where: whereClause,
      include: {
        timetable: {
          include: {
            class: true,
            term: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Get conflicts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can resolve timetable conflicts'
      }, { status: 403 });
    }

    const body = await request.json();
    const { action, reason, resolvedBy } = body;
    const conflictId = request.url.split('/').pop(); // Extract from URL

    if (!conflictId) {
      return NextResponse.json({ error: 'Conflict ID required' }, { status: 400 });
    }

    // Get the conflict to verify it belongs to the user's school
    const conflict = await prisma.timetableConflict.findUnique({
      where: { id: conflictId },
      include: {
        timetable: true
      }
    });

    if (!conflict || conflict.timetable.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Conflict not found or unauthorized' }, { status: 404 });
    }

    let updatedConflict;

    switch (action) {
      case 'resolve':
        updatedConflict = await prisma.timetableConflict.update({
          where: { id: conflictId },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: resolvedBy || session.user.id
          }
        });
        break;

      case 'dismiss':
        updatedConflict = await prisma.timetableConflict.update({
          where: { id: conflictId },
          data: {
            dismissedAt: new Date(),
            dismissedBy: resolvedBy || session.user.id,
            isResolved: true // Mark as resolved when dismissed
          }
        });
        break;

      case 'postpone':
        // For postponing, we just add a note but keep it as unresolved
        updatedConflict = await prisma.timetableConflict.update({
          where: { id: conflictId },
          data: {
            description: `${conflict.description} [Postponed: ${reason || 'No reason provided'}]`
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      conflict: updatedConflict,
      message: `Conflict ${action}d successfully`
    });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can manage timetable conflicts'
      }, { status: 403 });
    }

    const body = await request.json();
    const { conflictIds, action, reason } = body;

    if (!Array.isArray(conflictIds) || conflictIds.length === 0) {
      return NextResponse.json({ error: 'Conflict IDs array required' }, { status: 400 });
    }

    // Verify all conflicts belong to the user's school
    const conflicts = await prisma.timetableConflict.findMany({
      where: {
        id: { in: conflictIds },
        timetable: {
          schoolId: session.user.schoolId
        }
      }
    });

    if (conflicts.length !== conflictIds.length) {
      return NextResponse.json({ error: 'Some conflicts not found or unauthorized' }, { status: 404 });
    }

    // Perform bulk update based on action
    let updatedConflicts;
    const now = new Date();

    switch (action) {
      case 'resolve':
        updatedConflicts = await prisma.timetableConflict.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            isResolved: true,
            resolvedAt: now,
            resolvedBy: session.user.id
          }
        });
        break;

      case 'dismiss':
        updatedConflicts = await prisma.timetableConflict.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            dismissedAt: now,
            dismissedBy: session.user.id,
            isResolved: true
          }
        });
        break;

      case 'postpone':
        // For postponing, we add a note to the description
        updatedConflicts = await prisma.timetableConflict.updateMany({
          where: { id: { in: conflictIds } },
          data: {
            description: {
              push: `[Postponed: ${reason || 'No reason provided'}]`
            }
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedConflicts.count,
      message: `${updatedConflicts.count} conflicts ${action}d successfully`
    });
  } catch (error) {
    console.error('Bulk conflict action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}