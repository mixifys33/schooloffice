/**
 * DoS Assessment Plan Approval API Route
 * 
 * Handles DoS approval of assessment plans.
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

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Approve assessment plan
    const assessmentPlanId = params.id;
    const approved = await assessmentService.approveAssessmentPlan(
      assessmentPlanId,
      {
        dosUserId: session.user.id,
        reason,
        ipAddress
      }
    );

    return NextResponse.json({
      success: true,
      assessmentPlan: approved,
      message: 'Assessment plan approved successfully'
    });

  } catch (error) {
    console.error('Assessment Plan Approval API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to approve assessment plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}