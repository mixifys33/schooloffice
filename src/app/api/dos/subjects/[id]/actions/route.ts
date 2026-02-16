/**
 * DoS Subject Actions API Route
 * Handles DoS intervention actions on subjects
 * Created: 2026-02-14
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
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

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    const { action, termId } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action type required' },
        { status: 400 }
      );
    }

    // Verify subject exists and belongs to school
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      }
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    let result: any = { success: true };

    switch (action) {
      case 'assign_teacher':
        // This would open a dialog or redirect to teacher assignment page
        result.message = 'Teacher assignment initiated';
        result.redirectTo = `/dos/subjects/${subjectId}/assign-teacher`;
        break;

      case 'flag_review':
        // Flag subject for academic review
        // In a real implementation, this would create an alert or notification
        result.message = 'Subject flagged for academic review';
        result.alert = {
          type: 'ACADEMIC_REVIEW',
          subjectId,
          subjectName: subject.name,
          flaggedBy: session.user.id,
          flaggedAt: new Date().toISOString(),
          termId,
        };
        break;

      case 'adjust_workload':
        // This would open a dialog to adjust periods per week
        result.message = 'Workload adjustment initiated';
        result.redirectTo = `/dos/subjects/${subjectId}/adjust-workload`;
        break;

      case 'recovery_plan':
        // Create a syllabus recovery plan
        result.message = 'Recovery plan creation initiated';
        result.redirectTo = `/dos/subjects/${subjectId}/recovery-plan`;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error performing subject action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
