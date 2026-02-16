/**
 * DoS Subject Profile API Route
 * Provides detailed subject profile information
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/dos/subjects/[id]/profile - Get detailed subject profile
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    // Get subject details
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      },
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Get curriculum subject details to determine if it's core/optional
    const curriculumSubject = await prisma.doSCurriculumSubject.findFirst({
      where: {
        subjectId,
        schoolId,
      },
    });

    const subjectProfile = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      level: subject.educationLevel || 'Primary & Secondary',
      type: curriculumSubject?.isCore ? 'CORE' : 'OPTIONAL',
      unebRelevance: true, // This could be a field in the subject model
      description: subject.description,
    };

    return NextResponse.json(subjectProfile);

  } catch (error) {
    console.error('Error fetching subject profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject profile' },
      { status: 500 }
    );
  }
}