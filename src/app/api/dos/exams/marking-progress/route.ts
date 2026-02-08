/**
 * DoS Exam Marking Progress API Route
 * 
 * Provides teacher marking behavior monitoring and progress metrics.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSExamService } from '@/services/dos/dos-exam.service';

const examService = new DoSExamService();

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

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID is required' },
        { status: 400 }
      );
    }

    // Get marking progress report
    const report = await examService.getMarkingProgressReport(
      schoolId,
      termId
    );

    return NextResponse.json(report);

  } catch (error) {
    console.error('Exam Marking Progress API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch exam marking progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}