import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TimetableDosWorkflowService } from '@/services/timetable-dos-workflow.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { resolutionMethod } = await request.json();
    const conflictId = params.id;

    if (!resolutionMethod) {
      return NextResponse.json(
        { error: 'Resolution method is required' },
        { status: 400 }
      );
    }

    // Resolve conflict
    const result = await TimetableDosWorkflowService.resolveConflict(
      conflictId,
      session.user.id,
      resolutionMethod
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Conflict resolution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { dismissalReason } = await request.json();
    const conflictId = params.id;

    if (!dismissalReason) {
      return NextResponse.json(
        { error: 'Dismissal reason is required' },
        { status: 400 }
      );
    }

    // Dismiss conflict
    const result = await TimetableDosWorkflowService.dismissConflict(
      conflictId,
      session.user.id,
      dismissalReason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Conflict dismissal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}