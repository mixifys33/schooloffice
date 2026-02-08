/**
 * DoS Exam Moderation API Route
 * 
 * Handles DoS application of moderation to exam results.
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
    const { moderationFactor, reason } = body;

    // Validate moderation factor
    if (!moderationFactor || moderationFactor <= 0 || moderationFactor > 2.0) {
      return NextResponse.json(
        { error: 'Invalid moderation factor. Must be between 0.1 and 2.0' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reason for moderation is required' },
        { status: 400 }
      );
    }

    // Apply moderation
    const examId = params.id;
    const moderated = await examService.applyModeration(
      examId,
      moderationFactor,
      reason,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      exam: moderated,
      message: `Moderation factor ${moderationFactor} applied successfully`
    });

  } catch (error) {
    console.error('Exam Moderation API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to apply moderation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}