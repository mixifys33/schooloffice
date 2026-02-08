/**
 * TIMETABLE APPROVAL API
 * 
 * DoS workflow for reviewing and approving timetable drafts.
 * Implements the approval state machine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timetableApprovalWorkflow } from '@/services/timetable-approval-workflow.service';
import type { ApprovalRequest } from '@/types/timetable';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { draftId, action, reviewNotes } = body;

    if (!draftId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: draftId, action' 
      }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be APPROVE, REJECT, or REQUEST_CHANGES' 
      }, { status: 400 });
    }

    const approvalRequest: ApprovalRequest = {
      draftId,
      dosUserId: session.user.id,
      action,
      reviewNotes
    };

    console.log(`DoS ${session.user.email} ${action.toLowerCase()}ing timetable ${draftId}`);

    // Process approval workflow
    const approval = await timetableApprovalWorkflow.reviewTimetable(approvalRequest);

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        reviewStatus: approval.reviewStatus,
        reviewedAt: approval.reviewedAt,
        reviewNotes: approval.reviewNotes
      }
    });

  } catch (error) {
    console.error('Timetable approval error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Approval failed'
    }, { status: 500 });
  }
}

// Submit timetable for review
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can submit timetables for review'
      }, { status: 403 });
    }

    const body = await request.json();
    const { draftId } = body;

    if (!draftId) {
      return NextResponse.json({ 
        error: 'Missing draftId' 
      }, { status: 400 });
    }

    console.log(`DoS ${session.user.email} submitting timetable ${draftId} for review`);

    const approval = await timetableApprovalWorkflow.submitForReview(draftId, session.user.id);

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        submittedAt: approval.submittedAt
      }
    });

  } catch (error) {
    console.error('Timetable submission error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Submission failed'
    }, { status: 500 });
  }
}