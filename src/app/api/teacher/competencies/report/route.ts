/**
 * Competency-Based Report API
 * Requirements: 31.3, 31.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { competencyService } from '@/services/competency.service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');

    if (!studentId || !subjectId || !termId) {
      return NextResponse.json(
        { error: 'Student ID, Subject ID, and Term ID are required' },
        { status: 400 }
      );
    }

    const report = await competencyService.generateCompetencyReport(
      studentId,
      subjectId,
      termId
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating competency report:', error);
    return NextResponse.json(
      { error: 'Failed to generate competency report' },
      { status: 500 }
    );
  }
}