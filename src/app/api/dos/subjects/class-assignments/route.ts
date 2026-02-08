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
      return NextResponse.json({ error: 'Only DoS can assign subjects to classes' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, assignments } = body;

    if (!classId || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: 'Class ID and assignments array are required' },
        { status: 400 }
      );
    }

    const result = await dosSubjectService.assignSubjectsToClass(
      session.user.schoolId,
      session.user.id,
      classId,
      assignments
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning subjects to class:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign subjects' },
      { status: 500 }
    );
  }
}