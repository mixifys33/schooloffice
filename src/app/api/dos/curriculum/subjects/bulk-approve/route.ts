import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { CurriculumService } from '@/services/dos/curriculum.service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectIds, schoolId, userId } = await request.json();

    // Verify school context
    if (schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: 'Invalid school context' }, { status: 403 });
    }

    // Bulk approve curriculum subjects
    const results = await Promise.all(
      subjectIds.map((subjectId: string) =>
        CurriculumService.approveCurriculumSubject(subjectId, userId, schoolId)
      )
    );

    return NextResponse.json({ 
      success: true, 
      approvedCount: results.length 
    });
  } catch (error) {
    console.error('Error bulk approving curriculum subjects:', error);
    return NextResponse.json(
      { error: 'Failed to bulk approve curriculum subjects' },
      { status: 500 }
    );
  }
}