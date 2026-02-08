/**
 * DoS Bulk Report Card Generation API Route
 * 
 * Handles bulk generation of report cards for a class.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSReportCardService } from '@/services/dos/dos-report-card.service';

const reportCardService = new DoSReportCardService();

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { classId, termId } = body;

    if (!classId || !termId) {
      return NextResponse.json(
        { error: 'Class ID and Term ID are required' },
        { status: 400 }
      );
    }

    // Bulk generate report cards
    const result = await reportCardService.bulkGenerateReportCards({
      classId,
      termId,
      schoolId,
      generatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      generated: result.generated,
      errors: result.errors,
      message: `Generated ${result.generated} report cards with ${result.errors.length} errors`
    });

  } catch (error) {
    console.error('Bulk Report Card Generation API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate report cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}