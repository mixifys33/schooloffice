/**
 * DoS Curriculum Subject Approval API Route
 * 
 * Handles DoS approval of curriculum subjects.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSCurriculumService } from '@/services/dos/dos-curriculum.service';

const curriculumService = new DoSCurriculumService();

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

    // Get curriculum subject ID from params
    const curriculumSubjectId = params.id;
    if (!curriculumSubjectId) {
      return NextResponse.json(
        { error: 'Curriculum subject ID required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Get client IP for audit trail
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Approve curriculum subject
    const approvedSubject = await curriculumService.approveCurriculumSubject(
      curriculumSubjectId,
      {
        dosUserId: session.user.id,
        reason,
        ipAddress
      }
    );

    return NextResponse.json(approvedSubject);

  } catch (error) {
    console.error('Approve Curriculum Subject API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to approve curriculum subject',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}