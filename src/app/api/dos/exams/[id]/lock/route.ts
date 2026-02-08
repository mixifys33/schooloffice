/**
 * DoS Exam Lock API Route
 * 
 * Handles DoS locking of exams to prevent further changes.
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

    // Lock exam
    const examId = params.id;
    const locked = await examService.lockExam(
      examId,
      session.user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      exam: locked,
      message: 'Exam locked successfully'
    });

  } catch (error) {
    console.error('Exam Lock API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to lock exam',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}