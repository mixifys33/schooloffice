/**
 * TIMETABLE ANALYTICS API
 * 
 * DoS endpoint for getting timetable analytics and insights.
 * Provides detailed metrics about timetable quality and distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timetableApprovalWorkflow } from '@/services/timetable-approval-workflow.service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can view timetable analytics'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');

    if (!draftId) {
      return NextResponse.json({ 
        error: 'Missing draftId' 
      }, { status: 400 });
    }

    console.log(`DoS ${session.user.email} requesting analytics for timetable ${draftId}`);

    // Get analytics from workflow service
    const analytics = await timetableApprovalWorkflow.getTimetableAnalytics(draftId, session.user.id);

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Timetable analytics error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get analytics'
    }, { status: 500 });
  }
}