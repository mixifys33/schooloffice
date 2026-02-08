import { NextRequest, NextResponse } from 'next/server';
import { dosSubjectService } from '@/services/dos-subject.service';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role]
    const hasDoSRole = userRoles.includes('DOS') || userRoles.includes('SCHOOL_ADMIN')
    
    if (!hasDoSRole) {
      return NextResponse.json({ error: 'Only DoS can assign teachers to subjects' }, { status: 403 });
    }

    const body = await request.json();
    const { subjectId, classId, teacherId, isPrimary } = body;

    if (!subjectId || !classId || !teacherId) {
      return NextResponse.json(
        { error: 'Subject ID, class ID, and teacher ID are required' },
        { status: 400 }
      );
    }

    const assignment = await dosSubjectService.assignTeacherToSubject(
      session.user.schoolId,
      session.user.id,
      { subjectId, classId, teacherId, isPrimary }
    );

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error assigning teacher to subject:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign teacher' },
      { status: 500 }
    );
  }
}