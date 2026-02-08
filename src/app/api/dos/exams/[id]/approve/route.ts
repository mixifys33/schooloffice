/**
 * DoS Exam Approval API Route
 * 
 * Handles DoS approval of exams.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSExamService } from '@/services/dos/dos-exam.service';

const examService = new DoSExamService();

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

    // Approve exam
    const examId = params.id;
    const approved = await examService.approveExam(
      examId,
      {
        dosUserId: session.user.id,
        reason,
        ipAddress
      }
    );

    return NextResponse.json({
      success: true,
      exam: approved,
      message: 'Exam approved successfully'
    });

  } catch (error) {
    console.error('Exam Approval API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to approve exam',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}