/**
 * DoS Assessment Completion Report API Route
 * 
 * Provides comprehensive assessment completion reporting and monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSAssessmentService } from '@/services/dos/dos-assessment.service';

const assessmentService = new DoSAssessmentService();

export async function GET(request: NextRequest) {
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

    // Get school ID from session
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId') || undefined;

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID is required' },
        { status: 400 }
      );
    }

    // Get assessment completion report
    const report = await assessmentService.getCACompletionReport(
      schoolId,
      termId,
      classId
    );

    return NextResponse.json(report);

  } catch (error) {
    console.error('Assessment Completion Report API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch assessment completion report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}