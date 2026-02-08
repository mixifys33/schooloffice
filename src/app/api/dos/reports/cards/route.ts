/**
 * DoS Report Cards API Route
 * 
 * Manages report card listing and filtering.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSReportCardService } from '@/services/dos/dos-report-card.service';

const reportCardService = new DoSReportCardService();

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

    // Get report cards
    let reportCards;
    if (classId) {
      reportCards = await reportCardService.getClassReportCards(
        schoolId,
        classId,
        termId
      );
    } else {
      // Get all report cards for the term
      reportCards = await reportCardService.getClassReportCards(
        schoolId,
        '', // Empty classId to get all classes
        termId
      );
    }

    return NextResponse.json(reportCards);

  } catch (error) {
    console.error('Report Cards API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch report cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}