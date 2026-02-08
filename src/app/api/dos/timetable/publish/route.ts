/**
 * TIMETABLE PUBLICATION API
 * 
 * DoS-only endpoint for publishing approved timetables.
 * This makes timetables visible to teachers, students, and admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timetableApprovalWorkflow } from '@/services/timetable-approval-workflow.service';
import type { PublicationRequest } from '@/types/timetable';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can publish timetables'
      }, { status: 403 });
    }

    const body = await request.json();
    const { draftId, notifyTeachers, notifyStudents } = body;

    if (!draftId) {
      return NextResponse.json({ 
        error: 'Missing draftId' 
      }, { status: 400 });
    }

    const publicationRequest: PublicationRequest = {
      draftId,
      dosUserId: session.user.id,
      notifyTeachers: notifyTeachers || false,
      notifyStudents: notifyStudents || false
    };

    console.log(`DoS ${session.user.email} publishing timetable ${draftId}`);

    await timetableApprovalWorkflow.publishTimetable(publicationRequest);

    return NextResponse.json({
      success: true,
      message: 'Timetable published successfully',
      notifications: {
        teachersNotified: notifyTeachers || false,
        studentsNotified: notifyStudents || false
      }
    });

  } catch (error) {
    console.error('Timetable publication error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Publication failed'
    }, { status: 500 });
  }
}

// Unpublish timetable
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can unpublish timetables'
      }, { status: 403 });
    }

    const body = await request.json();
    const { draftId, reason } = body;

    if (!draftId || !reason) {
      return NextResponse.json({ 
        error: 'Missing draftId or reason' 
      }, { status: 400 });
    }

    console.log(`DoS ${session.user.email} unpublishing timetable ${draftId}: ${reason}`);

    await timetableApprovalWorkflow.unpublishTimetable(draftId, session.user.id, reason);

    return NextResponse.json({
      success: true,
      message: 'Timetable unpublished successfully'
    });

  } catch (error) {
    console.error('Timetable unpublication error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unpublication failed'
    }, { status: 500 });
  }
}