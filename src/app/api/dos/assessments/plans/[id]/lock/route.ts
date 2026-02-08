/**
 * DoS Assessment Plan Lock API Route
 * 
 * Handles DoS locking of assessment plans to prevent further changes.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSAssessmentService } from '@/services/dos/dos-assessment.service';

const assessmentService = new DoSAssessmentService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Lock assessment plan
    const assessmentPlanId = params.id;
    const locked = await assessmentService.lockAssessmentPlan(
      assessmentPlanId,
      session.user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      assessmentPlan: locked,
      message: 'Assessment plan locked successfully'
    });

  } catch (error) {
    console.error('Assessment Plan Lock API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to lock assessment plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}